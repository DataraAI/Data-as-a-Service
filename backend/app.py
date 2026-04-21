"""DataraAI backend application."""

from __future__ import annotations

import json
import os
import shutil
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

from datara.config import settings
from datara.logging import logger
from datara.services.auth_service import AuthService
from datara.services.azure_service import AzureService
from datara.services.dataset_service import DatasetService
from datara.services.processing_service import ProcessingService
from datara.services.sql_store import SQLStore


load_dotenv()

sql_store = SQLStore()
azure_service = AzureService()
auth_service = AuthService(sql_store)
dataset_service = DatasetService(azure_service, sql_store)
processing_service = ProcessingService(azure_service, dataset_service, sql_store)


def create_app() -> Flask:
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

    register_routes(app)
    register_error_handlers(app)
    return app


def register_routes(app: Flask) -> None:
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

    @app.route("/api/auth/login", methods=["GET"])
    def auth_login():
        return auth_service.login()

    @app.route("/api/auth/callback", methods=["GET"])
    def auth_callback():
        return auth_service.handle_callback()

    @app.route("/api/auth/logout", methods=["POST"])
    def auth_logout():
        return auth_service.logout()

    @app.route("/api/auth/me", methods=["GET"])
    def auth_me():
        user = auth_service.get_current_user()
        return jsonify(auth_service.serialize_user(user))

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
        return jsonify(dataset_service.list_all_dataset_paths(current_user))

    @app.route("/api/dataset/<path:route_path>", methods=["GET"])
    @auth_service.require_approved_user
    def get_dataset_images(route_path: str):
        current_user = auth_service.get_current_user_or_raise()
        return jsonify(dataset_service.get_dataset_images(route_path, current_user))

    @app.route("/api/proxy/<asset_id>", methods=["GET"])
    @auth_service.require_approved_user
    def proxy_blob(asset_id: str):
        current_user = auth_service.get_current_user_or_raise()
        asset = dataset_service.resolve_asset(asset_id, current_user)
        stream = azure_service.download_blob(asset["dataset"]["storage_container"], asset["blob_name"])

        def generate():
            for chunk in stream.chunks():
                yield chunk

        mime_type = stream.properties.content_settings.content_type or "application/octet-stream"
        return Response(stream_with_context(generate()), mimetype=mime_type)

    @app.route("/api/process_video", methods=["POST"])
    @auth_service.require_approved_user
    def process_video():
        current_user = auth_service.get_current_user_or_raise()
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
        current_user = auth_service.get_current_user_or_raise()
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
        payload, status_code = processing_service.generate_ego(current_user, data)
        return jsonify(payload), status_code

    @app.route("/api/generate_corner_case", methods=["POST"])
    @auth_service.require_approved_user
    def generate_corner_case():
        current_user = auth_service.get_current_user_or_raise()
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
        payload, status_code = processing_service.generate_corner_case(current_user, data)
        return jsonify(payload), status_code

    @app.route("/api/create_vlm_tags", methods=["POST"])
    @auth_service.require_approved_user
    def create_vlm_tags():
        current_user = auth_service.get_current_user_or_raise()
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
        payload, status_code = processing_service.create_vlm_tags(current_user, data)
        return jsonify(payload), status_code

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
        all_rows = sql_store._fetchone("SELECT COUNT(*) AS count FROM datasets WHERE deleted_at IS NULL AND visibility = 'public'")
        return jsonify(
            {
                "app": settings.app_name,
                "environment": settings.environment,
                "public_container": settings.azure_public_container,
                "datasets_count": int(all_rows["count"]) if all_rows else 0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )


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
        return jsonify({"error": str(error), "type": type(error).__name__, "status": 500}), 500


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
