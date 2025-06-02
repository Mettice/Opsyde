#!/usr/bin/env python3
"""
Graph utilities for workflow execution
Enhanced with universal data transformation
"""

import logging
from typing import List, Dict, Any, Union, Set

from models.nodes import Node
from models.workflow import Edge
from core.data_transformer import data_transformer

logger = logging.getLogger(__name__)

def _get_id(node: Union[Dict[str, Any], Node]) -> str:
    """Get node ID from either dict or Node object"""
    if isinstance(node, dict):
        return node.get("id", "")
    return getattr(node, "id", "")

def _get_source(edge: Union[Dict[str, Any], Edge]) -> str:
    """Get source from either dict or Edge object"""
    if isinstance(edge, dict):
        return edge.get("source", "")
    return getattr(edge, "source", "")

def _get_target(edge: Union[Dict[str, Any], Edge]) -> str:
    """Get target from either dict or Edge object"""
    if isinstance(edge, dict):
        return edge.get("target", "")
    return getattr(edge, "target", "")

def build_dependency_graph(nodes: List[Union[Dict[str, Any], Node]], edges: List[Union[Dict[str, Any], Edge]]) -> Dict[str, List[str]]:
    """Build a dependency graph from nodes and edges"""
    graph = {}
    for node in nodes:
        node_id = _get_id(node)
        if node_id:
            graph[node_id] = []
    
    for edge in edges:
        target = _get_target(edge)
        source = _get_source(edge)
        if target and source and target in graph:
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

def get_node_inputs(
    node_id: str, 
    edges: List[Union[Dict[str, Any], Edge]], 
    node_results: Dict[str, Any], 
    global_inputs: Dict[str, Any] = None,
    nodes: List[Union[Dict[str, Any], Node]] = None
) -> Dict[str, Any]:
    """
    Get inputs for a specific node based on edges and previous results.
    Enhanced with universal data transformation for seamless data flow.
    """
    inputs = dict(global_inputs or {})
    logger.info(f"🔄 Processing inputs for node {node_id}")
    
    # Create node lookup for type detection
    node_lookup = {}
    if nodes:
        for node in nodes:
            node_id_lookup = _get_id(node)
            if isinstance(node, dict):
                node_type = node.get("type") or node.get("data", {}).get("nodeType")
            else:
                node_type = getattr(node, "type", None)
            node_lookup[node_id_lookup] = node_type
    
    # Get target node type
    target_node_type = node_lookup.get(node_id, "unknown")
    
    # DEBUG: Log available node results
    logger.info(f"🔄 Available node results: {list(node_results.keys())}")
    
    for edge in edges:
        target = _get_target(edge)
        if target == node_id:
            source_id = _get_source(edge)
            logger.info(f"🔄 Processing edge: {source_id} → {node_id}")
            
            if source_id in node_results:
                # Get edge label
                edge_data = edge.get("data", {}) if isinstance(edge, dict) else getattr(edge, "data", {})
                label = edge_data.get("label", f"input_from_{source_id}")
                source_output = node_results[source_id]
                
                # Get source node type
                source_node_type = node_lookup.get(source_id, "unknown")
                
                # Skip if source output is an error
                if isinstance(source_output, dict) and source_output.get("type") == "error":
                    logger.warning(f"Skipping error input from {source_id}")
                    continue
                
                # 🚀 UNIVERSAL DATA TRANSFORMATION
                try:
                    transformed_data = data_transformer.transform_for_target(
                        source_output=source_output,
                        source_type=source_node_type,
                        target_type=target_node_type,
                        edge_label=label
                    )
                    
                    inputs[label] = transformed_data
                    logger.info(f"✅ Transformed {source_node_type} → {target_node_type} data for input '{label}'")
                    
                    # Add compatibility aliases
                    if target_node_type == "agent":
                        if transformed_data.get("type") == "text":
                            inputs["query"] = transformed_data.get("value")
                            inputs["data"] = transformed_data
                        elif transformed_data.get("type") == "collaboration":
                            inputs["collaboration"] = transformed_data
                    
                    elif target_node_type == "task":
                        if transformed_data.get("type") == "agent_input":
                            inputs["agent"] = transformed_data.get("agent_info", {})
                            inputs["agent_result"] = transformed_data.get("value")
                        elif transformed_data.get("type") == "data_input":
                            inputs["data"] = transformed_data
                            inputs["query"] = transformed_data.get("value")
                    
                except Exception as e:
                    logger.error(f"❌ Data transformation failed for {source_id} → {node_id}: {str(e)}")
                    # Fallback to original data
                    inputs[label] = source_output
            else:
                logger.warning(f"🔄 Source node {source_id} not found in results")
    
    # DEBUG: Log final inputs
    logger.info(f"🔄 Final inputs for node {node_id}: {list(inputs.keys())}")
    
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
