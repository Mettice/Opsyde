import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { apiClient } from '../../../api/client';

/**
 * DynamicSchemaForm
 * Renders a form dynamically from a provided input_schema object.
 * Supports string, number, boolean, object, and array types.
 */

// Shared LLM provider -> model mapping (can be imported from EditModall if desired)
const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
  ],
  anthropic: [
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
  ],
  openrouter: [
    { value: 'openai/gpt-4', label: 'GPT-4 (via OpenRouter)' },
    { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo (via OpenRouter)' },
    { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus (via OpenRouter)' },
    { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet (via OpenRouter)' },
    { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B Chat' },
    { value: 'mistralai/mistral-large', label: 'Mistral Large' }
  ],
  huggingface: [
    { value: 'meta-llama/Llama-2-70b-chat-hf', label: 'Llama 2 70B Chat' },
    { value: 'microsoft/DialoGPT-large', label: 'DialoGPT Large' },
    { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct' },
    { value: 'google/flan-t5-xxl', label: 'FLAN-T5 XXL' }
  ],
  perplexity: [
    { value: 'sonar-pro', label: 'Sonar Pro' },
    { value: 'sonar', label: 'Sonar' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning' },
    { value: 'r1-1776', label: 'R1-1776' }
  ],
  gemini: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
  ]
};

const DynamicSchemaForm = ({ 
  nodeType,
  schema: providedSchema,
  formData, 
  handleInputChange,
  onValidationError 
}) => {
  const [schema, setSchema] = useState(providedSchema || null);
  const [validationErrors, setValidationErrors] = useState({});
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Load BYOK API keys
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.api_keys) {
            setAvailableApiKeys(result.data.api_keys.filter(key => key.validation_status === 'valid'));
          }
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // Enhanced schema fetching with runner type support
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoadingSchema(true);
        let endpoint = `/api/nodes/schema/${nodeType}`;
        
        // If it's a runner type, use the runners endpoint
        if (nodeType && ['crewai', 'langchain', 'huggingface', 'autogen', 'llamaindex'].includes(nodeType)) {
          endpoint = `/api/nodes/schema/runners/${nodeType}`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to fetch schema:', errorData);
          if (onValidationError) {
            onValidationError([{ message: `Failed to fetch schema: ${errorData.message}` }]);
          }
          return;
        }

        const schemaData = await response.json();
        const schemaToUse = schemaData.data || schemaData;
        
        // Handle both flat schema and nested schema with .fields
        setSchema(schemaToUse.fields || schemaToUse);
      } catch (error) {
        console.error('Error fetching schema:', error);
        if (onValidationError) {
          onValidationError([{ message: `Error fetching schema: ${error.message}` }]);
        }
      } finally {
        setLoadingSchema(false);
      }
    };

    // Only fetch if nodeType is provided and no schema
    if (nodeType && !providedSchema) {
      fetchSchema();
    } else if (providedSchema) {
      // Handle both flat schema and nested schema with .fields
      const schemaToUse = providedSchema.fields || providedSchema;
      setSchema(schemaToUse);
    }
  }, [nodeType, providedSchema, onValidationError]);

  // Validate form data against schema
  const validateFormData = (data) => {
    const errors = {};
    
    if (!schema) return errors;
  
    Object.entries(schema).forEach(([key, field]) => {
      // Required field validation
      if (field.required && !data[key]) {
        errors[key] = 'This field is required';
      }
    
    // Type validation
    if (data[key] && field.type) {
      switch (field.type) {
        case 'string':
          if (typeof data[key] !== 'string') {
            errors[key] = 'Must be a string';
          }
          break;
        case 'number':
          if (typeof data[key] !== 'number') {
            errors[key] = 'Must be a number';
          }
          break;
        case 'boolean':
          if (typeof data[key] !== 'boolean') {
            errors[key] = 'Must be a boolean';
          }
          break;
        case 'array':
          if (!Array.isArray(data[key])) {
            errors[key] = 'Must be an array';
          }
          break;
        case 'object':
          if (typeof data[key] !== 'object') {
            errors[key] = 'Must be an object';
          }
          break;
      }
    }
  
    // Custom validation
    if (field.validate && data[key]) {
      const customError = field.validate(data[key]);
      if (customError) {
        errors[key] = customError;
      }
    }
  });

  setValidationErrors(errors);
  if (onValidationError) {
    onValidationError(Object.keys(errors).length > 0);
  }
  return errors;
};

// Handle input changes with validation
const handleChange = (key, value) => {
  const newData = { ...formData, [key]: value };
  handleInputChange(newData);
  validateFormData(newData);
};

