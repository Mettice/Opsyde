# config/settings.py
import os
from typing import Dict, Any, Optional, List
from pydantic import Field, validator
from pydantic_settings import BaseSettings
import json
import logging

class LoggingSettings(BaseSettings):
    """Logging configuration settings"""
    LEVEL: str = Field("INFO", env="LOG_LEVEL")
    FORMAT: str = Field("%(asctime)s - %(name)s - %(levelname)s - %(message)s", env="LOG_FORMAT")
    FILE_PATH: Optional[str] = Field(None, env="LOG_FILE")
    
    class Config:
        env_prefix = "LOG_"
        case_sensitive = True

class APISettings(BaseSettings):
    """API configuration settings"""
    HOST: str = Field("0.0.0.0", env="API_HOST")
    PORT: int = Field(8000, env="API_PORT")
    DEBUG: bool = Field(False, env="API_DEBUG")
    TIMEOUT: int = Field(60, env="API_TIMEOUT")
    CORS_ORIGINS: List[str] = Field(["*"], env="API_CORS_ORIGINS")
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        env_prefix = "API_"
        case_sensitive = True

class SecuritySettings(BaseSettings):
    """Security configuration settings"""
    SECRET_KEY: str = Field("supersecretkey", env="SECURITY_SECRET_KEY")
    TOKEN_EXPIRY: int = Field(86400, env="SECURITY_TOKEN_EXPIRY")
    ALGORITHM: str = Field("HS256", env="SECURITY_ALGORITHM")
    
    class Config:
        env_prefix = "SECURITY_"
        case_sensitive = True

class LLMSettings(BaseSettings):
    """LLM API configuration settings"""
    OPENAI_API_KEY: Optional[str] = Field(None, env="OPENAI_API_KEY")
    OPENROUTER_API_KEY: Optional[str] = Field(None, env="OPENROUTER_API_KEY")
    HUGGINGFACE_API_KEY: Optional[str] = Field(None, env="HUGGINGFACE_API_KEY")
    DEFAULT_MODEL: str = Field("gpt-3.5-turbo", env="LLM_DEFAULT_MODEL")
    MAX_TOKENS: int = Field(4000, env="LLM_MAX_TOKENS")
    TEMPERATURE: float = Field(0.7, env="LLM_TEMPERATURE")
    
    class Config:
        env_prefix = "LLM_"
        case_sensitive = True

class WorkflowSettings(BaseSettings):
    """Workflow execution settings"""
    MAX_RESULTS_SIZE: int = Field(100, env="WORKFLOW_MAX_RESULTS_SIZE")
    CLEANUP_THRESHOLD: int = Field(80, env="WORKFLOW_CLEANUP_THRESHOLD")
    MAX_CONCURRENT_NODES: int = Field(10, env="WORKFLOW_MAX_CONCURRENT_NODES")
    MAX_EXECUTION_TIME: int = Field(3600, env="WORKFLOW_MAX_EXECUTION_TIME")
    
    class Config:
        env_prefix = "WORKFLOW_"
        case_sensitive = True

class OutputSettings(BaseSettings):
    """Output handling configuration settings"""
    RATE_LIMIT_CALLS: int = Field(100, env="OUTPUT_RATE_LIMIT_CALLS")
    RATE_LIMIT_PERIOD: int = Field(60, env="OUTPUT_RATE_LIMIT_PERIOD")
    
    class Config:
        env_prefix = "OUTPUT_"
        case_sensitive = True

class NodeSettings(BaseSettings):
    """Node-specific settings"""
    DEFAULT_TIMEOUT: int = Field(30, env="NODE_DEFAULT_TIMEOUT")
    MAX_RETRIES: int = Field(3, env="NODE_MAX_RETRIES")
    DEFAULT_BATCH_SIZE: int = Field(10, env="NODE_BATCH_SIZE")
    
    # LLM settings
    DEFAULT_LLM_MODEL: str = Field("gpt-3.5-turbo", env="DEFAULT_LLM_MODEL")
    DEFAULT_TEMPERATURE: float = Field(0.7, env="DEFAULT_TEMPERATURE")
    MAX_TOKENS_LIMIT: int = Field(4000, env="MAX_TOKENS_LIMIT")
    
    # Tool settings
    TOOL_TIMEOUT: int = Field(60, env="TOOL_TIMEOUT")
    MAX_PARALLEL_TOOLS: int = Field(5, env="MAX_PARALLEL_TOOLS")
    
    class Config:
        env_prefix = "NODE_"

