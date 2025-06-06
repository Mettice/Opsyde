import logging
import asyncio
import json
import os
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import autogen
    from autogen import ConversableAgent, AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
    from autogen.coding import LocalCommandLineCodeExecutor
    AUTOGEN_AVAILABLE = True
    AUTOGEN_VERSION = getattr(autogen, '__version__', 'unknown')
except ImportError as e:
    logger.warning(f"AutoGen not available: {str(e)}")
    AUTOGEN_AVAILABLE = False
    AUTOGEN_VERSION = "not_installed"

# 🎯 ADVANCED FEATURES
AUTOGEN_FEATURES = {
    "agent_types": ["assistant", "user_proxy", "conversable", "group_chat", "custom"],
    "conversation_modes": ["one_on_one", "group_chat", "sequential", "broadcast"],
    "code_execution": ["local", "docker", "restricted", "disabled"],
    "supported_providers": ["openai", "anthropic", "openrouter", "huggingface", "azure"],
    "human_input_modes": ["ALWAYS", "TERMINATE", "NEVER"],
    "termination_criteria": ["max_turns", "keyword", "silence", "custom"],
    "memory": True,
    "streaming": True,
    "function_calling": True
}

class EnhancedAutoGenRunner:
    """Enhanced AutoGen runner with modern multi-agent conversation features"""
    
    def __init__(self, max_cache_size: int = 50):
        self.agents_cache = {}
        self.conversations_cache = {}
        self.group_chats_cache = {}
        self.max_cache_size = max_cache_size
        self.conversation_history = []
        self.token_usage = {}
    
    def cleanup_resources(self):
        """Cleanup all cached resources"""
        self.agents_cache.clear()
        self.conversations_cache.clear()
        self.group_chats_cache.clear()
        self.conversation_history.clear()
        self.token_usage.clear()
        logger.info("🧹 All AutoGen runner resources cleaned up")
    
    async def get_api_key(self, provider: str, context: Optional[Any] = None) -> Optional[str]:
        """Get API key with BYOK support"""
        try:
            # Try to get from context first (BYOK)
            if context and hasattr(context, 'get_api_key_for_framework'):
                api_key = context.get_api_key_for_framework(provider)
                if api_key:
                    logger.debug(f"🔑 Using API key from execution context for {provider}")
                    return api_key
            
            # Fallback to environment variable
            env_key_map = {
                'openai': 'OPENAI_API_KEY',
                'anthropic': 'ANTHROPIC_API_KEY',
                'openrouter': 'OPENROUTER_API_KEY',
                'azure': 'AZURE_OPENAI_API_KEY',
                'huggingface': 'HUGGINGFACE_API_KEY'
            }
            
            env_key = env_key_map.get(provider)
            if env_key:
                api_key = os.getenv(env_key)
                if api_key:
                    logger.debug(f"🔑 Using API key from environment for {provider}")
                    return api_key
            
            logger.warning(f"⚠️ No API key found for provider: {provider}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting API key for {provider}: {str(e)}")
            return None
    
    def create_llm_config(self, config: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
        """Create AutoGen-compatible LLM configuration with BYOK support"""
        provider = config.get('provider', 'openai')
        model = config.get('model', 'gpt-4')
        temperature = config.get('temperature', 0.7)
        max_tokens = config.get('max_tokens', 4000)
        
        # Get API key
        api_key = self.get_api_key(provider, context)
        if not api_key:
            logger.warning(f"No API key available for {provider}")
            return None
        
        # Create AutoGen LLM config
        llm_config = {
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "config_list": [{
                "model": model,
                "api_key": api_key
            }],
            "timeout": config.get('timeout', 120),
            "seed": config.get('seed', None)
        }
        
        # Provider-specific configurations
        if provider == 'openai':
            llm_config["config_list"][0]["api_type"] = "openai"
        elif provider == 'azure':
            llm_config["config_list"][0].update({
                "api_type": "azure",
                "api_base": config.get('azure_endpoint', ''),
                "api_version": config.get('azure_api_version', '2023-12-01-preview'),
                "deployment_id": config.get('azure_deployment_id', model)
            })
        elif provider == 'openrouter':
            llm_config["config_list"][0].update({
                "api_type": "openai",
                "api_base": "https://openrouter.ai/api/v1"
            })
        elif provider == 'anthropic':
            # AutoGen doesn't natively support Anthropic, use fallback
            logger.warning(f"Provider {provider} requires fallback execution")
            return None
        
        return llm_config
    
    def create_agent(self, agent_config: Dict[str, Any], llm_config: Dict[str, Any]) -> Union[ConversableAgent, AssistantAgent, UserProxyAgent]:
        """Create AutoGen agent with advanced configuration"""
        agent_type = agent_config.get("agentType", "assistant")
        name = agent_config.get("name", f"Agent_{agent_type}")
        system_message = agent_config.get("systemMessage", "You are a helpful AI assistant.")
        human_input_mode = agent_config.get("humanInputMode", "NEVER")
        max_consecutive_auto_reply = agent_config.get("maxConsecutiveAutoReply", 10)
        code_execution = agent_config.get("codeExecution", False)
        
        try:
            if agent_type == "assistant":
                agent = AssistantAgent(
                    name=name,
                    system_message=system_message,
                    llm_config=llm_config,
                    max_consecutive_auto_reply=max_consecutive_auto_reply,
                    human_input_mode=human_input_mode,
                    description=agent_config.get("description", f"An AI assistant named {name}")
                )
            
            elif agent_type == "user_proxy":
                code_config = False
                if code_execution:
                    code_config = {
                        "executor": LocalCommandLineCodeExecutor(
                            timeout=agent_config.get("code_timeout", 60),
                            work_dir=agent_config.get("work_dir", "autogen_workspace")
                        )
                    }
                
                agent = UserProxyAgent(
                    name=name,
                    system_message=system_message,
                    human_input_mode=human_input_mode,
                    max_consecutive_auto_reply=max_consecutive_auto_reply,
                    code_execution_config=code_config,
                    description=agent_config.get("description", f"A user proxy agent named {name}")
                )
            
            elif agent_type == "conversable":
                agent = ConversableAgent(
                    name=name,
                    system_message=system_message,
                    llm_config=llm_config,
                    human_input_mode=human_input_mode,
                    max_consecutive_auto_reply=max_consecutive_auto_reply,
                    description=agent_config.get("description", f"A conversable agent named {name}")
                )
            
            else:
                raise ValueError(f"Unsupported agent type: {agent_type}")
            
            logger.info(f"✅ Created {agent_type} agent: {name}")
            return agent
            
        except Exception as e:
            logger.error(f"Failed to create {agent_type} agent: {str(e)}")
            raise
    
    async def run_one_on_one_conversation(self, agent1, agent2, message: str, max_turns: int = 10) -> Dict[str, Any]:
        """Run one-on-one conversation between two agents"""
        try:
            logger.info(f"🗣️ Starting conversation between {agent1.name} and {agent2.name}")
            
            # Initiate chat
            chat_result = agent1.initiate_chat(
                agent2,
                message=message,
                max_turns=max_turns,
                summary_method="reflection_with_llm"
            )
            
            # Extract conversation history
            chat_history = agent1.chat_messages.get(agent2, [])
            
            # Get final response
            last_message = chat_history[-1]["content"] if chat_history else "No response"
            
            # Extract summary if available
            summary = getattr(chat_result, 'summary', None) if hasattr(chat_result, 'summary') else None
            
            return {
                "success": True,
                "output": last_message,
                "conversation_type": "one_on_one",
                "participants": [agent1.name, agent2.name],
                "turn_count": len(chat_history),
                "full_history": chat_history,
                "summary": summary,
                "chat_result": chat_result
            }
            
        except Exception as e:
            logger.error(f"One-on-one conversation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "conversation_type": "one_on_one"
            }
    
    async def run_group_chat(self, agents: List, message: str, max_rounds: int = 10) -> Dict[str, Any]:
        """Run group chat conversation with multiple agents"""
        try:
            logger.info(f"👥 Starting group chat with {len(agents)} agents")
            
            # Create group chat
            group_chat = GroupChat(
                agents=agents,
                messages=[],
                max_round=max_rounds,
                speaker_selection_method="auto"
            )
            
            # Create group chat manager
            manager = GroupChatManager(
                groupchat=group_chat,
                llm_config=agents[0].llm_config if hasattr(agents[0], 'llm_config') else None
            )
            
            # Start group conversation
            chat_result = agents[0].initiate_chat(
                manager,
                message=message,
                max_turns=max_rounds
            )
            
            # Extract results
            group_messages = group_chat.messages
            last_message = group_messages[-1]["content"] if group_messages else "No response"
            
            return {
                "success": True,
                "output": last_message,
                "conversation_type": "group_chat",
                "participants": [agent.name for agent in agents],
                "round_count": len(group_messages),
                "full_history": group_messages,
                "chat_result": chat_result
            }
            
        except Exception as e:
            logger.error(f"Group chat failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "conversation_type": "group_chat"
            }

async def run_autogen_tool(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Enhanced AutoGen tool execution with modern multi-agent features"""
    
    if not AUTOGEN_AVAILABLE:
        return await _autogen_fallback(config, inputs, context)
    
    start_time = datetime.now()
    
    try:
        # Initialize enhanced runner
        runner = EnhancedAutoGenRunner()
        
        # Extract configuration
        conversation_mode = config.get("conversationMode", "one_on_one")
        agent_configs = config.get("agents", [config])  # Support both single and multi-agent
        max_turns = config.get("maxTurns", 10)
        streaming = config.get("streaming", False)
        
        logger.info(f"🚀 AutoGen execution: mode={conversation_mode}, agents={len(agent_configs)}")
        
        # Create LLM configuration
        llm_config = runner.create_llm_config(config, context)
        if not llm_config:
            return await _autogen_fallback(config, inputs, context)
        
        # Create agents
        agents = []
        for agent_config in agent_configs:
            agent = runner.create_agent(agent_config, llm_config)
            agents.append(agent)
        
        # Ensure we have at least one agent
        if not agents:
            # Create default assistant agent
            default_config = {
                "agentType": "assistant",
                "name": "DefaultAssistant",
                "systemMessage": config.get("systemMessage", "You are a helpful AI assistant.")
            }
            agents.append(runner.create_agent(default_config, llm_config))
        
        # Get message from inputs
        message = inputs.get("message", inputs.get("input", "Hello"))
        
        # Execute based on conversation mode
        if conversation_mode == "group_chat" and len(agents) > 2:
            result = await runner.run_group_chat(agents, message, max_turns)
        else:
            # Default to one-on-one conversation
            if len(agents) == 1:
                # Create a user proxy for single agent
                user_proxy_config = {
                    "agentType": "user_proxy",
                    "name": "UserProxy",
                    "humanInputMode": "NEVER"
                }
                user_proxy = runner.create_agent(user_proxy_config, llm_config)
                agents.append(user_proxy)
            
            result = await runner.run_one_on_one_conversation(
                agents[0], agents[1], message, max_turns
            )
        
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        if result.get("success"):
            return {
                "type": "autogen_result",
                "output": result.get("output", "No response"),
                "framework": "autogen",
                "success": True,
                "metadata": {
                    "conversation_mode": conversation_mode,
                    "agent_count": len(agent_configs),
                    "turn_count": result.get("turn_count", result.get("round_count", 0)),
                    "participants": result.get("participants", []),
                    "execution_time": execution_time,
                    "input_length": len(message),
                    "output_length": len(result.get("output", "")),
                    "streaming": streaming,
                    "provider": config.get('provider', 'openai'),
                    "model": config.get('model', 'gpt-4'),
                    "autogen_version": AUTOGEN_VERSION,
                    "timestamp": end_time.isoformat()
                },
                "conversation_history": result.get("full_history", [])[:5]  # Include first 5 messages
            }
        else:
            return {
                "type": "error",
                "error": result.get("error", "AutoGen execution failed"),
                "framework": "autogen",
                "success": False,
                "metadata": {
                    "execution_time": execution_time,
                    "timestamp": end_time.isoformat()
                }
            }
        
    except Exception as e:
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        logger.error(f"❌ AutoGen execution failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "autogen",
            "success": False,
            "metadata": {
                "execution_time": execution_time,
                "timestamp": end_time.isoformat()
            }
        }

async def _autogen_fallback(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Enhanced fallback when AutoGen is not available"""
    try:
        # Use the same pattern as other frameworks for fallback
        system_message = config.get("systemMessage", "You are a helpful assistant.")
        message = inputs.get("message", inputs.get("input", "Hello"))
        
        # Get LLM configuration
        llm_config = config.get("llm", config)
        provider = llm_config.get('provider', 'openai')
        model = llm_config.get('model', 'gpt-3.5-turbo')
        
        # Create conversation prompt
        prompt = f"""{system_message}

User: {message}
"""
        
        # Create conversation history
        conversation_history = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": message}
        ]
        
        # Create conversation result
        conversation_result = {
            "success": True,
            "output": prompt,
            "conversation_type": "one_on_one",
            "participants": ["Assistant", "User"],
            "turn_count": 1,
            "full_history": conversation_history,
            "summary": None,
            "chat_result": None
        }
        
        return {
            "type": "autogen_fallback",
            "output": conversation_result,
            "framework": "autogen_fallback",
            "success": True,
            "note": "AutoGen not available - using fallback"
        }
        
    except Exception as e:
        logger.error(f"❌ AutoGen fallback failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "autogen_fallback",
            "success": False,
            "note": "AutoGen fallback failed"
        }

# 🔌 FRONTEND INTEGRATION UTILITIES
def get_autogen_capabilities() -> Dict[str, Any]:
    """Get complete AutoGen capabilities for frontend configuration"""
    return {
        "available": AUTOGEN_AVAILABLE,
        "version": AUTOGEN_VERSION,
        "features": AUTOGEN_FEATURES,
        "supported_providers": AUTOGEN_FEATURES["supported_providers"],
        "agent_types": AUTOGEN_FEATURES["agent_types"],
        "conversation_modes": AUTOGEN_FEATURES["conversation_modes"],
        "code_execution": AUTOGEN_FEATURES["code_execution"],
        "human_input_modes": AUTOGEN_FEATURES["human_input_modes"],
        "termination_criteria": AUTOGEN_FEATURES["termination_criteria"]
    }

def get_agent_templates() -> Dict[str, Dict[str, Any]]:
    """Get predefined agent templates for quick setup"""
    return {
        "researcher": {
            "agentType": "assistant",
            "name": "Researcher",
            "systemMessage": "You are a skilled researcher who can find and analyze information from various sources. You provide detailed, well-sourced answers.",
            "description": "Research agent specializing in information gathering and analysis"
        },
        "coder": {
            "agentType": "assistant", 
            "name": "Coder",
            "systemMessage": "You are an expert programmer who can write, debug, and explain code in multiple programming languages.",
            "description": "Programming assistant for code generation and debugging",
            "codeExecution": True
        },
        "analyst": {
            "agentType": "assistant",
            "name": "Analyst",
            "systemMessage": "You are a data analyst who can interpret data, create insights, and provide strategic recommendations.",
            "description": "Data analysis and strategic planning agent"
        },
        "critic": {
            "agentType": "assistant",
            "name": "Critic", 
            "systemMessage": "You are a constructive critic who reviews work and provides detailed feedback for improvement.",
            "description": "Quality assurance and review agent"
        },
        "facilitator": {
            "agentType": "user_proxy",
            "name": "Facilitator",
            "systemMessage": "You facilitate conversations and ensure productive collaboration between agents.",
            "description": "Conversation facilitator and coordinator",
            "humanInputMode": "NEVER"
        }
    }

def get_conversation_templates() -> Dict[str, Dict[str, Any]]:
    """Get predefined conversation templates for common use cases"""
    return {
        "brainstorming": {
            "conversationMode": "group_chat",
            "maxTurns": 15,
            "description": "Multi-agent brainstorming session",
            "agents": ["researcher", "analyst", "critic"]
        },
        "code_review": {
            "conversationMode": "one_on_one", 
            "maxTurns": 8,
            "description": "Code review between programmer and critic",
            "agents": ["coder", "critic"]
        },
        "research_project": {
            "conversationMode": "sequential",
            "maxTurns": 12,
            "description": "Research project workflow",
            "agents": ["researcher", "analyst", "facilitator"]
        },
        "problem_solving": {
            "conversationMode": "group_chat",
            "maxTurns": 20,
            "description": "Collaborative problem solving",
            "agents": ["researcher", "coder", "analyst", "critic"]
        }
    }

# Export main functions
__all__ = [
    "run_autogen_tool",
    "get_autogen_capabilities", 
    "get_agent_templates",
    "get_conversation_templates",
    "EnhancedAutoGenRunner",
    "AUTOGEN_FEATURES"
]
