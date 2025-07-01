# core/engine.py
import asyncio
import logging
from typing import Dict, List, Any, AsyncGenerator, Optional, Set
from datetime import datetime
import json

from models.workflow import Workflow
from models.nodes import Node
from core.graph import determine_execution_order, get_node_inputs
from core.node_processor import node_processor
from utils.logging import get_logger
from core.di import injector

# NEW: Import framework validation
from framework_registry import framework_registry, validate_framework_llm_combination

logger = get_logger(__name__)

# Configurable constants
MAX_RESULTS_SIZE = 100  # Maximum number of results to keep
CLEANUP_THRESHOLD = 80  # Cleanup when we reach 80% of max size

class WorkflowEngine:
    """
    Handles the execution of workflow nodes based on their dependencies.
    """
    
    def __init__(self):
        self.node_results = {}
        self.executed_nodes = set()
        self.failed_nodes = set()
        self.max_retries = 3
        
    async def execute_workflow(self, workflow: Workflow, inputs: Dict[str, Any] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute a workflow with framework validation and enhanced error handling"""
        try:
            # NEW: Pre-execution framework validation
            validation_errors = await self._validate_workflow_frameworks(workflow)
            if validation_errors:
                yield {
                    "type": "validation_error",
                    "errors": validation_errors,
                    "timestamp": datetime.now().isoformat()
                }
                return
            
            # Get execution order
            execution_order = determine_execution_order(workflow.nodes, workflow.edges)
            
            # Create node lookup
            node_map = {node.id: node for node in workflow.nodes}
            
            # Yield workflow start event
            yield {
                "type": "workflow_started",
                "workflow_id": workflow.id,
                "node_count": len(workflow.nodes),
                "execution_order": execution_order,
                "timestamp": datetime.now().isoformat()
            }
            
            for node_id in execution_order:
                if node_id in self.executed_nodes:
                    continue
                    
                node = node_map.get(node_id)
                if not node:
                    continue
                
                # Clean up results if needed
                if len(self.node_results) >= CLEANUP_THRESHOLD:
                    self._cleanup_node_results(workflow.edges)
                
                # Get node inputs
                node_inputs = get_node_inputs(node_id, workflow.edges, self.node_results, inputs or {})
                
                # Yield node start event
                yield {
                    "type": "node_started",
                    "node_id": node_id,
                    "node_type": node.type,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Process node
                try:
                    start_time = datetime.now()
                    
                    # Create execution context with framework registry access and LLM support
                    context = {
                        "workflow_id": workflow.id,
                        "execution_order": execution_order,
                        "framework_registry": framework_registry,
                        # Auto-inject LLM context
                        "llm_mode_enabled": inputs.get("llm_mode_enabled", True),
                        "smart_mapping_enabled": inputs.get("smart_mapping_enabled", True),
                        "user_keys": inputs.get("user_keys", {}),
                        # Support multimodal processing
                        "multimodal_support": True,
                        "output_formatting": True
                    }
                    
                    # Check if this is a multimodal input
                    if self._has_multimodal_input(node_inputs):
                        logger.info(f"🎯 Multimodal input detected for node {node_id}")
                        # Process multimodal inputs first
                        processed_inputs = await self._process_multimodal_inputs(node_inputs, context)
                        result = await node_processor.process_node(node.dict(), processed_inputs, context)
                    else:
                        result = await node_processor.process_node(node.dict(), node_inputs, context)
                    
                    execution_time = (datetime.now() - start_time).total_seconds()
                    
                    # Store result with enhanced metadata and output formatting
                    enhanced_result = self._enhance_result_metadata(result, node, execution_time)
                    
                    # Apply output formatting based on result type
                    formatted_result = self._format_output_by_type(enhanced_result, node)
                    
                    self.node_results[node_id] = formatted_result
                    self.executed_nodes.add(node_id)
                    
                    yield {
                        "type": "node_completed",
                        "node_id": node_id,
                        "node_type": node.type,
                        "status": "completed",
                        "result": formatted_result,
                        "execution_time": execution_time,
                        "format_type": formatted_result.get("format_type", "json"),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                except Exception as e:
                    logger.error(f"Error executing node {node_id}: {str(e)}")
                    self.failed_nodes.add(node_id)
                    
                    # Enhanced error information
                    error_info = {
                        "type": "node_error",
                        "node_id": node_id,
                        "node_type": node.type,
                        "status": "error",
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Add framework context if applicable
                    if hasattr(node, 'data') and node.data.get('framework'):
                        error_info["framework"] = node.data.get('framework')
                        error_info["framework_available"] = node.data.get('framework') in framework_registry.get_available_frameworks()
                    
                    yield error_info
            
            # Yield workflow completion event
            yield {
                "type": "workflow_completed",
                "workflow_id": workflow.id,
                "total_nodes": len(workflow.nodes),
                "executed_nodes": len(self.executed_nodes),
                "failed_nodes": len(self.failed_nodes),
                "success_rate": len(self.executed_nodes) / len(workflow.nodes) if workflow.nodes else 0,
                "timestamp": datetime.now().isoformat()
            }
                    
        except Exception as e:
            logger.error(f"Error executing workflow: {str(e)}")
            yield {
                "type": "workflow_error",
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.now().isoformat()
            }
            
    def _cleanup_node_results(self, edges: List[Dict]) -> None:
        """Clean up node results that are no longer needed"""
        to_remove = set()
        
        for node_id in self.node_results:
            if node_id in self.executed_nodes:
                # Get nodes that depend on this one
                downstream = set()
                for edge in edges:
                    if edge["source"] == node_id:
                        downstream.add(edge["target"])
                
                # If all downstream nodes are executed, we can remove this result
                if all(dep in self.executed_nodes for dep in downstream):
                    to_remove.add(node_id)
        
        # Remove the results
        for node_id in to_remove:
            del self.node_results[node_id]
            
    def _cleanup_upstream_nodes(self, node_id: str, edges: List[Dict]) -> None:
        """Clean up results of upstream nodes that are no longer needed"""
        upstream = set()
        for edge in edges:
            if edge["target"] == node_id:
                upstream.add(edge["source"])
                
        for upstream_id in upstream:
            if upstream_id in self.node_results:
                # Check if this upstream result is needed by any other unexecuted nodes
                other_dependents = any(
                    edge["source"] == upstream_id and 
                    edge["target"] not in self.executed_nodes 
                    for edge in edges
                )
                if not other_dependents:
                    del self.node_results[upstream_id]
    
    def _validate_node_config(self, node: Dict) -> bool:
        """Validate node configuration"""
        required_fields = ["id", "type"]
        return all(field in node for field in required_fields)

    async def _validate_workflow_frameworks(self, workflow: Workflow) -> List[str]:
        """Validate all frameworks in the workflow"""
        errors = []
        available_frameworks = framework_registry.get_available_frameworks()
        
        for node in workflow.nodes:
            node_data = node.data if hasattr(node, 'data') else {}
            framework = node_data.get('framework')
            
            if framework:
                # Check if framework is available
                if framework not in available_frameworks:
                    errors.append(f"Node {node.id}: Framework '{framework}' is not available")
                    continue
                
                # Validate framework/LLM combination
                llm_config = node_data.get('frameworkConfig', {})
                llm_provider = llm_config.get('provider') or node_data.get('llmProvider')
                
                if llm_provider:
                    validation = validate_framework_llm_combination(framework, llm_provider)
                    if not validation["valid"]:
                        errors.append(f"Node {node.id}: {validation['error']}")
        
        return errors

    def _enhance_result_metadata(self, result: Any, node: Node, execution_time: float) -> Dict:
        """Enhance result metadata with execution information"""
        if hasattr(result, 'dict'):
            enhanced_result = result.dict()
        elif isinstance(result, dict):
            enhanced_result = result.copy()
        else:
            enhanced_result = {"value": result}
        
        # Add execution metadata
        if "metadata" not in enhanced_result:
            enhanced_result["metadata"] = {}
        
        enhanced_result["metadata"].update({
            "execution_time": execution_time,
            "node_id": node.id,
            "node_type": node.type,
            "framework_used": node.data.get('framework') if hasattr(node, 'data') else None,
            "timestamp": datetime.now().isoformat()
        })
        
        return enhanced_result

    def _format_output_by_type(self, result: Dict, node: Node) -> Dict:
        """Apply output formatting based on result type"""
        if hasattr(result, 'dict'):
            formatted_result = result.dict()
        elif isinstance(result, dict):
            formatted_result = result.copy()
        else:
            formatted_result = {"value": result}
        
        # Add format type
        formatted_result["format_type"] = node.data.get('format_type', 'json')
        
        return formatted_result

    def _has_multimodal_input(self, node_inputs: Dict) -> bool:
        """Check if the node inputs are multimodal"""
        return any(isinstance(value, dict) for value in node_inputs.values())

    async def _process_multimodal_inputs(self, node_inputs: Dict, context: Dict) -> Dict:
        """Process multimodal inputs"""
        processed_inputs = {}
        for key, value in node_inputs.items():
            if isinstance(value, dict):
                processed_inputs[key] = value
            else:
                processed_inputs[key] = value
        
        return processed_inputs

# Create and register workflow engine instance
workflow_engine = WorkflowEngine()
injector.register_instance(WorkflowEngine, workflow_engine)