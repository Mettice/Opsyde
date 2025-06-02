from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
from enum import Enum
import asyncio
import json

from models.nodes import Node, NodeType, AgentConfig
from models.workflow import ExecutionContext
from models.results import NodeResult, ExecutionStatus
from core.exceptions import ValidationError, FrameworkError
from models.data import NodeData

# Import the enhanced framework registry
from framework_registry import framework_registry

logger = logging.getLogger(__name__)

class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OPENROUTER = "openrouter"
    HUGGINGFACE = "huggingface"

class AgentFramework(Enum):
    CREWAI = "crewai"
    AUTOGEN = "autogen"
    LANGCHAIN = "langchain"

class AgentNode:
    """
    Enhanced Agent Node that supports:
    - Multi-framework execution (CrewAI, LangChain, AutoGen, etc.)
    - Agent-to-agent communication
    - Memory management
    - Collaborative workflows
    """

    async def process(self, node: Union[Node, Dict[str, Any]], inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """
        Process agent node with support for multi-agent communication
        """
        try:
            # Extract node data
            if isinstance(node, dict):
                node_data = node
                node_id = node_data.get('id', 'unknown')
            else:
                node_data = node.data
                node_id = node.id
            
            # Get agent configuration
            max_tokens = int(node_data.get("max_tokens", 4000))
            
            # Respect user configuration - no more emergency overrides!
            logger.info(f"🤖 Using user-configured max_tokens: {max_tokens}")
            
            # CRITICAL: Preserve the enhanced frameworkConfig that contains the API key
            enhanced_framework_config = node_data.get("frameworkConfig", {})
            logger.info(f"🔧 Enhanced frameworkConfig from context: {enhanced_framework_config}")
            
            agent_config = {
                "role": node_data.get("role", "Assistant"),
                "goal": node_data.get("goal", "Help the user"),
                "backstory": node_data.get("backstory", ""),
                "framework": node_data.get("framework", "openrouter"),
                "llmModel": node_data.get("llmModel", "gpt-4o-mini"),
                "llmProvider": (
                    node_data.get("llm", {}).get("provider") or
                    node_data.get("llmProvider") or
                    node_data.get("frameworkConfig", {}).get("provider") or
                    "openai"
                ),
                "temperature": float(node_data.get("temperature", 0.7)),
                "max_tokens": max_tokens,
                "enableMemory": node_data.get("enableMemory", False),
                "allowDelegation": node_data.get("allowDelegation", False),
                "streamIntermediateSteps": node_data.get("streamIntermediateSteps", False),
                # CRITICAL: Include the enhanced frameworkConfig with API key
                "frameworkConfig": enhanced_framework_config
            }
            
            logger.info(f"🤖 Processing agent: {agent_config['role']} (framework: {agent_config['framework']})")
            
            # Process inputs and check for agent-to-agent communication
            formatted_inputs = {}
            collaborating_agents = []
            
            for key, value in inputs.items():
                if hasattr(value, 'value'):
                    # Check if this is from another agent
                    if isinstance(value.value, dict):
                        # Check for agent result
                        if (value.value.get('type') == 'agent_result' or 
                            'agent_name' in value.value or 
                            'role' in value.value):
                            
                            collaborating_agents.append({
                                "name": value.value.get('agent_name', 'Unknown Agent'),
                                "role": value.value.get('role', 'Assistant'),
                                "result": value.value.get('result', ''),
                                "framework": value.value.get('framework', 'unknown')
                            })
                            formatted_inputs[f"agent_input_{key}"] = value.value.get('result', '')
                        else:
                            formatted_inputs[key] = value.value
                    else:
                        formatted_inputs[key] = value.value
                elif isinstance(value, dict):
                    formatted_inputs[key] = value
                else:
                    formatted_inputs[key] = value
            
            # Build context from collaborating agents
            collaboration_context = ""
            if collaborating_agents:
                logger.info(f"🤝 Agent {agent_config['role']} collaborating with {len(collaborating_agents)} other agents")
                collaboration_context = "\n\nCollaboration Context:\n"
                for i, agent in enumerate(collaborating_agents, 1):
                    collaboration_context += f"{i}. {agent['role']} ({agent['framework']}) says: {agent['result']}\n"
                collaboration_context += "\nPlease consider this information in your response.\n"
            
            # Determine the main query/task
            main_query = self._extract_main_query(formatted_inputs)
            
            # Add collaboration context to the query
            if collaboration_context:
                main_query += collaboration_context
            
            # Execute based on framework
            framework = agent_config["framework"].lower()
            result = await self._execute_agent_by_framework(framework, agent_config, main_query, formatted_inputs)
            
            # Prepare agent result for potential agent-to-agent communication
            agent_result = {
                "type": "agent_result",
                "agent_name": node_data.get("label", agent_config["role"]),
                "role": agent_config["role"],
                "framework": framework,
                "result": result,
                "timestamp": datetime.now().isoformat(),
                "collaborating_agents": [agent["name"] for agent in collaborating_agents],
                "llm": {
                    "provider": agent_config.get("llmProvider", "openai"),
                    "model": agent_config.get("llmModel", "gpt-4")
                },
                "llmProvider": agent_config.get("llmProvider", "openai"),
                "llmModel": agent_config.get("llmModel", "gpt-4"),
                "temperature": agent_config.get("temperature", 0.7),
                "max_tokens": agent_config.get("max_tokens", 4000)
            }
            
            logger.info(f"✅ Agent {agent_config['role']} completed successfully")
            
            return {
                "success": True,
                "type": "text",
                "output": result,
                "text_output": result,  # Clean text for display
                "result": result,       # For compatibility
                "agent_name": node_data.get("label", agent_config["role"]),
                "role": agent_config["role"],
                "framework": framework,
                "llm": {
                    "provider": agent_config.get("llmProvider", "openai"),
                    "model": agent_config.get("llmModel", "gpt-4")
                },
                "llmProvider": agent_config.get("llmProvider", "openai"),
                "llmModel": agent_config.get("llmModel", "gpt-4"),
                "temperature": agent_config.get("temperature", 0.7),
                "max_tokens": agent_config.get("max_tokens", 4000),
                "metadata": {
                    "node_id": node_id,
                    "node_type": "agent",
                    "timestamp": datetime.now().isoformat(),
                    "collaborating_agents": collaborating_agents,
                    "llm": {
                        "provider": agent_config.get("llmProvider", "openai"),
                        "model": agent_config.get("llmModel", "gpt-4")
                    },
                    "llmProvider": agent_config.get("llmProvider", "openai"),
                    "llmModel": agent_config.get("llmModel", "gpt-4"),
                    "temperature": agent_config.get("temperature", 0.7),
                    "max_tokens": agent_config.get("max_tokens", 4000),
                    "agent_result": agent_result
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error in agent node: {str(e)}")
            return {
                "success": False,
                "type": "error",
                "error": str(e),
                "agent_name": node_data.get("label", "Unknown Agent"),
                "timestamp": datetime.now().isoformat()
            }

    def _extract_main_query(self, inputs: Dict[str, Any]) -> str:
        """
        Extract the main query/task from inputs with enhanced handling for standardized data
        """
        try:
            # DEBUG: Log what the agent is actually receiving
            logger.info(f"🔧 DEBUG: Agent received {len(inputs)} inputs")
            for key, value in inputs.items():
                if isinstance(value, dict):
                    logger.info(f"🔧 DEBUG: Input '{key}': dict with {len(value)} keys")
                elif isinstance(value, list):
                    logger.info(f"🔧 DEBUG: Input '{key}': list with {len(value)} items")
                else:
                    logger.info(f"🔧 DEBUG: Input '{key}': {type(value).__name__}")
            
            # PRIORITY 1: Check for explicit query/task fields
            query_fields = ['query', 'task', 'prompt', 'instruction', 'message', 'request']
            for key in query_fields:
                if key in inputs and inputs[key]:
                    logger.info(f"🔧 DEBUG: Using explicit query from '{key}'")
                    return str(inputs[key])
            
            # PRIORITY 2: Handle API data from triggers - CRITICAL PATH
            api_data_found = False
            
            # Check for standardized API data structure
            if 'api_data' in inputs and isinstance(inputs['api_data'], dict):
                api_data = inputs['api_data']
                logger.info(f"🔧 DEBUG: Found api_data structure")
                
                # Look for summary or description in the API data
                if 'summary' in api_data:
                    logger.info(f"🔧 DEBUG: Using API data summary")
                    return f"Please analyze this data: {api_data['summary']}"
                
                # Look for records or data arrays
                if 'records' in api_data and isinstance(api_data['records'], list):
                    record_count = len(api_data['records'])
                    logger.info(f"🔧 DEBUG: Found {record_count} records in API data")
                    
                    if record_count > 0:
                        # Create a summary of the data for the agent
                        sample_record = api_data['records'][0]
                        if isinstance(sample_record, dict):
                            fields = list(sample_record.keys())[:5]  # First 5 fields
                            return f"Please analyze this data containing {record_count} records with fields: {', '.join(fields)}. Here's the data: {str(api_data['records'][:3])}"  # Show first 3 records
                        else:
                            return f"Please analyze this data containing {record_count} records: {str(api_data['records'][:3])}"
                
                # Look for data arrays
                if 'data' in api_data and isinstance(api_data['data'], list):
                    data_count = len(api_data['data'])
                    logger.info(f"🔧 DEBUG: Found {data_count} data items in API data")
                    
                    if data_count > 0:
                        return f"Please analyze this data containing {data_count} items: {str(api_data['data'][:3])}"
                
                # Fallback: use the entire api_data structure
                api_data_found = True
                logger.info(f"🔧 DEBUG: Using entire api_data structure as fallback")
                return f"Please analyze this API data: {str(api_data)[:500]}..."  # Truncate for safety
            
            # PRIORITY 3: Handle raw API data structures (legacy support)
            for key, value in inputs.items():
                if isinstance(value, dict):
                    # Check for common API response patterns
                    if 'records' in value and isinstance(value['records'], list):
                        record_count = len(value['records'])
                        logger.info(f"🔧 DEBUG: Found {record_count} records in '{key}'")
                        return f"Please analyze this data from {key} containing {record_count} records: {str(value['records'][:2])}"
                    
                    elif 'data' in value and isinstance(value['data'], list):
                        data_count = len(value['data'])
                        logger.info(f"🔧 DEBUG: Found {data_count} data items in '{key}'")
                        return f"Please analyze this data from {key} containing {data_count} items: {str(value['data'][:2])}"
                    
                    elif 'pairs' in value and isinstance(value['pairs'], list):
                        # DexScreener format
                        pairs_count = len(value['pairs'])
                        logger.info(f"🔧 DEBUG: Found {pairs_count} trading pairs in '{key}'")
                        return f"Please analyze this trading data from {key} containing {pairs_count} pairs: {str(value['pairs'][:2])}"
                
                elif isinstance(value, list) and len(value) > 0:
                    # Direct array of data
                    logger.info(f"🔧 DEBUG: Found array with {len(value)} items in '{key}'")
                    return f"Please analyze this data from {key} containing {len(value)} items: {str(value[:2])}"
            
            # PRIORITY 4: Handle trigger outputs
            if 'output' in inputs:
                output = inputs['output']
                if isinstance(output, str) and len(output.strip()) > 10:
                    logger.info(f"🔧 DEBUG: Using trigger output")
                    return f"Please analyze this information: {output}"
                elif isinstance(output, dict):
                    logger.info(f"🔧 DEBUG: Using structured trigger output")
                    return f"Please analyze this data: {str(output)}"
            
            # PRIORITY 5: Handle any structured data
            for key, value in inputs.items():
                if isinstance(value, (dict, list)) and str(value).strip():
                    logger.info(f"🔧 DEBUG: Using structured data from '{key}'")
                    return f"Please analyze this {key}: {str(value)[:300]}..."
            
            # PRIORITY 6: Handle simple string inputs
            for key, value in inputs.items():
                if isinstance(value, str) and len(value.strip()) > 5:
                    logger.info(f"🔧 DEBUG: Using string input from '{key}'")
                    return value.strip()
            
            # PRIORITY 7: Fallback - combine all non-empty inputs
            non_empty_inputs = {k: v for k, v in inputs.items() if v}
            if non_empty_inputs:
                logger.info(f"🔧 DEBUG: Using combined inputs as fallback")
                return f"Please help with this information: {str(non_empty_inputs)[:200]}..."
            
            # FINAL FALLBACK
            logger.warning(f"🔧 DEBUG: No suitable input found, using default query")
            if api_data_found:
                return "Please analyze the provided API data and provide insights."
            else:
                return "Please provide assistance based on your role and expertise."
            
        except Exception as e:
            logger.error(f"Error extracting main query: {str(e)}")
            return "Please provide assistance based on your role and expertise."
    
    async def _execute_agent_by_framework(self, framework: str, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute agent using the specified framework"""
        
        try:
            if framework == "crewai":
                return await self._execute_crewai_agent(agent_config, query, inputs)
            elif framework == "langchain":
                return await self._execute_langchain_agent(agent_config, query, inputs)
            elif framework == "autogen":
                return await self._execute_autogen_agent(agent_config, query, inputs)
            elif framework == "llamaindex":
                return await self._execute_llamaindex_agent(agent_config, query, inputs)
            elif framework == "huggingface":
                return await self._execute_huggingface_agent(agent_config, query, inputs)
            elif framework == "openrouter":
                return await self._execute_openrouter_agent(agent_config, query, inputs)
            elif framework == "perplexity":
                return await self._execute_perplexity_agent(agent_config, query, inputs)
            else:
                # Fallback to OpenRouter
                logger.warning(f"Unknown framework {framework}, falling back to OpenRouter")
                return await self._execute_openrouter_agent(agent_config, query, inputs)
                
        except Exception as e:
            logger.error(f"Error executing {framework} agent: {str(e)}")
            # Fallback to simple response
            return f"I'm {agent_config['role']}. I encountered an error while processing your request: {str(e)}"
    
    async def _execute_crewai_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using CrewAI framework"""
        try:
            from frameworks.crewai_runner import EnhancedCrewAIRunner
            
            runner = EnhancedCrewAIRunner()
            
            # Use the existing frameworkConfig if available (it already has the API key injected)
            existing_framework_config = agent_config.get("frameworkConfig", {})
            
            # Extract LLM info from multiple possible locations
            llm_provider = (
                agent_config.get("llm", {}).get("provider") or  # New frontend format
                agent_config.get("llmProvider") or              # Legacy format
                agent_config.get("llm_provider") or             # Alternative format
                "openai"                                        # Default fallback
            )
            
            llm_model = (
                agent_config.get("llm", {}).get("model") or     # New frontend format
                agent_config.get("llmModel") or                 # Legacy format
                agent_config.get("llm_model") or                # Alternative format
                "gpt-4"                                         # Default fallback
            )
            
            # Prepare CrewAI configuration - preserve the enhanced frameworkConfig
            crewai_config = {
                "role": agent_config["role"],
                "goal": agent_config["goal"],
                "backstory": agent_config["backstory"],
                "frameworkConfig": existing_framework_config if existing_framework_config else {
                    "provider": llm_provider,
                    "model": llm_model,
                    "temperature": agent_config.get("temperature", 0.7),
                    "max_tokens": agent_config.get("max_tokens", 4000)
                },
                "allowDelegation": agent_config.get("allowDelegation", False),
                "enableMemory": agent_config.get("enableMemory", False),
                "verbose": True
            }
            
            # Log the frameworkConfig to verify API key is present
            logger.info(f"🔧 CrewAI config frameworkConfig: {crewai_config['frameworkConfig']}")
            
            task_config = {
                "description": query,
                "expectedOutput": "Detailed response based on the agent's role and expertise"
            }
            
            result = await runner.run_crewai_agent(crewai_config, task_config, inputs=inputs)
            return result.get("output", "No response from CrewAI agent")
            
        except ImportError:
            logger.error("CrewAI framework not available")
            return await self._execute_openrouter_agent(agent_config, query, inputs)
    
    async def _execute_langchain_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using LangChain framework"""
        try:
            from frameworks.langchain_runner import run_langchain_tool
            
            config = {
                "chain_type": "simple_chain",
                "provider": agent_config.get("llmProvider", "openai"),
                "model": agent_config["llmModel"],
                "temperature": agent_config["temperature"],
                "max_tokens": agent_config["max_tokens"],
                "prompt": f"You are {agent_config['role']}. {agent_config['goal']}\n\nUser query: {query}"
            }
            
            result = await run_langchain_tool(config, inputs)
            return result.get("output", "No response from LangChain agent")
            
        except ImportError:
            logger.error("LangChain framework not available")
            return await self._execute_openrouter_agent(agent_config, query, inputs)
    
    async def _execute_autogen_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using AutoGen framework"""
        try:
            from frameworks.autogen_runner import run_autogen_tool
            
            config = {
                "agent_type": "assistant",
                "name": agent_config["role"],
                "system_message": f"You are {agent_config['role']}. {agent_config['goal']}",
                "llm_config": {
                    "model": agent_config["llmModel"],
                    "temperature": agent_config["temperature"],
                    "max_tokens": agent_config["max_tokens"]
                }
            }
            
            result = await run_autogen_tool(config, {"message": query, **inputs})
            return result.get("output", "No response from AutoGen agent")
            
        except ImportError:
            logger.error("AutoGen framework not available")
            return await self._execute_openrouter_agent(agent_config, query, inputs)
    
    async def _execute_llamaindex_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using LlamaIndex framework"""
        try:
            from frameworks.llamaindex_runner import run_llamaindex_tool
            
            config = {
                "index_type": "simple",
                "llm_model": agent_config["llmModel"],
                "temperature": agent_config["temperature"],
                "max_tokens": agent_config["max_tokens"],
                "system_prompt": f"You are {agent_config['role']}. {agent_config['goal']}"
            }
            
            result = await run_llamaindex_tool(config, {"query": query, **inputs})
            return result.get("output", "No response from LlamaIndex agent")
            
        except ImportError:
            logger.error("LlamaIndex framework not available")
            return await self._execute_openrouter_agent(agent_config, query, inputs)
    
    async def _execute_huggingface_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using HuggingFace framework"""
        try:
            from frameworks.huggingface_runner import run_huggingface_tool
            
            config = {
                "model": agent_config.get("llmModel", "microsoft/DialoGPT-medium"),
                "task_type": "text-generation",
                "max_length": agent_config["max_tokens"],
                "temperature": agent_config["temperature"]
            }
            
            prompt = f"Role: {agent_config['role']}\nGoal: {agent_config['goal']}\nQuery: {query}"
            result = await run_huggingface_tool(config, {"text": prompt, **inputs})
            return result.get("output", "No response from HuggingFace agent")
            
        except ImportError:
            logger.error("HuggingFace framework not available")
            return await self._execute_openrouter_agent(agent_config, query, inputs)
    
    async def _execute_openrouter_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using OpenRouter framework"""
        try:
            from frameworks.openrouter_runner import run_openrouter_chat
            
            # Build system message
            system_message = f"You are {agent_config['role']}. {agent_config['goal']}"
            if agent_config.get('backstory'):
                system_message += f"\n\nBackground: {agent_config['backstory']}"
            
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ]
            
            response = await run_openrouter_chat(
                messages=messages,
                model=agent_config["llmModel"],
                temperature=agent_config["temperature"],
                max_tokens=agent_config["max_tokens"]
            )
            
            return response
            
        except Exception as e:
            logger.error(f"OpenRouter execution failed: {str(e)}")
            return f"I'm {agent_config['role']}. I'm ready to help but encountered a technical issue: {str(e)}"

    async def _execute_perplexity_agent(self, agent_config: Dict[str, Any], query: str, inputs: Dict[str, Any]) -> str:
        """Execute using Perplexity framework"""
        try:
            from frameworks.perplexity_runner import run_perplexity_chat
            
            # Build system message
            system_message = f"You are {agent_config['role']}. {agent_config['goal']}"
            if agent_config.get('backstory'):
                system_message += f"\n\nBackground: {agent_config['backstory']}"
            
            # Prepare messages for Perplexity
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ]
            
            # Get model from frameworkConfig or fallback
            model = agent_config.get("frameworkConfig", {}).get("model") or agent_config.get("llmModel", "sonar-pro")
            temperature = agent_config.get("frameworkConfig", {}).get("temperature") or agent_config.get("temperature", 0.7)
            max_tokens = agent_config.get("frameworkConfig", {}).get("max_tokens") or agent_config.get("max_tokens", 2000)
            
            logger.info(f"🔮 Executing Perplexity agent with model: {model}")
            
            response = await run_perplexity_chat(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Perplexity execution failed: {str(e)}")
            return f"I'm {agent_config['role']}. I encountered an error while processing your request: {str(e)}"


# Standalone function for backward compatibility
async def process_agent_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Process an agent node with proper error handling and context management
    """
    try:
        logger.info(f"Processing agent node with data: {node_data.get('label', 'Unknown Agent')}")
        
        # Create execution context with required fields
        exec_context = ExecutionContext(
            workflow_id=context.get('workflow_id', 'unknown') if context else 'unknown',
            execution_id=context.get('execution_id', 'direct-execution') if context else 'direct-execution'
        )
        
        # Create Node object from node_data
        node = Node(
            id=node_data.get('id', 'agent-node'),
            type=NodeType.AGENT,
            data=node_data,
            position={"x": 0, "y": 0}  # Add default position for single node execution
        )
        
        # Create agent processor and process
        agent_node = AgentNode()
        result = await agent_node.process(node, inputs, exec_context)
        
        return result
            
    except Exception as e:
        logger.error(f"Error in process_agent_node: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "message": f"Agent processing failed: {str(e)}"
        }