import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

# Framework metadata with proper separation between LLMs and frameworks
FRAMEWORK_METADATA = {
    "crewai": {
        "name": "CrewAI",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": True,
        "required_fields": ["systemMessage", "agentType"],
        "optional_fields": ["tools", "memory", "maxIterations"]
    },
    "langchain": {
        "name": "LangChain",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": False,
        "required_fields": ["chainType"],
        "optional_fields": ["memory", "tools", "temperature", "maxTokens"]
    },
    "autogen": {
        "name": "AutoGen",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": True,
        "required_fields": ["agentType"],
        "optional_fields": ["tools", "maxMessages", "temperature", "maxTokens"]
    },
    "llamaindex": {
        "name": "LlamaIndex",
        "requires_llm": True,
        "supports_tools": False,
        "supports_memory": True,
        "supports_multi_agent": False,
        "required_fields": ["indexType", "documentsSource"],
        "optional_fields": ["queryMode", "temperature", "maxTokens", "chunkSize"]
    },
    "openai": {
        "name": "OpenAI",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["model"],
        "optional_fields": ["temperature", "maxTokens", "tools", "systemMessage"]
    },
    "anthropic": {
        "name": "Anthropic",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["model"],
        "optional_fields": ["temperature", "maxTokens", "systemMessage"]
    },
    "perplexity": {
        "name": "Perplexity AI",
        "requires_llm": True,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["model"],
        "optional_fields": ["temperature", "maxTokens", "systemMessage"]
    },
    "openrouter": {
        "name": "OpenRouter",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["model"],
        "optional_fields": ["temperature", "maxTokens", "tools", "systemMessage"]
    },
    "huggingface": {
        "name": "Hugging Face",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["model", "task"],
        "optional_fields": ["temperature", "maxTokens", "use_cache"]
    },
    "universal_api": {
        "name": "Universal API",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "endpoint", "headers", "api_key"],
        "description": "Universal API integration for any REST/GraphQL service"
    },
    "api": {
        "name": "Generic API",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["endpoint"],
        "optional_fields": ["method", "headers", "auth_token", "api_key"],
        "description": "Generic API tool for REST calls"
    },
    "webhook": {
        "name": "Webhook",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["url"],
        "optional_fields": ["method", "headers", "auth_token"],
        "description": "HTTP webhook calls and notifications"
    },
    "communication": {
        "name": "Communication",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "channel_id", "user_id", "platform"],
        "supported_platforms": ["slack", "discord", "teams"],
        "description": "Communication platforms integration"
    },
    "productivity": {
        "name": "Productivity",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "workspace_id", "database_id", "platform"],
        "supported_platforms": ["notion", "airtable", "googlesheets"],
        "description": "Productivity and workspace tools"
    },
    "developer": {
        "name": "Developer Tools",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "repo_name", "org_name", "platform"],
        "supported_platforms": ["github", "gitlab", "webhook"],
        "description": "Developer tools and version control"
    },
    "marketing": {
        "name": "Marketing",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "list_id", "campaign_id", "platform"],
        "supported_platforms": ["mailchimp", "sendgrid"],
        "description": "Marketing automation and email campaigns"
    },
    "crm": {
        "name": "CRM",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "contact_id", "deal_id", "platform"],
        "supported_platforms": ["hubspot", "salesforce"],
        "description": "Customer relationship management"
    },
    "social_media": {
        "name": "Social Media",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "page_id", "user_id", "platform"],
        "supported_platforms": ["linkedin", "facebook", "whatsapp", "telegram"],
        "description": "Social media platforms integration"
    },
    "ecommerce": {
        "name": "E-commerce",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "shop_name", "product_id", "platform"],
        "supported_platforms": ["shopify", "stripe"],
        "description": "Online store and payment processing"
    },
    "storage": {
        "name": "Storage",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "folder_id", "file_path", "platform"],
        "supported_platforms": ["google_drive", "dropbox"],
        "description": "Cloud storage and file management"
    },
    "task": {
        "name": "Task",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["description"],
        "optional_fields": ["expectedOutput", "agentId"],
        "description": "Task execution node"
    },
    "logic": {
        "name": "Logic",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["condition"],
        "optional_fields": [],
        "description": "Logic gate and conditional routing"
    },
    "trigger": {
        "name": "Trigger",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["triggerType"],
        "optional_fields": ["scheduleType", "runAt", "interval"],
        "description": "Workflow trigger and scheduling"
    },
    "input": {
        "name": "Input",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": [],
        "optional_fields": ["defaultValue", "inputType"],
        "description": "Input data collection"
    },
    "output": {
        "name": "Output",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["outputType"],
        "optional_fields": ["destination", "template"],
        "description": "Output data routing"
    },
    "output_webhook": {
        "name": "Webhook Output",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["webhook_url"],
        "optional_fields": ["method", "headers"],
        "description": "Webhook output destination"
    },
    "output_email": {
        "name": "Email Output",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["to", "subject"],
        "optional_fields": ["cc", "bcc", "template"],
        "description": "Email output destination"
    },
    "output_file": {
        "name": "File Output",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["file_path"],
        "optional_fields": ["format", "encoding"],
        "description": "File output destination"
    },
    "output_database": {
        "name": "Database Output",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["connection_string", "table"],
        "optional_fields": ["schema", "batch_size"],
        "description": "Database output destination"
    },
    "output_cms": {
        "name": "CMS Output",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["cms_type"],
        "optional_fields": ["api_key", "content_type"],
        "description": "Content management system output"
    },
    "delay": {
        "name": "Delay",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["duration"],
        "optional_fields": ["unit"],
        "description": "Workflow delay and timing"
    },
    "chat": {
        "name": "Chat",
        "requires_llm": True,
        "supports_tools": False,
        "supports_memory": True,
        "supports_multi_agent": False,
        "required_fields": ["prompt"],
        "optional_fields": ["model", "temperature", "max_tokens"],
        "description": "Chat and conversational AI"
    }
}

