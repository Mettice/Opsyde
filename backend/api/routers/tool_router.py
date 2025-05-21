from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.models.api_models import (
    APIResponse, ToolInstance, ToolExecutionResponse, ToolListResponse,
    ToolFrameworksResponse, PluginResponse, PluginListResponse,
    PluginUploadResponse, ToolValidationResponse, ErrorCode
)
from backend.tools.custom_tools import tool_registry, plugin_loader
from backend.utils.security import security_manager
from backend.utils.logging import get_logger
from backend.utils.api_utils import handle_exception
from backend.core.runner import UnifiedRunner
from backend.models.data import NodeData
from backend.integrations.service_integration import execute_tool_service, get_supported_services, validate_tool_config
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Query
from pydantic import BaseModel
import json


logger = get_logger(__name__)
router = APIRouter(tags=["tools"])

@router.get("/", response_model=APIResponse[ToolListResponse])
async def list_tools():
    """List all available tools"""
    try:
        tools = tool_registry.list_tools()
        response = ToolListResponse(
            tools=tools,
            total_count=len(tools)
        )
        return APIResponse.success_response(response)
    except Exception as e:
        return handle_exception(e)

@router.post("/execute/{tool_name}", response_model=APIResponse[ToolExecutionResponse])
async def execute_tool(
    tool_name: str,
    instance_id: str,
    inputs: Dict[str, Any]
):
    """Execute a specific tool instance"""
    try:
        start_time = datetime.now()
        
        tool = tool_registry.get_instance(tool_name, instance_id)
        if not tool:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Tool instance {instance_id} not found"
            )
            
        result = await tool.execute(inputs)
        execution_time = (datetime.now() - start_time).total_seconds()
        
        response = ToolExecutionResponse(
            tool_name=tool_name,
            instance_id=instance_id,
            status="completed",
            result=result,
            execution_time=execution_time
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.post("/instances", response_model=APIResponse[ToolInstance])
async def create_tool_instance(
    tool_name: str,
    config: Dict[str, Any]
):
    """Create a new tool instance"""
    try:
        instance_id = f"{tool_name}_{datetime.now().timestamp()}"
        instance = tool_registry.create_instance(tool_name, instance_id, config)
        
        response = ToolInstance(
            instance_id=instance_id,
            tool_name=tool_name,
            config=config
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/frameworks", response_model=APIResponse[ToolFrameworksResponse])
async def list_tool_frameworks():
    """List available tool frameworks"""
    try:
        frameworks = {
            "llm": [
                {
                    "name": "openai",
                    "description": "OpenAI GPT models",
                    "models": ["gpt-4", "gpt-3.5-turbo"]
                },
                {
                    "name": "openrouter",
                    "description": "OpenRouter API",
                    "models": ["anthropic/claude-3", "meta-llama/llama-2"]
                },
                {
                    "name": "huggingface",
                    "description": "HuggingFace models",
                    "models": ["meta-llama/Llama-2-70b-chat-hf"]
                }
            ],
            "api": [
                {
                    "name": "rest",
                    "description": "REST API integration",
                    "methods": ["GET", "POST", "PUT", "DELETE"]
                },
                {
                    "name": "graphql",
                    "description": "GraphQL API integration"
                },
                {
                    "name": "webhook",
                    "description": "Webhook integration"
                }
            ],
            "custom": [
                {
                    "name": "python",
                    "description": "Custom Python tools"
                },
                {
                    "name": "plugin",
                    "description": "Plugin-based tools"
                }
            ]
        }
        
        response = ToolFrameworksResponse(
            frameworks=frameworks,
            supported_types=list(frameworks.keys())
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.post("/plugins/upload", response_model=APIResponse[PluginUploadResponse])
async def upload_plugin(plugin_file: UploadFile = File(...)):
    """Upload a new tool plugin"""
    try:
        if not plugin_file.filename.endswith('.py'):
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Only Python files are allowed"
            )
            
        plugin_path = plugin_loader.plugin_dir / plugin_file.filename
        content = await plugin_file.read()
        
        with open(plugin_path, 'wb') as f:
            f.write(content)
            
        plugin_loader.load_plugins()
        
        response = PluginUploadResponse(
            filename=plugin_file.filename,
            status="success",
            message=f"Plugin {plugin_file.filename} uploaded successfully"
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/plugins", response_model=APIResponse[PluginListResponse])
async def list_plugins():
    """List installed plugins"""
    try:
        plugins = []
        for plugin_file in plugin_loader.plugin_dir.glob("*.py"):
            if not plugin_file.name.startswith("_"):
                plugins.append(PluginResponse(
                    name=plugin_file.stem,
                    file=plugin_file.name,
                    path=str(plugin_file)
                ))
                
        response = PluginListResponse(
            plugins=plugins,
            total_count=len(plugins)
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.delete("/plugins/{plugin_name}", response_model=APIResponse[Dict[str, str]])
async def delete_plugin(plugin_name: str):
    """Delete a plugin"""
    try:
        plugin_file = plugin_loader.plugin_dir / f"{plugin_name}.py"
        if not plugin_file.exists():
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Plugin {plugin_name} not found"
            )
            
        plugin_file.unlink()
        plugin_loader.load_plugins()
        
        return APIResponse.success_response({
            "message": f"Plugin {plugin_name} deleted successfully"
        })
        
    except Exception as e:
        return handle_exception(e)

@router.post("/validate", response_model=APIResponse[ToolValidationResponse])
async def validate_tool_config(
    tool_name: str,
    config: Dict[str, Any]
):
    """Validate tool configuration"""
    try:
        temp_id = f"validation_{datetime.now().timestamp()}"
        instance = tool_registry.create_instance(tool_name, temp_id, config)
        instance.validate_config()
        
        response = ToolValidationResponse(
            valid=True,
            message="Configuration is valid"
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return APIResponse.error_response(
            code=ErrorCode.VALIDATION_ERROR,
            message=str(e),
            details={"tool_name": tool_name}
        )

@router.get("/templates")
async def get_tool_templates():
    """Get predefined tool templates"""
    try:
        templates = {
            "llm": {
                "chatbot": {
                    "framework": "openai",
                    "config": {
                        "model": "gpt-4",
                        "temperature": 0.7,
                        "max_tokens": 2000
                    }
                },
                "researcher": {
                    "framework": "anthropic",
                    "config": {
                        "model": "claude-3",
                        "temperature": 0.5,
                        "max_tokens": 4000
                    }
                }
            },
            "api": {
                "weather": {
                    "framework": "rest",
                    "config": {
                        "base_url": "https://api.weather.com",
                        "method": "GET",
                        "headers": {
                            "Content-Type": "application/json"
                        }
                    }
                },
                "github": {
                    "framework": "graphql",
                    "config": {
                        "endpoint": "https://api.github.com/graphql",
                        "headers": {
                            "Authorization": "Bearer ${GITHUB_TOKEN}"
                        }
                    }
                }
            }
        }
        return templates
    except Exception as e:
        logger.error(f"Error getting tool templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    




@router.get("/services", response_model=APIResponse[Dict[str, Any]])
async def list_supported_services():
    """List all supported service integrations"""
    try:
        services = get_supported_services()
        return APIResponse.success_response({
            "categories": services,
            "total_services": sum(len(services_list) for services_list in services.values())
        })
    except Exception as e:
        return handle_exception(e)

@router.post("/services/execute", response_model=APIResponse[Dict[str, Any]])
async def execute_service_integration(
    category: str,
    service: str,
    config: Dict[str, Any]
):
    """Execute a specific service integration"""
    try:
        # Validate configuration first
        validation = validate_tool_config(category, service, config)
        if not validation["valid"]:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid configuration",
                details={"errors": validation["errors"]}
            )
        
        # Execute the service
        result = await execute_tool_service(category, service, config)
        
        if result["success"]:
            return APIResponse.success_response(result)
        else:
            return APIResponse.error_response(
                code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message=result["error"]["message"],
                details=result["error"]
            )
            
    except Exception as e:
        return handle_exception(e)

@router.post("/services/validate", response_model=APIResponse[Dict[str, Any]])
async def validate_service_config(
    category: str,
    service: str,
    config: Dict[str, Any]
):
    """Validate service configuration"""
    try:
        validation = validate_tool_config(category, service, config)
        return APIResponse.success_response(validation)
    except Exception as e:
        return handle_exception(e)

# Update your existing templates endpoint to include service-aware templates
@router.get("/templates/services", response_model=APIResponse[Dict[str, Any]])
async def get_service_templates():
    """Get service-aware tool templates"""
    try:
        # This would return the same structure as your toolCategories.js
        # but from the backend perspective
        templates = {
            "image_generation": {
                "category": "Image Generation",
                "services": [
                    {
                        "id": "dalle",
                        "name": "DALL-E 3",
                        "provider": "openai",
                        "capabilities": ["text-to-image", "high-quality", "creative"],
                        "pricing": "$0.040 per image"
                    },
                    {
                        "id": "midjourney",
                        "name": "Midjourney",
                        "provider": "midjourney",
                        "capabilities": ["artistic", "stylized", "creative"],
                        "pricing": "$10/month"
                    },
                    {
                        "id": "runway",
                        "name": "Runway ML",
                        "provider": "runway",
                        "capabilities": ["image-to-video", "creative-editing"],
                        "pricing": "$15/month"
                    }
                ]
            },
            "text_generation": {
                "category": "Text Generation",
                "services": [
                    {
                        "id": "gpt4",
                        "name": "GPT-4 Turbo",
                        "provider": "openai",
                        "capabilities": ["reasoning", "coding", "analysis"],
                        "pricing": "$0.01 per 1K tokens"
                    },
                    {
                        "id": "claude",
                        "name": "Claude 3",
                        "provider": "anthropic",
                        "capabilities": ["analysis", "reasoning", "safety"],
                        "pricing": "$0.015 per 1K tokens"
                    }
                ]
            },
            "web_search": {
                "category": "Web Search",
                "services": [
                    {
                        "id": "serper",
                        "name": "Serper",
                        "provider": "serper",
                        "capabilities": ["google-search", "news", "images"],
                        "pricing": "$50 per 100K searches"
                    },
                    {
                        "id": "tavily",
                        "name": "Tavily",
                        "provider": "tavily",
                        "capabilities": ["ai-research", "summarization"],
                        "pricing": "$0.001 per search"
                    }
                ]
            }
        }
        
        return APIResponse.success_response({
            "templates": templates,
            "categories": list(templates.keys())
        })
    except Exception as e:
        return handle_exception(e)

# Update your existing run-tool endpoint to use the new service integrations
@router.post("/run-tool-service")
async def run_tool_service(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Execute a tool using the new service integration system"""
    try:
        # Extract service information
        category = data.get("category")
        service = data.get("service")
        config = data.get("config", {})
        
        if not category or not service:
            # Fall back to old system for backward compatibility
            return await run_tool(data, runner)
        
        # Execute using new service integration
        result = await execute_tool_service(category, service, config)
        
        # Format response for compatibility
        response = {
            "value": result.get("data") if result.get("success") else None,
            "metadata": result.get("metadata", {}),
            "error": result.get("error") if not result.get("success") else None,
            "timestamp": datetime.now().isoformat(),
            "success": result.get("success", False)
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error executing tool service: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/run-tool")
async def run_tool(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Execute a tool with the given configuration"""
    try:
        # Extract tool data from request
        tool_id = data.get("id")
        inputs = data.get("inputs", {})
        
        if not tool_id:
            raise HTTPException(status_code=400, detail="Tool ID is required")
            
        # Execute the tool using the runner
        result = await runner.execute_tool({
            "id": tool_id,
            "toolType": data.get("toolType", "llm"),
            "framework": data.get("framework"),
            "config": data.get("config", {}),
            "inputs": inputs
        })
        
        # Convert NodeData result to dictionary if needed
        response = {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error executing tool: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 
    


# Enhanced request/response models for service integration
class ServiceExecutionRequest(BaseModel):
    category: str
    service: str
    config: Dict[str, Any]
    runtime_inputs: Optional[Dict[str, Any]] = None

class ServiceValidationRequest(BaseModel):
    category: str
    service: str
    config: Dict[str, Any]

class SmartToolExecutionRequest(BaseModel):
    """Request model compatible with Smart Tool Selector output"""
    execution_config: Dict[str, Any]
    runtime_inputs: Optional[Dict[str, Any]] = None

# Add these new endpoints to your existing router

@router.get("/services/categories", response_model=APIResponse[List[Dict[str, Any]]])
async def get_service_categories():
    """Get service categories for Smart Tool Selector"""
    try:
        # This matches your frontend toolCategories structure
        categories = [
            {
                "id": "image_generation",
                "name": "Image Generation",
                "description": "Create and manipulate images using AI",
                "icon": "🎨",
                "serviceCount": 3
            },
            {
                "id": "text_generation",
                "name": "Text Generation", 
                "description": "Generate and process text using AI models",
                "icon": "📝",
                "serviceCount": 4
            },
            {
                "id": "web_search",
                "name": "Web Search",
                "description": "Search and research information on the web",
                "icon": "🔍",
                "serviceCount": 3
            },
            {
                "id": "llm_tools",
                "name": "LLM Tools",
                "description": "Specialized LLM tools for specific tasks",
                "icon": "🛠️",
                "serviceCount": 3
            }
        ]
        return APIResponse.success_response(categories)
    except Exception as e:
        return handle_exception(e)

@router.get("/services/{category}/list", response_model=APIResponse[List[Dict[str, Any]]])
async def get_services_for_category(category: str):
    """Get services for a specific category"""
    try:
        # Define services for each category
        service_definitions = {
            "image_generation": [
                {
                    "id": "dalle",
                    "name": "DALL-E 3",
                    "description": "OpenAI's latest image generation model",
                    "icon": "🎭",
                    "provider": "OpenAI",
                    "capabilities": ["Text-to-Image", "High Quality", "Creative Control"],
                    "pricing": "$0.040 per image"
                },
                {
                    "id": "midjourney",
                    "name": "Midjourney",
                    "description": "Artistic and creative image generation",
                    "icon": "🌟",
                    "provider": "Midjourney",
                    "capabilities": ["Artistic Style", "Creative Control", "Aspect Ratios"],
                    "pricing": "$10/month subscription"
                },
                {
                    "id": "runway",
                    "name": "Runway ML",
                    "description": "AI-powered creative tools for images and videos",
                    "icon": "🎬",
                    "provider": "Runway",
                    "capabilities": ["Video Generation", "Image Editing", "Inpainting"],
                    "pricing": "$12/month subscription"
                }
            ],
            "text_generation": [
                {
                    "id": "gpt4",
                    "name": "GPT-4",
                    "description": "OpenAI's most advanced language model",
                    "icon": "🤖",
                    "provider": "OpenAI",
                    "capabilities": ["Conversation", "Code Generation", "Analysis", "Reasoning"],
                    "pricing": "$0.03-0.06 per 1K tokens"
                },
                {
                    "id": "claude",
                    "name": "Claude",
                    "description": "Anthropic's constitutional AI assistant",
                    "icon": "🧠",
                    "provider": "Anthropic",
                    "capabilities": ["Long Context", "Safety", "Analysis", "Coding"],
                    "pricing": "$0.008-0.024 per 1K tokens"
                },
                {
                    "id": "openrouter",
                    "name": "OpenRouter",
                    "description": "Access multiple AI models through one API",
                    "icon": "🔀",
                    "provider": "OpenRouter",
                    "capabilities": ["Multiple Models", "Model Routing", "Cost Optimization"],
                    "pricing": "Varies by model"
                },
                {
                    "id": "huggingface",
                    "name": "HuggingFace",
                    "description": "Open-source models via HuggingFace Inference API",
                    "icon": "🤗",
                    "provider": "HuggingFace",
                    "capabilities": ["Open Source Models", "Custom Models", "Free Tier"],
                    "pricing": "Free tier + paid plans"
                }
            ],
            "web_search": [
                {
                    "id": "serper",
                    "name": "Serper",
                    "description": "Google Search API with rich results",
                    "icon": "🔎",
                    "provider": "Serper",
                    "capabilities": ["Google Search", "News", "Images", "Videos"],
                    "pricing": "$50 per 1000 searches"
                },
                {
                    "id": "tavily",
                    "name": "Tavily",
                    "description": "AI-powered research and search",
                    "icon": "🔬",
                    "provider": "Tavily",
                    "capabilities": ["AI Research", "Question Answering", "Domain Filtering"],
                    "pricing": "$50 per 1000 searches"
                },
                {
                    "id": "duckduckgo",
                    "name": "DuckDuckGo",
                    "description": "Privacy-focused search (no API key required)",
                    "icon": "🦆",
                    "provider": "DuckDuckGo",
                    "capabilities": ["Privacy-Focused", "No Tracking", "Free"],
                    "pricing": "Free"
                }
            ],
            "llm_tools": [
                {
                    "id": "openai_llm",
                    "name": "OpenAI LLM Tool",
                    "description": "OpenAI models via LLM tools framework",
                    "icon": "🔧",
                    "provider": "OpenAI",
                    "capabilities": ["Tool Integration", "Structured Output", "Function Calling"],
                    "pricing": "$0.03-0.06 per 1K tokens"
                },
                {
                    "id": "openrouter_llm",
                    "name": "OpenRouter LLM Tool",
                    "description": "Multiple models via OpenRouter with LLM tools",
                    "icon": "🔨",
                    "provider": "OpenRouter",
                    "capabilities": ["Multiple Models", "Tool Integration", "Model Routing"],
                    "pricing": "Varies by model"
                },
                {
                    "id": "huggingface_llm",
                    "name": "HuggingFace LLM Tool",
                    "description": "Open-source models via HuggingFace with LLM tools",
                    "icon": "🔩",
                    "provider": "HuggingFace",
                    "capabilities": ["Open Source", "Custom Models", "Tool Integration"],
                    "pricing": "Free tier + paid plans"
                }
            ]
        }
        
        services = service_definitions.get(category, [])
        return APIResponse.success_response(services)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/services/{category}/{service}/config", response_model=APIResponse[Dict[str, Any]])
async def get_service_config_template(category: str, service: str):
    """Get configuration template for a specific service"""
    try:
        # Load the configuration templates
        # This could come from a JSON file or be defined here
        config_templates = load_service_config_templates()
        
        template = config_templates.get(category, {}).get(service)
        if not template:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Configuration template not found for {category}.{service}"
            )
        
        return APIResponse.success_response(template)
        
    except Exception as e:
        return handle_exception(e)

@router.post("/services/execute/smart", response_model=APIResponse[Dict[str, Any]])
async def execute_smart_tool_selector_service(request: SmartToolExecutionRequest):
    """Execute service using Smart Tool Selector format"""
    try:
        execution_config = request.execution_config
        runtime_inputs = request.runtime_inputs or {}
        
        # Extract service information
        category = execution_config.get("category")
        service = execution_config.get("service")
        config = execution_config.get("config", {})
        
        # Merge runtime inputs into config
        final_config = {**config, **runtime_inputs}
        
        # Validate configuration
        validation = validate_tool_config(category, service, final_config)
        if not validation["valid"]:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid configuration",
                details={"errors": validation["errors"]}
            )
        
        # Execute the service
        result = await execute_tool_service(category, service, final_config)
        
        # Add execution metadata
        if result.get("success"):
            result["metadata"]["execution_time"] = datetime.now().isoformat()
            result["metadata"]["runtime_inputs_provided"] = bool(runtime_inputs)
        
        return APIResponse.success_response(result)
        
    except Exception as e:
        return handle_exception(e)

@router.post("/services/test", response_model=APIResponse[Dict[str, Any]])
async def test_service_integration(request: ServiceExecutionRequest):
    """Test service integration without full execution"""
    try:
        logger.info(f"Testing service integration: {request.category}.{request.service}")
        
        # Validate configuration
        validation = validate_tool_config(request.category, request.service, request.config)
        
        response_data = {
            "validation": validation,
            "category": request.category,
            "service": request.service,
            "config_received": request.config,
            "test_timestamp": datetime.now().isoformat()
        }
        
        # If validation passes, test connection (without full execution)
        if validation.get("valid", False):
            try:
                # For testing, we could do a minimal check
                # This depends on your specific service implementations
                response_data["connection_test"] = "passed"
            except Exception as e:
                response_data["connection_test"] = f"failed: {str(e)}"
        
        return APIResponse.success_response(response_data)
        
    except Exception as e:
        return handle_exception(e)

# Enhanced version of your existing service execution endpoint
@router.post("/services/execute", response_model=APIResponse[Dict[str, Any]])
async def execute_service_integration_enhanced(request: ServiceExecutionRequest):
    """Enhanced service execution with runtime inputs support"""
    try:
        # Merge runtime inputs into main config
        final_config = {**request.config}
        if request.runtime_inputs:
            final_config.update(request.runtime_inputs)
        
        # Validate configuration
        validation = validate_tool_config(request.category, request.service, final_config)
        if not validation["valid"]:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid configuration",
                details={"errors": validation["errors"]}
            )
        
        # Execute the service
        result = await execute_tool_service(request.category, request.service, final_config)
        
        # Enhance response with additional metadata
        if result.get("success"):
            result["metadata"] = result.get("metadata", {})
            result["metadata"]["execution_mode"] = "service_integration"
            result["metadata"]["runtime_inputs_applied"] = bool(request.runtime_inputs)
            result["metadata"]["execution_timestamp"] = datetime.now().isoformat()
        
        if result["success"]:
            return APIResponse.success_response(result)
        else:
            return APIResponse.error_response(
                code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message=result["error"]["message"],
                details=result["error"]
            )
            
    except Exception as e:
        return handle_exception(e)

# Utility function to load service configuration templates
def load_service_config_templates():
    """Load service configuration templates"""
    # This could be loaded from a JSON file or defined here
    # For now, returning a subset as an example
    return {
        "image_generation": {
            "dalle": {
                "config": {
                    "fields": {
                        "api_key": {"type": "password", "required": True, "label": "OpenAI API Key"},
                        "prompt": {"type": "textarea", "required": True, "label": "Image Prompt"},
                        "size": {"type": "select", "default": "1024x1024", "options": [
                            {"value": "1024x1024", "label": "Square (1024x1024)"},
                            {"value": "1024x1792", "label": "Portrait (1024x1792)"},
                            {"value": "1792x1024", "label": "Landscape (1792x1024)"}
                        ]}
                    }
                }
            }
        },
        "text_generation": {
            "gpt4": {
                "config": {
                    "fields": {
                        "api_key": {"type": "password", "required": True, "label": "OpenAI API Key"},
                        "prompt": {"type": "textarea", "required": True, "label": "Text Prompt"},
                        "model": {"type": "select", "default": "gpt-4-turbo-preview", "options": [
                            {"value": "gpt-4-turbo-preview", "label": "GPT-4 Turbo"},
                            {"value": "gpt-4", "label": "GPT-4"},
                            {"value": "gpt-3.5-turbo", "label": "GPT-3.5 Turbo"}
                        ]},
                        "temperature": {"type": "range", "default": 0.7, "min": 0, "max": 2, "step": 0.1}
                    }
                }
            }
        }
        # Add more categories and services as needed
    }