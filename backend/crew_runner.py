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
from frameworks.file_handler import FileData

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
from frameworks.cv_parser_runner import run_cv_parser_tool

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
        context = {"edges": edges}
        
        # Initialize node_results to store outputs
        node_results = {}
        
        # Process nodes in execution order
        execution_order = determine_execution_order(nodes, edges)
        
        for node_id in execution_order:
            node = next((n for n in nodes if n.get("id") == node_id), None)
            if not node:
                continue

            # Execute node
            result = await process_node(node, len(node_results), inputs, context, node_results)
            
            # Format result for output
            output = {
                "node_id": node_id,
                "node_type": node.get("type", "unknown"),
                "node_label": node.get("data", {}).get("label", "Unnamed Node"),
                "result": result
            }
            
            # Add execution metadata
            output["metadata"] = {
                "timestamp": datetime.now().isoformat(),
                "execution_index": len(node_results),
                "has_error": result.get("type") == "error" if isinstance(result, dict) else False
            }
            
            # Yield formatted result
            yield json.dumps(output)

    except Exception as e:
        logger.error(f"Error in run_crew: {str(e)}")
        yield json.dumps({
            "error": str(e),
            "type": "error",
            "timestamp": datetime.now().isoformat()
        })


# Utility methods

def build_dependency_graph(nodes: List[Dict], edges: List[Dict]) -> Dict[str, List[str]]:
    graph = {node.get("id"): [] for node in nodes}
    for edge in edges:
        source, target = edge.get("source"), edge.get("target")
        if source and target:
            graph[target].append(source)
    return graph

def determine_execution_order(nodes: List[Dict], edges: List[Dict]) -> List[str]:
    """
    Determine the execution order of nodes based on their dependencies
    
    Args:
        nodes: List of node dictionaries
        edges: List of edge dictionaries
        
    Returns:
        List of node IDs in execution order
    """
    # Build dependency graph
    graph = {}
    for node in nodes:
        node_id = node.get("id")
        if node_id:
            graph[node_id] = []
    
    # Add dependencies from edges
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        if source and target and source in graph and target in graph:
            graph[target].append(source)
    
    # Topological sort
    visited = set()
    temp = set()
    order = []
    
    def visit(node_id):
        if node_id in temp:
            raise ValueError("Cycle detected in workflow")
        if node_id in visited:
            return
        temp.add(node_id)
        for dep in graph.get(node_id, []):
            visit(dep)
        temp.remove(node_id)
        visited.add(node_id)
        order.append(node_id)
    
    # Visit all nodes
    for node_id in graph:
        if node_id not in visited:
            visit(node_id)
    
    return order

