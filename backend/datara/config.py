"""Runtime configuration for DataraAI."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "data" / "datara_app.sqlite3"

load_dotenv(PROJECT_ROOT / "config" / ".env")
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = os.getenv(name)
    if value is None:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(slots=True)
class Settings:
    """Application settings resolved from environment variables."""

    app_name: str = field(default_factory=lambda: os.getenv("APP_NAME", "DataraAI"))
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", os.getenv("FLASK_ENV", "development")))
    debug: bool = field(default_factory=lambda: _env_bool("DEBUG", _env_bool("ENABLE_DEBUG_LOGGING", False)))

    flask_host: str = field(default_factory=lambda: os.getenv("FLASK_HOST", "127.0.0.1"))
    flask_port: int = field(default_factory=lambda: _env_int("FLASK_PORT", 5151))
    flask_env: str = field(default_factory=lambda: os.getenv("FLASK_ENV", "development"))
    secret_key: str = field(default_factory=lambda: os.getenv("FLASK_SECRET_KEY", "change-me"))

    fiftyone_port: int = field(default_factory=lambda: _env_int("FIFTYONE_PORT", 5051))
    fiftyone_database_uri: str | None = field(default_factory=lambda: os.getenv("FIFTYONE_DATABASE_URI"))

    mongodb_uri: str = field(default_factory=lambda: os.getenv("MONGODB_URI", "mongodb://localhost:27017/datara"))
    mongodb_password: str | None = field(default_factory=lambda: os.getenv("MONGODB_PASSWORD"))
    database_host: str = field(default_factory=lambda: os.getenv("DATABASE_HOST", "localhost"))
    database_port: int = field(default_factory=lambda: _env_int("DATABASE_PORT", 27017))
    database_name: str = field(default_factory=lambda: os.getenv("DATABASE_NAME", "datara_db"))

    azure_storage_account: str | None = field(default_factory=lambda: os.getenv("AZURE_STORAGE_ACCOUNT_NAME"))
    azure_storage_key: str | None = field(default_factory=lambda: os.getenv("AZURE_STORAGE_ACCOUNT_KEY"))
    azure_connection_string: str | None = field(
        default_factory=lambda: os.getenv("BLOB_CONNECTION_STRING") or os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    )
    azure_blob_container: str = field(default_factory=lambda: os.getenv("AZURE_BLOB_CONTAINER", "roboteyeview"))
    azure_public_container: str = field(default_factory=lambda: os.getenv("AZURE_PUBLIC_BLOB_CONTAINER", "roboteyeview-public"))
    azure_cosmos_endpoint: str | None = field(
        default_factory=lambda: os.getenv("COSMOS_ENDPOINT") or os.getenv("AZURE_COSMOS_ENDPOINT")
    )
    azure_cosmos_key: str | None = field(default_factory=lambda: os.getenv("COSMOS_DB_KEY") or os.getenv("AZURE_COSMOS_KEY"))
    azure_cosmos_database: str = field(default_factory=lambda: os.getenv("AZURE_COSMOS_DATABASE", "BlobAnnotations"))
    azure_cosmos_container: str = field(default_factory=lambda: os.getenv("AZURE_COSMOS_CONTAINER", "roboteyeview"))

    aws_access_key: str | None = field(default_factory=lambda: os.getenv("AWS_ACCESS_KEY_ID"))
    aws_secret_key: str | None = field(default_factory=lambda: os.getenv("AWS_SECRET_ACCESS_KEY"))
    aws_region: str = field(default_factory=lambda: os.getenv("AWS_REGION", "us-east-1"))

    dataset_base_path: str = field(default_factory=lambda: os.getenv("DATASET_BASE_PATH", "dataset"))
    upload_folder: str = field(default_factory=lambda: os.getenv("DATASET_UPLOAD_FOLDER", "uploads"))
    max_upload_size: int = field(default_factory=lambda: _env_int("MAX_UPLOAD_SIZE", 2 * 1024 * 1024 * 1024))

    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    log_file: str | None = field(default_factory=lambda: os.getenv("LOG_FILE"))

    cors_origins: list[str] = field(
        default_factory=lambda: _env_list(
            "CORS_ORIGINS",
            ["http://localhost:5173", "http://localhost:8080", "http://localhost"],
        )
    )
    rate_limit: int = field(default_factory=lambda: _env_int("RATE_LIMIT", 100))
    session_timeout: int = field(default_factory=lambda: _env_int("SESSION_TIMEOUT", 1440))
    session_cookie_secure: bool = field(default_factory=lambda: _env_bool("SESSION_COOKIE_SECURE", False))
    session_cookie_samesite: str = field(default_factory=lambda: os.getenv("SESSION_COOKIE_SAMESITE", "Lax"))
    session_cookie_name: str = field(default_factory=lambda: os.getenv("SESSION_COOKIE_NAME", "datara_session"))

    frontend_url: str = field(default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5173"))
    auth_post_login_path: str = field(default_factory=lambda: os.getenv("AUTH_POST_LOGIN_PATH", "/viewer"))
    auth_sqlite_path: str = field(default_factory=lambda: os.getenv("AUTH_SQLITE_PATH", str(DEFAULT_SQLITE_PATH)))
    auth_bootstrap_admin_emails: list[str] = field(default_factory=lambda: _env_list("AUTH_BOOTSTRAP_ADMIN_EMAILS"))
    auth_allow_unapproved_login_session: bool = field(default_factory=lambda: _env_bool("AUTH_ALLOW_UNAPPROVED_LOGIN_SESSION", True))

    entra_tenant_id: str | None = field(default_factory=lambda: os.getenv("ENTRA_TENANT_ID") or os.getenv("AZURE_TENANT_ID"))
    entra_client_id: str | None = field(default_factory=lambda: os.getenv("ENTRA_CLIENT_ID") or os.getenv("AZURE_CLIENT_ID"))
    entra_client_secret: str | None = field(default_factory=lambda: os.getenv("ENTRA_CLIENT_SECRET") or os.getenv("AZURE_CLIENT_SECRET"))
    entra_authority: str | None = field(default_factory=lambda: os.getenv("ENTRA_AUTHORITY"))
    entra_redirect_path: str = field(default_factory=lambda: os.getenv("ENTRA_REDIRECT_PATH", "/api/auth/callback"))
    entra_scopes: list[str] = field(
        default_factory=lambda: _env_list(
            "ENTRA_SCOPES",
            ["openid", "profile", "email", "offline_access", "User.Read"],
        )
    )

    @property
    def sqlite_path(self) -> Path:
        return Path(self.auth_sqlite_path).expanduser().resolve()

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @property
    def has_entra_config(self) -> bool:
        return bool(self.entra_client_id and self.entra_client_secret and (self.entra_authority or self.entra_tenant_id))

    def get_entra_authority(self) -> str | None:
        if self.entra_authority:
            return self.entra_authority.rstrip("/")
        if self.entra_tenant_id:
            return f"https://login.microsoftonline.com/{self.entra_tenant_id}"
        return None


settings = Settings()
