// Enhanced EditModal with LLM/Framework Separation
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import CommonFields from './CommonFields';
import ModalFooter from './ModalFooter';
import HelpTooltip from './HelpTooltip';
import AgentEditor from './editmodal/AgentEditor';
import TaskEditor from './editmodal/TaskEditor';
import ToolEditor from './editmodal/ToolEditor';
import ChatbotEditor from './editmodal/ChatbotEditor';
import DelayEditor from './editmodal/DelayEditor';
import TriggerEditor from './editmodal/TriggerEditor';
import LogicEditor from './editmodal/LogicEditor';
import InputEditor from './editmodal/InputEditor';
import OutputEditor from './editmodal/OutputEditor';
import NodeErrorDisplay from './editmodal/shared/NodeErrorDisplay';

// Framework and LLM constants (separated)
export const AVAILABLE_FRAMEWORKS = [
  { value: 'crewai', label: 'CrewAI', description: 'Multi-agent orchestration framework' },
  { value: 'langchain', label: 'LangChain', description: 'Chain-based LLM workflows' },
  { value: 'autogen', label: 'AutoGen', description: 'Multi-agent conversations' },
  { value: 'llamaindex', label: 'LlamaIndex', description: 'Document indexing and RAG' },
  { value: 'huggingface', label: 'HuggingFace', description: 'Open source models' }
];

export const AVAILABLE_LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: 'GPT models' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Multiple models via API' },
  { value: 'gemini', label: 'Google Gemini', description: 'Google\'s AI models' },
  { value: 'huggingface', label: 'HuggingFace', description: 'Open source models' },
  { value: 'perplexity', label: 'Perplexity AI', description: 'Real-time web search models' }
];

