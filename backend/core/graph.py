from typing import Dict, List, Set, Any, Union
from backend.models.workflow import Workflow, Node, Edge
from backend.models.results import NodeResult
import logging

logger = logging.getLogger(__name__)

def _get_id(node: Union[Dict[str, Any], Node]) -> str:
    """Get ID from a node whether it's a dictionary or a Node object"""
    if isinstance(node, dict):
        return node.get("id", "")
    return getattr(node, "id", "")

def _get_source(edge: Union[Dict[str, Any], Edge]) -> str:
    """Get source from an edge whether it's a dictionary or an Edge object"""
    if isinstance(edge, dict):
        return edge.get("source", "")
    return getattr(edge, "source", "")

def _get_target(edge: Union[Dict[str, Any], Edge]) -> str:
    """Get target from an edge whether it's a dictionary or an Edge object"""
    if isinstance(edge, dict):
        return edge.get("target", "")
    return getattr(edge, "target", "")

def build_dependency_graph(nodes: List[Union[Dict[str, Any], Node]], edges: List[Union[Dict[str, Any], Edge]]) -> Dict[str, List[str]]:
    """Build a dependency graph from nodes and edges"""
    graph = {_get_id(node): [] for node in nodes if _get_id(node)}
    for edge in edges:
        source, target = _get_source(edge), _get_target(edge)
        if source and target and target in graph:
            graph[target].append(source)
    return graph

def determine_execution_order(nodes: List[Union[Dict[str, Any], Node]], edges: List[Union[Dict[str, Any], Edge]]) -> List[str]:
    """
    Determine the execution order of nodes based on their dependencies.
    Returns a list of node IDs in execution order.
    
    This function handles both Pydantic models and dictionaries.
    Trigger nodes are always prioritized to execute first.
    """
    # Build dependency graph
    graph = {}
    trigger_nodes = []
    
    for node in nodes:
        node_id = _get_id(node)
        if node_id:
            graph[node_id] = []
            
            # Identify trigger nodes
            node_type = None
            if isinstance(node, dict):
                node_type = node.get("type") or node.get("data", {}).get("nodeType")
            else:
                node_type = getattr(node, "type", None)
            
            if node_type == "trigger":
                trigger_nodes.append(node_id)
    
    # Add dependencies from edges
    for edge in edges:
        source = _get_source(edge)
        target = _get_target(edge)
        if source and target and source in graph and target in graph:
            graph[target].append(source)
    
    # Topological sort with trigger priority
    visited = set()
    temp = set()
    order = []
    
    def visit(node_id: str):
        if node_id in temp:
            raise ValueError(f"Cycle detected in workflow at node {node_id}")
        if node_id in visited:
            return
        temp.add(node_id)
        for dep in graph.get(node_id, []):
            visit(dep)
        temp.remove(node_id)
        visited.add(node_id)
        order.append(node_id)
    
    # First, visit all trigger nodes to ensure they come first
    for trigger_id in trigger_nodes:
        if trigger_id not in visited:
            visit(trigger_id)
    
    # Then visit remaining nodes
    for node_id in graph:
        if node_id not in visited:
            visit(node_id)
    
    return order

def get_node_inputs(node_id: str, edges: List[Union[Dict[str, Any], Edge]], node_results: Dict[str, Any], global_inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Get inputs for a node from its upstream nodes and global inputs"""
    inputs = dict(global_inputs)
    logger.info(f"Processing inputs for node {node_id}")
    
    # Track connected agents for tasks
    connected_agents = []
    
    for edge in edges:
        target = _get_target(edge)
        if target == node_id:
            source_id = _get_source(edge)
            if source_id in node_results:
                # Get edge label from either dict or Edge object
                edge_data = edge.get("data", {}) if isinstance(edge, dict) else getattr(edge, "data", {})
                label = edge_data.get("label", f"input_from_{source_id}")
                source_output = node_results[source_id]
                
                # Skip if source output is an error
                if isinstance(source_output, dict) and source_output.get("type") == "error":
                    logger.warning(f"Skipping error input from {source_id}")
                    continue
                
                # Track agent connections
                if isinstance(source_output, dict) and source_output.get("type") == "agent_status":
                    connected_agents.append(source_output)
                
                if isinstance(source_output, dict):
                    # Handle file data
                    if "value" in source_output and isinstance(source_output["value"], dict):
                        if all(k in source_output["value"] for k in ["filename", "content", "type"]):
                            inputs[label] = source_output
                        else:
                            inputs[label] = source_output
                    # Handle agent data for tasks
                    elif source_output.get("type") == "agent_status" and label == "agent":
                        inputs["agent"] = source_output
                    # Handle inputs wrapper
                    elif "inputs" in source_output and isinstance(source_output["inputs"], dict):
                        inputs.update(source_output["inputs"])
                    else:
                        inputs[label] = source_output
                elif source_output is not None:
                    inputs[label] = {"output": str(source_output)}
    
    # Add connected agents to task inputs
    if connected_agents:
        inputs["agent"] = connected_agents[0]
        inputs["connected_agents"] = connected_agents
    
    return inputs

def cleanup_node_results(node_results: Dict[str, Any], edges: List[Union[Dict[str, Any], Edge]], executed_nodes: Set[str]) -> None:
    """Clean up node results that are no longer needed"""
    to_remove = set()
    
    for node_id in node_results:
        if node_id in executed_nodes:
            # Get nodes that depend on this one
            downstream = {_get_target(edge) for edge in edges if _get_source(edge) == node_id}
            # If all downstream nodes are executed, we can remove this result
            if all(dep in executed_nodes for dep in downstream):
                to_remove.add(node_id)
    
    # Remove the results
    for node_id in to_remove:
        del node_results[node_id]
