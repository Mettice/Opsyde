import logging
from typing import Dict, Any
from datetime import datetime

# Import all service integrations
from .image_gen import handle_image_generation
from .text_gen import handle_text_generation
from ..integrations.web_search import handle_web_search
from .llm_tools import create_llm_tool, LLMConfig, LLMProvider

logger = logging.getLogger(__name__)

class ServiceIntegrationHandler:
    """Main handler for all service integrations including LLM tools"""
    
    def __init__(self):
        self.handlers = {
            # Image generation services
            "image_generation": {
                "dalle": handle_image_generation,
                "midjourney": handle_image_generation,
                "runway": handle_image_generation
            },
            # Text generation services
            "text_generation": {
                "gpt4": handle_text_generation,
                "claude": handle_text_generation,
                "openrouter": handle_text_generation,
                "huggingface": handle_text_generation
            },
            # Web search services
            "web_search": {
                "serper": handle_web_search,
                "tavily": handle_web_search,
                "bing": handle_web_search
            },
            # LLM Tools integration
            "llm_tools": {
                "openai": self._handle_llm_tool,
                "openrouter": self._handle_llm_tool,
                "huggingface": self._handle_llm_tool
            },
            # Communication services (placeholder for future implementation)
            "communication": {
                "gmail": self._handle_gmail,
                "slack": self._handle_slack
            },
            # Data processing services (placeholder for future implementation)
            "data_processing": {
                "pandas_analyzer": self._handle_pandas_analyzer
            }
        }

    async def execute_service(self, category: str, service: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a service based on category and service name"""
        try:
            # Get the handler for this category and service
            category_handlers = self.handlers.get(category)
            if not category_handlers:
                return {
                    "success": False,
                    "error": {
                        "message": f"Unsupported service category: {category}",
                        "type": "category_error"
                    }
                }
            
            handler = category_handlers.get(service)
            if not handler:
                return {
                    "success": False,
                    "error": {
                        "message": f"Unsupported service: {service} in category: {category}",
                        "type": "service_error"
                    }
                }
            
            # Map service names to provider names for the handlers
            provider_mapping = {
                # Image generation
                "dalle": "openai",
                "midjourney": "midjourney", 
                "runway": "runway",
                # Text generation
                "gpt4": "openai",
                "claude": "anthropic",
                "openrouter": "openrouter",
                "huggingface": "huggingface",
                # Web search
                "serper": "serper",
                "tavily": "tavily",
                "bing": "bing",
                # LLM tools (providers match services for llm_tools)
                "openai_llm": "openai",
                "openrouter_llm": "openrouter", 
                "huggingface_llm": "huggingface"
            }
            
            provider = provider_mapping.get(service, service)
            
            # Execute the handler
            if category in ["image_generation", "text_generation", "web_search"]:
                result = await handler(provider, config)
            elif category == "llm_tools":
                # Special handling for LLM tools
                result = await handler(provider, config)
            else:
                # For custom handlers, pass config directly
                result = await handler(config)
            
            # Add execution metadata
            if result.get("success"):
                result.setdefault("metadata", {}).update({
                    "execution_id": f"{category}_{service}_{int(datetime.now().timestamp())}",
                    "category": category,
                    "service": service,
                    "provider": provider
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Service execution error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "execution_error"
                }
            }

    async def _handle_llm_tool(self, provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle LLM Tool execution"""
        try:
            # Map provider to LLMProvider enum
            provider_map = {
                "openai": LLMProvider.OPENAI,
                "openrouter": LLMProvider.OPENROUTER,
                "huggingface": LLMProvider.HUGGINGFACE
            }
            
            llm_provider = provider_map.get(provider)
            if not llm_provider:
                return {
                    "success": False,
                    "error": {
                        "message": f"Unsupported LLM provider: {provider}",
                        "type": "provider_error"
                    }
                }
            
            # Create LLM configuration
            llm_config = LLMConfig(
                name=f"{provider}_llm_tool",
                provider=llm_provider,
                model=config.get("model", "gpt-3.5-turbo"),
                temperature=float(config.get("temperature", 0.7)),
                max_tokens=int(config.get("max_tokens", 2000)),
                system_message=config.get("system_message"),
                stop_sequences=config.get("stop_sequences"),
                top_p=float(config.get("top_p", 1.0)),
                frequency_penalty=float(config.get("frequency_penalty", 0.0)),
                presence_penalty=float(config.get("presence_penalty", 0.0))
            )
            
            # Create and execute LLM tool
            llm_tool = create_llm_tool(llm_config)
            
            # Extract input from config
            inputs = config.get("inputs") or config.get("prompt") or config.get("input", "")
            if not inputs:
                return {
                    "success": False,
                    "error": {
                        "message": "No input provided for LLM tool",
                        "type": "configuration_error"
                    }
                }
            
            # Execute the tool
            result = await llm_tool.execute(inputs)
            
            # Convert ToolResult to standard format
            if result.success:
                return {
                    "success": True,
                    "data": {
                        "content": result.data,
                        "tool_name": result.tool_name,
                        "tool_type": str(result.tool_type.value)
                    },
                    "metadata": {
                        **result.metadata,
                        "provider": provider,
                        "timestamp": result.timestamp.isoformat()
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.error
                }
                
        except Exception as e:
            logger.error(f"LLM tool execution error: {str(e)}")
            return {
                "success": False,
                "error": {
                    "message": str(e),
                    "type": "llm_tool_error"
                }
            }

    async def _handle_gmail(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Gmail integration (placeholder)"""
        # TODO: Implement Gmail integration
        return {
            "success": False,
            "error": {
                "message": "Gmail integration not yet implemented",
                "type": "not_implemented"
            }
        }

    async def _handle_slack(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack integration (placeholder)"""
        # TODO: Implement Slack integration
        return {
            "success": False,
            "error": {
                "message": "Slack integration not yet implemented",
                "type": "not_implemented"
            }
        }

    async def _handle_pandas_analyzer(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Pandas data analysis (placeholder)"""
        # TODO: Implement Pandas data analysis
        return {
            "success": False,
            "error": {
                "message": "Pandas analyzer not yet implemented",
                "type": "not_implemented"
            }
        }

    def get_supported_services(self) -> Dict[str, list]:
        """Get list of all supported services by category"""
        supported = {}
        for category, services in self.handlers.items():
            supported[category] = list(services.keys())
        return supported

    def validate_service_config(self, category: str, service: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate service configuration"""
        try:
            # Basic validation - check if service exists
            if category not in self.handlers:
                return {
                    "valid": False,
                    "errors": [f"Unsupported category: {category}"]
                }
            
            if service not in self.handlers[category]:
                return {
                    "valid": False,
                    "errors": [f"Unsupported service: {service}"]
                }
            
            # Category-specific validation
            errors = []
            
            # Common validation for all services
            if not config:
                errors.append("Configuration is required")
                return {"valid": False, "errors": errors}
            
            # Image generation validation
            if category == "image_generation":
                if not config.get("api_key"):
                    errors.append("API key is required")
                if not config.get("prompt"):
                    errors.append("Prompt is required")
                    
            # Text generation validation
            elif category == "text_generation":
                if not config.get("api_key"):
                    errors.append("API key is required")
                if not config.get("prompt"):
                    errors.append("Prompt is required")
                    
            # Web search validation
            elif category == "web_search":
                if service != "duckduckgo" and not config.get("api_key"):
                    errors.append("API key is required")
                if not config.get("query"):
                    errors.append("Search query is required")
            
            # LLM tools validation
            elif category == "llm_tools":
                # API key is handled by environment variables for LLM tools
                if not config.get("model"):
                    errors.append("Model is required")
                if not any([config.get("inputs"), config.get("prompt"), config.get("input")]):
                    errors.append("Input/prompt is required")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Config validation error: {str(e)}")
            return {
                "valid": False,
                "errors": [str(e)]
            }

# Global instance
service_handler = ServiceIntegrationHandler()

# Convenience functions for external use
async def execute_tool_service(category: str, service: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool service - main entry point"""
    return await service_handler.execute_service(category, service, config)

def get_supported_services() -> Dict[str, list]:
    """Get all supported services"""
    return service_handler.get_supported_services()

def validate_tool_config(category: str, service: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Validate tool configuration"""
    return service_handler.validate_service_config(category, service, config)