// LLM Models mapping
export const LLM_MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4 (8K context, $0.03/1K tokens)', context: '8K', cost: '$0.03' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (128K context, $0.01/1K tokens)', context: '128K', cost: '$0.01' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (16K context, $0.001/1K tokens)', context: '16K', cost: '$0.001' },
    { value: 'gpt-4o', label: 'GPT-4o (128K context, $0.005/1K tokens)', context: '128K', cost: '$0.005' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (128K context, $0.0001/1K tokens)', context: '128K', cost: '$0.0001' }
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (200K context, $15/1M tokens)', context: '200K', cost: '$15' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (200K context, $3/1M tokens)', context: '200K', cost: '$3' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (200K context, $0.25/1M tokens)', context: '200K', cost: '$0.25' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (200K context, $3/1M tokens)', context: '200K', cost: '$3' }
  ],
  openrouter: [
    { value: 'openai/gpt-4', label: 'GPT-4 (via OpenRouter)', context: '8K', cost: 'Variable' },
    { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo (via OpenRouter)', context: '128K', cost: 'Variable' },
    { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus (via OpenRouter)', context: '200K', cost: 'Variable' },
    { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet (via OpenRouter)', context: '200K', cost: 'Variable' },
    { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B Chat', context: '4K', cost: 'Variable' },
    { value: 'mistralai/mistral-large', label: 'Mistral Large', context: '32K', cost: 'Variable' }
  ],
  huggingface: [
    { value: 'meta-llama/Llama-2-70b-chat-hf', label: 'Llama 2 70B Chat', context: '4K', cost: 'Free' },
    { value: 'microsoft/DialoGPT-large', label: 'DialoGPT Large', context: '1K', cost: 'Free' },
    { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct', context: '32K', cost: 'Free' },
    { value: 'google/flan-t5-xxl', label: 'FLAN-T5 XXL', context: '2K', cost: 'Free' }
  ],
  perplexity: [
    { value: 'sonar-pro', label: 'Sonar Pro (Advanced search, 200K context)', context: '200K', cost: 'Variable' },
    { value: 'sonar', label: 'Sonar (Lightweight search, 128K context)', context: '128K', cost: 'Variable' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research (Comprehensive reports, 128K context)', context: '128K', cost: 'Variable' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (Chain of Thought, 128K context)', context: '128K', cost: 'Variable' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning (Fast reasoning, 128K context)', context: '128K', cost: 'Variable' },
    { value: 'r1-1776', label: 'R1-1776 (Offline chat model, 128K context)', context: '128K', cost: 'Variable' }
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro (32K context, Free tier)', context: '32K', cost: 'Free' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision (16K context, Free tier)', context: '16K', cost: 'Free' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (1M context, $7/1M tokens)', context: '1M', cost: '$7' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (1M context, $0.35/1M tokens)', context: '1M', cost: '$0.35' }
  ]
};

// Framework compatibility with LLMs
export const FRAMEWORK_LLM_COMPATIBILITY = {
  crewai: ['openai', 'anthropic', 'openrouter', 'gemini', 'perplexity'],
  langchain: ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity'],
  autogen: ['openai', 'anthropic', 'openrouter', 'perplexity'],
  llamaindex: ['openai', 'anthropic', 'openrouter', 'huggingface', 'perplexity'],
  huggingface: [] // Uses models directly, no external LLM needed
};

// Framework-specific field requirements
export const FRAMEWORK_REQUIREMENTS = {
  crewai: {
    agent: {
      required: ['role', 'goal', 'backstory'],
      optional: ['allowDelegation', 'verbose', 'maxIterations']
    },
    task: {
      required: ['description', 'expectedOutput'],
      optional: ['context', 'outputFile']
    }
  },
  langchain: {
    agent: {
      required: ['systemMessage', 'chainType'],
      optional: ['tools', 'memoryType', 'outputParser']
    },
    task: {
      required: ['prompt'],
      optional: ['inputVariables', 'examples']
    }
  },
  autogen: {
    agent: {
      required: ['systemMessage', 'agentType'],
      optional: ['humanInputMode', 'maxConsecutiveAutoReply', 'codeExecution']
    },
    task: {
      required: ['message'],
      optional: ['maxRounds', 'summary']
    }
  },
  llamaindex: {
    agent: {
      required: ['indexType', 'documentsSource'],
      optional: ['chunkSize', 'chunkOverlap', 'embeddingModel']
    },
    task: {
      required: ['query', 'queryMode'],
      optional: ['similarityTopK', 'responseMode']
    }
  },
  huggingface: {
    agent: {
      required: ['modelName', 'taskType'],
      optional: ['maxLength', 'temperature', 'doSample']
    },
    task: {
      required: ['input'],
      optional: ['context', 'question']
    }
  }
};

// Framework options for different tool types
export const FRAMEWORK_OPTIONS = {
  API: [
    { value: 'api', label: 'Generic API', description: 'Standard REST API calls' },
    { value: 'openai', label: 'OpenAI API', description: 'OpenAI API integration' },
    { value: 'anthropic', label: 'Anthropic API', description: 'Claude API integration' },
    { value: 'langchain', label: 'LangChain Agents', description: 'AI agents with tools and memory' },
    { value: 'webhook', label: 'Webhook', description: 'HTTP webhook calls' },
    { value: 'custom', label: 'Custom Integration', description: 'Custom tool implementation' },
    { value: 'universal_api', label: 'Universal API', description: 'AI-powered API integration' }
  ]
};

// Tool type definitions
export const ToolType = {
  LLM: 'llm',
  API: 'api',
  WEBHOOK: 'webhook',
  CUSTOM: 'custom'
};

function normalizeAgentData(rawData) {
  // Defensive copy
  const data = { ...rawData };

  // Normalize LLM config
  let llmConfig = data.llmConfig || data.llm || null;
  if (!llmConfig) {
    // Try to build from flat fields
    if (data.llmProvider && data.llmModel) {
      llmConfig = {
        provider: data.llmProvider,
        model: data.llmModel,
        temperature: data.temperature ?? 0.7,
        max_tokens: data.max_tokens ?? 4000,
      };
    }
  }
  // If still not found, try frameworkConfig
  if (!llmConfig && data.frameworkConfig) {
    llmConfig = {
      provider: data.frameworkConfig.provider,
      model: data.frameworkConfig.model,
      temperature: data.frameworkConfig.temperature ?? 0.7,
      max_tokens: data.frameworkConfig.max_tokens ?? 4000,
    };
  }

  // Normalize framework
  let framework = data.framework || (data.frameworkConfig && data.frameworkConfig.framework) || null;

  // Return normalized data
  return {
    ...data,
    llmConfig,
    framework,
    // Optionally, remove legacy fields to avoid confusion:
    // llm: undefined, llmProvider: undefined, llmModel: undefined, frameworkConfig: undefined,
  };
}

function normalizeTaskData(rawData) {
  const data = { ...rawData };
  // Always provide a default llmConfig object
  let llmConfig = data.llmConfig || data.llm || {};
  if (!llmConfig.provider && data.llmProvider) llmConfig.provider = data.llmProvider;
  if (!llmConfig.model && data.llmModel) llmConfig.model = data.llmModel;
  llmConfig.temperature = llmConfig.temperature ?? data.temperature ?? 0.7;
  llmConfig.max_tokens = llmConfig.max_tokens ?? data.max_tokens ?? 4000;
  llmConfig.framework = llmConfig.framework ?? data.framework ?? 'openai';

  // Ensure all required fields are present
  llmConfig = {
    provider: llmConfig.provider || '',
    model: llmConfig.model || '',
    temperature: llmConfig.temperature,
    max_tokens: llmConfig.max_tokens,
    framework: llmConfig.framework,
  };

  return {
    ...data,
    llmConfig,
    description: data.description || '',
    expected_output: data.expected_output || data.expectedOutput || '',
    agent_ref: data.agent_ref || data.agentRef || '',
  };
}

function normalizeToolData(rawData) {
  const data = { ...rawData };
  
  // Normalize tool type field (backend uses tool_type)
  const toolType = data.tool_type || data.toolType || 'api';
  
  // Normalize config mode and AI prompt
  const configMode = data.config_mode || data.configMode || 'schema';
  const aiPrompt = data.ai_prompt || data.aiPrompt || '';
  
  // Normalize LLM config for LLM tools
  let llmConfig = data.llmConfig || data.llm || null;
  if (!llmConfig && data.llmProvider && data.llmModel) {
    llmConfig = {
      provider: data.llmProvider,
      model: data.llmModel,
      temperature: data.temperature ?? 0.7,
      max_tokens: data.max_tokens ?? 4000,
    };
  }
  
  // Normalize config object
  const config = data.config || {};
  
  // Normalize parameters (backend expects top-level parameters)
  const parameters = data.parameters || {};
  
  // Normalize advanced options
  const retryCount = data.retry_count || data.retryCount || 3;
  const timeout = data.timeout || 30;
  const isAsync = data.is_async || data.isAsync || false;
  
  return {
    ...data,
    tool_type: toolType,
    framework: data.framework || 'api',
    config: config,
    config_mode: configMode,
    ai_prompt: aiPrompt,
    parameters: parameters,
    retry_count: retryCount,
    timeout: timeout,
    is_async: isAsync,
    llmConfig: llmConfig,
  };
}

function normalizeOutputData(rawData) {
  const data = { ...rawData };
  // Normalize LLM config for smart outputs
  let llmConfig = data.llmConfig || data.llm || null;
  if (!llmConfig && data.llmProvider && data.llmModel) {
    llmConfig = {
      provider: data.llmProvider,
      model: data.llmModel,
      temperature: data.temperature ?? 0.7,
      max_tokens: data.max_tokens ?? 4000,
    };
  }
  return {
    ...data,
    llmConfig,
    output_type: data.output_type || data.outputType || 'text',
    config: data.config || {},
  };
}

const EnhancedEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  nodeData, 
  nodeType, 
  availableDependencies = [], 
  connectedNodes = [],
  workflowNodes = []
}) => {
  // Enhanced form data structure with separated LLM and framework configs
  const [formData, setFormData] = useState({
    // Basic node info
    label: '',
    description: '',
    
    // Framework configuration
    framework: '',
    
    // LLM configuration (separated)
    llm: {
      provider: '',
      model: '',
      temperature: 0.7,
      max_tokens: 1000,
      api_key: '',
      base_url: ''
    },
    
    // Framework-specific fields
    frameworkConfig: {},
    
    // Legacy fields for backward compatibility
    role: '',
    goal: '',
    backstory: '',
    systemMessage: '',
    chainType: '',
    agentType: '',
    modelName: '',
    taskType: '',
    indexType: '',
    documentsSource: '',
    queryMode: ''
  });

  const [isModified, setIsModified] = useState(false);
  const [error, setError] = useState(null);
  const [availableLLMs, setAvailableLLMs] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [frameworkMetadata, setFrameworkMetadata] = useState({});
  const [nodeErrors, setNodeErrors] = useState([]);

  // NEW: Add missing state for ToolEditor
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [savedTestInputs, setSavedTestInputs] = useState([]);

  const currentNodeType = nodeType || 'agent';

  // Load framework metadata when framework changes
  useEffect(() => {
    if (formData.framework) {
      loadFrameworkMetadata(formData.framework);
      updateAvailableLLMs(formData.framework);
    }
  }, [formData.framework]);

  // Load available models when LLM provider changes
  useEffect(() => {
    const provider = formData.llm?.provider || formData.llmProvider;
    if (provider) {
      updateAvailableModels(provider);
    }
  }, [formData.llm?.provider, formData.llmProvider]);

  // Populate form data when nodeData changes
  useEffect(() => {
    if (nodeData) {
      console.log("Setting enhanced form data:", nodeData);
      
      // Handle both old and new data structures
      const migratedData = migrateNodeData(nodeData);
      
      let normalizedData = migratedData;
      if (currentNodeType === 'agent') {
        normalizedData = normalizeAgentData(migratedData);
      }
      
      setFormData(normalizedData);
      setIsModified(false);
    }
  }, [nodeData]);

  const loadFrameworkMetadata = async (framework) => {
    try {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/frameworks/metadata/${framework}`);
      // const metadata = await response.json();
      
      // For now, use static data
      const metadata = FRAMEWORK_REQUIREMENTS[framework] || {};
      setFrameworkMetadata(metadata);
    } catch (error) {
      console.error('Failed to load framework metadata:', error);
    }
  };

  const updateAvailableLLMs = (framework) => {
    const compatibleLLMs = FRAMEWORK_LLM_COMPATIBILITY[framework] || [];
    const filteredLLMs = AVAILABLE_LLM_PROVIDERS.filter(llm => 
      compatibleLLMs.includes(llm.value)
    );
    setAvailableLLMs(filteredLLMs);
    
    // Reset LLM selection if current one is not compatible
    const currentProvider = formData.llm?.provider || formData.llmProvider;
    if (currentProvider && !compatibleLLMs.includes(currentProvider)) {
      setFormData(prev => ({
        ...prev,
        llm: {
          ...prev.llm,
          provider: '',
          model: ''
        },
        llmProvider: '', // Also reset the top-level field
        llmModel: ''     // Also reset the top-level field
      }));
    }
  };

  const updateAvailableModels = (provider) => {
    const models = LLM_MODELS[provider] || [];
    setAvailableModels(models);
    
    // Auto-select first model if none selected
    const currentModel = formData.llm?.model || formData.llmModel;
    if (!currentModel && models.length > 0) {
      setFormData(prev => ({
        ...prev,
        llm: {
          ...prev.llm,
          model: models[0].value
        },
        llmModel: models[0].value // Also set the top-level field
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('llm.')) {
      const llmField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        llm: {
          ...prev.llm,
          [llmField]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.startsWith('frameworkConfig.')) {
      const configField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        frameworkConfig: {
          ...prev.frameworkConfig,
          [configField]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name === 'llmProvider') {
      // Map llmProvider to llm.provider AND frameworkConfig.provider
      const newProvider = type === 'checkbox' ? checked : value;
      
      // CRITICAL FIX: Auto-select first available model when provider changes
      const availableModels = LLM_MODELS[newProvider] || [];
      const newModel = availableModels.length > 0 ? availableModels[0].value : '';
      
      console.log(`🔍 Provider changed to: ${newProvider}, auto-selecting model: ${newModel}`);
      
      setFormData(prev => {
        const newData = {
          ...prev,
          llm: {
            ...prev.llm,
            provider: newProvider,
            model: newModel  // Auto-update model when provider changes
          },
          frameworkConfig: {
            ...prev.frameworkConfig,
            provider: newProvider,
            model: newModel  // Also update framework config
          },
          llmProvider: newProvider, // Keep for backward compatibility
          llmModel: newModel // Update legacy field too
        };
        console.log(`🔍 New frameworkConfig.provider: ${newData.frameworkConfig.provider}`);
        console.log(`🔍 New frameworkConfig.model: ${newData.frameworkConfig.model}`);
        return newData;
      });
    } else if (name === 'llmModel') {
      // 🚀 FIXED: Single setFormData call for llmModel
      setFormData(prev => ({
        ...prev,
        llm: {
          ...prev.llm,
          model: type === 'checkbox' ? checked : value
        },
        frameworkConfig: {
          ...prev.frameworkConfig,
          model: type === 'checkbox' ? checked : value
        },
        llmModel: type === 'checkbox' ? checked : value // Keep for backward compatibility
      }));
    } else {
      // 🚀 FIXED: Handle all other inputs properly
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    setIsModified(true);
  };

  const handleFrameworkChange = (e) => {
    const framework = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      framework,
      frameworkConfig: {}, // Reset framework config
      llm: {
        ...prev.llm,
        provider: '', // Reset LLM provider
        model: ''     // Reset model
      }
    }));
    
    setIsModified(true);
  };

  const validateConfiguration = () => {
    const errors = [];
    
    // Basic validation
    if (!formData.label) {
      errors.push('Label is required');
    }
    
    // Framework validation (only for nodes that need their own framework)
    const nodesThatRequireFramework = ['agent', 'tool'];
    if (nodesThatRequireFramework.includes(currentNodeType) && !formData.framework) {
      errors.push('Framework is required');
    }
    
    // Output-specific validation
    if (currentNodeType === 'output') {
      if (!formData.outputType) {
        errors.push('Output type is required');
      }
      
      // Validate output-specific fields
      if (formData.outputType === 'webhook' && !formData.webhookUrl) {
        errors.push('Webhook URL is required');
      }
      if (formData.outputType === 'email' && !formData.email) {
        errors.push('Email address is required');
      }
      if (formData.outputType === 'discord' && !formData.webhookUrl) {
        errors.push('Discord webhook URL is required');
      }
      if (formData.outputType === 'sheets' && !formData.sheetId) {
        errors.push('Sheet ID is required');
      }
      if ((formData.outputType === 'smart_api' || formData.outputType === 'smart_email') && !formData.ai_description) {
        errors.push('AI description is required for smart outputs');
      }
    }
    
    // Framework-specific validation (only for nodes that have their own framework)
    if (nodesThatRequireFramework.includes(currentNodeType)) {
      const requirements = FRAMEWORK_REQUIREMENTS[formData.framework];
      if (requirements && requirements[currentNodeType]) {
        const required = requirements[currentNodeType].required || [];
        
        for (const field of required) {
          if (!formData[field] && !formData.frameworkConfig[field]) {
            errors.push(`${field} is required for ${formData.framework}`);
          }
        }
      }
      
      // LLM validation (if framework requires LLM)
      const compatibleLLMs = FRAMEWORK_LLM_COMPATIBILITY[formData.framework];
      if (compatibleLLMs && compatibleLLMs.length > 0) {
        // Check for LLM provider in multiple possible locations
        const llmProvider = formData.llm?.provider || formData.llmProvider;
        const llmModel = formData.llm?.model || formData.llmModel;
        
        if (!llmProvider) {
          errors.push('LLM provider is required');
        }
        if (!llmModel) {
          errors.push('LLM model is required');
        }
      }
    }
    
    return errors;
  };

  const handleSave = async () => {
    setError(null);
    
    const validationErrors = validateConfiguration();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    try {
      // Prepare clean data for saving
      let cleanedData = {
        ...formData,
        // Ensure framework config is cleaned
        frameworkConfig: Object.fromEntries(
          Object.entries(formData.frameworkConfig || {})
            .filter(([_, value]) => value !== '' && value !== undefined)
        ),
        // Consolidate LLM config from multiple possible sources
        llm: {
          provider: formData.llm?.provider || formData.llmProvider || '',
          model: formData.llm?.model || formData.llmModel || '',
          temperature: formData.llm?.temperature || formData.temperature || 0.7,
          max_tokens: formData.llm?.max_tokens || formData.max_tokens || 1000,
          api_key: formData.llm?.api_key || formData.apiKey || '',
          base_url: formData.llm?.base_url || formData.baseUrl || ''
        }
      };
      
      // Clean empty values from LLM config
      cleanedData.llm = Object.fromEntries(
        Object.entries(cleanedData.llm)
          .filter(([_, value]) => value !== '' && value !== undefined)
      );
      
      // Ensure LlamaIndex provider is set from BYOK if agent and llamaindex
      if (currentNodeType === 'agent' && cleanedData.framework === 'llamaindex') {
        cleanedData.frameworkConfig = {
          ...cleanedData.frameworkConfig,
          provider: cleanedData.llm.provider
        };
      }
      
      // Special handling for tool nodes
      if (currentNodeType === 'tool') {
        // Ensure tool_type is set (map from toolType if needed)
        if (!cleanedData.tool_type && cleanedData.toolType) {
          cleanedData.tool_type = cleanedData.toolType;
        }
        
        // Parse parameters from string to object if needed
        if (cleanedData.parameters && typeof cleanedData.parameters === 'string') {
          try {
            cleanedData.parameters = JSON.parse(cleanedData.parameters);
          } catch (e) {
            // If JSON parsing fails, try to parse as key-value pairs
            const lines = cleanedData.parameters.split('\n').filter(line => line.trim());
            const paramObj = {};
            
            lines.forEach(line => {
              const [key, ...valueParts] = line.split(':');
              if (key && valueParts.length > 0) {
                const value = valueParts.join(':').trim();
                // Try to parse as number if possible
                if (!isNaN(value) && value !== '') {
                  paramObj[key.trim()] = Number(value);
                } else {
                  paramObj[key.trim()] = value;
                }
              } else if (key && key.trim()) {
                // If no colon, treat as a boolean flag or string
                paramObj[key.trim()] = true;
              }
            });
            
            cleanedData.parameters = paramObj;
          }
        }
        
        // Ensure parameters is an object
        if (!cleanedData.parameters || typeof cleanedData.parameters !== 'object') {
          cleanedData.parameters = {};
        }
        
        // Set default framework if not set
        if (!cleanedData.framework) {
          if (cleanedData.toolType === 'api' || cleanedData.tool_type === 'api') {
            cleanedData.framework = 'api';
          } else if (cleanedData.toolType === 'webhook' || cleanedData.tool_type === 'webhook') {
            cleanedData.framework = 'webhook';
          } else if (cleanedData.toolType === 'custom' || cleanedData.tool_type === 'custom') {
            cleanedData.framework = 'custom';
          } else if (cleanedData.toolType === 'universal_api' || cleanedData.tool_type === 'universal_api') {
            cleanedData.framework = 'universal_api';
          } else {
            cleanedData.framework = 'api'; // default
          }
        }
      }
      
      console.log('Saving enhanced node with data:', cleanedData);
      
      await onSave(cleanedData);
      setIsModified(false);
      onClose();
    } catch (error) {
      console.error('Error saving node:', error);
      setError('Failed to save node. Please try again.');
    }
  };

  // Migration function to handle old node data formats
  const migrateNodeData = (data) => {
    // First, handle legacy field mappings
    let migrated = { ...data };
    
    if (migrated.name && !migrated.label) {
      migrated.label = migrated.name;
    }
    
    // Then apply the enhanced data structure with standardized field names
    const cleanData = {
      label: migrated.label || '',
      description: migrated.description || '',
      framework: migrated.framework || '',
      
      // Enhanced LLM configuration with standardized field names
      llm_model: migrated.llm_model || migrated.llm?.model || migrated.llmModel || migrated.model || '',
      temperature: migrated.temperature || migrated.llm?.temperature || 0.7,
      max_tokens: migrated.max_tokens || migrated.llm?.max_tokens || 1000,
      
      // Framework-specific configuration
      framework_config: migrated.framework_config || migrated.frameworkConfig || {},
      
      // Standardized field names for backward compatibility
      role: migrated.role || '',
      goal: migrated.goal || '',
      backstory: migrated.backstory || '',
      system_prompt: migrated.system_prompt || migrated.systemMessage || '',
      expected_output: migrated.expected_output || migrated.expectedOutput || '',
      agent_ref: migrated.agent_ref || migrated.agentRef || '',
      tool_type: migrated.tool_type || migrated.toolType || '',
      trigger_type: migrated.trigger_type || migrated.triggerType || '',
      output_type: migrated.output_type || migrated.outputType || '',
      input_type: migrated.input_type || migrated.inputType || '',
      duration: migrated.duration || '',
      
      // Copy all other fields
      ...migrated
    };
    
    // Handle tool node migration
    if (currentNodeType === 'tool') {
      // Ensure tool_type is set (standardized)
      if (!cleanData.tool_type) {
        cleanData.tool_type = 'api'; // default
      }
      
      // Ensure framework is set
      if (!cleanData.framework) {
        cleanData.framework = cleanData.tool_type || 'api';
      }
      
      // Ensure parameters is an object
      if (!cleanData.parameters) {
        cleanData.parameters = {};
      } else if (typeof cleanData.parameters === 'string') {
        try {
          cleanData.parameters = JSON.parse(cleanData.parameters);
        } catch (e) {
          // Convert string to object
          const lines = cleanData.parameters.split('\n').filter(line => line.trim());
          const paramObj = {};
          lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              paramObj[key.trim()] = valueParts.join(':').trim();
            } else if (key && key.trim()) {
              paramObj[key.trim()] = true;
            }
          });
          cleanData.parameters = paramObj;
        }
      }
      
      // Ensure framework_config exists (standardized)
      if (!cleanData.framework_config) {
        cleanData.framework_config = {};
      }
    }
    
    return cleanData;
  };

  // NEW: Add saveTestInput function
  const saveTestInput = () => {
    if (!testInput.trim()) return;
    
    const inputName = prompt('Enter a name for this test input:');
    if (!inputName) return;
    
    const newTestInput = {
      name: inputName,
      input: testInput,
      timestamp: Date.now()
    };
    
    setSavedTestInputs(prev => [...prev, newTestInput]);
  };

  if (!isOpen) return null;

  const renderNodeEditor = () => {
    const editorProps = {
      formData,
      setFormData,
      handleInputChange,
      handleFrameworkChange,
      availableLLMs,
      availableModels,
      frameworkMetadata,
      connectedNodes
    };

    // Test-related props for editors that support testing
    const testEditorProps = {
      ...editorProps,
      testInput,
      setTestInput,
      testResult,
      setTestResult,
      savedTestInputs,
      saveTestInput
    };

    switch (currentNodeType) {
      case 'agent':
        return <AgentEditor {...editorProps} />;
      case 'task':
        return <TaskEditor 
          {...editorProps} 
          node={nodeData} 
          availableDependencies={availableDependencies} 
          onClose={onClose} 
          onSave={handleSave} 
        />;
      case 'tool':
        return <ToolEditor {...testEditorProps} />;
      case 'chat':  // This case is already added
        return <ChatbotEditor {...editorProps} onSave={handleSave} onClose={onClose} />;
      case 'chatbot':
        return <ChatbotEditor {...editorProps} onSave={handleSave} onClose={onClose} />;
      case 'delay':
        return <DelayEditor {...editorProps} onSave={handleSave} onClose={onClose} />;
      case 'trigger':
        return <TriggerEditor {...editorProps} onSave={handleSave} onClose={onClose} />;
      case 'logic':
        return (
          <LogicEditor
            {...editorProps}
            onSave={handleSave}
            onClose={onClose}
          />
        );
      case 'input':
        return <InputEditor {...editorProps} onSave={handleSave} onClose={onClose} />;
      case 'output':
        return <OutputEditor
          formData={formData}
          handleInputChange={handleInputChange}
          onSave={handleSave}
          onClose={onClose}
        />;
        
      default:
        return <div>Unknown node type: {currentNodeType}</div>;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (isModified) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
              onClose();
            }
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="bg-white p-6 rounded-lg w-[700px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <h2 className="text-xl font-bold mb-4 flex items-center">
          Edit {currentNodeType.charAt(0).toUpperCase() + currentNodeType.slice(1)}
          <HelpTooltip type={currentNodeType} />
        </h2>

        {/* Display Node Errors */}
        <NodeErrorDisplay 
          nodeId={nodeData?.id}
          errors={nodeErrors}
          onClose={() => setNodeErrors([])}
        />

        {/* Common fields */}
        <CommonFields formData={formData} handleInputChange={handleInputChange} nodeType={currentNodeType} />
        
        {/* Node-specific editor */}
        {renderNodeEditor()}
        
        {/* Modal Buttons */}
        <ModalFooter 
          isModified={isModified} 
          onClose={onClose} 
          onSave={handleSave} 
        />
      </div>
    </div>
  );
};

EnhancedEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  nodeData: PropTypes.object,
  nodeType: PropTypes.string,
  availableDependencies: PropTypes.array,
  connectedNodes: PropTypes.array,
  workflowNodes: PropTypes.array
};

export default EnhancedEditModal;

export { normalizeAgentData, normalizeTaskData, normalizeToolData, normalizeOutputData };