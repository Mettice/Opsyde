from typing import Dict, Any, AsyncGenerator, Optional
from datetime import datetime
import logging
import asyncio
import json
import inspect
import sys

from backend.models.nodes import Node, NodeType, ToolType
from backend.models.workflow import Workflow, ExecutionContext
from backend.models.results import NodeResult, WorkflowResult, ExecutionStatus, ResultType
from backend.models.data import NodeData

from backend.core.graph import determine_execution_order, get_node_inputs, cleanup_node_results
from backend.core.node_processor import node_processor

logger = logging.getLogger(__name__)

class UnifiedRunner:
    """Main orchestrator for workflow execution"""
    
    def __init__(self):
        self.executed_nodes = {}
        self.node_results = {}
    
    # Enhanced function to prevent circular references
    def sanitize_result(self, obj, depth=0, seen_objects=None, path=None):
        """
        Clean results to prevent circular references by tracking object IDs and paths
        and ensuring proper JSON serialization
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
        
    async def execute_workflow(self, workflow_data: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute a workflow and yield results"""
        try:
            nodes = workflow_data.get("nodes", [])
            edges = workflow_data.get("edges", [])
            inputs = workflow_data.get("inputs", {})
            
            context = {"edges": edges, "nodes": nodes, "execution_id": f"exec-{datetime.now().timestamp()}"}
            
            # Reset tracking variables
            self.executed_nodes = {}
            self.node_results = {}
            
            # Get execution order
            execution_order = determine_execution_order(nodes, edges)
            
            # Create node lookup
            node_map = {node["id"]: node for node in nodes}
            
            for node_id in execution_order:
                # Skip if already executed
                if node_id in self.executed_nodes:
                    continue
                    
                node = node_map.get(node_id)
                if not node:
                    continue
                
                # Clean up results if needed
                if len(self.node_results) >= 80:  # 80% of max size
                    cleanup_node_results(self.node_results, edges, set(self.executed_nodes))
                
                # Get node inputs
                node_inputs = get_node_inputs(node_id, edges, self.node_results, inputs)
                
                # Process node
                start_time = datetime.now()
                result = await node_processor.process_node(node, node_inputs, context)
                end_time = datetime.now()
                
                # Sanitize result to prevent circular references
                clean_result = self.sanitize_result(result)
                
                # Store sanitized results
                self.node_results[node_id] = clean_result
                self.executed_nodes[node_id] = True
                
                # Format output
                output = {
                    "nodeId": node_id,
                    "nodeType": node.get("type", "unknown"),
                    "nodeName": node.get("data", {}).get("label", "Unnamed Node"),
                    "result": clean_result,
                    "metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "execution_index": len(self.executed_nodes),
                        "has_error": clean_result.get("type") == "error" if isinstance(clean_result, dict) else False,
                        "duration": (end_time - start_time).total_seconds()
                    }
                }
                
                yield output
                
        except Exception as e:
            logger.error(f"Error executing workflow: {str(e)}")
            yield {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            
    async def execute_node(self, node_type: str, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single node"""
        try:
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
