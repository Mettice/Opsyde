import React from 'react';
import PropTypes from 'prop-types';

const LLMConfigSection = ({ 
  formData, 
  handleInputChange, 
  isInherited = false, 
  inheritedFrom = null,
  showApiKey = true,
  framework 
}) => {
  const frameworkConfig = formData.frameworkConfig || {};
  
  // Framework-specific model options
  const getModelOptions = (framework) => {
    const modelOptions = {
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
        { value: 'openai/gpt-4', label: 'GPT-4 (via OpenRouter)' },
        { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo (via OpenRouter)' },
        { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
        { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B' },
        { value: 'mistralai/mistral-large', label: 'Mistral Large' }
      ],
      huggingface: [
        { value: 'meta-llama/Llama-2-70b-chat-hf', label: 'Llama 2 70B Chat' },
        { value: 'microsoft/DialoGPT-large', label: 'DialoGPT Large' },
        { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct' },
        { value: 'google/flan-t5-xxl', label: 'FLAN-T5 XXL' }
      ],
      crewai: [
        { value: 'gpt-4', label: 'GPT-4 (via CrewAI)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (via CrewAI)' }
      ],
      autogen: [
        { value: 'gpt-4', label: 'GPT-4 (via AutoGen)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (via AutoGen)' }
      ],
      llamaindex: [
        { value: 'gpt-4', label: 'GPT-4 (via LlamaIndex)' },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (via LlamaIndex)' }
      ]
    };
    
    return modelOptions[framework] || [];
  };

  const getTemperatureRange = (framework) => {
    // Anthropic uses 0-1, others use 0-2
    return framework === 'anthropic' ? { min: 0, max: 1 } : { min: 0, max: 2 };
  };

  const getMaxTokensLimit = (framework) => {
    const limits = {
      openai: 32000,
      anthropic: 4096,
      openrouter: 32000,
      huggingface: 8192,
      crewai: 32000,
      autogen: 32000,
      llamaindex: 32000
    };
    return limits[framework] || 32000;
  };

  const requiresApiKey = (framework) => {
    return ['openai', 'anthropic', 'openrouter', 'huggingface'].includes(framework);
  };

  const tempRange = getTemperatureRange(framework);
  const maxTokensLimit = getMaxTokensLimit(framework);
  const modelOptions = getModelOptions(framework);

  return (
    <div className={`p-4 rounded-lg border ${
      isInherited 
        ? 'bg-blue-50 border-blue-200' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900">
          🤖 LLM Configuration
        </h4>
        {isInherited && inheritedFrom && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            🔗 Inherited from {inheritedFrom}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model *
          </label>
          <select
            name="frameworkConfig.model"
            value={frameworkConfig.model || ''}
            onChange={handleInputChange}
            disabled={isInherited}
            className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isInherited ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
          >
            <option value="">Select Model...</option>
            {modelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isInherited && (
            <div className="text-xs text-blue-600 mt-1">
              This model is inherited and cannot be changed here
            </div>
          )}
        </div>

        {/* Temperature and Max Tokens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <input
              type="number"
              name="frameworkConfig.temperature"
              value={frameworkConfig.temperature || 0.7}
              onChange={handleInputChange}
              disabled={isInherited}
              min={tempRange.min}
              max={tempRange.max}
              step="0.1"
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isInherited ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
            <div className="text-xs text-gray-500 mt-1">
              {tempRange.min} = focused, {tempRange.max} = creative
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              name="frameworkConfig.max_tokens"
              value={frameworkConfig.max_tokens || 2000}
              onChange={handleInputChange}
              disabled={isInherited}
              min="1"
              max={maxTokensLimit}
              className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isInherited ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
            <div className="text-xs text-gray-500 mt-1">
              Maximum response length (limit: {maxTokensLimit.toLocaleString()})
            </div>
          </div>
        </div>

        {/* BYOK Status - Replaces manual API key field */}
        {showApiKey && requiresApiKey(framework) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key Status
            </label>
            <div className="relative">
              <div className={`w-full p-3 border rounded-md ${
                isInherited ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
              }`}>
                {isInherited ? (
                  <div className="flex items-center text-purple-700">
                    <span className="mr-2">🔗</span>
                    <span className="text-sm">Using inherited API key from parent agent</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-blue-700">
                      <span className="mr-2">🔑</span>
                      <span className="text-sm">Using BYOK (Bring Your Own Keys)</span>
                    </div>
                    <a 
                      href="/api-key-manager" 
                      target="_blank"
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Manage Keys →
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isInherited 
                ? "API key is inherited from the parent agent"
                : `API keys are managed centrally and applied automatically during execution`
              }
            </div>
            <div className="text-xs text-green-600 mt-1">
              ✅ Secure, encrypted, and reusable across all workflows
            </div>
          </div>
        )}

        {/* Framework-specific additional config */}
        {framework === 'webhook' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL *
            </label>
            <input
              type="url"
              name="frameworkConfig.url"
              value={frameworkConfig.url || ''}
              onChange={handleInputChange}
              placeholder="https://your-webhook-endpoint.com"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
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

export default LLMConfigSection;