import asyncio
import json
import logging
from typing import Dict, List, Any, AsyncGenerator
from .frameworks.huggingface_runner import run_huggingface_tool
from .frameworks.llamaindex_runner import run_llamaindex_tool
from .frameworks.autogen_runner import run_autogen_tool
from .frameworks.openrouter_runner import run_openrouter_tool
from .frameworks.crewai_runner import run_crewai_workflow

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def run_crew(data: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """
    Execute a workflow based on the nodes and edges provided.
    
    Args:
        data: Dictionary containing nodes, edges, and inputs for the workflow
        
    Yields:
        Status updates and results as they become available
    """
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    inputs = data.get("inputs", {})
    
    # Log workflow details
    logger.info(f"Starting workflow execution with {len(nodes)} nodes and {len(edges)} edges")
    
    yield "Starting crew execution...\n\n"
    
    # Create a dependency graph to determine execution order
    dependency_graph = build_dependency_graph(nodes, edges)
    execution_order = determine_execution_order(dependency_graph)
    
    # Store results for each node to pass to dependent nodes
    node_results = {}
    
    # Execute nodes in the determined order
    for node_id in execution_order:
        node = next((n for n in nodes if n.get("id") == node_id), None)
        if not node:
            continue
            
        node_data = node.get("data", {})
        label = node_data.get("label", "Unknown Task")
        node_type = node_data.get("nodeType", node.get("type", "unknown"))
        framework = node_data.get("framework", "crew")
        
        # Get inputs from connected nodes
        node_inputs = get_node_inputs(node_id, edges, node_results, inputs)
        
        yield f"Executing {label} ({node_type} using {framework})...\n"
        
        try:
            # Execute based on framework
            if framework == "huggingface":
                result = run_huggingface_tool({**node_data, "inputs": node_inputs})
                yield f"Step: HuggingFace result for {label}: {result}\n\n"
            elif framework == "llamaindex":
                result = run_llamaindex_tool({**node_data, "inputs": node_inputs})
                yield f"Step: LlamaIndex result for {label}: {result}\n\n"
            elif framework == "autogen":
                result = run_autogen_tool({**node_data, "inputs": node_inputs})
                yield f"Step: Autogen result for {label}: {result}\n\n"
            elif framework == "openrouter":
                result = run_openrouter_tool({**node_data, "inputs": node_inputs})
                yield f"Step: OpenRouter result for {label}: {result}\n\n"
            elif framework == "crew":
                # For CrewAI, we need to handle different node types
                if node_type == "agent":
                    result = f"Agent {label} ready for tasks"
                elif node_type == "task":
                    # Find the agent assigned to this task
                    agent_id = find_agent_for_task(node_id, edges, nodes)
                    agent_node = next((n for n in nodes if n.get("id") == agent_id), None)
                    
                    if agent_node:
                        agent_data = agent_node.get("data", {})
                        result = run_crewai_workflow(
                            agent_data=agent_data,
                            task_data=node_data,
                            inputs=node_inputs
                        )
                    else:
                        result = f"No agent assigned to task {label}"
                elif node_type == "tool":
                    result = f"Tool {label} is available"
                else:
                    result = f"Executed {label} (unknown node type)"
            else:
                result = f"Executed {label} (unknown framework)"
                
            # Store the result for this node
            node_results[node_id] = result
            
            yield f"Completed {label}: {result}\n\n"
            
        except Exception as e:
            error_msg = f"Error executing {label}: {str(e)}"
            logger.error(error_msg)
            yield f"ERROR: {error_msg}\n\n"
            node_results[node_id] = f"ERROR: {str(e)}"
    
    # Final summary
    yield "Execution complete.\n\n"
    yield f"Results summary:\n{json.dumps(node_results, indent=2)}\n\n"

def build_dependency_graph(nodes: List[Dict], edges: List[Dict]) -> Dict[str, List[str]]:
    """
    Build a graph of node dependencies based on edges.
    
    Args:
        nodes: List of node objects
        edges: List of edge objects connecting nodes
        
    Returns:
        Dictionary mapping node IDs to lists of dependent node IDs
    """
    graph = {node.get("id"): [] for node in nodes}
    
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        
        if source and target:
            # Target depends on source
            if target in graph:
                graph[target].append(source)
    
    return graph

def determine_execution_order(dependency_graph: Dict[str, List[str]]) -> List[str]:
    """
    Determine the order in which nodes should be executed based on dependencies.
    Uses a topological sort algorithm.
    
    Args:
        dependency_graph: Dictionary mapping node IDs to lists of dependency node IDs
        
    Returns:
        List of node IDs in execution order
    """
    visited = set()
    temp_visited = set()
    order = []
    
    def visit(node_id):
        if node_id in temp_visited:
            # Cyclic dependency detected
            return
        if node_id in visited:
            return
            
        temp_visited.add(node_id)
        
        # Visit dependencies first
        for dependency in dependency_graph.get(node_id, []):
            visit(dependency)
            
        temp_visited.remove(node_id)
        visited.add(node_id)
        order.append(node_id)
    
    # Visit all nodes
    for node_id in dependency_graph:
        if node_id not in visited:
            visit(node_id)
            
    # Reverse to get correct order (dependencies first)
    return list(reversed(order))

def get_node_inputs(node_id: str, edges: List[Dict], node_results: Dict[str, Any], global_inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get inputs for a node from its dependencies and global inputs.
    
    Args:
        node_id: ID of the node to get inputs for
        edges: List of edge objects
        node_results: Dictionary of results from previously executed nodes
        global_inputs: Dictionary of global inputs provided to the workflow
        
    Returns:
        Dictionary of inputs for the node
    """
    inputs = {}
    
    # Add global inputs
    inputs.update(global_inputs)
    
    # Find edges where this node is the target
    incoming_edges = [e for e in edges if e.get("target") == node_id]
    
    # Add results from source nodes
    for edge in incoming_edges:
        source_id = edge.get("source")
        if source_id in node_results:
            # Use the edge label as the input key if available
            edge_label = edge.get("data", {}).get("label", f"input_from_{source_id}")
            inputs[edge_label] = node_results[source_id]
    
    return inputs

def find_agent_for_task(task_id: str, edges: List[Dict], nodes: List[Dict]) -> str:
    """
    Find the agent assigned to a task.
    
    Args:
        task_id: ID of the task node
        edges: List of edge objects
        nodes: List of node objects
        
    Returns:
        ID of the agent node, or None if no agent is assigned
    """
    # Find edges where the task is the target
    incoming_edges = [e for e in edges if e.get("target") == task_id]
    
    for edge in incoming_edges:
        source_id = edge.get("source")
        source_node = next((n for n in nodes if n.get("id") == source_id), None)
        
        if source_node:
            node_type = source_node.get("data", {}).get("nodeType", source_node.get("type", ""))
            if node_type == "agent":
                return source_id
    
    return None
