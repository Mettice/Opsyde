import logging
from typing import Dict, Any, List, Optional
import autogen
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_config_for_agent(agent_config: Dict[str, Any]) -> Dict[str, Any]:
    """Get AutoGen configuration for an agent"""
    llm_config = {
        "model": agent_config.get("llmModel", "gpt-4"),
        "temperature": float(agent_config.get("temperature", 0.7)),
        "config_list": [{"model": agent_config.get("llmModel", "gpt-4")}]
    }
    
    return {
        "name": agent_config.get("label", "Assistant"),
        "llm_config": llm_config,
        "system_message": agent_config.get("backstory", ""),
        "human_input_mode": "NEVER" if not agent_config.get("allowHumanInput") else "TERMINATE"
    }

def create_agent(agent_type: str, config: Dict[str, Any]) -> Any:
    """Create an AutoGen agent based on type"""
    if agent_type == "assistant":
        return autogen.AssistantAgent(
            **get_config_for_agent(config)
        )
    elif agent_type == "user_proxy":
        return autogen.UserProxyAgent(
            **get_config_for_agent(config)
        )
    elif agent_type == "researcher":
        return autogen.AssistantAgent(
            **get_config_for_agent(config),
            system_message="I am a research assistant. I help with gathering and analyzing information."
        )
    elif agent_type == "coder":
        return autogen.AssistantAgent(
            **get_config_for_agent(config),
            system_message="I am a coding assistant. I help with writing and debugging code."
        )
    else:
        raise ValueError(f"Unsupported agent type: {agent_type}")

async def run_autogen_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run an AutoGen tool with the given configuration and inputs
    
    Args:
        config: Tool configuration including agent type, chat type, etc.
        inputs: Input data for the agents
        
    Returns:
        Dictionary containing the result and metadata
    """
    try:
        # Extract configuration
        agent_type = config.get("agent_type", "assistant")
        chat_type = config.get("chat_type", "single")
        task = inputs.get("task", "")
        
        if chat_type == "single":
            # Single agent chat
            assistant = create_agent("assistant", config)
            user_proxy = autogen.UserProxyAgent(
                name="User",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=10
            )
            
            # Start chat
            user_proxy.initiate_chat(
                assistant,
                message=task
            )
            
            # Get chat history
            history = user_proxy.chat_messages[assistant]
            result = history[-1]["content"] if history else "No response generated"
            
        elif chat_type == "group":
            # Group chat
            agents = []
            for agent_config in config.get("agents", []):
                agent = create_agent(
                    agent_config.get("type", "assistant"),
                    agent_config
                )
                agents.append(agent)
            
            # Create group chat
            groupchat = autogen.GroupChat(
                agents=agents,
                messages=[],
                max_round=10
            )
            manager = autogen.GroupChatManager(groupchat=groupchat)
            
            # Start group chat
            user_proxy = autogen.UserProxyAgent(
                name="User",
                human_input_mode="NEVER"
            )
            user_proxy.initiate_chat(
                manager,
                message=task
            )
            
            # Get chat history
            history = groupchat.messages
            result = history[-1]["content"] if history else "No response generated"
            
        else:
            raise ValueError(f"Unsupported chat type: {chat_type}")

        return {
            "type": "autogen_result",
            "output": result,
            "metadata": {
                "agent_type": agent_type,
                "chat_type": chat_type,
                "timestamp": datetime.now().isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error in AutoGen tool: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "agent_type": config.get("agent_type"),
                "chat_type": config.get("chat_type"),
                "timestamp": datetime.now().isoformat()
            }
        }

def run_agents(agents: List[Dict[str, Any]], tasks: List[Dict[str, Any]], 
               tools: List[Dict[str, Any]] = None, memory: Dict[str, Any] = None, 
               inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Run a workflow with multiple agents and tasks using AutoGen
    
    Args:
        agents: List of agent configurations
        tasks: List of task configurations
        tools: Optional list of tool configurations
        memory: Optional memory configuration
        inputs: Optional input data
        
    Returns:
        Dictionary containing the workflow results
    """
    try:
        if inputs is None:
            inputs = {}
            
        results = []
        
        # Process each agent-task pair
        for agent, task in zip(agents, tasks):
            # Configure agent
            agent_config = {
                "agent_type": agent.get("agentType", "assistant"),
                "chat_type": "single",
                "llmModel": agent.get("llmModel", "gpt-4"),
                "temperature": float(agent.get("temperature", 0.7)),
                "allowHumanInput": agent.get("allowHumanInput", False),
                "backstory": agent.get("backstory", "")
            }
            
            # Add task-specific inputs
            task_inputs = {
                "task": task.get("description", ""),
                **inputs
            }
            
            # Run the agent
            result = run_autogen_tool(agent_config, task_inputs)
            results.append({
                "agent_id": agent.get("nodeId"),
                "task_id": task.get("nodeId"),
                "result": result
            })
        
        return {
            "type": "workflow_result",
            "results": results,
            "metadata": {
                "agent_count": len(agents),
                "task_count": len(tasks),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error in AutoGen workflow: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat()
            }
        }
