import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const ChatbotEditor = ({ formData, handleInputChange }) => {
  // BYOK Integration - Load API Keys from API Key Manager
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
          setAvailableApiKeys(result.data.api_keys);
          setApiKeyError(null);
        } else {
          setApiKeyError('Failed to load API keys');
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Error connecting to API Key Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // Get available LLM models based on API keys
  const getAvailableLLMs = () => {
    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    
    if (validKeys.length === 0) {
      return [
        { value: 'gpt-4', label: 'GPT-4 (Requires OpenAI Key)', disabled: true },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Requires OpenAI Key)', disabled: true },
        { value: 'claude-3-opus', label: 'Claude 3 Opus (Requires Anthropic Key)', disabled: true },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Requires Anthropic Key)', disabled: true },
        { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Requires Anthropic Key)', disabled: true },
        { value: 'mistral-large', label: 'Mistral Large (Requires Mistral Key)', disabled: true },
        { value: 'mistral-medium', label: 'Mistral Medium (Requires Mistral Key)', disabled: true }
      ];
    }

    const availableModels = [];
    
    validKeys.forEach(key => {
      if (key.provider_id === 'openai') {
        availableModels.push(
          { value: 'gpt-4', label: 'GPT-4 ✅', disabled: false },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo ✅', disabled: false }
        );
      } else if (key.provider_id === 'anthropic') {
        availableModels.push(
          { value: 'claude-3-opus', label: 'Claude 3 Opus ✅', disabled: false },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet ✅', disabled: false },
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku ✅', disabled: false }
        );
      } else if (key.provider_id === 'mistral') {
        availableModels.push(
          { value: 'mistral-large', label: 'Mistral Large ✅', disabled: false },
          { value: 'mistral-medium', label: 'Mistral Medium ✅', disabled: false }
        );
      }
    });

    return availableModels;
  };

  // Render BYOK Status
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Loading API keys...</span>
          </div>
        </div>
      );
    }

    if (apiKeyError) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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

    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    const totalKeys = availableApiKeys.length;

    if (totalKeys === 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-700 text-sm">🔑 No API keys configured</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
            >
              Add Keys
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-green-700 text-sm">
            ✅ {validKeys.length}/{totalKeys} API keys ready
          </span>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  };

  const availableLLMs = getAvailableLLMs();

  return (
    <>
      {/* BYOK Status Display */}
      {renderBYOKStatus()}

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="chatbot" field="description" />
        </label>
        <input
          type="text"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="Brief description of this chatbot's purpose"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Initial Prompt / System Message
          <HelpTooltip type="chatbot" field="prompt" />
        </label>
        <textarea
          name="prompt"
          value={formData.prompt || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="Initial message or system instructions for the chatbot"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          LLM Model
          <HelpTooltip type="chatbot" field="llmModel" />
        </label>
        <select
          name="llmModel"
          value={formData.llmModel || 'gpt-4'}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          {availableLLMs.map(model => (
            <option key={model.value} value={model.value} disabled={model.disabled}>
              {model.label}
            </option>
          ))}
        </select>
        {availableApiKeys.filter(key => key.validation_status === 'valid').length === 0 && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ Add API keys to enable LLM models
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Temperature
          <HelpTooltip type="chatbot" field="temperature" />
        </label>
        <div className="flex items-center">
          <input
            type="range"
            name="temperature"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature || 0.7}
            onChange={handleInputChange}
            className="w-full mr-2"
          />
          <span className="text-sm w-10 text-center">{formData.temperature || 0.7}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Lower values (0.0) make responses more focused and deterministic.
          Higher values (1.0) make responses more creative and varied.
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Max Tokens
          <HelpTooltip type="chatbot" field="max_tokens" />
        </label>
        <input
          type="number"
          name="max_tokens"
          min="50"
          max="4000"
          value={formData.max_tokens || 500}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <div className="text-xs text-gray-500 mt-1">
          Maximum length of the response. Higher values allow longer responses but may cost more.
        </div>
      </div>

      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="enableMemory"
          name="enableMemory"
          checked={formData.enableMemory || false}
          onChange={handleInputChange}
          className="mr-2"
        />
        <label htmlFor="enableMemory" className="text-gray-700 flex items-center">
          Enable Memory
          <HelpTooltip type="chatbot" field="enableMemory" />
        </label>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-1">
          🧠 Condition to Run (optional)
          <HelpTooltip type="chatbot" field="condition" />
        </label>
        <input
          type="text"
          name="condition"
          value={formData.condition || ""}
          onChange={handleInputChange}
          placeholder="e.g. inputs.score > 80"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <div className="mt-2 text-xs text-gray-500 leading-snug">
          This node will only execute if the condition is true.<br />
          Use <code className="bg-gray-100 px-1 py-0.5 rounded">inputs.*</code> in your logic.
          <br />
          Examples:
          <ul className="list-disc list-inside mt-1">
            <li><code>inputs.score &gt;= 80</code></li>
            <li><code>inputs.job_title === "Engineer"</code></li>
            <li><code>inputs.email.includes("@")</code></li>
          </ul>
        </div>
      </div>
    </>
  );
};

ChatbotEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default ChatbotEditor;