# backend/core/node_processor.py - Enhanced Version (Corrected)
import logging
from typing import Dict, Any, Optional, Union, Callable, List
from datetime import datetime
import importlib
import asyncio
import json
import sys
from pydantic import BaseModel

from models.data import NodeData
from models.results import NodeResult, ExecutionStatus, ResultType
from core.exceptions import NodeError
from utils.logging import get_logger
from config.settings import get_settings

# NEW: Import enhanced framework registry for validation
from framework_registry import framework_registry, validate_framework_llm_combination

# NEW: Import LLM Runner for LLM-centric processing
from .llm_runner import llm_runner

# Import WorkflowExecutionContext for proper type checking
try:
    from core.workflow_execution_context import WorkflowExecutionContext
except ImportError:
    # Handle circular import by using string comparison
    WorkflowExecutionContext = None

# Import the smart mapper
from .smart_mapper import smart_map_inputs

from models.schemas import NodeSchema
from models.runner_schemas import BaseRunnerConfig

# --- Runner Registry ---
from frameworks.crewai_runner import EnhancedCrewAIRunner
from frameworks.langchain_runner import EnhancedLangChainRunner
from frameworks.huggingface_runner import EnhancedHuggingFaceRunner
from frameworks.autogen_runner import EnhancedAutoGenRunner
from frameworks.llamaindex_runner import EnhancedLlamaIndexRunner

RUNTIME_REGISTRY = {
    "CrewAI": EnhancedCrewAIRunner,
    "LangChain": EnhancedLangChainRunner,
    "HuggingFace": EnhancedHuggingFaceRunner,
    "AutoGen": EnhancedAutoGenRunner,
    "LlamaIndex": EnhancedLlamaIndexRunner,
}

logger = get_logger(__name__)
settings = get_settings()

