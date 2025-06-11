// Complete Enhanced Agent Editor with Framework/LLM Separation + BYOK Integration
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import EnhancedFrameworkSelector from '../toolTemplates/EnhancedFrameworkSelector';

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
  { value: 'huggingface', label: 'HuggingFace', description: 'Open source models' },
  { value: 'perplexity', label: 'Perplexity AI', description: 'Real-time web search models' }
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
  ],
  perplexity: [
    { value: 'sonar-pro', label: 'Sonar Pro (Advanced search)', context: '200K', cost: 'Variable' },
    { value: 'sonar', label: 'Sonar (Lightweight search)', context: '128K', cost: 'Variable' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research (Comprehensive reports)', context: '128K', cost: 'Variable' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (Chain of Thought)', context: '128K', cost: 'Variable' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning (Fast reasoning)', context: '128K', cost: 'Variable' },
    { value: 'r1-1776', label: 'R1-1776 (Offline chat model)', context: '128K', cost: 'Variable' }
  ]
};

const FRAMEWORK_LLM_COMPATIBILITY = {
  crewai: ['openai', 'anthropic', 'openrouter', 'gemini', 'perplexity'],
  langchain: ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity'],
  autogen: ['openai', 'anthropic', 'openrouter', 'perplexity'],
  llamaindex: ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity'],
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

  // 🦜 LangChain State Management
  const [langchainTools, setLangchainTools] = useState([]);
  const [langchainModes, setLangchainModes] = useState({});
  const [langchainLoading, setLangchainLoading] = useState(true);

  // 🤗 HuggingFace State Management
  const [hfTasks, setHfTasks] = useState([]);
  const [hfModels, setHfModels] = useState({});
  const [hfLoading, setHfLoading] = useState(true);
  const [selectedHfTask, setSelectedHfTask] = useState(formData.taskType || '');

  // 📚 LlamaIndex State Management
  const [llamaIndexCapabilities, setLlamaIndexCapabilities] = useState({});
  const [llamaIndexLoading, setLlamaIndexLoading] = useState(true);
  const [selectedIndexType, setSelectedIndexType] = useState(formData.indexType || 'vector');
  const [selectedDocSource, setSelectedDocSource] = useState(formData.documentsSource || 'text');

  // 🤝 AutoGen State Management
  const [autogenCapabilities, setAutogenCapabilities] = useState({});
  const [autogenAgentTemplates, setAutogenAgentTemplates] = useState([]);
  const [autogenConversationTemplates, setAutogenConversationTemplates] = useState([]);
  const [autogenLoading, setAutogenLoading] = useState(true);
  const [selectedAgentTemplate, setSelectedAgentTemplate] = useState('');
  const [selectedConversationTemplate, setSelectedConversationTemplate] = useState('');

  // 🎯 Enhanced Framework Selection State
  const [useEnhancedMode, setUseEnhancedMode] = useState(false);
  const [enhancedFramework, setEnhancedFramework] = useState('');
  const [enhancedProvider, setEnhancedProvider] = useState('');
  const [enhancedModel, setEnhancedModel] = useState('');

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

  // 🦜 Load LangChain capabilities
  useEffect(() => {
    const loadLangChainCapabilities = async () => {
      try {
        setLangchainLoading(true);
        const response = await fetch('http://localhost:8000/api/tools/langchain/capabilities');
        
        if (response.ok) {
          const data = await response.json();
          setLangchainTools(Object.values(data.tools || {}));
          setLangchainModes(data.execution_modes || {});
        }
      } catch (error) {
        console.error('Failed to load LangChain capabilities:', error);
      } finally {
        setLangchainLoading(false);
      }
    };
    
    loadLangChainCapabilities();
  }, []);

  // 🤗 Load HuggingFace capabilities
  useEffect(() => {
    const loadHuggingFaceCapabilities = async () => {
      try {
        setHfLoading(true);
        // Try to load from backend, but silently fail to fallback
        const response = await fetch('http://localhost:8000/api/tools/huggingface/debug');
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract tasks from the debug response format
          if (data.status === "success" && data.tasks) {
            setHfTasks(data.tasks || []);
          } else {
            // Fallback: Use hardcoded verified tasks if debug doesn't have them
            const fallbackTasks = ["summarization", "text-classification", "question-answering", "zero-shot-classification"];
            setHfTasks(fallbackTasks);
          }
          
          // Load models for current task if selected
          if (selectedHfTask) {
            loadModelsForTask(selectedHfTask);
          }
        } else {
          // Backend not available, use fallback
          const fallbackTasks = ["summarization", "text-classification", "question-answering", "zero-shot-classification"];
          setHfTasks(fallbackTasks);
        }
      } catch (error) {
        // Silently handle error - backend may not be running
        // Use hardcoded verified tasks as fallback
        const fallbackTasks = ["summarization", "text-classification", "question-answering", "zero-shot-classification"];
        setHfTasks(fallbackTasks);
      } finally {
        setHfLoading(false);
      }
    };
    
    const loadModelsForTask = async (task) => {
      try {
        const response = await fetch(`http://localhost:8000/api/tools/huggingface/models/${task}`);
        if (response.ok) {
          const data = await response.json();
          setHfModels(prev => ({
            ...prev,
            [task]: data.models || {}
          }));
        }
      } catch (error) {
        // Silently handle error - use fallback models
        const fallbackModels = {
          "summarization": { primary: "sshleifer/distilbart-cnn-12-6", alternatives: ["facebook/bart-large-cnn"] },
          "text-classification": { primary: "cardiffnlp/twitter-roberta-base-sentiment", alternatives: ["distilbert-base-uncased-finetuned-sst-2-english"] },
          "question-answering": { primary: "deepset/roberta-base-squad2", alternatives: ["distilbert-base-cased-distilled-squad"] },
          "zero-shot-classification": { primary: "facebook/bart-large-mnli", alternatives: ["typeform/distilbert-base-uncased-mnli"] }
        };
        setHfModels(prev => ({
          ...prev,
          [task]: fallbackModels[task] || {}
        }));
      }
    };
    
    loadHuggingFaceCapabilities();
  }, [selectedHfTask]);

  // 📚 Load LlamaIndex capabilities
  useEffect(() => {
    const loadLlamaIndexCapabilities = async () => {
      try {
        setLlamaIndexLoading(true);
        
        // Load capabilities
        const capabilityResponse = await fetch('http://localhost:8000/api/tools/llamaindex/capabilities');
        if (capabilityResponse.ok) {
          const capabilityData = await capabilityResponse.json();
          setLlamaIndexCapabilities(capabilityData);
        }
      } catch (error) {
        console.error('Failed to load LlamaIndex capabilities:', error);
      } finally {
        setLlamaIndexLoading(false);
      }
    };
    
    loadLlamaIndexCapabilities();
  }, []);

  // 🤝 Load AutoGen capabilities
  useEffect(() => {
    const loadAutogenCapabilities = async () => {
      try {
        setAutogenLoading(true);
        
        // Load capabilities
        const [capabilityResponse, agentTemplatesResponse, conversationTemplatesResponse] = await Promise.all([
          fetch('http://localhost:8000/api/tools/autogen/capabilities'),
          fetch('http://localhost:8000/api/tools/autogen/agent-templates'),
          fetch('http://localhost:8000/api/tools/autogen/conversation-templates')
        ]);
        
        if (capabilityResponse.ok) {
          const capabilityData = await capabilityResponse.json();
          setAutogenCapabilities(capabilityData);
        }
        
        if (agentTemplatesResponse.ok) {
          const agentData = await agentTemplatesResponse.json();
          setAutogenAgentTemplates(agentData.agent_templates || []);
        }
        
        if (conversationTemplatesResponse.ok) {
          const conversationData = await conversationTemplatesResponse.json();
          setAutogenConversationTemplates(conversationData.conversation_templates || []);
        }
      } catch (error) {
        console.error('Failed to load AutoGen capabilities:', error);
      } finally {
        setAutogenLoading(false);
      }
    };
    
    loadAutogenCapabilities();
  }, []);

  // 🔑 Auto-inject API key when provider is selected
  useEffect(() => {
    const selectedProvider = formData.llm?.provider || formData.llmProvider;
    if (selectedProvider && availableApiKeys.length > 0) {
      const apiKey = availableApiKeys.find(key => key.provider === selectedProvider);
      if (apiKey && apiKey.validation_status === 'valid') {
        // Auto-inject API key placeholder for BYOK
        handleInputChange({
          target: {
            name: 'llmApiKey',
            value: `[BYOK:${apiKey.provider}]`
          }
        });
      }
    }
  }, [formData.llm?.provider, formData.llmProvider, availableApiKeys]);

  // Handle enhanced mode changes
  useEffect(() => {
    if (useEnhancedMode && enhancedFramework && enhancedProvider && enhancedModel) {
      // Update formData with enhanced selections
      handleInputChange({
        target: { name: 'framework', value: enhancedFramework }
      });
      
      // Update LLM configuration
      const llmConfig = {
        provider: enhancedProvider,
        model: enhancedModel
      };
      
      handleInputChange({
        target: { name: 'llm', value: llmConfig }
      });
      
      handleInputChange({
        target: { name: 'llmProvider', value: enhancedProvider }
      });
      
      handleInputChange({
        target: { name: 'llmModel', value: enhancedModel }
      });
    }
  }, [enhancedFramework, enhancedProvider, enhancedModel, useEnhancedMode]);
  
  // Get available LLMs based on selected framework AND available API keys
  const getAvailableLLMs = () => {
    const compatibleLLMs = FRAMEWORK_LLM_COMPATIBILITY[formData.framework] || [];
    const providersWithKeys = availableApiKeys
      .filter(key => key.validation_status === 'valid')
      .map(key => key.provider);
    
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
      {/* Enhanced Framework Selection Mode Toggle */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Framework Selection Mode</h3>
            <p className="text-sm text-gray-600">Choose between simple or enhanced framework configuration</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm ${!useEnhancedMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Simple
            </span>
            <button
              type="button"
              onClick={() => setUseEnhancedMode(!useEnhancedMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                useEnhancedMode ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useEnhancedMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${useEnhancedMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Enhanced ✨
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          {useEnhancedMode 
            ? '✨ Enhanced mode: Native support detection, BYOK integration, and compatibility matrix'
            : '⚡ Simple mode: Quick framework selection'
          }
        </div>
      </div>

      {/* Enhanced Framework Selector */}
      {useEnhancedMode ? (
        <div className="mb-6">
          <EnhancedFrameworkSelector
            selectedFramework={enhancedFramework}
            setSelectedFramework={setEnhancedFramework}
            selectedProvider={enhancedProvider}
            setSelectedProvider={setEnhancedProvider}
            selectedModel={enhancedModel}
            setSelectedModel={setEnhancedModel}
            showOnlyNativeSupport={false}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
          />
        </div>
      ) : (
        /* Traditional Framework Selection */
        <div>
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
      )}
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
              const apiKey = availableApiKeys.find(key => key.provider === llm.value);
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
                      onChange={handleLocalInputChange}
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
              onChange={handleLocalInputChange}
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
                onChange={handleLocalInputChange}
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
                onChange={handleLocalInputChange}
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
            onChange={handleLocalInputChange}
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
            onChange={handleLocalInputChange}
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
            onChange={handleLocalInputChange}
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
                onChange={handleLocalInputChange}
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
                onChange={handleLocalInputChange}
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
                onChange={handleLocalInputChange}
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

  const renderLangChainFields = () => {
    const selectedTools = formData.langchainTools || [];
    const selectedMode = formData.chainType || 'auto';
    
    const handleToolSelection = (toolId) => {
      const newTools = selectedTools.includes(toolId)
        ? selectedTools.filter(t => t !== toolId)
        : [...selectedTools, toolId];
      
      handleInputChange({
        target: { name: 'langchainTools', value: newTools }
      });
    };
    
    return (
      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h4 className="text-sm font-medium text-purple-800 mb-4">🦜 LangChain Agent Configuration</h4>
        
        {langchainLoading ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-700">Loading LangChain capabilities...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* System Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Message *
                <HelpTooltip type="agent" field="systemMessage" />
              </label>
              <textarea
                name="systemMessage"
                value={formData.systemMessage || ''}
                onChange={handleLocalInputChange}
                rows="3"
                placeholder="You are a helpful AI assistant with access to tools. Use tools when necessary to provide accurate information."
                className="w-full p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Execution Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Execution Mode *
                <HelpTooltip type="agent" field="chainType" />
              </label>
              <select
                name="chainType"
                value={selectedMode}
                onChange={handleLocalInputChange}
                className="w-full p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="auto">Auto-Detect (Recommended)</option>
                <option value="llm_chain">Simple LLM Chain</option>
                <option value="conversation">Conversation with Memory</option>
                <option value="rag">Retrieval QA Chain</option>
                <option value="agent">Agent with Tools</option>
              </select>
              <p className="text-xs text-purple-600 mt-1">
                Auto-detect will choose agent mode if tools are selected, otherwise simple LLM chain
              </p>
            </div>

            {/* Tools Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Tools
                <HelpTooltip type="agent" field="tools" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                {langchainTools.map((tool) => (
                  <div
                    key={tool.id || tool.name}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTools.includes(tool.id || tool.name)
                        ? 'border-purple-500 bg-purple-100'
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                    onClick={() => handleToolSelection(tool.id || tool.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{tool.name}</div>
                        <div className="text-xs text-gray-600">{tool.description}</div>
                      </div>
                      <div className="text-lg">
                        {tool.category === 'computation' && '🧮'}
                        {tool.category === 'information' && '🔍'}
                        {tool.category === 'file_processing' && '📁'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTools.length > 0 && (
                <p className="text-xs text-purple-600 mt-2">
                  Selected: {selectedTools.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAutoGenFields = () => (
    <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
      <h4 className="text-sm font-medium text-green-800 mb-4">🤝 AutoGen Multi-Agent Configuration</h4>
      
      {autogenLoading ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Loading AutoGen capabilities...</span>
          </div>
        </div>
      ) : !autogenCapabilities.available ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <span className="text-sm text-yellow-700">
              AutoGen not available: {autogenCapabilities.error || 'Installation required'}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Setup with Templates */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="text-sm font-medium text-blue-900 mb-3">🚀 Quick Setup</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Template
                  <HelpTooltip type="agent" field="agentTemplate" />
                </label>
                <select
                  value={selectedAgentTemplate}
                  onChange={(e) => {
                    setSelectedAgentTemplate(e.target.value);
                    // Auto-fill agent configuration from template
                    const template = autogenAgentTemplates.find(t => t.id === e.target.value);
                    if (template) {
                      handleInputChange({ target: { name: 'agentType', value: template.agentType } });
                      handleInputChange({ target: { name: 'systemMessage', value: template.systemMessage } });
                    }
                  }}
                  className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Custom Agent</option>
                  {autogenAgentTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conversation Template
                  <HelpTooltip type="agent" field="conversationTemplate" />
                </label>
                <select
                  value={selectedConversationTemplate}
                  onChange={(e) => {
                    setSelectedConversationTemplate(e.target.value);
                    // Auto-fill conversation configuration from template
                    const template = autogenConversationTemplates.find(t => t.id === e.target.value);
                    if (template) {
                      handleInputChange({ target: { name: 'conversationMode', value: template.conversationMode } });
                      handleInputChange({ target: { name: 'maxTurns', value: template.maxTurns } });
                    }
                  }}
                  className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Custom Conversation</option>
                  {autogenConversationTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Agent Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Type *
                <HelpTooltip type="agent" field="agentType" />
              </label>
              <select
                name="agentType"
                value={formData.agentType || 'assistant'}
                onChange={handleLocalInputChange}
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
                required
              >
                {autogenCapabilities.agent_types?.map((agentType) => (
                  <option key={agentType} value={agentType}>
                    {agentType.replace('_', ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversation Mode *
                <HelpTooltip type="agent" field="conversationMode" />
              </label>
              <select
                name="conversationMode"
                value={formData.conversationMode || 'one_on_one'}
                onChange={handleLocalInputChange}
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
                required
              >
                {autogenCapabilities.conversation_modes?.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.replace('_', ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Turns
                <HelpTooltip type="agent" field="maxTurns" />
              </label>
              <input
                type="number"
                name="maxTurns"
                value={formData.maxTurns || 10}
                onChange={handleLocalInputChange}
                min="1"
                max="50"
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Human Input Mode
                <HelpTooltip type="agent" field="humanInputMode" />
              </label>
              <select
                name="humanInputMode"
                value={formData.humanInputMode || 'NEVER'}
                onChange={handleLocalInputChange}
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
              >
                {autogenCapabilities.human_input_modes?.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code Execution
                <HelpTooltip type="agent" field="codeExecution" />
              </label>
              <select
                name="codeExecution"
                value={formData.codeExecution || 'disabled'}
                onChange={handleLocalInputChange}
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
              >
                {autogenCapabilities.code_execution?.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agent Name and Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name
                <HelpTooltip type="agent" field="agentName" />
              </label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName || ''}
                onChange={handleLocalInputChange}
                placeholder="e.g., ResearchAssistant"
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Description
                <HelpTooltip type="agent" field="agentDescription" />
              </label>
              <input
                type="text"
                name="agentDescription"
                value={formData.agentDescription || ''}
                onChange={handleLocalInputChange}
                placeholder="Brief description of agent's role"
                className="w-full p-3 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Advanced Multi-Agent Features */}
          {formData.conversationMode === 'group_chat' && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h5 className="text-sm font-medium text-yellow-900 mb-3">👥 Group Chat Configuration</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speaker Selection Method
                    <HelpTooltip type="agent" field="speakerSelectionMethod" />
                  </label>
                  <select
                    name="speakerSelectionMethod"
                    value={formData.speakerSelectionMethod || 'auto'}
                    onChange={handleLocalInputChange}
                    className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="auto">Auto Selection</option>
                    <option value="manual">Manual Selection</option>
                    <option value="random">Random Selection</option>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Concurrent Agents
                    <HelpTooltip type="agent" field="maxConcurrentAgents" />
                  </label>
                  <input
                    type="number"
                    name="maxConcurrentAgents"
                    value={formData.maxConcurrentAgents || 5}
                    onChange={handleLocalInputChange}
                    min="2"
                    max="10"
                    className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Code Execution Settings */}
          {formData.codeExecution !== 'disabled' && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h5 className="text-sm font-medium text-purple-900 mb-3">💻 Code Execution Settings</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Timeout (seconds)
                    <HelpTooltip type="agent" field="codeTimeout" />
                  </label>
                  <input
                    type="number"
                    name="codeTimeout"
                    value={formData.codeTimeout || 60}
                    onChange={handleLocalInputChange}
                    min="10"
                    max="300"
                    className="w-full p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Directory
                    <HelpTooltip type="agent" field="workDirectory" />
                  </label>
                  <input
                    type="text"
                    name="workDirectory"
                    value={formData.workDirectory || 'autogen_workspace'}
                    onChange={handleLocalInputChange}
                    placeholder="autogen_workspace"
                    className="w-full p-3 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Capability Overview */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm">
              <strong>AutoGen Version:</strong> {autogenCapabilities.version || 'Unknown'}
            </div>
            <div className="text-sm mt-1">
              <strong>Available Features:</strong> {Object.entries(autogenCapabilities.features || {})
                .filter(([key, value]) => value)
                .map(([key]) => key.replace('_', ' '))
                .join(', ') || 'Loading...'}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Supported providers: {autogenCapabilities.supported_providers?.join(', ') || 'Loading...'}
            </div>
          </div>

          {/* Template Preview */}
          {selectedAgentTemplate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h6 className="text-sm font-medium text-blue-900 mb-2">📝 Agent Template Preview</h6>
              {(() => {
                const template = autogenAgentTemplates.find(t => t.id === selectedAgentTemplate);
                return template ? (
                  <div className="text-xs space-y-1">
                    <div><strong>Type:</strong> {template.agentType}</div>
                    <div><strong>Description:</strong> {template.description}</div>
                    <div><strong>System Message:</strong> {template.systemMessage.substring(0, 100)}...</div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderHuggingFaceFields = () => {
    const currentModels = hfModels[selectedHfTask] || {};
    const primaryModel = currentModels.primary || '';
    
    const handleTaskChange = async (e) => {
      const newTask = e.target.value;
      setSelectedHfTask(newTask);
      handleInputChange(e);
      
      // Reset model when task changes
      handleInputChange({
        target: { name: 'modelName', value: '' }
      });
      
      // ✅ FIX: Immediately load models for the selected task
      if (newTask) {
        try {
          const response = await fetch(`http://localhost:8000/api/tools/huggingface/models/${newTask}`);
          if (response.ok) {
            const data = await response.json();
            const taskModels = data.models || {};
            
            // Update models state
            setHfModels(prev => ({
              ...prev,
              [newTask]: taskModels
            }));
            
            // ✅ AUTO-POPULATE recommended model immediately
            if (taskModels.primary) {
              handleInputChange({
                target: { name: 'modelName', value: taskModels.primary }
              });
              console.log(`🤗 Auto-selected recommended model: ${taskModels.primary}`);
            }
          }
        } catch (error) {
          console.error(`Failed to load models for task ${newTask}:`, error);
        }
      }
    };
    
    return (
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-800 mb-4">🤗 HuggingFace Model Configuration</h4>
        
        {hfLoading ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-700">Loading HuggingFace capabilities...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Task Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Type *
                <HelpTooltip type="agent" field="taskType" />
              </label>
              <select
                name="taskType"
                value={selectedHfTask}
                onChange={handleTaskChange}
                className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              >
                <option value="">Select Task Type</option>
                {hfTasks.map((task) => (
                  <option key={task} value={task}>
                    {task.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            {selectedHfTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name *
                  <HelpTooltip type="agent" field="modelName" />
                </label>
                {primaryModel ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="modelName"
                      value={formData.modelName || primaryModel}
                      onChange={handleLocalInputChange}
                      placeholder={primaryModel}
                      className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                      required
                    />
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-green-800 mb-1">
                        ✅ Recommended (Auto-Selected): {primaryModel}
                      </div>
                      {currentModels.description && (
                        <div className="text-xs text-green-700 mb-2">
                          {currentModels.description}
                        </div>
                      )}
                      <div className="text-xs text-green-600">
                        💡 <strong>Pro tip:</strong> This model is tested and verified to work well. You can also type a different model if you prefer.
                      </div>
                    </div>
                    {currentModels.alternatives && currentModels.alternatives.length > 0 && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <strong>Alternative options:</strong> {currentModels.alternatives.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="modelName"
                      value={formData.modelName || ''}
                      onChange={handleLocalInputChange}
                      placeholder="e.g., microsoft/DialoGPT-medium, facebook/bart-large-cnn"
                      className="w-full p-3 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                      required
                    />
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      ⚠️ No verified models loaded yet. Please enter a HuggingFace model name manually.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Task Description */}
            {selectedHfTask && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm">
                  <strong>Task:</strong> {selectedHfTask.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  This agent will be specialized for {selectedHfTask} tasks using HuggingFace models.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderWebhookFields = () => (
    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h4 className="text-sm font-medium text-yellow-800 mb-3">🔗 Webhook Configuration</h4>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL *</label>
        <input
          type="url"
          name="frameworkConfig.url"
          value={formData.frameworkConfig?.url || ''}
          onChange={handleLocalInputChange}
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

  const handleLocalInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('llm.')) {
      const llmField = name.split('.')[1];
      const updatedFormData = {
        ...formData,
        llm: {
          ...formData.llm,
          [llmField]: type === 'checkbox' ? checked : value
        }
      };
      handleInputChange({ target: { name: 'llm', value: updatedFormData.llm } });
    } else if (name.startsWith('frameworkConfig.')) {
      const configField = name.split('.')[1];
      const updatedFormData = {
        ...formData,
        frameworkConfig: {
          ...formData.frameworkConfig,
          [configField]: type === 'checkbox' ? checked : value
        }
      };
      handleInputChange({ target: { name: 'frameworkConfig', value: updatedFormData.frameworkConfig } });
    } else if (name === 'llmProvider') {
      const newProvider = type === 'checkbox' ? checked : value;
      
      // CRITICAL FIX: Auto-select first available model when provider changes
      const availableModels = LLM_MODELS[newProvider] || [];
      const newModel = availableModels.length > 0 ? availableModels[0].value : '';
      
      console.log(`🔍 Provider changed to: ${newProvider}, auto-selecting model: ${newModel}`);
      
      const updatedFormData = {
        ...formData,
        llm: {
          ...formData.llm,
          provider: newProvider,
          model: newModel  // Auto-update model when provider changes
        },
        frameworkConfig: {
          ...formData.frameworkConfig,
          provider: newProvider,
          model: newModel  // Also update framework config
        },
        llmProvider: newProvider,
        llmModel: newModel  // Update legacy field too
      };
      
      // Update all the related fields properly
      handleInputChange({ target: { name: 'llm', value: updatedFormData.llm } });
      handleInputChange({ target: { name: 'frameworkConfig', value: updatedFormData.frameworkConfig } });
      handleInputChange({ target: { name: 'llmModel', value: type === 'checkbox' ? checked : value } });
    } else if (name === 'llmModel') {
      // Map llmModel to llm.model and frameworkConfig.model
      const updatedFormData = {
        ...formData,
        llm: {
          ...formData.llm,
          model: type === 'checkbox' ? checked : value
        },
        frameworkConfig: {
          ...formData.frameworkConfig,
          model: type === 'checkbox' ? checked : value
        },
        llmModel: type === 'checkbox' ? checked : value
      };
      
      // Update all the related fields properly
      handleInputChange({ target: { name: 'llm', value: updatedFormData.llm } });
      handleInputChange({ target: { name: 'frameworkConfig', value: updatedFormData.frameworkConfig } });
      handleInputChange({ target: { name: 'llmModel', value: type === 'checkbox' ? checked : value } });
    } else {
      handleInputChange(e);
    }
  };

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