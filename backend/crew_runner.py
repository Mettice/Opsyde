import asyncio
import json
import logging
from typing import Dict, List, Any, AsyncGenerator
import requests
import os
from datetime import datetime

# Framework-specific tools
from frameworks.huggingface_runner import run_huggingface_tool
from frameworks.llamaindex_runner import run_llamaindex_tool
from frameworks.autogen_runner import run_autogen_tool
from frameworks.openrouter_runner import run_openrouter_tool, run_openrouter_chat
from frameworks.crewai_runner import run_crewai_workflow

# General runners
from runners.api_runner import run_api_tool
from runners.custom_runner import run_clearbit_tool, run_log_lead_to_sheet, run_lead_scorer

# Output systems
from outputs.output_router import route_output
from frameworks.sheets_logger import log_to_sheet
from frameworks.email_notifier import send_candidate_email
from frameworks.crm_logger_runner import run_crm_logger_tool
from frameworks.discord_notifier import run_discord_notifier
from frameworks.check_readiness_runner import run_readiness_check
from simpleeval import simple_eval
from frameworks.webhook_runner import post_to_webhook
from chat_runner import run_chat_node
from frameworks.delay_runner import run_delay_node

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def debug_object(obj, name="object"):
    """Helper function to debug objects"""
    logger.info(f"DEBUG {name} type: {type(obj)}")
    if isinstance(obj, dict):
        logger.info(f"DEBUG {name} keys: {list(obj.keys())}")
    elif isinstance(obj, str):
        logger.info(f"DEBUG {name} value: {obj[:100]}...")  # Show first 100 chars
    else:
        logger.info(f"DEBUG {name} repr: {repr(obj)}")


def should_run_node(node_data, inputs):
    condition = node_data.get("condition")
    if not condition:
        return True
    try:
        return simple_eval(condition, names={"inputs": inputs})
    except Exception as e:
        logger.warning(f"[!] Condition evaluation failed on node '{node_data.get('label') or node_data.get('tool')}' — {e}")
        return False


def ensure_dict_result(result, node_label="Unknown"):
    """
    Ensure the result is a dictionary
    """
    if result is None:
        return {
            "output": f"Node {node_label} executed with no result",
            "type": "empty_result"
        }
    elif not isinstance(result, dict):
        return {
            "output": str(result),
            "type": "generic_result"
        }
    return result


