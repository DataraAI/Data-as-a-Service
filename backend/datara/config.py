"""Configuration management for DataraAI"""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class Settings(BaseModel):
    """Application settings from environment variables"""

    model_config = ConfigDict(env_file=".env", extra="ignore")

    # App Configuration
    app_name: str = Field(default="DataraAI")
    debug: bool = Field(default=False)
    environment: str = Field(default="development")

    # Flask Configuration
    flask_host: str = Field(default="127.0.0.1")
    flask_port: int = Field(default=5151)
    flask_env: str = Field(default="development")

    # FiftyOne Configuration
    fiftyone_port: int = Field(default=5051)
    fiftyone_database_uri: Optional[str] = Field(default=None)

    # MongoDB Configuration
    mongodb_uri: str = Field(default="mongodb://localhost:27017/datara")
    mongodb_password: Optional[str] = Field(default=None)

    # Database Configuration
    database_host: str = Field(default="localhost")
    database_port: int = Field(default=27017)
    database_name: str = Field(default="datara_db")

    # Azure Configuration
    azure_storage_account: Optional[str] = Field(default=None)
    azure_storage_key: Optional[str] = Field(default=None)
    azure_connection_string: Optional[str] = Field(default=None)
    azure_blob_container: str = Field(default="roboteyeview")
    azure_cosmos_endpoint: Optional[str] = Field(default=None)
    azure_cosmos_key: Optional[str] = Field(default=None)

    # AWS Configuration
    aws_access_key: Optional[str] = Field(default=None)
    aws_secret_key: Optional[str] = Field(default=None)
    aws_region: str = Field(default="us-east-1")

    # Dataset Configuration
    dataset_base_path: str = Field(default="dataset")
    upload_folder: str = Field(default="uploads")
    max_upload_size: int = Field(default=50 * 1024 * 1024)  # 50MB

    # Logging Configuration
    log_level: str = Field(default="INFO")
    log_file: Optional[str] = Field(default=None)

    # Security Configuration
    cors_origins: list = Field(default=["http://localhost:5173", "http://localhost:8080"])
    rate_limit: int = Field(default=100)
    session_timeout: int = Field(default=1440)  # minutes

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment.lower() == "development"


# Global settings instance - loads from environment variables and .env file
settings = Settings()

