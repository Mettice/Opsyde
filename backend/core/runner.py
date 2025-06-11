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

from core.workflow_execution_context import create_execution_context
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
    
    def get_node_inputs(self, node_id: str, edges: List[Dict], node_results: Dict, global_inputs: Dict = None, nodes: List[Dict] = None) -> Dict[str, Any]:
        """
        Get inputs for a specific node based on edges and previous results
        """
        return get_node_inputs(node_id, edges, node_results, global_inputs or {}, nodes)
    
    def standardize_node_result(self, raw_result: Any, node_type: str, node_id: str, node_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Standardize node results into a consistent format:
        {
            "success": bool,
            "data": Any,  # The actual meaningful content
            "error": str | None,
            "metadata": {
                "node_type": str,
                "node_id": str,
                "execution_time": float,
                "timestamp": str,
                "framework": str | None
            }
        }
        """
        try:
            # 🚀 CRITICAL FIX: Extract framework information from node_data if provided
            framework = None
            if node_data:
                # Strategy 1: Direct framework field
                if node_data.get("framework"):
                    framework = node_data.get("framework")
                
                # Strategy 2: Framework in frameworkConfig
                elif node_data.get("frameworkConfig", {}).get("framework"):
                    framework = node_data.get("frameworkConfig", {}).get("framework")
                
                # Strategy 3: LLM provider as framework
                elif node_data.get("llm", {}).get("provider"):
                    framework = node_data.get("llm", {}).get("provider")
                elif node_data.get("llmProvider"):
                    framework = node_data.get("llmProvider")
                
                # Strategy 4: Tool type as framework  
                elif node_data.get("tool_type"):
                    framework = node_data.get("tool_type")
                elif node_data.get("toolType"):
                    framework = node_data.get("toolType")
                
                # Strategy 5: Output type as framework
                elif node_data.get("output_type"):
                    framework = f"output_{node_data.get('output_type')}"
                elif node_data.get("outputType"):
                    framework = f"output_{node_data.get('outputType')}"
                
                # Strategy 6: Check nested data
                elif node_data.get("data", {}).get("framework"):
                    framework = node_data.get("data", {}).get("framework")
                elif node_data.get("data", {}).get("llmProvider"):
                    framework = node_data.get("data", {}).get("llmProvider")
            
            # 🚀 CRITICAL FIX: Always ensure proper metadata even for already standardized results
            if isinstance(raw_result, dict) and "success" in raw_result and "data" in raw_result:
                # This is already standardized - preserve existing data but ensure metadata
                result = raw_result.copy()
                
                # Ensure metadata exists and is properly populated
                if "metadata" not in result:
                    result["metadata"] = {}
                
                # Always set these core metadata fields
                result["metadata"]["node_type"] = node_type
                result["metadata"]["node_id"] = node_id
                result["metadata"]["timestamp"] = datetime.now().isoformat()
                
                # Add framework if detected
                if framework:
                    result["metadata"]["framework"] = framework
                elif "framework" not in result["metadata"]:
                    result["metadata"]["framework"] = None
                
                return result
            
            # Handle various result types
            if isinstance(raw_result, dict):
                if "success" in raw_result:
                    # Partial standardization
                    return {
                        "success": raw_result.get("success", True),
                        "data": raw_result.get("data") or raw_result.get("result") or raw_result.get("output"),
                        "error": raw_result.get("error"),
                        "metadata": {
                            "node_type": node_type,
                            "node_id": node_id,
                            "timestamp": datetime.now().isoformat(),
                            "framework": framework,
                            **raw_result.get("metadata", {})
                        }
                    }
                elif "error" in raw_result:
                    # Error result
                    return {
                        "success": False,
                        "data": None,
                        "error": raw_result.get("error"),
                        "metadata": {
                            "node_type": node_type,
                            "node_id": node_id,
                            "timestamp": datetime.now().isoformat(),
                            "framework": framework,
                            **raw_result.get("metadata", {})
                        }
                    }
                else:
                    # Raw dict result
                    return {
                        "success": True,
                        "data": raw_result,
                        "error": None,
                        "metadata": {
                            "node_type": node_type,
                            "node_id": node_id,
                            "timestamp": datetime.now().isoformat(),
                            "framework": framework
                        }
                    }
            else:
                # Simple value result
                return {
                    "success": True,
                    "data": raw_result,
                    "error": None,
                    "metadata": {
                        "node_type": node_type,
                        "node_id": node_id,
                        "timestamp": datetime.now().isoformat(),
                        "framework": framework
                    }
                }
                
        except Exception as e:
            logger.error(f"Error standardizing result for {node_type} node {node_id}: {str(e)}")
            return {
                "success": False,
                "data": None,
                "error": f"Standardization error: {str(e)}",
                "metadata": {
                    "node_type": node_type,
                    "node_id": node_id,
                    "timestamp": datetime.now().isoformat(),
                    "framework": framework
                }
            }
    
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
            # Initialize execution context with user's API keys (only if not already set)
            if not hasattr(self, 'execution_context') or self.execution_context is None:
                self.execution_context = await create_execution_context(
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
                    
                    # Get node inputs with node information for data transformation
                    node_inputs = self.get_node_inputs(
                        node_id, 
                        edges, 
                        node_results, 
                        inputs or {},
                        nodes  # Pass nodes for type detection
                    )
                    
                    # 🔑 BYOK INTEGRATION: Enhance node config with user API keys
                    enhanced_node_data = self.execution_context.enhance_node_config(node.get("data", {}))
                    enhanced_node = {**node, "data": enhanced_node_data}
                    
                    # DEBUG: Log the enhancement
                    original_has_api_key = bool(node.get("data", {}).get("frameworkConfig", {}).get("api_key"))
                    enhanced_has_api_key = bool(enhanced_node_data.get("frameworkConfig", {}).get("api_key"))
                    logger.info(f"🔧 Node {node_id} API key injection: {original_has_api_key} -> {enhanced_has_api_key}")
                    
                    # Execute the node
                    result = await self.execute_node(enhanced_node.get("type"), enhanced_node.get("data", {}), node_inputs)
                    
                    # 🚀 CRITICAL FIX: Store standardized result and extract clean data
                    # The result from execute_node is already standardized
                    node_results[node_id] = result
                    
                    # For the graph processor: extract clean data if standardized format
                    if isinstance(result, dict) and "success" in result and "data" in result:
                        if result["success"]:
                            # Store the clean data for next node consumption
                            clean_data = result["data"]
                            logger.info(f"✅ Storing clean data for {node_id}: {type(clean_data)}")
                            # Keep the full result for frontend, but also store clean data for graph processing
                            result["_clean_data"] = clean_data
                        else:
                            logger.warning(f"⚠️ Node {node_id} failed: {result.get('error')}")
                    
                    # Yield result with enhanced information
                    execution_result = {
                        "node_id": node_id,
                        "node_type": enhanced_node.get("type"),
                        "result": result,
                        "execution_metadata": self.execution_context.get_execution_metadata(),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # 🔧 Add data flow information for debugging
                    if isinstance(result, dict) and "success" in result:
                        execution_result["success"] = result["success"]
                        execution_result["error"] = result.get("error")
                        if result.get("metadata"):
                            execution_result["execution_time"] = result["metadata"].get("execution_time")
                            execution_result["framework"] = result["metadata"].get("framework")
                    
                    yield execution_result
                    
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
        # 🚀 CRITICAL FIX: Get node_id from the correct location
        node_id = node_data.get("id") or node_data.get("nodeId") or "unknown"
        
        # 🚀 CRITICAL FIX: Extract framework information from node_data properly with enhanced detection
        framework = None
        
        # Strategy 1: Direct framework field
        if node_data.get("framework"):
            framework = node_data.get("framework")
        
        # Strategy 2: Framework in frameworkConfig
        elif node_data.get("frameworkConfig", {}).get("framework"):
            framework = node_data.get("frameworkConfig", {}).get("framework")
        
        # Strategy 3: LLM provider as framework (for agent nodes)
        elif node_type == "agent":
            provider = (
                node_data.get("llm", {}).get("provider") or
                node_data.get("llmProvider") or
                node_data.get("frameworkConfig", {}).get("provider")
            )
            if provider:
                framework = provider
        
        # Strategy 4: Tool type as framework (for tool nodes)
        elif node_type == "tool":
            tool_framework = (
                node_data.get("tool_type") or
                node_data.get("toolType") or
                node_data.get("framework") or
                "api"  # default for tools
            )
            framework = tool_framework
        
        # Strategy 5: Output type as framework (for output nodes) - but don't validate these
        elif node_type == "output":
            output_type = node_data.get("outputType", "webhook")
            framework = f"output_{output_type}"
        
        # Strategy 6: Node type as fallback for structural nodes
        if not framework:
            framework = node_type
        
        start_time = datetime.now()
        
        try:
            # FIXED: Only validate actual AI/ML frameworks, not structural node types
            structural_node_types = ["input", "output", "logic", "task", "delay", "chat"]
            
            if framework and node_type not in structural_node_types and not framework.startswith("output_"):
                # Validate framework/LLM combination if applicable
                llm_config = node_data.get("frameworkConfig", {})
                llm_provider = llm_config.get("provider") or node_data.get("llmProvider")
                
                validation = validate_framework_llm_combination(framework, llm_provider)
                if not validation["valid"]:
                    error_result = {
                        "type": "error",
                        "error": f"Framework validation failed: {validation['error']}",
                        "nodeId": node_id,
                        "nodeType": node_type,
                        "timestamp": datetime.now().isoformat()
                    }
                    return self.standardize_node_result(error_result, node_type, node_id)
            
            # 🚀 CRITICAL FIX: Ensure node_id is available in node_data for processors
            enhanced_node_data = {**node_data, "id": node_id, "nodeId": node_id}
            if framework:
                enhanced_node_data["framework"] = framework
            
            node = {
                "type": node_type,
                "data": enhanced_node_data,
                "id": node_id
            }
            
            # DEBUG: Log inputs for agent nodes to track data loss
            if node_type == "agent":
                logger.info(f"🔧 Agent {node_id} inputs debug:")
                for key, value in inputs.items():
                    if isinstance(value, dict):
                        if 'api_data' in value or 'records' in value:
                            records_count = len(value.get('api_data', {}).get('records', value.get('records', [])))
                            logger.info(f"   - {key}: API data with {records_count} records")
                        else:
                            logger.info(f"   - {key}: dict with {len(value)} keys")
                    elif isinstance(value, list):
                        logger.info(f"   - {key}: list with {len(value)} items")
                    else:
                        logger.info(f"   - {key}: {type(value).__name__}")
            
            # CRITICAL FIX: Pass the execution context to the node processor
            context = self.execution_context if hasattr(self, 'execution_context') and self.execution_context else None
            
            result = await node_processor.process_node(node, inputs, context)
            
            # 🔧 NEW: Standardize the result format for consistency
            execution_time = (datetime.now() - start_time).total_seconds()
            standardized_result = self.standardize_node_result(result, node_type, node_id, node_data)
            
            # 🚀 CRITICAL FIX: Ensure framework is in metadata
            if "metadata" not in standardized_result:
                standardized_result["metadata"] = {}
            
            standardized_result["metadata"].update({
                "framework": framework,
                "execution_time": execution_time,
                "timestamp": start_time.isoformat()
            })
            
            logger.info(f"✅ Node {node_id} ({node_type}) executed with framework: {framework}")
            
            return standardized_result
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"❌ Node execution failed: {str(e)}")
            
            return {
                "success": False,
                "data": None,
                "error": str(e),
                "metadata": {
                    "node_type": node_type,
                    "node_id": node_id,
                    "framework": framework,
                    "execution_time": execution_time,
                    "timestamp": start_time.isoformat(),
                    "error_type": "execution_error"
                }
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
