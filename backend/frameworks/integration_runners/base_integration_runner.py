# backend/frameworks/integration_runners/base_integration_runner.py
import logging
import json
import aiohttp
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from abc import ABC, abstractmethod

from frameworks.universal_api_runner import UniversalAPIRunner
from utils.logging import get_logger

logger = get_logger(__name__)

class BaseIntegrationRunner(UniversalAPIRunner, ABC):
    """
    Base class for all integration category runners
    Extends Universal API runner with category-specific optimizations
    """
    
    def __init__(self, category_name: str):
        super().__init__()
        self.category_name = category_name
        self.platform_configs = {}
        self.auth_handlers = {}
        self.response_transformers = {}
        
    @abstractmethod
    def get_supported_platforms(self) -> List[str]:
        """Return list of supported platforms for this category"""
        pass
    
    @abstractmethod
    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        """Get platform-specific configuration"""
        pass
    
    def register_platform(self, platform: str, config: Dict[str, Any]):
        """Register a platform with its configuration"""
        self.platform_configs[platform] = config
        logger.info(f"✅ Registered {platform} for {self.category_name} category")
    
    def register_auth_handler(self, platform: str, handler_func):
        """Register custom authentication handler for a platform"""
        self.auth_handlers[platform] = handler_func
        logger.info(f"✅ Registered auth handler for {platform}")
    
    def register_response_transformer(self, platform: str, transformer_func):
        """Register response transformer for platform-specific formatting"""
        self.response_transformers[platform] = transformer_func
        logger.info(f"✅ Registered response transformer for {platform}")
    
    async def execute_integration(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main execution method with category-specific optimizations
        """
        try:
            # Extract platform and tool information
            service_name = inputs.get('api_service_name', '')
            platform = self._extract_platform_from_service(service_name)
            
            logger.info(f"🔧 Executing {self.category_name} integration for {platform}")
            
            # Apply platform-specific configuration if available
            if platform in self.platform_configs:
                inputs = self._apply_platform_config(inputs, platform)
            
            # Apply custom authentication if available
            if platform in self.auth_handlers:
                inputs = await self._apply_custom_auth(inputs, platform)
            
            # Execute the API call using the parent Universal API runner
            result = await super().run_universal_api_tool(inputs)
            
            # Apply response transformation if available
            if platform in self.response_transformers:
                result = self._transform_response(result, platform)
            
            # Add category-specific metadata
            if result.get('success'):
                result['metadata'] = result.get('metadata', {})
                result['metadata'].update({
                    'category': self.category_name,
                    'platform': platform,
                    'executed_at': datetime.utcnow().isoformat(),
                    'runner_type': f'{self.category_name}_integration'
                })
            
            return result
            
        except Exception as e:
            logger.error(f"❌ {self.category_name} integration failed: {str(e)}")
            return {
                'success': False,
                'data': None,
                'error': f'{self.category_name} integration error: {str(e)}',
                'metadata': {
                    'category': self.category_name,
                    'error_type': type(e).__name__,
                    'failed_at': datetime.utcnow().isoformat()
                }
            }
    
    def _extract_platform_from_service(self, service_name: str) -> str:
        """Extract platform name from service name"""
        service_lower = service_name.lower()
        
        for platform in self.get_supported_platforms():
            if platform.lower() in service_lower:
                return platform
        
        return service_name.split('_')[0] if '_' in service_name else service_name
    
    def _apply_platform_config(self, inputs: Dict[str, Any], platform: str) -> Dict[str, Any]:
        """Apply platform-specific configuration to inputs"""
        config = self.platform_configs.get(platform, {})
        
        # Apply default headers
        if 'headers' in config:
            if 'headers' not in inputs:
                inputs['headers'] = {}
            inputs['headers'].update(config['headers'])
        
        # Apply base URL if not present
        if 'base_url' in config and 'base_url' not in inputs:
            inputs['base_url'] = config['base_url']
        
        # Apply authentication type
        if 'auth_type' in config and 'auth_type' not in inputs:
            inputs['auth_type'] = config['auth_type']
        
        # Apply default parameters
        if 'default_params' in config:
            if 'parameters' not in inputs:
                inputs['parameters'] = {}
            
            # Merge default parameters (inputs take precedence)
            for key, value in config['default_params'].items():
                if key not in inputs['parameters']:
                    inputs['parameters'][key] = value
        
        return inputs
    
    async def _apply_custom_auth(self, inputs: Dict[str, Any], platform: str) -> Dict[str, Any]:
        """Apply custom authentication logic for platform"""
        auth_handler = self.auth_handlers.get(platform)
        if auth_handler:
            try:
                inputs = await auth_handler(inputs)
            except Exception as e:
                logger.warning(f"⚠️ Custom auth handler failed for {platform}: {e}")
        
        return inputs
    
    def _transform_response(self, result: Dict[str, Any], platform: str) -> Dict[str, Any]:
        """Transform response using platform-specific transformer"""
        transformer = self.response_transformers.get(platform)
        if transformer and result.get('success'):
            try:
                result['data'] = transformer(result['data'])
                logger.info(f"✅ Applied response transformation for {platform}")
            except Exception as e:
                logger.warning(f"⚠️ Response transformation failed for {platform}: {e}")
        
        return result
    
    def get_category_info(self) -> Dict[str, Any]:
        """Get information about this integration category"""
        return {
            'category': self.category_name,
            'supported_platforms': self.get_supported_platforms(),
            'registered_platforms': list(self.platform_configs.keys()),
            'has_custom_auth': list(self.auth_handlers.keys()),
            'has_transformers': list(self.response_transformers.keys()),
            'runner_class': self.__class__.__name__
        }
    
    async def test_platform_connection(self, platform: str, auth_config: Dict[str, Any]) -> Dict[str, Any]:
        """Test connection to a specific platform"""
        if platform not in self.get_supported_platforms():
            return {
                'success': False,
                'error': f'Platform {platform} not supported by {self.category_name} category'
            }
        
        try:
            # Create a test API call (usually a simple GET to verify auth)
            test_inputs = {
                'api_service_name': platform,
                'api_endpoint_hint': 'test_connection',
                **auth_config
            }
            
            # Override with platform-specific test endpoint if configured
            config = self.platform_configs.get(platform, {})
            if 'test_endpoint' in config:
                test_inputs['api_endpoint_hint'] = config['test_endpoint']
            
            result = await self.execute_integration(test_inputs)
            
            return {
                'success': result.get('success', False),
                'platform': platform,
                'category': self.category_name,
                'tested_at': datetime.utcnow().isoformat(),
                'error': result.get('error') if not result.get('success') else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'platform': platform,
                'category': self.category_name,
                'error': str(e),
                'tested_at': datetime.utcnow().isoformat()
            }


# Utility function to create integration runner instances
def create_integration_runner(category: str, runner_class):
    """Factory function to create integration runner instances"""
    try:
        runner = runner_class(category)
        logger.info(f"✅ Created {category} integration runner")
        return runner
    except Exception as e:
        logger.error(f"❌ Failed to create {category} integration runner: {e}")
        return None 