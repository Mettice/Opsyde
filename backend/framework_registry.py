import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import asyncio
from frameworks.base_runner import BaseFrameworkRunner
from frameworks.langchain_runner import run_langchain_tool

logger = logging.getLogger(__name__)

# Framework metadata with proper separation between LLMs and frameworks
FRAMEWORK_METADATA = {
    "crewai": {
        "name": "CrewAI",
        "version": "1.0",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": True,
        "required_fields": ["role", "goal"],
        "optional_fields": ["backstory", "allow_delegation", "tools", "memory", "max_iterations"],
        "supported_llm_providers": ["openai", "anthropic", "perplexity", "google", "mistral", "cohere", "openrouter", "huggingface"],
        "description": "Multi-agent framework for complex task orchestration"
    },
    "langchain": {
        "name": "LangChain",
        "version": "1.0",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": True,
        "supports_multi_agent": False,
        "required_fields": ["chain_type"],
        "optional_fields": ["memory", "tools", "temperature", "max_tokens"],
        "supported_llm_providers": ["openai", "anthropic", "perplexity", "google", "huggingface", "openrouter", "cohere", "mistral"],
        "description": "Framework for building LLM-powered applications"
    },
    "autogen": {
        "name": "AutoGen",
        "version": "1.0",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": True,
        "required_fields": ["agent_type"],
        "optional_fields": ["tools", "max_messages", "temperature", "max_tokens"],
        "supported_llm_providers": ["openai", "azure", "openrouter", "perplexity", "anthropic", "google"],
        "description": "Conversational AI framework for multi-agent systems"
    },
    "llamaindex": {
        "name": "LlamaIndex",
        "version": "1.0",
        "requires_llm": True,
        "supports_tools": False,
        "supports_memory": True,
        "supports_multi_agent": False,
        "required_fields": ["index_type", "chunk_size"],
        "optional_fields": ["query_mode", "temperature", "max_tokens", "chunk_overlap"],
        "supported_llm_providers": ["openai", "anthropic", "huggingface", "perplexity", "cohere"],
        "description": "Data framework for LLM applications"
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
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["task_type", "model_name"],
        "optional_fields": ["temperature", "max_tokens", "use_cache"],
        "supported_llm_providers": ["huggingface", "openai", "anthropic", "perplexity"],
        "description": "Open-source ML model framework"
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
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["endpoint"],
        "optional_fields": ["method", "headers", "auth_token", "api_key"],
        "supported_llm_providers": [],
        "description": "Generic API tool for REST calls"
    },
    "webhook": {
        "name": "Webhook",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["url"],
        "optional_fields": ["method", "headers", "auth_token"],
        "supported_llm_providers": [],
        "description": "HTTP webhook calls and notifications"
    },
    "communication": {
        "name": "Communication",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "channel_id", "user_id", "platform"],
        "supported_platforms": ["slack", "discord", "teams"],
        "supported_llm_providers": [],
        "description": "Communication platforms integration"
    },
    "productivity": {
        "name": "Productivity",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "workspace_id", "database_id", "platform"],
        "supported_platforms": ["notion", "airtable", "googlesheets"],
        "supported_llm_providers": [],
        "description": "Productivity and workspace tools"
    },
    "developer": {
        "name": "Developer Tools",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "repo_name", "org_name", "platform"],
        "supported_platforms": ["github", "gitlab", "webhook"],
        "supported_llm_providers": [],
        "description": "Developer tools and version control"
    },
    "marketing": {
        "name": "Marketing",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "list_id", "campaign_id", "platform"],
        "supported_platforms": ["mailchimp", "sendgrid"],
        "supported_llm_providers": [],
        "description": "Marketing automation and email campaigns"
    },
    "crm": {
        "name": "CRM",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "contact_id", "deal_id", "platform"],
        "supported_platforms": ["hubspot", "salesforce"],
        "supported_llm_providers": [],
        "description": "Customer relationship management"
    },
    "social_media": {
        "name": "Social Media",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "page_id", "user_id", "platform"],
        "supported_platforms": ["linkedin", "facebook", "whatsapp", "telegram"],
        "supported_llm_providers": [],
        "description": "Social media platforms integration"
    },
    "ecommerce": {
        "name": "E-commerce",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "shop_name", "product_id", "platform"],
        "supported_platforms": ["shopify", "stripe"],
        "supported_llm_providers": [],
        "description": "Online store and payment processing"
    },
    "storage": {
        "name": "Storage",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["api_service_name"],
        "optional_fields": ["auth_token", "folder_id", "file_path", "platform"],
        "supported_platforms": ["google_drive", "dropbox"],
        "supported_llm_providers": [],
        "description": "Cloud storage and file management"
    },
    "task": {
        "name": "Task",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["description"],
        "optional_fields": ["expected_output", "agent_id"],
        "supported_llm_providers": [],
        "description": "Task execution node"
    },
    "logic": {
        "name": "Logic",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["condition"],
        "optional_fields": [],
        "supported_llm_providers": [],
        "description": "Logic gate and conditional routing"
    },
    "trigger": {
        "name": "Trigger",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["trigger_type"],
        "optional_fields": ["schedule_type", "run_at", "interval"],
        "supported_llm_providers": [],
        "description": "Workflow trigger and scheduling"
    },
    "input": {
        "name": "Input",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": [],
        "optional_fields": ["default_value", "input_type"],
        "supported_llm_providers": [],
        "description": "Input data collection"
    },
    "output": {
        "name": "Output",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["output_type"],
        "optional_fields": ["destination", "template"],
        "supported_llm_providers": [],
        "description": "Output data routing"
    },
    "output_webhook": {
        "name": "Webhook Output",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["webhook_url"],
        "optional_fields": ["method", "headers"],
        "supported_llm_providers": [],
        "description": "Webhook output destination"
    },
    "output_email": {
        "name": "Email Output",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["to", "subject"],
        "optional_fields": ["cc", "bcc", "template"],
        "supported_llm_providers": [],
        "description": "Email output destination"
    },
    "output_file": {
        "name": "File Output",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["file_path"],
        "optional_fields": ["format", "encoding"],
        "supported_llm_providers": [],
        "description": "File output destination"
    },
    "output_database": {
        "name": "Database Output",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["connection_string", "table"],
        "optional_fields": ["schema", "batch_size"],
        "supported_llm_providers": [],
        "description": "Database output destination"
    },
    "output_cms": {
        "name": "CMS Output",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["cms_type"],
        "optional_fields": ["api_key", "content_type"],
        "supported_llm_providers": [],
        "description": "Content management system output"
    },
    "delay": {
        "name": "Delay",
        "version": "1.0",
        "requires_llm": False,
        "supports_tools": False,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["duration"],
        "optional_fields": ["unit"],
        "supported_llm_providers": [],
        "description": "Workflow delay and timing"
    },
    "chat": {
        "name": "Chat",
        "version": "1.0",
        "requires_llm": True,
        "supports_tools": False,
        "supports_memory": True,
        "supports_multi_agent": False,
        "required_fields": ["prompt"],
        "optional_fields": ["model", "temperature", "max_tokens"],
        "supported_llm_providers": ["openai", "anthropic", "perplexity", "openrouter", "huggingface"],
        "description": "Chat and conversational AI"
    },
    "gemini": {
        "name": "Google Gemini",
        "version": "1.0",
        "requires_llm": True,
        "supports_tools": True,
        "supports_memory": False,
        "supports_multi_agent": False,
        "required_fields": ["model"],
        "optional_fields": ["temperature", "maxTokens", "systemMessage"],
        "supported_llm_providers": ["gemini"],
        "description": "Google's Gemini AI framework"
    },
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