// Render form fields based on schema
// Add this helper function to render nested objects
const renderObjectField = (key, field, value, handleChange, error) => {
  if (key === 'llmConfig' && field.properties) {
    return (
      <div key={key} className="form-field border p-4 rounded">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {field.description || key}
        </label>
        <div className="space-y-3">
          {Object.entries(field.properties).map(([propKey, propField]) => {
            const propValue = value?.[propKey];
            return (
              <div key={propKey} className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">
                  {propField.description || propKey}
                </label>
                {propKey === 'framework' ? (
                  <select
                    value={propValue || ''}
                    onChange={(e) => {
                      const newValue = { ...value, [propKey]: e.target.value };
                      handleChange(key, newValue);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Select Framework</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="huggingface">HuggingFace</option>
                  </select>
                ) : propKey === 'model' ? (
                  <select
                    value={propValue || ''}
                    onChange={(e) => {
                      const newValue = { ...value, [propKey]: e.target.value };
                      handleChange(key, newValue);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Select Model</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                ) : (
                  <input
                    type={propField.type === 'integer' ? 'number' : 'text'}
                    value={propValue || ''}
                    onChange={(e) => {
                      const newValue = { ...value, [propKey]: e.target.value };
                      handleChange(key, newValue);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                    step={propField.type === 'float' ? '0.1' : '1'}
                  />
                )}
              </div>
            );
          })}
        </div>
        {error && <span className="error-message text-red-500 text-xs">{error}</span>}
      </div>
    );
  }
  
  // Fallback for other objects
  return (
    <div key={key} className="form-field">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.description || key}
      </label>
      <textarea
        value={JSON.stringify(value || {}, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            handleChange(key, parsed);
          } catch (err) {
            // Invalid JSON, don't update
          }
        }}
        className="border rounded px-2 py-1 w-full h-20 text-xs font-mono"
        placeholder="{}"
      />
      {error && <span className="error-message text-red-500 text-xs">{error}</span>}
    </div>
  );
};

// Update the renderField function
const renderField = (key, field) => {
  // Add null check
  if (!field || typeof field !== 'object') {
    console.warn(`Invalid field definition for key: ${key}`, field);
    return null;
  }
  
  const value = formData[key];
  const error = validationErrors[key];

  switch (field.type) {
    case 'string':
      return (
        <div key={key} className="form-field mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.description || key}
            {!field.optional && <span className="text-red-500 ml-1">*</span>}
          </label>
          {key === 'prompt' || key === 'description' ? (
            <textarea
              value={value || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`w-full border rounded px-3 py-2 ${error ? 'border-red-500' : 'border-gray-300'}`}
              rows={3}
              placeholder={`Enter ${field.description || key}...`}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`w-full border rounded px-3 py-2 ${error ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={`Enter ${field.description || key}...`}
            />
          )}
          {error && <span className="error-message text-red-500 text-sm">{error}</span>}
        </div>
      );
  
    case 'number':
      return (
        <div key={key} className="form-field mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.description || key}
            {!field.optional && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className={`w-full border rounded px-3 py-2 ${error ? 'border-red-500' : 'border-gray-300'}`}
            step={field.type === 'float' ? '0.1' : '1'}
          />
          {error && <span className="error-message text-red-500 text-sm">{error}</span>}
        </div>
      );
  
    case 'boolean':
      return (
        <div key={key} className="form-field mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleChange(key, e.target.checked)}
              className={`mr-2 ${error ? 'border-red-500' : ''}`}
            />
            <span className="text-sm font-medium text-gray-700">
              {field.description || key}
              {!field.optional && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
          {error && <span className="error-message text-red-500 text-sm">{error}</span>}
        </div>
      );
  
    case 'object':
      return renderObjectField(key, field, value, handleChange, error);
  
    case 'array':
      return (
        <div key={key} className="form-field mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.description || key}
            {!field.optional && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={Array.isArray(value) ? value.join('\n') : ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').filter(line => line.trim());
              handleChange(key, lines);
            }}
            className={`w-full border rounded px-3 py-2 ${error ? 'border-red-500' : 'border-gray-300'}`}
            rows={3}
            placeholder="Enter one item per line..."
          />
          {error && <span className="error-message text-red-500 text-sm">{error}</span>}
        </div>
      );
  
    default:
      return null;
  }
};

if (loadingSchema) {
  return <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading schema...</span>
  </div>;
}

if (!schema) {
  return <div className="text-red-500 p-4">No schema available</div>;
}

return (
  <div className="dynamic-schema-form">
    {Object.entries(schema).map(([key, field]) => renderField(key, field))}
  </div>
);
};

DynamicSchemaForm.propTypes = {
  nodeType: PropTypes.string,        // Make optional
  schema: PropTypes.object,          // Add schema prop
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onValidationError: PropTypes.func
};

export default DynamicSchemaForm;