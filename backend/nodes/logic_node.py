import logging
from typing import Dict, Any, List
from datetime import datetime

from models.data import NodeData
from core.llm_runner import llm_runner
from nodes.base_node import BaseNode, NodeConfig
from pydantic import Field, BaseModel
from core.smart_mapper import SmartMapper
from models.schemas import NodeSchema, SchemaField, SchemaType

logger = logging.getLogger(__name__)

def evaluate_condition(condition: str, inputs: Dict[str, Any]) -> bool:
    """
    Safely evaluate a condition string with given inputs
    Handles both Python and JavaScript-style conditions
    """
    try:
        # 🚀 FIX: Convert JavaScript-style conditions to Python
        python_condition = convert_js_to_python_condition(condition)
        
        # Create a safe evaluation context with the inputs
        # Make inputs available both as 'inputs' dict and as individual variables
        eval_globals = {
            "inputs": inputs,
            **inputs  # Unpack inputs so they're available as individual variables
        }
        
        logger.debug(f"Original condition: {condition}")
        logger.debug(f"Python condition: {python_condition}")
        logger.debug(f"Available variables: {list(eval_globals.keys())}")
        
        # Evaluate the condition
        result = eval(python_condition, eval_globals, {})
        logger.info(f"Condition '{condition}' evaluated to: {result}")
        return bool(result)
    except Exception as e:
        logger.error(f"Error evaluating condition '{condition}': {str(e)}")
        logger.error(f"Available inputs: {inputs}")
        return False

def convert_js_to_python_condition(condition: str) -> str:
    """
    Convert JavaScript-style logical conditions to Python-compatible syntax
    """
    # Replace JavaScript operators with Python equivalents
    conversions = {
        # Logical operators
        '&&': ' and ',
        '||': ' or ',
        '!': ' not ',
        
        # Equality/inequality operators  
        '===': ' == ',
        '!==': ' != ',
        
        # Null/undefined checks
        '!== null': ' is not None',
        '=== null': ' is None',
        '!== undefined': ' is not None',
        '=== undefined': ' is None',
        ' null': ' None',
        ' undefined': ' None',
        
        # String comparisons
        '!== ""': ' != ""',
        '=== ""': ' == ""',
    }
    
    python_condition = condition
    for js_syntax, py_syntax in conversions.items():
        python_condition = python_condition.replace(js_syntax, py_syntax)
    
    # Handle variables that might not exist in inputs
    # Add safety checks for undefined variables
    if 'response' in python_condition and 'response' not in python_condition.split('inputs.get('):
        # Wrap direct variable references in inputs.get() for safety
        python_condition = python_condition.replace('response', 'inputs.get("response", inputs.get("input", inputs.get("result", "")))')
    
    return python_condition

async def run_logic_node(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run a logic node that evaluates a condition and determines the flow path
    
    Args:
        data: Logic node configuration including condition
        inputs: Input values to use in condition evaluation
        
    Returns:
        Dictionary containing the evaluation result and metadata
    """
    try:
        # Extract the condition from node data
        condition = data.get("condition", "True")
        if not condition:
            condition = "True"
            
        # Log the evaluation attempt
        logger.info(f"Evaluating logic condition: {condition}")
        logger.debug(f"With inputs: {inputs}")
        
        # Evaluate the condition
        result = evaluate_condition(condition, inputs)
        
        # 🚀 ENHANCED: Include original input data in the output for data flow
        # Get the actual data from the main input (usually the first/primary input)
        main_input_data = None
        if inputs:
            # Find the main input data (prefer task output, then agent output, then any data)
            for key, value in inputs.items():
                if 'task' in key.lower() or 'agent' in key.lower():
                    main_input_data = value
                    break
            
            # Fallback to first input if no task/agent input found
            if main_input_data is None:
                main_input_data = next(iter(inputs.values()))
        
        # Return structured response with original data preserved
        return {
            "type": "logic_result",
            "output": {
                "condition": condition,
                "result": result,
                "path": "true" if result else "false"
            },
            # 🚀 CRITICAL: Preserve the original input data for downstream nodes
            "value": main_input_data,  # This ensures data flows through
            "original_inputs": inputs,  # Keep all inputs for debugging
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "logic",
                "condition_evaluated": condition,
                "data_passed_through": main_input_data is not None
            }
        }
        
    except Exception as e:
        logger.error(f"Error in logic node: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "logic"
            }
        }

async def process_logic_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced logic node processor with LLM-centric processing support and schema validation"""
    smart_mapper = SmartMapper()
    mapped_inputs = await smart_mapper.smart_map_inputs(node_data, context or {}, inputs)
    logic_node = LogicNode()
    return await logic_node.process(node_data, mapped_inputs, context or {})

class LogicNodeConfig(NodeConfig):
    """Configuration for Logic nodes"""
    label: str
    description: str
    conditions: List[str] = Field(default_factory=list, description="Logic conditions")
    operator: str = Field(default="AND", description="Logic operator (AND/OR)")
    
    # Enhanced input schema for logic
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'input': SchemaField(
                type=SchemaType.ANY,
                description='Input to evaluate',
                optional=False
            ),
            'context': SchemaField(
                type=SchemaType.OBJECT,
                description='Context for logic',
                optional=True
            ),
            'task_output': SchemaField(
                type=SchemaType.ANY,
                description='Output from task nodes',
                optional=True
            ),
            'agent_output': SchemaField(
                type=SchemaType.ANY,
                description='Output from agent nodes',
                optional=True
            )
        },
        required_fields=['input']
    ))
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.BOOLEAN,
                description='Logic evaluation result',
                optional=False
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                optional=False,
                properties={
                    'node_type': SchemaField(type=SchemaType.STRING, description='Type of node'),
                    'condition_evaluated': SchemaField(type=SchemaType.STRING, description='Condition that was evaluated'),
                    'data_passed_through': SchemaField(type=SchemaType.BOOLEAN, description='Whether input data was preserved'),
                    'timestamp': SchemaField(type=SchemaType.STRING, description='Timestamp of evaluation')
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message',
                optional=True
            ),
            'value': SchemaField(
                type=SchemaType.ANY,
                description='Original input data passed through',
                optional=True
            )
        },
        required_fields=['result', 'metadata']
    ))