async def run_crew(data: Dict[str, Any]) -> AsyncGenerator[str, None]:
    try:
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        inputs = data.get("inputs", {})
        context = {}
        
        # Debug logging
        logger.info("Starting crew execution with inputs:")
        logger.debug(f"Input data structure: {json.dumps(inputs, indent=2)}")
        
        # Process input nodes first
        input_nodes = [n for n in nodes if n.get("type") == "input"]
        for node in input_nodes:
            node_data = node.get("data", {})
            logger.debug(f"Processing input node: {json.dumps(node_data, indent=2)}")
            
            # Get the value from node_data
            node_value = node_data.get("value", {})
            
            # Handle different input structures
            if isinstance(node_value, dict):
                if "inputs" in node_value:
                    # Merge the inputs into the global inputs
                    inputs.update(node_value["inputs"])
                    logger.info(f"Added inputs from node: {list(node_value['inputs'].keys())}")
                elif "file_upload" in node_value:
                    # Handle file upload structure
                    file_data = node_value["file_upload"]
                    if isinstance(file_data, dict):
                        # Add file input with proper structure
                        input_key = node_data.get("label", "file_input").lower().replace(" ", "_")
                        inputs[input_key] = {
                            "type": "file",
                            "content": file_data.get("content", ""),
                            "filename": file_data.get("filename", ""),
                            "file_type": file_data.get("type", ""),
                            "size": file_data.get("size", 0)
                        }
                        logger.info(f"Added file input: {file_data.get('filename')} as {input_key}")
                elif isinstance(node_value, dict) and "text_input" in node_value:
                    # Handle text input structure
                    input_key = node_data.get("label", "text_input").lower().replace(" ", "_")
                    inputs[input_key] = node_value["text_input"]
                    logger.info(f"Added text input as {input_key}")
                else:
                    # Handle direct value
                    input_key = node_data.get("label", "input").lower().replace(" ", "_")
                    inputs[input_key] = node_value
                    logger.info(f"Added direct input: {input_key}")

        metadata = data.get("metadata", {})
        output_config = metadata.get("output", {})

        # Debug the parsed data
        debug_object(nodes, "nodes")
        debug_object(edges, "edges")
        
        collected_logs = ""
        yield "Starting crew execution...\n\n"

        # Initialize node_results to store outputs
        node_results = {}
        
        # FIRST: Process all trigger nodes directly, before anything else
        trigger_nodes = [n for n in nodes if n.get("type") == "trigger" or 
                        (n.get("data", {}) and n.get("data", {}).get("nodeType") == "trigger")]
        
        if trigger_nodes:
            yield "⚡ Processing trigger nodes first...\n\n"
            
            for trigger_node in trigger_nodes:
                trigger_id = trigger_node.get("id")
                trigger_data = trigger_node.get("data", {})
                trigger_label = trigger_data.get("label", "Unnamed Trigger")
                
                yield f"⚡ Processing trigger: {trigger_label}\n\n"
                
                try:
                    # Process trigger directly with minimal dependencies
                    result = {
                        "output": f"Trigger '{trigger_label}' activated",
                        "type": "trigger_status",
                        "trigger_type": trigger_data.get("triggerType", "manual"),
                        "trigger_id": trigger_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Store the result
                    node_results[trigger_id] = result
                    yield f"✅ Trigger '{trigger_label}' activated successfully\n\n"
                    
                except Exception as e:
                    logger.error(f"Error processing trigger '{trigger_label}': {str(e)}")
                    error_result = {
                        "output": f"Error in trigger: {str(e)}",
                        "type": "error",
                        "error": str(e)
                    }
                    node_results[trigger_id] = error_result
                    yield f"❌ Error in trigger '{trigger_label}': {str(e)}\n\n"
        
        # SECOND: Process the rest of the nodes using the dependency graph
        dependency_graph = build_dependency_graph(nodes, edges)
        execution_order = determine_execution_order(dependency_graph)
        
        # Filter out trigger nodes that we've already processed
        execution_order = [node_id for node_id in execution_order 
                          if node_id not in [n.get("id") for n in trigger_nodes]]
        
        # Debug execution order
        logger.info(f"Execution order (after removing triggers): {execution_order}")

        # Continue with the rest of your existing code for processing non-trigger nodes
        for i, current_node in enumerate(execution_order):
            # Debug current node_id
            debug_object(current_node, f"node_id_{i}")
            
            node = next((n for n in nodes if n.get("id") == current_node), None)
            # Debug found node
            debug_object(node, f"node_{i}")
            
            if not node:
                logger.warning(f"Node with ID {current_node} not found")
                continue

            node_data = node.get("data", {})
            # Debug node_data
            debug_object(node_data, f"node_data_{i}")
            
            label = node_data.get("label", "Unknown Task")
            node_type = node_data.get("nodeType", node.get("type", "unknown"))
            framework = node_data.get("framework", "crew")

            node_inputs = get_node_inputs(current_node, edges, node_results, inputs)
            # Debug node_inputs
            debug_object(node_inputs, f"node_inputs_{i}")
            
            if not should_run_node(node_data, node_inputs):
                yield f"⏭️ Skipping {label} — condition not met.\n\n"
                continue

            yield f"✅ Executing {label} ({node_type} using {framework})...\n"

            try:
                result = None

                # First check if it's a tool node
                if node_type == "tool":
                    try:
                        tool_type = safe_get(node_data, "toolType", "unknown")
                        framework = safe_get(node_data, "framework", "unknown")
                        
                        logger.info(f"Processing tool '{label}' of type '{tool_type}' using framework '{framework}'")
                        
                        # Handle different frameworks for tools
                        if framework == "huggingface":
                            try:
                                tool_inputs = {**node_data, "inputs": node_inputs}
                                result = run_huggingface_tool(tool_inputs)
                                
                                # Ensure result is a dictionary
                                if not isinstance(result, dict):
                                    result = {"output": str(result), "type": "huggingface_result"}
                                
                                yield f"Step {i+1}: HuggingFace tool result for {label}: {result}\n\n"
                            except Exception as e:
                                logger.error(f"Error executing {label} with HuggingFace: {str(e)}")
                                result = {"output": f"Error: {str(e)}", "type": "error", "error": str(e)}
                                yield f"❌ Error in {label}: {str(e)}\n\n"
                        elif tool_type == "api":
                            # Handle API tools with defensive programming
                            try:
                                result = run_api_tool(node_data, node_inputs)
                                if not isinstance(result, dict):
                                    result = {"output": str(result), "type": "api_result"}
                                yield f"Step {i+1}: API tool result for {label}: {result}\n\n"
                            except Exception as e:
                                logger.error(f"Error executing API tool {label}: {str(e)}")
                                result = {"output": f"Error: {str(e)}", "type": "error", "error": str(e)}
                                yield f"❌ Error in API tool {label}: {str(e)}\n\n"
                        elif tool_type == "custom":
                            # Handle custom tools with defensive programming
                            try:
                                # Implement custom tool handling based on the label or other properties
                                if "Clearbit" in label:
                                    result = run_clearbit_tool(data)
                                elif "Score" in label:
                                    result = run_lead_scorer(data)
                                elif "Logger" in label:
                                    result = run_log_lead_to_sheet(data)
                                else:
                                    result = {"output": f"Custom tool {label} executed", "type": "custom_result"}
                                
                                # Ensure result is a dictionary
                                if not isinstance(result, dict):
                                    result = {"output": str(result), "type": "custom_result"}
                                
                                yield f"Step {i+1}: Custom tool result for {label}: {result}\n\n"
                            except Exception as e:
                                logger.error(f"Error executing custom tool {label}: {str(e)}")
                                result = {"output": f"Error: {str(e)}", "type": "error", "error": str(e)}
                                yield f"❌ Error in custom tool {label}: {str(e)}\n\n"
                        else:
                            # Handle unknown tool types
                            result = {"output": f"Unknown tool type: {tool_type}", "type": "unknown_tool"}
                            yield f"Step {i+1}: Unknown tool type {tool_type} for {label}\n\n"
                    
                    except Exception as e:
                        logger.error(f"Error executing tool {label}: {str(e)}")
                        result = {"output": f"Error: {str(e)}", "type": "error", "error": str(e)}
                        yield f"❌ Error in tool {label}: {str(e)}\n\n"
                
                # Then check other node types and frameworks
                elif framework == "huggingface":
                    # This is for non-tool nodes that use HuggingFace
                    try:
                        # Ensure we're passing a dictionary to run_huggingface_tool
                        tool_inputs = {**node_data, "inputs": node_inputs}
                        result = run_huggingface_tool(tool_inputs)
                        
                        # Ensure result is a dictionary
                        if not isinstance(result, dict):
                            result = {"output": str(result), "type": "huggingface_result"}
                        
                        yield f"Step {i+1}: HuggingFace result for {label}: {result}\n\n"
                    except Exception as e:
                        logger.error(f"Error executing {label} with HuggingFace: {str(e)}")
                        result = {"output": f"Error: {str(e)}", "type": "error", "error": str(e)}
                        yield f"❌ Error in {label}: {str(e)}\n\n"

                elif framework == "llamaindex":
                    result = run_llamaindex_tool({**node_data, "inputs": node_inputs})
                    yield f"Step {i+1}: LlamaIndex result for {label}: {result}\n\n"

                elif framework == "autogen":
                    result = run_autogen_tool({**node_data, "inputs": node_inputs})
                    yield f"Step {i+1}: Autogen result for {label}: {result}\n\n"

                elif framework == "openrouter":
                    result = run_openrouter_tool({**node_data, "inputs": node_inputs})
                    yield f"Step {i+1}: OpenRouter result for {label}: {result}\n\n"

                elif framework == "custom":
                    if label == "Clearbit Enrichment":
                        result = run_clearbit_tool(data)
                    elif label == "Score Lead":
                        result = run_lead_scorer(data)
                    elif label == "Lead Sheet Logger":
                        result = run_log_lead_to_sheet(data)
                    yield f"Step {i+1}: Custom tool result: {result}\n\n"

                elif framework == "crew":
                    if node_type == "agent":
                        # Return a dictionary instead of a string
                        result = {
                            "output": f"Agent {label} ready for tasks",
                            "type": "agent_status",
                            "agent_name": label,
                            "agent_role": node_data.get("role", "Assistant")
                        }
                    elif node_type == "task":
                        agent_id = find_agent_for_task(current_node, edges, nodes)
                        agent_node = next((n for n in nodes if n.get("id") == agent_id), None)
                        if agent_node:
                            # Change this part to use the new function signature
                            try:
                                # Create a crew_config dictionary with the agent and task
                                crew_config = {
                                    "agents": [agent_node.get("data", {})],
                                    "tasks": [node_data],
                                    "inputs": node_inputs
                                }
                                
                                # Call the new function with the crew_config
                                result = run_crewai_workflow(crew_config, framework="crewai")
                                
                            except TypeError:
                                # Fallback to old implementation if needed
                                from frameworks.crewai_runner import run_crewai_workflow as old_run_crewai_workflow
                                result = old_run_crewai_workflow(
                                    agent_data=agent_node.get("data", {}),
                                    task_data=node_data,
                                    inputs=node_inputs
                                )
                            
                            # Make sure result is a dictionary
                            if isinstance(result, str):
                                result = {"output": result, "type": "task_result"}
                    elif node_type == "chatbot" or node_type == "chat":
                        # Use the dedicated chat_runner function
                        result = run_chat_node(node_data, node_inputs)
                        yield f"Step {i+1}: Chat Response: {result[:100]}...\n\n"
                        
                        # Store the result in node_results for downstream nodes
                        node_results[current_node] = result
                    elif node_type == "delay":
                        # Use the dedicated delay_runner function
                        result = await run_delay_node(node_data)
                        yield f"⏱️ Step {i+1}: Delay - {result}\n\n"
                        
                        # Store the result in node_results for downstream nodes
                        node_results[current_node] = result

                elif node_type == "trigger":
                    try:
                        # Make sure node_data is never None
                        if node_data is None:
                            node_data = {}
                            logger.warning("Trigger node has no 'data' — defaulting to empty.")
                        
                        # Clear debugging
                        logger.info(f"Processing trigger node in run_crew: {node_data.get('label', 'Unnamed')}")
                        
                        # Use our local handler instead of the imported one
                        result = await handle_trigger_node(node_data)
                        
                        # Store the result
                        node_results[current_node] = result
                        yield f"⚡ Trigger '{node_data.get('label', 'Unnamed')}' activated\n\n"
                        
                    except Exception as e:
                        logger.error(f"Error executing Trigger in run_crew: {str(e)}")
                        result = {
                            "output": f"Error in trigger: {str(e)}",
                            "type": "error",
                            "error": str(e)
                        }
                        node_results[current_node] = result
                        yield f"❌ Error in trigger: {str(e)}\n\n"

                elif node_type == "input":
                    result = await run_input_node(node_data, inputs, context)
                elif node_type == "output":
                    result = await run_output_node(node_data, inputs, context)

                if result is not None:
                    result = ensure_dict_result(result, label)
                    node_results[current_node] = result
                else:
                    # If result is None, provide a default
                    node_results[current_node] = {"output": f"Node {label} executed with no result", "type": "empty_result"}

                yield f"Completed {label}: {node_results[current_node]}\n\n"

                # Handle output routing if configured in metadata
                if output_config:
                    yield f"🔄 Routing output...\n\n"
                    routed = route_output(output_config, result)
                    yield f"📤 Output Result: {routed}\n\n"

                routes = node_data.get("routes", [])
                for route in routes:
                    route_type = route.get("type")
                    route_condition = route.get("condition", "True")
                    route_config = route.get("config", {})

                    try:
                        if simple_eval(route_condition, names={"inputs": result}):
                            yield f"📬 Routing result to {route_type}...\n"

                            if route_type == "email":
                                status = send_candidate_email({**result, **route_config})
                            elif route_type == "sheet":
                                status = log_to_sheet({**result, **route_config})
                            elif route_type == "discord":
                                status = run_discord_notifier({**result, **route_config})
                            elif route_type == "webhook":
                                status = post_to_webhook({**result, **route_config})
                            else:
                                status = "Unknown route type"

                            yield f"✅ Dispatched to {route_type}: {status}\n\n"
                        else:
                            yield f"❌ Skipped {route_type} route (condition not met)\n\n"

                    except Exception as e:
                        yield f"⚠️ Route error ({route_type}): {str(e)}\n\n"

            except Exception as e:
                error_msg = f"Error executing {label}: {str(e)}"
                logger.error(error_msg)
                yield f"❌ {error_msg}\n\n"
                
                # Even on error, provide a result for downstream nodes
                node_results[current_node] = {
                    "output": f"Error: {str(e)}",
                    "type": "error",
                    "error": str(e)
                }

        yield "Execution complete.\n\n"
        yield f"Results summary:\n{json.dumps(node_results, indent=2)}\n\n"

    except Exception as e:
        logger.error(f"Error in run_crew: {str(e)}")
        yield f"❌ Error in run_crew: {str(e)}\n\n"


# Utility methods

def build_dependency_graph(nodes: List[Dict], edges: List[Dict]) -> Dict[str, List[str]]:
    graph = {node.get("id"): [] for node in nodes}
    for edge in edges:
        source, target = edge.get("source"), edge.get("target")
        if source and target:
            graph[target].append(source)
    return graph

def determine_execution_order(dependency_graph: Dict[str, List[str]]) -> List[str]:
    """
    Determine the execution order of nodes with triggers first
    """
    visited = set()
    order = []
    
    # Helper function for topological sort
    def visit(node_id):
        if node_id in visited:
            return
        visited.add(node_id)
        for dep in dependency_graph.get(node_id, []):
            visit(dep)
        order.append(node_id)
    
    # First process trigger nodes
    trigger_nodes = [node for node in dependency_graph if "trigger" in node.lower()]
    logger.info(f"Found trigger nodes: {trigger_nodes}")  # Debug line
    for node_id in trigger_nodes:
        if node_id not in visited:
            visit(node_id)
    
    # Then process non-trigger nodes
    for node_id in dependency_graph:
        if node_id not in visited:
            visit(node_id)
            
    # Return the reversed order for correct execution sequence
    execution_order = list(reversed(order))
    logger.info(f"Final execution order: {execution_order}")  # Debug line
    return execution_order

def get_node_inputs(node_id: str, edges: List[Dict], node_results: Dict[str, Any], global_inputs: Dict[str, Any]) -> Dict[str, Any]:
    inputs = dict(global_inputs)
    logger.info(f"\n{'='*50}\nProcessing inputs for node {node_id}\n{'='*50}")
    logger.info(f"Global inputs: {json.dumps(global_inputs, default=str)}")
    logger.info(f"Current node results: {json.dumps(node_results, default=str)}")
    
    for edge in edges:
        if edge.get("target") == node_id:
            source_id = edge.get("source")
            if source_id in node_results:
                label = edge.get("data", {}).get("label", f"input_from_{source_id}")
                source_output = node_results[source_id]
                logger.info(f"\nProcessing edge from {source_id} to {node_id}")
                logger.info(f"Edge label: {label}")
                logger.info(f"Source output: {json.dumps(source_output, default=str)}")
                
                if isinstance(source_output, dict):
                    # If source_output has a file_upload, preserve it exactly as is
                    if "file_upload" in source_output:
                        inputs[label] = source_output
                        logger.info("Preserved file_upload structure")
                    # If it has inputs wrapper, merge them
                    elif "inputs" in source_output and isinstance(source_output["inputs"], dict):
                        inputs.update(source_output["inputs"])
                        logger.info("Merged inputs from source")
                    # Otherwise store the whole output
                    else:
                        inputs[label] = source_output
                        logger.info("Stored complete output")
                elif source_output is not None:
                    inputs[label] = {"output": str(source_output)}
                    logger.info("Stored string output")
    
    logger.info(f"\nFinal inputs for node {node_id}: {json.dumps(inputs, default=str)}\n{'='*50}\n")
    return inputs

def find_agent_for_task(task_id, edges, nodes):
    """Find the agent connected to a task"""
    # Debug inputs
    debug_object(task_id, "task_id")
    debug_object(edges, "edges_in_find_agent")
    
    # Find edges where the task is the target
    incoming_edges = [e for e in edges if e.get("target") == task_id]
    
    # Debug incoming edges
    debug_object(incoming_edges, "incoming_edges")
    
    if not incoming_edges:
        logger.warning(f"No incoming edges found for task {task_id}")
        return None
    
    # Get the source node ID (should be an agent)
    source_id = incoming_edges[0].get("source")
    
    # Debug source_id
    debug_object(source_id, "source_id")
    
    if not source_id:
        logger.warning(f"No source ID found in edge for task {task_id}")
        return None
    
    # Find the agent node
    agent_node = next((n for n in nodes if n.get("id") == source_id), None)
    
    # Debug agent_node
    debug_object(agent_node, "agent_node")
    
    if not agent_node:
        logger.warning(f"No agent node found with ID {source_id}")
        return None
    
    # Check if it's actually an agent
    if agent_node.get("type") != "agent":
        logger.warning(f"Node {source_id} is not an agent, it's a {agent_node.get('type')}")
    
    if safe_get(agent_node, "type") != "agent":
        logger.warning(f"Node {source_id} is not an agent, it's a {safe_get(agent_node, 'type')}")
        
    return source_id

def score_candidate(parsed_data):
    score = 0
    score += 20 if "Python" in parsed_data.get("skills", []) else 0
    score += 20 if parsed_data.get("experience", 0) >= 3 else 0
    score += 20 if "AI" in parsed_data.get("skills", []) else 0
    recommendation = "Strong fit" if score >= 50 else "Needs review"
    return {**parsed_data, "score": score, "recommendation": recommendation}

# Update your execute_flow function to handle conditional paths
async def execute_flow(flow_data):
    """
    Execute a flow of nodes based on the provided flow data
    """
    nodes = flow_data.get("nodes", [])
    edges = flow_data.get("edges", [])
    
    # Create a node lookup by ID
    node_map = {node["id"]: node for node in nodes}
    
    # Initialize node_results dictionary
    node_results = {}
    
    # Create an edge lookup by source
    edge_map = {}
    for edge in edges:
        source = edge["source"]
        if source not in edge_map:
            edge_map[source] = []
        edge_map[source].append(edge)
    
    # Find the starting node (usually a trigger)
    start_nodes = [node for node in nodes if node["type"] == "trigger"]
    if not start_nodes:
        # If no trigger node, find nodes with no incoming edges
        incoming_edges = set(edge["target"] for edge in edges)
        start_nodes = [node for node in nodes if node["id"] not in incoming_edges]
    
    if not start_nodes:
        yield "Error: No starting node found in the flow"
        return
    
    # Start with the first trigger or entry node
    current_node = start_nodes[0]
    context = {}
    inputs = {}
    i = 0  # Initialize counter
    
    # Process nodes in sequence
    while current_node:
        # Execute the current node
        result = await process_node(current_node, i, inputs, context, node_results)
        
        # Update context with the result
        node_id = current_node["id"]
        context[node_id] = result
        
        # Increment counter for next node
        i += 1
        
        # Use the result as input for the next node
        inputs = result
        
        # Yield the result for streaming
        yield f"Node {current_node.get('data', {}).get('label', node_id)}: {json.dumps(result)}\n"
        
        # Find the next node based on edges
        next_node = None
        
        # Check if this is a logic node with conditional paths
        if current_node["type"] == "logic" and "path" in result:
            # Get the path from the result (true or false)
            path = result["path"]
            
            # Find edges that match the source node and have the correct handle ID
            matching_edges = [
                edge for edge in edge_map.get(node_id, [])
                if edge.get("sourceHandle") == path or 
                   (path == "true" and edge.get("sourceHandle") == "true") or
                   (path == "false" and edge.get("sourceHandle") == "false")
            ]
            
            if matching_edges:
                # Get the target node of the first matching edge
                next_node_id = matching_edges[0]["target"]
                next_node = node_map.get(next_node_id)
        else:
            # Regular node - follow the first outgoing edge
            outgoing_edges = edge_map.get(node_id, [])
            if outgoing_edges:
                next_node_id = outgoing_edges[0]["target"]
                next_node = node_map.get(next_node_id)
        
        # Update the current node
        current_node = next_node
    
    # Flow completed
    yield "Flow execution completed"

# Update the run_logic_node function to handle more complex expressions
async def run_logic_node(node_data, inputs, context):
    """
    Evaluates a condition and returns the appropriate path
    """
    try:
        condition = node_data.get("condition", "False")
        
        # Create a safe evaluation environment
        eval_globals = {
            "inputs": inputs,
            "context": context,
            "env": os.environ,
            "len": len,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "list": list,
            "dict": dict,
            "sum": sum,
            "min": min,
            "max": max,
            "all": all,
            "any": any,
            "in": lambda x, y: x in y,  # Support for 'in' operator
            "not": lambda x: not x      # Support for 'not' operator
        }
        
        # Add support for common operators
        eval_globals["and"] = lambda x, y: x and y
        eval_globals["or"] = lambda x, y: x or y
        
        # Preprocess the condition to handle common patterns
        # Replace && with 'and'
        condition = condition.replace("&&", " and ")
        # Replace || with 'or'
        condition = condition.replace("||", " or ")
        
        # Evaluate the condition
        result = eval(condition, {"__builtins__": {}}, eval_globals)
        
        # Log the result
        logger.info(f"Logic node condition '{condition}' evaluated to: {result}")
        
        # Return the result as a string for the flow engine
        return {
            "type": "logic",
            "label": node_data.get("label", "Logic Node"),
            "condition": condition,
            "result": bool(result),
            "path": "true" if bool(result) else "false",
            "message": f"Condition '{condition}' evaluated to {result}"
        }
    except Exception as e:
        logger.error(f"Error evaluating logic condition: {str(e)}")
        return {
            "type": "logic",
            "label": node_data.get("label", "Logic Node"),
            "condition": node_data.get("condition", ""),
            "result": False,
            "path": "false",
            "message": f"Error in condition: {str(e)}"
        }

async def process_node(node, i, inputs, context, node_results):
    node_id = node.get("id")
    node_type = node.get("type", "unknown")
    node_data = node.get("data", {})
    
    # Log node execution
    logger.info(f"Executing {node_type} node: {node_data.get('label', 'Unnamed')}")
    
    try:
        if node_type == "agent":
            result = await run_agent_node(node_data, inputs, context)
        elif node_type == "task":
            result = await run_task_node(node_data, inputs, context)
        elif node_type == "tool":
            result = await run_tool_node(node_data, inputs, context)
        elif node_type == "chat":
            result = await run_chat_node(node_data, inputs, context)
        elif node_type == "delay":
            result = await run_delay_node(node_data)
        elif node_type == "trigger":
            try:
                # Make sure node_data is never None
                if node_data is None:
                    node_data = {}
                    logger.warning("Trigger node has no 'data' — defaulting to empty.")
                
                # Clear debugging
                logger.info(f"Processing trigger node: {node_data.get('label', 'Unnamed')}")
                
                # Use our local handler instead of the imported one
                result = await handle_trigger_node(node_data)
                
            except Exception as e:
                logger.error(f"Error executing Trigger: {str(e)}")
                result = {
                    "output": f"Error in trigger: {str(e)}",
                    "type": "error",
                    "error": str(e)
                }
        elif node_type == "logic":
            result = await run_logic_node(node_data, inputs, context)
        elif node_type == "input":
            result = await run_input_node(node_data, inputs, context)
        elif node_type == "output":
            result = await run_output_node(node_data, inputs, context)
        else:
            result = {"error": f"Unknown node type: {node_type}"}
        
        node_results[node_id] = result
        return result
    except Exception as e:
        logger.error(f"Error processing {node_type} node: {str(e)}")
        error_result = {"error": f"Node execution failed: {str(e)}"}
        node_results[node_id] = error_result
        return error_result

def run_crewai_workflow(crew_config, framework="crewai"):
    """
    A framework-agnostic function to run agent workflows using different frameworks.
    
    Args:
        crew_config (dict): Configuration for the crew/agents/tasks
        framework (str): The framework to use (crewai, langchain, autogen, huggingface)
        
    Returns:
        dict: The result of the workflow execution
    """
    from frameworks import crewai_runner, langchain_runner, autogen_runner, huggingface_runner

    # Choose the runner based on the selected framework
    if framework == "crewai":
        runner = crewai_runner
    elif framework == "langchain":
        runner = langchain_runner
    elif framework == "autogen":
        runner = autogen_runner
    elif framework == "huggingface":
        runner = huggingface_runner
    else:
        raise ValueError(f"Unknown framework selected: {framework}")

    try:
        agents = crew_config.get("agents", [])
        tasks = crew_config.get("tasks", [])
        tools = crew_config.get("tools", [])
        memory = crew_config.get("memory", None)
        inputs = crew_config.get("inputs") or {}
        
        # Handle trigger nodes if present
        trigger_nodes = [node for node in crew_config.get("nodes", []) if safe_get(node, "type") == "trigger"]
        
        if trigger_nodes:
            for trigger_node in trigger_nodes:
                trigger_data = safe_get(trigger_node, "data", {})
                trigger_type = safe_get(trigger_data, "triggerType", "manual")
                trigger_id = safe_get(trigger_data, "nodeId", "unknown")
                
                logger.info(f"Processing trigger node: {trigger_id} of type {trigger_type}")
                
                # Add trigger result to inputs
                inputs["trigger"] = {
                    "id": trigger_id,
                    "type": trigger_type,
                    "activated": True,
                    "timestamp": datetime.now().isoformat()
                }

        return runner.run_agents(agents, tasks, tools, memory, inputs)
    except Exception as e:
        logger.error(f"Error running crew workflow with {framework}: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e),
            "framework": framework
        }

def safe_get(obj, key, default=None):
    """Safely get a value from a dictionary, handling None cases"""
    if obj is None:
        return default
    try:
        return obj.get(key, default)
    except (AttributeError, TypeError):
        return default

async def run_agent_node(node_data, inputs, context=None):
    """
    Execute an agent node
    
    Args:
        node_data: Dictionary containing agent configuration
        inputs: Dictionary of inputs for the agent
        context: Optional execution context
        
    Returns:
        Dictionary containing the agent execution result
    """
    try:
        agent_name = safe_get(node_data, "label", "Unknown Agent")
        agent_role = safe_get(node_data, "role", "Assistant")
        
        logger.info(f"Executing agent '{agent_name}' with role '{agent_role}'")
        
        # Return a dictionary with agent information
        return {
            "output": f"Agent {agent_name} ready for tasks",
            "type": "agent_status",
            "agent_name": agent_name,
            "agent_role": agent_role
        }
    except Exception as e:
        logger.error(f"Error in agent node: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def run_task_node(node_data, inputs, context=None):
    """
    Execute a task node
    
    Args:
        node_data: Dictionary containing task configuration
        inputs: Dictionary of inputs for the task
        context: Optional execution context
        
    Returns:
        Dictionary containing the task execution result
    """
    try:
        task_name = safe_get(node_data, "label", "Unknown Task")
        task_description = safe_get(node_data, "description", "No description")
        
        logger.info(f"Executing task '{task_name}': {task_description}")
        
        # Find the agent for this task
        agent_id = context.get("agent_id") if context else None
        
        if agent_id:
            # Use the agent to execute the task
            from frameworks.crewai_runner import run_crewai_workflow
            
            # Create a crew_config dictionary with the agent and task
            crew_config = {
                "agents": [context.get("agent_data", {})],
                "tasks": [node_data],
                "inputs": inputs
            }
            
            # Call the function with the crew_config
            result = run_crewai_workflow(crew_config, framework="crewai")
            
            # Ensure result is a dictionary
            if not isinstance(result, dict):
                result = {"output": str(result), "type": "task_result"}
                
            return result
        else:
            # No agent found, return a simple result
            return {
                "output": f"Task '{task_name}' executed without an agent",
                "type": "task_result",
                "task_name": task_name
            }
    except Exception as e:
        logger.error(f"Error in task node: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }

def debug_node_data(prefix, data):
    """Debug helper to track data flow"""
    try:
        logger.info(f"\n{'='*20} {prefix} {'='*20}")
        if data is None:
            logger.info("Data is None")
            return
        if isinstance(data, dict):
            for key, value in data.items():
                logger.info(f"{key}: {type(value)}")
                if isinstance(value, dict):
                    logger.info(f"{key} contents: {json.dumps(value, default=str)[:200]}")
        else:
            logger.info(f"Data type: {type(data)}")
            logger.info(f"Data: {str(data)[:200]}")
        logger.info("="*50)
    except Exception as e:
        logger.error(f"Debug error: {str(e)}")

async def run_input_node(node_data, inputs, context=None):
    """Process an input node"""
    try:
        debug_node_data("INPUT NODE START", node_data)
        
        # Handle None node_data
        if node_data is None:
            return {
                "output": "No input data",
                "type": "input_result",
                "value": {},
                "inputs": {}
            }
        
        # Get the value, defaulting to empty dict
        value = node_data.get("value", {})
        if value is None:
            value = {}
            
        debug_node_data("INPUT NODE VALUE", value)
        
        # Handle file upload
        if isinstance(value, dict):
            file_data = value.get("file_upload")
            if file_data:
                # Ensure file_data is a dictionary
                if not isinstance(file_data, dict):
                    file_data = {"content": str(file_data)}
                
                # Create standardized file structure
                file_result = {
                    "file_upload": {
                        "filename": file_data.get("filename", "unknown.pdf"),
                        "content": file_data.get("content", ""),
                        "type": file_data.get("type", "application/pdf"),
                        "size": file_data.get("size", 0)
                    }
                }
                
                result = {
                    "output": f"File: {file_result['file_upload']['filename']}",
                    "type": "input_result",
                    "value": file_result,
                    "inputs": file_result,
                    "file_upload": file_result["file_upload"]
                }
                
                debug_node_data("INPUT NODE RESULT (FILE)", result)
                return result
        
        # Handle direct value
        result = {
            "output": f"Value: {str(value)[:50]}...",
            "type": "input_result",
            "value": value,
            "inputs": {"value": value}
        }
        
        debug_node_data("INPUT NODE RESULT (VALUE)", result)
        return result
        
    except Exception as e:
        logger.error(f"Input node error: {str(e)}")
        return {
            "output": str(e),
            "type": "error",
            "error": str(e)
        }

async def run_output_node(node_data, inputs, context=None):
    """
    Process an output node
    
    Args:
        node_data: Dictionary containing output node configuration
        inputs: Dictionary of inputs for the workflow
        context: Optional execution context
        
    Returns:
        Dictionary containing the output node result
    """
    try:
        output_type = node_data.get("outputType", "webhook")
        label = node_data.get("label", "Output Node")
        
        logger.info(f"Processing output node '{label}' of type '{output_type}'")
        
        # Initialize context if it's None
        if context is None:
            context = {}
            
        # Use inputs as the input_data if not available in context
        input_data = context.get("input_data", inputs)
        
        # Create output configuration based on node type
        output_config = {
            "emailEnabled": output_type == "email",
            "discordEnabled": output_type == "discord",
            "sheetsEnabled": output_type == "sheets",
            "webhookEnabled": output_type == "webhook"
        }
        
        # Add specific configuration based on output type
        if output_type == "webhook":
            output_config["webhookUrl"] = node_data.get("webhookUrl", "")
        elif output_type == "discord":
            output_config["discordWebhook"] = node_data.get("webhookUrl", "")
        elif output_type == "sheets":
            output_config["sheetId"] = node_data.get("sheetId", "")
        elif output_type == "email":
            output_config["email"] = node_data.get("email", "")
            output_config["emailSubject"] = node_data.get("emailSubject", "Workflow Results")
        
        # Use the unified output router
        from outputs.output_router import route_output
        results = route_output(input_data, output_config)
        
        # Return the results
        return {
            "output": str(results),
            "type": "output_result",
            "output_type": output_type,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in output node: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def run_tool_node(node_data, inputs, context=None):
    """Process a tool node"""
    try:
        debug_node_data("TOOL NODE START", node_data)
        debug_node_data("TOOL NODE INPUTS", inputs)
        
        # Get tool configuration
        tool_type = node_data.get("toolType", "custom")
        framework = node_data.get("framework", "huggingface")
        
        # Prepare tool data
        tool_data = {
            "label": node_data.get("label", "Unknown Tool"),
            "description": node_data.get("description", ""),
            "parameters": node_data.get("parameters", {}),
            "inputs": inputs
        }
        
        # Extract file data from inputs
        if isinstance(inputs, dict):
            # Check direct file_upload
            if "file_upload" in inputs:
                tool_data["file_upload"] = inputs["file_upload"]
            # Check in value
            elif "value" in inputs and isinstance(inputs["value"], dict):
                value = inputs["value"]
                if "file_upload" in value:
                    tool_data["file_upload"] = value["file_upload"]
            # Check in inputs
            elif any(isinstance(v, dict) and "file_upload" in v for v in inputs.values()):
                for v in inputs.values():
                    if isinstance(v, dict) and "file_upload" in v:
                        tool_data["file_upload"] = v["file_upload"]
                        break
        
        debug_node_data("TOOL DATA PREPARED", tool_data)
        
        # Execute tool based on framework
        if framework == "cv_parser":
            from frameworks.cv_parser_runner import run_cv_parser_tool
            result = run_cv_parser_tool(tool_data)
        elif framework == "huggingface":
            from frameworks.huggingface_runner import run_huggingface_tool
            result = run_huggingface_tool(tool_data)
        else:
            # Handle other frameworks...
            from frameworks.openrouter_runner import run_openrouter_tool
            result = run_openrouter_tool(tool_data)
            
        debug_node_data("TOOL NODE RESULT", result)
        return result
        
    except Exception as e:
        logger.error(f"Tool node error: {str(e)}")
        return {
            "output": str(e),
            "type": "error",
            "error": str(e)
        }

async def handle_trigger_node(node_data=None):
    """
    Local trigger handler to avoid dependency issues
    """
    logger.info("Using local handle_trigger_node function")  # Debug line
    
    # Safety check for None input
    if node_data is None:
        node_data = {}
    
    trigger_type = node_data.get("triggerType", "manual")
    trigger_id = node_data.get("nodeId", "unknown")
    label = node_data.get("label", "Trigger")
    
    # For scheduled triggers, register them for automatic execution
    if trigger_type == "schedule":
        try:
            from frameworks.trigger_storage import register_trigger
            
            # Get the current flow context from the global data
            # This is a safer approach than using undefined variables
            flow = {
                "trigger_id": trigger_id,
                "trigger_type": trigger_type,
                "trigger_data": node_data,
                # We'll get the connected nodes and edges when the flow is executed
                "metadata": {
                    "scheduled": True,
                    "created_at": datetime.now().isoformat()
                }
            }
            
            # Register the trigger
            register_trigger(trigger_id, flow)
            logger.info(f"Registered scheduled trigger: {trigger_id}")
        except Exception as e:
            logger.error(f"Error registering scheduled trigger: {str(e)}")
    
    return {
        "output": f"Trigger '{label}' of type '{trigger_type}' activated",
        "type": "trigger_status",
        "trigger_type": trigger_type,
        "trigger_id": trigger_id,
        "timestamp": datetime.now().isoformat()
    }