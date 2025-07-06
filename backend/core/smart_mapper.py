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

# 🚀 FIXED: Add unwrap helper for NodeData objects
def _to_raw(val):
    """Unwrap NodeData objects to get the raw value"""
    if hasattr(val, 'value'):
        return val.value
    return val

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
            # Convert WorkflowExecutionContext to dict if needed
            if hasattr(context, 'to_dict'):
                context = context.to_dict()
            
            # 1. Get expected inputs for this node type
            expected_inputs = self._get_expected_inputs(node, context)
            
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
            if hasattr(context, 'get'):
                return context.get('variables', {})
            else:
                return {}
    
    def _get_expected_inputs(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Get expected inputs for a node using node configuration classes"""
        try:
            node_data = node.get('data', {})
            node_type = node.get('type', 'unknown')
            node_id = node.get('id', 'unknown')
            
            # Get schema from node configuration classes directly
            try:
                # Import node configuration classes
                if node_type == 'agent':
                    from nodes.agent_node import AgentNodeConfig
                    config_class = AgentNodeConfig
                elif node_type == 'task':
                    from nodes.task_node import TaskNodeConfig
                    config_class = TaskNodeConfig
                elif node_type == 'tool':
                    from nodes.tool_node import ToolNodeConfig
                    config_class = ToolNodeConfig
                elif node_type == 'input':
                    from nodes.input_node import InputNodeConfig
                    config_class = InputNodeConfig
                elif node_type == 'output':
                    from nodes.output_node import OutputNodeConfig
                    config_class = OutputNodeConfig
                elif node_type == 'logic':
                    from nodes.logic_node import LogicNodeConfig
                    config_class = LogicNodeConfig
                elif node_type == 'delay':
                    from nodes.delay_node import DelayNodeConfig
                    config_class = DelayNodeConfig
                else:
                    logger.warning(f"Unknown node type: {node_type}")
                    return {}
                
                # Create temporary instance to get schema
                base_config = {
                    'node_id': node_id,
                    'node_type': node_type,
                    'label': node_data.get('label', 'temp'),
                    'description': node_data.get('description', 'temp')
                }
                
                # Add node-specific required fields
                if node_type == 'agent':
                    config_data = {
                        **base_config,
                        'role': node_data.get('role', 'temp'),
                        'goal': node_data.get('goal', 'temp'),
                        'backstory': node_data.get('backstory', 'temp'),
                        'systemMessage': node_data.get('systemMessage', 'temp'),
                        'llmConfig': node_data.get('llmConfig', {}),
                        'tools': node_data.get('tools', [])
                    }
                elif node_type == 'task':
                    config_data = {
                        **base_config,
                        'prompt': node_data.get('prompt', node_data.get('description', 'temp')),
                        'goal': node_data.get('goal', 'temp')
                    }
                elif node_type == 'tool':
                    config_data = {
                        **base_config,
                        'toolType': node_data.get('toolType', node_data.get('tool_type', 'api')),
                        'framework': node_data.get('framework', 'api')
                    }
                elif node_type == 'input':
                    config_data = {
                        **base_config,
                        'input_type': node_data.get('input_type', 'text')
                    }
                elif node_type == 'output':
                    config_data = {
                        **base_config,
                        'output_type': node_data.get('output_type', 'console')
                    }
                elif node_type == 'logic':
                    config_data = {
                        **base_config,
                        'condition': node_data.get('condition', 'equals')
                    }
                elif node_type == 'delay':
                    config_data = {
                        **base_config,
                        'duration': node_data.get('duration', '5s')
                    }
                else:
                    config_data = base_config
                
                # Create instance and get input schema
                config_instance = config_class(**config_data)
                input_schema = config_instance.input_schema
                
                if input_schema and hasattr(input_schema, 'fields'):
                    expected_fields = {}
                    for field_name, field_def in input_schema.fields.items():
                        expected_fields[field_name] = {
                            'type': field_def.type.value if hasattr(field_def.type, 'value') else str(field_def.type),
                            'description': field_def.description,
                            'required': field_name in input_schema.required_fields if hasattr(input_schema, 'required_fields') else False,
                            'default': field_def.default if hasattr(field_def, 'default') else None,
                            'source': 'node_config_class'
                        }
                    logger.info(f"🎯 Using node config class schema for {node_id}: {list(expected_fields.keys())}")
                    return expected_fields
                else:
                    logger.warning(f"⚠️ No input schema found for {node_type} node")
                    return {}
                    
            except Exception as e:
                logger.error(f"❌ Error getting schema for {node_type} node: {str(e)}")
                return {}
                
        except Exception as e:
            logger.error(f"❌ Error in _get_expected_inputs: {str(e)}")
            
            # 🔥 ROBUST FALLBACK: Try multiple fallback strategies
            logger.info(f"🔄 Smart mapping failed for {node_type} node {node_id}, trying fallbacks...")
            
            # Fallback 1: Try simple mapper
            try:
                from core.simple_mapper import simple_mapper
                previous_outputs = context.get('previous_outputs', {})
                if previous_outputs:
                    available_fields = simple_mapper.get_available_fields_dict(previous_outputs)
                    logger.info(f"🔄 Simple mapper fallback for {node_id}: {list(available_fields.keys())}")
                    return available_fields
            except Exception as fallback_error:
                logger.warning(f"⚠️ Simple mapper fallback failed: {str(fallback_error)}")
            
            # Fallback 2: Use context variables
            context_vars = context.get('variables', {})
            if context_vars:
                logger.info(f"🎯 Using context variables as inputs for {node_id}: {list(context_vars.keys())}")
                return context_vars
            
            # Fallback 3: Use workflow data manager variables
            try:
                from core.workflow_data_manager import workflow_data_manager
                if hasattr(context, 'workflow_id') and context.workflow_id:
                    workflow_context = workflow_data_manager.get_context(context.workflow_id)
                    if workflow_context:
                        available_vars = workflow_context.get_available_variables()
                        logger.info(f"🎯 Using workflow variables for {node_id}: {list(available_vars.keys())}")
                        return available_vars
            except Exception as workflow_error:
                logger.warning(f"⚠️ Workflow data manager fallback failed: {str(workflow_error)}")
            
            # Final fallback: return empty dict
            logger.warning(f"⚠️ All fallbacks failed for {node_type} node {node_id}")
            return {}

    
    def _map_from_context(
        self, 
        expected_inputs: Dict[str, Any], 
        context: Dict[str, Any],
        previous_outputs: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Map inputs from execution context and previous outputs"""
        mapped_inputs = {}
        variables = context.get('variables', {})
        
        # 🔥 NEW: Try schema-based matching first if previous outputs available
        if previous_outputs:
            for input_name, input_config in expected_inputs.items():
                if input_name in mapped_inputs:
                    continue  # Already mapped
                    
                # Call _schema_based_match for each input individually
                best_match, confidence = self._schema_based_match(input_name, input_config, previous_outputs)
                if best_match and confidence > 0.7:  # Only use high-confidence matches
                    # FIXED: Extract the actual value from the tuple
                    if isinstance(best_match, tuple) and len(best_match) == 2:
                        actual_value = best_match[1]  # Get the value, not the key
                    else:
                        actual_value = best_match
                        
                    mapped_inputs[input_name] = {
                        'value': actual_value,
                        'source': f"schema_match:{input_name}",
                        'confidence': confidence
                    }
        
        # Continue with existing mapping logic for unmapped fields
        for input_name, input_config in expected_inputs.items():
            if input_name in mapped_inputs:
                continue  # Already mapped via schema
            
            # 🚀 FIXED: Add fallback logic for task_output from result field
            if input_name == "task_output" and previous_outputs:
                for var_name, var_value in previous_outputs.items():
                    raw_val = _to_raw(var_value)
                    if isinstance(raw_val, dict):
                        # First try to get from 'value' field (logic node preserves data here)
                        if "value" in raw_val and raw_val["value"] is not None:
                            mapped_inputs[input_name] = {
                                'value': _to_raw(raw_val["value"]),
                                'source': f"fallback_value:{var_name}",
                                'confidence': 0.95
                            }
                            logger.info(f"🎯 Found task_output from {var_name}.value field")
                            break
                        # Fallback to 'result' field
                        elif "result" in raw_val:
                            mapped_inputs[input_name] = {
                                'value': _to_raw(raw_val["result"]),
                                'source': f"fallback_result:{var_name}",
                                'confidence': 0.9
                            }
                            logger.info(f"🎯 Found task_output from {var_name}.result field")
                            break
            
            # Try semantic matching first
            best_match, confidence = self._semantic_match(input_name, variables)
            if best_match and confidence > 0.6:
                mapped_inputs[input_name] = {
                    'value': variables[best_match],
                    'source': f"semantic_match:{best_match}",
                    'confidence': confidence
                }
                continue
            
            # Try type matching if semantic matching failed
            type_match, type_source = self._type_match(input_config, variables)
            if type_match is not None:
                mapped_inputs[input_name] = {
                    'value': type_match,
                    'source': type_source,
                    'confidence': 0.5
                }
                continue
            
            # 🚀 NEW: Try to find preserved data in 'value' fields from previous outputs
            if previous_outputs:
                for var_name, var_value in previous_outputs.items():
                    raw_val = _to_raw(var_value)
                    if isinstance(raw_val, dict) and "value" in raw_val and raw_val["value"] is not None:
                        # Check if this value is compatible with the expected input
                        if self._is_type_compatible(raw_val["value"], input_config.get('type', 'any')):
                            mapped_inputs[input_name] = {
                                'value': _to_raw(raw_val["value"]),
                                'source': f"preserved_value:{var_name}",
                                'confidence': 0.8
                            }
                            logger.info(f"🎯 Found {input_name} from preserved value in {var_name}")
                            break
            
            # 🚀 ENHANCED: Look for any input that might need the preserved story content
            if input_name in ['task_output', 'input', 'content', 'data'] and previous_outputs:
                for var_name, var_value in previous_outputs.items():
                    raw_val = _to_raw(var_value)
                    if isinstance(raw_val, dict) and "value" in raw_val and raw_val["value"] is not None:
                        # If this is a string with substantial content, it's likely the story
                        if isinstance(raw_val["value"], str) and len(raw_val["value"]) > 100:
                            mapped_inputs[input_name] = {
                                'value': _to_raw(raw_val["value"]),
                                'source': f"story_content:{var_name}",
                                'confidence': 0.9
                            }
                            logger.info(f"🎯 Found story content for {input_name} from {var_name}: {len(raw_val['value'])} chars")
                            break
                        # Special case: if we're looking for 'input' and the preserved value is a string, use it
                        elif input_name == "input" and isinstance(raw_val["value"], str):
                            mapped_inputs[input_name] = {
                                'value': raw_val["value"],
                                'source': f"preserved_string_value:{var_name}",
                                'confidence': 0.9
                            }
                            logger.info(f"🎯 Found {input_name} from preserved string value in {var_name}")
                            break
            
            # 🚀 ULTIMATE FALLBACK: Look for ANY value field with substantial content
            if input_name == "input" and previous_outputs:
                for var_name, var_value in previous_outputs.items():
                    raw_val = _to_raw(var_value)
                    if isinstance(raw_val, dict) and "value" in raw_val and raw_val["value"] is not None:
                        # If this is a string with substantial content, use it regardless of input name
                        if isinstance(raw_val["value"], str) and len(raw_val["value"]) > 50:
                            mapped_inputs[input_name] = {
                                'value': raw_val["value"],
                                'source': f"ultimate_fallback:{var_name}",
                                'confidence': 0.85
                            }
                            logger.info(f"🎯 ULTIMATE FALLBACK: Found content for {input_name} from {var_name}: {len(raw_val['value'])} chars")
                            break
            
            # 🚀 CRITICAL FIX: Special handling for output node to get story content
            if input_name == "input" and previous_outputs:
                for var_name, var_value in previous_outputs.items():
                    raw_val = _to_raw(var_value)
                    if isinstance(raw_val, dict) and "value" in raw_val and raw_val["value"] is not None:
                        # If this is a string with substantial content, it's the story we want
                        if isinstance(raw_val["value"], str) and len(raw_val["value"]) > 100:
                            mapped_inputs[input_name] = {
                                'value': raw_val["value"],
                                'source': f"output_story_content:{var_name}",
                                'confidence': 0.95
                            }
                            logger.info(f"🎯 CRITICAL: Found story content for output node from {var_name}: {len(raw_val['value'])} chars")
                            break
                        # Also check for any substantial string content in the value field
                        elif isinstance(raw_val["value"], str) and len(raw_val["value"]) > 10:
                            mapped_inputs[input_name] = {
                                'value': raw_val["value"],
                                'source': f"output_content:{var_name}",
                                'confidence': 0.9
                            }
                            logger.info(f"🎯 Found content for output node from {var_name}: {len(raw_val['value'])} chars")
                            break
        
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
            'task_input': ['task_input', 'input', 'data', 'content', 'instructions', 'task_data', 'result', 'output', 'agent_output'],
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
        
        # Store in context for frontend debugging (only if context supports item assignment)
        try:
            if hasattr(context, '__setitem__'):
                if 'debug_info' not in context:
                    context['debug_info'] = {}
                    
                context['debug_info'][node_id] = {
                    'expected_inputs': expected_inputs,
                    'mapped_inputs': mapped_inputs,
                    'mapping_timestamp': datetime.now().isoformat()
                }
        except (TypeError, AttributeError):
            # Context doesn't support item assignment (e.g., WorkflowExecutionContext)
            logger.debug(f"Context doesn't support item assignment, skipping debug info storage for {node_id}")

    def _schema_based_match(self, input_name: str, input_config: Dict[str, Any], previous_outputs: Dict[str, Any]) -> tuple:
        """Match inputs based on schema compatibility"""
        best_match = None
        best_score = 0.0
        
        for var_name, var_value in previous_outputs.items():
            # Skip if variable is None
            if var_value is None:
                continue
                
            # Calculate type compatibility score
            type_score = self._calculate_type_compatibility(var_value, input_config)
            
            # Calculate semantic similarity score
            semantic_score = self._calculate_semantic_similarity(input_name, var_name)
            
            # Combine scores with weights
            total_score = (0.7 * type_score) + (0.3 * semantic_score)
            
            if total_score > best_score:
                best_score = total_score
                best_match = (var_name, var_value)
        
        return best_match, best_score

    def _calculate_type_compatibility(self, value: Any, schema: Dict[str, Any]) -> float:
        """Calculate type compatibility score between value and schema"""
        try:
            expected_type = schema.get('type', 'any')
            
            # Handle basic types
            if expected_type == 'any':
                return 1.0
                
            if expected_type == 'string' and isinstance(value, str):
                return 1.0
                
            if expected_type == 'number' and isinstance(value, (int, float)):
                return 1.0
                
            if expected_type == 'boolean' and isinstance(value, bool):
                return 1.0
                
            if expected_type == 'array' and isinstance(value, (list, tuple)):
                return 1.0
                
            if expected_type == 'object' and isinstance(value, dict):
                return 1.0
                
            # Handle nested types
            if expected_type.startswith('array<') and isinstance(value, (list, tuple)):
                inner_type = expected_type[6:-1]
                if value and all(self._calculate_type_compatibility(v, {'type': inner_type}) > 0.5 for v in value):
                    return 0.8
                    
            if expected_type.startswith('object<') and isinstance(value, dict):
                inner_type = expected_type[7:-1]
                if value and all(self._calculate_type_compatibility(v, {'type': inner_type}) > 0.5 for v in value.values()):
                    return 0.8
                    
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating type compatibility: {str(e)}")
            return 0.0

    def _calculate_semantic_similarity(self, name1: str, name2: str) -> float:
        """Calculate semantic similarity between two names"""
        try:
            # Convert to lowercase and remove special characters
            name1 = ''.join(c.lower() for c in name1 if c.isalnum())
            name2 = ''.join(c.lower() for c in name2 if c.isalnum())
            
            # Exact match
            if name1 == name2:
                return 1.0
                
            # One contains the other
            if name1 in name2 or name2 in name1:
                return 0.8
                
            # Common words
            words1 = set(name1.split('_'))
            words2 = set(name2.split('_'))
            common = words1.intersection(words2)
            
            if common:
                return len(common) / max(len(words1), len(words2))
                
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {str(e)}")
            return 0.0

    def _extract_value(self, value):
        # Helper to extract value from NodeData or return as is
        logger.debug(f"🔧 Smart mapper extracting value: {type(value).__name__}")
        
        # Use the utility function for consistent extraction
        from .utils import get_clean_output
        value = get_clean_output(value)
        
        # 🚀 FIXED: Add one more branch to recurse through NodeData and inner dicts
        if isinstance(value, dict) and 'value' in value and len(value) == 1:
            return get_clean_output(value['value'])
        return value

    def map_inputs(self, expected_inputs, previous_outputs):
        mapped = {}
        for key in expected_inputs:
            value = previous_outputs.get(key)
            value = self._extract_value(value)
            mapped[key] = value
        return mapped

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
    
    # Validate context structure - allow both dict and WorkflowExecutionContext
    if not isinstance(context, dict) and not hasattr(context, 'to_dict'):
        raise ValueError("Context must be a dictionary or WorkflowExecutionContext")
    
    # Convert WorkflowExecutionContext to dict if needed
    if hasattr(context, 'to_dict'):
        context = context.to_dict()
    
    mapper = SmartMapper()
    return await mapper.smart_map_inputs(node, context, previous_outputs)