/**
 * Framework-Model Compatibility Matrix
 * Defines which models each framework supports natively to prevent fallback execution
 */

export const FRAMEWORK_MODELS = {
  // CrewAI - Uses specific model naming conventions
  crewai: {
    openai: [
      { id: "openai/gpt-4", name: "GPT-4", context: "8K", cost: "high", native: true },
      { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", context: "128K", cost: "high", native: true },
      { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", context: "16K", cost: "medium", native: true }
    ],
    anthropic: [
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", context: "200K", cost: "high", native: true },
      { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet", context: "200K", cost: "medium", native: true },
      { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", context: "200K", cost: "low", native: true }
    ],
    perplexity: [
      { id: "llama-3.1-sonar-large-128k-online", name: "Sonar Large (Online)", context: "128K", cost: "medium", native: true },
      { id: "llama-3.1-sonar-small-128k-online", name: "Sonar Small (Online)", context: "128K", cost: "low", native: true },
      { id: "llama-3.1-sonar-huge-128k-online", name: "Sonar Huge (Online)", context: "128K", cost: "high", native: true }
    ],
    google: [
      { id: "google/gemini-pro", name: "Gemini Pro", context: "32K", cost: "medium", native: true },
      { id: "google/gemini-pro-vision", name: "Gemini Pro Vision", context: "16K", cost: "high", native: true },
      { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro", context: "1M", cost: "high", native: true }
    ],
    mistral: [
      { id: "mistral/mistral-large-latest", name: "Mistral Large", context: "32K", cost: "high", native: true },
      { id: "mistral/mistral-medium-latest", name: "Mistral Medium", context: "32K", cost: "medium", native: true },
      { id: "mistral/mistral-small-latest", name: "Mistral Small", context: "32K", cost: "low", native: true }
    ],
    cohere: [
      { id: "cohere/command-r-plus", name: "Command R+", context: "128K", cost: "high", native: true },
      { id: "cohere/command-r", name: "Command R", context: "128K", cost: "medium", native: true },
      { id: "cohere/command", name: "Command", context: "4K", cost: "medium", native: true }
    ],
    openrouter: [
      { id: "openrouter/openai/gpt-4", name: "GPT-4 (via OpenRouter)", context: "8K", cost: "high", native: true },
      { id: "openrouter/anthropic/claude-3-opus", name: "Claude 3 Opus (via OpenRouter)", context: "200K", cost: "high", native: true },
      { id: "openrouter/meta-llama/llama-2-70b-chat", name: "Llama 2 70B", context: "4K", cost: "medium", native: true }
    ]
  },

  // LangChain - Uses different model naming conventions  
  langchain: {
    openai: [
      { id: "gpt-4", name: "GPT-4", context: "8K", cost: "high", native: true },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", context: "128K", cost: "high", native: true },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", context: "16K", cost: "medium", native: true }
    ],
    anthropic: [
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", context: "200K", cost: "high", native: true },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", context: "200K", cost: "medium", native: true },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", context: "200K", cost: "low", native: true }
    ],
    perplexity: [
      { id: "sonar-pro", name: "Sonar Pro", context: "200K", cost: "medium", native: false, fallback: true },
      { id: "sonar", name: "Sonar", context: "128K", cost: "low", native: false, fallback: true },
      { id: "sonar-reasoning", name: "Sonar Reasoning", context: "128K", cost: "medium", native: false, fallback: true }
    ],
    google: [
      { id: "gemini-pro", name: "Gemini Pro", context: "32K", cost: "medium", native: true },
      { id: "gemini-pro-vision", name: "Gemini Pro Vision", context: "16K", cost: "high", native: true }
    ],
    huggingface: [
      { id: "microsoft/DialoGPT-large", name: "DialoGPT Large", context: "1K", cost: "free", native: true },
      { id: "microsoft/DialoGPT-medium", name: "DialoGPT Medium", context: "1K", cost: "free", native: true },
      { id: "EleutherAI/gpt-j-6B", name: "GPT-J 6B", context: "2K", cost: "free", native: true }
    ]
  },

  // AutoGen - Similar to OpenAI format
  autogen: {
    openai: [
      { id: "gpt-4", name: "GPT-4", context: "8K", cost: "high", native: true },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", context: "128K", cost: "high", native: true },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", context: "16K", cost: "medium", native: true }
    ],
    azure: [
      { id: "gpt-4", name: "Azure GPT-4", context: "8K", cost: "high", native: true },
      { id: "gpt-35-turbo", name: "Azure GPT-3.5 Turbo", context: "16K", cost: "medium", native: true }
    ],
    openrouter: [
      { id: "openai/gpt-4", name: "GPT-4 (via OpenRouter)", context: "8K", cost: "high", native: true },
      { id: "meta-llama/llama-2-70b-chat", name: "Llama 2 70B", context: "4K", cost: "medium", native: true }
    ]
  },

  // LlamaIndex - Uses provider/model format
  llamaindex: {
    openai: [
      { id: "gpt-4", name: "GPT-4", context: "8K", cost: "high", native: true },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", context: "16K", cost: "medium", native: true }
    ],
    anthropic: [
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", context: "200K", cost: "medium", native: true },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", context: "200K", cost: "low", native: true }
    ],
    huggingface: [
      { id: "microsoft/DialoGPT-medium", name: "DialoGPT Medium", context: "1K", cost: "free", native: true }
    ]
  },

  // HuggingFace - Uses full model paths
  huggingface: {
    huggingface: [
      { id: "microsoft/DialoGPT-large", name: "DialoGPT Large", context: "1K", cost: "free", native: true },
      { id: "microsoft/DialoGPT-medium", name: "DialoGPT Medium", context: "1K", cost: "free", native: true },
      { id: "facebook/blenderbot-400M-distill", name: "BlenderBot 400M", context: "512", cost: "free", native: true },
      { id: "EleutherAI/gpt-j-6B", name: "GPT-J 6B", context: "2K", cost: "free", native: true },
      { id: "microsoft/phi-2", name: "Phi-2", context: "2K", cost: "free", native: true }
    ]
  },

  // OpenRouter - Uses their specific routing format
  openrouter: {
    openrouter: [
      { id: "openai/gpt-4", name: "GPT-4 (via OpenRouter)", context: "8K", cost: "high", native: true },
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus (via OpenRouter)", context: "200K", cost: "high", native: true },
      { id: "meta-llama/llama-2-70b-chat", name: "Llama 2 70B", context: "4K", cost: "medium", native: true },
      { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B Instruct", context: "8K", cost: "low", native: true },
      { id: "google/palm-2-chat-bison", name: "PaLM 2 Chat", context: "8K", cost: "medium", native: true }
    ]
  }
};

export const getAvailableModels = (framework, provider) => {
  const frameworkModels = FRAMEWORK_MODELS[framework?.toLowerCase()];
  if (!frameworkModels || !frameworkModels[provider?.toLowerCase()]) {
    return [];
  }
  
  return frameworkModels[provider.toLowerCase()].map(model => ({
    ...model,
    displayName: `${model.name} ${model.native ? '✅ Native' : '⚠️ Fallback'}`,
    supportLabel: model.native ? '✅ Native Support' : '⚠️ Fallback Mode',
    fullDetails: `${model.context} context, ${model.cost} cost`
  }));
};

export const isModelNativelySupported = (framework, provider, modelId) => {
  const models = getAvailableModels(framework, provider);
  const model = models.find(m => m.id === modelId);
  return model ? model.native : false;
};

export const getFrameworkProviders = (framework) => {
  const frameworkModels = FRAMEWORK_MODELS[framework?.toLowerCase()];
  if (!frameworkModels) return [];
  
  return Object.keys(frameworkModels);
};

export const getProviderSupport = (framework, provider) => {
  const models = getAvailableModels(framework, provider);
  const nativeModels = models.filter(m => m.native);
  const fallbackModels = models.filter(m => !m.native);
  
  return {
    hasNativeSupport: nativeModels.length > 0,
    hasFallbackSupport: fallbackModels.length > 0,
    nativeCount: nativeModels.length,
    fallbackCount: fallbackModels.length,
    totalModels: models.length
  };
}; 