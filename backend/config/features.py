# config/features.py
from typing import Dict, Any, Optional, Set
from .provider import ConfigProvider
import os
import json
import logging

logger = logging.getLogger(__name__)

class FeatureFlags:
    """
    Feature flag management for gradual rollouts and testing
    """
    
    def __init__(self):
        self._flags = {}
        self._load_flags()
        
    def _load_flags(self) -> None:
        """Load feature flags from configuration"""
        # Try to load from environment
        flags_json = os.getenv("FEATURE_FLAGS")
        if flags_json:
            try:
                self._flags.update(json.loads(flags_json))
            except json.JSONDecodeError:
                logger.error("Failed to parse FEATURE_FLAGS environment variable")
                
        # Load from custom settings
        custom_flags = ConfigProvider.get("custom.feature_flags", {})
        if custom_flags:
            self._flags.update(custom_flags)
        
    def is_enabled(self, flag_name: str, default: bool = False) -> bool:
        """
        Check if a feature flag is enabled
        
        Args:
            flag_name: Name of the flag
            default: Default value if flag is not defined
            
        Returns:
            True if the flag is enabled, False otherwise
        """
        if flag_name not in self._flags:
            return default
            
        value = self._flags[flag_name]
        
        # Handle different value types
        if isinstance(value, bool):
            return value
        elif isinstance(value, str):
            return value.lower() in ("true", "yes", "1", "on")
        elif isinstance(value, int):
            return value != 0
            
        return default
        
    def get_value(self, flag_name: str, default: Any = None) -> Any:
        """
        Get the value of a feature flag
        
        Args:
            flag_name: Name of the flag
            default: Default value if flag is not defined
            
        Returns:
            The flag value or default
        """
        return self._flags.get(flag_name, default)
    
    def get_all_flags(self) -> Dict[str, Any]:
        """Get all feature flags"""
        return dict(self._flags)
    
    def get_enabled_flags(self) -> Set[str]:
        """Get names of all enabled flags"""
        return {
            name for name, value in self._flags.items()
            if self.is_enabled(name)
        }
    
    def reload(self) -> None:
        """Reload feature flags from configuration"""
        self._flags.clear()
        self._load_flags()


# Create a global instance
feature_flags = FeatureFlags()