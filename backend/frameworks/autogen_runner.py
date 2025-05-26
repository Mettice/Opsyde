import logging
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import autogen
    AUTOGEN_AVAILABLE = True
except ImportError:
    logger.warning("AutoGen not installed")
    AUTOGEN_AVAILABLE = False

async def run_autogen_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced AutoGen runner with full features"""
    
    if not AUTOGEN_AVAILABLE:
        return await _autogen_fallback(config, inputs)
    
    try:
        # Extract configuration
        agent_type = config.get("agentType", "assistant")
        system_message = config.get("systemMessage", "You are a helpful assistant.")
        human_input_mode = config.get("humanInputMode", "NEVER")
        max_consecutive_auto_reply = config.get("maxConsecutiveAutoReply", 10)
        code_execution = config.get("codeExecution", False)
        
        # Get LLM configuration
        llm_config = config.get("llm", {})
        autogen_llm_config = {
            "model": llm_config.get("model", "gpt-4"),
            "temperature": llm_config.get("temperature", 0.7),
            "max_tokens": llm_config.get("max_tokens", 1000),
            "config_list": [{
                "model": llm_config.get("model", "gpt-4"),
                "api_key": llm_config.get("api_key", ""),
                "base_url": llm_config.get("base_url", "")
            }]
        }
        
        # Create agents based on type
        if agent_type == "assistant":
            agent = autogen.AssistantAgent(
                name="Assistant",
                system_message=system_message,
                llm_config=autogen_llm_config
            )
        elif agent_type == "user_proxy":
            agent = autogen.UserProxyAgent(
                name="UserProxy",
                human_input_mode=human_input_mode,
                max_consecutive_auto_reply=max_consecutive_auto_reply,
                code_execution_config={"work_dir": "autogen_workspace"} if code_execution else False
            )
        elif agent_type == "conversable":
            agent = autogen.ConversableAgent(
                name="Conversable",
                system_message=system_message,
                llm_config=autogen_llm_config,
                human_input_mode=human_input_mode
            )
        else:
            raise ValueError(f"Unsupported agent type: {agent_type}")
        
        # Create user proxy for interaction
        user_proxy = autogen.UserProxyAgent(
            name="User",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=0
        )
        
        # Get message from inputs
        message = inputs.get("message", inputs.get("input", "Hello"))
        
        # Start conversation
        chat_result = user_proxy.initiate_chat(
            agent,
            message=message,
            max_turns=max_consecutive_auto_reply
        )
        
        # Extract result
        chat_history = user_proxy.chat_messages.get(agent, [])
        last_message = chat_history[-1]["content"] if chat_history else "No response"
        
        return {
            "type": "autogen_result",
            "output": last_message,
            "framework": "autogen",
            "success": True,
            "metadata": {
                "agent_type": agent_type,
                "chat_turns": len(chat_history),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"AutoGen execution failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "autogen",
            "success": False
        }

async def _autogen_fallback(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback when AutoGen is not available"""
    from .openrouter_runner import run_openrouter_chat
    
    system_message = config.get("systemMessage", "You are a helpful assistant.")
    message = inputs.get("message", inputs.get("input", "Hello"))
    
    llm_config = config.get("llm", {})
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": message}
    ]
    
    response = await run_openrouter_chat(
        messages=messages,
        model=llm_config.get("model", "gpt-4"),
        temperature=llm_config.get("temperature", 0.7)
    )
    
    return {
        "type": "autogen_fallback",
        "output": response,
        "framework": "autogen_fallback",
        "success": True,
        "note": "AutoGen not available - using fallback"
    }
