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
  { value: 'huggingface', label: 'HuggingFace', description: 'Open source models' }
];

// LLM Models mapping
export const LLM_MODELS = {
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

// Framework compatibility with LLMs
export const FRAMEWORK_LLM_COMPATIBILITY = {
  crewai: ['openai', 'anthropic', 'openrouter', 'gemini'],
  langchain: ['openai', 'anthropic', 'openrouter', 'huggingface'],
  autogen: ['openai', 'anthropic', 'openrouter'],
  llamaindex: ['openai', 'anthropic', 'openrouter', 'huggingface'],
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
      
      setFormData(migratedData);
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
      // Map llmProvider to llm.provider
      setFormData(prev => ({
        ...prev,
        llm: {
          ...prev.llm,
          provider: type === 'checkbox' ? checked : value
        },
        llmProvider: type === 'checkbox' ? checked : value // Keep for backward compatibility
      }));
    } else if (name === 'llmModel') {
      // Map llmModel to llm.model
      setFormData(prev => ({
        ...prev,
        llm: {
          ...prev.llm,
          model: type === 'checkbox' ? checked : value
        },
        llmModel: type === 'checkbox' ? checked : value // Keep for backward compatibility
      }));
    } else {
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
    
    // Then apply the enhanced data structure
    const cleanData = {
      label: migrated.label || '',
      description: migrated.description || '',
      framework: migrated.framework || '',
      
      // Enhanced LLM configuration
      llm: {
        provider: migrated.llm?.provider || migrated.llmProvider || '',
        model: migrated.llm?.model || migrated.llmModel || migrated.model || '',
        temperature: migrated.llm?.temperature || migrated.temperature || 0.7,
        max_tokens: migrated.llm?.max_tokens || migrated.max_tokens || 1000,
        api_key: migrated.llm?.api_key || migrated.apiKey || '',
        base_url: migrated.llm?.base_url || migrated.baseUrl || ''
      },
      
      // Framework-specific configuration
      frameworkConfig: migrated.frameworkConfig || {},
      
      // Legacy fields for backward compatibility
      role: migrated.role || '',
      goal: migrated.goal || '',
      backstory: migrated.backstory || '',
      systemMessage: migrated.systemMessage || '',
      chainType: migrated.chainType || '',
      agentType: migrated.agentType || '',
      modelName: migrated.modelName || '',
      taskType: migrated.taskType || '',
      indexType: migrated.indexType || '',
      documentsSource: migrated.documentsSource || '',
      queryMode: migrated.queryMode || '',
      
      // Copy all other fields
      ...migrated
    };
    
    // Handle tool node migration
    if (currentNodeType === 'tool') {
      // Ensure tool_type is set
      if (!cleanData.tool_type && !cleanData.toolType) {
        cleanData.toolType = 'api'; // default
        cleanData.tool_type = 'api';
      } else if (cleanData.toolType && !cleanData.tool_type) {
        cleanData.tool_type = cleanData.toolType;
      } else if (cleanData.tool_type && !cleanData.toolType) {
        cleanData.toolType = cleanData.tool_type;
      }
      
      // Ensure framework is set
      if (!cleanData.framework) {
        cleanData.framework = cleanData.tool_type || cleanData.toolType || 'api';
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
      
      // Ensure frameworkConfig exists
      if (!cleanData.frameworkConfig) {
        cleanData.frameworkConfig = {};
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

    // NEW: Add tool-specific props for ToolEditor
    const toolEditorProps = {
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
        return <TaskEditor {...editorProps} availableDependencies={availableDependencies} />;
      case 'tool':
        return <ToolEditor {...toolEditorProps} />;
      case 'chatbot':
        return <ChatbotEditor {...editorProps} />;
      case 'delay':
        return <DelayEditor {...editorProps} />;
      case 'trigger':
        return <TriggerEditor {...editorProps} />;
      case 'logic':
        return <LogicEditor {...editorProps} />;
      case 'input':
        return <InputEditor {...editorProps} />;
      case 'output':
        return <OutputEditor {...editorProps} />;
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