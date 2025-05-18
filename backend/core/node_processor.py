# core/node_processor.py
import logging
from typing import Dict, Any, Optional, Union
from datetime import datetime

from backend.models.data import NodeData
from backend.models.nodes import Node, NodeType
from backend.core.exceptions import NodeError
from backend.utils.logging import get_logger

logger = get_logger(__name__)

class NodeProcessor:
    """Base class for processing nodes"""
    
    def __init__(self):
        self.handlers = {}
        
    def register_handler(self, node_type: str, handler_func):
        """Register a handler function for a node type"""
        self.handlers[node_type] = handler_func
        
    def _check_for_error(self, input_data: Union[NodeData, Dict[str, Any]]) -> Optional[str]:
        """Check if input data represents an error"""
        if isinstance(input_data, NodeData):
            # For NodeData objects, use is_error() method
            if input_data.is_error():
                return input_data.error
            return None
        elif isinstance(input_data, dict):
            # For dictionaries, check for error key
            return input_data.get("error")
        return None
    
    def _wrap_as_nodedata(self, value: Any) -> NodeData:
        """Ensure a value is wrapped in NodeData"""
        if isinstance(value, NodeData):
            return value
        elif isinstance(value, dict) and "error" in value and value["error"]:
            return NodeData.from_error(value["error"])
        else:
            return NodeData.from_value(value)

    async def process_node(
        self, 
        node: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Optional[Dict[str, Any]] = None
    ) -> NodeData:
        """Process a node based on its type"""
        try:
            # Get node type and data (using dictionary access)
            node_type = node.get("type") or node.get("nodeType")
            node_id = node.get("id")
            node_data = node.get("data", {})
            
            if not node_type:
                return NodeData.from_error("Missing node type")
                
            # Check if any input has an error - handle both NodeData and dict
            for input_key, input_data in inputs.items():
                error = self._check_for_error(input_data)
                if error:
                    logger.error(f"Stopping flow due to error in input: {error}")
                    return NodeData.from_error(f"Previous node failed: {error}")
            
            # Get handler for this node type
            handler = self.handlers.get(node_type)
            if not handler:
                return NodeData.from_error(f"No handler registered for node type: {node_type}")
            
            # Convert inputs to NodeData objects if needed
            wrapped_inputs = {k: self._wrap_as_nodedata(v) for k, v in inputs.items()}
            
            # Execute handler
            result = await handler(node_data, wrapped_inputs, context)
            
            # Ensure result is wrapped in NodeData
            if not isinstance(result, NodeData):
                result = NodeData.from_value(result)
                
            return result
            
        except Exception as e:
            logger.error(f"Error processing node: {str(e)}")
            return NodeData.from_error(str(e))

# Create global instance
node_processor = NodeProcessor()

def register_node_handler(node_type: str):
    """Decorator to register node handlers"""
    def decorator(func):
        node_processor.register_handler(node_type, func)
        return func
    return decorator

