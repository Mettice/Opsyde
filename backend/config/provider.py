# config/provider.py
from typing import Dict, Any, Optional, TypeVar, Generic, Type
from functools import lru_cache
from .settings import settings

T = TypeVar('T')

class ConfigProvider:
    """
    Configuration provider with caching and type conversion
    """
    
    @staticmethod
    @lru_cache(maxsize=128)
    def get(key: str, default: Any = None) -> Any:
        """
        Get a configuration value by key path
        
        Example: get("llm.openai.api_key")
        """
        parts = key.split('.')
        
        # Start with the main settings
        current = settings
        
        # Traverse the key path
        for part in parts:
            if hasattr(current, part):
                current = getattr(current, part)
            elif isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return default
                
        return current
    
    @staticmethod
    def get_section(section: str) -> Dict[str, Any]:
        """
        Get an entire configuration section
        
        Example: get_section("llm")
        """
        if hasattr(settings, section):
            section_obj = getattr(settings, section)
            
            # Convert to dict if it's a Pydantic model
            if hasattr(section_obj, "dict"):
                return section_obj.dict()
                
            return section_obj
            
        return {}
    
    @staticmethod
    def get_typed(key: str, default: T) -> T:
        """
        Get a configuration value with type conversion
        
        Example: get_typed("workflow.max_tokens", 100)
        """
        value = ConfigProvider.get(key)
        
        if value is None:
            return default
            
        # Try to convert to the type of default
        try:
            return type(default)(value)
        except (ValueError, TypeError):
            return default