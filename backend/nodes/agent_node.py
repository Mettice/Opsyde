from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
from enum import Enum
import asyncio

from backend.models.nodes import Node, NodeType, AgentConfig
from backend.models.workflow import ExecutionContext
from backend.models.results import NodeResult, ExecutionStatus
from backend.core.exceptions import ValidationError, FrameworkError
from backend.models.data import NodeData

# Import the enhanced framework registry
from backend.framework_registry import framework_registry

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
            agent_config = {
                "role": node_data.get("role", "Assistant"),
                "goal": node_data.get("goal", "Help the user"),
                "backstory": node_data.get("backstory", ""),
                "framework": node_data.get("framework", "openrouter"),
                "llmModel": node_data.get("llmModel", "gpt-4o-mini"),
                "temperature": float(node_data.get("temperature", 0.7)),
                "max_tokens": int(node_data.get("max_tokens", 4000)),
                "enableMemory": node_data.get("enableMemory", False),
                "allowDelegation": node_data.get("allowDelegation", False),
                "streamIntermediateSteps": node_data.get("streamIntermediateSteps", False)
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
            main_query = self._extract_main_query(formatted_inputs, node_data)
            
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
                "collaborating_agents": [agent["name"] for agent in collaborating_agents]
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
                "metadata": {
                    "node_id": node_id,
                    "node_type": "agent",
                    "timestamp": datetime.now().isoformat(),
                    "collaborating_agents": collaborating_agents,
                    "agent_result": {
                        "type": "agent_result",
                        "agent_name": node_data.get("label", agent_config["role"]),
                        "role": agent_config["role"],
                        "framework": framework,
                        "result": result,
                        "timestamp": datetime.now().isoformat(),
                        "collaborating_agents": [agent["name"] for agent in collaborating_agents]
                    }
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

    def _extract_main_query(self, inputs: Dict[str, Any], node_data: Dict[str, Any]) -> str:
        """Extract the main query/task from inputs"""
        
        # Look for explicit query/task
        for key in ['query', 'task', 'prompt', 'message', 'input']:
            if key in inputs and inputs[key]:
                return str(inputs[key])
        
        # Look for text inputs
        for key, value in inputs.items():
            if isinstance(value, str) and value.strip():
                return value
            elif isinstance(value, dict):
                if 'text' in value:
                    return str(value['text'])
                elif 'value' in value and isinstance(value['value'], str):
                    return str(value['value'])
        
        # Fallback to agent's goal or default
        return node_data.get("goal", "Please provide assistance based on your role and expertise.")
    
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
            from backend.frameworks.crewai_runner import EnhancedCrewAIRunner
            
            runner = EnhancedCrewAIRunner()
            
            # Prepare CrewAI configuration
            crewai_config = {
                "role": agent_config["role"],
                "goal": agent_config["goal"],
                "backstory": agent_config["backstory"],
                "frameworkConfig": {
                    "provider": "openai",
                    "model": agent_config["llmModel"],
                    "temperature": agent_config["temperature"],
                    "max_tokens": agent_config["max_tokens"]
                },
                "allowDelegation": agent_config["allowDelegation"],
                "enableMemory": agent_config["enableMemory"],
                "verbose": True
            }
            
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
            from backend.frameworks.langchain_runner import run_langchain_tool
            
            config = {
                "chain_type": "simple_chain",
                "provider": "openai",
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
            from backend.frameworks.autogen_runner import run_autogen_tool
            
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
            from backend.frameworks.llamaindex_runner import run_llamaindex_tool
            
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
            from backend.frameworks.huggingface_runner import run_huggingface_tool
            
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
            from backend.frameworks.openrouter_runner import run_openrouter_chat
            
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


# Standalone function for backward compatibility
async def process_agent_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Process an agent node with the given data and inputs
    """
    try:
        agent_node = AgentNode()
        
        # Create execution context with required fields
        exec_context = ExecutionContext(
            workflow_id=context.get('workflow_id', 'unknown') if context else 'unknown',
            execution_id=context.get('execution_id', 'direct-execution') if context else 'direct-execution'
        )
        
        # Create node object
        node = Node(
            id=node_data.get('id', 'unknown'),
            type='agent',
            data=node_data,
            position=node_data.get('position', {'x': 0, 'y': 0})
        )
        
        # Process the node
        result = await agent_node.process(node, inputs, exec_context)
        
        return result
            
    except Exception as e:
        logger.error(f"Error in process_agent_node: {str(e)}")
        return {
            "success": False,
            "type": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }