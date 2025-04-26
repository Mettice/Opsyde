import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

def evaluate_condition(condition: str, inputs: Dict[str, Any]) -> bool:
    """
    Safely evaluate a condition string with given inputs
    """
    try:
        # Create a safe evaluation context with only the inputs
        eval_globals = {"inputs": inputs}
        
        # Evaluate the condition
        result = eval(condition, eval_globals, {})
        return bool(result)
    except Exception as e:
        logger.error(f"Error evaluating condition '{condition}': {str(e)}")
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