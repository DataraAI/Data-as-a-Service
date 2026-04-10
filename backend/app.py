"""
DataraAI Backend Application

Main Flask application for robotics training and deployment.
Handles Azure Blob Storage integration and dataset management.
"""

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

from flask import Flask, jsonify, Response, stream_with_context, request
from flask_cors import CORS
from dotenv import load_dotenv

from datara.config import settings
from datara.logging import logger
from datara.services.azure_service import AzureService
from datara.services.dataset_service import DatasetService
from datara.services.processing_service import ProcessingService

# Load environment variables
load_dotenv()

# Initialize services globally
logger.info("Initializing Azure services...")
azure_service = AzureService()
dataset_service = DatasetService(azure_service)
processing_service = ProcessingService(azure_service, dataset_service)
logger.info("Services initialized successfully")


def create_app() -> Flask:
    """
    Create and configure the Flask application

    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)

    # Configure Flask
    app.config.update(
        DEBUG=settings.debug,
        JSON_SORT_KEYS=False,
        MAX_CONTENT_LENGTH=settings.max_upload_size,
    )

    # Setup CORS
    CORS(app, resources={r"/api/*": {"origins": settings.cors_origins}})

    # Register routes
    register_routes(app)

    # Register error handlers
    register_error_handlers(app)

    logger.info(f"Flask app '{settings.app_name}' created successfully")

    return app


def register_routes(app: Flask) -> None:
    """Register all API routes"""

    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            "status": "healthy",
            "app": settings.app_name,
            "environment": settings.environment,
            "port": settings.flask_port
        })

    @app.route("/api/datasets", methods=["GET"])
    def get_datasets():
        """List available datasets"""
        try:
            path = request.args.get('path', '')
            datasets = dataset_service.list_datasets(path)
            logger.info(f"Listed datasets with path: {path}")
            return jsonify(datasets)
        except Exception as e:
            logger.error(f"Error listing datasets: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dataset-paths", methods=["GET"])
    def get_dataset_paths():
        """List all folder paths recursively for folder navigation search"""
        try:
            paths = dataset_service.list_all_dataset_paths()
            logger.info(f"Listed {len(paths)} recursive dataset paths")
            return jsonify(paths)
        except Exception as e:
            logger.error(f"Error listing recursive dataset paths: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dataset/<path:name>", methods=["GET"])
    def get_dataset_images(name):
        """Get images and metadata for a dataset"""
        try:
            images = dataset_service.get_dataset_images(name)
            logger.info(f"Retrieved {len(images)} items from dataset: {name}")
            return jsonify(images)
        except Exception as e:
            logger.error(f"Error fetching dataset {name}: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/proxy/<path:blob_name>", methods=["GET"])
    def proxy_blob(blob_name):
        """Proxy Azure Blob Storage content"""
        try:
            stream = azure_service.download_blob(blob_name)

            def generate():
                for chunk in stream.chunks():
                    yield chunk

            return Response(
                stream_with_context(generate()),
                mimetype="application/octet-stream"
            )
        except Exception as e:
            logger.error(f"Proxy error for {blob_name}: {e}")
            return jsonify({"error": str(e)}), 404

    @app.route("/api/process_video", methods=["POST"])
    def process_video():
        """Process video or image folder from Google Drive or local multipart upload, then upload to Azure."""
        if request.content_type and "multipart/form-data" in request.content_type:
            return _process_video_multipart()

        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON body"}), 400

            result = processing_service.process_video(data)
            logger.info(f"Video processed successfully: {result.get('output_name')}")
            return jsonify(result)
        except ValueError as e:
            logger.warning(f"Validation error in process_video: {e}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error processing video: {e}", exc_info=True)
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    def _process_video_multipart():
        upload_type = request.form.get("upload_type", "video")
        output_name = request.form.get("output_name")
        if not output_name or not str(output_name).strip():
            return jsonify({"error": "Missing output_name"}), 400

        date_val = request.form.get("date", "")
        task = request.form.get("task", "")
        try:
            tags = json.loads(request.form.get("tags") or "[]")
            if not isinstance(tags, list):
                tags = []
        except json.JSONDecodeError:
            tags = []

        data = {
            "output_name": output_name.strip(),
            "date": date_val,
            "tags": tags,
            "task": task,
            "upload_type": upload_type,
        }

        ts = int(datetime.now(timezone.utc).timestamp())
        local_video_path = None
        temp_image_dir = None
        upload_root = processing_service.upload_folder
        os.makedirs(upload_root, exist_ok=True)

        try:
            if upload_type == "video":
                f = request.files.get("file")
                if not f or not f.filename:
                    return jsonify({"error": "No video file provided"}), 400
                ext = os.path.splitext(f.filename)[1] or ".mp4"
                local_video_path = os.path.join(upload_root, f"upload_{ts}{ext}")
                f.save(local_video_path)
                result = processing_service.process_video(data, local_video_path=local_video_path)
            elif upload_type == "folder":
                file_list = request.files.getlist("files")
                if not file_list:
                    return jsonify({"error": "No files provided for image folder"}), 400
                temp_image_dir = os.path.join(upload_root, f"folder_upload_{ts}")
                os.makedirs(temp_image_dir, exist_ok=True)
                for file_storage in file_list:
                    if not file_storage.filename:
                        continue
                    rel = file_storage.filename.replace("\\", "/").strip("/")
                    if any(part == ".." for part in rel.split("/")):
                        return jsonify({"error": "Invalid path in upload"}), 400
                    dest = os.path.join(temp_image_dir, rel)
                    parent = os.path.dirname(dest)
                    if parent:
                        os.makedirs(parent, exist_ok=True)
                    file_storage.save(dest)
                result = processing_service.process_video(data, local_image_dir=temp_image_dir)
            else:
                return jsonify({"error": "upload_type must be 'video' or 'folder'"}), 400

            logger.info("Local upload processed successfully")
            return jsonify(result)
        except ValueError as e:
            logger.warning(f"Validation error in process_video multipart: {e}")
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Error processing local upload: {e}", exc_info=True)
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500
        finally:
            if local_video_path and os.path.isfile(local_video_path):
                try:
                    os.remove(local_video_path)
                except OSError:
                    pass
            if temp_image_dir and os.path.isdir(temp_image_dir):
                try:
                    shutil.rmtree(temp_image_dir)
                except OSError:
                    pass

    @app.route("/api/generate_ego", methods=["POST"])
    def generate_ego():
        """Generate ego view from original image"""
        try:
            data = request.get_json()
            logger.info(f"processing_service.generate_ego() called with data: {data}")
            if not data:
                return jsonify({"error": "Invalid JSON body"}), 400

            result, status_code = processing_service.generate_ego(data)
            logger.info("Ego view generation request completed")
            return jsonify(result), status_code
        except Exception as e:
            logger.error(f"Error generating ego: {e}", exc_info=True)
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    @app.route("/api/generate_corner_case", methods=["POST"])
    def generate_corner_case():
        """Generate corner case from original image"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON body"}), 400

            result, status_code = processing_service.generate_corner_case(data)
            logger.info("Corner case generation request completed")
            return jsonify(result), status_code
        except Exception as e:
            logger.error(f"Error generating corner case: {e}", exc_info=True)
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    @app.route("/api/create_vlm_tags", methods=["POST"])
    def create_vlm_tags():
        """Create VLM tags for an ego or corner case image via Lambda VM and append to Cosmos DB."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON body"}), 400

            result, status_code = processing_service.create_vlm_tags(data)
            logger.info("Create VLM tags request completed")
            return jsonify(result), status_code
        except Exception as e:
            logger.error(f"Error creating VLM tags: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500

    @app.route("/api/delete_dataset", methods=["POST"])
    def delete_dataset():
        """Delete a dataset path and its subdirectories via delete_from_azure.py script."""
        try:
            data = request.get_json() or {}
            path = data.get("path") or (request.form.get("path") if request.form else None)
            if not path or not str(path).strip():
                return jsonify({"error": "Missing or empty 'path'"}), 400
            path = str(path).strip().rstrip("/")
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            utils_dir = os.path.join(backend_dir, "utils")
            script_path = os.path.join(utils_dir, "delete_from_azure.py")
            result = subprocess.run(
                [sys.executable, script_path, "--dataset_prefix", path],
                capture_output=True,
                text=True,
                cwd=backend_dir,
            )
            if result.returncode != 0:
                err = (result.stderr or result.stdout or "Unknown error").strip()
                logger.warning(f"delete_from_azure failed: {err}")
                return jsonify({"error": err or "Delete script failed"}), 500
            logger.info(f"Dataset deleted via script: {path}")
            return jsonify({"message": "Dataset and subdirectories deleted"})
        except Exception as e:
            logger.error(f"Error deleting dataset: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500

    @app.route("/api/stats", methods=["GET"])
    def get_stats():
        """Get application statistics"""
        try:
            stats = {
                "app": settings.app_name,
                "environment": settings.environment,
                "azure_container": azure_service.container_name,
                "datasets_count": len(dataset_service.list_datasets()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return jsonify(stats)
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"error": str(e)}, 500


def register_error_handlers(app: Flask) -> None:
    """Register error handlers"""

    @app.errorhandler(404)
    def not_found(error):
        logger.warning(f"404 Not Found: {error}")
        return {"error": "Not Found", "status": 404}, 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"500 Internal Server Error: {error}")
        return {"error": "Internal Server Error", "status": 500}, 500

    @app.errorhandler(Exception)
    def handle_exception(error):
        logger.error(f"Unhandled exception: {type(error).__name__}: {str(error)}", exc_info=True)
        return {
            "error": str(error),
            "type": type(error).__name__,
            "status": 500
        }, 500


def main():
    """Application entry point"""
    logger.info("="*60)
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Host: {settings.flask_host}:{settings.flask_port}")
    logger.info("="*60)

    app = create_app()
    app.run(
        host=settings.flask_host,
        port=settings.flask_port,
        debug=settings.debug,
        use_reloader=False
    )


if __name__ == "__main__":
    main()
