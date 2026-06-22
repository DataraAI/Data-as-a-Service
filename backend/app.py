"""DataraAI backend application."""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import subprocess
from datetime import datetime, timedelta, timezone

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from datara.config import settings
from datara.logging import logger
from datara.services.auth_service import AuthService
from datara.services.azure_service import AzureService
from datara.services.dataset_service import DatasetService
from datara.services.lambda_job_publisher import LambdaJobPublisher
from datara.services.lambda_job_service import (
    DuplicateActiveJob,
    GenerationBusy,
    LambdaJobService,
    PublishFailed,
    QueueLimitExceeded,
)
from datara.services.lambda_job_store import LambdaJobStore
from datara.services.processing_service import ProcessingService
from datara.services.sql_store import SQLStore
from datara.services.worker_auth import require_generation_worker

sql_store = SQLStore()
lambda_job_store = LambdaJobStore(sql_store)
azure_service = AzureService()
auth_service = AuthService(sql_store)
dataset_service = DatasetService(azure_service, sql_store)
processing_service = ProcessingService(
    azure_service,
    dataset_service,
    sql_store,
    lambda_job_store=lambda_job_store,
)


def create_app() -> Flask:
    global lambda_job_store

    lambda_job_store = LambdaJobStore(sql_store)
    processing_service.lambda_job_store = lambda_job_store

    app = Flask(__name__)
    app.config.update(
        DEBUG=settings.debug,
        JSON_SORT_KEYS=False,
        MAX_CONTENT_LENGTH=settings.max_upload_size,
        SECRET_KEY=settings.secret_key,
        SESSION_COOKIE_NAME=settings.session_cookie_name,
        SESSION_COOKIE_SECURE=settings.session_cookie_secure,
        SESSION_COOKIE_SAMESITE=settings.session_cookie_samesite,
        PERMANENT_SESSION_LIFETIME=timedelta(minutes=settings.session_timeout),
    )

    CORS(
        app,
        resources={r"/api/*": {"origins": settings.cors_origins}},
        supports_credentials=True,
    )

    app.extensions["lambda_job_service"] = LambdaJobService(
        sql_store,
        lambda_job_store=lambda_job_store,
        publisher=LambdaJobPublisher(),
        processing_service=processing_service,
    )
    app.extensions["lambda_job_store"] = lambda_job_store
    register_routes(app)
    register_error_handlers(app)
    return app