class NodeProcessor:
    """Enhanced node processor with intelligent input mapping and LLM-centric mode"""
    
    def __init__(self):
        self._handlers = {}
        self._framework_runners = {}
        self._metrics = {}
        self.llm_runner = llm_runner
        self.smart_mapping_enabled = True
        self.llm_mode_enabled = False
        
        # NEW: Enhanced type validators
        self.type_validators = {
            'string': lambda x: isinstance(x, str),
            'number': lambda x: isinstance(x, (int, float)) and not isinstance(x, bool),
            'boolean': lambda x: isinstance(x, bool),
            'object': lambda x: isinstance(x, dict) and x is not None,
            'array': lambda x: isinstance(x, (list, tuple)),
            'any': lambda x: True
        }
        
        # NEW: Field similarity patterns
        self.field_patterns = {
            'input': ['input', 'data', 'query', 'request', 'prompt', 'message'],
            'output': ['output', 'result', 'response', 'answer', 'solution'],
            'content': ['content', 'text', 'message', 'body', 'data'],
            'context': ['context', 'background', 'info', 'details'],
            'parameters': ['parameters', 'config', 'settings', 'options'],
            'metadata': ['metadata', 'info', 'details', 'attributes']
        }

    def enable_smart_mapping(self, enabled: bool = True):
        """Enable or disable smart input mapping"""
        self.smart_mapping_enabled = enabled
        logger.info(f"🧠 Smart mapping {'enabled' if enabled else 'disabled'}")

    def enable_llm_mode(self, enabled: bool = True):
        """Enable or disable LLM-centric processing mode"""
        self.llm_mode_enabled = enabled
        logger.info(f"🤖 LLM-centric mode {'enabled' if enabled else 'disabled'}")

    def register_handler(self, node_type: str, handler_func):
        """Register a handler function for a specific node type"""
        self._handlers[node_type] = handler_func

    def register_lazy_handler(self, node_type: str, module_path: str, function_name: str):
        """Register a lazy-loaded handler for a specific node type"""
        self._framework_runners[node_type] = (module_path, function_name)

    def _get_handler(self, node_type: str) -> Optional[Callable]:
        """Get handler for a node type, loading lazily if needed"""
        # Check direct handlers first
        if node_type in self._handlers:
            return self._handlers[node_type]
        
        # Check lazy handlers
        if node_type in self._framework_runners:
            try:
                module_path, function_name = self._framework_runners[node_type]
                
                # Import the module
                if module_path.startswith('.'):
                    # Relative import
                    from importlib import import_module
                    module = import_module(module_path, package=__package__)
                else:
                    # Absolute import
                    __import__(module_path)
                    module = sys.modules[module_path]
                
                # Get the function
                handler = getattr(module, function_name)
                
                # Cache it for future use
                self._handlers[node_type] = handler
                return handler
                
            except Exception as e:
                logger.error(f"Failed to load lazy handler for {node_type}: {str(e)}")
                return None
        
        return None

    def _validate_node_inputs(self, inputs: Dict[str, Any]) -> Optional[str]:
        """Validate node inputs and return error message if invalid"""
        for key, value in inputs.items():
            if self._check_for_error(value):
                return f"Input '{key}' contains error data"
        return None

    def _check_for_error(self, input_data: Union[NodeData, Dict[str, Any]]) -> Optional[str]:
        """Check if input data contains errors"""
        if isinstance(input_data, NodeData) and input_data.is_error():
            return input_data.get_error()
        elif isinstance(input_data, dict) and 'error' in input_data:
            return input_data['error']
        return None

    def _wrap_as_nodedata(self, value: Any) -> NodeData:
        """Wrap value as NodeData if needed"""
        if isinstance(value, NodeData):
            return value
        
        # Debug what we're wrapping
        logger.debug(f"🔧 Wrapping value: {type(value).__name__} = {value}")
        
        # Handle None values explicitly
        if value is None:
            logger.warning(f"🔧 Wrapping None value - this might cause issues")
            return NodeData.from_value("")  # Return empty string instead of None
        
        # Handle empty values
        if isinstance(value, (str, list, dict)) and not value:
            logger.debug(f"🔧 Wrapping empty {type(value).__name__}")
            return NodeData.from_value(value)
        
        return NodeData.from_value(value)

    def _smart_fix_node_config(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Smart fix for missing required configuration fields"""
        node_type = node.get('type', 'unknown')
        node_data = node.get('data', {}).copy()
        node_id = node.get('id', 'unknown')
        
        fixed = False
        
        # Fix TaskConfig missing fields
        if node_type == 'task':
            # Fix missing label
            if 'label' not in node_data or not node_data['label']:
                node_data['label'] = f"Task {node_id}"
                fixed = True
                logger.info(f"🔧 Added label to task {node_id}")
            
            # Fix missing description
            if 'description' not in node_data or not node_data['description']:
                node_data['description'] = f"Processing task for {node_id}"
                fixed = True
                logger.info(f"🔧 Added description to task {node_id}")
        
        # Fix AgentConfig missing fields
        elif node_type == 'agent':
            if 'label' not in node_data or not node_data['label']:
                node_data['label'] = f"Agent {node_id}"
                fixed = True
            
            if 'role' not in node_data or not node_data['role']:
                node_data['role'] = "AI Assistant"
                fixed = True
            
            if 'goal' not in node_data or not node_data['goal']:
                node_data['goal'] = "Complete assigned tasks efficiently"
                fixed = True
        
        # Fix ToolConfig missing fields  
        elif node_type == 'tool':
            if 'label' not in node_data or not node_data['label']:
                node_data['label'] = f"Tool {node_id}"
                fixed = True
        
        # Fix OutputConfig missing fields
        elif node_type == 'output':
            if 'label' not in node_data or not node_data['label']:
                node_data['label'] = f"Output {node_id}"
                fixed = True
            
            if 'output_type' not in node_data or not node_data['output_type']:
                node_data['output_type'] = 'webhook'
                fixed = True
        
        # Fix ChatConfig missing fields
        elif node_type == 'chat':
            if 'label' not in node_data or not node_data['label']:
                node_data['label'] = f"Chat {node_id}"
                fixed = True
        
        if fixed:
            return {
                **node,
                'data': node_data
            }
        
        return node

    async def _process_with_llm(
        self,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Any] = None
    ) -> NodeData:
        """
        NEW: LLM-centric processing for all node types
        Uses the LLM Runner to handle reasoning, transformation, and routing
        """
        node_id = node.get("id", "unknown")
        node_type = node.get("type", "unknown")
        node_data = node.get("data", {})
        
        logger.info(f"🤖 LLM-centric processing for {node_id} ({node_type})")
        
        try:
            # Determine LLM task type based on node type
            task_type_mapping = {
                'input': 'input_processing',
                'agent': 'agent_reasoning', 
                'task': 'task_execution',
                'tool': 'tool_routing',
                'output': 'output_formatting',
                'chat': 'agent_reasoning',  # Chat is similar to agent reasoning
                'trigger': 'input_processing',  # Trigger is like input processing
                'logic': 'agent_reasoning',  # Logic requires reasoning
                'delay': 'input_processing'  # Delay just passes through
            }
            
            llm_task_type = task_type_mapping.get(node_type, 'input_processing')
            
            # Prepare input data for LLM
            llm_input_data = {
                'node_id': node_id,
                'node_type': node_type,
                'node_config': node_data,
                'inputs': inputs
            }
            
            # Add node-specific data
            if node_type == 'agent':
                llm_input_data.update({
                    'role': node_data.get('role', 'Assistant'),
                    'goal': node_data.get('goal', 'Help the user'),
                    'backstory': node_data.get('backstory', ''),
                    'task': inputs.get('input', inputs.get('message', ''))
                })
            elif node_type == 'task':
                llm_input_data.update({
                    'description': node_data.get('description', ''),
                    'expected_output': node_data.get('expectedOutput', ''),
                    'input_data': inputs
                })
            elif node_type == 'tool':
                llm_input_data.update({
                    'request': inputs,
                    'available_tools': node_data.get('tools', [])
                })
            elif node_type == 'output':
                llm_input_data.update({
                    'data': inputs,
                    'output_type': node_data.get('outputType', 'display'),
                    'template': node_data.get('template', '')
                })
            
            # Get user ID from context
            user_id = None
            if context and hasattr(context, 'user_id'):
                user_id = context.user_id
            elif isinstance(context, dict):
                user_id = context.get('user_id')
            
            # Convert context for LLM
            context_dict = {}
            if context:
                if isinstance(context, dict):
                    context_dict = context
                elif hasattr(context, 'variables'):
                    context_dict = {
                        'variables': getattr(context, 'variables', {}),
                        'execution_id': getattr(context, 'execution_id', ''),
                        'workflow_id': getattr(context, 'workflow_id', ''),
                        'user_id': getattr(context, 'user_id', '')
                    }
            
            # Execute LLM task
            llm_result = await llm_runner.execute_llm_task(
                task_type=llm_task_type,
                input_data=llm_input_data,
                context=context_dict,
                user_id=user_id,
                stream=False
            )
            
            if llm_result.get('success'):
                # For tool routing, we might need to actually execute the tool
                if node_type == 'tool' and llm_result.get('result', {}).get('recommended_tool'):
                    try:
                        # Execute the recommended tool using existing framework
                        tool_result = await self._execute_tool_from_llm_routing(
                            llm_result['result'], 
                            node_data, 
                            inputs, 
                            context
                        )
                        return NodeData.from_value(tool_result)
                    except Exception as tool_error:
                        logger.warning(f"Tool execution failed, returning LLM routing result: {str(tool_error)}")
                        return NodeData.from_value(llm_result['result'])
                
                # For output nodes, we might need to actually send the output
                elif node_type == 'output' and llm_result.get('result', {}).get('ready_to_send'):
                    try:
                        # Execute the actual output using existing framework
                        output_result = await self._execute_output_from_llm_formatting(
                            llm_result['result'],
                            node_data,
                            context
                        )
                        return NodeData.from_value(output_result)
                    except Exception as output_error:
                        logger.warning(f"Output execution failed, returning LLM formatted result: {str(output_error)}")
                        return NodeData.from_value(llm_result['result'])
                
                # For other node types, return the LLM result directly
                else:
                    return NodeData.from_value(llm_result['result'])
            else:
                # LLM failed, fallback to traditional processing
                logger.warning(f"LLM processing failed for {node_id}, falling back to traditional handler")
                return await self._process_with_traditional_handler(node, inputs, context)
                
        except Exception as e:
            logger.error(f"LLM processing failed for {node_id}: {str(e)}")
            # Fallback to traditional processing
            return await self._process_with_traditional_handler(node, inputs, context)

    async def _execute_tool_from_llm_routing(
        self,
        llm_routing_result: Dict[str, Any],
        node_data: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Execute tool based on LLM routing decision"""
        recommended_tool = llm_routing_result.get('recommended_tool', 'api')
        formatted_request = llm_routing_result.get('formatted_request', inputs)
        
        # Use framework registry to execute the tool
        if recommended_tool in framework_registry._frameworks:
            config = {
                'tool_type': recommended_tool,
                'parameters': formatted_request,
                **node_data
            }
            return await framework_registry.execute_framework(
                recommended_tool, 
                config, 
                formatted_request
            )
        else:
            # Return the LLM's routing decision
            return llm_routing_result

    async def _execute_output_from_llm_formatting(
        self,
        llm_formatting_result: Dict[str, Any],
        node_data: Dict[str, Any],
        context: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Execute output based on LLM formatting"""
        formatted_output = llm_formatting_result.get('formatted_output')
        output_type = node_data.get('outputType', 'display')
        
        # Use existing output node logic
        from nodes.output_node import process_output_node
        
        # Create a fake node structure for the output processor
        fake_node = {
            'id': 'llm_output',
            'type': 'output',
            'data': {
                **node_data,
                'outputData': formatted_output
            }
        }
        
        fake_inputs = {'output_data': NodeData.from_value(formatted_output)}
        
        result = await process_output_node(fake_node, fake_inputs, context)
        
        return {
            'success': True,
            'formatted_output': formatted_output,
            'llm_metadata': llm_formatting_result.get('metadata', {}),
            'output_result': result.get_value() if not result.is_error() else None
        }

    async def _process_with_traditional_handler(
        self,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Any] = None
    ) -> NodeData:
        """Process node using traditional handlers (fallback)"""
        node_id = node.get("id", "unknown")
        node_type = node.get("type", "unknown")
        
        # Get handler for this node type
        handler = self._get_handler(node_type)
        if not handler:
            error_msg = f"No handler found for node type: {node_type}"
            logger.error(error_msg)
            return NodeData.from_error(error_msg)

        # 🔧 CRITICAL FIX: Clean inputs before processing
        from .utils import clean_node_inputs
        cleaned_inputs = clean_node_inputs(inputs)
        
        # Convert cleaned inputs to NodeData format with enhanced debugging
        nodedata_inputs = {}
        logger.info(f"🔧 Converting cleaned inputs for {node_type} node {node_id}:")
        for key, value in cleaned_inputs.items():
            logger.info(f"   - {key}: {type(value).__name__} = {value}")
            nodedata_inputs[key] = self._wrap_as_nodedata(value)
            # Debug the wrapped value
            if hasattr(nodedata_inputs[key], 'value'):
                logger.info(f"   - {key} wrapped: {type(nodedata_inputs[key].value).__name__} = {nodedata_inputs[key].value}")
            else:
                logger.info(f"   - {key} wrapped: {type(nodedata_inputs[key]).__name__}")

        # Execute the node
        logger.info(f"🔄 Executing traditional {node_type} handler for {node_id}")
        
        try:
            if asyncio.iscoroutinefunction(handler):
                result = await handler(node, nodedata_inputs, context)
            else:
                result = handler(node, nodedata_inputs, context)

            # Ensure result is NodeData
            if not isinstance(result, NodeData):
                if isinstance(result, dict) and 'error' in result:
                    return NodeData.from_error(result['error'])
                else:
                    result = NodeData.from_value(result)
                
            return result
            
        except Exception as e:
            error_msg = f"Traditional handler failed: {str(e)}"
            logger.error(error_msg)
            return NodeData.from_error(error_msg)

    async def process_node(
        self, 
        node: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Enhanced node processing with robust schema validation and standardized returns"""
        try:
            # 1. Get schemas
            input_schema = self._get_input_schema(node)
            output_schema = self._get_output_schema(node)
            
            # 2. Validate input schema
            validation_result = self._validate_with_schema(inputs, input_schema)
            if not validation_result["valid"]:
                return {
                    "valid": False,
                    "output": None,
                    "errors": validation_result["errors"],
                    "debug": validation_result["debug"]
                }
            
            # 3. Map inputs using simple mapping (preferred) or smart mapping (fallback)
            try:
                # Check if node has explicit field mappings
                node_data = node.get('data', {})
                field_mappings = node_data.get('field_mappings', {})
                
                if field_mappings:
                    # Use simple mapping with explicit field mappings
                    logger.info(f"Using simple mapping with explicit field mappings for {node.get('type')} node")
                    mapped_inputs = await self._simple_map_inputs(
                        node, 
                        validation_result["output"],
                        context
                    )
                elif self.smart_mapping_enabled:
                    # Fall back to smart mapping if no explicit mappings
                    logger.info(f"Using smart mapping for {node.get('type')} node (no explicit mappings)")
                    mapped_inputs = await self._smart_map_inputs(
                        node, 
                        validation_result["output"],
                        context
                    )
                else:
                    # Use inputs as-is if no mapping is configured
                    logger.info(f"Using inputs as-is for {node.get('type')} node (no mapping configured)")
                    mapped_inputs = validation_result["output"]
                    
            except Exception as e:
                logger.error(f"Input mapping failed: {str(e)}")
                # Continue with original inputs on mapping failure
                mapped_inputs = validation_result["output"]
            
            # 4. Get appropriate runner
            framework = node.get('data', {}).get('framework', node.get('type', 'unknown'))
            
            # For structural nodes, use traditional handlers directly
            structural_nodes = ["trigger", "input", "output", "logic", "delay", "task"]
            if node.get('type') in structural_nodes:
                logger.info(f"🔄 Using traditional handler for structural node: {node.get('type')}")
                try:
                    result = await self._process_with_traditional_handler(node, mapped_inputs, context)
                    return {
                        "valid": True,
                        "output": result,
                        "errors": [],
                        "debug": {
                            "handler": "traditional",
                            "node_id": node.get("id", "unknown"),
                            "node_type": node.get("type", "unknown")
                        }
                    }
                except Exception as e:
                    error_msg = f"Traditional handler failed: {str(e)}"
                    logger.error(error_msg)
                    return {
                        "valid": False,
                        "output": None,
                        "errors": [error_msg],
                        "debug": {
                            "exception": str(e),
                            "handler": "traditional",
                            "node_id": node.get("id", "unknown"),
                            "node_type": node.get("type", "unknown")
                        }
                    }
            
            # For framework-based nodes, get the runner
            runner = self._get_framework_runner(framework)
            if isinstance(runner, NodeData) and runner.is_error():
                return {
                    "valid": False,
                    "output": None,
                    "errors": [runner.get_error()],
                    "debug": {
                        "node_id": node.get("id", "unknown"),
                        "node_type": node.get("type", "unknown")
                    }
                }
            
            # 5. Execute node
            try:
                result = await self._execute_with_runner(runner, node, mapped_inputs, context)
            except Exception as e:
                logger.error(f"Node execution failed: {str(e)}")
                return {
                    "valid": False,
                    "output": None,
                    "errors": [f"Node execution failed: {str(e)}"],
                    "debug": {
                        "exception": str(e),
                        "node_id": node.get("id", "unknown"),
                        "node_type": node.get("type", "unknown")
                    }
                }
            
            # 6. Validate output schema
            output_validation = self._validate_with_schema(result, output_schema)
            if not output_validation["valid"]:
                return {
                    "valid": False,
                    "output": None,
                    "errors": output_validation["errors"],
                    "debug": output_validation["debug"]
                }
            
            return {
                "valid": True,
                "output": output_validation["output"],
                "errors": [],
                "debug": {
                    "input_validation": validation_result["debug"],
                    "output_validation": output_validation["debug"],
                    "node_id": node.get("id", "unknown"),
                    "node_type": node.get("type", "unknown"),
                    "execution_time": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Node processing failed: {str(e)}")
            return {
                "valid": False,
                "output": None,
                "errors": [str(e)],
                "debug": {
                    "exception": str(e),
                    "node_id": node.get("id", "unknown"),
                    "node_type": node.get("type", "unknown"),
                    "execution_time": datetime.now().isoformat()
                }
            }

    def _validate_with_schema(
        self, 
        data: Dict[str, Any], 
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate data against schema with standardized return format"""
        try:
            # Ensure schema has required fields
            if not schema:
                schema = {
                    'fields': {},
                    'required_fields': []
                }
            
            if 'fields' not in schema:
                schema['fields'] = {}
            
            if 'required_fields' not in schema:
                schema['required_fields'] = []
            
            # Ensure data has required fields for NodeData
            if 'value' not in data:
                data['value'] = data.get('data', {})
            
            if 'node_schema' not in data:
                data['node_schema'] = schema
            
            # Create NodeData instance with schema
            node_data = NodeData(
                node_type=data.get('type', 'unknown'),
                value=data.get('value', {}),
                node_schema=schema
            )
            
            validation_result = {
                "valid": True,
                "output": data,
                "errors": [],
                "debug": {
                    "schema_used": schema,
                    "validation_time": datetime.now().isoformat()
                }
            }
            
            # Validate required fields
            required_fields = schema.get('required_fields', [])
            for field in required_fields:
                if field not in data.get('value', {}):
                    validation_result["valid"] = False
                    validation_result["errors"].append(f"Missing required field: {field}")
                    logger.warning(f"Missing required field: {field}")
            
            # Validate field types
            fields = schema.get('fields', {})
            for field_name, field_schema in fields.items():
                if field_name in data.get('value', {}):
                    if not self._validate_field_type(data['value'][field_name], field_schema):
                        validation_result["valid"] = False
                        error_msg = f"Invalid type for field {field_name}: expected {field_schema.get('type')}"
                        validation_result["errors"].append(error_msg)
                        logger.warning(error_msg)
            
            # Add validation metadata
            validation_result["debug"]["validation_details"] = {
                "required_fields_validated": len(required_fields),
                "fields_validated": len(fields),
                "errors_found": len(validation_result["errors"])
            }
            
            return validation_result
            
        except Exception as e:
            error_msg = f"Error validating schema: {str(e)}"
            logger.error(error_msg)
            return {
                "valid": True,  # Default to valid if validation fails
                "output": data,
                "errors": [error_msg],
                "debug": {
                    "exception": str(e),
                    "validation_time": datetime.now().isoformat()
                }
            }

    def _validate_field_type(self, value: Any, field_schema: Dict[str, Any]) -> bool:
        """Validate field type with enhanced type checking"""
        try:
            expected_type = field_schema.get('type', 'any')
            validator = self.type_validators.get(expected_type)
            
            if not validator:
                logger.warning(f"Unknown type validator for {expected_type}")
                return True
            
            # Special handling for LLMConfig
            if expected_type == 'object' and field_schema.get('properties', {}).get('provider'):
                # This is likely an LLMConfig object
                return self._validate_llm_config(value)
            
            # Special handling for ToolConfig
            if expected_type == 'object' and field_schema.get('properties', {}).get('toolType'):
                # This is likely a ToolConfig object
                return self._validate_tool_config(value)
            
            return validator(value)
            
        except Exception as e:
            logger.error(f"Error validating field type: {str(e)}")
            return False

    def _validate_llm_config(self, config: Dict[str, Any]) -> bool:
        """Validate LLM configuration"""
        try:
            required_fields = ['provider', 'model', 'framework']
            for field in required_fields:
                if field not in config:
                    logger.warning(f"Missing required LLM config field: {field}")
                    return False
            
            # Validate numeric fields
            if 'temperature' in config:
                temp = float(config['temperature'])
                if not (0.0 <= temp <= 2.0):
                    logger.warning(f"Invalid temperature value: {temp}")
                    return False
            
            if 'max_tokens' in config:
                tokens = int(config['max_tokens'])
                if not (0 < tokens <= 32000):
                    logger.warning(f"Invalid max_tokens value: {tokens}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating LLM config: {str(e)}")
            return False

    def _validate_tool_config(self, config: Dict[str, Any]) -> bool:
        """Validate tool configuration"""
        try:
            required_fields = ['toolType', 'framework']
            for field in required_fields:
                if field not in config:
                    logger.warning(f"Missing required tool config field: {field}")
                    return False
            
            # Validate tool type
            valid_tool_types = ['api', 'webhook', 'database', 'file', 'custom', 'llm']
            if config['toolType'] not in valid_tool_types:
                logger.warning(f"Invalid tool type: {config['toolType']}")
                return False
            
            # Validate numeric fields
            if 'retry_count' in config:
                retries = int(config['retry_count'])
                if not (0 <= retries <= 5):
                    logger.warning(f"Invalid retry_count value: {retries}")
                    return False
            
            if 'timeout' in config:
                timeout = int(config['timeout'])
                if not (timeout > 0):
                    logger.warning(f"Invalid timeout value: {timeout}")
                    return False
            
            # Validate LLM config if present
            if config.get('toolType') == 'llm' and 'llmConfig' in config:
                if not self._validate_llm_config(config['llmConfig']):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating tool config: {str(e)}")
            return False

    async def _execute_with_runner(
        self,
        runner: Any,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Execute node with selected runner using standardized return format"""
        if not runner:
            # Fallback to traditional handler
            try:
                result = await self._process_with_traditional_handler(node, inputs, context)
                return {
                    "valid": True,
                    "output": result,
                    "errors": [],
                    "debug": {
                        "handler": "traditional",
                        "node_id": node.get("id", "unknown"),
                        "node_type": node.get("type", "unknown")
                    }
                }
            except Exception as e:
                error_msg = f"Traditional handler failed: {str(e)}"
                logger.error(error_msg)
                return {
                    "valid": False,
                    "output": None,
                    "errors": [error_msg],
                    "debug": {
                        "exception": str(e),
                        "handler": "traditional",
                        "node_id": node.get("id", "unknown"),
                        "node_type": node.get("type", "unknown")
                    }
                }

        try:
            # Get schemas for validation
            input_schema = self._get_input_schema(node)
            output_schema = self._get_output_schema(node)
            
            # 1. Validate input before running
            if input_schema and hasattr(input_schema, 'validate_data'):
                input_validation = self._validate_with_schema(inputs, input_schema)
                if not input_validation["valid"]:
                    logger.warning(f"⚠️ Input validation failed for node {node.get('id', 'unknown')}")
                    return {
                        "valid": False,
                        "output": None,
                        "errors": input_validation["errors"],
                        "debug": input_validation["debug"]
                    }
                logger.info(f"✅ Input validation passed for node {node.get('id', 'unknown')}")
            
            # Build config
            config = {**node.get('data', {}), **getattr(runner, 'config', {})}

            # 2. Run the node - Handle both function runners and object runners
            result = None
            if callable(runner):
                # Function runner (e.g., run_crewai_tool)
                logger.info(f"🔧 Using function runner: {runner.__name__}")
                # FIXED: Pass context to function runners
                import inspect
                sig = inspect.signature(runner)
                if 'context' in sig.parameters:
                    result = await runner(config, inputs, context)
                else:
                    result = await runner(config, inputs)
            elif hasattr(runner, 'run'):
                # Object runner with run method
                logger.info(f"🔧 Using object runner: {runner.__class__.__name__}")
                result = await runner.run(config, inputs)
            elif hasattr(runner, 'run_tool'):
                # Object runner with run_tool method
                logger.info(f"🔧 Using tool runner: {runner.__class__.__name__}")
                result = await runner.run_tool(config, inputs)
            elif hasattr(runner, 'run_agent'):
                # Object runner with run_agent method
                logger.info(f"🔧 Using agent runner: {runner.__class__.__name__}")
                result = await runner.run_agent(config, inputs)
            else:
                error_msg = f"Runner {runner.__class__.__name__ if hasattr(runner, '__class__') else type(runner).__name__} has no valid run method"
                logger.error(error_msg)
                return {
                    "valid": False,
                    "output": None,
                    "errors": [error_msg],
                    "debug": {
                        "runner_type": runner.__class__.__name__ if hasattr(runner, '__class__') else type(runner).__name__,
                        "node_id": node.get("id", "unknown"),
                        "node_type": node.get("type", "unknown")
                    }
                }
            
            # 3. Validate output against schema
            if output_schema and hasattr(output_schema, 'validate_data'):
                output_data = result.value if isinstance(result, NodeData) else result
                if isinstance(output_data, dict):
                    output_validation = self._validate_with_schema(output_data, output_schema)
                    if not output_validation["valid"]:
                        logger.warning(f"⚠️ Output validation failed for node {node.get('id', 'unknown')}")
                        # Log but don't fail - allow data to flow with warning
                        logger.info(f"📤 Output data: {output_data}")
                    else:
                        logger.info(f"✅ Output validation passed for node {node.get('id', 'unknown')}")
                        result = output_validation["output"]
            
            return {
                "valid": True,
                "output": result,
                "errors": [],
                "debug": {
                    "runner_type": runner.__class__.__name__ if hasattr(runner, '__class__') else type(runner).__name__,
                    "node_id": node.get("id", "unknown"),
                    "node_type": node.get("type", "unknown"),
                    "execution_time": datetime.now().isoformat()
                }
            }

        except Exception as e:
            error_msg = f"Runner execution failed: {str(e)}"
            logger.error(error_msg)
            return {
                "valid": False,
                "output": None,
                "errors": [error_msg],
                "debug": {
                    "exception": str(e),
                    "runner_type": runner.__class__.__name__ if runner and hasattr(runner, '__class__') else type(runner).__name__ if runner else None,
                    "node_id": node.get("id", "unknown"),
                    "node_type": node.get("type", "unknown"),
                    "execution_time": datetime.now().isoformat()
                }
            }

    def _validate_and_format_result(self, result: NodeData, schema: Dict[str, Any]) -> NodeData:
        """Validate and format result against schema"""
        if result.is_error():
            return result

        try:
            if hasattr(schema, 'validate'):
                validated = schema.validate(result.value)
                return NodeData.from_value(validated, schema=schema)
            return result
        except Exception as e:
            return NodeData.from_error(f"Result validation failed: {str(e)}")

    def _get_schema_dict(self, config_class: Any, schema_field: str) -> Dict[str, Any]:
        """Safely get schema dictionary from a Pydantic model field."""
        try:
            # Handle Pydantic v2
            if hasattr(config_class, 'model_fields'):
                field = config_class.model_fields.get(schema_field)
                if not field:
                    return {}
                    
                # Get default value
                default_value = getattr(field, 'default', None)
                if default_value is None:
                    return {}
                
                # Handle both model_dump (v2) and dict (v1)
                if hasattr(default_value, 'model_dump'):
                    return default_value.model_dump()
                elif hasattr(default_value, 'dict'):
                    return default_value.dict()
                return {}
            
            # Handle Pydantic v1
            elif hasattr(config_class, '__fields__'):
                field = config_class.__fields__.get(schema_field)
                if not field or not field.default:
                    return {}
                    
                if hasattr(field.default, 'dict'):
                    return field.default.dict()
                return {}
                
            return {}
            
        except Exception as e:
            logger.error(f"Error getting schema dict: {str(e)}")
            return {
                'fields': {},
                'required_fields': []
            }

    def _get_input_schema(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Return the input schema for the node type."""
        node_type = node.get("type", "unknown").lower()
        from models.runner_schemas import (
            BaseRunnerConfig, CrewAIRunnerConfig, LangChainRunnerConfig, HuggingFaceRunnerConfig,
            AutoGenRunnerConfig, LlamaIndexRunnerConfig
        )
        
        # Map node types to runner config input schemas
        schema_map = {
            "task": self._get_schema_dict(CrewAIRunnerConfig, "input_schema"),
            "agent": self._get_schema_dict(CrewAIRunnerConfig, "input_schema"),
            "tool": self._get_schema_dict(LangChainRunnerConfig, "input_schema"),
            "chat": self._get_schema_dict(AutoGenRunnerConfig, "input_schema"),
            "output": self._get_schema_dict(BaseRunnerConfig, "input_schema"),
            "delay": self._get_schema_dict(BaseRunnerConfig, "input_schema"),
            "logic": self._get_schema_dict(BaseRunnerConfig, "input_schema"),
            "input": self._get_schema_dict(BaseRunnerConfig, "input_schema"),
            "trigger": self._get_schema_dict(BaseRunnerConfig, "input_schema")
        }
        
        return schema_map.get(node_type, {})

    def _get_output_schema(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Return the output schema for the node type."""
        node_type = node.get("type", "unknown").lower()
        from models.runner_schemas import (
            BaseRunnerConfig, CrewAIRunnerConfig, LangChainRunnerConfig, HuggingFaceRunnerConfig,
            AutoGenRunnerConfig, LlamaIndexRunnerConfig
        )
        
        # Map node types to runner config output schemas
        schema_map = {
            "task": self._get_schema_dict(CrewAIRunnerConfig, "output_schema"),
            "agent": self._get_schema_dict(CrewAIRunnerConfig, "output_schema"),
            "tool": self._get_schema_dict(LangChainRunnerConfig, "output_schema"),
            "chat": self._get_schema_dict(AutoGenRunnerConfig, "output_schema"),
            "output": self._get_schema_dict(BaseRunnerConfig, "output_schema"),
            "delay": self._get_schema_dict(BaseRunnerConfig, "output_schema"),
            "logic": self._get_schema_dict(BaseRunnerConfig, "output_schema"),
            "input": self._get_schema_dict(BaseRunnerConfig, "output_schema"),
            "trigger": self._get_schema_dict(BaseRunnerConfig, "output_schema")
        }
        
        return schema_map.get(node_type, {})

    async def _smart_map_inputs(
        self,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Smart map inputs using semantic matching and type checking"""
        try:
            from .smart_mapper import smart_map_inputs
            # Pass parameters in correct order: (node, context, previous_outputs)
            return await smart_map_inputs(node, context or {}, inputs)
        except Exception as e:
            logger.error(f"Smart mapping failed: {str(e)}")
            return inputs

    async def _simple_map_inputs(
        self,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Simple mapping using explicit field mappings instead of smart guessing.
        This is the new preferred method for data mapping.
        """
        try:
            from .simple_mapper import map_fields_simple
            
            # Get field mappings from node configuration
            node_data = node.get('data', {})
            field_mappings = node_data.get('field_mappings', {})
            node_type = node.get('type', 'unknown')
            
            # If no explicit mappings, return inputs as-is
            if not field_mappings:
                logger.info(f"No field mappings found for {node_type} node, using inputs as-is")
                return inputs
            
            # Use simple mapper with explicit field mappings
            mapped_data = map_fields_simple(inputs, field_mappings, node_type)
            
            logger.info(f"Simple mapping completed for {node_type} node: {list(mapped_data.keys())}")
            return mapped_data
            
        except Exception as e:
            logger.error(f"Simple mapping failed: {str(e)}")
            # Fall back to original inputs on error
            return inputs

    def _get_framework_runner(self, framework: str) -> Optional[Any]:
        """Get the appropriate framework runner for the given framework"""
        try:
            # Use absolute import to avoid relative import issues
            import sys
            import os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
            
            from framework_registry import framework_registry
            
            # Get runner from registry
            runner = framework_registry.get_runner(framework)
            if runner:
                return runner
                
            # Handle special cases
            if framework in ["trigger", "input", "output", "logic", "delay", "task"]:
                return None  # These are handled by the node processor directly
                
            # Try to get runner from framework module
            try:
                module_name = f"frameworks.{framework}_runner"
                runner_module = __import__(module_name, fromlist=['run_' + framework + '_tool'])
                runner_func = getattr(runner_module, 'run_' + framework + '_tool')
                return runner_func
            except (ImportError, AttributeError):
                logger.warning(f"No runner found for framework: {framework}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting framework runner: {str(e)}")
            return None

# Create global instance with lazy loading
node_processor = NodeProcessor()

# Register lazy handlers to avoid circular imports
node_processor.register_lazy_handler("task", "nodes.task_node", "process_task_node")
node_processor.register_lazy_handler("agent", "nodes.agent_node", "process_agent_node") 
node_processor.register_lazy_handler("output", "nodes.output_node", "process_output_node")
node_processor.register_lazy_handler("input", "nodes.input_node", "process_input_node")
node_processor.register_lazy_handler("Input", "nodes.input_node", "process_input_node")
node_processor.register_lazy_handler("tool", "nodes.tool_node", "process_tool_node")
node_processor.register_lazy_handler("trigger", "nodes.trigger_node", "process_trigger_node")
node_processor.register_lazy_handler("chat", "nodes.chat_node", "process_chat_node")
node_processor.register_lazy_handler("logic", "nodes.logic_node", "process_logic_node")
node_processor.register_lazy_handler("delay", "nodes.delay_node", "process_delay_node")