def validate_framework_llm_combination(framework: str, llm_provider: str, context: Optional[Dict[str, Any]] = None) -> dict:
    """Validate if the LLM provider is compatible with the framework. Always return a dict."""
    try:
        # Use the EnhancedFrameworkRegistry method if available
        if hasattr(framework_registry, 'validate_framework_llm_combination'):
            return framework_registry.validate_framework_llm_combination(framework, llm_provider, context)
        # Fallback: always return a dict
        return {"valid": True, "error": None}
    except Exception as e:
        logger.error(f"Error validating framework-LLM combination: {str(e)}")
        return {"valid": False, "error": str(e)}

def get_node_schema(node_type: str) -> Optional[Dict[str, Any]]:
    """Get the schema for a node type"""
    try:
        # Get the node schema from the registry
        node_schema = framework_registry.get_node_schema(node_type)
        if not node_schema:
            return None

        # Update schema field name
        if 'schema' in node_schema:
            node_schema['node_schema'] = node_schema.pop('schema')

        return node_schema
    except Exception as e:
        logger.error(f"Error getting node schema: {str(e)}")
        return None

class EnhancedFrameworkRegistry:
    """Enhanced framework registry with improved validation and metrics"""
    
    def __init__(self):
        self._frameworks = {}
        self._metrics = {}
        self._framework_requirements = {}
        self._llm_requirements = {}
        self._framework_llm_compatibility = {}
        self._initialize_requirements()
        self._register_default_runners()
    
    def _register_default_runners(self):
        """Register default framework runners"""
        try:
            # Register LangChain runner (use the async function, not a class instance)
            self.register("langchain", run_langchain_tool)
            logger.info("✅ LangChain runner registered successfully")
        except Exception as e:
            logger.error(f"❌ Failed to register LangChain runner: {e}")
    
    def _initialize_requirements(self):
        """Initialize framework and LLM requirements"""
        # Framework requirements
        self._framework_requirements = {
            "crewai": {
                "required_fields": ["role", "goal"],
                "optional_fields": ["backstory", "allow_delegation"],
                "capabilities": ["agents", "tasks", "tools", "memory"]
            },
            "langchain": {
                "required_fields": ["chain_type"],
                "optional_fields": ["memory", "tools"],
                "capabilities": ["chains", "agents", "memory", "tools"]
            },
            "autogen": {
                "required_fields": ["agent_type"],
                "optional_fields": ["system_message", "max_messages"],
                "capabilities": ["agents", "conversations", "tools"]
            },
            "llamaindex": {
                "required_fields": ["index_type"],
                "optional_fields": ["chunk_size", "chunk_overlap"],
                "capabilities": ["indexing", "querying", "retrieval"]
            },
            "huggingface": {
                "required_fields": ["task_type", "model_name"],
                "optional_fields": ["pipeline_config", "postprocess_config"],
                "capabilities": ["inference", "text-generation", "summarization"]
            },
            "api": {
                "required_fields": ["endpoint"],
                "optional_fields": ["method", "headers", "body"],
                "capabilities": ["http", "rest", "graphql"]
            },
            # Add structural nodes that don't need framework validation
            "trigger": {"required_fields": [], "optional_fields": [], "capabilities": []},
            "input": {"required_fields": [], "optional_fields": [], "capabilities": []},
            "output": {"required_fields": [], "optional_fields": [], "capabilities": []},
            "logic": {"required_fields": [], "optional_fields": [], "capabilities": []},
            "delay": {"required_fields": [], "optional_fields": [], "capabilities": []}
        }
        
        # LLM provider requirements
        self._llm_requirements = {
            "openai": {
                "required_fields": ["api_key"],
                "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
                "capabilities": ["chat", "completion", "embedding"]
            },
            "anthropic": {
                "required_fields": ["api_key"],
                "models": ["claude-2", "claude-instant"],
                "capabilities": ["chat", "completion"]
            },
            "perplexity": {
                "required_fields": ["api_key"],
                "models": ["sonar-small", "sonar-medium", "sonar-large"],
                "capabilities": ["chat", "completion"]
            },
            "google": {
                "required_fields": ["api_key"],
                "models": ["gemini-pro", "gemini-ultra"],
                "capabilities": ["chat", "completion"]
            },
            "mistral": {
                "required_fields": ["api_key"],
                "models": ["mistral-small", "mistral-medium", "mistral-large"],
                "capabilities": ["chat", "completion"]
            },
            "cohere": {
                "required_fields": ["api_key"],
                "models": ["command", "command-light"],
                "capabilities": ["chat", "completion", "embedding"]
            },
            "openrouter": {
                "required_fields": ["api_key"],
                "models": ["*"],  # Supports multiple models
                "capabilities": ["chat", "completion"]
            },
            "huggingface": {
                "required_fields": ["api_key"],
                "models": ["*"],  # Supports multiple models
                "capabilities": ["inference", "text-generation"]
            }
        }
        
        # Framework-LLM compatibility with BYOK support
        self._framework_llm_compatibility = {
            "crewai": ["openai", "anthropic", "perplexity", "google", "mistral", "cohere", "openrouter", "huggingface"],
            "langchain": ["openai", "anthropic", "perplexity", "google", "huggingface", "openrouter", "cohere", "mistral"],
            "autogen": ["openai", "azure", "openrouter", "perplexity", "anthropic", "google"],
            "llamaindex": ["openai", "anthropic", "huggingface", "perplexity", "cohere"],
            "huggingface": ["huggingface", "openai", "anthropic", "perplexity"],
            "api": []  # API nodes don't need LLM validation
        }
    
    def register(self, name: str, runner_func: Callable):
        """Register a framework runner function"""
        if name in self._frameworks:
            logger.warning(f"Overwriting existing runner for {name}")
        
        # Remove the required fields check since we handle validation in validate_configuration
        self._frameworks[name] = runner_func
        self._metrics[name] = {
            "executions": 0,
            "successes": 0,
            "failures": 0,
            "total_time": 0,
            "avg_time": 0
        }
        logger.info(f"✅ Registered runner for {name}")
    
    async def execute_framework(
        self, 
        framework: str, 
        config: Dict[str, Any], 
        input_data: Any,
        timeout: Optional[int] = 300
    ) -> Dict[str, Any]:
        """Execute a framework with enhanced validation and error handling"""
        if framework not in self._frameworks:
            raise ValueError(f"Framework {framework} not registered")
            
        # Validate configuration
        validation_result = self.validate_configuration(framework, config)
        if not validation_result["valid"]:
            raise ValueError(f"Invalid configuration for {framework}: {validation_result['errors']}")
            
        start_time = datetime.now()
        try:
            # Execute with timeout
            async with asyncio.timeout(timeout):
                result = await self._frameworks[framework](config, input_data)
                
            # Update metrics
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(framework, execution_time, True)
            
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
                "framework": framework,
                "timestamp": datetime.now().isoformat()
            }
            
        except asyncio.TimeoutError:
            self._update_metrics(framework, timeout, False)
            raise TimeoutError(f"Framework {framework} execution timed out after {timeout}s")
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(framework, execution_time, False)
            raise RuntimeError(f"Framework {framework} execution failed: {str(e)}")
    
    def validate_configuration(self, framework: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate framework configuration"""
        if framework not in self._framework_requirements:
            return {
                "valid": False,
                "errors": [f"Unknown framework: {framework}"]
            }
            
        requirements = self._framework_requirements[framework]
        errors = []
        
        # Check required fields
        for field in requirements["required_fields"]:
            if field not in config:
                errors.append(f"Missing required field: {field}")
                
        # Validate field values
        if "api_key" in requirements["required_fields"] and "api_key" in config:
            if not config["api_key"] or not isinstance(config["api_key"], str):
                errors.append("Invalid API key format")
                
        if "model" in requirements["required_fields"] and "model" in config:
            if not config["model"] or not isinstance(config["model"], str):
                errors.append("Invalid model format")
                
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _has_api_key(self, provider: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """Check if an API key exists for the given provider"""
        try:
            if context and "api_keys" in context:
                return provider in context["api_keys"]
            return False
        except Exception as e:
            logger.warning(f"Error checking API key for {provider}: {str(e)}")
            return False

    def _normalize_provider_name(self, provider: str) -> str:
        """Normalize provider name to handle variations and typos"""
        if not provider:
            return provider
            
        provider = provider.lower().strip()
        
        # Enhanced provider mapping with common typos and variations
        provider_map = {
            # OpenAI variations
            "openai": "openai",
            "open-ai": "openai",
            "gpt": "openai",
            "gpt4": "openai",
            "gpt-4": "openai",
            
            # Anthropic variations
            "anthropic": "anthropic",
            "claude": "anthropic",
            "claude-v1": "anthropic",
            "claude-v2": "anthropic",
            "claude-3": "anthropic",
            
            # Perplexity variations (fix the typo)
            "perplexity": "perplexity",
            "perplexitty": "perplexity",  # Fix common typo
            "perplexity-ai": "perplexity",
            "perplexityai": "perplexity",
            
            # Google variations
            "google": "google",
            "gemini": "google",
            "google-gemini": "google",
            "googleai": "google",
            
            # HuggingFace variations
            "huggingface": "huggingface",
            "hugging-face": "huggingface",
            "hf": "huggingface",
            "huggingfaceai": "huggingface",
            
            # OpenRouter variations
            "openrouter": "openrouter",
            "open-router": "openrouter",
            "openrouterai": "openrouter",
            
            # Mistral variations
            "mistral": "mistral",
            "mistralai": "mistral",
            
            # Cohere variations
            "cohere": "cohere",
            "cohereai": "cohere",
            
            # Azure variations
            "azure": "azure",
            "azure-openai": "azure",
            "microsoft": "azure"
        }
        
        return provider_map.get(provider, provider)

    def validate_framework_llm_combination(self, framework: str, llm_provider: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Validate if a framework and LLM provider combination is supported"""
        try:
            # Skip validation for structural nodes
            if framework in ["trigger", "input", "output", "logic", "delay", "task"]:
                return {
                    "valid": True,
                    "framework": framework,
                    "llm_provider": llm_provider,
                    "details": {"is_structural_node": True}
                }

            # Handle empty values - be more lenient
            if not framework or not llm_provider:
                return {
                    "valid": True,  # Allow empty values - let the node processor handle it
                    "framework": framework or "not specified",
                    "llm_provider": llm_provider or "not specified",
                    "details": {
                        "framework": framework or "not specified",
                        "llm_provider": llm_provider or "not specified",
                        "validation_skipped": True
                    }
                }

            # Normalize provider name
            llm_provider = self._normalize_provider_name(llm_provider)
            
            # Get framework requirements
            framework_reqs = self.get_framework_requirements(framework)
            if not framework_reqs:
                return {
                    "valid": False,
                    "error": f"Framework '{framework}' not found in registry",
                    "details": {"available_frameworks": self.get_available_frameworks()}
                }

            # Check if LLM provider is supported
            supported_providers = framework_reqs.get("supported_llm_providers", [])
            
            # BYOK: If provider has an API key, allow it regardless of support list
            if self._has_api_key(llm_provider, context):
                logger.info(f"BYOK: Allowing {llm_provider} for {framework} (API key present)")
                return {
                    "valid": True,
                    "framework": framework,
                    "llm_provider": llm_provider,
                    "details": {
                        "supported_providers": supported_providers,
                        "has_api_key": True,
                        "is_byok": True
                    }
                }

            # Check against supported providers list
            if llm_provider not in supported_providers:
                return {
                    "valid": False,
                    "error": f"LLM provider '{llm_provider}' not supported by framework '{framework}'",
                    "details": {
                        "supported_providers": supported_providers,
                        "provider": llm_provider,
                        "requires_key": True
                    }
                }

            return {
                "valid": True,
                "framework": framework,
                "llm_provider": llm_provider,
                "details": {
                    "supported_providers": supported_providers,
                    "has_api_key": False,
                    "is_byok": False
                }
            }

        except Exception as e:
            logger.error(f"Error validating framework-LLM combination: {str(e)}")
            return {
                "valid": False,
                "error": str(e),
                "details": {
                    "framework": framework,
                    "llm_provider": llm_provider,
                    "exception": str(e)
                }
            }
    
    def get_framework_metrics(self, framework: str) -> Dict[str, Any]:
        """Get execution metrics for a framework"""
        if framework not in self._metrics:
            return {
                "executions": 0,
                "successes": 0,
                "failures": 0,
                "total_time": 0,
                "avg_time": 0
            }
        return self._metrics[framework]
    
    def _update_metrics(self, framework: str, execution_time: float, success: bool):
        """Update framework execution metrics"""
        metrics = self._metrics[framework]
        metrics["executions"] += 1
        metrics["total_time"] += execution_time
        metrics["avg_time"] = metrics["total_time"] / metrics["executions"]
        
        if success:
            metrics["successes"] += 1
        else:
            metrics["failures"] += 1
    
    def get_available_frameworks(self) -> List[str]:
        """Get list of available frameworks"""
        return list(self._frameworks.keys())
    
    def get_framework_requirements(self, framework: str) -> Dict[str, Any]:
        """Get requirements for a framework"""
        return self._framework_requirements.get(framework, {})
    
    def get_llm_requirements(self, provider: str) -> Dict[str, Any]:
        """Get requirements for an LLM provider"""
        return self._llm_requirements.get(provider, {})
    
    def get_runner(self, framework: str) -> Optional[Callable]:
        """Get the registered runner function for a framework"""
        return self._frameworks.get(framework)
    
    def has_runner(self, framework: str) -> bool:
        """Check if a framework has a registered runner"""
        return framework in self._frameworks

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