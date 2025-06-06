import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  FRAMEWORK_MODELS, 
  getAvailableModels, 
  getFrameworkProviders, 
  getProviderSupport,
  isModelNativelySupported 
} from '../../data/frameworkModels';

const EnhancedFrameworkSelector = ({ 
  selectedFramework, 
  setSelectedFramework, 
  selectedProvider, 
  setSelectedProvider,
  selectedModel, 
  setSelectedModel,
  showOnlyNativeSupport = false,
  className = ""
}) => {
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
          // Only include valid, active API keys
          const validKeys = result.data.api_keys.filter(key => 
            key.validation_status === 'valid' && key.is_active
          );
          setAvailableApiKeys(validKeys);
          setApiKeyError(null);
        } else {
          setApiKeyError('Failed to load API keys');
          setAvailableApiKeys([]);
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Error connecting to BYOK Manager');
        setAvailableApiKeys([]);
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // Get frameworks that user has API keys for
  const getAvailableFrameworks = () => {
    const frameworks = [
      { id: 'crewai', name: 'CrewAI', icon: '🤖', description: 'Multi-agent AI crews' },
      { id: 'langchain', name: 'LangChain', icon: '🦜', description: 'LLM application framework' },
      { id: 'autogen', name: 'AutoGen', icon: '🔄', description: 'Conversational AI agents' },
      { id: 'llamaindex', name: 'LlamaIndex', icon: '🦙', description: 'Data framework for LLMs' },
      { id: 'huggingface', name: 'HuggingFace', icon: '🤗', description: 'Open source ML models' },
      { id: 'openrouter', name: 'OpenRouter', icon: '🌐', description: '100+ AI models via one API' }
    ];

    return frameworks.map(framework => {
      const supportedProviders = getFrameworkProviders(framework.id);
      const userHasKeys = supportedProviders.some(provider => 
        availableApiKeys.some(key => key.provider === provider)
      );
      
      return {
        ...framework,
        userHasKeys,
        supportedProviders,
        keyCount: supportedProviders.filter(provider => 
          availableApiKeys.some(key => key.provider === provider)
        ).length
      };
    });
  };

  // Get providers available for selected framework
  const getAvailableProviders = () => {
    if (!selectedFramework) return [];
    
    const supportedProviders = getFrameworkProviders(selectedFramework);
    
    return supportedProviders.map(providerId => {
      const userKey = availableApiKeys.find(key => key.provider === providerId);
      const support = getProviderSupport(selectedFramework, providerId);
      
      const providerInfo = {
        openai: { name: 'OpenAI', icon: '🤖', description: 'GPT-4, GPT-3.5-turbo' },
        anthropic: { name: 'Anthropic', icon: '🧠', description: 'Claude 3 models' },
        google: { name: 'Google AI', icon: '🔍', description: 'Gemini models' },
        perplexity: { name: 'Perplexity', icon: '🔍', description: 'Sonar models' },
        mistral: { name: 'Mistral AI', icon: '🌪️', description: 'Mistral models' },
        cohere: { name: 'Cohere', icon: '🔗', description: 'Command models' },
        openrouter: { name: 'OpenRouter', icon: '🌐', description: '100+ models' },
        huggingface: { name: 'HuggingFace', icon: '🤗', description: 'Open source models' }
      };

      return {
        id: providerId,
        ...providerInfo[providerId],
        hasApiKey: !!userKey,
        keyMasked: userKey?.masked_value || 'No key configured',
        support,
        disabled: !userKey || (!support.hasNativeSupport && showOnlyNativeSupport)
      };
    });
  };

  // Get models available for selected framework + provider
  const getAvailableModelsForSelection = () => {
    if (!selectedFramework || !selectedProvider) return [];
    
    const models = getAvailableModels(selectedFramework, selectedProvider);
    
    if (showOnlyNativeSupport) {
      return models.filter(model => model.native);
    }
    
    return models;
  };

  const availableFrameworks = getAvailableFrameworks();
  const availableProviders = getAvailableProviders();
  const availableModels = getAvailableModelsForSelection();

  if (loadingApiKeys) {
    return (
      <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-700 text-sm">Loading available frameworks and models...</span>
        </div>
      </div>
    );
  }

  if (apiKeyError) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-red-700 text-sm">⚠️ {apiKeyError}</span>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  }

  if (availableApiKeys.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-yellow-700 text-sm font-medium">🔑 No API keys configured</span>
            <p className="text-yellow-600 text-xs mt-1">
              Add API keys in BYOK Manager to enable AI frameworks
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded text-sm"
          >
            Add Keys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Framework Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🎯 AI Framework
          {showOnlyNativeSupport && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Native Support Only
            </span>
          )}
        </label>
        <select
          value={selectedFramework || ''}
          onChange={(e) => {
            setSelectedFramework(e.target.value);
            setSelectedProvider('');
            setSelectedModel('');
          }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Framework...</option>
          {availableFrameworks.map(framework => (
            <option 
              key={framework.id} 
              value={framework.id}
              disabled={!framework.userHasKeys}
            >
              {framework.icon} {framework.name} 
              {framework.userHasKeys 
                ? ` (${framework.keyCount} providers available)` 
                : ' (No API keys)'
              }
            </option>
          ))}
        </select>
        
        {selectedFramework && (
          <p className="text-xs text-gray-600 mt-1">
            {availableFrameworks.find(f => f.id === selectedFramework)?.description}
          </p>
        )}
      </div>

      {/* Provider Selection */}
      {selectedFramework && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔑 LLM Provider
          </label>
          <select
            value={selectedProvider || ''}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setSelectedModel('');
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Provider...</option>
            {availableProviders.map(provider => (
              <option 
                key={provider.id} 
                value={provider.id}
                disabled={provider.disabled}
              >
                {provider.icon} {provider.name} 
                {provider.hasApiKey 
                  ? ` (${provider.support.nativeCount} native models)` 
                  : ' (No API key)'
                }
              </option>
            ))}
          </select>
          
          {selectedProvider && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                {availableProviders.find(p => p.id === selectedProvider)?.description}
              </p>
              <div className="flex items-center space-x-4 text-xs">
                <span className="text-green-600">
                  ✅ {availableProviders.find(p => p.id === selectedProvider)?.support.nativeCount || 0} native models
                </span>
                {!showOnlyNativeSupport && (
                  <span className="text-orange-600">
                    ⚠️ {availableProviders.find(p => p.id === selectedProvider)?.support.fallbackCount || 0} fallback models
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Selection */}
      {selectedFramework && selectedProvider && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🤖 Model
          </label>
          <select
            value={selectedModel || ''}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Model...</option>
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.displayName} - {model.fullDetails}
              </option>
            ))}
          </select>
          
          {selectedModel && (
            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {isModelNativelySupported(selectedFramework, selectedProvider, selectedModel) 
                    ? '✅ Native Framework Support' 
                    : '⚠️ Fallback Execution Mode'
                  }
                </span>
                <span className="text-xs text-gray-500">
                  {selectedModel}
                </span>
              </div>
              {!isModelNativelySupported(selectedFramework, selectedProvider, selectedModel) && (
                <p className="text-xs text-orange-600 mt-1">
                  This model will use fallback execution with tool simulation
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      {selectedFramework && selectedProvider && selectedModel && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">🎯 Configuration Summary</h4>
          <div className="space-y-1 text-xs text-green-700">
            <div>Framework: <strong>{availableFrameworks.find(f => f.id === selectedFramework)?.name}</strong></div>
            <div>Provider: <strong>{availableProviders.find(p => p.id === selectedProvider)?.name}</strong></div>
            <div>Model: <strong>{availableModels.find(m => m.id === selectedModel)?.name}</strong></div>
            <div>Support: <strong>
              {isModelNativelySupported(selectedFramework, selectedProvider, selectedModel) 
                ? 'Native Framework Support ✅' 
                : 'Fallback Mode ⚠️'
              }
            </strong></div>
          </div>
        </div>
      )}
    </div>
  );
};

EnhancedFrameworkSelector.propTypes = {
  selectedFramework: PropTypes.string,
  setSelectedFramework: PropTypes.func.isRequired,
  selectedProvider: PropTypes.string,
  setSelectedProvider: PropTypes.func.isRequired,
  selectedModel: PropTypes.string,
  setSelectedModel: PropTypes.func.isRequired,
  showOnlyNativeSupport: PropTypes.bool,
  className: PropTypes.string
};

export default EnhancedFrameworkSelector; 