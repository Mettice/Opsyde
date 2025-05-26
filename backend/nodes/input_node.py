import logging
from typing import Dict, Any
from backend.models.data import NodeData

logger = logging.getLogger(__name__)

class InputNode:
    """Input node for collecting user inputs and data"""
    
    def __init__(self):
        pass

    async def process(
        self, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process input node - returns the configured input value"""
        try:
            # Get the input configuration
            input_type = node_data.get("inputType", "text")
            input_value = node_data.get("value", "")
            input_label = node_data.get("label", "Input")
            
            # For now, return the configured value
            # In a real implementation, this might collect user input dynamically
            result = {
                "type": "input_result",
                "input_type": input_type,
                "label": input_label,
                "value": input_value,
                "timestamp": context.get("execution_timestamp")
            }
            
            logger.info(f"Input node processed: {input_label} = {input_value}")
            
            return NodeData.from_value(result)
            
        except Exception as e:
            logger.error(f"Error in input node: {str(e)}")
            return NodeData.from_error(f"Input processing failed: {str(e)}")

async def process_input_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Process function for input nodes"""
    input_node = InputNode()
    return await input_node.process(node_data, inputs, context or {}) 