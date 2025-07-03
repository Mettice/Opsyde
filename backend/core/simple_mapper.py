"""
Simple Data Mapper - Replaces complex UniversalDataTransformer with explicit field mapping
"""
import logging
from typing import Dict, Any, Optional, List
from utils.logging import get_logger

logger = get_logger(__name__)

class SimpleMapper:
    """
    Simple mapper that uses explicit field mappings instead of smart guessing.
    This replaces the complex UniversalDataTransformer with a straightforward approach.
    """
    
    def __init__(self):
        self.logger = logger
    
    def map_fields(
        self, 
        source_data: Dict[str, Any], 
        field_mappings: Dict[str, str],
        node_type: str
    ) -> Dict[str, Any]:
        """
        Map fields from source data to target format using explicit mappings.
        
        Args:
            source_data: Data from previous nodes
            field_mappings: Explicit mappings like {"query": "agent.response", "context": "tool.result"}
            node_type: Type of target node (agent, task, tool, etc.)
            
        Returns:
            Mapped data ready for the target node
        """
        try:
            mapped_data = {}
            
            for target_field, source_path in field_mappings.items():
                if source_path:
                    value = self._get_nested_value(source_data, source_path)
                    if value is not None:
                        mapped_data[target_field] = value
                        self.logger.debug(f"Mapped {source_path} → {target_field}: {type(value).__name__}")
                    else:
                        self.logger.warning(f"Source path '{source_path}' not found in data")
            
            # Add default values for unmapped required fields
            self._add_defaults(mapped_data, node_type)
            
            self.logger.info(f"Simple mapping completed for {node_type} node: {list(mapped_data.keys())}")
            return mapped_data
            
        except Exception as e:
            self.logger.error(f"Error in simple mapping: {str(e)}")
            # Return empty dict on error - let the node handle missing data
            return {}
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """
        Get nested value from dictionary using dot notation.
        
        Args:
            data: Source data dictionary
            path: Dot-separated path like "agent.response" or "tool.result.data"
            
        Returns:
            Value at the specified path, or None if not found
        """
        try:
            # Use utility function to clean the data first
            from .utils import get_clean_output
            cleaned_data = get_clean_output(data)
            
            keys = path.split('.')
            value = cleaned_data
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif isinstance(value, list) and key.isdigit():
                    index = int(key)
                    if 0 <= index < len(value):
                        value = value[index]
                    else:
                        return None
                else:
                    return None
            
            return value
            
        except Exception as e:
            self.logger.debug(f"Error getting nested value for path '{path}': {str(e)}")
            return None
    
    def _add_defaults(self, mapped_data: Dict[str, Any], node_type: str):
        """
        Add default values for required fields that weren't mapped.
        
        Args:
            mapped_data: Current mapped data
            node_type: Type of target node
        """
        # Define default values for each node type
        defaults = {
            'agent': {
                'query': '',
                'context': {},
                'tools': []
            },
            'task': {
                'agent_output': '',
                'context': {},
                'parameters': {}
            },
            'tool': {
                'input_data': {},
                'parameters': {},
                'query': ''
            },
            'output': {
                'data': {},
                'format': 'json',
                'destination': 'console'
            },
            'logic': {
                'condition': 'equals',
                'value_a': '',
                'value_b': ''
            },
            'chat': {
                'message': '',
                'context': {},
                'history': []
            },
            'trigger': {
                'trigger_data': {},
                'api_data': {},
                'webhook_data': {}
            }
        }
        
        node_defaults = defaults.get(node_type, {})
        
        for field, default_value in node_defaults.items():
            if field not in mapped_data:
                mapped_data[field] = default_value
                self.logger.debug(f"Added default for {field}: {type(default_value).__name__}")
    
    def get_available_fields(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract all available fields from data for UI display.
        
        Args:
            data: Source data dictionary
            
        Returns:
            List of field information for UI
        """
        fields = []
        
        def extract_fields(obj, prefix='', source=''):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    field_path = f"{prefix}.{key}" if prefix else key
                    fields.append({
                        'path': field_path,
                        'type': type(value).__name__,
                        'is_array': isinstance(value, list),
                        'is_object': isinstance(value, dict),
                        'sample_value': self._format_sample_value(value),
                        'source': source
                    })
                    
                    # Recursively extract nested fields
                    if isinstance(value, (dict, list)):
                        extract_fields(value, field_path, source)
                        
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    field_path = f"{prefix}[{i}]"
                    fields.append({
                        'path': field_path,
                        'type': type(item).__name__,
                        'is_array': False,
                        'is_object': isinstance(item, dict),
                        'sample_value': self._format_sample_value(item),
                        'source': source
                    })
                    
                    if isinstance(item, (dict, list)):
                        extract_fields(item, field_path, source)
        
        extract_fields(data)
        return fields
    
    def get_available_fields_dict(self, data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        Extract all available fields from data as a dictionary for fallback use.
        
        Args:
            data: Source data dictionary
            
        Returns:
            Dictionary with field paths as keys and field info as values
        """
        fields_list = self.get_available_fields(data)
        fields_dict = {}
        for field in fields_list:
            fields_dict[field['path']] = field
        return fields_dict
    
    def _format_sample_value(self, value: Any) -> str:
        """
        Format a sample value for display in UI.
        
        Args:
            value: Value to format
            
        Returns:
            Formatted string representation
        """
        if isinstance(value, str):
            return value[:50] + "..." if len(value) > 50 else value
        elif isinstance(value, (dict, list)):
            return str(type(value).__name__)
        else:
            return str(value)
    
    def validate_mapping(self, field_mappings: Dict[str, str], available_fields: List[str]) -> Dict[str, Any]:
        """
        Validate field mappings against available fields.
        
        Args:
            field_mappings: User-defined field mappings
            available_fields: List of available field paths
            
        Returns:
            Validation result with errors and warnings
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        for target_field, source_path in field_mappings.items():
            if source_path and source_path not in available_fields:
                result['errors'].append(f"Source path '{source_path}' not found in available fields")
                result['valid'] = False
        
        return result

# Global instance
simple_mapper = SimpleMapper()

def map_fields_simple(
    source_data: Dict[str, Any], 
    field_mappings: Dict[str, str],
    node_type: str
) -> Dict[str, Any]:
    """
    Simple function to map fields using explicit mappings.
    
    Args:
        source_data: Data from previous nodes
        field_mappings: Explicit field mappings
        node_type: Target node type
        
    Returns:
        Mapped data for the target node
    """
    return simple_mapper.map_fields(source_data, field_mappings, node_type)

def get_available_fields_simple(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Get available fields from data for UI display.
    
    Args:
        data: Source data dictionary
        
    Returns:
        List of field information
    """
    return simple_mapper.get_available_fields(data)

def get_available_fields_dict_simple(data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Get available fields from data as a dictionary for fallback use.
    
    Args:
        data: Source data dictionary
        
    Returns:
        Dictionary with field paths as keys and field info as values
    """
    return simple_mapper.get_available_fields_dict(data) 