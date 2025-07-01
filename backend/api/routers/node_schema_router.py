from fastapi import APIRouter, HTTPException
from backend.nodes.input_node import InputNodeConfig
from backend.nodes.output_node import OutputNodeConfig
from backend.nodes.task_node import TaskNodeConfig
from backend.nodes.trigger_node import TriggerNodeConfig
from backend.nodes.agent_node import AgentNodeConfig
from backend.nodes.chat_node import ChatNodeConfig
from backend.nodes.delay_node import DelayNodeConfig
from backend.nodes.logic_node import LogicNodeConfig
from backend.nodes.tool_node import ToolNodeConfig
from backend.models.api_models import APIResponse, ErrorCode
from backend.utils.api_utils import handle_exception
from backend.models.schemas import SchemaType
from backend.models.runner_schemas import (
    CrewAIRunnerConfig,
    LangChainRunnerConfig,
    HuggingFaceRunnerConfig,
    AutoGenRunnerConfig
)
from backend.frameworks.llamaindex_runner import (
    EnhancedLlamaIndexRunner, 
    LLAMAINDEX_FEATURES,
    get_llamaindex_capabilities
)

# Add other node imports as needed

router = APIRouter()

@router.get("/{node_type}")
async def get_node_schema(node_type: str):
    try:
        node_map = {
            "input": InputNodeConfig,
            "output": OutputNodeConfig,
            "task": TaskNodeConfig,
            "trigger": TriggerNodeConfig,
            "agent": AgentNodeConfig,
            "chat": ChatNodeConfig,
            "chatbot": ChatNodeConfig,  # Add chatbot as an alias for chat
            "delay": DelayNodeConfig,
            "logic": LogicNodeConfig,
            "tool": ToolNodeConfig
            # Add other node types here
        }
        config_cls = node_map.get(node_type)
        if not config_cls:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Unknown node type: {node_type}"
            )
            
        # Create a config instance to access its schema fields
        config_instance = config_cls()
        
        # Get schemas from the config instance
        input_schema = config_instance.input_schema
        output_schema = config_instance.output_schema
        
        # Combine schemas into a single schema object
        combined_schema = {
            # Add position field to schema
            'position': {
                'type': 'object',
                'label': 'Node Position',
                'required': True,
                'description': 'Position of the node in the workflow',
                'properties': {
                    'x': {
                        'type': 'number',
                        'label': 'X Position',
                        'required': True,
                        'description': 'X coordinate of the node'
                    },
                    'y': {
                        'type': 'number',
                        'label': 'Y Position',
                        'required': True,
                        'description': 'Y coordinate of the node'
                    }
                }
            }
        }
        
        # Add input fields
        if input_schema and input_schema.fields:
            for field_name, field_data in input_schema.fields.items():
                combined_schema[field_name] = {
                    'type': field_data.type.value,
                    'label': field_data.description,
                    'required': field_name in input_schema.required_fields,
                    'description': field_data.description,
                    'properties': {
                        prop_name: {
                            'type': prop_data.type.value,
                            'label': prop_data.description,
                            'required': not prop_data.optional,
                            'description': prop_data.description
                        }
                        for prop_name, prop_data in (field_data.properties or {}).items()
                    } if field_data.properties else {}
                }
        
        # Add output fields
        if output_schema and output_schema.fields:
            for field_name, field_data in output_schema.fields.items():
                if field_name not in combined_schema:  # Don't override input fields
                    combined_schema[field_name] = {
                        'type': field_data.type.value,
                        'label': field_data.description,
                        'required': field_name in output_schema.required_fields,
                        'description': field_data.description,
                        'properties': {
                            prop_name: {
                                'type': prop_data.type.value,
                                'label': prop_data.description,
                                'required': not prop_data.optional,
                                'description': prop_data.description
                            }
                            for prop_name, prop_data in (field_data.properties or {}).items()
                        } if field_data.properties else {}
                    }
        
        return APIResponse.success_response(combined_schema)
        
    except Exception as e:
        return handle_exception(e)


