// Complete Enhanced Agent Editor with Framework/LLM Separation + BYOK Integration
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

// Framework and LLM constants
const AVAILABLE_FRAMEWORKS = [
  { value: 'crewai', label: 'CrewAI', description: 'Multi-agent orchestration framework' },
  { value: 'langchain', label: 'LangChain', description: 'Chain-based LLM workflows' },
  { value: 'autogen', label: 'AutoGen', description: 'Multi-agent conversations' },
  { value: 'llamaindex', label: 'LlamaIndex', description: 'Document indexing and RAG' },
  { value: 'huggingface', label: 'HuggingFace', description: 'Open source models' },
  { value: 'webhook', label: 'Webhook', description: 'Custom webhook integration' }
];

const AVAILABLE_LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: 'GPT models' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Multiple models via API' },
  { value: 'gemini', label: 'Google Gemini', description: 'Google\'s AI models' },
  { value: 'huggingface', label: 'HuggingFace', description: 'Open source models' }
];

const LLM_MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4', context: '8K', cost: 'High' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', context: '128K', cost: 'High' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', context: '4K', cost: 'Medium' }
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus', context: '200K', cost: 'High' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', context: '200K', cost: 'Medium' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', context: '200K', cost: 'Low' }
  ],
  openrouter: [
    { value: 'openai/gpt-4', label: 'GPT-4 (via OpenRouter)', context: '8K', cost: 'High' },
    { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus (via OpenRouter)', context: '200K', cost: 'High' },
    { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B', context: '4K', cost: 'Medium' }
  ],
  gemini: [
    { value: 'gemini-pro', label: 'Gemini Pro', context: '32K', cost: 'Medium' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision', context: '16K', cost: 'High' }
  ],
  huggingface: [
    { value: 'microsoft/DialoGPT-medium', label: 'DialoGPT Medium', context: '1K', cost: 'Low' },
    { value: 'microsoft/phi-2', label: 'Phi-2', context: '2K', cost: 'Low' },
    { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B', context: '8K', cost: 'Low' }
  ]
};

const FRAMEWORK_LLM_COMPATIBILITY = {
  crewai: ['openai', 'anthropic', 'openrouter', 'gemini'],
  langchain: ['openai', 'anthropic', 'openrouter', 'huggingface'],
  autogen: ['openai', 'anthropic', 'openrouter'],
  llamaindex: ['openai', 'anthropic', 'openrouter', 'huggingface'],
  huggingface: [], // Uses models directly
  webhook: [] // No LLM needed
};

const EnhancedAgentEditor = ({ 
  formData, 
  handleInputChange, 
  handleFrameworkChange
}) => {
  
  // 🔑 BYOK State Management
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);

  // 🔑 Load API Keys from BYOK Manager
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.api_keys) {
            setAvailableApiKeys(result.data.api_keys);
            console.log('🔑 Loaded API keys:', result.data.api_keys);
          }
        }
      } catch (error) {
        console.error('🔑 Error loading API keys:', error);
        setApiKeyError('Failed to load API keys from BYOK Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // 🔑 Auto-inject API key when provider is selected
  useEffect(() => {
    const selectedProvider = formData.llm?.provider || formData.llmProvider;
    if (selectedProvider && availableApiKeys.length > 0) {
      const apiKey = availableApiKeys.find(key => key.provider_id === selectedProvider);
      if (apiKey && apiKey.validation_status === 'valid') {
        // Auto-populate the framework config with the API key
        const updatedFrameworkConfig = {
          ...formData.frameworkConfig,
          api_key: `[BYOK:${selectedProvider}]`, // Placeholder - backend will inject real key
          provider: selectedProvider
        };
        
        handleInputChange({
          target: {
            name: 'frameworkConfig',
            value: updatedFrameworkConfig
          }
        });
        
        console.log(`🔑 Auto-injected API key for ${selectedProvider}`);
      }
    }
  }, [formData.llm?.provider, formData.llmProvider, availableApiKeys]);
  
  // Get available LLMs based on selected framework AND available API keys
  const getAvailableLLMs = () => {
    const compatibleLLMs = FRAMEWORK_LLM_COMPATIBILITY[formData.framework] || [];
    const providersWithKeys = availableApiKeys
      .filter(key => key.validation_status === 'valid')
      .map(key => key.provider_id);
    
    return AVAILABLE_LLM_PROVIDERS.filter(llm => 
      compatibleLLMs.includes(llm.value) && providersWithKeys.includes(llm.value)
    );
  };

  // Get available models based on selected LLM provider
  const getAvailableModels = () => {
    const provider = formData.llm?.provider || formData.llmProvider || '';
    return LLM_MODELS[provider] || [];
  };

  // 🔑 Render BYOK Status Indicator
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Loading your API keys...</span>
          </div>
        </div>
      );
    }

    if (apiKeyError) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-sm text-red-700">{apiKeyError}</span>
          </div>
        </div>
      );
    }

    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    
    if (validKeys.length === 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">🔑</span>
              <span className="text-sm text-yellow-700">No API keys configured</span>
            </div>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
            >
              Add API Keys
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-sm text-green-700">
              {validKeys.length} API key{validKeys.length > 1 ? 's' : ''} available: {validKeys.map(k => k.provider_name).join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  };

  const renderFrameworkSelector = () => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        AI Framework *
        <HelpTooltip type="agent" field="framework" />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AVAILABLE_FRAMEWORKS.map(framework => (
          <label 
            key={framework.value} 
            className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
              formData.framework === framework.value 
                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="framework"
                value={framework.value}
                checked={formData.framework === framework.value}
                onChange={handleFrameworkChange}
                className="mr-3"
                required
              />
              <div>
                <div className="font-medium text-gray-900">{framework.label}</div>
                <div className="text-xs text-gray-500 mt-1">{framework.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const renderLLMSelector = () => {
    const requiresLLM = FRAMEWORK_LLM_COMPATIBILITY[formData.framework]?.length > 0;
    const availableLLMs = getAvailableLLMs();
    const availableModels = getAvailableModels();
    const selectedProvider = formData.llm?.provider || formData.llmProvider;
    
    if (!requiresLLM) {
      return null; // HuggingFace and webhook don't need external LLM
    }

    // Check if no providers are available due to missing API keys
    if (availableLLMs.length === 0) {
      return (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="text-sm font-medium text-red-800 mb-2">🤖 LLM Configuration</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 mb-1">No LLM providers available</p>
              <p className="text-xs text-red-600">Add API keys in the BYOK Manager to use LLM providers</p>
            </div>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Add API Keys
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-green-800">🤖 LLM Configuration</h4>
          {selectedProvider && (
            <div className="flex items-center text-xs text-green-700">
              <span className="mr-1">🔑</span>
              <span>API key auto-loaded from BYOK</span>
            </div>
          )}
        </div>
        
        {/* LLM Provider Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            LLM Provider * (Only showing providers with valid API keys)
            <HelpTooltip type="agent" field="llmProvider" />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableLLMs.map(llm => {
              const apiKey = availableApiKeys.find(key => key.provider_id === llm.value);
              const isSelected = selectedProvider === llm.value;
              
              return (
                <label 
                  key={llm.value}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                    isSelected 
                      ? 'border-green-400 bg-green-100 shadow-sm' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="llmProvider"
                      value={llm.value}
                      checked={isSelected}
                      onChange={handleInputChange}
                      className="mr-3"
                      required
                    />
                    <div>
                      <div className="text-sm font-medium">{llm.label}</div>
                      <div className="text-xs text-gray-500">{llm.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {apiKey && (
                      <div className="flex items-center text-xs text-green-600">
                        <span className="mr-1">✅</span>
                        <span>Key Ready</span>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          
          {selectedProvider && (
            <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-700">
              <span className="font-medium">🔑 BYOK Active:</span> API key for {selectedProvider} will be automatically injected during execution
            </div>
          )}
        </div>

        {/* Model Selection */}
        {selectedProvider && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model *
              <HelpTooltip type="agent" field="model" />
            </label>
            <select
              name="llmModel"
              value={formData.llm?.model || formData.llmModel || ''}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select Model</option>
              {availableModels.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label} ({model.context} context, {model.cost} cost)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* LLM Parameters */}
        {selectedProvider && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
                <HelpTooltip type="agent" field="temperature" />
              </label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature || 0.7}
                onChange={handleInputChange}
                min="0"
                max="2"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens
                <HelpTooltip type="agent" field="maxTokens" />
              </label>
              <input
                type="number"
                name="max_tokens"
                value={formData.max_tokens || 1000}
                onChange={handleInputChange}
                min="1"
                max="4096"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFrameworkSpecificFields = () => {
    if (!formData.framework) return null;

    switch (formData.framework) {
      case 'crewai':
        return renderCrewAIFields();
      case 'langchain':
        return renderLangChainFields();
      case 'autogen':
        return renderAutoGenFields();
      case 'llamaindex':
        return renderLlamaIndexFields();
      case 'huggingface':
        return renderHuggingFaceFields();
      case 'webhook':
        return renderWebhookFields();
      default:
        return renderCrewAIFields(); // Default fallback
    }
  };

  const renderCrewAIFields = () => (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="text-sm font-medium text-blue-800 mb-4">🚀 CrewAI Agent Configuration</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1 flex items-center">
            Role *
            <HelpTooltip type="agent" field="role" />
          </label>
          <input
            type="text"
            name="role"
            value={formData.role || ''}
            onChange={handleInputChange}
            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Senior Software Engineer, Research Analyst, Content Creator"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-1 flex items-center">
            Goal *
            <HelpTooltip type="agent" field="goal" />
          </label>
          <textarea
            name="goal"
            value={formData.goal || ''}
            onChange={handleInputChange}
            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="What is this agent's primary objective? Be specific about what you want them to accomplish."
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-1 flex items-center">
            Backstory *
            <HelpTooltip type="agent" field="backstory" />
          </label>
          <textarea
            name="backstory"
            value={formData.backstory || ''}
            onChange={handleInputChange}
            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="Background and context for this agent. This helps shape their personality and approach."
            required
          />
        </div>

        {/* Agent Behavior Settings */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">🎛️ Agent Behavior</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowDelegation"
                name="allowDelegation"
                checked={formData.allowDelegation || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowDelegation" className="ml-2 block text-sm text-gray-700">
                Allow Delegation
                <HelpTooltip type="agent" field="allowDelegation" />
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableMemory"
                name="enableMemory"
                checked={formData.enableMemory || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableMemory" className="ml-2 block text-sm text-gray-700">
                Enable Memory
                <HelpTooltip type="agent" field="enableMemory" />
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="verbose"
                name="verbose"
                checked={formData.verbose || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="verbose" className="ml-2 block text-sm text-gray-700">
                Verbose Mode
                <HelpTooltip type="agent" field="verbose" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLangChainFields = () => (
    <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <h4 className="text-sm font-medium text-purple-800 mb-4">🔗 LangChain Agent Configuration</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Message *
            <HelpTooltip type="agent" field="systemMessage" />
          </label>
          <textarea
            name="systemMessage"
            value={formData.systemMessage || ''}
            onChange={handleInputChange}
            rows="3"
            placeholder="You are a helpful AI assistant specialized in..."
            className="w-full p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chain Type *
            <HelpTooltip type="agent" field="chainType" />
          </label>
          <select
            name="chainType"
            value={formData.chainType || ''}
            onChange={handleInputChange}
            className="w-full p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="">Select Chain Type</option>
            <option value="simple">Simple LLM Chain</option>
            <option value="conversation">Conversation Chain</option>
            <option value="rag">Retrieval QA Chain</option>
            <option value="agent">Agent with Tools</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAutoGenFields = () => (
    <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
      <h4 className="text-sm font-medium text-orange-800 mb-4">🤝 AutoGen Agent Configuration</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Message *
            <HelpTooltip type="agent" field="systemMessage" />
          </label>
          <textarea
            name="systemMessage"
            value={formData.systemMessage || ''}
            onChange={handleInputChange}
            rows="3"
            placeholder="You are a helpful AI assistant..."
            className="w-full p-3 border border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agent Type *
            <HelpTooltip type="agent" field="agentType" />
          </label>
          <select
            name="agentType"
            value={formData.agentType || ''}
            onChange={handleInputChange}
            className="w-full p-3 border border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            <option value="">Select Agent Type</option>
            <option value="assistant">Assistant Agent</option>
            <option value="user_proxy">User Proxy Agent</option>
            <option value="conversable">Conversable Agent</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderLlamaIndexFields = () => (
    <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
      <h4 className="text-sm font-medium text-indigo-800 mb-4">📚 LlamaIndex Agent Configuration</h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Index Type *
              <HelpTooltip type="agent" field="indexType" />
            </label>
            <select
              name="indexType"
              value={formData.indexType || ''}
              onChange={handleInputChange}
              className="w-full p-3 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Index Type</option>
              <option value="vector">Vector Store Index</option>
              <option value="tree">Tree Index</option>
              <option value="list">List Index</option>
              <option value="keyword">Keyword Table Index</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documents Source *
              <HelpTooltip type="agent" field="documentsSource" />
            </label>
            <select
              name="documentsSource"
              value={formData.documentsSource || ''}
              onChange={handleInputChange}
              className="w-full p-3 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Source</option>
              <option value="upload">File Upload</option>
              <option value="url">Web URL</option>
              <option value="text">Direct Text</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHuggingFaceFields = () => (
    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h4 className="text-sm font-medium text-yellow-800 mb-4">🤗 HuggingFace Model Configuration</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model Name *
            <HelpTooltip type="agent" field="modelName" />
          </label>
          <input
            type="text"
            name="modelName"
            value={formData.modelName || ''}
            onChange={handleInputChange}
            placeholder="e.g., microsoft/DialoGPT-medium"
            className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Type *
            <HelpTooltip type="agent" field="taskType" />
          </label>
          <select
            name="taskType"
            value={formData.taskType || ''}
            onChange={handleInputChange}
            className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="">Select Task Type</option>
            <option value="text-generation">Text Generation</option>
            <option value="conversational">Conversational</option>
            <option value="question-answering">Question Answering</option>
            <option value="summarization">Summarization</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderWebhookFields = () => (
    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h4 className="text-sm font-medium text-yellow-800 mb-3">🔗 Webhook Configuration</h4>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL *</label>
        <input
          type="url"
          name="frameworkConfig.url"
          value={formData.frameworkConfig?.url || ''}
          onChange={handleInputChange}
          placeholder="https://your-webhook-endpoint.com"
          className="w-full p-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
          required
        />
        <div className="text-xs text-yellow-700 mt-1">
          The webhook will receive agent requests and should return responses
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 🔑 BYOK Status Indicator */}
      {renderBYOKStatus()}
      
      {/* Framework Selection */}
      {renderFrameworkSelector()}
      
      {/* LLM Configuration */}
      {formData.framework && renderLLMSelector()}
      
      {/* Framework-Specific Fields */}
      {formData.framework && renderFrameworkSpecificFields()}
    </div>
  );
};

EnhancedAgentEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired
};

export default EnhancedAgentEditor;