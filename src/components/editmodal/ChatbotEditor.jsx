import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import { chatNodeSchema } from './shared/nodeSchemas';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';
import { Box, Typography } from '@mui/material';

const ChatbotEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // BYOK State Management
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // State for schema-driven core chat config
  const [chatCoreConfig, setChatCoreConfig] = useState({
    label: formData.label || '',
    description: formData.description || '',
    system_prompt: formData.system_prompt || formData.prompt || '',
    llm_model: formData.llm_model || formData.model || 'gpt-4',
    temperature: formData.temperature || 0.7,
    max_tokens: formData.max_tokens || 4000,
    enable_memory: formData.enable_memory || false,
    framework: formData.framework || 'openai',
    framework_config: formData.framework_config || {}
  });

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});

  // Keep fieldMappings in sync with formData
  useEffect(() => {
    setFieldMappings(formData.field_mappings || {});
  }, [formData.field_mappings]);

  // Sync local state with formData when formData changes (fix for re-editing)
  useEffect(() => {
    // Reset local state to match formData
    setValidationErrors(formData.validationErrors || {});
    
    // Sync core config
    setChatCoreConfig({
      label: formData.label || '',
      description: formData.description || '',
      system_prompt: formData.system_prompt || formData.prompt || '',
      llm_model: formData.llm_model || formData.model || 'gpt-4',
      temperature: formData.temperature || 0.7,
      max_tokens: formData.max_tokens || 4000,
      enable_memory: formData.enable_memory || false,
      framework: formData.framework || 'openai',
      framework_config: formData.framework_config || {}
    });
    
    // Sync field mappings
    setFieldMappings(formData.field_mappings || {});
    
    console.log('ChatbotEditor: Synced with form data:', formData);
  }, [formData]);

  // Load API Keys from BYOK Manager
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.api_keys) {
            setAvailableApiKeys(result.data.api_keys.filter(key => key.validation_status === 'valid'));
            console.log('🔑 Loaded API keys:', result.data.api_keys);
          }
        } else {
          throw new Error('Failed to load API keys');
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Failed to load API keys from BYOK Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // Handler for field mapping changes
  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
    handleInputChange({ target: { name: 'field_mappings', value: newMappings } });
  };

  // Handler for schema form changes
  const handleCoreConfigChange = (newConfig) => {
    setChatCoreConfig(newConfig);
  };

  const handleValidationError = (hasErrors) => {
    setValidationErrors(hasErrors);
  };

  // Render BYOK Status Indicator
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            Loading API keys from BYOK Manager...
          </Typography>
        </Box>
      );
    }

    if (apiKeyError) {
      return (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            {apiKeyError}
          </Typography>
        </Box>
      );
    }

    if (availableApiKeys.length === 0) {
      return (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="body2" color="warning.dark">
            No API keys configured. Add API keys in the BYOK Manager to use LLM providers.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="body2" color="success.dark">
          🔑 BYOK Active: {availableApiKeys.length} provider(s) configured
        </Typography>
      </Box>
    );
  };

  // Helper: Get available providers from BYOK
  const getAvailableProviders = () => {
    return availableApiKeys.map(key => key.provider);
  };

  // Helper: Get available models for a provider (static for now)
  const getModelsForProvider = (provider) => {
    const staticModels = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4o'],
      anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      openrouter: ['openai/gpt-4', 'anthropic/claude-3-sonnet'],
      huggingface: ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
      perplexity: ['sonar-medium', 'sonar-small', 'sonar-large', 'sonar-pro'],
      gemini: ['gemini-pro']
    };
    return staticModels[provider] || ['gpt-4'];
  };

  // Handler for provider change
  const handleProviderChange = (e) => {
    const provider = e.target.value;
    const defaultModel = getModelsForProvider(provider)[0];
    setChatCoreConfig(prev => ({
      ...prev,
      framework: provider,
      llm_model: defaultModel,
      framework_config: { ...prev.framework_config, provider, model: defaultModel }
    }));
  };

  // Handler for model change
  const handleModelChange = (e) => {
    const model = e.target.value;
    setChatCoreConfig(prev => ({
      ...prev,
      llm_model: model,
      framework_config: { ...prev.framework_config, model }
    }));
  };

  const handleSave = () => {
    if (validationErrors) {
      alert('Please fix validation errors before saving.');
      return;
    }
    onSave({
      ...formData,
      ...chatCoreConfig
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Chat Configuration</h3>
        {/* BYOK Status */}
        {renderBYOKStatus()}
        {/* Only show the system prompt and BYOK LLM config fields */}
        <div>
          <label className="block text-gray-700 mb-1">System prompt for the chat</label>
          <textarea
            className="w-full p-2 border rounded"
            value={chatCoreConfig.system_prompt}
            onChange={e => setChatCoreConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
            placeholder="Enter System prompt for the chat..."
            rows={4}
          />
        </div>
        {/* LLM Provider Dropdown */}
        <div>
          <label className="block text-gray-700 mb-1">LLM Provider *</label>
          <select
            className="w-full p-2 border rounded"
            value={chatCoreConfig.framework}
            onChange={handleProviderChange}
          >
            {getAvailableProviders().map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>
        {/* LLM Model Dropdown */}
        <div>
          <label className="block text-gray-700 mb-1">LLM Model *</label>
          <select
            className="w-full p-2 border rounded"
            value={chatCoreConfig.llm_model}
            onChange={handleModelChange}
          >
            {getModelsForProvider(chatCoreConfig.framework).map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
        {/* Enable conversation memory */}
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={chatCoreConfig.enable_memory}
            onChange={e => setChatCoreConfig(prev => ({ ...prev, enable_memory: e.target.checked }))}
            id="enable_memory"
            className="mr-2"
          />
          <label htmlFor="enable_memory" className="text-gray-700">Enable conversation memory</label>
        </div>
        {/* Advanced Field Mapper only (no raw textarea) */}
        <FieldMapper
          nodeId={nodeId || formData.id || formData.nodeId || ''}
          nodeType="chat"
          currentMappings={fieldMappings}
          onMappingChange={handleFieldMappingChange}
          connectedNodes={connectedNodes}
          previousNodeOutputs={previousNodeOutputs}
        />
        {/* Optionally show output preview for mapped fields */}
        {previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0 && (
          <NodeOutputPreview
            nodeId={nodeId || formData.id || formData.nodeId || ''}
            nodeType="chat"
            output={previousNodeOutputs}
            isVisible={false}
          />
        )}
      </div>
    </div>
  );
};

ChatbotEditor.propTypes = {
  formData: PropTypes.object,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default ChatbotEditor;