from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
import asyncio
import json
import os

from backend.models.nodes import Node, NodeType
from backend.models.workflow import ExecutionContext
from backend.models.results import NodeResult, ExecutionStatus
from backend.models.data import NodeData

logger = logging.getLogger(__name__)

class TaskNode:
    """Handles execution of task nodes"""

    async def process(self, node: Union[Node, Dict[str, Any]], inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Process a task node"""
        try:
            # Extract task configuration - handle both Node objects and dictionaries
            if isinstance(node, dict):
                # Handle dictionary format
                config = node.get("data", {})
                node_id = node.get("id", "unknown")
                task_name = config.get("label", "Unnamed Task")
                description = config.get("description", "")
                expected_output = config.get("expectedOutput", "")
                is_async = config.get("async", False) or config.get("isAsync", False)
                dependencies = config.get("dependencies", [])
            else:
                # Handle Node object format
                config = node.get_config()
                node_id = node.id
                task_name = config.label
                description = config.description
                expected_output = config.expected_output
                is_async = config.async_execution
                dependencies = config.dependencies

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
                return {
                    "success": False,
                    "type": "error",
                    "error": "Task requires at least one connected agent"
                }

            # Extract the primary agent (first in the list)
            primary_agent = connected_agents[0]
            agent_role = primary_agent.get("role", "Assistant")
            agent_goal = primary_agent.get("goal", "Help the user")
            
            # Find the user query and check for files in the inputs
            user_query = None
            file_data = None
            
            # First look for structured inputs with type and value
            for key, value in formatted_inputs.items():
                # Look for file inputs first
                if isinstance(value, dict) and value.get('type') == 'file' and 'value' in value:
                    file_data = value.get('value')
                    logger.info(f"Found file input: {file_data.get('filename', 'unknown file')}")
                    break
                
                # Look for structured text inputs
                elif isinstance(value, dict) and value.get('type') == 'text' and 'value' in value:
                    user_query = value.get('value')
                    logger.info(f"Found structured text input: {user_query}")
                    break
                    
                # Look for structured URL inputs
                elif isinstance(value, dict) and value.get('type') == 'url' and 'value' in value:
                    user_query = f"Please analyze this URL: {value.get('value')}"
                    logger.info(f"Found URL input: {value.get('value')}")
                    break
            
            # If no structured inputs found, look for other formats
            if not user_query and not file_data:
                for key, value in formatted_inputs.items():
                    # Simple dict with value key
                    if isinstance(value, dict) and 'value' in value and isinstance(value['value'], str):
                        user_query = value['value']
                        logger.info(f"Found value in dict: {user_query}")
                        break
                    # Nested data structure
                    elif isinstance(value, dict) and 'data' in value and isinstance(value['data'], dict):
                        for k, v in value['data'].items():
                            if isinstance(v, dict) and 'value' in v:
                                user_query = v.get('value')
                                logger.info(f"Found nested value in data: {user_query}")
                                break
                    # Direct string value
                    elif isinstance(value, str):
                        user_query = value
                        logger.info(f"Found direct string input: {user_query}")
                        break
            
            # Log the extracted data
            logger.debug(f"Extracted user query: {user_query}")
            if file_data:
                logger.debug(f"Extracted file: {file_data.get('filename', 'unknown file')}")
            
            # Use defaults if nothing was found
            if not user_query and not file_data:
                user_query = description or "Please provide information on this topic."
                logger.info(f"Using default query: {user_query}")
            
            # If we have a file but no query, create a prompt about the file
            if file_data and not user_query:
                filename = file_data.get('filename', 'this file')
                user_query = f"Please analyze {filename} and provide insights."
                logger.info(f"Created file analysis query: {user_query}")
            
            # Get the agent framework from configuration
            agent_framework = primary_agent.get("framework", "").lower()
            
            # Try to use the appropriate framework runner
            agent_response = "No response generated"
            try:
                if agent_framework == "crewai":
                    # Try to use the crewai runner
                    try:
                        from backend.frameworks.crewai_runner import run_crewai_agent
                        logger.info("Using CrewAI framework for agent task")
                        
                        # Prepare data for crewai_runner
                        agent_data = {
                            "role": agent_role,
                            "goal": agent_goal,
                            "backstory": primary_agent.get("backstory", ""),
                            "llm_config": {
                                "model": primary_agent.get("llmModel", "gpt-4"),
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "allow_delegation": primary_agent.get("allowDelegation", False)
                        }
                        
                        # Run the agent with the file if available
                        result = await run_crewai_agent(
                            agent_data=agent_data, 
                            query=user_query,
                            file_data=file_data
                        )
                        agent_response = result.get("output", "No response from CrewAI agent")
                    except ImportError as e:
                        logger.error(f"CrewAI runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"CrewAI execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                        
                elif agent_framework == "openai":
                    # Try to use direct OpenAI API
                    agent_response = await self._execute_openai_query(primary_agent, user_query)
                    
                elif agent_framework == "anthropic":
                    # Try to use direct Anthropic API
                    agent_response = await self._execute_anthropic_query(primary_agent, user_query)
                    
                else:
                    # Use a generic approach for other frameworks
                    agent_response = await self._execute_agent_query(primary_agent, user_query)
                    
            except Exception as e:
                logger.error(f"Error executing agent with framework {agent_framework}: {str(e)}")
                agent_response = f"Error executing agent with framework {agent_framework}: {str(e)}"

            # Create task result
            result = {
                "type": "task_result",
                "task_name": task_name,
                "description": description,
                "expected_output": expected_output,
                "is_async": is_async,
                "inputs": formatted_inputs,
                "status": "completed",  # Now marked as completed
                "timestamp": datetime.now().isoformat(),
                "result": agent_response,  # Add the agent response here
                "query": user_query  # Include the query that was processed
            }

            # Add connected agents info
            if connected_agents:
                result["agents"] = connected_agents

            # Get execution_id from context
            execution_id = context.execution_id if hasattr(context, 'execution_id') else context.get('execution_id', 'unknown')

            # Add task metadata
            result["metadata"] = {
                "node_id": node_id,
                "execution_id": execution_id,
                "dependencies": dependencies
            }

            return {
                "success": True,
                "type": "task_result",
                "data": result
            }

        except Exception as e:
            logger.error(f"Error in task node: {str(e)}")
            # Get task name safely
            task_name = "Unnamed Task"
            try:
                if isinstance(node, dict) and 'data' in node:
                    task_name = node['data'].get('label', "Unnamed Task")
            except:
                pass
                
            return {
                "success": False,
                "type": "error",
                "error": str(e),
                "task_name": task_name,
                "timestamp": datetime.now().isoformat()
            }
            
    async def _execute_agent_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using the specified agent configuration"""
        try:
            # Detect which LLM framework to use based on agent config
            framework = agent_config.get("framework", "openai").lower()
            
            if framework == "openai":
                return await self._execute_openai_query(agent_config, query)
            elif framework == "anthropic":
                return await self._execute_anthropic_query(agent_config, query)
            else:
                return f"Agent framework '{framework}' not supported. Query was: {query}"
                
        except Exception as e:
            logger.error(f"Error in agent execution: {str(e)}")
            return f"Error executing agent query: {str(e)}"
    
    async def _execute_openai_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using OpenAI"""
        try:
            import openai
            import os
            
            # Use environment variable or default to a demo key
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("No OpenAI API key found - returning simulated response")
                return f"[Simulated {agent_config.get('role')} response to: {query}]"
                
            # Configure client
            client = openai.Client(api_key=api_key)
            
            # Extract parameters from agent config
            model = agent_config.get("llmModel", "gpt-4")
            temperature = agent_config.get("temperature", 0.7)
            max_tokens = agent_config.get("max_tokens", 1000)
            
            # Create system message from role, goal, and backstory
            system_message = f"You are a {agent_config.get('role', 'Assistant')}. "
            system_message += f"Your goal is to {agent_config.get('goal', 'help the user')}. "
            
            if 'backstory' in agent_config:
                system_message += f"Backstory: {agent_config.get('backstory')}"
                
            # Create the completion - Note: No await here as it's not an async call in new OpenAI library
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": query}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract and return the response text
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            return f"Error with OpenAI: {str(e)}"
            
    async def _execute_anthropic_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using Anthropic"""
        try:
            import anthropic
            import os
            
            # Use environment variable or default to a demo key
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                logger.warning("No Anthropic API key found - returning simulated response")
                return f"[Simulated {agent_config.get('role')} response to: {query}]"
                
            # Configure client
            client = anthropic.Anthropic(api_key=api_key)
            
            # Extract parameters from agent config
            model = agent_config.get("llmModel", "claude-3-opus-20240229") 
            temperature = agent_config.get("temperature", 0.7)
            max_tokens = agent_config.get("max_tokens", 1000)
            
            # Create system message from role, goal, and backstory
            system_message = f"You are a {agent_config.get('role', 'Assistant')}. "
            system_message += f"Your goal is to {agent_config.get('goal', 'help the user')}. "
            
            if 'backstory' in agent_config:
                system_message += f"Backstory: {agent_config.get('backstory')}"
                
            # Create the completion
            response = client.messages.create(
                model=model,
                system=system_message,
                messages=[{"role": "user", "content": query}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract and return the response text
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Anthropic error: {str(e)}")
            return f"Error with Anthropic: {str(e)}"

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate task configuration"""
        required_fields = ['description']
        return all(field in config and config[field] for field in required_fields)

    def get_dependencies(self, node: Node) -> List[str]:
        """Get task dependencies"""
        config = node.get_config()
        return config.dependencies if config else []

    def is_async(self, node: Node) -> bool:
        """Check if task is asynchronous"""
        config = node.get_config()
        return config.async_execution if config else False 