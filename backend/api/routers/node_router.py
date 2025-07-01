from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import json
from pydantic import BaseModel

from models.nodes import Node
from models.data import NodeData
from models.api_models import (
    APIResponse, NodeExecutionResponse, NodeValidationResponse,
    NodeTypesResponse, FrameworksResponse, ErrorCode
)
from core.node_processor import node_processor, NodeProcessor
from utils.security import security_manager, get_current_user, get_current_user_optional
from utils.logging import get_logger
from utils.api_utils import handle_exception
from core.runner import UnifiedRunner
from core.execution_strategies import SequentialStrategy
from core.workflow_execution_context import WorkflowExecutionContext

logger = get_logger(__name__)
router = APIRouter(tags=["nodes"])

class NodeExecutionRequest(BaseModel):
    node_data: Dict[str, Any]
    inputs: Dict[str, Any] = {}
    context: Optional[Dict[str, Any]] = None

class EnhancedNodeExecutionRequest(BaseModel):
    node_type: str
    node_data: Dict[str, Any]
    inputs: Dict[str, Any] = {}
    agent_data: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None
    execution_mode: str = "enhanced"
    enable_smart_mapping: bool = True
    enable_multimodal: bool = True

class StreamingWorkflowRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    inputs: Dict[str, Any] = {}
    execution_mode: str = "streaming"
    enable_real_time_updates: bool = True

