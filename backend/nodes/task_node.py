from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
import asyncio
import json
import os

from models.nodes import Node, NodeType
from models.workflow import ExecutionContext
from models.results import NodeResult, ExecutionStatus
from models.data import NodeData

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
                # CRITICAL: Get enhanced frameworkConfig from workflow context
                enhanced_framework_config = config.get("frameworkConfig", {})
                logger.info(f"🔧 TaskNode enhanced frameworkConfig from context: {enhanced_framework_config}")
            else:
                # Handle Node object format
                config = node.get_config()
                node_id = node.id
                task_name = config.label
                description = config.description
                expected_output = config.expected_output
                is_async = config.async_execution
                dependencies = config.dependencies
                # CRITICAL: Get enhanced frameworkConfig from workflow context
                enhanced_framework_config = getattr(config, 'frameworkConfig', {}) or {}
                logger.info(f"🔧 TaskNode enhanced frameworkConfig from Node object: {enhanced_framework_config}")

            # Format input data
            formatted_inputs = {}
            if inputs:
                for key, value in inputs.items():
                    if hasattr(value, 'value') and isinstance(value.value, dict):
                        # Handle NodeData objects - extract the nested value
                        nested_value = value.value
                        if 'value' in nested_value and isinstance(nested_value['value'], dict):
                            # Double nested (NodeData.value.value)
                            formatted_inputs[key] = nested_value['value']
                        else:
                            # Single nested (NodeData.value)
                            formatted_inputs[key] = nested_value
                    elif isinstance(value, dict):
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

            # DEBUG: Log what inputs we're receiving
            logger.info(f"Task {task_name} received inputs: {list(inputs.keys())}")
            for key, value in inputs.items():
                logger.info(f"Input '{key}': type={type(value)}, value={value}")
            logger.info(f"Formatted inputs: {formatted_inputs}")

            # Check for connected agents - look in actual inputs from connected nodes
            connected_agents = []
            
            # Look for agent results in the inputs
            for key, value in formatted_inputs.items():
                if isinstance(value, dict):
                    # Check if this is an agent result
                    if (value.get('type') == 'agent_result' or 
                        'agent_name' in value or 
                        'role' in value or
                        key.startswith('agent-') or
                        key.startswith('input_from_agent-')):
                        
                        # Extract agent info from the result or metadata
                        metadata = value.get('metadata', {})
                        data = value.get('data', {})
                        
                        agent_info = {
                            "role": (data.get("role") or metadata.get("role") or "Assistant"),
                            "goal": (data.get("goal") or metadata.get("goal") or "Help the user"),
                            "backstory": (data.get("backstory") or metadata.get("backstory") or ""),
                            "framework": (metadata.get("framework") or data.get("framework") or "crewai"),
                            "llmModel": (
                                data.get("llm", {}).get("model") or           # New frontend format
                                data.get("llmModel") or                       # Legacy format
                                data.get("llm_model") or                      # Alternative format
                                metadata.get("llm", {}).get("model") or      # Metadata new format
                                metadata.get("llmModel") or                   # Metadata legacy format
                                metadata.get("llm_model") or                  # Metadata alternative format
                                value.get("llm", {}).get("model") or         # Direct value check
                                value.get("llmModel") or                      # Direct value legacy
                                "llama-3.1-sonar-small-128k-online"          # Default to Perplexity model
                            ),
                            "llmProvider": (
                                data.get("llm", {}).get("provider") or        # New frontend format
                                data.get("llmProvider") or                     # Legacy format
                                data.get("llm_provider") or                    # Alternative format
                                metadata.get("llm", {}).get("provider") or    # Metadata new format
                                metadata.get("llmProvider") or                 # Metadata legacy format
                                metadata.get("llm_provider") or                # Metadata alternative format
                                value.get("llm", {}).get("provider") or       # Direct value check
                                value.get("llmProvider") or                    # Direct value legacy
                                "perplexity"                                   # Default to perplexity
                            ),
                            "temperature": (data.get("temperature") or metadata.get("temperature") or 0.7),
                            "max_tokens": (data.get("max_tokens") or metadata.get("max_tokens") or 4000),
                            "allowDelegation": (data.get("allow_delegation") or metadata.get("allow_delegation") or False)
                        }
                        connected_agents.append(agent_info)
                        logger.info(f"Found connected agent: {agent_info['role']} (framework: {agent_info['framework']})")
            
            # If no agents found in formatted inputs, check the original inputs
            if not connected_agents:
                for key, value in inputs.items():
                    if hasattr(value, 'value') and isinstance(value.value, dict):
                        agent_data = value.value
                        if (agent_data.get('type') == 'agent_result' or 
                            'agent_name' in agent_data or 
                            'role' in agent_data):
                            
                            agent_info = {
                                "role": agent_data.get("role", "Assistant"),
                                "goal": agent_data.get("goal", "Help the user"),
                                "backstory": agent_data.get("backstory", ""),
                                "framework": agent_data.get("framework", "crewai"),
                                "llmModel": (
                                    agent_data.get("llm", {}).get("model") or     # New frontend format
                                    agent_data.get("llmModel") or                 # Legacy format
                                    agent_data.get("llm_model") or                # Alternative format
                                    "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model
                                ),
                                "llmProvider": (
                                    agent_data.get("llm", {}).get("provider") or  # New frontend format
                                    agent_data.get("llmProvider") or              # Legacy format
                                    agent_data.get("llm_provider") or             # Alternative format
                                    "perplexity"                                  # Default to perplexity
                                ),
                                "temperature": agent_data.get("temperature", 0.7),
                                "max_tokens": agent_data.get("max_tokens", 4000),
                                "allowDelegation": agent_data.get("allow_delegation", False)
                            }
                            connected_agents.append(agent_info)
                            logger.info(f"Found connected agent in NodeData: {agent_info['role']}")
            
            if not connected_agents:
                logger.warning(f"No agents connected to task: {task_name}")
                # Check if this is a data processing task that doesn't need an agent
                if formatted_inputs:
                    logger.info(f"Task {task_name} will process data without agent")
                    # Process the task as a data transformation/processing task
                    agent_response = await self._process_data_task(task_name, description, formatted_inputs, expected_output)
                else:
                    return {
                        "success": False,
                        "type": "error",
                        "error": "Task requires at least one connected agent or input data to process"
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
                        from frameworks.crewai_runner import EnhancedCrewAIRunner
                        logger.info("Using CrewAI framework for agent task")
                        
                        # Create CrewAI runner instance
                        crewai_runner = EnhancedCrewAIRunner()
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "openai"                                          # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        agent_data = {
                            "role": agent_role,
                            "goal": agent_goal,
                            "backstory": primary_agent.get("backstory", ""),
                            "frameworkConfig": enhanced_framework_config if enhanced_framework_config else {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "allowDelegation": primary_agent.get("allowDelegation", False),
                            "enableMemory": False,
                            "verbose": True
                        }
                        
                        # Check if context has the get_api_key_for_framework method
                        if hasattr(context, 'get_api_key_for_framework'):
                            # Get API key from execution context
                            api_key = context.get_api_key_for_framework('perplexity')
                            if api_key:
                                enhanced_framework_config['api_key'] = api_key
                                enhanced_framework_config['perplexity_api_key'] = api_key
                                agent_data["frameworkConfig"]["api_key"] = api_key
                                agent_data["frameworkConfig"]["perplexity_api_key"] = api_key
                                logger.info(f"🔑 TaskNode: Got API key from execution context for perplexity")
                            else:
                                logger.warning(f"⚠️ TaskNode: No API key found in execution context for perplexity")
                        else:
                            logger.warning(f"⚠️ TaskNode: Context does not have get_api_key_for_framework method. Context type: {type(context)}")
                            
                            # FALLBACK: Try to get API key from the connected agent's frameworkConfig
                            if formatted_inputs:
                                for input_key, input_value in formatted_inputs.items():
                                    if isinstance(input_value, dict) and 'metadata' in input_value:
                                        agent_metadata = input_value.get('metadata', {})
                                        if 'agent_result' in agent_metadata:
                                            agent_result = agent_metadata['agent_result']
                                            # Check if the agent has frameworkConfig with API key
                                            if isinstance(agent_result, dict):
                                                # Try to extract API key from various possible locations
                                                api_key = None
                                                
                                                # Check if there's frameworkConfig in the agent result
                                                if 'frameworkConfig' in agent_result:
                                                    fc = agent_result['frameworkConfig']
                                                    api_key = fc.get('api_key') or fc.get('perplexity_api_key')
                                                
                                                # Check top-level keys
                                                if not api_key:
                                                    api_key = agent_result.get('api_key') or agent_result.get('perplexity_api_key')
                                                
                                                if api_key:
                                                    enhanced_framework_config['api_key'] = api_key
                                                    enhanced_framework_config['perplexity_api_key'] = api_key
                                                    agent_data["frameworkConfig"]["api_key"] = api_key
                                                    agent_data["frameworkConfig"]["perplexity_api_key"] = api_key
                                                    logger.info(f"🔑 TaskNode: Got API key from connected agent's result")
                                                    break
                        
                        # FINAL FALLBACK: Check if we can get it from the original context object
                        if 'api_key' not in enhanced_framework_config and hasattr(context, 'user_api_keys'):
                            perplexity_key = context.user_api_keys.get('perplexity')
                            if perplexity_key:
                                enhanced_framework_config['api_key'] = perplexity_key
                                enhanced_framework_config['perplexity_api_key'] = perplexity_key
                                agent_data["frameworkConfig"]["api_key"] = perplexity_key
                                agent_data["frameworkConfig"]["perplexity_api_key"] = perplexity_key
                                logger.info(f"🔑 TaskNode: Got API key from context.user_api_keys")
                        
                        # CRITICAL FIX: Ensure the API key is in the agent_data frameworkConfig
                        if 'api_key' in enhanced_framework_config:
                            agent_data["frameworkConfig"]["api_key"] = enhanced_framework_config["api_key"]
                        if 'perplexity_api_key' in enhanced_framework_config:
                            agent_data["frameworkConfig"]["perplexity_api_key"] = enhanced_framework_config["perplexity_api_key"]
                        
                        logger.info(f"🔧 TaskNode FINAL agent_data frameworkConfig: {agent_data['frameworkConfig']}")
                        
                        task_data = {
                            "description": user_query,
                            "expectedOutput": expected_output or "Detailed response to the query"
                        }
                        
                        # Run the agent
                        result = await crewai_runner.run_crewai_agent(
                            agent_config=agent_data, 
                            task_config=task_data,
                            inputs=formatted_inputs
                        )
                        agent_response = result.get("output", "No response from CrewAI agent")
                    except ImportError as e:
                        logger.error(f"CrewAI runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"CrewAI execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "langchain":
                    # Try to use the langchain runner
                    try:
                        from frameworks.langchain_runner import run_langchain_tool
                        logger.info("Using LangChain framework for agent task")
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "openai"                                          # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        # Prepare config for LangChain
                        config = {
                            "llm": {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            },
                            "chain_type": "simple_chain"
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the LangChain agent
                        result = await run_langchain_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from LangChain agent")
                    except ImportError as e:
                        logger.error(f"LangChain runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"LangChain execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "autogen":
                    # Try to use the autogen runner
                    try:
                        from frameworks.autogen_runner import run_autogen_tool
                        logger.info("Using AutoGen framework for agent task")
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "openai"                                          # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        # Prepare config for AutoGen
                        config = {
                            "llm": {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the AutoGen agent
                        result = await run_autogen_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from AutoGen agent")
                    except ImportError as e:
                        logger.error(f"AutoGen runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"AutoGen execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "llamaindex":
                    # Try to use the llamaindex runner
                    try:
                        from frameworks.llamaindex_runner import run_llamaindex_tool
                        logger.info("Using LlamaIndex framework for agent task")
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "openai"                                          # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        # Prepare config for LlamaIndex
                        config = {
                            "llm": {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the LlamaIndex agent
                        result = await run_llamaindex_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from LlamaIndex agent")
                    except ImportError as e:
                        logger.error(f"LlamaIndex runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"LlamaIndex execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "huggingface":
                    # Try to use the huggingface runner
                    try:
                        from frameworks.huggingface_runner import run_huggingface_tool
                        logger.info("Using HuggingFace framework for agent task")
                        
                        # Prepare config for HuggingFace
                        config = {
                            "model": primary_agent.get("llmModel", "microsoft/DialoGPT-medium"),
                            "temperature": primary_agent.get("temperature", 0.7),
                            "max_tokens": primary_agent.get("max_tokens", 4000),
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the HuggingFace agent
                        result = await run_huggingface_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from HuggingFace agent")
                    except ImportError as e:
                        logger.error(f"HuggingFace runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"HuggingFace execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "webhook":
                    # Try to use the webhook runner
                    try:
                        from frameworks.webhook_runner import run_webhook_tool
                        logger.info("Using Webhook framework for agent task")
                        
                        # Prepare config for Webhook
                        config = {
                            "webhook_url": primary_agent.get("webhookUrl", ""),
                            "method": primary_agent.get("method", "POST"),
                            "headers": primary_agent.get("headers", {}),
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the Webhook agent
                        result = await run_webhook_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from Webhook agent")
                    except ImportError as e:
                        logger.error(f"Webhook runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"Webhook execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    
                elif agent_framework == "openai":
                    # Try to use direct OpenAI API
                    agent_response = await self._execute_openai_query(primary_agent, user_query)
                    
                elif agent_framework == "anthropic":
                    # Try to use direct Anthropic API
                    agent_response = await self._execute_anthropic_query(primary_agent, user_query)
                    
                else:
                    # Use a generic approach for other frameworks
                    logger.info(f"Using generic approach for framework: {agent_framework}")
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
        """Check if task should be executed asynchronously"""
        config = node.get_config()
        return config.async_execution

    async def _process_data_task(self, task_name: str, description: str, inputs: Dict[str, Any], expected_output: str) -> str:
        """Process a data transformation/processing task without requiring an agent"""
        try:
            logger.info(f"Processing data task: {task_name}")
            
            # Extract meaningful data from inputs
            processed_data = []
            
            for key, value in inputs.items():
                if isinstance(value, dict):
                    # Handle different types of input data
                    if value.get('type') == 'tool_result':
                        result = value.get('result', {})
                        if result.get('success'):
                            processed_data.append(f"Tool result: {result.get('data', result)}")
                        else:
                            processed_data.append(f"Tool error: {result.get('error', 'Unknown error')}")
                    
                    elif value.get('type') == 'agent_result':
                        data = value.get('data', {})
                        processed_data.append(f"Agent output: {data}")
                    
                    elif 'result' in value:
                        processed_data.append(f"Result: {value['result']}")
                    
                    elif 'output' in value:
                        processed_data.append(f"Output: {value['output']}")
                    
                    elif 'data' in value:
                        processed_data.append(f"Data: {value['data']}")
                    
                    else:
                        processed_data.append(f"{key}: {value}")
                
                elif isinstance(value, str):
                    processed_data.append(f"{key}: {value}")
                
                else:
                    processed_data.append(f"{key}: {str(value)}")
            
            # Create a meaningful response based on the task description and inputs
            if description and "score" in description.lower():
                # This looks like a scoring task
                response = f"Scoring analysis for {task_name}:\n"
                response += f"Based on the provided data: {'; '.join(processed_data)}\n"
                response += f"Expected output: {expected_output or 'Score calculation completed'}"
            
            elif description and any(word in description.lower() for word in ["calculate", "compute", "analyze"]):
                # This looks like a calculation/analysis task
                response = f"Analysis results for {task_name}:\n"
                response += f"Processed data: {'; '.join(processed_data)}\n"
                response += f"Analysis complete: {expected_output or 'Data processed successfully'}"
            
            elif description and any(word in description.lower() for word in ["format", "transform", "convert"]):
                # This looks like a data transformation task
                response = f"Data transformation for {task_name}:\n"
                response += f"Transformed data: {'; '.join(processed_data)}\n"
                response += f"Format: {expected_output or 'Data formatted successfully'}"
            
            else:
                # Generic data processing
                response = f"Data processing results for {task_name}:\n"
                response += f"Processed inputs: {'; '.join(processed_data)}\n"
                response += f"Output: {expected_output or 'Task completed successfully'}"
            
            logger.info(f"Data task {task_name} processed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error processing data task {task_name}: {str(e)}")
            return f"Error processing data task {task_name}: {str(e)}"


# Standalone function for node processor compatibility
async def process_task_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """
    Process task node - standalone function for node processor
    """
    try:
        from models.data import NodeData
        
        # Create TaskNode instance
        task_node = TaskNode()
        
        # Create a Node object from node_data
        from models.nodes import Node, NodeType
        node = Node(
            id=node_data.get('nodeId', node_data.get('id', 'unknown')),
            type=NodeType.TASK,
            data=node_data,
            position=node_data.get('position', {'x': 0, 'y': 0})
        )
        
        # CRITICAL FIX: Check if context is a dict and extract the actual WorkflowExecutionContext
        actual_context = context
        if isinstance(context, dict):
            # Look for the actual WorkflowExecutionContext in the dict
            if 'execution_context' in context:
                actual_context = context['execution_context']
                logger.info(f"🔧 TaskNode: Found execution_context in dict")
            elif 'workflow_execution_context' in context:
                actual_context = context['workflow_execution_context']
                logger.info(f"🔧 TaskNode: Found workflow_execution_context in dict")
            elif 'context' in context:
                actual_context = context['context']
                logger.info(f"🔧 TaskNode: Found context in dict")
            else:
                # If we can't find the WorkflowExecutionContext, we'll work with what we have
                logger.warning(f"⚠️ TaskNode: Could not find WorkflowExecutionContext in dict, using dict directly")
                actual_context = context
        
        logger.info(f"🔧 TaskNode: Final context type: {type(actual_context)}")
        
        # Process the node with the actual context
        result = await task_node.process(node, inputs, actual_context)
        
        # Ensure result is wrapped in NodeData
        if isinstance(result, NodeData):
            return result
        else:
            return NodeData(
                value=result,
                metadata={
                    'node_id': node.id,
                    'node_type': 'task',
                    'timestamp': datetime.now().isoformat()
                }
            )
            
    except Exception as e:
        logger.error(f"Error in process_task_node: {str(e)}")
        return NodeData(
            value={
                "success": False,
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            metadata={
                'node_id': node_data.get('nodeId', 'unknown'),
                'node_type': 'task',
                'error': True
            }
        ) 