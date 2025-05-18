# core/parallel_executor.py
import asyncio
from typing import Dict, Any, List, Set, Tuple
import logging
from datetime import datetime

from core.node_processor import process_node
from core.graph import get_dependencies, get_independent_nodes
from utils.backpressure import BackpressureManager

logger = logging.getLogger(__name__)

class ParallelExecutor:
    """Executes independent nodes in parallel"""
    
    def __init__(self, max_concurrency: int = 10, node_timeout: int = 300):
        self.max_concurrency = max_concurrency
        self.node_timeout = node_timeout  # Default timeout of 5 minutes
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.backpressure = BackpressureManager(max_concurrency)
        
    async def execute_wave(self, nodes: List[Dict], executed: Set[str], 
                          node_results: Dict[str, Any], inputs: Dict[str, Any]) -> List[Tuple[str, Any]]:
        """
        Execute a wave of independent nodes in parallel
        
        Args:
            nodes: List of nodes to consider
            executed: Set of already executed node IDs
            node_results: Results of previously executed nodes
            inputs: Global inputs
            
        Returns:
            List of (node_id, result) tuples
        """
        # Find independent nodes (nodes with all dependencies satisfied)
        independent_nodes = get_independent_nodes(nodes, executed)
        
        if not independent_nodes:
            return []
        
        logger.info(f"Executing wave of {len(independent_nodes)} independent nodes")
        
        # Apply backpressure if needed
        await self.backpressure.wait_for_capacity()
        
        # Create tasks for independent nodes
        tasks = []
        for node in independent_nodes:
            node_id = node["id"]
            # Get node inputs
            node_inputs = self._get_node_inputs(node_id, nodes, node_results, inputs)
            # Create task with timeout
            tasks.append(self._execute_node_with_timeout(node, node_inputs))
            
        # Execute all tasks in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_results = []
        for node, result in zip(independent_nodes, results):
            node_id = node["id"]
            
            # Handle timeouts and exceptions
            if isinstance(result, asyncio.TimeoutError):
                logger.error(f"Node {node_id} execution timed out")
                result = {
                    "type": "error",
                    "error": "Execution timed out",
                    "node_id": node_id
                }
            elif isinstance(result, Exception):
                logger.error(f"Error executing node {node_id}: {str(result)}")
                result = {
                    "type": "error",
                    "error": str(result),
                    "node_id": node_id
                }
                
            processed_results.append((node_id, result))
            
        return processed_results
        
    async def _execute_node_with_timeout(self, node: Dict, inputs: Dict[str, Any]) -> Any:
        """Execute a node with timeout"""
        try:
            async with self.semaphore:
                # Get node-specific timeout or use default
                timeout = node.get("timeout", self.node_timeout)
                
                # Execute with timeout
                async with asyncio.timeout(timeout):
                    result = await process_node(node, inputs)
                    
                # Update backpressure metrics
                await self.backpressure.record_execution(
                    node["id"],
                    result.get("execution_time", 0) if isinstance(result, dict) else 0
                )
                
                return result
                
        except asyncio.TimeoutError:
            logger.error(f"Node {node.get('id')} execution timed out after {timeout}s")
            return {
                "type": "error",
                "error": f"Execution timed out after {timeout}s",
                "node_id": node.get("id")
            }
        except Exception as e:
            logger.error(f"Error executing node {node.get('id')}: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "node_id": node.get("id")
            }
            
    def _get_node_inputs(self, node_id: str, nodes: List[Dict], 
                        node_results: Dict[str, Any], global_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Get inputs for a node from its dependencies"""
        inputs = dict(global_inputs)  # Start with global inputs
        
        # Get node's dependencies
        dependencies = get_dependencies(node_id, nodes)
        
        # Collect inputs from dependencies
        for dep_id in dependencies:
            if dep_id in node_results:
                dep_result = node_results[dep_id]
                
                # Handle different result formats
                if isinstance(dep_result, dict):
                    if "output" in dep_result:
                        inputs[f"input_from_{dep_id}"] = dep_result["output"]
                    elif "value" in dep_result:
                        inputs[f"input_from_{dep_id}"] = dep_result["value"]
                    elif "result" in dep_result:
                        inputs[f"input_from_{dep_id}"] = dep_result["result"]
                    else:
                        # Use entire result if no standard fields found
                        inputs[f"input_from_{dep_id}"] = dep_result
                else:
                    # For non-dict results, use as is
                    inputs[f"input_from_{dep_id}"] = dep_result
                    
        # Add node-specific configuration
        node = next((n for n in nodes if n["id"] == node_id), None)
        if node and "config" in node:
            inputs["config"] = node["config"]
            
        return inputs