"""Runtime configuration for DataraAI."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import dotenv_values

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

def _load_config_environment() -> None:
    base_files = [
        PROJECT_ROOT / "config" / ".env",
        BACKEND_DIR / ".env",
        PROJECT_ROOT / ".env",
    ]

    base_values: dict[str, str] = {}
    for env_file in base_files:
        if not env_file.exists():
            continue
        base_values.update(
            {key: value for key, value in dotenv_values(env_file).items() if value is not None}
        )

    active_environment = (
        os.getenv("ENVIRONMENT")
        or os.getenv("FLASK_ENV")
        or base_values.get("ENVIRONMENT")
        or base_values.get("FLASK_ENV")
        or "development"
    )

    env_specific_files = [
        PROJECT_ROOT / "config" / f".env.{active_environment}",
        BACKEND_DIR / f".env.{active_environment}",
        PROJECT_ROOT / f".env.{active_environment}",
    ]

    merged_values: dict[str, str] = {}
    for env_file in [*base_files, *env_specific_files]:
        if not env_file.exists():
            continue
        merged_values.update(
            {key: value for key, value in dotenv_values(env_file).items() if value is not None}
        )

    for key, value in merged_values.items():
        os.environ.setdefault(key, value)

_load_config_environment()

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


def _build_azure_sqlalchemy_url(
    *,
    server: str | None,
    database: str | None,
    username: str | None,
    password: str | None,
) -> str | None:
    if not (server and database and username and password):
        return None

    quoted_username = quote_plus(username)
    quoted_password = quote_plus(password)
    return (
        f"mssql+pymssql://{quoted_username}:{quoted_password}@{server}/{database}"
        f"?charset=utf8"
    )


def _redact_database_url(value: str) -> str:
    if "://" not in value or "@" not in value:
        return value

    scheme, remainder = value.split("://", 1)
    credentials, rest = remainder.split("@", 1)
    if ":" not in credentials:
        return f"{scheme}://{credentials}@{rest}"

    username = credentials.split(":", 1)[0]
    return f"{scheme}://{username}:***@{rest}"


@dataclass(slots=True)
class Settings:
    """Application settings resolved from environment variables."""

    app_name: str = field(default_factory=lambda: os.getenv("APP_NAME", "DataraAI"))
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", os.getenv("FLASK_ENV", "development")))
    debug: bool = field(default_factory=lambda: _env_bool("DEBUG", _env_bool("ENABLE_DEBUG_LOGGING", False)))

    flask_host: str = field(default_factory=lambda: os.getenv("FLASK_HOST", "127.0.0.1"))
    flask_port: int = field(default_factory=lambda: _env_int("FLASK_PORT", 5152))
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
            ["http://localhost:5174", "http://localhost:5173", "http://localhost"],
        )
    )
    rate_limit: int = field(default_factory=lambda: _env_int("RATE_LIMIT", 100))
    session_timeout: int = field(default_factory=lambda: _env_int("SESSION_TIMEOUT", 1440))
    session_cookie_secure: bool = field(default_factory=lambda: _env_bool("SESSION_COOKIE_SECURE", False))
    session_cookie_samesite: str = field(default_factory=lambda: os.getenv("SESSION_COOKIE_SAMESITE", "Lax"))
    session_cookie_name: str = field(default_factory=lambda: os.getenv("SESSION_COOKIE_NAME", "datara_session"))
    dataset_path_cache_ttl_seconds: int = field(
        default_factory=lambda: _env_int("DATASET_PATH_CACHE_TTL_SECONDS", 180)
    )

    frontend_url: str = field(default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5174"))
    auth_post_login_path: str = field(default_factory=lambda: os.getenv("AUTH_POST_LOGIN_PATH", "/viewer"))
    auth_bootstrap_admin_emails: list[str] = field(default_factory=lambda: _env_list("AUTH_BOOTSTRAP_ADMIN_EMAILS"))
    auth_registration_enabled: bool = field(default_factory=lambda: _env_bool("AUTH_REGISTRATION_ENABLED", True))
    auth_min_password_length: int = field(default_factory=lambda: _env_int("AUTH_MIN_PASSWORD_LENGTH", 10))
    auth_allow_pending_login_session: bool = field(
        default_factory=lambda: _env_bool(
            "AUTH_ALLOW_PENDING_LOGIN_SESSION",
            _env_bool("AUTH_ALLOW_UNAPPROVED_LOGIN_SESSION", True),
        )
    )
    auth_database_url_override: str | None = field(default_factory=lambda: os.getenv("AUTH_DATABASE_URL"))
    azure_sql_server: str | None = field(default_factory=lambda: os.getenv("AZURE_SQL_SERVER"))
    azure_sql_database: str | None = field(default_factory=lambda: os.getenv("AZURE_SQL_DATABASE"))
    azure_sql_username: str | None = field(default_factory=lambda: os.getenv("AZURE_SQL_USERNAME"))
    azure_sql_password: str | None = field(default_factory=lambda: os.getenv("AZURE_SQL_PASSWORD"))
    celery_broker_url: str = field(
        repr=False,
        default_factory=lambda: os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
    )
    celery_queue_name: str = field(default_factory=lambda: os.getenv("CELERY_QUEUE_NAME", "lambda_jobs"))
    generation_worker_token: str = field(
        repr=False,
        default_factory=lambda: os.getenv("GENERATION_WORKER_TOKEN", ""),
    )

    @property
    def auth_database_url(self) -> str:
        if self.auth_database_url_override:
            return self.auth_database_url_override

        built = _build_azure_sqlalchemy_url(
            server=self.azure_sql_server,
            database=self.azure_sql_database,
            username=self.azure_sql_username,
            password=self.azure_sql_password,
        )
        if built:
            return built

        raise RuntimeError(
            "Auth database is not configured. Set AUTH_DATABASE_URL or provide "
            "AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USERNAME, and AZURE_SQL_PASSWORD."
        )

    @property
    def auth_database_label(self) -> str:
        if self.azure_sql_server and self.azure_sql_database:
            return f"{self.azure_sql_server}/{self.azure_sql_database}"
        if self.auth_database_url_override:
            return _redact_database_url(self.auth_database_url_override)
        return "unconfigured-auth-database"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"


settings = Settings()