# Register default handlers
@register_node_handler("task")
async def process_task_node(node_data: Dict[str, Any], inputs: Dict[str, NodeData], context: Dict[str, Any] = None) -> NodeData:
    """Process a task node"""
    try:
        from backend.nodes.task_node import TaskNode
        
        logger.info(f"Processing task node: {node_data.get('label', 'Unnamed Task')}")
        
        # Check for agent data
        agent_input = inputs.get('agent')
        if not agent_input:
            # Look for agent data in any input with matching prefix
            for key, value in inputs.items():
                if key.startswith('input_from_agent'):
                    agent_input = value
                    break
                    
        if not agent_input:
            logger.error("Task node requires a connected agent")
            return NodeData.from_error("Task execution requires a connected agent with valid data")
            
        # Convert node data to expected format
        node = {
            "id": node_data.get("nodeId") or "task-node",
            "type": "task",
            "data": node_data
        }
        
        # Process task using the TaskNode class
        task_node = TaskNode()
        
        # Format inputs for task
        task_inputs = {
            "connected_agents": [agent_input.get_value()],
            **{k: v for k, v in inputs.items() if k != 'agent'}
        }
        
        # Create execution context
        execution_context = {
            "execution_id": context.get("execution_id") if context else "direct-execution",
            "timestamp": datetime.now().isoformat()
        }
        
        result = await task_node.process(node, task_inputs, execution_context)
        
        return NodeData(
            value=result,
            metadata={
                "node_id": node.get("id"),
                "node_type": "task",
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing task node: {str(e)}")
        return NodeData.from_error(str(e))

# Register input node handler with both lowercase and uppercase variants
@register_node_handler("input")
@register_node_handler("Input")  # Add uppercase variant for robustness
async def process_input_node(node_data: Dict[str, Any], inputs: Dict[str, NodeData], context: Dict[str, Any] = None) -> NodeData:
    """Process an input node"""
    try:
        logger.info(f"Processing input node: {node_data.get('label', 'Unnamed Input')}")
        logger.debug(f"Input node data: {node_data}")
        logger.debug(f"Input node inputs: {inputs}")
        
        # Get input type from node configuration
        input_type = node_data.get("inputType", "text")
        
        # Extract text input from the inputs
        text_input = None
        if inputs:
            # Check if there's a text_input key directly
            if 'text_input' in inputs:
                text_value = inputs['text_input']
                if hasattr(text_value, 'value'):
                    # Get the value from NodeData object
                    text_input = text_value.value
                else:
                    text_input = text_value
                
                # Check if the value is nested
                if isinstance(text_input, dict) and 'value' in text_input:
                    if isinstance(text_input['value'], dict) and 'text_input' in text_input['value']:
                        text_input = text_input['value']['text_input']
                    else:
                        text_input = text_input['value']
                
                logger.info(f"Extracted text input: {text_input}")
                
                return NodeData.from_value({
                    "type": "text",
                    "value": text_input
                })
        
        # Handle file uploads 
        if input_type == "file":
            # Try to find file data in inputs
            file_data = extract_file_data(inputs, node_data)
            if file_data:
                logger.info(f"Found file input: {file_data.get('filename', 'unnamed file')}")
                return NodeData.from_value({
                    "type": "file",
                    "value": file_data
                })
            
            # Check if this is a required input
            if node_data.get("isRequired", False):
                return NodeData.from_error("Required file input is missing")
        
        # Handle text inputs
        # Return the input data or a default value
        input_value = inputs.get('input')
        if input_value:
            # Check if we need to wrap in a structured format
            if isinstance(input_value.value, str):
                # Structure text input properly
                return NodeData.from_value({
                    "type": "text",
                    "value": input_value.value
                })
            # If input already has type/value structure, use it directly
            if isinstance(input_value.value, dict) and "type" in input_value.value and "value" in input_value.value:
                return input_value
            return input_value
        
        # URL inputs
        if input_type == "url":
            url_value = extract_url_from_inputs(inputs, node_data)
            if url_value:
                return NodeData.from_value({
                    "type": "url",
                    "value": url_value
                })
        
        # Extract value from node data if available
        if 'value' in node_data:
            value = node_data['value']
            # Structure as appropriate type
            if isinstance(value, str):
                return NodeData.from_value({
                    "type": input_type, 
                    "value": value
                })
            return NodeData.from_value(value)
            
        # Use the default value from the node
        default_value = node_data.get('defaultValue')
        if default_value:
            if isinstance(default_value, str):
                return NodeData.from_value({
                    "type": input_type,
                    "value": default_value
                })
            return NodeData.from_value(default_value)
            
        # Return an empty result with proper structure
        return NodeData.from_value({
            "type": input_type,
            "value": ""
        })
        
    except Exception as e:
        logger.error(f"Error processing input node: {str(e)}")
        return NodeData.from_error(str(e))

def extract_file_data(inputs: Dict[str, Any], node_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract file data from inputs or node data"""
    # Check for file data in inputs
    for key, val in inputs.items():
        if hasattr(val, 'value'):
            value = val.value
            # Direct file value structure
            if isinstance(value, dict) and all(k in value for k in ["filename", "content"]):
                return value
                
            # Nested structure
            if isinstance(value, dict) and "value" in value:
                nested = value["value"]
                if isinstance(nested, dict) and all(k in nested for k in ["filename", "content"]):
                    return nested
    
    # Check for file data in node_data
    file_data = node_data.get("fileData")
    if file_data and isinstance(file_data, dict) and "filename" in file_data:
        return file_data
        
    # Check for file data in node_data.data
    if isinstance(node_data.get("data"), dict):
        file_data = node_data["data"].get("fileData")
        if file_data and isinstance(file_data, dict) and "filename" in file_data:
            return file_data
    
    return None

def extract_url_from_inputs(inputs: Dict[str, Any], node_data: Dict[str, Any]) -> Optional[str]:
    """Extract URL from inputs or node data"""
    # Check inputs for URL
    for key, val in inputs.items():
        if hasattr(val, 'value'):
            value = val.value
            if isinstance(value, str) and (value.startswith("http://") or value.startswith("https://")):
                return value
            if isinstance(value, dict) and "url" in value:
                return value["url"]
    
    # Check node data
    url = node_data.get("url")
    if url and isinstance(url, str):
        return url
    
    # Check node data.data
    if isinstance(node_data.get("data"), dict):
        url = node_data["data"].get("url")
        if url and isinstance(url, str):
            return url
    
    return None

# Register agent node handler
@register_node_handler("agent")
async def process_agent_node(node_data: Dict[str, Any], inputs: Dict[str, NodeData], context: Dict[str, Any] = None) -> NodeData:
    """Process an agent node"""
    try:
        from backend.nodes.agent_node import AgentNode
        
        logger.info(f"Processing agent node: {node_data.get('label', 'Unnamed Agent')}")
        
        # Convert node data to expected format
        node = {
            "id": node_data.get("nodeId") or node_data.get("id") or "agent-node",
            "type": "agent",
            "data": node_data
        }
        
        # Process agent using the AgentNode class
        agent_node = AgentNode()
        
        # Create execution context
        execution_context = {
            "execution_id": context.get("execution_id") if context else "direct-execution",
            "timestamp": datetime.now().isoformat()
        }
        
        # Process the agent node - the revised agent_node.process method now handles framework execution directly
        result = await agent_node.process(node, inputs, execution_context)
        
        # The result should already be a NodeData object, so return it directly
        return result
        
    except Exception as e:
        logger.error(f"Error processing agent node: {str(e)}")
        return NodeData.from_error(str(e))

# Register output node handler
@register_node_handler("output")
async def process_output_node(node_data: Dict[str, Any], inputs: Dict[str, NodeData], context: Dict[str, Any] = None) -> NodeData:
    """Process an output node"""
    try:
        from backend.nodes.output_node import OutputNode
        
        logger.info(f"Processing output node: {node_data.get('label', 'Unnamed Output')}")
        
        # Convert node data to expected format
        node = {
            "id": node_data.get("nodeId") or node_data.get("id") or "output-node",
            "type": "output",
            "data": {
                "label": node_data.get("label", "Output Node"),
                "output_type": node_data.get("output_type", "webhook"),
                "config": node_data.get("config", {}),
                **node_data
            }
        }
        
        # Process output using the OutputNode class
        output_node = OutputNode()
        
        # Create execution context
        execution_context = {
            "execution_id": context.get("execution_id") if context else "direct-execution",
            "timestamp": datetime.now().isoformat()
        }
        
        result = await output_node.process(node, inputs, execution_context)
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing output node: {str(e)}")
        return NodeData.from_error(str(e))