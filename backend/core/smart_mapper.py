"""
Smart Input Mapper for Intelligent Data Flow
Automatically maps outputs from previous nodes to inputs of current nodes
"""

import json
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class SmartMapper:
    """Handles intelligent input mapping between workflow nodes"""
    
    def __init__(self, use_ai_mapping: bool = True):
        self.use_ai_mapping = use_ai_mapping
        self.mapping_cache = {}  # Cache successful mappings
        
    async def smart_map_inputs(
        self, 
        node: Dict[str, Any], 
        context: Dict[str, Any],
        previous_outputs: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Main function to intelligently map inputs for a node
        
        Args:
            node: Current node configuration
            context: Execution context with variables
            previous_outputs: Direct outputs from previous nodes
            
        Returns:
            Dict with mapped inputs ready for node execution
        """
        node_id = node.get('id', 'unknown')
        node_type = node.get('type', 'unknown')
        
        logger.info(f"🧠 Smart mapping inputs for node {node_id} ({node_type})")
        
        try:
            # 1. Get expected inputs for this node type
            expected_inputs = self._get_expected_inputs(node)
            
            # 2. Map from context variables and previous outputs
            mapped_inputs = self._map_from_context(expected_inputs, context, previous_outputs)
            
            # 3. Apply data transformations
            transformed_inputs = self._transform_inputs(mapped_inputs, expected_inputs)
            
            # 4. Fill missing inputs with defaults or AI assistance
            complete_inputs = await self._fill_missing_inputs(
                transformed_inputs, expected_inputs, node, context
            )
            
            # 5. Log the mapping for debugging
            self._log_mapping(node_id, expected_inputs, complete_inputs, context)
            
            return complete_inputs
            
        except Exception as e:
            logger.error(f"❌ Smart mapping failed for {node_id}: {str(e)}")
            # Fallback: return context variables as-is
            return context.get('variables', {})
    
    def _get_expected_inputs(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Get expected inputs for a node based on its type and schema"""
        node_type = node.get('type', 'unknown')
        node_data = node.get('data', {})
        
        # Check for explicit input schema first
        if 'input_schema' in node_data:
            return node_data['input_schema']
        
        # Default schemas based on node type
        default_schemas = {
            'agent': {
                'query': {'type': 'string', 'description': 'Main query or task for the agent'},
                'context': {'type': 'string', 'description': 'Background context and information'},
                'user_input': {'type': 'string', 'description': 'Direct user input or message'}
            },
            'task': {
                'task_input': {'type': 'string', 'description': 'Input data for the task'},
                'agent_output': {'type': 'string', 'description': 'Output from associated agent'}
            },
            'tool': {
                'input_data': {'type': 'any', 'description': 'Data to be processed by the tool'},
                'parameters': {'type': 'object', 'description': 'Tool configuration parameters'}
            },
            'chat': {
                'message': {'type': 'string', 'description': 'User message or input'},
                'conversation_history': {'type': 'array', 'description': 'Previous conversation messages'}
            },
            'output': {
                'data': {'type': 'any', 'description': 'Data to be output'},
                'content': {'type': 'string', 'description': 'Content to be sent/saved'}
            },
            'logic': {
                'input_value': {'type': 'any', 'description': 'Value to evaluate in logic condition'}
            },
            'delay': {
                'trigger_data': {'type': 'any', 'description': 'Data that triggered the delay'}
            }
        }
        
        return default_schemas.get(node_type, {
            'input': {'type': 'any', 'description': 'Generic input data'}
        })
    
    def _map_from_context(
        self, 
        expected_inputs: Dict[str, Any], 
        context: Dict[str, Any],
        previous_outputs: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Map expected inputs from context variables"""
        mapped_inputs = {}
        variables = context.get('variables', {})
        
        # Include previous outputs in variables
        if previous_outputs:
            variables.update(previous_outputs)
        
        for input_name, input_config in expected_inputs.items():
            mapped_value = None
            source = None
            confidence = 0.0
            
            # 1. Direct exact match (highest priority)
            if input_name in variables:
                mapped_value = variables[input_name]
                source = f"exact_match:{input_name}"
                confidence = 1.0
            
            # 2. Semantic matching if no exact match
            if mapped_value is None:
                match_var, match_score = self._semantic_match(input_name, variables)
                if match_var and match_score > 0.5:  # Only accept good matches
                    mapped_value = variables[match_var]
                    source = f"semantic_match:{match_var}->{input_name}"
                    confidence = match_score
            
            # 3. Type-based matching
            if mapped_value is None:
                type_match, type_source = self._type_match(input_config, variables)
                if type_match is not None:
                    mapped_value = type_match
                    source = type_source
                    confidence = 0.4
            
            # Store mapping with metadata
            if mapped_value is not None:
                mapped_inputs[input_name] = mapped_value
                
                # Log mapping decision
                logger.info(f"   📥 {input_name}: {source} (confidence: {confidence:.2f})")
        
        return mapped_inputs
    
    def _semantic_match(self, input_name: str, variables: Dict[str, Any]) -> tuple:
        """Find the best semantic match for an input from available variables"""
        best_match = None
        best_score = 0.0
        
        # Enhanced semantic mappings with more comprehensive patterns
        semantic_mappings = {
            'query': ['query', 'question', 'prompt', 'request', 'search', 'ask', 'user_query', 'user_question'],
            'context': ['context', 'background', 'info', 'information', 'details', 'description', 'background_info'],
            'user_input': ['user_input', 'input', 'message', 'text', 'content', 'user_message', 'user_text'],
            'task_input': ['task_input', 'input', 'data', 'content', 'instructions', 'task_data'],
            'agent_output': ['agent_output', 'output', 'result', 'response', 'agent_result', 'previous_output'],
            'input_data': ['input_data', 'data', 'payload', 'content', 'input', 'information'],
            'parameters': ['parameters', 'params', 'config', 'configuration', 'settings', 'options'],
            'message': ['message', 'msg', 'user_message', 'chat_message', 'text', 'content', 'user_input'],
            'conversation_history': ['conversation_history', 'history', 'chat_history', 'messages', 'conversation', 'previous_messages'],
            'data': ['data', 'content', 'information', 'payload', 'input_data', 'output_data'],
            'content': ['content', 'text', 'message', 'data', 'body', 'payload'],
            'input_value': ['input_value', 'value', 'data', 'content', 'input'],
            'trigger_data': ['trigger_data', 'trigger', 'event_data', 'data', 'input']
        }
        
        # Get patterns for this input
        patterns = semantic_mappings.get(input_name.lower(), [input_name.lower()])
        
        for var_name, var_value in variables.items():
            var_name_lower = var_name.lower()
            
            # Direct exact match (highest score)
            if var_name_lower == input_name.lower():
                return var_name, 1.0
            
            # Pattern matching
            for pattern in patterns:
                if pattern in var_name_lower:
                    score = 0.9 if pattern == var_name_lower else 0.8
                    if score > best_score:
                        best_score = score
                        best_match = var_name
                
                # Reverse pattern matching (variable name in pattern)
                if var_name_lower in pattern:
                    score = 0.7
                    if score > best_score:
                        best_score = score
                        best_match = var_name
            
            # Fuzzy matching for similar words
            if input_name.lower() in var_name_lower or var_name_lower in input_name.lower():
                score = 0.6
                if score > best_score:
                    best_score = score
                    best_match = var_name
        
        return best_match, best_score if best_match else 0.0
    
    def _type_match(self, input_config: Dict[str, Any], variables: Dict[str, Any]) -> tuple:
        """Match based on expected data type"""
        expected_type = input_config.get('type', 'any')
        
        for var_name, var_value in variables.items():
            if self._is_type_compatible(var_value, expected_type):
                return var_value, f"type_match:{var_name}({type(var_value).__name__})"
                
        return None, None
    
    def _is_type_compatible(self, value: Any, expected_type: str) -> bool:
        """Check if value is compatible with expected type"""
        if expected_type == 'any':
            return True
            
        type_map = {
            'string': (str,),
            'number': (int, float),
            'boolean': (bool,),
            'object': (dict,),
            'array': (list, tuple),
        }
        
        expected_types = type_map.get(expected_type, ())
        return isinstance(value, expected_types)
    
    def _transform_inputs(
        self, 
        mapped_inputs: Dict[str, Any], 
        expected_inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply data transformations to make inputs compatible"""
        transformed = {}
        
        for input_name, input_data in mapped_inputs.items():
            if not isinstance(input_data, dict) or 'value' not in input_data:
                continue
                
            value = input_data['value']
            expected = expected_inputs.get(input_name, {})
            expected_type = expected.get('type', 'any')
            
            # Apply transformations
            try:
                transformed_value = self._transform_value(value, expected_type)
                transformed[input_name] = {
                    **input_data,
                    'value': transformed_value,
                    'transformed': transformed_value != value
                }
            except Exception as e:
                logger.warning(f"⚠️ Transformation failed for {input_name}: {str(e)}")
                transformed[input_name] = input_data  # Keep original
                
        return transformed
    
    def _transform_value(self, value: Any, expected_type: str) -> Any:
        """Transform a value to match expected type"""
        if expected_type == 'any':
            return value
            
        # String transformations
        if expected_type == 'string':
            if isinstance(value, dict):
                return json.dumps(value, indent=2)
            elif isinstance(value, list):
                return '\n'.join(str(item) for item in value)
            else:
                return str(value)
                
        # Number transformations
        elif expected_type == 'number':
            if isinstance(value, str):
                # Try to extract number from string
                numbers = re.findall(r'-?\d+\.?\d*', value)
                return float(numbers[0]) if numbers else 0
            return float(value)
            
        # Boolean transformations
        elif expected_type == 'boolean':
            if isinstance(value, str):
                return value.lower() in ('true', 'yes', '1', 'on', 'enabled')
            return bool(value)
            
        # Object transformations
        elif expected_type == 'object':
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except:
                    return {'content': value}
            elif isinstance(value, list):
                return {'items': value}
            return value if isinstance(value, dict) else {'value': value}
            
        # Array transformations
        elif expected_type == 'array':
            if isinstance(value, str):
                # Try to split string into array
                return [line.strip() for line in value.split('\n') if line.strip()]
            elif not isinstance(value, (list, tuple)):
                return [value]
                
        return value
    
    async def _fill_missing_inputs(
        self, 
        transformed_inputs: Dict[str, Any], 
        expected_inputs: Dict[str, Any],
        node: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fill missing inputs with defaults or AI assistance"""
        complete_inputs = {}
        
        for input_name, input_config in expected_inputs.items():
            if input_name in transformed_inputs:
                # Use mapped value
                complete_inputs[input_name] = transformed_inputs[input_name]['value']
            else:
                # Fill missing input
                default_value = await self._get_default_value(
                    input_name, input_config, node, context
                )
                complete_inputs[input_name] = default_value
                
        return complete_inputs
    
    async def _get_default_value(
        self, 
        input_name: str, 
        input_config: Dict[str, Any],
        node: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Get default value for missing input"""
        # Check for explicit default
        if 'default' in input_config:
            return input_config['default']
            
        # Use AI assistance if enabled
        if self.use_ai_mapping:
            ai_value = await self._ai_fill_input(input_name, input_config, node, context)
            if ai_value is not None:
                return ai_value
                
        # Type-based defaults
        expected_type = input_config.get('type', 'string')
        defaults = {
            'string': '',
            'number': 0,
            'boolean': False,
            'object': {},
            'array': [],
            'any': None
        }
        
        return defaults.get(expected_type, None)
    
    async def _ai_fill_input(
        self, 
        input_name: str, 
        input_config: Dict[str, Any],
        node: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Optional[Any]:
        """Use AI to intelligently fill missing inputs"""
        try:
            # Get available context for AI
            available_data = context.get('variables', {})
            node_type = node.get('type', 'unknown')
            description = input_config.get('description', '')
            
            # Simple heuristic-based filling (can be enhanced with actual LLM calls)
            if input_name in ['query', 'prompt', 'user_input']:
                # Look for any text content in context
                for key, value in available_data.items():
                    if isinstance(value, str) and len(value.strip()) > 10:
                        return value
                        
            elif input_name in ['context', 'background']:
                # Create context from available data
                context_parts = []
                for key, value in available_data.items():
                    if isinstance(value, str):
                        context_parts.append(f"{key}: {value}")
                return '\n'.join(context_parts)
                
            # TODO: Add actual LLM call here for more sophisticated mapping
            # This would call OpenAI/Anthropic to intelligently fill missing data
            
        except Exception as e:
            logger.warning(f"⚠️ AI input filling failed: {str(e)}")
            
        return None
    
    def _calculate_confidence(self, input_name: str, source: str) -> float:
        """Calculate confidence score for input mapping"""
        if source.startswith('exact_match'):
            return 1.0
        elif source.startswith('semantic_match'):
            return 0.8
        elif source.startswith('type_match'):
            return 0.6
        elif source.startswith('partial_match'):
            return 0.7
        elif source.startswith('latest_output'):
            return 0.4
        else:
            return 0.3
    
    def _log_mapping(
        self, 
        node_id: str, 
        expected_inputs: Dict[str, Any],
        mapped_inputs: Dict[str, Any],
        context: Dict[str, Any]
    ):
        """Log mapping results for debugging"""
        logger.info(f"🧠 Smart mapping results for {node_id}:")
        logger.info(f"   📋 Expected: {list(expected_inputs.keys())}")
        logger.info(f"   ✅ Mapped: {list(mapped_inputs.keys())}")
        
        # Store in context for frontend debugging
        if 'debug_info' not in context:
            context['debug_info'] = {}
            
        context['debug_info'][node_id] = {
            'expected_inputs': expected_inputs,
            'mapped_inputs': mapped_inputs,
            'mapping_timestamp': datetime.now().isoformat()
        }

# Global instance
smart_mapper = SmartMapper()

# Convenience function for easy import
async def smart_map_inputs(node: Dict[str, Any], context: Dict[str, Any], previous_outputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Smart mapping function - automatically maps inputs for nodes based on context
    
    Args:
        node: Node configuration with id, type, and data
        context: Execution context with variables
        previous_outputs: Previous node outputs for chaining
        
    Returns:
        Dict of mapped inputs ready for node execution
        
    Raises:
        ValueError: If node structure is invalid
    """
    # Validate node structure first
    if not isinstance(node, dict):
        raise ValueError("Node must be a dictionary")
    
    node_id = node.get('id')
    node_type = node.get('type')
    
    if not node_id:
        raise ValueError("Node must have an 'id' field")
    
    if not node_type:
        raise ValueError("Node must have a 'type' field")
    
    # Validate context structure
    if not isinstance(context, dict):
        raise ValueError("Context must be a dictionary")
    
    mapper = SmartMapper()
    return await mapper.smart_map_inputs(node, context, previous_outputs) 