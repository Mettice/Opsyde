"""
Utility functions for data processing and node communication
"""
import logging
from typing import Any, Dict, Union

logger = logging.getLogger(__name__)

def get_clean_output(node_result: Any) -> Any:
    """
    Extract clean output from nested node result structures.
    
    Handles multiple levels of wrapping like:
    - {"valid": True, "output": {"valid": True, "output": actual_data}}
    - NodeData objects with nested structures
    - Standardized result formats
    
    Args:
        node_result: The result from a node execution
        
    Returns:
        Clean, unwrapped output data
    """
    if node_result is None:
        return None
        
    # Handle NodeData objects
    if hasattr(node_result, 'value'):
        node_result = node_result.value
    
    # Handle dict structures with nested "output" fields
    if isinstance(node_result, dict):
        # Check for validation wrapper structure
        if "valid" in node_result and "output" in node_result:
            # This is a validation wrapper, extract the output
            inner_output = node_result["output"]
            # Recursively unwrap if needed
            return get_clean_output(inner_output)
        
        # Check for standardized result structure
        if "output" in node_result and isinstance(node_result["output"], dict):
            # This might be a standardized result, check if it has nested output
            inner_output = node_result["output"]
            if isinstance(inner_output, dict) and "output" in inner_output:
                # Nested output structure, unwrap further
                return get_clean_output(inner_output)
            else:
                # Single level output, return the inner output
                return inner_output
        
        # Check for CrewAI result structure
        if "result" in node_result:
            return node_result["result"]
        
        # Check for data field (common in API responses)
        if "data" in node_result:
            return node_result["data"]
    
    # If we get here, return as-is (already clean or not a dict)
    return node_result

def extract_nodedata_recursive(value: Any) -> Any:
    """
    Recursively extract values from NodeData objects in nested structures.
    
    Args:
        value: Any value that might contain NodeData objects
        
    Returns:
        Value with all NodeData objects unwrapped
    """
    if value is None:
        return None
    
    # Handle NodeData objects
    if hasattr(value, 'value'):
        return extract_nodedata_recursive(value.value)
    
    # Handle dictionaries
    if isinstance(value, dict):
        return {key: extract_nodedata_recursive(val) for key, val in value.items()}
    
    # Handle lists
    if isinstance(value, list):
        return [extract_nodedata_recursive(item) for item in value]
    
    # Handle other types (strings, numbers, booleans, etc.)
    return value

def clean_node_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean node inputs by unwrapping NodeData objects and nested structures.
    
    Args:
        inputs: Raw node inputs
        
    Returns:
        Cleaned inputs ready for node processing
    """
    cleaned = {}
    for key, value in inputs.items():
        # First unwrap NodeData objects
        unwrapped = extract_nodedata_recursive(value)
        # Then get clean output if it's a nested structure
        cleaned[key] = get_clean_output(unwrapped)
    
    return cleaned 