class LogicNode(BaseNode):
    """Enhanced Logic Node with schema support"""
    def get_config_model(self) -> type[BaseModel]:
        return LogicNodeConfig

    async def process(self, node, inputs, context):
        """Process logic node with condition evaluation"""
        try:
            # Extract node data
            if isinstance(node, dict):
                node_data = node
                node_id = node_data.get('id', 'unknown')
            else:
                node_data = node.data
                node_id = node.id
            
            # Get condition from node data
            condition = node_data.get("condition", "True")
            if not condition:
                condition = "True"
            
            logger.info(f"🔍 Processing logic node: {node_data.get('label', 'Logic')}")
            logger.info(f"   Condition: {condition}")
            
            # Convert inputs to regular dict if needed
            regular_inputs = {}
            for key, value in inputs.items():
                if hasattr(value, 'get_value'):
                    regular_inputs[key] = value.get_value()
                else:
                    regular_inputs[key] = value
            
            # Evaluate the condition
            result = evaluate_condition(condition, regular_inputs)
            
            # Get the main input data to pass through
            main_input_data = None
            if regular_inputs:
                # Find the main input data (prefer task output, then agent output, then any data)
                for key, value in regular_inputs.items():
                    if 'task' in key.lower() or 'agent' in key.lower():
                        main_input_data = value
                        break
                
                # Fallback to first input if no task/agent input found
                if main_input_data is None:
                    main_input_data = next(iter(regular_inputs.values()))
            
            # Create metadata
            metadata = {
                "node_id": node_id,
                "node_type": "logic",
                "timestamp": datetime.now().isoformat(),
                "condition_evaluated": condition,
                "data_passed_through": main_input_data is not None
            }
            
            return {
                "result": result,
                "metadata": metadata,
                "value": main_input_data,  # Preserve original data for downstream nodes
                "condition": condition,
                "path": "true" if result else "false"
            }
            
        except Exception as e:
            logger.error(f"Logic processing failed: {str(e)}")
            return {
                "result": False,
                "error": str(e),
                "metadata": {
                    "node_id": node_id if 'node_id' in locals() else 'unknown',
                    "node_type": "logic",
                    "timestamp": datetime.now().isoformat()
                }
            }

    async def _execute(self, config: BaseModel, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Any:
        """Execute node-specific logic - required by BaseNode"""
        # Convert NodeData inputs to regular dict
        regular_inputs = {}
        for key, node_data in inputs.items():
            if isinstance(node_data, NodeData):
                regular_inputs[key] = node_data.get_value()
            else:
                regular_inputs[key] = node_data
        
        # Convert config to dict
        if hasattr(config, 'dict'):
            config_dict = config.dict()
        elif hasattr(config, 'model_dump'):
            config_dict = config.model_dump()
        else:
            config_dict = config
        
        # Call the process method
        result = await self.process(config_dict, regular_inputs, context)
        return result 