# LLM provider metadata (separate from frameworks)
LLM_METADATA = {
    "openai": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "gpt-4", "name": "GPT-4", "context": 8192, "cost_tier": "high"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "context": 128000, "cost_tier": "high"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "context": 4096, "cost_tier": "medium"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_tokens": {"min": 1, "max": 4096, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1},
            "frequency_penalty": {"min": -2, "max": 2, "default": 0},
            "presence_penalty": {"min": -2, "max": 2, "default": 0}
        }
    },
    "anthropic": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "claude-3-opus", "name": "Claude 3 Opus", "context": 200000, "cost_tier": "high"},
            {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "context": 200000, "cost_tier": "medium"},
            {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "context": 200000, "cost_tier": "low"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 1, "default": 0.7},
            "max_tokens": {"min": 1, "max": 4096, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "openrouter": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "openai/gpt-4", "name": "GPT-4 (via OpenRouter)", "context": 8192, "cost_tier": "high"},
            {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus (via OpenRouter)", "context": 200000, "cost_tier": "high"},
            {"id": "meta-llama/llama-2-70b-chat", "name": "Llama 2 70B", "context": 4096, "cost_tier": "medium"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_tokens": {"min": 1, "max": 4096, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "gemini": {
        "type": "llm_provider", 
        "api_key_required": True,
        "models": [
            {"id": "gemini-pro", "name": "Gemini Pro", "context": 32768, "cost_tier": "medium"},
            {"id": "gemini-pro-vision", "name": "Gemini Pro Vision", "context": 16384, "cost_tier": "high"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 1, "default": 0.7},
            "max_tokens": {"min": 1, "max": 2048, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "perplexity": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "sonar-pro", "name": "Sonar Pro (Advanced search)", "context": 200000, "cost_tier": "medium"},
            {"id": "sonar", "name": "Sonar (Lightweight search)", "context": 128000, "cost_tier": "low"},
            {"id": "sonar-deep-research", "name": "Sonar Deep Research (Comprehensive reports)", "context": 128000, "cost_tier": "high"},
            {"id": "sonar-reasoning-pro", "name": "Sonar Reasoning Pro (Chain of Thought)", "context": 128000, "cost_tier": "medium"},
            {"id": "sonar-reasoning", "name": "Sonar Reasoning (Fast reasoning)", "context": 128000, "cost_tier": "low"},
            {"id": "r1-1776", "name": "R1-1776 (Offline chat model)", "context": 128000, "cost_tier": "medium"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_tokens": {"min": 1, "max": 32000, "default": 1000},
            "top_p": {"min": 0, "max": 1, "default": 1}
        }
    },
    "huggingface": {
        "type": "llm_provider",
        "api_key_required": True,
        "models": [
            {"id": "microsoft/DialoGPT-medium", "name": "DialoGPT Medium", "context": 1024, "cost_tier": "low"},
            {"id": "microsoft/phi-2", "name": "Phi-2", "context": 2048, "cost_tier": "low"},
            {"id": "mistralai/Mistral-7B-Instruct-v0.2", "name": "Mistral 7B", "context": 8192, "cost_tier": "low"}
        ],
        "parameters": {
            "temperature": {"min": 0, "max": 2, "default": 0.7},
            "max_length": {"min": 1, "max": 2048, "default": 512},
            "do_sample": {"type": "boolean", "default": True}
        }
    }
}

def get_framework_requirements(framework: str) -> Dict[str, Any]:
    """Get framework requirements and metadata"""
    return FRAMEWORK_METADATA.get(framework.lower(), {})

def get_llm_requirements(provider: str) -> Dict[str, Any]:
    """Get LLM provider requirements and metadata"""
    return LLM_METADATA.get(provider.lower(), {})

def get_available_frameworks() -> List[str]:
    """Get list of available frameworks"""
    return list(FRAMEWORK_METADATA.keys())

def get_available_llm_providers() -> List[str]:
    """Get list of available LLM providers"""
    return list(LLM_METADATA.keys())

def validate_framework_llm_combination(framework: str, llm_provider: str) -> Dict[str, Any]:
    """Validate if framework supports the LLM provider"""
    framework_meta = get_framework_requirements(framework)
    
    # If framework is not found, check if it's actually an LLM provider being used as a framework
    if not framework_meta:
        llm_meta = get_llm_requirements(framework)
        if llm_meta:
            # It's an LLM provider being used directly as a framework (like OpenRouter)
            return {"valid": True, "note": f"{framework} is being used as both framework and LLM provider"}
        else:
            return {"valid": False, "error": f"Unknown framework: {framework}"}
    
    # Check if framework requires LLM
    if framework_meta.get("requires_llm", False):
        if not llm_provider:
            return {"valid": False, "error": f"Framework {framework} requires an LLM provider"}
        
        supported_llms = framework_meta.get("supported_llms", [])
        if supported_llms and llm_provider not in supported_llms:
            return {
                "valid": False, 
                "error": f"Framework {framework} doesn't support {llm_provider}. Supported: {supported_llms}"
            }
    
    return {"valid": True}

class EnhancedFrameworkRegistry:
    """Enhanced framework registry with LLM/Framework separation"""
    
    def __init__(self):
        self._frameworks = {}
        self._metrics = {}
        self.register_all_frameworks()
    
    def register_all_frameworks(self):
        """Register all available frameworks"""
        logger.info("🔧 Starting framework registration...")
        
        try:
            logger.info("🔧 Attempting to import CrewAI runner...")
            from frameworks.crewai_runner import run_crewai_tool
            self.register("crewai", run_crewai_tool)
            logger.info("✅ CrewAI runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ CrewAI runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ CrewAI runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import LangChain runner...")
            from frameworks.langchain_runner import run_langchain_tool
            self.register("langchain", run_langchain_tool)
            logger.info("✅ LangChain runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ LangChain runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ LangChain runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import AutoGen runner...")
            from frameworks.autogen_runner import run_autogen_tool
            self.register("autogen", run_autogen_tool)
            logger.info("✅ AutoGen runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ AutoGen runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ AutoGen runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import LlamaIndex runner...")
            from frameworks.llamaindex_runner import run_llamaindex_tool
            self.register("llamaindex", run_llamaindex_tool)
            logger.info("✅ LlamaIndex runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ LlamaIndex runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ LlamaIndex runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import HuggingFace runner...")
            from frameworks.huggingface_runner import run_huggingface_tool
            self.register("huggingface", run_huggingface_tool)
            logger.info("✅ HuggingFace runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ HuggingFace runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ HuggingFace runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import OpenRouter runner...")
            from frameworks.openrouter_runner import run_openrouter_tool
            self.register("openrouter", run_openrouter_tool)
            logger.info("✅ OpenRouter runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ OpenRouter runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ OpenRouter runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import Universal API runner...")
            from frameworks.universal_api_runner import run_universal_api_tool
            self.register("universal_api", run_universal_api_tool)
            logger.info("✅ Universal API runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ Universal API runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ Universal API runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import Social Media runner...")
            from frameworks.social_media_runner import run_social_media_tool
            self.register("social_media", run_social_media_tool)
            logger.info("✅ Social Media runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ Social Media runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ Social Media runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import Integration Manager...")
            from frameworks.integration_manager import run_integration_tool
            self.register("integration_manager", run_integration_tool)
            logger.info("✅ Integration Manager registered successfully")
        except ImportError as e:
            logger.warning(f"❌ Integration Manager not available: {e}")
        except Exception as e:
            logger.error(f"❌ Integration Manager failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to import Communication runner...")
            from frameworks.integration_runners.communication_runner import run_communication_tool
            self.register("communication", run_communication_tool)
            logger.info("✅ Communication runner registered successfully")
        except ImportError as e:
            logger.warning(f"❌ Communication runner not available: {e}")
        except Exception as e:
            logger.error(f"❌ Communication runner failed with unexpected error: {e}")
        
        try:
            logger.info("🔧 Attempting to register Generic API handler...")
            # Register generic API handler that routes to appropriate tool runner
            async def run_generic_api_tool(config, inputs, context=None):
                """Generic API tool handler that routes to appropriate backend"""
                try:
                    # Convert NodeData objects to serializable format
                    if hasattr(inputs, '__dict__'):
                        # If inputs is a NodeData object, extract the actual data
                        if hasattr(inputs, 'data'):
                            inputs = inputs.data
                        elif hasattr(inputs, 'content'):
                            inputs = {'inputs': inputs.content}
                        else:
                            inputs = {'inputs': str(inputs)}
                    elif not isinstance(inputs, dict):
                        inputs = {'inputs': inputs}
                    
                    # Check if this is actually a HuggingFace tool misclassified as API
                    if config.get('hfTask') or config.get('hfModel') or config.get('toolType') == 'huggingface':
                        logger.info("🤗 Detected HuggingFace tool misclassified as API, routing to HuggingFace handler")
                        from frameworks.huggingface_runner import run_huggingface_tool
                        return await run_huggingface_tool(config, inputs, context)
                    
                    # Check if this is a Universal API tool
                    elif config.get('toolType') == 'universal_api' or config.get('api_service_name'):
                        logger.info("🌐 Routing to Universal API handler")
                        from frameworks.universal_api_runner import run_universal_api_tool
                        return await run_universal_api_tool(config, inputs)
                    
                    # Otherwise treat as generic API tool
                    else:
                        logger.info("🔗 Treating as generic API tool")
                        return {
                            "success": True,
                            "output": f"Generic API tool executed with inputs: {inputs}",
                            "framework": "api"
                        }
                        
                except Exception as e:
                    logger.error(f"❌ Generic API tool error: {str(e)}")
                    return {
                        "success": False,
                        "error": f"Generic API tool failed: {str(e)}",
                        "framework": "api"
                    }
            
            self.register("api", run_generic_api_tool)
            logger.info("✅ Generic API handler registered successfully")
        except Exception as e:
            logger.error(f"❌ Generic API handler registration failed: {e}")
        
        logger.info(f"🔧 Framework registration complete. Registered {len(self._frameworks)} frameworks: {list(self._frameworks.keys())}")
    
    def register(self, name: str, runner_func: Callable):
        """Register a framework runner"""
        self._frameworks[name] = runner_func
        self._metrics[name] = {
            "total_executions": 0,
            "total_errors": 0,
            "avg_execution_time": 0.0
        }
        logger.info(f"Registered framework: {name}")
    
    async def execute_framework(
        self, 
        framework: str, 
        config: Dict[str, Any], 
        input_data: Any,
        timeout: Optional[int] = 300
    ) -> Dict[str, Any]:
        """Execute framework with enhanced error handling and metrics"""
        
        # Validate framework exists
        if framework not in self._frameworks:
            available = ", ".join(self.get_available_frameworks())
            return {
                "success": False,
                "error": f"Unsupported framework: {framework}. Available: {available}",
                "framework_used": framework
            }
        
        # Validate framework/LLM combination
        llm_config = config.get('llm', {})
        llm_provider = llm_config.get('provider')
        
        validation = validate_framework_llm_combination(framework, llm_provider)
        if not validation["valid"]:
            return {
                "success": False,
                "error": validation["error"],
                "framework_used": framework
            }
        
        runner_func = self._frameworks[framework]
        start_time = datetime.now()
        
        try:
            # Execute with timeout if it's an async function
            if asyncio.iscoroutinefunction(runner_func):
                if timeout:
                    result = await asyncio.wait_for(
                        runner_func(config=config, inputs=input_data),
                        timeout=timeout
                    )
                else:
                    result = await runner_func(config=config, inputs=input_data)
            else:
                # Sync function
                result = runner_func(config=config, inputs=input_data)
            
            # Update metrics
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(framework, execution_time, success=True)
            
            # Ensure result is properly formatted
            if not isinstance(result, dict):
                result = {"result": result}
            
            result.update({
                "framework_used": framework,
                "execution_time": execution_time,
                "success": True
            })
            
            return result
            
        except asyncio.TimeoutError:
            self._update_metrics(framework, 0, success=False)
            return {
                "success": False,
                "error": f"Framework {framework} execution timed out after {timeout}s",
                "framework_used": framework
            }
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(framework, execution_time, success=False)
            
            logger.error(f"Framework {framework} execution failed: {str(e)}")
            
            return {
                "framework_used": framework,
                "execution_time": execution_time,
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    def get_available_frameworks(self):
        """Get list of available frameworks with their status"""
        availability = self._check_framework_availability()
        
        frameworks = []
        for name, runner_func in self._frameworks.items():
            try:
                is_available = availability.get(name, False)
                
                frameworks.append({
                    "name": name,
                    "available": is_available,
                    "runner": runner_func.__name__ if hasattr(runner_func, '__name__') else "Function",
                    "status": "Available" if is_available else "Not installed"
                })
            except Exception as e:
                frameworks.append({
                    "name": name,
                    "available": False,
                    "runner": "Error",
                    "status": f"Error: {str(e)}"
                })
        
        return frameworks
    
    def get_framework_metrics(self, framework: str) -> Dict[str, Any]:
        """Get execution metrics for a framework"""
        return self._metrics.get(framework, {})
    
    def _update_metrics(self, framework: str, execution_time: float, success: bool):
        """Update execution metrics for a framework"""
        metrics = self._metrics[framework]
        metrics["total_executions"] += 1
        
        if not success:
            metrics["total_errors"] += 1
        
        # Update average execution time
        total_time = metrics["avg_execution_time"] * (metrics["total_executions"] - 1)
        metrics["avg_execution_time"] = (total_time + execution_time) / metrics["total_executions"]

    def _get_universal_api_runner(self):
        """Get Universal API runner"""
        try:
            from frameworks.universal_api_runner import run_universal_api_tool
            return run_universal_api_tool
        except ImportError as e:
            logger.warning(f"Universal API runner not available: {e}")
            return None

    def _check_framework_availability(self):
        """Check which frameworks are available"""
        availability = {}
        
        # Check each framework
        for framework in self._frameworks.keys():
            try:
                if framework == "crewai":
                    import crewai
                    availability[framework] = True
                elif framework == "langchain":
                    import langchain
                    availability[framework] = True
                elif framework == "autogen":
                    import autogen
                    availability[framework] = True
                elif framework == "llamaindex":
                    import llama_index.core
                    availability[framework] = True
                elif framework == "huggingface":
                    import transformers
                    availability[framework] = True
                elif framework == "openrouter":
                    # OpenRouter is always available as it's built-in
                    availability[framework] = True
                elif framework == "universal_api":
                    # Universal API is always available as it's built-in
                    availability[framework] = True
                elif framework == "api":
                    # Generic API is always available as it's built-in
                    availability[framework] = True
                elif framework == "social_media":
                    # Social Media is always available as it's built-in
                    availability[framework] = True
                else:
                    availability[framework] = False
            except ImportError:
                availability[framework] = False
            except Exception as e:
                logger.warning(f"Error checking {framework} availability: {e}")
                availability[framework] = False
        
        return availability

# Global registry instance
framework_registry = EnhancedFrameworkRegistry()

# FastAPI routes for frontend integration
def create_framework_routes():
    """Create FastAPI routes for framework metadata"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/frameworks", tags=["frameworks"])
    
    @router.get("/metadata/{name}")
    def get_framework_metadata(name: str):
        """Get framework metadata"""
        return get_framework_requirements(name)
    
    @router.get("/llm-providers/{name}")
    def get_llm_metadata(name: str):
        """Get LLM provider metadata"""
        return get_llm_requirements(name)
    
    @router.get("/available")
    def get_available_frameworks_api():
        """Get list of available frameworks"""
        return {
            "frameworks": get_available_frameworks(),
            "llm_providers": get_available_llm_providers()
        }
    
    @router.post("/validate")
    def validate_configuration(config: Dict[str, Any]):
        """Validate framework and LLM configuration"""
        framework = config.get("framework")
        llm_provider = config.get("llm", {}).get("provider")
        
        return validate_framework_llm_combination(framework, llm_provider)
    
    return router

# Backward compatibility function
def run_framework_tool(framework: str, config: dict, input_data: dict):
    """
    Backward compatible synchronous wrapper
    """
    try:
        if asyncio.iscoroutinefunction(framework_registry._frameworks.get(framework)):
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run, 
                        framework_registry.execute_framework(framework, config, input_data)
                    )
                    return future.result()
            else:
                return asyncio.run(
                    framework_registry.execute_framework(framework, config, input_data)
                )
        else:
            return asyncio.run(
                framework_registry.execute_framework(framework, config, input_data)
            )
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "framework_used": framework
        }