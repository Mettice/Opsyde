# backend/core/node_processor.py - Enhanced Version (Corrected)
import logging
from typing import Dict, Any, Optional, Union, Callable
from datetime import datetime
import importlib
import asyncio
import json

from models.data import NodeData
from models.results import NodeResult, ExecutionStatus, ResultType
from core.exceptions import NodeError
from utils.logging import get_logger

# NEW: Import enhanced framework registry for validation
from framework_registry import framework_registry, validate_framework_llm_combination

# Import WorkflowExecutionContext for proper type checking
try:
    from core.workflow_execution_context import WorkflowExecutionContext
except ImportError:
    # Handle circular import by using string comparison
    WorkflowExecutionContext = None

logger = get_logger(__name__)

class NodeProcessor:
    """Enhanced node processor with lazy loading and better error handling"""
    
    def __init__(self):
        self.handlers = {}
        self._lazy_imports = {}
        
    def register_handler(self, node_type: str, handler_func):
        """Register a handler function for a node type"""
        self.handlers[node_type] = handler_func
        
    def register_lazy_handler(self, node_type: str, module_path: str, function_name: str):
        """Register a handler that will be imported lazily"""
        self._lazy_imports[node_type] = (module_path, function_name)
        
    def _get_handler(self, node_type: str) -> Optional[Callable]:
        """Get handler with lazy loading support"""
        logger.info(f"🔍 Getting handler for node type: {node_type}")
        
        # Check if already loaded
        if node_type in self.handlers:
            logger.info(f"✅ Handler for {node_type} already loaded")
            return self.handlers[node_type]
            
        # Try lazy loading
        if node_type in self._lazy_imports:
            module_path, function_name = self._lazy_imports[node_type]
            logger.info(f"🔄 Lazy loading {node_type}: {module_path}.{function_name}")
            try:
                module = importlib.import_module(module_path)
                handler = getattr(module, function_name)
                # Cache the loaded handler
                self.handlers[node_type] = handler
                logger.info(f"✅ Successfully loaded handler for {node_type}")
                return handler
            except (ImportError, AttributeError) as e:
                logger.error(f"❌ Failed to lazy load handler for {node_type}: {e}")
                return None
        else:
            logger.warning(f"⚠️ No lazy import registered for node type: {node_type}")
                
        return None
    
    def _validate_node_inputs(self, inputs: Dict[str, Any]) -> Optional[str]:
        """Validate node inputs and return error if any"""
        for input_key, input_data in inputs.items():
            error = self._check_for_error(input_data)
            if error:
                return f"Previous node failed: {error}"
        return None
    
    def _check_for_error(self, input_data: Union[NodeData, Dict[str, Any]]) -> Optional[str]:
        """Check if input data represents an error"""
        if isinstance(input_data, NodeData):
            return input_data.error if input_data.is_error() else None
        elif isinstance(input_data, dict):
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
        context: Optional[Any] = None
    ) -> NodeData:
        """Process a node with enhanced error handling, validation, and framework compatibility checking"""
        node_id = node.get("id", "unknown")
        node_type = node.get("type") or node.get("nodeType")
        node_data = node.get("data", {})
        
        try:
            # Input validation
            if not node_type:
                return NodeData.from_error("Missing node type")
                
            # Check for input errors
            input_error = self._validate_node_inputs(inputs)
            if input_error:
                logger.error(f"Node {node_id}: {input_error}")
                return NodeData.from_error(input_error)
            
            # Get handler
            handler = self._get_handler(node_type)
            if not handler:
                return NodeData.from_error(f"No handler registered for node type: {node_type}")
            
            # Prepare inputs
            wrapped_inputs = {k: self._wrap_as_nodedata(v) for k, v in inputs.items()}
            
            # DEBUG: Log context information
            logger.info(f"🔍 Context debug for node {node_id}:")
            logger.info(f"   - Context type: {type(context)}")
            logger.info(f"   - Context is None: {context is None}")
            if context:
                logger.info(f"   - Context has 'get' method: {hasattr(context, 'get')}")
                logger.info(f"   - Context class name: {context.__class__.__name__}")
                logger.info(f"   - Context dir: {[attr for attr in dir(context) if not attr.startswith('_')]}")
            
            # Prepare execution context for node handlers
            # Check if context is a WorkflowExecutionContext by class name and methods
            if context and (
                (WorkflowExecutionContext and isinstance(context, WorkflowExecutionContext)) or
                context.__class__.__name__ == 'WorkflowExecutionContext' or 
                (hasattr(context, 'get') and hasattr(context, 'enhance_node_config') and hasattr(context, 'get_api_key_for_framework'))
            ):
                # It's a WorkflowExecutionContext, pass it directly
                logger.info(f"✅ Using WorkflowExecutionContext directly for node {node_id}")
                execution_context = context
            elif context:
                # It's some other context object, wrap it
                logger.info(f"⚠️ Wrapping unknown context type for node {node_id}: {type(context)}")
                execution_context = {
                    "workflow_execution_context": context,
                    "node_id": node_id,
                    "node_type": node_type,
                    "execution_timestamp": datetime.now().isoformat(),
                    "framework_registry": framework_registry
                }
            else:
                # No context provided, create basic one
                logger.info(f"📝 Creating basic context for node {node_id}")
                execution_context = {
                    "node_id": node_id,
                    "node_type": node_type,
                    "execution_timestamp": datetime.now().isoformat(),
                    "framework_registry": framework_registry
                }
            
            # Execute handler with timing
            start_time = datetime.now()
            logger.info(f"🚀 About to execute handler for {node_type} with inputs: {list(wrapped_inputs.keys())}")
            logger.info(f"🚀 Handler function: {handler}")
            logger.info(f"🚀 Node data keys: {list(node_data.keys())}")
            
            try:
                result = await handler(node_data, wrapped_inputs, execution_context)
                logger.info(f"🚀 Handler execution completed for {node_type}")
            except Exception as handler_error:
                logger.error(f"❌ Handler execution failed for {node_type}: {str(handler_error)}", exc_info=True)
                raise handler_error
                
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Log performance metrics
            logger.info(f"Node {node_id} ({node_type}) executed in {execution_time:.2f}s")
            
            # Ensure result is NodeData
            if not isinstance(result, NodeData):
                result = NodeData.from_value(result)
                
            # Add execution metadata to result
            if result.metadata is None:
                result.metadata = {}
            result.metadata.update({
                "execution_time": execution_time,
                "node_id": node_id,
                "node_type": node_type,
                "framework_used": node_data.get("framework") if node_data.get("framework") else None
            })
                
            return result
            
        except Exception as e:
            logger.error(f"Error processing node {node_id}: {str(e)}", exc_info=True)
            return NodeData.from_error(f"Node execution failed: {str(e)}")

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