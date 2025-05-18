# core/execution_strategies.py
import asyncio
from typing import Protocol, Dict, Any, List, AsyncGenerator, Set
from abc import abstractmethod
from datetime import datetime

from core.node_processor import process_node
from core.graph import determine_execution_order, get_node_inputs
from utils.logging import get_logger

logger = get_logger(__name__)

class ExecutionStrategy(Protocol):
    """Protocol for node execution strategies"""
    
    @abstractmethod
    async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
        """Execute nodes according to the strategy"""
        pass

class SequentialStrategy:
    """Execute nodes sequentially according to dependencies"""
    
    def __init__(self):
        self.node_results = {}
        self.executed_nodes = set()
    
    async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
        """Execute nodes in sequential order"""
        try:
            # Get execution order
            execution_order = determine_execution_order(nodes, edges)
            
            # Create node lookup
            node_map = {node["id"]: node for node in nodes}
            
            for node_id in execution_order:
                if node_id in self.executed_nodes:
                    continue
                    
                node = node_map.get(node_id)
                if not node:
                    continue
                
                # Get node inputs
                node_inputs = get_node_inputs(node_id, edges, self.node_results, inputs)
                
                # Execute node
                try:
                    result = await process_node(node, node_inputs)
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
                    yield {
                        "node_id": node_id,
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }
                    
        except Exception as e:
            logger.error(f"Error in sequential execution: {str(e)}")
            yield {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

class ParallelStrategy:
    """Execute independent nodes in parallel"""
    
    def __init__(self, max_concurrency: int = 10):
        self.max_concurrency = max_concurrency
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.node_results = {}
        self.executed_nodes = set()
    
    async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
        """Execute nodes in parallel waves"""
        try:
            while len(self.executed_nodes) < len(nodes):
                # Get next wave of independent nodes
                wave = self._get_next_wave(nodes, edges)
                if not wave:
                    break
                    
                # Execute wave in parallel
                tasks = []
                for node in wave:
                    node_id = node["id"]
                    node_inputs = get_node_inputs(node_id, edges, self.node_results, inputs)
                    tasks.append(self._execute_node(node, node_inputs))
                    
                # Wait for all tasks in wave
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                for node, result in zip(wave, results):
                    node_id = node["id"]
                    
                    if isinstance(result, Exception):
                        yield {
                            "node_id": node_id,
                            "status": "error",
                            "error": str(result),
                            "timestamp": datetime.now().isoformat()
                        }
                    else:
                        self.node_results[node_id] = result
                        self.executed_nodes.add(node_id)
                        yield {
                            "node_id": node_id,
                            "status": "completed",
                            "result": result,
                            "timestamp": datetime.now().isoformat()
                        }
                        
        except Exception as e:
            logger.error(f"Error in parallel execution: {str(e)}")
            yield {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _get_next_wave(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
        """Get next wave of independent nodes"""
        wave = []
        for node in nodes:
            node_id = node["id"]
            if node_id in self.executed_nodes:
                continue
                
            # Check if all dependencies are satisfied
            dependencies = set()
            for edge in edges:
                if edge["target"] == node_id:
                    dependencies.add(edge["source"])
                    
            if all(dep in self.executed_nodes for dep in dependencies):
                wave.append(node)
                
            if len(wave) >= self.max_concurrency:
                break
                
        return wave
    
    async def _execute_node(self, node: Dict, inputs: Dict[str, Any]) -> Any:
        """Execute a single node with concurrency control"""
        async with self.semaphore:
            return await process_node(node, inputs)

class HybridStrategy:
    """
    Combines sequential and parallel execution based on node properties
    and runtime conditions
    """
    
    def __init__(self, max_concurrency: int = 10):
        self.sequential = SequentialStrategy()
        self.parallel = ParallelStrategy(max_concurrency)
        self.node_results = {}
        self.executed_nodes = set()
    
    async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
        """Execute nodes using hybrid strategy"""
        try:
            # Group nodes by execution mode
            sequential_nodes = []
            parallel_nodes = []
            
            for node in nodes:
                if self._should_execute_sequentially(node):
                    sequential_nodes.append(node)
                else:
                    parallel_nodes.append(node)
            
            # Execute sequential nodes first
            async for result in self.sequential.execute(sequential_nodes, edges, inputs):
                self.node_results.update(self.sequential.node_results)
                self.executed_nodes.update(self.sequential.executed_nodes)
                yield result
            
            # Then execute parallel nodes
            async for result in self.parallel.execute(parallel_nodes, edges, inputs):
                self.node_results.update(self.parallel.node_results)
                self.executed_nodes.update(self.parallel.executed_nodes)
                yield result
                
        except Exception as e:
            logger.error(f"Error in hybrid execution: {str(e)}")
            yield {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _should_execute_sequentially(self, node: Dict) -> bool:
        """Determine if a node should be executed sequentially"""
        # Nodes that should always be sequential:
        # 1. Nodes with side effects
        # 2. Nodes that modify shared state
        # 3. Nodes marked as sequential
        node_type = node.get("type", "").lower()
        return (
            node_type in ["output", "database", "state"] or
            node.get("execution_mode") == "sequential" or
            node.get("has_side_effects", False)
        )