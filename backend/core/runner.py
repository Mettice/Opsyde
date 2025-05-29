import asyncio
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime
import json
import traceback
import uuid
import inspect
import sys

from models.nodes import Node, NodeType, ToolType
from models.data import NodeData
from models.results import NodeResult, WorkflowResult, ExecutionStatus, ResultType
from models.workflow import Workflow, ExecutionContext

from core.graph import determine_execution_order, get_node_inputs, cleanup_node_results
from core.node_processor import node_processor

# NEW: Import enhanced framework registry
from framework_registry import framework_registry, validate_framework_llm_combination

from core.workflow_execution_context import get_execution_context
from frameworks.crewai_runner import EnhancedCrewAIRunner
from frameworks.openai_runner import run_openai_chat
from frameworks.openrouter_runner import run_openrouter_chat
from frameworks.anthropic_runner import run_anthropic_chat
from frameworks.ai_integration_runner import AIIntegrationRunner
from nodes.output_node import process_output_node
from nodes.trigger_node import process_trigger_node
from nodes.logic_node import process_logic_node
from utils.logging import get_logger

logger = get_logger(__name__)

class UnifiedRunner:
    """
    Unified workflow execution engine with BYOK integration
    """
    
    def __init__(self):
        self.crewai_runner = EnhancedCrewAIRunner()
        self.ai_integration_runner = AIIntegrationRunner()
        self.execution_context = None
        self.executed_nodes = {}
        self.node_results = {}
    
    def determine_execution_order(self, nodes: List[Dict], edges: List[Dict]) -> List[str]:
        """
        Determine the execution order of nodes based on their dependencies
        """
        return determine_execution_order(nodes, edges)
    
    def get_node_inputs(self, node_id: str, edges: List[Dict], node_results: Dict, global_inputs: Dict = None) -> Dict[str, Any]:
        """
        Get inputs for a specific node based on edges and previous results
        """
        return get_node_inputs(node_id, edges, node_results, global_inputs or {})
    
    # Enhanced function to prevent circular references
    def sanitize_result(self, obj, depth=0, seen_objects=None, path=None):
        """
        Clean results to prevent circular references by tracking object IDs and paths
        and ensuring proper JSON serialization. Enhanced for framework-specific handling.
        """
        # Initialize tracking collections if this is the top-level call
        if seen_objects is None:
            seen_objects = set()
        if path is None:
            path = []
        
        # Handle maximum recursion depth
        if depth > 15:  # Increased depth limit for more complex objects
            return "[Max Depth Reached]"
        
        # Handle None explicitly to avoid attribute access errors
        if obj is None:
            return None
            
        # Get object ID to track circular references
        obj_id = id(obj)
        
        # If we've seen this object before, it's a circular reference
        if obj_id in seen_objects:
            # Return a special marker with path information
            path_str = "->".join(str(p) for p in path[-5:] if p) if path else "unknown"
            return f"[Circular Reference at {path_str}]"
            
        # Track this object to detect circular references
        seen_objects.add(obj_id)
        
        try:
            # NEW: Handle framework-specific result formats
            if isinstance(obj, dict):
                # Handle enhanced framework results
                if "framework_used" in obj and "success" in obj:
                    # This is a framework execution result - preserve structure
                    framework_result = {
                        "success": obj.get("success"),
                        "framework_used": obj.get("framework_used"),
                        "execution_time": obj.get("execution_time"),
                        "error": obj.get("error"),
                        "error_type": obj.get("error_type")
                    }
                    
                    # Safely handle the result data
                    if "result" in obj:
                        framework_result["result"] = self.sanitize_result(
                            obj["result"], depth+1, seen_objects, path + ["result"]
                        )
                    
                    return framework_result
                
                # Handle universal API results
                if obj.get("type") == "universal_api_result":
                    return {
                        "type": "universal_api_result",
                        "success": obj.get("success"),
                        "service_detected": obj.get("service_detected"),
                        "protocol": obj.get("protocol"),
                        "response": self.sanitize_result(
                            obj.get("response"), depth+1, seen_objects, path + ["response"]
                        ),
                        "metadata": obj.get("metadata", {})
                    }
            
            # Handle different object types
            if isinstance(obj, NodeData):
                # Convert NodeData to safe dictionary
                if hasattr(obj, 'to_dict') and callable(obj.to_dict):
                    try:
                        data_dict = obj.to_dict()
                    except Exception as e:
                        logger.warning(f"Error calling to_dict: {str(e)}")
                        data_dict = {
                            "value": getattr(obj, "value", None),
                            "metadata": getattr(obj, "metadata", {}),
                            "error": getattr(obj, "error", None),
                            "timestamp": obj.timestamp.isoformat() if hasattr(obj, "timestamp") and obj.timestamp else None
                        }
                else:
                    data_dict = {
                        "value": getattr(obj, "value", None),
                        "metadata": getattr(obj, "metadata", {}),
                        "error": getattr(obj, "error", None),
                        "timestamp": obj.timestamp.isoformat() if hasattr(obj, "timestamp") and obj.timestamp else None
                    }
                
                # Process dictionary values
                if isinstance(data_dict, dict):
                    return {k: self.sanitize_result(v, depth+1, seen_objects, path + [k]) for k, v in data_dict.items() 
                            if not (isinstance(k, str) and k.startswith('_'))}  # Skip private attributes
                return data_dict
                
            elif isinstance(obj, dict):
                # Special case: Detect and flatten nested agent results to prevent recursion
                if "type" in obj and obj.get("type") == "agent_result" and "data" in obj:
                    data = obj.get("data", {})
                    # If this data field contains another agent_result, we have a loop
                    if isinstance(data, dict) and data.get("type") == "agent_result":
                        logger.warning("Detected nested agent_result structure - flattening")
                        # Create a flattened version
                        return {
                            "type": "agent_result", 
                            "data": {
                                "agent_name": data.get("agent_name", "Unknown Agent"),
                                "status": data.get("status", "completed"),
                                "result": data.get("result", ""),
                                "error": data.get("error"),
                                "timestamp": data.get("timestamp", datetime.now().isoformat())
                            }
                        }
                
                # Handle dictionaries recursively, filtering out private keys
                return {k: self.sanitize_result(v, depth+1, seen_objects, path + [k]) 
                        for k, v in obj.items()
                        if not (isinstance(k, str) and k.startswith('_'))}
                        
            elif isinstance(obj, list):
                # Handle lists recursively
                return [self.sanitize_result(item, depth+1, seen_objects, path + [i]) 
                        for i, item in enumerate(obj)]
                
            elif isinstance(obj, tuple):
                # Handle tuples by converting to list
                return [self.sanitize_result(item, depth+1, seen_objects, path + [i]) 
                        for i, item in enumerate(obj)]
                
            elif hasattr(obj, "isoformat") and callable(getattr(obj, "isoformat")):
                # Handle datetime objects
                try:
                    return obj.isoformat()
                except Exception:
                    return str(obj)
                
            elif inspect.isfunction(obj) or inspect.ismethod(obj) or inspect.isclass(obj):
                # Handle functions, methods, and classes
                try:
                    return f"[{obj.__class__.__name__}: {obj.__name__}]"
                except Exception:
                    return f"[{type(obj).__name__}]"
                
            elif hasattr(obj, "__dict__") and not isinstance(obj, type):
                # Handle custom objects by converting to dict, filtering private attributes
                try:
                    # Only include non-private attributes
                    filtered_dict = {k: v for k, v in obj.__dict__.items() 
                                    if not (isinstance(k, str) and k.startswith('_'))}
                    return self.sanitize_result(filtered_dict, depth+1, seen_objects, path + ["__dict__"])
                except Exception as e:
                    logger.warning(f"Failed to serialize object dict: {str(e)}")
                    return str(obj)
            else:
                # Check if object is JSON serializable
                try:
                    json.dumps(obj)
                    return obj
                except (TypeError, OverflowError, ValueError):
                    # Convert to string as a last resort
                    return str(obj)
                    
        except Exception as e:
            logger.warning(f"Error sanitizing result at depth {depth} path {path}: {str(e)}")
            return f"[Error: {str(e)}]"
        
        finally:
            # Remove this object from seen set when we're done processing it
            # This allows the same objects to appear in different branches of the tree
            if obj_id in seen_objects:
                seen_objects.remove(obj_id)
        
    async def execute_workflow(self, workflow_data: Dict[str, Any], user_id: str = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a complete workflow with automatic API key resolution
        
        Args:
            workflow_data: Workflow configuration
            user_id: User ID for API key resolution
            
        Yields:
            Execution results for each node
        """
        try:
            # Initialize execution context with user's API keys
            self.execution_context = await get_execution_context(
                user_id=user_id,
                workflow_id=workflow_data.get('workflow_id')
            )
            
            logger.info(f"🔑 Execution context initialized: {self.execution_context.get_execution_metadata()}")
            
            # Get workflow components
            nodes = workflow_data.get("nodes", [])
            edges = workflow_data.get("edges", [])
            inputs = workflow_data.get("inputs", {})
            
            # Determine execution order
            execution_order = self.determine_execution_order(nodes, edges)
            
            # Execute nodes in order
            node_results = {}
            for node_id in execution_order:
                try:
                    node = next((n for n in nodes if n.get("id") == node_id), None)
                    if not node:
                        continue
                    
                    # Get node inputs from previous results
                    node_inputs = self.get_node_inputs(node_id, edges, node_results, inputs)
                    
                    # 🔑 BYOK INTEGRATION: Enhance node config with user API keys
                    enhanced_node_data = self.execution_context.enhance_node_config(node.get("data", {}))
                    enhanced_node = {**node, "data": enhanced_node_data}
                    
                    # Execute the node
                    result = await self.execute_node(enhanced_node.get("type"), enhanced_node.get("data", {}), node_inputs)
                    
                    # Store result
                    node_results[node_id] = result
                    
                    # Yield result
                    yield {
                        "node_id": node_id,
                        "node_type": node.get("type"),
                        "result": result,
                        "execution_metadata": self.execution_context.get_execution_metadata(),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                except Exception as e:
                    error_result = {
                        "node_id": node_id,
                        "error": str(e),
                        "type": "error",
                        "timestamp": datetime.now().isoformat()
                    }
                    yield error_result
                    logger.error(f"Error executing node {node_id}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            yield {
                "error": str(e),
                "type": "workflow_error",
                "timestamp": datetime.now().isoformat()
            }
            
    async def execute_node(self, node_type: str, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single node with framework validation"""
        try:
            # NEW: Framework validation before execution
            framework = node_data.get("framework")
            if framework:
                # Validate framework/LLM combination if applicable
                llm_config = node_data.get("frameworkConfig", {})
                llm_provider = llm_config.get("provider") or node_data.get("llmProvider")
                
                validation = validate_framework_llm_combination(framework, llm_provider)
                if not validation["valid"]:
                    return {
                        "type": "error",
                        "error": f"Framework validation failed: {validation['error']}",
                        "nodeId": node_data.get("id", "unknown"),
                        "nodeType": node_type,
                        "timestamp": datetime.now().isoformat()
                    }
            
            node = {
                "type": node_type,
                "data": node_data,
                "id": node_data.get("id", "single_node")
            }
            
            result = await node_processor.process_node(node, inputs)
            # Sanitize result to prevent circular references
            return self.sanitize_result(result)
        except Exception as e:
            logger.error(f"Error executing node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "nodeId": node_data.get("id", "unknown"),
                "nodeType": node_type,
                "timestamp": datetime.now().isoformat()
            }

    async def execute_tool(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with the given configuration"""
        try:
            tool_type = data.get("toolType", "llm")
            framework = data.get("framework")
            config = data.get("config", {})
            inputs = data.get("inputs", {})

            # Create a tool node structure
            node = {
                "type": "tool",
                "data": {
                    "toolType": tool_type,
                    "framework": framework,
                    "config": config
                },
                "id": data.get("id", "tool_execution")
            }

            result = await node_processor.process_node(node, inputs)
            # Sanitize result to prevent circular references
            return self.sanitize_result(result)
        except Exception as e:
            logger.error(f"Error executing tool: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
