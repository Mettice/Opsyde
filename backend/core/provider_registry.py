"""
Provider Registry for BYOK System
Extensible system for managing LLM providers and their API key mappings
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ProviderConfig:
    """Configuration for an LLM provider"""
    id: str
    name: str
    description: str
    icon: str
    key_format: str  # e.g., "sk-...", "sk-ant-...", "AI..."
    validation_url: Optional[str] = None
    pricing_info: Optional[dict] = None
    get_key_url: Optional[str] = None
    supported_models: List[str] = None
    framework_mappings: List[str] = None  # Which frameworks can use this provider
    requires_api_key: bool = True  # Most providers require API keys
    
    def __post_init__(self):
        if self.supported_models is None:
            self.supported_models = []
        if self.framework_mappings is None:
            self.framework_mappings = []

class ProviderRegistry:
    """
    Registry for managing LLM providers and their configurations
    Easily extensible for new providers
    """
    
    def __init__(self):
        self.providers: Dict[str, ProviderConfig] = {}
        self._initialize_default_providers()
    
    def _initialize_default_providers(self):
        """Initialize default LLM providers"""
        
        # OpenAI
        openai = ProviderConfig(
            id="openai",
            name="OpenAI",
            description="GPT-4, GPT-3.5-turbo, and other OpenAI models",
            icon="🤖",
            key_format="sk-...",
            validation_url="https://api.openai.com/v1/models",
            pricing_info={
                "gpt-4": {"input": 0.03, "output": 0.06},
                "gpt-3.5-turbo": {"input": 0.001, "output": 0.002}
            },
            get_key_url="https://platform.openai.com/api-keys",
            supported_models=[
                "gpt-4", "gpt-4-turbo", "gpt-4-turbo-preview", "gpt-4-vision-preview",
                "gpt-3.5-turbo", "gpt-3.5-turbo-16k", "text-davinci-003", "text-curie-001"
            ],
            framework_mappings=["openai", "crewai", "langchain", "autogen"]
        )
        
        # Anthropic
        anthropic = ProviderConfig(
            id="anthropic",
            name="Anthropic",
            description="Claude 3 Haiku, Sonnet, and Opus models",
            icon="🧠",
            key_format="sk-ant-...",
            validation_url="https://api.anthropic.com/v1/messages",
            pricing_info={
                "claude-3-opus": {"input": 0.015, "output": 0.075},
                "claude-3-sonnet": {"input": 0.003, "output": 0.015},
                "claude-3-haiku": {"input": 0.00025, "output": 0.00125}
            },
            get_key_url="https://console.anthropic.com/",
            supported_models=[
                "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307",
                "claude-2.1", "claude-2.0", "claude-instant-1.2"
            ],
            framework_mappings=["anthropic", "crewai", "langchain"]
        )
        
        # OpenRouter
        openrouter = ProviderConfig(
            id="openrouter",
            name="OpenRouter",
            description="Access to 100+ AI models through one API",
            icon="🌐",
            key_format="sk-or-...",
            validation_url="https://openrouter.ai/api/v1/models",
            pricing_info={
                "note": "Variable pricing based on model selection"
            },
            get_key_url="https://openrouter.ai/keys",
            supported_models=[
                "openai/gpt-4", "anthropic/claude-3-opus", "meta-llama/llama-2-70b-chat",
                "mistralai/mistral-7b-instruct", "google/palm-2-chat-bison"
            ],
            framework_mappings=["openrouter", "crewai", "langchain"]
        )
        
        # Google AI (Gemini)
        google = ProviderConfig(
            id="google",
            name="Google AI (Gemini)",
            description="Gemini Pro and other Google AI models",
            icon="🔍",
            key_format="AIza...",
            validation_url="https://generativelanguage.googleapis.com/v1/models",
            pricing_info={
                "gemini-pro": {"input": 0.0005, "output": 0.0015},
                "gemini-pro-vision": {"input": 0.0025, "output": 0.01}
            },
            get_key_url="https://makersuite.google.com/app/apikey",
            supported_models=[
                "gemini-pro", "gemini-pro-vision", "gemini-1.5-pro", "gemini-1.5-flash",
                "text-bison-001", "chat-bison-001"
            ],
            framework_mappings=["google", "gemini", "crewai", "langchain"]
        )
        
        # Hugging Face
        huggingface = ProviderConfig(
            id="huggingface",
            name="Hugging Face",
            description="Open source models via Hugging Face Inference API",
            icon="🤗",
            key_format="hf_...",
            validation_url="https://api-inference.huggingface.co/models",
            pricing_info={
                "note": "Free tier available, pay-per-use for premium"
            },
            get_key_url="https://huggingface.co/settings/tokens",
            supported_models=[
                "microsoft/DialoGPT-large", "facebook/blenderbot-400M-distill",
                "microsoft/DialoGPT-medium", "EleutherAI/gpt-j-6B"
            ],
            framework_mappings=["huggingface", "transformers", "langchain"]
        )
        
        # Mistral AI
        mistral = ProviderConfig(
            id="mistral",
            name="Mistral AI",
            description="Mistral's powerful open and commercial language models",
            icon="🌪️",
            key_format="mistral-...",
            validation_url="https://api.mistral.ai/v1/models",
            pricing_info={
                "mistral-large": {"input": 0.008, "output": 0.024},
                "mistral-medium": {"input": 0.0027, "output": 0.0081},
                "mistral-small": {"input": 0.002, "output": 0.006}
            },
            get_key_url="https://console.mistral.ai/",
            supported_models=[
                "mistral-large-latest", "mistral-medium-latest", "mistral-small-latest",
                "open-mistral-7b", "open-mixtral-8x7b", "open-mixtral-8x22b"
            ],
            framework_mappings=["mistral", "crewai", "langchain"]
        )
        
        # Cohere
        cohere = ProviderConfig(
            id="cohere",
            name="Cohere",
            description="Cohere's Command and other enterprise-focused models",
            icon="🔗",
            key_format="co-...",
            validation_url="https://api.cohere.ai/v1/models",
            pricing_info={
                "command": {"input": 0.0015, "output": 0.002},
                "command-light": {"input": 0.0003, "output": 0.0006}
            },
            get_key_url="https://dashboard.cohere.ai/api-keys",
            supported_models=[
                "command", "command-light", "command-nightly", "command-r", "command-r-plus"
            ],
            framework_mappings=["cohere", "crewai", "langchain"]
        )
        
        # Together AI
        together = ProviderConfig(
            id="together",
            name="Together AI",
            description="Fast inference for open source models",
            icon="🤝",
            key_format="together-...",
            validation_url="https://api.together.xyz/models",
            pricing_info={
                "note": "Competitive pricing for open source models"
            },
            get_key_url="https://api.together.xyz/settings/api-keys",
            supported_models=[
                "meta-llama/Llama-2-70b-chat-hf", "mistralai/Mixtral-8x7B-Instruct-v0.1",
                "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO", "teknium/OpenHermes-2.5-Mistral-7B"
            ],
            framework_mappings=["together", "crewai", "langchain"]
        )
        
        # Replicate
        replicate = ProviderConfig(
            id="replicate",
            name="Replicate",
            description="Run open source models in the cloud",
            icon="🔄",
            key_format="r8_...",
            validation_url="https://api.replicate.com/v1/models",
            pricing_info={
                "note": "Pay per second of compute time"
            },
            get_key_url="https://replicate.com/account/api-tokens",
            supported_models=[
                "meta/llama-2-70b-chat", "mistralai/mixtral-8x7b-instruct-v0.1",
                "meta/codellama-34b-instruct", "stability-ai/stable-diffusion"
            ],
            framework_mappings=["replicate", "crewai", "langchain"]
        )
        
        # Perplexity
        perplexity = ProviderConfig(
            id="perplexity",
            name="Perplexity AI",
            description="Real-time web search models",
            icon="🔍",
            key_format="pplx-...",
            validation_url="https://api.perplexity.ai/chat/completions",
            pricing_info={
                "sonar-pro": {"input": 0.001, "output": 0.001},
                "sonar": {"input": 0.0002, "output": 0.0002},
                "sonar-reasoning": {"input": 0.001, "output": 0.005},
                "sonar-reasoning-pro": {"input": 0.001, "output": 0.005},
                "sonar-deep-research": {"input": 0.002, "output": 0.008},
                "r1-1776": {"input": 0.001, "output": 0.001}
            },
            get_key_url="https://www.perplexity.ai/settings/api",
            supported_models=[
                "sonar-pro", "sonar", "sonar-deep-research",
                "sonar-reasoning-pro", "sonar-reasoning", "r1-1776"
            ],
            framework_mappings=["perplexity", "crewai", "langchain"]
        )

        # Register all providers
        providers = [openai, anthropic, openrouter, google, huggingface, mistral, cohere, together, replicate, perplexity]
        for provider in providers:
            self.providers[provider.id] = provider
    
    def register_provider(self, provider: ProviderConfig):
        """Register a new provider"""
        self.providers[provider.id] = provider
        logger.info(f"Registered provider: {provider.name} ({provider.id})")
    
    def get_provider(self, provider_id: str) -> Optional[ProviderConfig]:
        """Get provider configuration by ID"""
        return self.providers.get(provider_id)
    
    def get_all_providers(self) -> List[ProviderConfig]:
        """Get all registered providers"""
        return list(self.providers.values())
    
    def get_providers_for_framework(self, framework: str) -> List[ProviderConfig]:
        """Get providers that support a specific framework"""
        return [
            provider for provider in self.providers.values()
            if framework in provider.framework_mappings
        ]
    
    def get_provider_for_model(self, model: str) -> Optional[ProviderConfig]:
        """Get the best provider for a specific model"""
        for provider in self.providers.values():
            # Exact match
            if model in provider.supported_models:
                return provider
            
            # Prefix match for model families
            for supported_model in provider.supported_models:
                if model.startswith(supported_model.split('-')[0]):
                    return provider
        
        return None
    
    def get_key_mapping_for_framework(self, framework: str, model: str = None) -> Optional[str]:
        """
        Get the provider ID that should be used for a framework/model combination
        
        Args:
            framework: The framework being used (e.g., 'crewai', 'langchain')
            model: Optional specific model name
            
        Returns:
            Provider ID to use for API key lookup
        """
        # First try to match by model
        if model:
            provider = self.get_provider_for_model(model)
            if provider and framework in provider.framework_mappings:
                return provider.id
        
        # Then try to match by framework
        providers = self.get_providers_for_framework(framework)
        if providers:
            # Return the first matching provider (could be made smarter)
            return providers[0].id
        
        # Default fallbacks
        framework_defaults = {
            'crewai': 'openai',
            'langchain': 'openai',
            'autogen': 'openai',
            'openrouter': 'openrouter',
            'anthropic': 'anthropic',
            'google': 'google',
            'gemini': 'google',
            'huggingface': 'huggingface'
        }
        
        return framework_defaults.get(framework)
    
    def add_custom_provider(
        self, 
        provider_id: str, 
        name: str, 
        description: str,
        icon: str = "🔧",
        key_format: str = "custom-...",
        supported_models: List[str] = None,
        framework_mappings: List[str] = None,
        **kwargs
    ):
        """
        Easy method to add custom providers
        
        Example:
            registry.add_custom_provider(
                "deepseek", 
                "DeepSeek", 
                "DeepSeek AI models",
                icon="🧬",
                supported_models=["deepseek-coder", "deepseek-chat"],
                framework_mappings=["deepseek", "langchain"]
            )
        """
        provider = ProviderConfig(
            id=provider_id,
            name=name,
            description=description,
            icon=icon,
            key_format=key_format,
            supported_models=supported_models or [],
            framework_mappings=framework_mappings or [provider_id],
            **kwargs
        )
        
        self.register_provider(provider)
        logger.info(f"Added custom provider: {name}")

# Global registry instance
provider_registry = ProviderRegistry()

# Easy functions for adding new providers
def add_provider(provider_config: ProviderConfig):
    """Add a new provider to the registry"""
    provider_registry.register_provider(provider_config)

def add_custom_provider(provider_id: str, name: str, description: str, **kwargs):
    """Add a custom provider with minimal configuration"""
    provider_registry.add_custom_provider(provider_id, name, description, **kwargs)

def get_provider_for_execution(framework: str, model: str = None) -> Optional[str]:
    """Get the provider ID to use for execution"""
    return provider_registry.get_key_mapping_for_framework(framework, model)

# Example of how to add new providers:
def initialize_extended_providers():
    """Initialize additional providers - call this to add more providers"""
    
    # DeepSeek
    add_custom_provider(
        "deepseek",
        "DeepSeek",
        "DeepSeek AI models for coding and chat",
        icon="🧬",
        key_format="ds-...",
        supported_models=["deepseek-coder", "deepseek-chat", "deepseek-math"],
        framework_mappings=["deepseek", "langchain"],
        pricing_info="$0.001 per 1K tokens",
        get_key_url="https://platform.deepseek.com/api_keys"
    )
    
    # Qwen
    add_custom_provider(
        "qwen",
        "Qwen (Alibaba)",
        "Qwen large language models",
        icon="🐉",
        key_format="qw-...",
        supported_models=["qwen-turbo", "qwen-plus", "qwen-max"],
        framework_mappings=["qwen", "langchain"],
        pricing_info="Varies by model",
        get_key_url="https://dashscope.aliyun.com"
    )
    
    # Cohere
    add_custom_provider(
        "cohere",
        "Cohere",
        "Cohere language models",
        icon="🌊",
        key_format="co-...",
        supported_models=["command", "command-light", "command-nightly"],
        framework_mappings=["cohere", "langchain"],
        pricing_info="$0.015 per 1K tokens",
        get_key_url="https://dashboard.cohere.ai/api-keys"
    )
    
    # Mistral AI
    add_custom_provider(
        "mistral",
        "Mistral AI",
        "Mistral large language models",
        icon="🌪️",
        key_format="mst-...",
        supported_models=["mistral-tiny", "mistral-small", "mistral-medium"],
        framework_mappings=["mistral", "langchain"],
        pricing_info="$0.0002 per 1K tokens",
        get_key_url="https://console.mistral.ai"
    )

# Call this to initialize extended providers
# initialize_extended_providers() 