def register_routes(app: Flask) -> None:
    def _job_service() -> LambdaJobService:
        return app.extensions["lambda_job_service"]

    def _enqueue_generation(job_type: str):
        current_user = _require_staff_user()
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
        try:
            receipt = _job_service().enqueue(
                current_user=current_user,
                job_type=job_type,
                payload=data,
                execute_inline=settings.is_development,
            )
            return jsonify(receipt), 200 if settings.is_development else 202
        except DuplicateActiveJob as exc:
            return jsonify({"error": str(exc), **exc.receipt}), 409
        except QueueLimitExceeded as exc:
            return jsonify({"error": str(exc)}), 429
        except PublishFailed as exc:
            return jsonify({"error": str(exc)}), 503
        except GenerationBusy as exc:
            return jsonify({"error": str(exc)}), 409

    def _require_account_manager() -> dict[str, object]:
        current_user = auth_service.get_current_user_or_raise()
        return auth_service.assert_account_manager(current_user)

    def _require_admin() -> dict[str, object]:
        current_user = auth_service.get_current_user_or_raise()
        return auth_service.assert_admin(current_user)

    def _require_staff_user() -> dict[str, object]:
        current_user = auth_service.get_current_user_or_raise()
        if current_user.get("role") not in {"admin", "analyst"}:
            raise PermissionError("staff_required")
        return current_user

    def _worker_auth_error():
        return require_generation_worker()

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify(
            {
                "status": "healthy",
                "app": settings.app_name,
                "environment": settings.environment,
                "port": settings.flask_port,
            }
        )

    @app.route("/api/auth/login", methods=["GET", "POST"])
    def auth_login():
        if request.method == "GET":
            return auth_service.login_redirect()
        return auth_service.login()

    @app.route("/api/auth/register", methods=["GET", "POST"])
    def auth_register():
        if request.method == "GET":
            return auth_service.register_redirect()
        return auth_service.register()

    @app.route("/api/auth/callback", methods=["GET"])
    def auth_callback():
        return auth_service.login_redirect()

    @app.route("/api/auth/logout", methods=["POST"])
    def auth_logout():
        return auth_service.logout()

    @app.route("/api/auth/me", methods=["GET"])
    def auth_me():
        user = auth_service.get_current_user()
        return jsonify(auth_service.serialize_user(user))

    @app.route("/api/admin/users", methods=["GET"])
    @auth_service.require_account_manager
    def admin_list_users():
        current_user = _require_account_manager()
        users = [auth_service.serialize_managed_user(user) for user in sql_store.list_users()]
        return jsonify({"users": users, "currentUserId": current_user["id"]})

    @app.route("/api/admin/users/<int:user_id>/approval", methods=["PATCH"])
    @auth_service.require_account_manager
    def admin_update_user_approval(user_id: int):
        current_user = _require_account_manager()
        target_user = sql_store.get_user_by_id(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        if current_user["role"] == "analyst" and target_user["role"] == "admin":
            return jsonify({"error": "Analysts cannot change admin approval states"}), 403

        payload = request.get_json(silent=True) or {}
        approval_status = str(payload.get("approvalStatus") or "").strip().lower()
        updated_user = sql_store.set_user_approval_status(
            user_id,
            approval_status,
            actor_user_id=current_user["id"],
        )
        if not updated_user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user": auth_service.serialize_managed_user(updated_user)})

    @app.route("/api/admin/users/<int:user_id>/role", methods=["PATCH"])
    @auth_service.require_admin
    def admin_update_user_role(user_id: int):
        current_user = _require_admin()
        payload = request.get_json(silent=True) or {}
        role = str(payload.get("role") or "").strip().lower()
        updated_user = sql_store.set_user_role(
            user_id,
            role,
            actor_user_id=current_user["id"],
        )
        if not updated_user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user": auth_service.serialize_managed_user(updated_user)})

    @app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
    @auth_service.require_account_manager
    def admin_delete_user(user_id: int):
        current_user = _require_account_manager()
        target_user = sql_store.get_user_by_id(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        if user_id == current_user["id"]:
            return jsonify({"error": "You cannot delete your own account from this page."}), 400
        if current_user["role"] == "analyst" and target_user["role"] == "admin":
            return jsonify({"error": "Analysts cannot delete admin accounts"}), 403

        deleted = sql_store.delete_user(user_id)
        if not deleted:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"ok": True, "deletedUserId": user_id})

    @app.route("/api/datasets", methods=["GET"])
    @auth_service.require_approved_user
    def get_datasets():
        current_user = auth_service.get_current_user_or_raise()
        path = request.args.get("path", "")
        return jsonify(dataset_service.list_datasets(path, current_user))

    @app.route("/api/dataset-paths", methods=["GET"])
    @auth_service.require_approved_user
    def get_dataset_paths():
        current_user = auth_service.get_current_user_or_raise()
        category = str(request.args.get("category") or "").strip() or None
        public_only = str(request.args.get("public_only") or "").strip().lower() in {"1", "true", "yes"}
        return jsonify(
            dataset_service.list_all_dataset_paths(
                current_user,
                category=category,
                public_only=public_only,
            )
        )

    @app.route("/api/dataset-category-previews", methods=["GET"])
    @auth_service.require_approved_user
    def get_dataset_category_previews():
        current_user = auth_service.get_current_user_or_raise()
        category = str(request.args.get("category") or "").strip()
        public_only = str(request.args.get("public_only") or "").strip().lower() in {"1", "true", "yes"}
        if not category:
            return jsonify({"error": "Missing category"}), 400
        return jsonify(
            dataset_service.list_category_dataset_previews(
                current_user,
                category=category,
                public_only=public_only,
            )
        )

    @app.route("/api/dataset/<path:route_path>", methods=["GET"])
    @auth_service.require_approved_user
    def get_dataset_images(route_path: str):
        current_user = auth_service.get_current_user_or_raise()
        return jsonify(dataset_service.get_dataset_images(route_path, current_user))

    @app.route("/api/dataset-manifest/<path:route_path>", methods=["GET"])
    @auth_service.require_approved_user
    def get_dataset_manifest(route_path: str):
        current_user = auth_service.get_current_user_or_raise()
        return jsonify(dataset_service.get_dataset_manifest(route_path, current_user))

    @app.route("/api/proxy/<asset_id>", methods=["GET", "HEAD"])
    @auth_service.require_approved_user
    def proxy_blob(asset_id: str):
        current_user = auth_service.get_current_user_or_raise()
        asset = dataset_service.resolve_asset(asset_id, current_user)
        container_name = asset["dataset"]["storage_container"]
        blob_name = asset["blob_name"]
        blob_client = azure_service.get_container_client(container_name).get_blob_client(blob_name)
        blob_properties = blob_client.get_blob_properties()
        blob_size = int(blob_properties.size or 0)
        mime_type = blob_properties.content_settings.content_type or "application/octet-stream"

        def apply_common_headers(response: Response, *, content_length: int | None = None) -> Response:
            response.headers["Accept-Ranges"] = "bytes"
            if content_length is not None and content_length >= 0:
                response.headers["Content-Length"] = str(content_length)
            response.headers["Cache-Control"] = "no-store, no-cache, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Content-Disposition"] = "inline"
            return response

        def generate():
            stream = blob_client.download_blob()
            for chunk in stream.chunks():
                yield chunk

        range_header = request.headers.get("Range", "").strip()
        if range_header:
            match = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if match:
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else blob_size - 1
                if start >= blob_size:
                    return Response(status=416, headers={"Content-Range": f"bytes */{blob_size}"})
                end = min(end, blob_size - 1)
                length = max(0, end - start + 1)
                if request.method == "HEAD":
                    response = Response(status=206, mimetype=mime_type)
                else:
                    partial_stream = blob_client.download_blob(offset=start, length=length)
                    response = Response(partial_stream.readall(), 206, mimetype=mime_type, direct_passthrough=True)
                response.headers["Content-Range"] = f"bytes {start}-{end}/{blob_size}"
                return apply_common_headers(response, content_length=length)

        if request.method == "HEAD":
            return apply_common_headers(Response(status=200, mimetype=mime_type), content_length=blob_size)
        response = Response(stream_with_context(generate()), mimetype=mime_type)
        return apply_common_headers(response, content_length=blob_size if blob_size > 0 else None)

    @app.route("/api/process_video", methods=["POST"])
    @auth_service.require_approved_user
    def process_video():
        current_user = _require_staff_user()
        if request.content_type and "multipart/form-data" in request.content_type:
            return _process_video_multipart(current_user)

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400

        result = processing_service.process_video(current_user, data)
        return jsonify(result)

    def _process_video_multipart(current_user: dict[str, str]):
        upload_type = request.form.get("upload_type", "video")
        data = {
            "output_name": request.form.get("output_name"),
            "category": request.form.get("category"),
            "brand": request.form.get("brand"),
            "dataset_name": request.form.get("dataset_name"),
            "date": request.form.get("date", ""),
            "task": request.form.get("task", ""),
            "upload_type": upload_type,
            "view": request.form.get("view", "exo"),
            "visibility": request.form.get("visibility", "private"),
        }

        try:
            tags = json.loads(request.form.get("tags") or "[]")
            data["tags"] = tags if isinstance(tags, list) else []
        except json.JSONDecodeError:
            data["tags"] = []

        ts = int(datetime.now(timezone.utc).timestamp())
        upload_root = processing_service.upload_folder
        os.makedirs(upload_root, exist_ok=True)
        local_video_path = None
        temp_image_dir = None

        try:
            if upload_type == "video":
                file_storage = request.files.get("file")
                if not file_storage or not file_storage.filename:
                    return jsonify({"error": "No video file provided"}), 400
                ext = os.path.splitext(file_storage.filename)[1] or ".mp4"
                local_video_path = os.path.join(upload_root, f"upload_{ts}{ext}")
                file_storage.save(local_video_path)
                result = processing_service.process_video(current_user, data, local_video_path=local_video_path)
            elif upload_type == "folder":
                file_list = request.files.getlist("files")
                if not file_list:
                    return jsonify({"error": "No files provided for image folder"}), 400
                temp_image_dir = os.path.join(upload_root, f"folder_upload_{ts}")
                os.makedirs(temp_image_dir, exist_ok=True)
                for file_storage in file_list:
                    if not file_storage.filename:
                        continue
                    relative_name = file_storage.filename.replace("\\", "/").strip("/")
                    if any(part == ".." for part in relative_name.split("/")):
                        return jsonify({"error": "Invalid path in upload"}), 400
                    destination = os.path.join(temp_image_dir, relative_name)
                    os.makedirs(os.path.dirname(destination), exist_ok=True)
                    file_storage.save(destination)
                result = processing_service.process_video(current_user, data, local_image_dir=temp_image_dir)
            else:
                return jsonify({"error": "upload_type must be 'video' or 'folder'"}), 400
            return jsonify(result)
        finally:
            if local_video_path and os.path.isfile(local_video_path):
                try:
                    os.remove(local_video_path)
                except OSError:
                    pass
            if temp_image_dir and os.path.isdir(temp_image_dir):
                shutil.rmtree(temp_image_dir, ignore_errors=True)

    @app.route("/api/generate_ego", methods=["POST"])
    @auth_service.require_approved_user
    def generate_ego():
        return _enqueue_generation("generate_ego")

    @app.route("/api/generate_corner_case", methods=["POST"])
    @auth_service.require_approved_user
    def generate_corner_case():
        return _enqueue_generation("generate_corner_case")

    @app.route("/api/create_vlm_tags", methods=["POST"])
    @auth_service.require_approved_user
    def create_vlm_tags():
        return _enqueue_generation("create_vlm_tags")

    @app.route("/api/generate_masks", methods=["POST"])
    @auth_service.require_approved_user
    def generate_masks():
        return _enqueue_generation("generate_masks")

    @app.route("/api/occlusion-mask-options", methods=["GET"])
    @auth_service.require_approved_user
    def get_occlusion_mask_options():
        current_user = _require_staff_user()
        route_path = str(request.args.get("route_path") or "").strip()
        if not route_path:
            return jsonify({"error": "Missing route_path"}), 400
        payload, status_code = processing_service.get_occlusion_mask_options(current_user, route_path)
        return jsonify(payload), status_code

    @app.route("/api/remove_occlusion", methods=["POST"])
    @auth_service.require_approved_user
    def remove_occlusion():
        return _enqueue_generation("remove_occlusion")

    @app.route("/api/delete_dataset", methods=["POST"])
    @auth_service.require_approved_user
    def delete_dataset():
        current_user = auth_service.get_current_user_or_raise()
        data = request.get_json() or {}
        path = str(data.get("path") or "").strip().strip("/")
        if not path:
            return jsonify({"error": "Missing or empty 'path'"}), 400
        return jsonify(dataset_service.delete_dataset(path, current_user))

    @app.route("/api/stats", methods=["GET"])
    def get_stats():
        return jsonify(
            {
                "app": settings.app_name,
                "environment": settings.environment,
                "public_container": settings.azure_public_container,
                "datasets_count": sql_store.count_datasets(visibility="public"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    @app.route("/api/generate_task_intelligence", methods=["POST"])
    @auth_service.require_approved_user
    def generate_task_intelligence():
        return _enqueue_generation("generate_task_intelligence")

    @app.route("/api/generate_video_to_video_views", methods=["POST"])
    @auth_service.require_approved_user
    def generate_video_to_video_views():
        return _enqueue_generation("generate_video_to_video_views")

    @app.route("/api/generate_hand_mesh", methods=["POST"])
    @auth_service.require_approved_user
    def generate_hand_mesh():
        return _enqueue_generation("generate_hand_mesh")

    @app.route("/api/jobs/<job_id>", methods=["GET"])
    @auth_service.require_approved_user
    def get_generation_job(job_id: str):
        current_user = auth_service.get_current_user_or_raise()
        return jsonify(_job_service().get_job_for_user(job_id, current_user))

    @app.route("/api/jobs/active", methods=["GET"])
    @auth_service.require_approved_user
    def get_active_generation_jobs():
        current_user = auth_service.get_current_user_or_raise()
        return jsonify({"jobs": _job_service().list_active_for_user(current_user)})

    @app.route("/api/jobs", methods=["GET"])
    @auth_service.require_account_manager
    def get_generation_jobs():
        current_user = _require_account_manager()
        return jsonify(_job_service().list_staff_jobs(current_user))

    @app.route("/api/internal/generation-jobs/<job_id>/claim", methods=["POST"])
    def claim_generation_job(job_id: str):
        if auth_error := _worker_auth_error():
            return auth_error
        data = request.get_json(silent=True) or {}
        payload, status = _job_service().claim_for_remote_worker(
            job_id,
            worker_id=str(data.get("worker_id") or ""),
            job_type=str(data.get("job_type") or ""),
            schema_version=int(data.get("schema_version") or 0),
        )
        return jsonify(payload), status

    @app.route("/api/internal/generation-jobs/<job_id>/heartbeat", methods=["POST"])
    def heartbeat_generation_job(job_id: str):
        if auth_error := _worker_auth_error():
            return auth_error
        data = request.get_json(silent=True) or {}
        renewed = _job_service().heartbeat_remote_worker(
            job_id,
            worker_id=str(data.get("worker_id") or ""),
        )
        if not renewed:
            return jsonify({"error": "Worker lease is not active"}), 409
        return jsonify({"ok": True})

    @app.route("/api/internal/generation-jobs/<job_id>/stage", methods=["POST"])
    def stage_generation_job(job_id: str):
        if auth_error := _worker_auth_error():
            return auth_error
        data = request.get_json(silent=True) or {}
        updated = _job_service().stage_remote_worker(
            job_id,
            worker_id=str(data.get("worker_id") or ""),
            stage=str(data.get("stage") or ""),
        )
        if not updated:
            return jsonify({"error": "Worker lease is not active"}), 409
        return jsonify({"ok": True})

    @app.route("/api/internal/generation-jobs/<job_id>/complete", methods=["POST"])
    def complete_generation_job(job_id: str):
        if auth_error := _worker_auth_error():
            return auth_error
        data = request.get_json(silent=True) or {}
        result = data.get("result")
        outcome = _job_service().complete_remote_worker(
            job_id,
            worker_id=str(data.get("worker_id") or ""),
            result=result if isinstance(result, dict) else None,
        )
        status = 404 if outcome == "missing" else 409 if outcome == "leased" else 200
        return jsonify({"outcome": outcome}), status

    @app.route("/api/internal/generation-jobs/<job_id>/fail", methods=["POST"])
    def fail_generation_job(job_id: str):
        if auth_error := _worker_auth_error():
            return auth_error
        data = request.get_json(silent=True) or {}
        outcome = _job_service().fail_remote_worker(
            job_id,
            worker_id=str(data.get("worker_id") or ""),
            private_error=str(data.get("error") or "Generation request failed"),
        )
        status = 404 if outcome == "missing" else 409 if outcome == "leased" else 200
        return jsonify({"outcome": outcome}), status

def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(PermissionError)
    def handle_permission_error(error):
        message = str(error)
        status = 403
        if "Authentication required" in message:
            status = 401
        return jsonify({"error": message}), status

    @app.errorhandler(FileNotFoundError)
    def handle_not_found(error):
        return jsonify({"error": str(error)}), 404

    @app.errorhandler(ValueError)
    def handle_value_error(error):
        return jsonify({"error": str(error)}), 400

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Not Found", "status": 404}), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error("500 Internal Server Error: %s", error)
        return jsonify({"error": "Internal Server Error", "status": 500}), 500

    @app.errorhandler(Exception)
    def handle_exception(error):
        logger.error("Unhandled exception: %s: %s", type(error).__name__, error, exc_info=True)
        return jsonify({"error": "Internal Server Error", "status": 500}), 500


def main() -> None:
    logger.info("=" * 60)
    logger.info("Starting %s", settings.app_name)
    logger.info("Environment: %s", settings.environment)
    logger.info("Host: %s:%s", settings.flask_host, settings.flask_port)
    logger.info("=" * 60)

    app = create_app()
    app.run(host=settings.flask_host, port=settings.flask_port, debug=settings.debug, use_reloader=False)


if __name__ == "__main__":
    main()
