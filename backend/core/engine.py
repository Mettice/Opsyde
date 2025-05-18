# core/engine.py
import asyncio
import logging
from typing import Dict, List, Any, AsyncGenerator, Optional, Set
from datetime import datetime
import json

from backend.models.workflow import Workflow
from backend.models.nodes import Node
from backend.core.graph import determine_execution_order, get_node_inputs
from backend.core.node_processor import node_processor
from backend.utils.logging import get_logger
from backend.core.di import injector

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
        """Execute a workflow and yield results"""
        try:
            # Get execution order
            execution_order = determine_execution_order(workflow.nodes, workflow.edges)
            
            # Create node lookup
            node_map = {node.id: node for node in workflow.nodes}
            
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
                
                # Process node
                try:
                    result = await node_processor.process_node(node, node_inputs)
                    self.node_results[node_id] = result
                    self.executed_nodes.add(node_id)
                    
                    yield {
                        "node_id": node_id,
                        "status": "completed",
                        "result": result,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                except Exception as e:
                    logger.error(f"Error executing node {node_id}: {str(e)}")
                    self.failed_nodes.add(node_id)
                    yield {
                        "node_id": node_id,
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }
                    
        except Exception as e:
            logger.error(f"Error executing workflow: {str(e)}")
            yield {
                "type": "error",
                "error": str(e),
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

# Create and register workflow engine instance
workflow_engine = WorkflowEngine()
injector.register_instance(WorkflowEngine, workflow_engine)