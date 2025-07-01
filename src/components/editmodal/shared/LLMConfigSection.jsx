import React from 'react';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { ApiKeyNavigator } from '../../shared/ApiKeyNavigator';

const LLMConfigSection = ({ 
  formData, 
  handleInputChange, 
  isInherited = false, 
  inheritedFrom = null,
  showApiKey = true,
  framework 
}) => {
  const frameworkConfig = formData.frameworkConfig || {};
  
  // BYOK Integration - Load API Keys
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);

  // Load API Keys from BYOK Manager
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        const result = await response.json();
        
        if (result.success && result.data.api_keys) {
          setAvailableApiKeys(result.data.api_keys);
          setApiKeyError(null);
        } else {
          setApiKeyError('Failed to load API keys');
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Error connecting to API Key Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    // Load API keys for all LLM-enabled frameworks, not just triggers
    const llmFrameworks = ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity', 'google', 'crewai', 'autogen', 'llamaindex', 'trigger'];
    if (llmFrameworks.includes(framework)) {
      loadApiKeys();
    } else {
      setLoadingApiKeys(false);
    }
  }, [framework]);

  // Get available LLM providers based on loaded API keys
  const getAvailableLLMProviders = () => {
    const llmProviders = ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity', 'google'];
    
    return availableApiKeys
      .filter(key => {
        return llmProviders.includes(key.provider) && key.validation_status === 'valid';
      })
      .map(key => ({
        provider: key.provider,
        provider_name: key.provider_name,
        provider_description: key.provider_description,
        models: getModelOptions(key.provider)
      }));
  };

  const getModelOptions = (framework) => {
    const models = {
      openai: [
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ],
      anthropic: [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
      ],
      openrouter: [
        { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus (via OpenRouter)' },
        { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo (via OpenRouter)' },
        { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B' }
      ],
      huggingface: [
        { value: 'microsoft/DialoGPT-large', label: 'DialoGPT Large' },
        { value: 'facebook/blenderbot-400M-distill', label: 'BlenderBot 400M' }
      ],
      perplexity: [
        { value: 'llama-3.1-sonar-small-128k-online', label: 'Llama 3.1 Sonar Small' },
        { value: 'llama-3.1-sonar-large-128k-online', label: 'Llama 3.1 Sonar Large' }
      ],
      google: [
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
      ]
    };
    return models[framework] || [];
  };

  const availableLLMProviders = getAvailableLLMProviders();

  // Get current model options based on selected provider
  const getCurrentModelOptions = () => {
    const selectedProvider = frameworkConfig.provider;
    if (!selectedProvider) return [];
    return getModelOptions(selectedProvider);
  };

  const currentModelOptions = getCurrentModelOptions();

  // Helper functions for different frameworks
  const getTemperatureRange = (framework) => {
    return { min: 0, max: 2, step: 0.1 };
  };

  const getMaxTokensLimit = (framework) => {
    const limits = {
      openai: 4096,
      anthropic: 8192,
      openrouter: 4096,
      huggingface: 1024,
      perplexity: 4096,
      google: 8192
    };
    return limits[framework] || 4096;
  };

  const requiresApiKey = (framework) => {
    const keyRequiredFrameworks = ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity', 'google'];
    return keyRequiredFrameworks.includes(framework);
  };

  // Don't render anything if this framework doesn't support LLM configuration
  const llmFrameworks = ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity', 'google', 'crewai', 'autogen', 'llamaindex', 'trigger'];
  if (!llmFrameworks.includes(framework)) {
    return null;
  }

  const [modelType, setModelType] = useState(null);
  const [providerType, setProviderType] = useState(null);

  // Auto-detect model type when model changes
  useEffect(() => {
    if (formData.llm?.model) {
      const detectModelType = async () => {
        try {
          const response = await fetch(`/api/llm/detect-type?model=${formData.llm.model}`);
          const data = await response.json();
          if (data.success) {
            setModelType(data.data.type);
            setProviderType(data.data.provider);
          }
        } catch (error) {
          console.error('Failed to detect model type:', error);
        }
      };
      detectModelType();
    }
  }, [formData.llm?.model]);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Provider Selection for All LLM Frameworks */}
        {(framework === 'trigger' || availableLLMProviders.length > 0) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Provider *
            </label>
            {loadingApiKeys ? (
              <div className="flex items-center space-x-2 text-blue-600 p-2 border border-gray-300 rounded-md">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Loading available AI providers...</span>
              </div>
            ) : apiKeyError ? (
              <div className="bg-red-100 border border-red-300 rounded p-3">
                <p className="text-red-700 text-sm">⚠️ {apiKeyError}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-red-600 text-xs">
                    Please configure your API keys in the BYOK Manager to enable AI analysis.
                  </p>
                  <ApiKeyNavigator 
                    openInNewTab={true}
                    className="text-xs bg-red-200 text-red-800 px-3 py-1 rounded-full hover:bg-red-300 transition-colors"
                  >
                    Add API Keys →
                  </ApiKeyNavigator>
                </div>
              </div>
            ) : availableLLMProviders.length === 0 ? (
              <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                <p className="text-yellow-700 text-sm font-medium">🔑 No LLM providers available</p>
                <p className="text-yellow-600 text-xs mt-1 mb-2">
                  Add API keys in the BYOK Manager to use LLM providers
                </p>
                <div className="flex items-center justify-between">
                  <ApiKeyNavigator 
                    openInNewTab={true}
                    className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-300 transition-colors font-medium"
                  >
                    http://localhost:3000/api-keys
                  </ApiKeyNavigator>
                  <span className="text-xs text-yellow-600">
                    Add OpenAI, Anthropic, or other providers
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  name="frameworkConfig.provider"
                  value={frameworkConfig.provider || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select AI Provider...</option>
                  {availableLLMProviders.map(provider => (
                    <option key={provider.provider} value={provider.provider}>
                      {provider.provider_name} ({provider.provider}) - ✅ Valid
                    </option>
                  ))}
                </select>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✅</span>
                      <span className="text-xs">{availableLLMProviders.length} provider(s) available via BYOK</span>
                    </div>
                    <ApiKeyNavigator 
                      openInNewTab={true}
                      variant="link"
                      className="text-xs text-green-600 hover:text-green-800 underline"
                    >
                      Manage →
                    </ApiKeyNavigator>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Model Selection with Auto-detection */}
        {frameworkConfig.provider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model *
              {modelType && (
                <span className="ml-2 text-xs text-gray-500">
                  ({modelType} model via {providerType})
                </span>
              )}
            </label>
            <select
              name="frameworkConfig.model"
              value={frameworkConfig.model || ''}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Model...</option>
              {getModelOptions(frameworkConfig.provider).map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Temperature Setting */}
        {frameworkConfig.provider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {frameworkConfig.temperature || 0.7}
            </label>
            <input
              type="range"
              name="frameworkConfig.temperature"
              min={getTemperatureRange(frameworkConfig.provider).min}
              max={getTemperatureRange(frameworkConfig.provider).max}
              step={getTemperatureRange(frameworkConfig.provider).step}
              value={frameworkConfig.temperature || 0.7}
              onChange={handleInputChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More Focused</span>
              <span>More Creative</span>
            </div>
          </div>
        )}

        {/* Max Tokens Setting */}
        {frameworkConfig.provider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              name="frameworkConfig.max_tokens"
              value={frameworkConfig.max_tokens || 1000}
              onChange={handleInputChange}
              min={1}
              max={getMaxTokensLimit(frameworkConfig.provider)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Maximum tokens to generate (max: {getMaxTokensLimit(frameworkConfig.provider)})
            </div>
          </div>
        )}

        {/* BYOK Status - Enhanced for all LLM frameworks */}
        {showApiKey && (availableLLMProviders.length > 0 || requiresApiKey(framework)) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 BYOK Status
            </label>
            <div className="relative">
              <div className={`w-full p-3 border rounded-md ${
                isInherited ? 'bg-purple-50 border-purple-200' : 
                availableLLMProviders.length > 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                {isInherited ? (
                  <div className="flex items-center text-purple-700">
                    <span className="mr-2">🔗</span>
                    <span className="text-sm">Using inherited API key from parent agent</span>
                  </div>
                ) : availableLLMProviders.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-green-700">
                      <span className="mr-2">✅</span>
                      <span className="text-sm">BYOK Active - {availableLLMProviders.length} provider(s) configured</span>
                    </div>
                    <ApiKeyNavigator 
                      openInNewTab={true}
                      variant="link"
                      className="text-xs text-green-600 hover:text-green-800 underline font-medium"
                    >
                      Manage Keys →
                    </ApiKeyNavigator>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-yellow-700">
                      <span className="mr-2">⚠️</span>
                      <span className="text-sm">No API keys configured</span>
                    </div>
                    <ApiKeyNavigator 
                      openInNewTab={true}
                      variant="link"
                      className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-300 transition-colors font-medium"
                    >
                      Add Keys →
                    </ApiKeyNavigator>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isInherited 
                ? "API key is inherited from the parent agent"
                : availableLLMProviders.length > 0
                ? `API keys are managed centrally and applied automatically during execution`
                : "Add API keys to enable LLM-powered processing"
              }
            </div>
            {availableLLMProviders.length > 0 && (
              <div className="text-xs text-green-600 mt-1">
                ✅ Secure, encrypted, and reusable across all workflows
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

LLMConfigSection.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  isInherited: PropTypes.bool,
  inheritedFrom: PropTypes.string,
  showApiKey: PropTypes.bool,
  framework: PropTypes.string.isRequired
};

// Export both named and default exports for compatibility
export { LLMConfigSection };
export default LLMConfigSection;