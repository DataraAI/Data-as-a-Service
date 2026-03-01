"""
DataraAI Backend Application

Main Flask application for robotics training and deployment.
Handles Azure Blob Storage integration and dataset management.
"""

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
        """Process video from Google Drive and upload to Azure"""
        try:
            data = request.get_json()
            if not data:
                return {"error": "Invalid JSON body"}, 400

            result = processing_service.process_video(data)
            logger.info(f"Video processed successfully: {result.get('output_name')}")
            return jsonify(result)
        except ValueError as e:
            logger.warning(f"Validation error in process_video: {e}")
            return {"error": str(e)}, 400
        except Exception as e:
            logger.error(f"Error processing video: {e}", exc_info=True)
            return {"error": f"An error occurred: {str(e)}"}, 500

    @app.route("/api/generate_ego", methods=["POST"])
    def generate_ego():
        """Generate ego view from original image"""
        try:
            data = request.get_json()
            if not data:
                return {"error": "Invalid JSON body"}, 400

            result = processing_service.generate_ego(data)
            logger.info("Ego view generated successfully")
            return jsonify(result)
        except Exception as e:
            logger.error(f"Error generating ego: {e}", exc_info=True)
            return {"error": f"An error occurred: {str(e)}"}, 500

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

