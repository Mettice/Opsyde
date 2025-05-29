"""
Workflow Execution Context with BYOK Integration
Automatically retrieves and applies user API keys during workflow execution
"""

import logging
from typing import Dict, Any, Optional
from services.user_settings_service import user_settings_service
from core.provider_registry import provider_registry, get_provider_for_execution

logger = logging.getLogger(__name__)

class WorkflowExecutionContext:
    """
    Manages workflow execution context with automatic API key resolution
    """
    
    def __init__(self, user_id: str = None, workflow_id: str = None):
        self.user_id = user_id or "system"
        self.workflow_id = workflow_id
        self.user_keys: Dict[str, str] = {}
        self.execution_metadata = {}
    
    async def initialize(self):
        """Initialize context and load user API keys"""
        try:
            if self.user_id != "system":
                # Load user's API keys
                self.user_keys = await user_settings_service.get_user_keys_for_execution(self.user_id)
                logger.info(f"Loaded {len(self.user_keys)} API keys for user {self.user_id}")
                
                # Log available providers
                available_providers = list(self.user_keys.keys())
                registered_providers = [p.id for p in provider_registry.get_all_providers()]
                logger.info(f"Available user keys: {available_providers}")
                logger.info(f"Registered providers: {registered_providers}")
            else:
                logger.info("Using system execution context (no user keys)")
                
        except Exception as e:
            logger.error(f"Failed to load user keys: {str(e)}")
            self.user_keys = {}
    
    def get_api_key_for_framework(self, framework: str, model: str = None) -> Optional[str]:
        """
        Get the appropriate API key for a framework/model combination using the provider registry
        
        Args:
            framework: The AI framework (openai, anthropic, gemini, deepseek, etc.)
            model: Specific model name (optional)
            
        Returns:
            API key string or None if not found
        """
        # Use the provider registry to determine which provider to use
        provider_id = get_provider_for_execution(framework, model)
        
        if provider_id and provider_id in self.user_keys:
            logger.debug(f"Found API key for provider: {provider_id} (framework: {framework}, model: {model})")
            return self.user_keys[provider_id]
        
        # Fallback: try direct framework mapping
        if framework in self.user_keys:
            logger.debug(f"Using direct framework mapping: {framework}")
            return self.user_keys[framework]
        
        # Fallback: try model-based detection (legacy support)
        if model:
            provider = provider_registry.get_provider_for_model(model)
            if provider and provider.id in self.user_keys:
                logger.debug(f"Found provider via model detection: {provider.id} for model: {model}")
                return self.user_keys[provider.id]
        
        logger.warning(f"No API key found for framework: {framework}, model: {model}")
        logger.debug(f"Available keys: {list(self.user_keys.keys())}")
        return None
    
    def enhance_node_config(self, node_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance node configuration with user API keys using the provider registry
        
        Args:
            node_config: Original node configuration
            
        Returns:
            Enhanced configuration with API keys applied
        """
        enhanced_config = node_config.copy()
        
        # Handle different node types
        node_type = enhanced_config.get('nodeType') or enhanced_config.get('type')
        
        if node_type in ['agent', 'task', 'tool', 'chat']:
            # Get framework configuration
            framework = enhanced_config.get('framework', 'openai')
            model = enhanced_config.get('llmModel') or enhanced_config.get('model')
            
            # Get appropriate API key using the provider registry
            api_key = self.get_api_key_for_framework(framework, model)
            
            if api_key:
                # Apply API key to different configuration structures
                if 'frameworkConfig' in enhanced_config:
                    enhanced_config['frameworkConfig']['api_key'] = api_key
                
                if 'llmConfig' in enhanced_config:
                    enhanced_config['llmConfig']['api_key'] = api_key
                
                # Direct API key field
                enhanced_config['api_key'] = api_key
                
                # Get provider info for logging
                provider_id = get_provider_for_execution(framework, model)
                provider = provider_registry.get_provider(provider_id) if provider_id else None
                provider_name = provider.name if provider else framework
                
                logger.debug(f"Applied {provider_name} API key to {node_type} node (framework: {framework})")
            else:
                # Log helpful information about missing keys
                provider_id = get_provider_for_execution(framework, model)
                if provider_id:
                    provider = provider_registry.get_provider(provider_id)
                    logger.warning(f"No API key found for {provider.name if provider else provider_id}. "
                                 f"Please add a {provider_id} key in your settings.")
                else:
                    logger.warning(f"Unknown framework/model combination: {framework}/{model}")
        
        elif node_type == 'output':
            # Handle output nodes that might need API keys for AI-powered integrations
            output_type = enhanced_config.get('outputType')
            if output_type in ['smart_output', 'ai_integration']:
                # Try to get a default API key (prefer OpenAI, then others)
                api_key = (self.user_keys.get('openai') or 
                          self.user_keys.get('anthropic') or 
                          self.user_keys.get('google') or
                          next(iter(self.user_keys.values()), None))
                
                if api_key:
                    enhanced_config['ai_api_key'] = api_key
                    logger.debug(f"Applied default AI key to output node")
        
        return enhanced_config
    
    def get_execution_metadata(self) -> Dict[str, Any]:
        """Get execution metadata including available keys and providers"""
        available_providers = []
        for key_provider in self.user_keys.keys():
            provider = provider_registry.get_provider(key_provider)
            if provider:
                available_providers.append({
                    'id': provider.id,
                    'name': provider.name,
                    'icon': provider.icon
                })
        
        return {
            'user_id': self.user_id,
            'workflow_id': self.workflow_id,
            'available_providers': available_providers,
            'available_provider_ids': list(self.user_keys.keys()),
            'has_user_keys': len(self.user_keys) > 0,
            'execution_mode': 'user_keys' if self.user_keys else 'system',
            'total_registered_providers': len(provider_registry.get_all_providers())
        }

# Global context manager
_execution_contexts: Dict[str, WorkflowExecutionContext] = {}

async def get_execution_context(user_id: str = None, workflow_id: str = None) -> WorkflowExecutionContext:
    """
    Get or create execution context for a user/workflow
    """
    context_key = f"{user_id or 'system'}_{workflow_id or 'default'}"
    
    if context_key not in _execution_contexts:
        context = WorkflowExecutionContext(user_id, workflow_id)
        await context.initialize()
        _execution_contexts[context_key] = context
    
    return _execution_contexts[context_key]

async def clear_execution_context(user_id: str = None, workflow_id: str = None):
    """Clear execution context (useful for key updates)"""
    context_key = f"{user_id or 'system'}_{workflow_id or 'default'}"
    if context_key in _execution_contexts:
        del _execution_contexts[context_key] 