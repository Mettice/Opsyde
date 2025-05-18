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