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

def get_node_inputs(node_id: str, edges: List[Dict], node_results: Dict, global_inputs: Dict = None, nodes: List[Dict] = None) -> Dict[str, Any]:
    """
    Get inputs for a specific node based on edges and previous results
    Enhanced with data preprocessing for agent consumption
    """
    inputs = {}
    
    # Add global inputs first (these are override)
    if global_inputs:
        inputs.update(global_inputs)
    
    # Find incoming edges for this node
    incoming_edges = [edge for edge in edges if edge.get('target') == node_id]
    
    for edge in incoming_edges:
        source_node_id = edge.get('source')
        target_handle = edge.get('targetHandle', 'input')
        
        if source_node_id in node_results:
            source_result = node_results[source_node_id]
            
            # 🚀 NEW: Enhanced data extraction for standardized results
            data_to_pass = None
            
            # Handle standardized result format from UnifiedRunner
            if isinstance(source_result, dict) and "success" in source_result and "data" in source_result:
                if source_result["success"]:
                    # 🔧 CRITICAL FIX: Preserve API data structure for agent consumption
                    raw_data = source_result["data"]
                    
                    # Check if this is API data from a trigger
                    if isinstance(raw_data, dict) and (
                        raw_data.get("type") == "api_data" or 
                        "api_data" in raw_data or 
                        "records" in raw_data or
                        raw_data.get("trigger_type") == "universal_polling"
                    ):
                        logger.info(f"🔧 Preserving API data structure for {node_id}")
                        # For agent nodes, provide the FULL API data structure
                        current_node = next((n for n in (nodes or []) if n.get('id') == node_id), None)
                        if current_node and current_node.get('type') == 'agent':
                            # Agent gets the complete trigger result with all metadata
                            data_to_pass = raw_data
                            logger.info(f"🔧 Agent {node_id} receiving full API data: {raw_data.get('service_name', 'Unknown Service')}")
                            
                            # Extract record count for debugging
                            records = raw_data.get('api_data', {}).get('records', raw_data.get('records', []))
                            if records:
                                logger.info(f"🔧 Agent {node_id} will process {len(records)} records")
                        else:
                            # Other nodes get extracted data
                            if "_clean_data" in source_result:
                                data_to_pass = source_result["_clean_data"]
                            else:
                                data_to_pass = raw_data
                    else:
                        # Non-API data - use clean data if available
                        if "_clean_data" in source_result:
                            data_to_pass = source_result["_clean_data"]
                            logger.info(f"🔧 Using extracted clean data for {node_id}")
                        else:
                            data_to_pass = raw_data
                            logger.info(f"🔧 Using raw data for {node_id}")
                else:
                    # Handle error case
                    logger.warning(f"🔧 Source node {source_node_id} failed, skipping data")
                    continue
            else:
                # Legacy support - use the result as-is
                data_to_pass = source_result
                logger.info(f"🔧 Using legacy result format for {node_id}")
            
            # Set the input using the target handle
            inputs[target_handle] = data_to_pass
    
    # 🚀 CRITICAL FIX: Debug logging for agent inputs
    current_node = next((n for n in (nodes or []) if n.get('id') == node_id), None)
    if current_node and current_node.get('type') == 'agent':
        logger.info(f"🔧 Graph processor final inputs for agent {node_id}:")
        for key, value in inputs.items():
            if isinstance(value, dict):
                if 'api_data' in value or 'records' in value:
                    records = value.get('api_data', {}).get('records', value.get('records', []))
                    service_name = value.get('service_name', 'Unknown')
                    logger.info(f"   - {key}: {service_name} API data with {len(records)} records")
                else:
                    logger.info(f"   - {key}: dict with {len(value)} keys")
            else:
                logger.info(f"   - {key}: {type(value).__name__}")
    
    logger.debug(f"Node {node_id} inputs: {list(inputs.keys())}")
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
