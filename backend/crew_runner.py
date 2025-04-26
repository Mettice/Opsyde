import asyncio
import json
import logging
from typing import Dict, List, Any, AsyncGenerator, Optional, Union
import requests
import os
from datetime import datetime
from openai import AsyncOpenAI
import base64
import inspect
import aiohttp

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
            result = await process_node(node, node_results, inputs, context, node_results)
            
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

class UnifiedRunner:
    def __init__(self):
        self.client = AsyncOpenAI()
        self.frameworks = {}
        self._register_frameworks()
        logger.info("UnifiedRunner initialized with frameworks: %s", list(self.frameworks.keys()))

    async def run_agent_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run an agent node"""
        try:
            # Extract agent configuration
            agent_name = node_data.get('label', 'Unnamed Agent')
            role = node_data.get('role', '')
            goal = node_data.get('goal', '')
            backstory = node_data.get('backstory', '')
            llm_model = node_data.get('llmModel', 'gpt-4')
            temperature = float(node_data.get('temperature', 0.7))
            max_tokens = int(node_data.get('max_tokens', 500))
            allow_delegation = bool(node_data.get('allowDelegation', False))
            memory_enabled = bool(node_data.get('enableMemory', False))
            
            # Create agent result
            result = {
                "type": "agent_status",
                "agent_name": agent_name,
                "role": role,
                "goal": goal,
                "llm_model": llm_model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "allow_delegation": allow_delegation,
                "memory_enabled": memory_enabled,
                "status": "initialized",
                "timestamp": datetime.now().isoformat()
            }
            
            # Add any inputs to the result
            if inputs:
                result["inputs"] = inputs
                
            return result
            
        except Exception as e:
            logger.error(f"Error in agent node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "agent_name": node_data.get('label', 'Unnamed Agent'),
                "timestamp": datetime.now().isoformat()
            }

    def _register_node_runners(self):
        """Register all node runners"""
        self.node_runners = {
            'agent': self.run_agent_node,
            'task': self.run_task_node,
            'tool': self.run_tool_node,
            'chat': self.run_chat_node,
            'trigger': self.run_trigger_node,
            'input': self.run_input_node,
            'output': self.run_output_node,
            'delay': self.run_delay_node,
            'logic': self.run_logic_node
        }

    def _register_frameworks(self):
        """Register available frameworks"""
        try:
            # Register HuggingFace framework
            from frameworks.huggingface_runner import run_huggingface_tool
            self.frameworks["huggingface"] = run_huggingface_tool
            logger.info("Registered HuggingFace framework")
            
            # Register OpenAI framework
            self.frameworks["openai"] = self.run_openai_tool
            logger.info("Registered OpenAI framework")
            
            # Register node runners after frameworks
            self._register_node_runners()
            
        except ImportError as e:
            logger.warning(f"Failed to register framework: {str(e)}")

    async def run_openai_tool(self, tool_data: Dict[str, Any], inputs: Dict[str, Any] = {}) -> Dict[str, Any]:
        """Execute OpenAI-based tool"""
        try:
            # Extract tool settings
            model = tool_data.get("model", "gpt-4")
            temperature = float(tool_data.get("temperature", 0.7))
            max_tokens = int(tool_data.get("max_tokens", 4000))
            
            # Build prompt from tool data and inputs
            prompt = tool_data.get("prompt", "")
            if inputs:
                prompt = f"{prompt}\n\nInputs:\n{json.dumps(inputs, indent=2)}"
            
            # Execute with OpenAI
            completion = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return {
                "type": "tool_result",
                "output": completion.choices[0].message.content,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in OpenAI tool: {str(e)}")
            return {"type": "error", "error": str(e)}

    def _format_error(self, error_type: str, message: str, node_id: str = None, node_type: str = None, details: Dict = None) -> Dict[str, Any]:
        """Format error response consistently"""
        return {
            "type": "error",
            "error": {
                "type": error_type,
                "message": message,
                "node_id": node_id,
                "node_type": node_type,
                "details": details or {},
                "timestamp": datetime.now().isoformat()
            }
        }

    async def run_tool_node(self, tool_data: Dict[str, Any], inputs: Dict[str, Any] = {}) -> Dict[str, Any]:
        """Execute tool with proper framework handling"""
        try:
            # Get tool settings
            framework = tool_data.get("framework", "").lower()
            if not framework:
                return self._format_error(
                    "missing_framework",
                    "Tool framework is required",
                    tool_data.get("node_id"),
                    "tool"
                )
                
            logger.info(f"Executing {framework} tool with data: {tool_data}")
            
            # Get framework configuration
            framework_config = tool_data.get("frameworkConfig", {})
            if not framework_config:
                return self._format_error(
                    "missing_config",
                    f"Configuration required for {framework} framework",
                    tool_data.get("node_id"),
                    "tool"
                )

            # Execute based on framework type
            if framework == "openai":
                return await self._run_openai_tool(framework_config, inputs)
            elif framework == "huggingface":
                return await self._run_huggingface_tool(framework_config, inputs)
            elif framework == "webhook":
                return await self._run_webhook_tool(framework_config, inputs)
            else:
                return self._format_error(
                    "unsupported_framework",
                    f"Unsupported framework: {framework}",
                    tool_data.get("node_id"),
                    "tool"
                )
            
        except Exception as e:
            logger.error(f"Error in tool node: {str(e)}")
            return self._format_error(
                "execution_error",
                str(e),
                tool_data.get("node_id"),
                "tool",
                {"traceback": str(e.__traceback__)}
            )

    async def _run_openai_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute OpenAI-based tool"""
        try:
            # Extract configuration
            model = config.get("model", "gpt-4")
            temperature = float(config.get("temperature", 0.7))
            max_tokens = int(config.get("max_tokens", 4000))
            prompt_template = config.get("prompt", "")

            # Build prompt with parameters
            prompt = prompt_template
            if inputs:
                # Replace parameter placeholders
                for key, value in inputs.items():
                    placeholder = f"{{{{{key}}}}}"
                    prompt = prompt.replace(placeholder, str(value))

            # Execute with OpenAI
            completion = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )

            return {
                "type": "tool_result",
                "output": completion.choices[0].message.content,
                "framework": "openai",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in OpenAI tool: {str(e)}")
            return self._format_error(
                "openai_error",
                str(e),
                None,
                "tool",
                {"config": config}
            )

    async def _run_huggingface_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute HuggingFace-based tool"""
        try:
            # Extract configuration
            model = config.get("model")
            task = config.get("task")
            
            if not model or not task:
                return self._format_error(
                    "invalid_config",
                    "Model and task are required for HuggingFace tools",
                    None,
                    "tool"
                )

            # Import HuggingFace runner
            from frameworks.huggingface_runner import run_huggingface_tool
            
            # Prepare tool data for HuggingFace runner
            hf_data = {
                "model": model,
                "task": task,
                "inputs": inputs
            }

            # Execute with HuggingFace
            result = await run_huggingface_tool(hf_data)

            return {
                "type": "tool_result",
                "output": result.get("output"),
                "framework": "huggingface",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in HuggingFace tool: {str(e)}")
            return self._format_error(
                "huggingface_error",
                str(e),
                None,
                "tool",
                {"config": config}
            )

    async def _run_webhook_tool(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute webhook-based tool"""
        try:
            # Extract configuration
            url = config.get("url")
            method = config.get("method", "POST").upper()
            headers = config.get("headers", {})
            
            if not url:
                return self._format_error(
                    "invalid_config",
                    "URL is required for webhook tools",
                    None,
                    "tool"
                )

            # Make HTTP request
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=inputs
                ) as response:
                    result = await response.json()

            return {
                "type": "tool_result",
                "output": result,
                "framework": "webhook",
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in webhook tool: {str(e)}")
            return self._format_error(
                "webhook_error",
                str(e),
                None,
                "tool",
                {"config": config}
            )

    async def run_trigger_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a trigger node"""
        try:
            trigger_type = node_data.get('triggerType', 'manual')
            trigger_id = node_data.get('nodeId')
            
            if not trigger_id:
                raise ValueError("Trigger node requires a nodeId")
                
            result = {
                "type": "trigger_result",
                "trigger_type": trigger_type,
                "trigger_id": trigger_id,
                "status": "triggered",
                "timestamp": datetime.now().isoformat()
            }
            
            # Add any inputs to the result
            if inputs:
                result["inputs"] = inputs
                
            return result
            
        except Exception as e:
            logger.error(f"Error in trigger node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "trigger_id": node_data.get('nodeId'),
                "timestamp": datetime.now().isoformat()
            }

    async def run_agent_task_node(self, agent_data: Dict[str, Any], task_data: Dict[str, Any], inputs: Dict[str, Any] = {}) -> Dict[str, Any]:
        """Execute agent task with proper settings"""
        try:
            # Validate inputs
            if not agent_data:
                return self._format_error(
                    "missing_agent",
                    "Agent data is required",
                    task_data.get("node_id"),
                    "task"
                )
            if not task_data:
                return self._format_error(
                    "missing_task",
                    "Task data is required",
                    task_data.get("node_id"),
                    "task"
                )
                
            logger.info(f"Executing agent task with agent_data: {agent_data}, task_data: {task_data}")
                
            # Build settings
            settings = {
                "model": agent_data.get("llm_model", "gpt-4"),
                "temperature": float(agent_data.get("temperature", 0.7)),
                "max_tokens": int(agent_data.get("max_tokens", 4000)),
                "memory_enabled": bool(agent_data.get("memory_enabled", False))
            }
            
            # Build prompt
            task_desc = task_data.get("description", "")
            prompt_override = agent_data.get("prompt_override", "")
            cv_data = inputs.get("cv_data", {})
            
            prompt = f"""Task: {task_desc}
            
CV Data:
{json.dumps(cv_data, indent=2)}

{prompt_override if prompt_override else 'Please complete the task based on the CV data provided.'}"""

            # Execute with OpenAI
            completion = await self.client.chat.completions.create(
                model=settings["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=settings["temperature"],
                max_tokens=settings["max_tokens"]
            )
            
            return {
                "type": "agent_result",
                "output": completion.choices[0].message.content,
                "settings": settings,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in agent task: {str(e)}")
            return self._format_error(
                "execution_error",
                str(e),
                task_data.get("node_id"),
                "task",
                {"agent_data": agent_data, "task_data": task_data, "traceback": str(e.__traceback__)}
            )

    async def run_output_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Handle output node execution"""
        try:
            # Extract output configuration
            output_type = node_data.get('outputType', 'webhook')
            
            # Format the result based on output type
            result = {
                "type": "output_result",
                "output_node": {
                    "label": node_data.get('label', 'Output'),
                    "outputType": output_type,
                    "description": node_data.get('description', ''),
                    "nodeId": node_data.get('nodeId'),
                    "nodeType": "output"
                },
                "result": inputs or {},
                "timestamp": datetime.now().isoformat()
            }

            # Add type-specific configuration
            if output_type == 'webhook':
                result["output_node"]["webhook_url"] = node_data.get('webhookUrl', '')
            elif output_type == 'email':
                result["output_node"]["email"] = node_data.get('email', '')
            elif output_type == 'sheets':
                result["output_node"]["sheetId"] = node_data.get('sheetId', '')
            elif output_type == 'discord':
                result["output_node"]["webhook_url"] = node_data.get('webhookUrl', '')

            # Process output based on type
            if output_type == 'email':
                from email_runner import send_email
                email_result = send_email(result, node_data.get('email'))
                result["email_status"] = email_result
            elif output_type == 'webhook':
                webhook_url = node_data.get('webhookUrl')
                if webhook_url:
                    try:
                        async with aiohttp.ClientSession() as session:
                            async with session.post(webhook_url, json=result) as response:
                                result["webhook_status"] = {
                                    "status_code": response.status,
                                    "success": 200 <= response.status < 300
                                }
                    except Exception as e:
                        result["webhook_status"] = {
                            "error": str(e),
                            "success": False
                        }
            elif output_type == 'sheets':
                from sheets_runner import push_to_sheet
                sheet_result = push_to_sheet(result, node_data.get('sheetId'))
                result["sheets_status"] = sheet_result
            elif output_type == 'discord':
                from discord_runner import post_to_discord
                discord_result = post_to_discord(result, node_data.get('webhookUrl'))
                result["discord_status"] = discord_result

            return result

        except Exception as e:
            logger.error(f"Error in output node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "output_type": node_data.get('outputType', 'webhook'),
                "timestamp": datetime.now().isoformat()
            }

    async def run_input_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Handle input node execution"""
        try:
            # Extract input configuration
            input_type = node_data.get('inputType', 'text')
            variable_name = node_data.get('variableName', '')
            is_required = bool(node_data.get('isRequired', False))
            
            # Get the input value
            input_value = None
            if inputs:
                if isinstance(inputs, dict):
                    # Try to get the value from different possible locations
                    if 'value' in inputs:
                        input_value = inputs['value']
                    elif 'text_input' in inputs:
                        input_value = inputs['text_input']
                    elif 'file_upload' in inputs:
                        input_value = inputs['file_upload']
                else:
                    input_value = inputs

            # Validate required input
            if is_required and not input_value:
                return {
                    "type": "error",
                    "error": f"Required input '{variable_name}' is missing",
                    "input_type": input_type,
                    "timestamp": datetime.now().isoformat()
                }

            # Format the result
            result = {
                "type": "input_result",
                "input_type": input_type,
                "variable_name": variable_name,
                "value": input_value,
                "timestamp": datetime.now().isoformat()
            }

            return result

        except Exception as e:
            logger.error(f"Error in input node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "input_type": node_data.get('inputType', 'text'),
                "timestamp": datetime.now().isoformat()
            }

    async def run_task_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a task node"""
        try:
            # Extract task configuration
            task_name = node_data.get('label', 'Unnamed Task')
            description = node_data.get('description', '')
            expected_output = node_data.get('expectedOutput', '')
            is_async = bool(node_data.get('async', False))
            
            # Format input data
            formatted_inputs = {}
            if inputs:
                for key, value in inputs.items():
                    if isinstance(value, dict):
                        if 'output' in value:
                            formatted_inputs[key] = value['output']
                        elif 'value' in value:
                            formatted_inputs[key] = value['value']
                        elif 'result' in value:
                            formatted_inputs[key] = value['result']
                        else:
                            formatted_inputs[key] = value
                    else:
                        formatted_inputs[key] = value

            # Check for connected agents
            connected_agents = inputs.get('connected_agents', [])
            if not connected_agents:
                logger.warning(f"No agents connected to task: {task_name}")

            # Create task result
            result = {
                "type": "task_result",
                "task_name": task_name,
                "description": description,
                "expected_output": expected_output,
                "is_async": is_async,
                "inputs": formatted_inputs,
                "status": "initialized",
                "timestamp": datetime.now().isoformat()
            }

            # Add connected agents info if available
            if connected_agents:
                result["agents"] = connected_agents

            return result

        except Exception as e:
            logger.error(f"Error in task node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "task_name": node_data.get('label', 'Unnamed Task'),
                "timestamp": datetime.now().isoformat()
            }

    async def run_chat_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a chat node by delegating to the existing chat_runner"""
        try:
            from chat_runner import run_chat_node
            return await run_chat_node(node_data, inputs or {})
        except Exception as e:
            logger.error(f"Error in chat node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "node_type": "chat",
                    "session_id": node_data.get("nodeId", "default")
                }
            }

    async def run_delay_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a delay node by delegating to the existing delay_runner"""
        try:
            from delay_runner import run_delay_node
            return await run_delay_node(node_data, inputs or {})
        except Exception as e:
            logger.error(f"Error in delay node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "node_type": "delay",
                    "session_id": node_data.get("nodeId", "default")
                }
            }

    async def run_logic_node(self, node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a logic node by delegating to the existing logic_runner"""
        try:
            from logic_runner import run_logic_node
            return await run_logic_node(node_data, inputs or {})
        except Exception as e:
            logger.error(f"Error in logic node: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "node_type": "logic",
                    "session_id": node_data.get("nodeId", "default")
                }
            }

async def process_node(node: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Process a single node in the workflow"""
    try:
        # Check both nodeType and type fields
        node_type = node.get("nodeType") or node.get("type")
        if not node_type:
            return {"error": "Missing node type", "type": "error"}

        # Initialize UnifiedRunner if not already done
        if not hasattr(process_node, "runner"):
            process_node.runner = UnifiedRunner()

        # Route based on node type
        if node_type == "tool":
            return await process_node.runner.run_tool_node(node, inputs)
        elif node_type == "trigger":
            return await process_node.runner.run_trigger_node(node, inputs)
        elif node_type == "agent":
            task = find_agent_for_task(node.get("id"), context.get("edges", []), context.get("nodes", []))
            if task:
                return await process_node.runner.run_agent_task_node(node, task, inputs)
        elif node_type == "output":
            return await process_node.runner.run_output_node(node, inputs)
        elif node_type in ["chat", "chatbot"]:  # Handle both chat and chatbot node types
            # Ensure we have the chat node data
            chat_data = node.get("data", {})
            if not chat_data:
                return {"error": "Missing chat node data", "type": "error"}
            # Add the node type to the chat data for proper handling
            chat_data["nodeType"] = "chat"
            return await run_chat_node(chat_data, inputs)
        elif node_type == "delay":
            return await process_node.runner.run_delay_node(node, inputs)
        elif node_type == "logic":
            return await process_node.runner.run_logic_node(node, inputs)
        else:
            return {"error": f"No executor found for node type: {node_type}", "type": "error"}

    except Exception as e:
        logger.error(f"Error processing node: {str(e)}")
        return {"error": str(e), "type": "error"}

# Create a global instance of the UnifiedRunner
runner = UnifiedRunner()

def safe_get(obj, key, default=None):
    """Safely get a value from a dictionary, handling None cases"""
    if obj is None:
        return default
    try:
        return obj.get(key, default)
    except (AttributeError, TypeError):
        return default

async def run_crewai_workflow(crew_config, framework="crewai"):
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