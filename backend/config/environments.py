# config/environments.py
import os
from enum import Enum, auto
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class Environment(Enum):
    """Application environments"""
    DEVELOPMENT = auto()
    TESTING = auto()
    STAGING = auto()
    PRODUCTION = auto()
    
    @classmethod
    def from_string(cls, value: str) -> 'Environment':
        """Convert string to Environment enum"""
        mapping = {
            "dev": cls.DEVELOPMENT,
            "development": cls.DEVELOPMENT,
            "test": cls.TESTING,
            "testing": cls.TESTING,
            "stage": cls.STAGING,
            "staging": cls.STAGING,
            "prod": cls.PRODUCTION,
            "production": cls.PRODUCTION
        }
        
        return mapping.get(value.lower(), cls.DEVELOPMENT)

class EnvironmentManager:
    """Manages environment-specific configuration"""
    
    def __init__(self):
        env_str = os.getenv("ENV", "development")
        self._environment = Environment.from_string(env_str)
        self._load_env_config()
        
    def _load_env_config(self) -> None:
        """Load environment-specific configuration"""
        env_file = f".env.{self._environment.name.lower()}"
        
        if os.path.exists(env_file):
            logger.info(f"Loading environment config from {env_file}")
            # Load environment variables from file
            with open(env_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                        
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()
    
    @property
    def current(self) -> Environment:
        """Get the current environment"""
        return self._environment
    
    @property
    def is_development(self) -> bool:
        """Check if current environment is development"""
        return self._environment == Environment.DEVELOPMENT
    
    @property
    def is_testing(self) -> bool:
        """Check if current environment is testing"""
        return self._environment == Environment.TESTING
    
    @property
    def is_staging(self) -> bool:
        """Check if current environment is staging"""
        return self._environment == Environment.STAGING
    
    @property
    def is_production(self) -> bool:
        """Check if current environment is production"""
        return self._environment == Environment.PRODUCTION
    
    def get_config_path(self) -> str:
        """Get path to environment-specific config file"""
        env_name = self._environment.name.lower()
        return f"config/{env_name}.json"


# Create a global instance
env_manager = EnvironmentManager()