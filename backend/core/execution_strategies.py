"""
Execution Strategies
====================

Currently, only SequentialStrategy is used for workflow execution (MVP reliability).
Other strategies (ParallelStrategy, HybridStrategy, LLMCentricStrategy) are kept in the codebase for future use and advanced features, but are NOT active.

- SequentialStrategy: Runs nodes one after another, in dependency order (default, reliable, easy to debug).
- ParallelStrategy: (Commented out) For future parallel execution support.
- HybridStrategy: (Commented out) For future mixed sequential/parallel execution.
- LLMCentricStrategy: (Commented out) For future AI-native, LLM-driven execution and smart mapping.
"""

# core/execution_strategies.py
import asyncio
from typing import Protocol, Dict, Any, List, AsyncGenerator, Set, Optional
from abc import abstractmethod
from datetime import datetime

from core.node_processor import node_processor
from core.graph import determine_execution_order, get_node_inputs
from utils.logging import get_logger
from core.llm_runner import LLMRunner

logger = get_logger(__name__)

class ExecutionStrategy(Protocol):
    """Protocol for node execution strategies"""
    
    @abstractmethod
    async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
        """Execute nodes according to the strategy"""
        pass

class BaseExecutionStrategy:
    """Base class for execution strategies with common functionality"""
    
    def __init__(self, max_concurrency: int = 10, timeout: int = 300):
        self.max_concurrency = max_concurrency
        self.timeout = timeout
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.node_results = {}
        self.executed_nodes = set()
        self.node_processor = node_processor
        self.logger = get_logger(__name__)

    async def _execute_node_with_timeout(
        self,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a single node with timeout and error handling"""
        node_id = node.get("id", "unknown")
        start_time = datetime.now()

        try:
            async with self.semaphore:
                # Get node-specific timeout
                node_timeout = node.get("timeout", self.timeout)
                
                # Execute with timeout
                async with asyncio.timeout(node_timeout):
                    result = await self.node_processor.process_node(node, inputs, context)
                    
                    # Record execution metrics
                    execution_time = (datetime.now() - start_time).total_seconds()
                    self._record_execution_metrics(node_id, execution_time, not result.is_error())
                    
                    return {
                        "node_id": node_id,
                        "status": "completed" if not result.is_error() else "error",
                        "result": result,
                        "execution_time": execution_time,
                        "timestamp": datetime.now().isoformat()
                    }

        except asyncio.TimeoutError:
            self.logger.error(f"Node {node_id} execution timed out after {node_timeout}s")
            return {
                "node_id": node_id,
                "status": "timeout",
                "error": f"Execution timed out after {node_timeout}s",
                "execution_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error executing node {node_id}: {str(e)}")
            return {
                "node_id": node_id,
                "status": "error",
                "error": str(e),
                "execution_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }

    def _record_execution_metrics(self, node_id: str, execution_time: float, success: bool):
        """Record execution metrics for a node"""
        if node_id not in self.node_results:
            self.node_results[node_id] = {
                "executions": 0,
                "successes": 0,
                "failures": 0,
                "total_time": 0,
                "avg_time": 0
            }
            
        metrics = self.node_results[node_id]
        metrics["executions"] += 1
        metrics["total_time"] += execution_time
        metrics["avg_time"] = metrics["total_time"] / metrics["executions"]
        
        if success:
            metrics["successes"] += 1
        else:
            metrics["failures"] += 1

    def _get_node_inputs(self, node_id: str, edges: List[Dict], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Get inputs for a node based on edges and previous results"""
        node_inputs = {}
        
        # Add workflow inputs
        node_inputs.update(inputs)
        
        # Add results from previous nodes
        for edge in edges:
            if edge.get("target") == node_id:
                source_id = edge.get("source")
                if source_id in self.node_results:
                    source_result = self.node_results[source_id]
                    if source_result.get("status") == "completed":
                        node_inputs[edge.get("sourceHandle", "output")] = source_result.get("result")
        
        return node_inputs

class SequentialStrategy(BaseExecutionStrategy):
    """Execute nodes sequentially according to dependencies"""
    
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
                node_inputs = self._get_node_inputs(node_id, edges, inputs)
                
                # Execute node
                result = await self._execute_node_with_timeout(node, node_inputs)
                self.node_results[node_id] = result
                self.executed_nodes.add(node_id)
                
                yield result
                
        except Exception as e:
            self.logger.error(f"Sequential execution failed: {str(e)}")
            yield {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
# --- The following strategies are commented out for MVP reliability ---

# class ParallelStrategy(BaseExecutionStrategy):
#     """Execute independent nodes in parallel (NOT USED in MVP)"""
#     
#     async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
#         """Execute independent nodes in parallel"""
#         try:
#             while True:
#                 # Find independent nodes
#                 independent_nodes = self._get_independent_nodes(nodes, edges)
#                 if not independent_nodes:
#                     break
#                 
#                 # Execute independent nodes in parallel
#                 tasks = []
#                 for node in independent_nodes:
#                     node_id = node["id"]
#                     node_inputs = self._get_node_inputs(node_id, edges, inputs)
#                     tasks.append(self._execute_node_with_timeout(node, node_inputs))
#                 
#                 # Wait for all tasks to complete
#                 results = await asyncio.gather(*tasks, return_exceptions=True)
#                 
#                 # Process results
#                 for node, result in zip(independent_nodes, results):
#                     node_id = node["id"]
#                     if isinstance(result, Exception):
#                         result = {
#                             "node_id": node_id,
#                             "status": "error",
#                             "error": str(result),
#                             "timestamp": datetime.now().isoformat()
#                         }
#                     
#                     self.node_results[node_id] = result
#                     self.executed_nodes.add(node_id)
#                     yield result
#                 
#         except Exception as e:
#             self.logger.error(f"Parallel execution failed: {str(e)}")
#             yield {
#                 "status": "error",
#                 "error": str(e),
#                 "timestamp": datetime.now().isoformat()
#             }
#     
#     def _get_independent_nodes(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
#         """Find nodes that can be executed in parallel"""
#         independent_nodes = []
#         for node in nodes:
#             node_id = node["id"]
#             if node_id in self.executed_nodes:
#                 continue
#                 
#             # Check if all dependencies are satisfied
#             dependencies = [edge["source"] for edge in edges if edge["target"] == node_id]
#             if all(dep in self.executed_nodes for dep in dependencies):
#                 independent_nodes.append(node)
#                 
#         return independent_nodes

# class HybridStrategy(BaseExecutionStrategy):
#     """Execute nodes using a hybrid approach (NOT USED in MVP)"""
#     
#     def __init__(self, max_concurrency: int = 10, timeout: int = 300):
#         super().__init__(max_concurrency, timeout)
#         self.sequential_strategy = SequentialStrategy(max_concurrency, timeout)
#         self.parallel_strategy = ParallelStrategy(max_concurrency, timeout)
#     
#     async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
#         """Execute nodes using hybrid strategy"""
#         try:
#             # Group nodes by execution strategy
#             sequential_nodes = []
#             parallel_nodes = []
#             
#             for node in nodes:
#                 if self._should_execute_sequentially(node):
#                     sequential_nodes.append(node)
#                 else:
#                     parallel_nodes.append(node)
#             
#             # Execute sequential nodes first
#             async for result in self.sequential_strategy.execute(sequential_nodes, edges, inputs):
#                 yield result
#             
#             # Execute parallel nodes
#             async for result in self.parallel_strategy.execute(parallel_nodes, edges, inputs):
#                 yield result
#                 
#         except Exception as e:
#             self.logger.error(f"Hybrid execution failed: {str(e)}")
#             yield {
#                 "status": "error",
#                 "error": str(e),
#                 "timestamp": datetime.now().isoformat()
#             }
#     
#     def _should_execute_sequentially(self, node: Dict[str, Any]) -> bool:
#         """Determine if a node should be executed sequentially"""
#         node_type = node.get("type")
#         node_data = node.get("data", {})
#         
#         # Always execute these types sequentially
#         sequential_types = {"input", "output", "trigger", "delay"}
#         if node_type in sequential_types:
#             return True
#             
#         # Check node configuration
#         if node_data.get("sequential", False):
#             return True
#             
#         # Check for LLM dependencies
#         if node_data.get("framework") in {"openai", "anthropic", "huggingface"}:
#             return True
#             
#         return False

# class LLMCentricStrategy:
#     """LLM-Centric execution strategy (NOT USED in MVP)"""
#     
#     def __init__(self, max_concurrency: int = 5, enable_streaming: bool = True):
#         self.max_concurrency = max_concurrency
#         self.enable_streaming = enable_streaming
#         self.semaphore = asyncio.Semaphore(max_concurrency)
#         self.node_results = {}
#         self.executed_nodes = set()
#         self.llm_context = {}
#         self.smart_mapping_cache = {}
#         self.llm_runner = LLMRunner()
#         
#     async def execute(self, nodes: List[Dict], edges: List[Dict], inputs: Dict[str, Any]) -> AsyncGenerator[Dict, None]:
#         """Execute nodes with LLM-centric processing"""
#         try:
#             logger.info("🧠 Starting LLM-centric workflow execution")
#             
#             # Initialize LLM context
#             self.llm_context = inputs.get("execution_context", {})
#             user_keys = inputs.get("user_keys", {})
#             
#             yield {
#                 "type": "workflow_start",
#                 "status": "initializing",
#                 "message": "Initializing LLM-centric execution",
#                 "timestamp": datetime.now().isoformat(),
#                 "metadata": {
#                     "strategy": "llm_centric",
#                     "total_nodes": len(nodes),
#                     "llm_mode_enabled": True,
#                     "smart_mapping_enabled": inputs.get("smart_mapping_enabled", True)
#                 }
#             }
#             
#             # Get execution order with LLM optimization
#             execution_order = await self._get_llm_optimized_execution_order(nodes, edges, inputs)
#             
#             # Create enhanced node lookup with LLM context
#             node_map = {node["id"]: self._enhance_node_with_llm_context(node, inputs) for node in nodes}
#             
#             # Execute nodes with LLM processing
#             for node_id in execution_order:
#                 if node_id in self.executed_nodes:
#                     continue
#                     
#                 node = node_map.get(node_id)
#                 if not node:
#                     continue
#                 
#                 # Yield node start event
#                 yield {
#                     "type": "node_start",
#                     "node_id": node_id,
#                     "node_type": node.get("type"),
#                     "status": "starting",
#                     "timestamp": datetime.now().isoformat(),
#                     "metadata": {
#                         "llm_processing": True,
#                         "smart_mapping_enabled": True
#                     }
#                 }
#                 
#                 # Get enhanced node inputs with smart mapping
#                 node_inputs = await self._get_smart_mapped_inputs(
#                     node_id, edges, self.node_results, inputs, node
#                 )
#                 
#                 # Execute node with LLM processing
#                 try:
#                     async for update in self._execute_node_with_llm(node, node_inputs, user_keys):
#                         yield update
#                         
#                         # Store result if node completed
#                         if update.get("status") == "completed":
#                             self.node_results[node_id] = update.get("result")
#                             self.executed_nodes.add(node_id)
#                             
#                 except Exception as e:
#                     logger.error(f"❌ LLM execution failed for node {node_id}: {str(e)}")
#                     yield {
#                         "type": "node_error",
#                         "node_id": node_id,
#                         "status": "error",
#                         "error": str(e),
#                         "timestamp": datetime.now().isoformat(),
#                         "metadata": {
#                             "llm_processing": True,
#                             "error_type": type(e).__name__
#                         }
#                     }
#             
#             # Workflow completion
#             yield {
#                 "type": "workflow_complete",
#                 "status": "completed",
#                 "message": "LLM-centric execution completed successfully",
#                 "timestamp": datetime.now().isoformat(),
#                 "metadata": {
#                     "total_nodes_executed": len(self.executed_nodes),
#                     "execution_strategy": "llm_centric",
#                     "smart_mapping_applied": len(self.smart_mapping_cache)
#                 }
#             }
#             
#         except Exception as e:
#             logger.error(f"❌ LLM-centric execution failed: {str(e)}")
#             yield {
#                 "type": "workflow_error",
#                 "status": "error",
#                 "error": str(e),
#                 "timestamp": datetime.now().isoformat(),
#                 "metadata": {
#                     "strategy": "llm_centric",
#                     "error_type": type(e).__name__
#                 }
#             }
#     
#     async def _get_llm_optimized_execution_order(
#         self, 
#         nodes: List[Dict], 
#         edges: List[Dict], 
#         inputs: Dict[str, Any]
#     ) -> List[str]:
#         """Get execution order optimized by LLM analysis"""
#         try:
#             # Start with standard topological order
#             base_order = determine_execution_order(nodes, edges)
#             
#             # If LLM optimization is disabled, return base order
#             if not inputs.get("enable_llm_optimization", True):
#                 return base_order
#             
#             # Use LLM to analyze and optimize execution order
#             logger.info("🧠 Analyzing workflow with LLM for optimal execution order...")
#             
#             # Prepare workflow analysis data for LLM
#             workflow_analysis_data = {
#                 "nodes": [
#                     {
#                         "id": node["id"],
#                         "type": node.get("type", "unknown"),
#                         "dependencies": [edge["source"] for edge in edges if edge["target"] == node["id"]],
#                         "outputs_to": [edge["target"] for edge in edges if edge["source"] == node["id"]],
#                         "estimated_complexity": self._estimate_node_complexity(node),
#                         "resource_requirements": self._get_node_resource_requirements(node),
#                         "can_parallelize": self._can_node_parallelize(node)
#                     }
#                     for node in nodes
#                 ],
#                 "base_execution_order": base_order,
#                 "total_nodes": len(nodes),
#                 "workflow_context": inputs.get("workflow_context", {})
#             }
#             
#             # Get LLM optimization
#             llm_result = await self.llm_runner.execute_llm_task(
#                 task_type="execution_order_optimization",
#                 input_data=workflow_analysis_data,
#                 context={"optimization_goal": "minimize_execution_time"},
#                 user_id=inputs.get("user_id", "anonymous")
#             )
#             
#             if llm_result.get("success") and llm_result.get("optimized_order"):
#                 optimized_order = llm_result["optimized_order"]
#                 
#                 # Validate the optimized order maintains dependencies
#                 if self._validate_execution_order(optimized_order, nodes, edges):
#                     logger.info(f"🧠 LLM-optimized execution order applied: {optimized_order}")
#                     logger.info(f"📊 Optimization reasoning: {llm_result.get('reasoning', 'No reasoning provided')}")
#                     return optimized_order
#                 else:
#                     logger.warning("⚠️ LLM-optimized order violates dependencies, using base order")
#                     return base_order
#             else:
#                 logger.warning(f"⚠️ LLM optimization failed: {llm_result.get('error', 'Unknown error')}")
#                 return base_order
#             
#         except Exception as e:
#             logger.warning(f"⚠️ LLM optimization failed, using standard order: {str(e)}")
#             return determine_execution_order(nodes, edges)
#     
#     def _estimate_node_complexity(self, node: Dict) -> str:
#         """Estimate computational complexity of a node"""
#         node_type = node.get("type", "").lower()
#         
#         complexity_map = {
#             "input": "low",
#             "output": "low", 
#             "delay": "low",
#             "logic": "medium",
#             "tool": "medium",
#             "chat": "high",
#             "task": "high",
#             "agent": "very_high"
#         }
#         
#         return complexity_map.get(node_type, "medium")
#     
#     def _get_node_resource_requirements(self, node: Dict) -> Dict[str, str]:
#         """Get resource requirements for a node"""
#         node_type = node.get("type", "").lower()
#         
#         # Analyze node configuration for resource hints
#         requires_llm = node_type in ["chat", "task", "agent", "input"]
#         requires_api = node_type in ["tool", "output"]
#         requires_computation = node_type in ["logic", "agent"]
#         
#         return {
#             "llm_tokens": "high" if requires_llm else "none",
#             "api_calls": "medium" if requires_api else "none", 
#             "computation": "high" if requires_computation else "low",
#             "memory": "medium" if node_type == "agent" else "low"
#         }
#     
#     def _can_node_parallelize(self, node: Dict) -> bool:
#         """Determine if a node can be executed in parallel"""
#         node_type = node.get("type", "").lower()
#         
#         # Nodes that typically can't be parallelized
#         sequential_nodes = ["output", "delay"]
#         
#         # Check for explicit parallelization settings
#         if node.get("execution_mode") == "sequential":
#             return False
#             
#         return node_type not in sequential_nodes
#     
#     def _validate_execution_order(self, order: List[str], nodes: List[Dict], edges: List[Dict]) -> bool:
#         """Validate that execution order respects dependencies"""
#         try:
#             executed = set()
#             
#             for node_id in order:
#                 # Check all dependencies are satisfied
#                 dependencies = {edge["source"] for edge in edges if edge["target"] == node_id}
#                 
#                 if not dependencies.issubset(executed):
#                     logger.warning(f"❌ Node {node_id} has unsatisfied dependencies: {dependencies - executed}")
#                     return False
#                     
#                 executed.add(node_id)
#             
#             return True
#             
#         except Exception as e:
#             logger.error(f"❌ Error validating execution order: {str(e)}")
#             return False
#     
#     def _enhance_node_with_llm_context(self, node: Dict, inputs: Dict[str, Any]) -> Dict:
#         """Enhance node with LLM context and capabilities"""
#         enhanced_node = node.copy()
#         
#         # Add LLM context
#         enhanced_node["llm_context"] = {
#             "llm_mode_enabled": True,
#             "smart_mapping_enabled": inputs.get("smart_mapping_enabled", True),
#             "enable_multimodal": inputs.get("enable_multimodal", True),
#             "user_keys": inputs.get("user_keys", {}),
#             "execution_timestamp": datetime.now().isoformat()
#         }
#         
#         # Add framework routing information
#         node_type = node.get("type", "").lower()
#         enhanced_node["framework_routing"] = self._get_framework_routing(node_type, node)
#         
#         return enhanced_node
#     
#     def _get_framework_routing(self, node_type: str, node: Dict) -> Dict:
#         """Determine framework routing for node type"""
#         routing_map = {
#             "chat": {"framework": "openai", "requires_llm": True},
#             "task": {"framework": "crewai", "requires_llm": True},
#             "agent": {"framework": "crewai", "requires_llm": True},
#             "tool": {"framework": "universal_api", "requires_llm": False},
#             "input": {"framework": "multimodal", "requires_llm": True},
#             "output": {"framework": "smart_output", "requires_llm": True},
#             "logic": {"framework": "llm_logic", "requires_llm": True},
#             "delay": {"framework": "standard", "requires_llm": False}
#         }
#         
#         default_routing = {"framework": "standard", "requires_llm": False}
#         return routing_map.get(node_type, default_routing)
#     
#     async def _get_smart_mapped_inputs(
#         self,
#         node_id: str,
#         edges: List[Dict],
#         node_results: Dict,
#         workflow_inputs: Dict,
#         node: Dict
#     ) -> Dict[str, Any]:
#         """Get inputs with smart mapping applied"""
#         try:
#             # Get base inputs
#             base_inputs = get_node_inputs(node_id, edges, node_results, workflow_inputs)
#             
#             # Check if smart mapping is enabled
#             if not node.get("llm_context", {}).get("smart_mapping_enabled", True):
#                 return base_inputs
#             
#             # Apply smart mapping if we have previous results to map from
#             if node_results and len(node_results) > 0:
#                 mapped_inputs = await self._apply_smart_mapping(
#                     node_id, base_inputs, node_results, node
#                 )
#                 
#                 # Cache the mapping for future use
#                 self.smart_mapping_cache[node_id] = {
#                     "original_inputs": base_inputs,
#                     "mapped_inputs": mapped_inputs,
#                     "timestamp": datetime.now().isoformat()
#                 }
#                 
#                 return mapped_inputs
#             
#             return base_inputs
#             
#         except Exception as e:
#             logger.warning(f"⚠️ Smart mapping failed for node {node_id}: {str(e)}")
#             return get_node_inputs(node_id, edges, node_results, workflow_inputs)
#     
#     async def _apply_smart_mapping(
#         self,
#         node_id: str,
#         base_inputs: Dict,
#         previous_results: Dict,
#         node: Dict
#     ) -> Dict[str, Any]:
#         """Apply LLM-powered smart mapping to transform inputs"""
#         try:
#             logger.info(f"🧠 Applying LLM-powered smart mapping for node {node_id}")
#             
#             # Prepare smart mapping analysis data
#             mapping_data = {
#                 "target_node": {
#                     "id": node_id,
#                     "type": node.get("type", "unknown"),
#                     "expected_inputs": self._get_node_expected_inputs(node),
#                     "current_inputs": base_inputs
#                 },
#                 "available_data": {
#                     "previous_results": previous_results,
#                     "workflow_context": base_inputs.get("workflow_context", {}),
#                     "user_inputs": base_inputs.get("user_inputs", {})
#                 },
#                 "mapping_context": {
#                     "node_position": len(previous_results),
#                     "total_nodes": base_inputs.get("total_nodes", 1),
#                     "execution_strategy": "llm_centric"
#                 }
#             }
#             
#             # Use LLM to perform intelligent mapping
#             llm_result = await self.llm_runner.execute_llm_task(
#                 task_type="smart_input_mapping",
#                 input_data=mapping_data,
#                 context={"mapping_goal": "optimize_data_flow"},
#                 user_id=base_inputs.get("user_id", "anonymous")
#             )
#             
#             if llm_result.get("success") and llm_result.get("mapped_inputs"):
#                 mapped_inputs = llm_result["mapped_inputs"]
#                 
#                 # Merge with base inputs, preserving essential metadata
#                 enhanced_inputs = {
#                     **base_inputs,
#                     **mapped_inputs,
#                     "_smart_mapping_applied": True,
#                     "_mapping_timestamp": datetime.now().isoformat(),
#                     "_previous_results_count": len(previous_results),
#                     "_mapping_confidence": llm_result.get("confidence", 0.8),
#                     "_mapping_reasoning": llm_result.get("reasoning", "LLM-based smart mapping applied")
#                 }
#                 
#                 logger.info(f"✨ Smart mapping applied with confidence: {llm_result.get('confidence', 0.8)}")
#                 logger.debug(f"🔍 Mapping reasoning: {llm_result.get('reasoning', 'No reasoning provided')}")
#                 
#                 return enhanced_inputs
#             else:
#                 logger.warning(f"⚠️ Smart mapping failed: {llm_result.get('error', 'Unknown error')}")
#                 # Return enhanced inputs with metadata even if mapping failed
#                 enhanced_inputs = base_inputs.copy()
#                 enhanced_inputs["_smart_mapping_applied"] = False
#                 enhanced_inputs["_mapping_timestamp"] = datetime.now().isoformat()
#                 enhanced_inputs["_previous_results_count"] = len(previous_results)
#                 enhanced_inputs["_mapping_error"] = llm_result.get('error', 'Smart mapping failed')
#                 
#                 return enhanced_inputs
#             
#         except Exception as e:
#             logger.warning(f"⚠️ Smart mapping application failed: {str(e)}")
#             # Return base inputs with error metadata
#             enhanced_inputs = base_inputs.copy()
#             enhanced_inputs["_smart_mapping_applied"] = False
#             enhanced_inputs["_mapping_error"] = str(e)
#             enhanced_inputs["_mapping_timestamp"] = datetime.now().isoformat()
#             return enhanced_inputs
#     
#     def _get_node_expected_inputs(self, node: Dict) -> Dict[str, Any]:
#         """Get expected input schema for a node type"""
#         node_type = node.get("type", "").lower()
#         
#         expected_inputs_map = {
#             "input": {
#                 "user_input": "string",
#                 "input_type": "string",
#                 "context": "object"
#             },
#             "task": {
#                 "description": "string",
#                 "input_data": "any",
#                 "agent_context": "object"
#             },
#             "chat": {
#                 "message": "string",
#                 "conversation_history": "array",
#                 "system_prompt": "string"
#             },
#             "agent": {
#                 "task": "string",
#                 "role": "string",
#                 "goal": "string",
#                 "backstory": "string"
#             },
#             "tool": {
#                 "tool_input": "any",
#                 "tool_config": "object",
#                 "api_parameters": "object"
#             },
#             "logic": {
#                 "condition": "string",
#                 "input_data": "any",
#                 "logic_type": "string"
#             },
#             "output": {
#                 "data": "any",
#                 "format": "string",
#                 "destination": "string"
#             },
#             "delay": {
#                 "duration": "number",
#                 "unit": "string"
#             }
#         }
#         
#         return expected_inputs_map.get(node_type, {"input": "any"})
#     
#     async def _execute_node_with_llm(
#         self,
#         node: Dict,
#         inputs: Dict[str, Any],
#         user_keys: Dict[str, str]
#     ) -> AsyncGenerator[Dict, None]:
#         """Execute a single node with LLM processing and streaming updates"""
#         node_id = node["id"]
#         node_type = node.get("type", "unknown")
#         
#         try:
#             async with self.semaphore:
#                 # Yield LLM processing start
#                 yield {
#                     "type": "llm_processing",
#                     "node_id": node_id,
#                     "status": "processing",
#                     "message": f"Processing {node_type} node with LLM",
#                     "timestamp": datetime.now().isoformat(),
#                     "metadata": {
#                         "node_type": node_type,
#                         "framework": node.get("framework_routing", {}).get("framework"),
#                         "requires_llm": node.get("framework_routing", {}).get("requires_llm")
#                     }
#                 }
#                 
#                 # Prepare enhanced context for LLM processing
#                 enhanced_context = {
#                     **inputs,
#                     "llm_context": node.get("llm_context", {}),
#                     "user_keys": user_keys,
#                     "node_metadata": {
#                         "node_id": node_id,
#                         "node_type": node_type,
#                         "execution_strategy": "llm_centric"
#                     }
#                 }
#                 
#                 # Execute node with enhanced context
#                 start_time = datetime.now()
#                 result = await node_processor.process_node(node, enhanced_context)
#                 execution_time = (datetime.now() - start_time).total_seconds()
#                 
#                 # Yield smart mapping update if applied
#                 if inputs.get("_smart_mapping_applied"):
#                     yield {
#                         "type": "smart_mapping",
#                         "node_id": node_id,
#                         "status": "applied",
#                         "message": "Smart mapping successfully applied",
#                         "timestamp": datetime.now().isoformat(),
#                         "metadata": {
#                             "mapping_timestamp": inputs.get("_mapping_timestamp"),
#                             "previous_results_used": inputs.get("_previous_results_count", 0)
#                         }
#                     }
#                 
#                 # Yield completion
#                 yield {
#                     "type": "node_complete",
#                     "node_id": node_id,
#                     "node_type": node_type,
#                     "status": "completed",
#                     "result": result,
#                     "timestamp": datetime.now().isoformat(),
#                     "metadata": {
#                         "execution_time": execution_time,
#                         "llm_processed": True,
#                         "smart_mapping_applied": inputs.get("_smart_mapping_applied", False),
#                         "framework_used": node.get("framework_routing", {}).get("framework")
#                     }
#                 }
#                 
#         except Exception as e:
#             logger.error(f"❌ LLM node execution failed for {node_id}: {str(e)}")
#             yield {
#                 "type": "node_error",
#                 "node_id": node_id,
#                 "node_type": node_type,
#                 "status": "error",
#                 "error": str(e),
#                 "timestamp": datetime.now().isoformat(),
#                 "metadata": {
#                     "llm_processing": True,
#                     "error_type": type(e).__name__
#                 }
#             }