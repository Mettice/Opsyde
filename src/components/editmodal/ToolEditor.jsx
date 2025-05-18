import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';

const ToolEditor = ({ formData, handleInputChange, handleFrameworkChange }) => {
  // Effect to handle tool type changes and reset dependent fields
  useEffect(() => {
    // When tool type changes, reset framework if it's not compatible
    if (formData.toolType && formData.framework) {
      const availableFrameworks = formData.toolType === ToolType.LLM 
        ? FRAMEWORK_OPTIONS.LLM.map(f => f.value)
        : FRAMEWORK_OPTIONS.API.map(f => f.value);
      
      if (!availableFrameworks.includes(formData.framework)) {
        // Reset framework if current one is not compatible with new tool type
        handleInputChange({ target: { name: 'framework', value: '' } });
      }
    }
  }, [formData.toolType, handleInputChange]);

  const handleToolTypeChange = (e) => {
    const newToolType = e.target.value;
    
    // First update the tool type
    handleInputChange(e);
    
    // Then reset framework and framework config
    handleInputChange({ target: { name: 'framework', value: '' } });
    handleInputChange({ target: { name: 'frameworkConfig', value: {} } });
  };

  const handleJsonChange = (fieldName, value) => {
    try {
      const parsedValue = JSON.parse(value);
      handleInputChange({
        target: {
          name: fieldName,
          value: parsedValue
        }
      });
    } catch (error) {
      // For invalid JSON, store as string and let validation handle it
      handleInputChange({
        target: {
          name: fieldName,
          value: value
        }
      });
    }
  };

  return (
    <div className="tool-section space-y-6">
      {/* Basic Configuration */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
          🔧 Basic Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool Type *
            </label>
            <select
              name="toolType"
              value={formData.toolType || ToolType.API}
              onChange={handleToolTypeChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value={ToolType.LLM}>🤖 LLM Tool</option>
              <option value={ToolType.API}>🌐 API Tool</option>
              <option value={ToolType.WEBHOOK}>🔗 Webhook Tool</option>
              <option value={ToolType.CUSTOM}>⚙️ Custom Tool</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choose the type of tool you want to create
            </p>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Framework *
            </label>
            <select
              name="framework"
              value={formData.framework || ''}
              onChange={handleFrameworkChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value="">Select Framework...</option>
              {(formData.toolType === ToolType.LLM ? FRAMEWORK_OPTIONS.LLM : FRAMEWORK_OPTIONS.API).map(framework => (
                <option key={framework.value} value={framework.value}>
                  {framework.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the framework or service for this tool
            </p>
          </div>
        </div>
      </div>

      {/* Framework Configuration */}
      {formData.framework && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            ⚡ {formData.framework.charAt(0).toUpperCase() + formData.framework.slice(1)} Configuration
          </h3>
          {renderFrameworkFields(formData, handleInputChange, handleJsonChange)}
        </div>
      )}

      {/* Tool Settings */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          📋 Tool Settings
        </h3>
        
        <div className="space-y-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Output Description
            </label>
            <textarea
              name="expectedOutput"
              value={formData.expectedOutput || ''}
              onChange={handleInputChange}
              placeholder="Describe what this tool should return..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none"
              rows="3"
            />
            <p className="mt-1 text-xs text-gray-500">
              Describe the expected output format and content
            </p>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Parameters (JSON)
            </label>
            <textarea
              name="parameters"
              value={formData.parameters || ''}
              onChange={handleInputChange}
              placeholder='{"timeout": 30, "retries": 3}'
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono resize-none"
              rows="4"
            />
            <p className="mt-1 text-xs text-gray-500">
              Additional configuration parameters in JSON format
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
          🔬 Advanced Options
        </h3>
        
        <div className="space-y-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Condition to Run (optional)
              <HelpTooltip type="tool" field="condition" />
            </label>
            <input
              type="text"
              name="condition"
              value={formData.condition || ""}
              onChange={handleInputChange}
              placeholder="e.g. inputs.score > 80"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              This tool will only execute if the condition is true. Use <code className="bg-gray-100 px-1 py-0.5 rounded">inputs.*</code> to reference input values.
            </p>
          </div>

          {/* Async Execution Option */}
          <div className="form-group">
            <div className="flex items-center p-3 bg-white rounded-md border border-gray-200">
              <input
                type="checkbox"
                name="async"
                checked={formData.async || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label className="text-sm font-medium text-gray-700">
                  Execute asynchronously
                </label>
                <p className="text-xs text-gray-500">
                  When enabled, this tool will run in the background without blocking other operations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to render framework-specific fields
const renderFrameworkFields = (formData, handleInputChange, handleJsonChange) => {
  if (!formData.framework) return null;

  if (formData.toolType === ToolType.LLM) {
    return renderLLMFields(formData, handleInputChange);
  } else if ([ToolType.API, ToolType.WEBHOOK, ToolType.CUSTOM].includes(formData.toolType)) {
    return renderApiFields(formData, handleInputChange, handleJsonChange);
  }

  return null;
};

const renderLLMFields = (formData, handleInputChange) => (
  <div className="space-y-4">
    <div className="form-group">
      <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
      <select
        name="frameworkConfig.model"
        value={formData.frameworkConfig?.model || ''}
        onChange={handleInputChange}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
        required
      >
        <option value="">Select Model...</option>
        {formData.framework === 'openai' && (
          <>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </>
        )}
        {formData.framework === 'openrouter' && (
          <>
            <option value="openai/gpt-4">GPT-4</option>
            <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
            <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
            <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="meta-llama/llama-2-70b-chat">Llama 2 70B</option>
          </>
        )}
        {formData.framework === 'huggingface' && (
          <>
            <option value="meta-llama/Llama-2-70b-chat-hf">Llama 2 70B Chat</option>
            <option value="microsoft/DialoGPT-large">DialoGPT Large</option>
            <option value="mistralai/Mistral-7B-Instruct-v0.2">Mistral 7B Instruct</option>
          </>
        )}
        {formData.framework === 'anthropic' && (
          <>
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
          </>
        )}
      </select>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
        <input
          type="number"
          name="frameworkConfig.temperature"
          value={formData.frameworkConfig?.temperature || 0.7}
          onChange={handleInputChange}
          min="0"
          max="2"
          step="0.1"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">0 = focused, 2 = random</p>
      </div>
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
        <input
          type="number"
          name="frameworkConfig.max_tokens"
          value={formData.frameworkConfig?.max_tokens || 2000}
          onChange={handleInputChange}
          min="1"
          max="32000"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">Maximum response length</p>
      </div>
    </div>

    {/* API Key field for frameworks that require it */}
    {(formData.framework === 'openai' || formData.framework === 'anthropic' || formData.framework === 'openrouter') && (
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-2">API Key *</label>
        <div className="relative">
          <input
            type="password"
            name="apiKey"
            value={formData.apiKey || ''}
            onChange={handleInputChange}
            placeholder="Your API key"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm pr-8"
            required
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-gray-400">🔐</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Required to authenticate with {formData.framework} API
        </p>
      </div>
    )}
  </div>
);

const renderApiFields = (formData, handleInputChange, handleJsonChange) => {
  const showMethodSelect = formData.toolType !== ToolType.WEBHOOK;

  return (
    <div className="space-y-4">
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {formData.toolType === ToolType.WEBHOOK ? '🔗 Webhook URL *' : '🌐 Endpoint URL *'}
        </label>
        <input
          type="url"
          name="frameworkConfig.url"
          value={formData.frameworkConfig?.url || ''}
          onChange={handleInputChange}
          placeholder={formData.toolType === ToolType.WEBHOOK 
            ? "https://your-webhook-endpoint.com/hook"
            : "https://api.example.com/endpoint"}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          required
        />
      </div>

      {showMethodSelect && (
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">HTTP Method</label>
          <select
            name="frameworkConfig.method"
            value={formData.frameworkConfig?.method || 'GET'}
            onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">Headers (JSON)</label>
          <textarea
            name="frameworkConfig.headers"
            value={typeof formData.frameworkConfig?.headers === 'object' 
              ? JSON.stringify(formData.frameworkConfig.headers, null, 2)
              : formData.frameworkConfig?.headers || '{}'}
            onChange={(e) => handleJsonChange('frameworkConfig.headers', e.target.value)}
            placeholder='{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer token"\n}'
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm font-mono resize-none"
            rows="4"
          />
          <p className="mt-1 text-xs text-gray-500">HTTP headers in JSON format</p>
        </div>

        {/* Show body field for non-GET methods or always for webhooks */}
        {(formData.toolType === ToolType.WEBHOOK || 
          (formData.frameworkConfig?.method && formData.frameworkConfig.method !== 'GET')) && (
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.toolType === ToolType.WEBHOOK ? 'Webhook Payload (JSON)' : 'Request Body (JSON)'}
            </label>
            <textarea
              name="frameworkConfig.body"
              value={typeof formData.frameworkConfig?.body === 'object' 
                ? JSON.stringify(formData.frameworkConfig.body, null, 2)
                : formData.frameworkConfig?.body || '{}'}
              onChange={(e) => handleJsonChange('frameworkConfig.body', e.target.value)}
              placeholder='{\n  "param1": "value1",\n  "param2": "value2"\n}'
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm font-mono resize-none"
              rows="4"
            />
            <p className="mt-1 text-xs text-gray-500">Request payload in JSON format</p>
          </div>
        )}
      </div>

      {/* API Key field for API and Custom tools */}
      {(formData.toolType === ToolType.API || formData.toolType === ToolType.CUSTOM) && (
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">API Key (optional)</label>
          <div className="relative">
            <input
              type="password"
              name="apiKey"
              value={formData.apiKey || ''}
              onChange={handleInputChange}
              placeholder="Your API key (if required)"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm pr-8"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-400">🔐</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            API key for authentication (if required by the API)
          </p>
        </div>
      )}
    </div>
  );
};

ToolEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired
};

export default ToolEditor;