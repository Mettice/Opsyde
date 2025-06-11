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
                    "perplexity"
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
                # 🚀 SIMPLIFIED INPUT PROCESSING - Graph processor now provides clean data
                if isinstance(value, dict):
                    # Check if this is agent result metadata for collaboration
                    if (value.get('type') == 'agent_result' or 
                        'agent_name' in value or 
                        'role' in value):
                        
                        collaborating_agents.append({
                            "name": value.get('agent_name', 'Unknown Agent'),
                            "role": value.get('role', 'Assistant'),
                            "result": value.get('result', ''),
                            "framework": value.get('framework', 'unknown')
                        })
                        formatted_inputs[f"agent_input_{key}"] = value.get('result', '')
                    else:
                        # Regular data input - use as-is since graph processor cleaned it
                        formatted_inputs[key] = value
                elif isinstance(value, str):
                    formatted_inputs[key] = value
                else:
                    # Convert other types to string for agent processing
                    formatted_inputs[key] = str(value) if value is not None else ""
            
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
        Extract the main query/task from inputs using the universal data transformer
        No hardcoding - works with ANY API structure
        """
        try:
            # DEBUG: Log what the agent is actually receiving
            logger.info(f"🔧 DEBUG: Agent received {len(inputs)} inputs")
            for key, value in inputs.items():
                if isinstance(value, dict):
                    if 'api_data' in value or 'records' in value:
                        records = value.get('api_data', {}).get('records', value.get('records', []))
                        service_name = value.get('service_name', 'Unknown Service')
                        logger.info(f"🔧 DEBUG: Input '{key}': {service_name} with {len(records)} records")
                    else:
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
            
            # PRIORITY 2: Handle API data from triggers (Airtable, etc.)
            for key, value in inputs.items():
                if isinstance(value, dict):
                    # Check for API data structure from universal polling
                    if (value.get('type') == 'api_data' or 
                        value.get('trigger_type') == 'universal_polling' or
                        'api_data' in value or 
                        'records' in value):
                        
                        service_name = value.get('service_name', 'Unknown API')
                        logger.info(f"🔧 DEBUG: Processing {service_name} API data")
                        
                        # Extract records from either location
                        records = value.get('api_data', {}).get('records', value.get('records', []))
                        
                        if records and len(records) > 0:
                            # Build a comprehensive summary for the agent
                            summary_parts = [f"Retrieved {len(records)} records from {service_name}:"]
                            
                            # Process first few records to understand structure
                            for i, record in enumerate(records[:5]):  # Show first 5 records
                                record_data = record.get('data', {})
                                
                                # Extract meaningful fields from record
                                fields = record_data.get('Fields', {})
                                if fields:
                                    # Build record description from available fields
                                    record_parts = []
                                    for field_name, field_value in fields.items():
                                        if field_value:
                                            record_parts.append(f"{field_name}: {field_value}")
                                    
                                    if record_parts:
                                        summary_parts.append(f"Record {i+1}: {', '.join(record_parts)}")
                                else:
                                    # Fallback: use any available data
                                    if record_data:
                                        summary_parts.append(f"Record {i+1}: {record.get('id', 'Unknown ID')}")
                            
                            if len(records) > 5:
                                summary_parts.append(f"... and {len(records) - 5} more records")
                            
                            query = "\n".join(summary_parts)
                            logger.info(f"🔧 DEBUG: Extracted API data summary for agent: {len(query)} characters")
                            return query
                    
                    # Check for structured data with meaningful content
                    elif any(field in value for field in ['title', 'content', 'data', 'result', 'output', 'value']):
                        # Try to build a meaningful query from structured data
                        content_parts = []
                        for content_field in ['title', 'content', 'data', 'result', 'output', 'value']:
                            if content_field in value and value[content_field]:
                                content_parts.append(str(value[content_field]))
                        
                        if content_parts:
                            query = " | ".join(content_parts)
                            logger.info(f"🔧 DEBUG: Extracted structured content from '{key}'")
                            return query
            
            # PRIORITY 3: Extract from any meaningful string values
            text_inputs = []
            for key, value in inputs.items():
                if isinstance(value, str) and len(value.strip()) > 10:  # Meaningful text
                    text_inputs.append(value.strip())
                elif isinstance(value, (int, float)) and value:
                    text_inputs.append(str(value))
            
            if text_inputs:
                query = " | ".join(text_inputs)
                logger.info(f"🔧 DEBUG: Using text inputs")
                return query
            
            # PRIORITY 4: Fallback - stringify all inputs
            fallback_parts = []
            for key, value in inputs.items():
                if value is not None:
                    if isinstance(value, dict):
                        # Try to extract meaningful parts from dict
                        dict_summary = f"{key}: {len(value)} items"
                        if 'records' in value:
                            dict_summary += f" (includes {len(value['records'])} records)"
                        fallback_parts.append(dict_summary)
                    elif isinstance(value, list):
                        fallback_parts.append(f"{key}: list of {len(value)} items")
                    else:
                        fallback_parts.append(f"{key}: {str(value)[:100]}")
            
            if fallback_parts:
                query = " | ".join(fallback_parts)
                logger.info(f"🔧 DEBUG: Using fallback summary")
                return query
            
            # Last resort
            logger.warning(f"🔧 DEBUG: No meaningful input found, using default")
            return "Process the provided data"
            
        except Exception as e:
            logger.error(f"Error extracting query from inputs: {str(e)}")
            return "Process the provided data"
    
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
                "perplexity"                                     # Default fallback
            )
            
            llm_model = (
                agent_config.get("llm", {}).get("model") or     # New frontend format
                agent_config.get("llmModel") or                 # Legacy format
                agent_config.get("llm_model") or                # Alternative format
                "llama-3.1-sonar-small-128k-online"             # Default to Perplexity model
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
            
            # 🔧 CRITICAL FIX: Use proper frameworkConfig from agent_config instead of basic config
            framework_config = agent_config.get("frameworkConfig", {})
            
            # Extract provider and model from frameworkConfig first, then fallback
            provider = (
                framework_config.get("provider") or
                agent_config.get("llmProvider") or
                "openai"
            )
            
            model = (
                framework_config.get("model") or
                agent_config.get("llmModel") or
                "gpt-3.5-turbo"
            )
            
            config = {
                "frameworkConfig": {
                    "provider": provider,
                    "model": model,
                    "temperature": framework_config.get("temperature") or agent_config.get("temperature", 0.7),
                    "max_tokens": framework_config.get("max_tokens") or agent_config.get("max_tokens", 4000),
                    "api_key": framework_config.get("api_key", ""),  # Include BYOK API key
                    "chainType": "simple"
                },
                "systemMessage": f"You are {agent_config['role']}. {agent_config['goal']}",
                "tools": agent_config.get("tools", [])
            }
            
            logger.info(f"🔧 AgentNode LangChain config frameworkConfig: {config['frameworkConfig']}")
            
            result = await run_langchain_tool(config, {"input": query, **inputs})
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
        workflow_id = 'unknown'
        execution_id = 'direct-execution'
        
        if context:
            # Get workflow_id, but ensure it's not None
            context_workflow_id = context.get('workflow_id')
            if context_workflow_id is not None:
                workflow_id = context_workflow_id
                
            # Get execution_id, but ensure it's not None  
            context_execution_id = context.get('execution_id')
            if context_execution_id is not None:
                execution_id = context_execution_id
        
        exec_context = ExecutionContext(
            workflow_id=workflow_id,
            execution_id=execution_id
        )
        
        # Create Node object from node_data
        # Extract the actual node data/configuration
        node_config = node_data.get('data', node_data.copy())
        
        # Ensure required fields exist for AgentConfig validation
        if 'label' not in node_config or not node_config['label']:
            node_config['label'] = f"Agent {node_data.get('nodeId', node_data.get('id', 'unknown'))}"
            
        if 'role' not in node_config or not node_config['role']:
            node_config['role'] = "AI Assistant"
            
        if 'goal' not in node_config or not node_config['goal']:
            node_config['goal'] = "Complete assigned tasks efficiently"
            
        if 'framework' not in node_config or not node_config['framework']:
            node_config['framework'] = "openrouter"  # Default framework
        
        node = Node(
            id=node_data.get('id', 'agent-node'),
            type=NodeType.AGENT,
            data=node_config,  # Use extracted config, not entire node_data
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