def get_node_inputs(node_id: str, edges: List[Dict], node_results: Dict[str, Any], global_inputs: Dict[str, Any]) -> Dict[str, Any]:
    inputs = dict(global_inputs)
    logger.info(f"\n{'='*50}\nProcessing inputs for node {node_id}\n{'='*50}")
    logger.info(f"Global inputs: {json.dumps(global_inputs, default=str)}")
    logger.info(f"Current node results: {json.dumps(node_results, default=str)}")
    
    # Track connected agents for tasks
    connected_agents = []
    
    for edge in edges:
        if edge.get("target") == node_id:
            source_id = edge.get("source")
            if source_id in node_results:
                label = edge.get("data", {}).get("label", f"input_from_{source_id}")
                source_output = node_results[source_id]
                logger.info(f"\nProcessing edge from {source_id} to {node_id}")
                logger.info(f"Edge label: {label}")
                logger.info(f"Source output: {json.dumps(source_output, default=str)}")
                
                # Skip if source output is an error
                if isinstance(source_output, dict) and source_output.get("type") == "error":
                    logger.warning(f"Skipping error input from {source_id}: {source_output.get('error')}")
                    continue
                
                # Track agent connections
                if source_output.get("type") == "agent_status":
                    connected_agents.append(source_output)
                
                if isinstance(source_output, dict):
                    # If source_output has a value with file data, preserve it exactly as is
                    if "value" in source_output and isinstance(source_output["value"], dict):
                        if all(k in source_output["value"] for k in ["filename", "content", "type"]):
                            inputs[label] = source_output
                            logger.info("Preserved file data structure with content")
                        else:
                            inputs[label] = source_output
                            logger.info("Preserved value structure")
                    # If source is an agent and target is a task, store agent data
                    elif source_output.get("type") == "agent_status" and label == "agent":
                        inputs["agent"] = source_output
                        logger.info("Stored agent data for task")
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
    
    # If this is a task node and we found connected agents, ensure they're available
    if connected_agents:
        inputs["connected_agents"] = connected_agents
    
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
    """Process a node in the workflow"""
    node_id = node.get("id")
    node_type = node.get("type", "unknown").lower()  # Normalize node type
    node_data = node.get("data", {})
    
    logger.info(f"Processing node: {node_id} of type {node_type}")
    
    try:
        # Get inputs for this node from connected nodes
        node_inputs = get_node_inputs(node_id, context.get("edges", []), node_results, inputs)
        
        # Check if any input contains an error
        if any(isinstance(input, dict) and input.get("type") == "error" for input in node_inputs.values()):
            logger.warning(f"Skipping node {node_id} due to previous error in inputs")
            return {
                "output": "Skipping node due to previous error",
                "type": "error",
                "error": "Previous node failed",
                "node_id": node_id
            }
        
        if node_type in ["agent", "ai_agent"]:
            result = await run_agent_node(node_data, node_inputs, context)
            # Store agent result in context for tasks
            context["current_agent"] = result
        elif node_type == "task":
            # Get agent from inputs or context
            agent_data = node_inputs.get("agent") or node_inputs.get("connected_agents", [None])[0]
            if agent_data and agent_data.get("type") == "agent_status":
                node_data["agent"] = agent_data
            result = await run_task_node(node_data, node_inputs, context)
        elif node_type == "tool":
            result = await run_tool_node(node_data, node_inputs, context)
        elif node_type == "chat":
            result = await run_chat_node(node_data, node_inputs, context)
        elif node_type == "delay":
            result = await run_delay_node(node_data)
        elif node_type in ["input", "file_input"]:  # Handle both input types
            result = await run_input_node(node_data, node_inputs, context)
        elif node_type == "trigger":
            result = await handle_trigger_node(node_data)
        elif node_type == "logic":
            result = await run_logic_node(node_data, node_inputs, context)
        elif node_type == "output":
            result = await run_output_node(node_data, node_inputs, context)
        else:
            result = {
                "output": f"Unknown node type: {node_type}",
                "type": "error"
            }
        
        node_results[node_id] = result
        return result
    except Exception as e:
        logger.error(f"Error processing {node_type} node: {str(e)}")
        error_result = {
            "output": f"Node execution failed: {str(e)}",
            "type": "error",
            "error": str(e),
            "node_id": node_id
        }
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
    """Execute a task node"""
    try:
        task_name = node_data.get("label", "Unknown Task")
        task_description = node_data.get("description", "No description")
        
        logger.info(f"Executing task '{task_name}': {task_description}")
        
        # Get the agent from node_data or context
        agent_data = node_data.get("agent") or (context or {}).get("current_agent")
        
        if agent_data and agent_data.get("type") == "agent_status":
            # Use the agent to execute the task
            result = {
                "output": f"Task '{task_name}' executed by {agent_data.get('agent_name')}",
                "type": "task_result",
                "task_name": task_name,
                "agent": agent_data.get("agent_name"),
                "result": f"Processed task using {agent_data.get('agent_role')}"
            }
        else:
            # No agent found, return error
            result = {
                "output": f"Task '{task_name}' requires an agent",
                "type": "error",
                "error": "No agent available for task execution"
            }
            
        return result
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
        logger.info(f"\n{'='*20} INPUT NODE START {'='*20}")
        logger.info(f"Processing input node: {node_data.get('label', 'Unnamed Input')}")
        
        if not node_data:
            logger.error("No node data provided")
            return {
                "output": "No input data provided",
                "type": "error",
                "error": "Missing node data"
            }

        # Get input type and variable name
        input_type = node_data.get('inputType', 'text')
        var_name = node_data.get('variableName', '')
        
        logger.info(f"Input type: {input_type}")
        logger.info(f"Variable name: {var_name}")

        # Handle file upload input
        if input_type == 'file':
            # Check inputs structure
            logger.info("File input detected, checking data structure...")
            logger.info(f"Available inputs: {list(inputs.keys())}")
            
            # Try to find file data in various locations
            file_data = None
            
            # Check in direct inputs
            if var_name in inputs:
                logger.info(f"Found data in direct inputs under {var_name}")
                file_data = inputs[var_name]
            
            # Check in value.file_upload structure
            elif var_name in inputs and isinstance(inputs[var_name], dict):
                value_data = inputs[var_name].get('value', {})
                if isinstance(value_data, dict) and 'file_upload' in value_data:
                    logger.info("Found data in value.file_upload structure")
                    file_data = value_data['file_upload']
            
            # Check in file_upload directly
            elif 'file_upload' in inputs:
                logger.info("Found data in file_upload")
                file_data = inputs['file_upload']

            if not file_data:
                logger.error("No file data found in inputs")
                return {
                    "output": "No file data provided",
                    "type": "error",
                    "error": "Missing file data"
                }

            logger.info(f"File data structure: {json.dumps(file_data, default=str)[:200]}...")
            
            # Return standardized file data structure
            return {
                "output": f"File input processed: {file_data.get('filename', 'unnamed')}",
                "type": "file_input",
                "file_data": file_data,
                "variable_name": var_name
            }

        # Handle text input
        else:
            text_value = ""
            if var_name in inputs:
                input_data = inputs[var_name]
                if isinstance(input_data, dict) and 'value' in input_data:
                    if isinstance(input_data['value'], dict):
                        text_value = input_data['value'].get('text_input', '')
                    else:
                        text_value = str(input_data['value'])
                else:
                    text_value = str(input_data)

            return {
                "output": f"Text input processed: {text_value[:100]}...",
                "type": "text_input",
                "text": text_value,
                "variable_name": var_name
            }

    except Exception as e:
        logger.error(f"Error executing {node_data.get('label', 'Input')}: {str(e)}")
        logger.exception(e)
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
    """Run a tool node with the given data"""
    try:
        tool_type_raw = node_data.get("toolType", "").lower()
        custom_tool = node_data.get("customTool", "").lower()

        # Normalize custom tool handling
        tool_type = custom_tool if tool_type_raw == "custom" and custom_tool else tool_type_raw
        
        logger.info(f"Running tool node: {tool_type} (custom: {custom_tool})")
        logger.info(f"Tool inputs: {json.dumps(inputs, default=str)}")

        # Handle CV parser tool
        if tool_type == "cv_parser":
            return await run_cv_parser_tool(node_data, inputs)
            
        # Handle other tool types...
        elif tool_type == "huggingface":
            return await run_huggingface_tool(node_data, inputs)
        elif tool_type == "llamaindex":
            return await run_llamaindex_tool(node_data, inputs)
        elif tool_type == "autogen":
            return await run_autogen_tool(node_data, inputs)
        elif tool_type == "openrouter":
            return await run_openrouter_tool(node_data, inputs)
        elif tool_type == "crewai":
            return run_crewai_workflow(node_data)
        elif tool_type == "api":
            return await run_api_tool(node_data, inputs)
        elif tool_type == "clearbit":
            return await run_clearbit_tool(node_data, inputs)
        elif tool_type == "lead_scorer":
            return await run_lead_scorer(node_data, inputs)
        elif tool_type == "log_lead":
            return await run_log_lead_to_sheet(node_data, inputs)
        elif tool_type == "crm_logger":
            return await run_crm_logger_tool(node_data, inputs)
        elif tool_type == "discord_notifier":
            return await run_discord_notifier(node_data, inputs)
        elif tool_type == "readiness_check":
            return await run_readiness_check(node_data, inputs)
        else:
            return {
                "error": f"Unknown tool type: {tool_type}",
                "type": "error"
            }
    except Exception as e:
        logger.error(f"Error running tool node: {str(e)}")
        return {
            "error": str(e),
            "type": "error"
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