class Settings(BaseSettings):
    """Main application settings"""
    APP_NAME: str = Field("CrewFlow", env="APP_NAME")
    ENV: str = Field("development", env="ENV")
    VERSION: str = Field("0.1.0", env="VERSION")
    
    # Direct output settings (for backward compatibility)
    OUTPUT_RATE_LIMIT_CALLS: int = Field(100, env="OUTPUT_RATE_LIMIT_CALLS")
    OUTPUT_RATE_LIMIT_PERIOD: int = Field(60, env="OUTPUT_RATE_LIMIT_PERIOD")
    
    # Email settings (optional)
    EMAIL_SENDER: Optional[str] = Field(None, env="EMAIL_SENDER")
    EMAIL_PASSWORD: Optional[str] = Field(None, env="EMAIL_PASSWORD")
    
    # Google settings (optional)
    GOOGLE_CREDS_FILE: Optional[str] = Field(None, env="GOOGLE_CREDS_FILE")
    
    # Server settings
    PORT: str = Field("8000", env="PORT")
    HOST: str = Field("0.0.0.0", env="HOST")
    DEBUG: str = Field("True", env="DEBUG")
    
    # Supabase settings (optional)
    VITE_SUPABASE_URL: Optional[str] = Field(None, env="VITE_SUPABASE_URL")
    VITE_SUPABASE_ANON_KEY: Optional[str] = Field(None, env="VITE_SUPABASE_ANON_KEY")
    
    # API Keys (optional)
    OPENAI_API_KEY: Optional[str] = Field(None, env="OPENAI_API_KEY")
    OPENROUTER_API_KEY: Optional[str] = Field(None, env="OPENROUTER_API_KEY")
    HUGGINGFACE_API_KEY: Optional[str] = Field(None, env="HUGGINGFACE_API_KEY")
    
    # Sub-settings
    logging: LoggingSettings = LoggingSettings()
    api: APISettings = APISettings()
    security: SecuritySettings = SecuritySettings()
    llm: LLMSettings = LLMSettings()
    workflow: WorkflowSettings = WorkflowSettings()
    output: OutputSettings = OutputSettings()
    node: NodeSettings = NodeSettings()
    
    # Custom settings loaded from file
    custom: Dict[str, Any] = {}
    
    def load_from_file(self, file_path: str) -> None:
        """Load settings from a JSON file"""
        try:
            with open(file_path, "r") as f:
                file_settings = json.load(f)
                
            # Update custom settings
            self.custom.update(file_settings.get("custom", {}))
            
            # Update sub-settings if defined
            if "logging" in file_settings:
                self.logging = LoggingSettings(**file_settings["logging"])
                
            if "api" in file_settings:
                self.api = APISettings(**file_settings["api"])
                
            if "security" in file_settings:
                self.security = SecuritySettings(**file_settings["security"])
                
            if "llm" in file_settings:
                self.llm = LLMSettings(**file_settings["llm"])
                
            if "workflow" in file_settings:
                self.workflow = WorkflowSettings(**file_settings["workflow"])
                
            if "output" in file_settings:
                self.output = OutputSettings(**file_settings["output"])
                
            if "node" in file_settings:
                self.node = NodeSettings(**file_settings["node"])
                
        except Exception as e:
            logging.error(f"Error loading settings from file {file_path}: {str(e)}")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in the environment

# Create a global settings instance
settings = Settings()

# Load from environment-specific file if available
env_file = os.getenv("CONFIG_FILE")
if env_file and os.path.exists(env_file):
    settings.load_from_file(env_file)

def get_settings() -> Settings:
    return settings