# Remove the problematic endpoint at line 19-116
# Keep only the working endpoint:

@router.get("/schema/{node_type}")
async def get_node_schema(node_type: str):
    try:
        node_map = {
            "input": InputNodeConfig,
            "output": OutputNodeConfig,
            "task": TaskNodeConfig,
            "trigger": TriggerNodeConfig,
            "agent": AgentNodeConfig,
            "chat": ChatNodeConfig,
            "chatbot": ChatNodeConfig,
            "delay": DelayNodeConfig,
            "logic": LogicNodeConfig,
            "tool": ToolNodeConfig
        }
        
        config_cls = node_map.get(node_type)
        if not config_cls:
            return APIResponse.error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"Unknown node type: {node_type}"
            )
            
        # ✅ Get schema WITHOUT instantiating the model
        schema = config_cls.model_json_schema()
        
        return APIResponse.success_response(
            data=schema,
            message=f"Schema for {node_type} retrieved successfully"
        )
        
    except Exception as e:
        return APIResponse.error_response(
            code=ErrorCode.INTERNAL_ERROR,
            message=f"Failed to get schema: {str(e)}"
        )
        # Transform to frontend-compatible format if needed
        # You can add your custom transformation logic here
        
        return APIResponse.success_response(schema)
        
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/crewai")
async def get_crewai_runner_schema():
    """Get the schema for CrewAI runner configuration"""
    try:
        schema = CrewAIRunnerConfig.model_json_schema()
        return APIResponse.success_response(
            data=schema,
            message="CrewAI runner schema retrieved successfully"
        )
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/langchain")
async def get_langchain_runner_schema():
    """Get the schema for LangChain runner configuration"""
    try:
        schema = LangChainRunnerConfig.model_json_schema()
        return APIResponse.success_response(
            data=schema,
            message="LangChain runner schema retrieved successfully"
        )
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/huggingface")
async def get_huggingface_runner_schema():
    """Get the schema for HuggingFace runner configuration"""
    try:
        schema = HuggingFaceRunnerConfig.model_json_schema()
        return APIResponse.success_response(
            data=schema,
            message="HuggingFace runner schema retrieved successfully"
        )
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/autogen")
async def get_autogen_runner_schema():
    """Get the schema for AutoGen runner configuration"""
    try:
        schema = AutoGenRunnerConfig.model_json_schema()
        return APIResponse.success_response(
            data=schema,
            message="AutoGen runner schema retrieved successfully"
        )
    except Exception as e:
        return handle_exception(e)

@router.get("/runners/llamaindex")
async def get_llamaindex_runner_schema():
    """Get the schema for LlamaIndex runner configuration"""
    try:
        # Get schema from the runner's input/output schemas
        schema = {
            "input_schema": EnhancedLlamaIndexRunner.input_schema.dict(),
            "output_schema": EnhancedLlamaIndexRunner.output_schema.dict(),
            "features": LLAMAINDEX_FEATURES,
            "capabilities": get_llamaindex_capabilities()
        }
        return APIResponse.success_response(
            data=schema,
            message="LlamaIndex runner schema retrieved successfully"
        )
    except Exception as e:
        return handle_exception(e)

@router.get("/runners")
async def list_runner_schemas():
    """List all available runner schemas"""
    try:
        schemas = {
            "crewai": CrewAIRunnerConfig.model_json_schema(),
            "langchain": LangChainRunnerConfig.model_json_schema(),
            "huggingface": HuggingFaceRunnerConfig.model_json_schema(),
            "autogen": AutoGenRunnerConfig.model_json_schema(),
            "llamaindex": {
                "input_schema": EnhancedLlamaIndexRunner.input_schema.dict(),
                "output_schema": EnhancedLlamaIndexRunner.output_schema.dict(),
                "features": LLAMAINDEX_FEATURES,
                "capabilities": get_llamaindex_capabilities()
            }
        }
        return APIResponse.success_response(
            data=schemas,
            message="Runner schemas retrieved successfully"
        )
    except Exception as e:
        return handle_exception(e)