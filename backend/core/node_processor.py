# backend/core/node_processor.py - Enhanced Version (Corrected)
import logging
from typing import Dict, Any, Optional, Union, Callable
from datetime import datetime
import importlib
import asyncio
import json
import sys

from models.data import NodeData
from models.results import NodeResult, ExecutionStatus, ResultType
from core.exceptions import NodeError
from utils.logging import get_logger

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

logger = get_logger(__name__)

class NodeProcessor:
    """Enhanced node processor with intelligent input mapping and LLM-centric mode"""
    
    def __init__(self):
        self.handlers = {}
        self.lazy_handlers = {}
        self.smart_mapping_enabled = True  # Toggle for smart mapping
        self.llm_mode_enabled = False  # NEW: Toggle for LLM-centric processing
        
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
        self.handlers[node_type] = handler_func

    def register_lazy_handler(self, node_type: str, module_path: str, function_name: str):
        """Register a lazy-loaded handler for a specific node type"""
        self.lazy_handlers[node_type] = (module_path, function_name)

    def _get_handler(self, node_type: str) -> Optional[Callable]:
        """Get handler for a node type, loading lazily if needed"""
        # Check direct handlers first
        if node_type in self.handlers:
            return self.handlers[node_type]
        
        # Check lazy handlers
        if node_type in self.lazy_handlers:
            try:
                module_path, function_name = self.lazy_handlers[node_type]
                
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
                self.handlers[node_type] = handler
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
            return NodeData(error=error_msg)

        # Convert inputs to NodeData format
        nodedata_inputs = {}
        for key, value in inputs.items():
            nodedata_inputs[key] = self._wrap_as_nodedata(value)

        # Execute the node
        logger.info(f"🔄 Executing traditional {node_type} handler for {node_id}")
        
        if asyncio.iscoroutinefunction(handler):
            result = await handler(node, nodedata_inputs, context)
        else:
            result = handler(node, nodedata_inputs, context)

        # Ensure result is NodeData
        if not isinstance(result, NodeData):
            result = NodeData(value=result)
            
        return result

    async def process_node(
        self, 
        node: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Optional[Any] = None
    ) -> NodeData:
        """
        Enhanced node processing with smart configuration fixing and LLM-centric mode
        """
        node_id = node.get("id", "unknown")
        node_type = node.get("type", "unknown")
        start_time = datetime.now()
        
        logger.info(f"🔧 Processing node {node_id} (type: {node_type}) - LLM Mode: {self.llm_mode_enabled}")
        
        try:
            # 🧠 SMART CONFIGURATION FIXING: Fix missing required fields
            if self.smart_mapping_enabled:
                try:
                    fixed_node = self._smart_fix_node_config(node)
                    if fixed_node != node:
                        logger.info(f"🧠 Smart config fix applied to {node_id}")
                        node = fixed_node
                except Exception as config_error:
                    logger.warning(f"⚠️ Smart config fix failed for {node_id}: {str(config_error)}")

            # 🧠 SMART MAPPING: Intelligently map inputs before execution
            processed_inputs = inputs
            if self.smart_mapping_enabled:
                try:
                    # Convert context to dictionary format for smart mapping
                    context_dict = {}
                    if context is None:
                        context_dict = {'variables': inputs}
                    elif isinstance(context, dict):
                        context_dict = context
                    elif hasattr(context, 'variables'):
                        # WorkflowExecutionContext object
                        context_dict = {
                            'variables': getattr(context, 'variables', {}),
                            'execution_id': getattr(context, 'execution_id', ''),
                            'workflow_id': getattr(context, 'workflow_id', ''),
                            'user_id': getattr(context, 'user_id', '')
                        }
                    else:
                        # Fallback - create basic context
                        context_dict = {'variables': inputs}
                    
                    # Apply smart mapping
                    mapped_inputs = await smart_map_inputs(node, context_dict, inputs)
                    
                    logger.info(f"🧠 Smart mapping completed for {node_id}")
                    logger.info(f"   📥 Original inputs: {list(inputs.keys())}")
                    logger.info(f"   🎯 Mapped inputs: {list(mapped_inputs.keys())}")
                    
                    # Use mapped inputs for processing
                    processed_inputs = mapped_inputs
                    
                    # Store mapping info in context for debugging
                    if hasattr(context, 'variables'):
                        context.variables[f"{node_id}_mapping_info"] = {
                            'original_inputs': list(inputs.keys()),
                            'mapped_inputs': list(mapped_inputs.keys()),
                            'mapping_timestamp': start_time.isoformat()
                        }
                    
                except Exception as mapping_error:
                    logger.warning(f"⚠️ Smart mapping failed for {node_id}: {str(mapping_error)}")
                    # Fallback to original inputs
                    processed_inputs = inputs

            # Validate inputs
            validation_error = self._validate_node_inputs(processed_inputs)
            if validation_error:
                error_msg = f"Input validation failed for node {node_id}: {validation_error}"
                logger.error(error_msg)
                return NodeData(error=error_msg)

            # 🤖 NEW: Choose processing mode - LLM-centric or traditional
            if self.llm_mode_enabled:
                # Use LLM-centric processing
                result = await self._process_with_llm(node, processed_inputs, context)
            else:
                # Use traditional handler-based processing
                result = await self._process_with_traditional_handler(node, processed_inputs, context)

            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # 📊 ENHANCED LOGGING: Store execution info in context
            if context and hasattr(context, 'variables'):
                context.variables[f"{node_id}_execution_info"] = {
                    'node_type': node_type,
                    'execution_time': execution_time,
                    'success': not result.is_error(),
                    'processing_mode': 'llm' if self.llm_mode_enabled else 'traditional',
                    'timestamp': datetime.now().isoformat()
                }
                
                # Store node output in context variables for next nodes
                output_key = f"{node_id}_output"
                context.variables[output_key] = result.get_value() if not result.is_error() else None
                
                # Also store with simpler naming for easier access
                simple_key = node_id.replace('-', '_')
                context.variables[simple_key] = result.get_value() if not result.is_error() else None

            mode_icon = "🤖" if self.llm_mode_enabled else "🔄"
            logger.info(f"✅ {mode_icon} Node {node_id} completed in {execution_time:.2f}s")
            return result

        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            error_msg = f"Node {node_id} failed after {execution_time:.2f}s: {str(e)}"
            logger.error(error_msg)
            
            # Store error info in context
            if context and hasattr(context, 'variables'):
                context.variables[f"{node_id}_execution_info"] = {
                    'node_type': node_type,
                    'execution_time': execution_time,
                    'success': False,
                    'error': str(e),
                    'processing_mode': 'llm' if self.llm_mode_enabled else 'traditional',
                    'timestamp': datetime.now().isoformat()
                }
            
            return NodeData(error=error_msg)

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