from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from models.nodes import Node
from models.data import NodeData
from models.api_models import (
    APIResponse, NodeExecutionResponse, NodeValidationResponse,
    NodeTypesResponse, FrameworksResponse, ErrorCode
)
from core.node_processor import node_processor
from utils.security import security_manager
from utils.logging import get_logger
from utils.api_utils import handle_exception
from core.runner import UnifiedRunner
from auth.dependencies import get_current_user

logger = get_logger(__name__)
router = APIRouter(tags=["nodes"])

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
