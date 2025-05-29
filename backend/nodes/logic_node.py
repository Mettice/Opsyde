import logging
from typing import Dict, Any
from datetime import datetime

from models.data import NodeData

logger = logging.getLogger(__name__)

def evaluate_condition(condition: str, inputs: Dict[str, Any]) -> bool:
    """
    Safely evaluate a condition string with given inputs
    """
    try:
        # Create a safe evaluation context with the inputs
        # Make inputs available both as 'inputs' dict and as individual variables
        eval_globals = {
            "inputs": inputs,
            **inputs  # Unpack inputs so they're available as individual variables
        }
        
        logger.debug(f"Evaluating condition: {condition}")
        logger.debug(f"Available variables: {list(eval_globals.keys())}")
        
        # Evaluate the condition
        result = eval(condition, eval_globals, {})
        logger.info(f"Condition '{condition}' evaluated to: {result}")
        return bool(result)
    except Exception as e:
        logger.error(f"Error evaluating condition '{condition}': {str(e)}")
        logger.error(f"Available inputs: {inputs}")
        return False

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
        
        # Return structured response
        return {
            "type": "logic_result",
            "output": {
                "condition": condition,
                "result": result,
                "path": "true" if result else "false"
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "logic",
                "condition_evaluated": condition
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
    """
    Process logic node - wrapper function expected by the node processor
    
    Args:
        node_data: Logic node configuration
        inputs: Input values from connected nodes
        context: Execution context
        
    Returns:
        NodeData object with the logic evaluation result
    """
    try:
        # Extract actual input values from NodeData objects
        processed_inputs = {}
        for key, value in inputs.items():
            if isinstance(value, NodeData):
                # Extract the actual value from NodeData
                if value.is_error():
                    return NodeData.from_error(f"Input '{key}' has error: {value.error}")
                processed_inputs[key] = value.value
            elif hasattr(value, 'value'):
                processed_inputs[key] = value.value
            elif hasattr(value, 'data'):
                processed_inputs[key] = value.data
            else:
                processed_inputs[key] = value
        
        logger.info(f"Logic node processed inputs: {processed_inputs}")
        
        # Run the logic evaluation
        result = await run_logic_node(node_data, processed_inputs)
        
        # Return as NodeData
        if result.get("type") == "error":
            return NodeData.from_error(result.get("error", "Logic evaluation failed"))
        else:
            return NodeData.from_value(result)
            
    except Exception as e:
        logger.error(f"Error processing logic node: {str(e)}")
        return NodeData.from_error(f"Logic node processing failed: {str(e)}") 