@router.post("/execute", response_model=APIResponse[NodeExecutionResponse])
async def execute_node(
    node_data: Dict[str, Any],
    inputs: Dict[str, Any] = None
):
    """Execute a single node"""
    try:
        start_time = datetime.now()
        
        # Convert input dictionaries to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in (inputs or {}).items()
        }
        
        result = await node_processor.process_node(node_data, node_inputs)
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # Convert NodeData result to dictionary
        result_dict = {
            "value": result.value,
            "metadata": result.metadata,
            "error": result.error,
            "timestamp": result.timestamp.isoformat()
        }
        
        response = NodeExecutionResponse(
            node_id=node_data.get("id", "unknown"),
            node_type=node_data.get("type", "unknown"),
            status="completed" if not result.error else "error",
            result=result_dict,
            execution_time=execution_time
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.post("/validate", response_model=APIResponse[NodeValidationResponse])
async def validate_node(node_data: Dict[str, Any]):
    """Validate node configuration"""
    try:
        node_type = node_data.get("type")
        if not node_type:
            return APIResponse.error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Node type is required"
            )
            
        validation_result = await _validate_node_config(node_type, node_data)
        response = NodeValidationResponse(**validation_result)
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/types", response_model=APIResponse[NodeTypesResponse])
async def list_node_types():
    """List available node types and their configurations"""
    try:
        node_types = {
            "agent": {
                "description": "AI agent node",
                "config_schema": {
                    "role": "string",
                    "goal": "string",
                    "backstory": "string",
                    "llmModel": "string",
                    "temperature": "number",
                    "maxTokens": "number"
                }
            },
            "task": {
                "description": "Task execution node",
                "config_schema": {
                    "description": "string",
                    "expectedOutput": "string",
                    "async": "boolean"
                }
            },
            "tool": {
                "description": "Tool integration node",
                "config_schema": {
                    "toolType": "string",
                    "framework": "string",
                    "config": "object"
                }
            },
            "trigger": {
                "description": "Workflow trigger node",
                "config_schema": {
                    "triggerType": "string",
                    "config": "object"
                }
            },
            "logic": {
                "description": "Conditional logic node",
                "config_schema": {
                    "condition": "string"
                }
            },
            "delay": {
                "description": "Delay execution node",
                "config_schema": {
                    "duration": "string"
                }
            },
            "chat": {
                "description": "Chat interaction node",
                "config_schema": {
                    "prompt": "string",
                    "model": "string",
                    "temperature": "number"
                }
            }
        }
        
        response = NodeTypesResponse(
            types=node_types,
            total_count=len(node_types)
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/frameworks", response_model=APIResponse[FrameworksResponse])
async def list_frameworks():
    """List available frameworks for different node types"""
    try:
        frameworks = {
            "agent": [
                "openai",
                "anthropic",
                "crewai",
                "autogen",
                "openrouter",
                "huggingface"
            ],
            "tool": {
                "llm": [
                    "openai",
                    "openrouter",
                    "huggingface"
                ],
                "api": [
                    "rest",
                    "graphql",
                    "webhook"
                ]
            }
        }
        
        response = FrameworksResponse(
            frameworks=frameworks,
            supported_types=list(frameworks.keys())
        )
        return APIResponse.success_response(response)
        
    except Exception as e:
        return handle_exception(e)

async def _validate_node_config(node_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Validate node configuration based on type"""
    try:
        validation_errors = []
        
        if node_type == "agent":
            required = ["role", "goal", "llmModel"]
            for field in required:
                if field not in config:
                    validation_errors.append(f"Missing required field: {field}")
                    
        elif node_type == "task":
            if "description" not in config:
                validation_errors.append("Missing task description")
                
        elif node_type == "tool":
            if "toolType" not in config:
                validation_errors.append("Missing tool type")
            if "framework" not in config:
                validation_errors.append("Missing framework")
                
        elif node_type == "trigger":
            if "triggerType" not in config:
                validation_errors.append("Missing trigger type")
                
        elif node_type == "logic":
            if "condition" not in config:
                validation_errors.append("Missing condition")
                
        elif node_type == "delay":
            if "duration" not in config:
                validation_errors.append("Missing duration")
                
        elif node_type == "chat":
            if "prompt" not in config:
                validation_errors.append("Missing prompt")
                
        if validation_errors:
            return {
                "valid": False,
                "errors": validation_errors
            }
            
        return {
            "valid": True
        }
        
    except Exception as e:
        logger.error(f"Error in node validation: {str(e)}")
        return {
            "valid": False,
            "errors": [str(e)]
        }

@router.post("/test")
async def test_node(
    node_data: Dict[str, Any],
    test_inputs: Dict[str, Any]
):
    """Test a node with sample inputs"""
    try:
        # Execute node with test inputs
        result = await node_processor.process_node(node_data, test_inputs)
        return {
            "success": True,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error testing node: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/templates")
async def get_node_templates():
    """Get predefined node templates"""
    try:
        templates = {
            "agent": {
                "researcher": {
                    "role": "Research Assistant",
                    "goal": "Conduct thorough research and analysis",
                    "backstory": "Expert researcher with deep analytical skills",
                    "llmModel": "gpt-4"
                },
                "writer": {
                    "role": "Content Writer",
                    "goal": "Create engaging and informative content",
                    "backstory": "Experienced writer with expertise in various topics",
                    "llmModel": "gpt-4"
                }
            },
            "tool": {
                "web_search": {
                    "toolType": "api",
                    "framework": "rest",
                    "config": {
                        "base_url": "https://api.search.com",
                        "method": "GET"
                    }
                },
                "data_processor": {
                    "toolType": "custom",
                    "framework": "python",
                    "config": {
                        "module": "data_processing",
                        "function": "process_data"
                    }
                }
            }
        }
        return templates
    except Exception as e:
        logger.error(f"Error getting node templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-input")
async def run_input(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run an input node with the given data"""
    try:
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        result = await runner.execute_node(
            node_type="input",
            node_data={
                "id": data["node_id"],
                "data": data.get("data", {})
            },
            inputs=node_inputs
        )
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running input node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-agent")
async def run_agent(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run an agent node with the given data"""
    try:
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        result = await runner.execute_node(
            node_type="agent",
            node_data={
                "id": data["node_id"],
                "data": data.get("data", {})
            },
            inputs=node_inputs
        )
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running agent node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-tool")
async def run_tool(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run a tool node with the given data"""
    try:
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        result = await runner.execute_tool({
            "id": data["node_id"],
            "toolType": data.get("toolType", "llm"),
            "framework": data.get("framework"),
            "config": data.get("config", {}),
            "inputs": node_inputs
        })
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running tool node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-chat")
async def run_chat(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run a chat node with the given data"""
    try:
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        result = await runner.execute_node(
            node_type="chat",
            node_data={
                "id": data["node_id"],
                "data": data.get("data", {})
            },
            inputs=node_inputs
        )
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running chat node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-task")
async def run_task(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run a task node with the given agent data"""
    try:
        logger.info(f"Running task node with data: {data}")
        
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        # Get agent data - it should be in 'agent' field of inputs
        agent_data = data.get("agent", {})
        
        # Log to debug what agent data we have
        logger.info(f"Agent data for task: {agent_data}")
        
        if not agent_data:
            # Check if it's nested in the inputs
            if 'inputs' in data and 'agent' in data['inputs']:
                agent_data = data['inputs']['agent']
                logger.info(f"Found agent data in inputs: {agent_data}")
        
        # Validate agent data
        if not agent_data:
            raise HTTPException(status_code=400, detail="Task requires agent data but none was provided")
        
        # Ensure we have all required agent fields
        required_fields = ["framework", "llmModel", "temperature", "max_tokens"]
        missing_fields = [field for field in required_fields if field not in agent_data]
        
        if missing_fields:
            # Try to use reasonable defaults
            defaults = {
                "framework": "openai",
                "llmModel": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 4000
            }
            
            for field in missing_fields:
                agent_data[field] = defaults[field]
            
            logger.warning(f"Added default values for missing agent fields: {missing_fields}")
        
        # Create task data
        task_data = {
            "id": data["node_id"],
            "agent_id": agent_data.get("id") or agent_data.get("nodeId") or "unknown",
            "description": data.get("description", ""),
            "expected_output": data.get("expectedOutput", ""),
            "is_async": data.get("isAsync", False)
        }
        
        # Include the task node data from the request if available
        if "data" in data:
            task_data.update(data["data"])
        
        result = await runner.execute_node(
            node_type="task",
            node_data=task_data,
            inputs=node_inputs
        )
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running task node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-logic")
async def run_logic(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run a logic node with the given data"""
    try:
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        result = await runner.execute_node(
            node_type="logic",
            node_data={
                "id": data["node_id"],
                "data": data.get("data", {})
            },
            inputs=node_inputs
        )
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running logic node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-delay")
async def run_delay(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run a delay node with the given data"""
    try:
        # Convert input data to NodeData objects
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in data.get("inputs", {}).items()
        }
        
        result = await runner.execute_node(
            node_type="delay",
            node_data={
                "id": data["node_id"],
                "data": data.get("data", {})
            },
            inputs=node_inputs
        )
        
        # Convert NodeData result to dictionary
        return {
            "value": result.value if isinstance(result, NodeData) else result.get("value"),
            "metadata": result.metadata if isinstance(result, NodeData) else result.get("metadata"),
            "error": result.error if isinstance(result, NodeData) else result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running delay node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-output")
async def run_output(
    data: Dict[str, Any],
    runner: UnifiedRunner = Depends()
) -> Dict[str, Any]:
    """Run an output node with the given data"""
    try:
        logger.info(f"Running output node with data: {data}")
        
        # Check if node_id is provided
        if "node_id" not in data:
            logger.error("Missing node_id in output node request")
            return {
                "value": {
                    "type": "output_result",
                    "output_type": data.get("output_type", "email"),
                    "success": False,
                    "summary": "Missing node ID",
                    "error": "Node ID is required"
                },
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                },
                "error": "Node ID is required", 
                "timestamp": datetime.now().isoformat(),
                "type": "output_result",
                "node_id": "unknown"
            }
        
        # Convert input data to NodeData objects
        node_inputs = {}
        for key, value in data.get("inputs", {}).items():
            try:
                if isinstance(value, dict) and "value" in value:
                    # It's already in a compatible format
                    node_inputs[key] = NodeData.from_value(value["value"])
                elif not isinstance(value, NodeData):
                    # Wrap in NodeData
                    node_inputs[key] = NodeData.from_value(value)
                else:
                    # Already a NodeData object
                    node_inputs[key] = value
            except Exception as e:
                logger.error(f"Error processing input {key}: {str(e)}")
                node_inputs[key] = NodeData.from_value(str(value))
        
        # Create a structured node data object
        node_data = {
            "id": data["node_id"],
            "output_type": data.get("output_type", "email"),  # Default to email if not specified
            "config": data.get("config", {}),
            "email": data.get("email", ""),  # Add direct email field if available
        }
        
        # Include any special fields directly
        for field in ["email", "subject", "webhook_url", "discord_webhook_url", "sheet_id"]:
            if field in data:
                node_data[field] = data[field]
        
        # Include the output node data from the request if available
        if "data" in data:
            node_data.update(data["data"])
        
        # Make sure we have a value to output
        if not node_inputs or "input" not in node_inputs:
            # Create a default input if none provided
            default_message = "No input provided"
            if "message" in data:
                default_message = data["message"]
            elif "body" in data:
                default_message = data["body"]
            elif "content" in data:
                default_message = data["content"]
                
            node_inputs["input"] = NodeData.from_value({
                "value": default_message,
                "metadata": {"source": "default"},
                "error": None
            })
            logger.warning(f"No input provided for output node {data['node_id']}, using default")
        
        logger.info(f"Executing output node with inputs: {node_inputs}")
        
        try:
            # Execute with error handling
            result = await runner.execute_node(
                node_type="output",
                node_data=node_data,
                inputs=node_inputs
            )
            
            # Create a friendly result that UI can show
            ui_friendly_result = {
                "value": {
                    "type": "output_result",
                    "output_type": node_data["output_type"],
                    "success": True if not result.error else False,
                    "summary": "Output processed successfully" if not result.error else "Output processing failed",
                    "data": result.value,
                    "error": result.error,
                },
                "metadata": result.metadata or {},
                "error": result.error,
                "timestamp": datetime.now().isoformat(),
                "type": "output_result",
                "node_id": data["node_id"]
            }
            
            return ui_friendly_result
            
        except Exception as inner_e:
            logger.error(f"Error executing output node: {str(inner_e)}", exc_info=True)
            return {
                "value": {
                    "type": "output_result",
                    "output_type": node_data["output_type"],
                    "success": False,
                    "summary": "Output processing failed",
                    "error": str(inner_e)
                },
                "metadata": {
                    "node_id": data["node_id"],
                    "timestamp": datetime.now().isoformat(),
                },
                "error": str(inner_e),
                "timestamp": datetime.now().isoformat(),
                "type": "output_result",
                "node_id": data["node_id"]
            }
        
    except Exception as e:
        logger.error(f"Error running output node: {str(e)}", exc_info=True)
        return {
            "value": {
                "type": "output_result", 
                "output_type": data.get("output_type", "unknown"),
                "success": False,
                "summary": "Output processing failed",
                "error": str(e)
            },
            "metadata": {},
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "type": "output_result",
            "node_id": data.get("node_id", "unknown")
        } 
    

@router.post("/run-universal-api-tool")
async def run_universal_api_tool_endpoint(
    data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    '''Run a universal API tool with AI configuration'''
    try:
        from frameworks.universal_api_runner import run_universal_api_tool
        
        # Extract configuration
        config = data.get("config", {})
        inputs = data.get("inputs", {})
        
        # Convert input data to NodeData objects if needed
        from models.data import NodeData
        node_inputs = {
            key: NodeData.from_value(value) if not isinstance(value, NodeData) else value
            for key, value in inputs.items()
        }
        
        # Execute universal API tool
        result = await run_universal_api_tool(config, inputs)
        
        return {
            "success": result.get("success", False),
            "value": result.get("data"),
            "metadata": result.get("metadata", {}),
            "error": result.get("error"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error running universal API tool: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/input")
async def run_input_enhanced(
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Enhanced input node execution with LLM-centric processing and multimodal support
    Supports text, file, URL, and multimodal inputs with intelligent processing
    """
    try:
        logger.info("🎯 Enhanced input node endpoint called")
        
        # Extract node, inputs, and context from request
        node_data = data.get("node", {})
        inputs = data.get("inputs", {})
        context = data.get("context", {})
        
        node_id = node_data.get("id", "unknown")
        node_type = node_data.get("type", "input")
        node_config = node_data.get("data", {})
        
        logger.info(f"Processing input node: {node_id}, type: {node_config.get('inputType', 'text')}")
        
        # Use the enhanced input node processor
        from nodes.input_node import InputNode
        
        input_processor = InputNode()
        result = await input_processor.process(node_config, inputs, context)
        
        # Format response for frontend consumption
        if result.is_error():
            return {
                "success": False,
                "error": result.get_error(),
                "data": None,
                "metadata": {
                    "node_id": node_id,
                    "node_type": node_type,
                    "timestamp": datetime.now().isoformat()
                }
            }
        else:
            result_value = result.get_value()
            
            # Ensure we have the standardized format
            if isinstance(result_value, dict) and "data" in result_value:
                return {
                    "success": result_value.get("success", True),
                    "data": result_value.get("data", {}),
                    "metadata": result_value.get("metadata", {}),
                    "error": result_value.get("error"),
                    "timestamp": datetime.now().isoformat()
                }
            else:
                # Fallback format
                return {
                    "success": True,
                    "data": {
                        "type": "input_result",
                        "value": result_value,
                        "text_content": str(result_value) if result_value else ""
                    },
                    "metadata": {
                        "node_id": node_id,
                        "node_type": node_type,
                        "timestamp": datetime.now().isoformat(),
                        "llm_processed": False
                    },
                    "error": None
                }
        
    except Exception as e:
        logger.error(f"Error in enhanced input node endpoint: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        return {
            "success": False,
            "error": str(e),
            "data": None,
            "metadata": {
                "node_id": data.get("node", {}).get("id", "unknown"),
                "node_type": "input",
                "timestamp": datetime.now().isoformat(),
                "error_type": type(e).__name__
            }
        }

@router.post("/execute-enhanced")
async def execute_node_enhanced(
    request: NodeExecutionRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced node execution with LLM context and smart mapping"""
    try:
        logger.info(f"🧠 Enhanced node execution request for: {request.node_data.get('type', 'unknown')}")
        
        # Initialize enhanced node processor
        processor = NodeProcessor(
            llm_mode_enabled=request.context.get("llm_mode_enabled", True),
            smart_mapping_enabled=request.context.get("smart_mapping_enabled", True)
        )
        
        # Create execution context
        context = WorkflowExecutionContext(
            user_id=current_user.get("user_id") if current_user else "anonymous",
            workflow_id=request.context.get("workflow_id", "single_node"),
            user_api_keys=request.context.get("user_keys", {})
        )
        
        # Process node with enhanced context
        result = await processor.process_node(
            node=request.node_data,
            inputs=request.inputs,
            context=context.to_dict()
        )
        
        logger.info(f"✅ Enhanced node execution completed successfully")
        
        return {
            "success": True,
            "data": result.data if hasattr(result, 'data') else result,
            "metadata": {
                "node_type": request.node_data.get("type"),
                "execution_mode": "enhanced",
                "llm_processed": True,
                "smart_mapping_enabled": request.context.get("smart_mapping_enabled", True),
                "execution_timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Enhanced node execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhanced execution failed: {str(e)}")

@router.post("/execute-llm")
async def execute_node_llm_centric(
    request: EnhancedNodeExecutionRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """LLM-centric node execution with intelligent routing"""
    try:
        logger.info(f"🧠 LLM-centric execution for {request.node_type} node")
        
        # Initialize LLM-centric processor
        processor = NodeProcessor(
            llm_mode_enabled=True,
            smart_mapping_enabled=request.enable_smart_mapping
        )
        
        # Create enhanced execution context
        context = WorkflowExecutionContext(
            user_id=current_user.get("user_id") if current_user else "anonymous",
            workflow_id=request.context.get("workflow_id", "llm_single_node"),
            user_api_keys=request.context.get("user_keys", {})
        )
        
        # Enhance context with LLM-specific data
        enhanced_context = context.to_dict()
        enhanced_context.update({
            "execution_mode": "llm_centric",
            "enable_smart_mapping": request.enable_smart_mapping,
            "enable_multimodal": request.enable_multimodal,
            "agent_data": request.agent_data,
            "node_metadata": {
                "node_type": request.node_type,
                "execution_strategy": "llm_centric"
            }
        })
        
        # Process with LLM routing
        result = await processor.process_node(
            node={
                "id": request.context.get("node_id", "llm_node"),
                "type": request.node_type,
                "data": request.node_data
            },
            inputs=request.inputs,
            context=enhanced_context
        )
        
        logger.info(f"✅ LLM-centric execution completed")
        
        return {
            "success": True,
            "data": result.data if hasattr(result, 'data') else result,
            "output": result.data if hasattr(result, 'data') else result,
            "metadata": {
                "node_type": request.node_type,
                "execution_mode": "llm_centric",
                "llm_processed": True,
                "smart_mapping_applied": request.enable_smart_mapping,
                "framework": enhanced_context.get("framework_used", "unknown"),
                "execution_time": enhanced_context.get("execution_time", 0),
                "token_usage": enhanced_context.get("token_usage", {}),
                "execution_timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ LLM-centric execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM execution failed: {str(e)}")

@router.post("/input-enhanced")
async def execute_input_node_enhanced(
    request: NodeExecutionRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced input node execution with multimodal support"""
    try:
        logger.info("📥 Enhanced input node execution")
        
        # Initialize processor with multimodal support
        processor = NodeProcessor(
            llm_mode_enabled=request.context.get("llm_mode_enabled", True),
            smart_mapping_enabled=request.context.get("smart_mapping_enabled", True)
        )
        
        # Create context with multimodal processing options
        context = WorkflowExecutionContext(
            user_id=current_user.get("user_id") if current_user else "anonymous",
            workflow_id=request.context.get("workflow_id", "input_processing"),
            user_api_keys=request.context.get("user_keys", {})
        )
        
        # Add input-specific processing options
        enhanced_context = context.to_dict()
        enhanced_context.update({
            "processing_options": request.context.get("processing_options", {}),
            "enable_multimodal": True,
            "enable_content_extraction": True,
            "enable_entity_recognition": True
        })
        
        # Process input node
        result = await processor.process_node(
            node=request.node_data,
            inputs=request.inputs,
            context=enhanced_context
        )
        
        logger.info("✅ Enhanced input processing completed")
        
        return {
            "success": True,
            "data": result.data if hasattr(result, 'data') else result,
            "value": result.data if hasattr(result, 'data') else result,
            "metadata": {
                "node_type": "input",
                "input_type": request.node_data.get("data", {}).get("input_type", "text"),
                "llm_processed": True,
                "multimodal_supported": True,
                "smart_mapping_applied": request.context.get("smart_mapping_enabled", True),
                "execution_timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Enhanced input execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Input processing failed: {str(e)}")

@router.post("/workflows/execute-stream")
async def execute_workflow_stream(
    request: StreamingWorkflowRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Streaming workflow execution with real-time LLM processing updates"""
    try:
        logger.info(f"🚀 Starting streaming workflow execution with {len(request.nodes)} nodes")
        
        # Initialize LLM-centric strategy
        strategy = SequentialStrategy(
            max_concurrency=5,
            enable_streaming=True
        )
        
        # Prepare execution inputs with LLM context
        execution_inputs = {
            **request.inputs,
            "execution_context": {
                "user_id": current_user.get("user_id") if current_user else "anonymous",
                "execution_mode": "streaming",
                "timestamp": datetime.now().isoformat()
            },
            "llm_mode_enabled": True,
            "smart_mapping_enabled": True,
            "enable_real_time_updates": request.enable_real_time_updates,
            "user_keys": request.inputs.get("user_keys", {})
        }
        
        async def stream_generator():
            """Generate streaming updates"""
            try:
                async for update in strategy.execute(request.nodes, request.edges, execution_inputs):
                    # Format update as JSON line
                    json_line = json.dumps(update) + "\n"
                    yield json_line.encode('utf-8')
                    
            except Exception as e:
                logger.error(f"❌ Streaming execution error: {str(e)}")
                error_update = {
                    "type": "workflow_error",
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                yield (json.dumps(error_update) + "\n").encode('utf-8')
        
        return StreamingResponse(
            stream_generator(),
            media_type="application/x-ndjson",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Streaming workflow setup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Streaming setup failed: {str(e)}")

@router.post("/workflows/execute-enhanced")
async def execute_workflow_enhanced(
    request: StreamingWorkflowRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced workflow execution with LLM context and smart mapping"""
    try:
        logger.info(f"🧠 Enhanced workflow execution with {len(request.nodes)} nodes")
        
        # Initialize hybrid strategy with LLM support
        strategy = SequentialStrategy(max_concurrency=10)
        
        # Prepare execution inputs
        execution_inputs = {
            **request.inputs,
            "execution_context": {
                "user_id": current_user.get("user_id") if current_user else "anonymous",
                "execution_mode": "enhanced",
                "timestamp": datetime.now().isoformat()
            },
            "llm_mode_enabled": True,
            "smart_mapping_enabled": True,
            "enable_llm_routing": True,
            "user_keys": request.inputs.get("user_keys", {})
        }
        
        # Collect all results
        results = []
        async for update in strategy.execute(request.nodes, request.edges, execution_inputs):
            results.append(update)
        
        # Process final results
        successful_nodes = [r for r in results if r.get("status") == "completed"]
        failed_nodes = [r for r in results if r.get("status") == "error"]
        
        logger.info(f"✅ Enhanced workflow completed: {len(successful_nodes)} successful, {len(failed_nodes)} failed")
        
        return {
            "success": len(failed_nodes) == 0,
            "results": results,
            "summary": {
                "total_nodes": len(request.nodes),
                "successful": len(successful_nodes),
                "failed": len(failed_nodes),
                "execution_mode": "enhanced",
                "llm_processed": True
            },
            "metadata": {
                "execution_timestamp": datetime.now().isoformat(),
                "strategy": "hybrid_with_llm",
                "smart_mapping_enabled": True
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Enhanced workflow execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhanced workflow failed: {str(e)}")

# Enhanced individual node type endpoints
@router.post("/run-task-enhanced")
async def run_task_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced task node execution"""
    try:
        logger.info("📋 Enhanced task execution")
        
        task_data = request.get("task_data", {})
        agent_data = request.get("agent_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        # Create enhanced task execution request
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type="task",
            node_data=task_data,
            inputs=inputs,
            agent_data=agent_data,
            context=context,
            execution_mode="llm_centric"
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Enhanced task execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Task execution failed: {str(e)}")

@router.post("/run-chat-enhanced")
async def run_chat_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced chat node execution"""
    try:
        logger.info("💬 Enhanced chat execution")
        
        chat_data = request.get("chat_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type="chat",
            node_data=chat_data,
            inputs=inputs,
            context=context,
            execution_mode="llm_centric"
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Enhanced chat execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat execution failed: {str(e)}")

@router.post("/run-agent-enhanced")
async def run_agent_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced agent node execution"""
    try:
        logger.info("🤖 Enhanced agent execution")
        
        agent_data = request.get("agent_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type="agent",
            node_data=agent_data,
            inputs=inputs,
            context=context,
            execution_mode="llm_centric"
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Enhanced agent execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

@router.post("/run-output-enhanced")
async def run_output_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced output node execution"""
    try:
        logger.info("📤 Enhanced output execution")
        
        output_data = request.get("output_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type="output",
            node_data=output_data,
            inputs=inputs,
            context=context,
            execution_mode="llm_centric"
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Enhanced output execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Output execution failed: {str(e)}")

@router.post("/run-logic-enhanced")
async def run_logic_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced logic node execution"""
    try:
        logger.info("🔀 Enhanced logic execution")
        
        logic_data = request.get("logic_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type="logic",
            node_data=logic_data,
            inputs=inputs,
            context=context,
            execution_mode="llm_centric"
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Enhanced logic execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logic execution failed: {str(e)}")

@router.post("/run-delay-enhanced")
async def run_delay_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Enhanced delay node execution"""
    try:
        logger.info("⏱️ Enhanced delay execution")
        
        delay_data = request.get("delay_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type="delay",
            node_data=delay_data,
            inputs=inputs,
            context=context,
            execution_mode="standard"  # Delay doesn't need LLM processing
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Enhanced delay execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delay execution failed: {str(e)}")

@router.post("/execute-generic-enhanced")
async def execute_generic_enhanced(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Generic enhanced node execution"""
    try:
        node_type = request.get("node_type", "unknown")
        logger.info(f"🔧 Generic enhanced execution for: {node_type}")
        
        node_data = request.get("node_data", {})
        inputs = request.get("inputs", {})
        context = request.get("context", {})
        
        enhanced_request = EnhancedNodeExecutionRequest(
            node_type=node_type,
            node_data=node_data,
            inputs=inputs,
            context=context,
            execution_mode="enhanced"
        )
        
        return await execute_node_llm_centric(enhanced_request, current_user)
        
    except Exception as e:
        logger.error(f"❌ Generic enhanced execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generic execution failed: {str(e)}")

@router.post("/workflows/validate")
async def validate_workflow(request: Request):
    """Validate a complete workflow"""
    try:
        data = await request.json()
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        
        # Basic validation
        if not nodes:
            return {
                "valid": False,
                "errors": ["No nodes found in workflow"]
            }
        
        # Validate each node
        errors = []
        for node in nodes:
            node_type = node.get("type")
            if not node_type:
                errors.append(f"Node {node.get('id', 'unknown')} missing type")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "node_count": len(nodes),
            "edge_count": len(edges)
        }
        
    except Exception as e:
        return {
            "valid": False,
            "errors": [f"Validation failed: {str(e)}"]
        }

@router.post("/field-mapping/map")
async def map_fields(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """
    Map fields using explicit field mappings instead of smart guessing.
    This is the new preferred method for data mapping.
    """
    try:
        source_data = request.get('source_data', {})
        field_mappings = request.get('field_mappings', {})
        node_type = request.get('node_type', 'unknown')
        
        from backend.core.simple_mapper import map_fields_simple
        
        mapped_data = map_fields_simple(source_data, field_mappings, node_type)
        
        return {
            "success": True,
            "mapped_data": mapped_data,
            "mapping_count": len(field_mappings),
            "mapped_fields": list(mapped_data.keys())
        }
        
    except Exception as e:
        logger.error(f"Field mapping failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/field-mapping/available-fields")
async def get_available_fields(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """
    Get available fields from data for UI display.
    """
    try:
        data = request.get('data', {})
        
        from backend.core.simple_mapper import get_available_fields_simple
        
        available_fields = get_available_fields_simple(data)
        
        return {
            "success": True,
            "available_fields": available_fields,
            "field_count": len(available_fields)
        }
        
    except Exception as e:
        logger.error(f"Getting available fields failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/field-mapping/validate")
async def validate_field_mappings(
    request: Dict[str, Any],
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    """
    Validate field mappings against available fields.
    """
    try:
        field_mappings = request.get('field_mappings', {})
        available_fields = request.get('available_fields', [])
        
        from backend.core.simple_mapper import simple_mapper
        
        validation_result = simple_mapper.validate_mapping(field_mappings, available_fields)
        
        return {
            "success": True,
            "validation": validation_result
        }
        
    except Exception as e:
        logger.error(f"Field mapping validation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
