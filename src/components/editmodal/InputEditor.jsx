import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import MultimodalFileUpload from '../MultimodalFileUpload';
import LLMConfigSection from './shared/LLMConfigSection';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import { inputNodeSchema } from './shared/nodeSchemas';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';

const InputEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  const [localFormData, setLocalFormData] = useState(formData || {});
  const [apiKeys, setApiKeys] = useState({});
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(null);

  // State for schema-driven core input config
  const [inputCoreConfig, setInputCoreConfig] = useState({
    label: formData.label || '',
    description: formData.description || '',
    input_type: formData.input_type || formData.inputType || 'text',
    default_value: formData.default_value || formData.defaultValue || '',
    required: formData.required || false
  });
  const [validationErrors, setValidationErrors] = useState(false);

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});

  // Keep fieldMappings in sync with formData
  useEffect(() => {
    setFieldMappings(formData.field_mappings || {});
  }, [formData.field_mappings]);

  // Handler for field mapping changes
  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
    handleInputChange({ target: { name: 'field_mappings', value: newMappings } });
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const response = await fetch('/api/user/keys');
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys);
      } else {
        setApiKeyError(data.error || 'Failed to load API keys');
      }
    } catch (error) {
      setApiKeyError('Error loading API keys');
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const handleFileProcessed = (fileData) => {
    setLocalFormData(prev => ({
      ...prev,
      input: {
        ...prev.input,
        fileData
      }
    }));
  };

  const handleLLMConfigChange = (newConfig) => {
    setLocalFormData(prev => ({
      ...prev,
      llmConfig: newConfig
    }));
  };

  // Handler for schema form changes
  const handleCoreConfigChange = (newConfig) => {
    setInputCoreConfig(newConfig);
  };

  // Handler for schema validation
  const handleValidationError = (hasErrors) => {
    setValidationErrors(hasErrors);
  };

  // Handler for save
  const handleSave = () => {
    if (validationErrors) {
      alert('Please fix validation errors before saving.');
      return;
    }
    onSave({
      ...formData,
      ...inputCoreConfig
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Input Configuration</h3>
        <DynamicSchemaForm
          schema={inputNodeSchema}
          nodeType="input"
          formData={inputCoreConfig}
          handleInputChange={handleCoreConfigChange}
          onValidationError={handleValidationError}
        />
        {/* Field Mapper for explicit mapping */}
        <FieldMapper
          nodeId={nodeId || formData.id || formData.nodeId || ''}
          nodeType="input"
          currentMappings={fieldMappings}
          onMappingChange={handleFieldMappingChange}
          connectedNodes={connectedNodes}
          previousNodeOutputs={previousNodeOutputs}
        />
        {/* Optionally show output preview for mapped fields */}
        {previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0 && (
          <NodeOutputPreview
            nodeId={nodeId || formData.id || formData.nodeId || ''}
            nodeType="input"
            output={previousNodeOutputs}
            isVisible={false}
          />
        )}
        <MultimodalFileUpload
          onFileProcessed={handleFileProcessed}
          onError={(error) => console.error(error)}
          acceptedTypes="image/*,audio/*,.pdf,.docx,.txt,.md,.csv,.xlsx,.json,.zip"
          maxSizeMB={25}
          multiple={false}
        />
        <LLMConfigSection
          formData={localFormData.llmConfig || {}}
          handleInputChange={handleLLMConfigChange}
          showApiKey={true}
          framework="openai"
        />
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

InputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default InputEditor;