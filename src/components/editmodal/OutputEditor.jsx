import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import SmartOutputEditor from './SmartOutputEditor'; 
import LLMConfigSection from './shared/LLMConfigSection';
import { toast } from 'react-hot-toast';
import { AVAILABLE_LLM_PROVIDERS, LLM_MODELS } from '../EditModall';

const OutputEditor = ({ formData, handleInputChange }) => {
  // ===== STATE MANAGEMENT =====
  const [isTestingIntegration, setIsTestingIntegration] = useState(false);
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);

  // ===== CONFIGURATION =====
  const outputTypes = [
    { value: 'webhook', label: '🔗 Webhook', description: 'Send to any webhook URL' },
    { value: 'discord', label: '💬 Discord', description: 'Post to Discord channel' },
    { value: 'sheets', label: '📊 Google Sheets', description: 'Append to spreadsheet' },
    { value: 'email', label: '📧 Email', description: 'Send via email' },
    { value: 'smart_api', label: '🤖 AI-Powered Integration', description: 'Let AI figure out the integration' },
    { value: 'smart_email', label: '🤖 Smart Email', description: 'AI-enhanced email formatting' },
  ];

  const services = {
    'slack': 'Slack', 'discord': 'Discord', 'email': 'Email', 'gmail': 'Gmail',
    'webhook': 'Webhook', 'api': 'API', 'database': 'Database', 'airtable': 'Airtable',
    'notion': 'Notion', 'sheets': 'Google Sheets', 'excel': 'Excel', 'csv': 'CSV', 'json': 'JSON'
  };

  // ===== COMPUTED VALUES =====
  const isSmartOutput = formData.outputType?.startsWith('smart_');
  const isTraditionalOutput = formData.outputType && !formData.outputType.startsWith('smart_');

  // ===== UTILITY FUNCTIONS =====
  const extractServiceName = (description) => {
    if (!description) return '';
    const lowerDesc = description.toLowerCase();
    
    for (const [key, value] of Object.entries(services)) {
      if (lowerDesc.includes(key)) return value;
    }
    return 'Custom Service';
  };

  const getAvailableLLMs = () => {
    const providersWithKeys = availableApiKeys
      .filter(key => key.validation_status === 'valid')
      .map(key => key.provider);
    
    return AVAILABLE_LLM_PROVIDERS.filter(llm => 
      providersWithKeys.includes(llm.value)
    );
  };

  // ===== EVENT HANDLERS =====
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested config updates
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const updatedConfig = {
        ...formData[parent],
        [child]: value
      };
      
      handleInputChange({
        target: { name: parent, value: updatedConfig }
      });
      return;
    }

    // Handle direct field updates and config structure
    const config = formData.config || {};
    const configMappings = {
      email: 'email',
      webhookUrl: 'url',
      sheetId: 'sheet_id',
      ai_description: 'ai_description',
      service_type: 'service_type',
      output_format: 'output_format'
    };
    
    if (configMappings[name]) {
      config[configMappings[name]] = value;
      handleInputChange({
        target: { name: 'config', value: config }
      });
    }
    
    // Forward the original input change
    handleInputChange(e);
  };

  const handleTestSmartIntegration = async () => {
    if (!formData.outputType) {
      toast.error('Please select an output type first');
      return;
    }

    if (!formData.aiProvider) {
      toast.error('Please select an AI provider first');
      return;
    }

    try {
      setIsTestingIntegration(true);
      toast.loading('🤖 Testing smart integration...', { id: 'test-integration' });

      const testData = {
        sample: "test data",
        timestamp: new Date().toISOString(),
        source: "test"
      };
      
      const response = await fetch('http://localhost:8000/api/smart-output/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_type: formData.outputType,
          ai_config: {
            provider: formData.aiProvider,
            model: formData.aiModel,
            description: formData.description || 'Test integration'
          },
          data: testData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ Integration test successful! ${result.message || ''}`, {
          id: 'test-integration',
          duration: 4000
        });
      } else {
        const error = await response.text();
        toast.error(`❌ Test failed: ${error}`, {
          id: 'test-integration',
          duration: 4000
        });
      }
    } catch (error) {
      toast.error(`❌ Test error: ${error.message}`, {
        id: 'test-integration',
        duration: 4000
      });
    } finally {
      setIsTestingIntegration(false);
    }
  };

  // ===== EFFECTS =====
  // Load API Keys from BYOK Manager
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        const result = await response.json();
        
        if (result.success && result.data?.api_keys) {
          setAvailableApiKeys(result.data.api_keys);
          setApiKeyError(null);
        } else {
          setApiKeyError('Failed to load API keys');
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

  // Clean up form data when output type changes
  useEffect(() => {
    if (formData.outputType) {
      const updatedFormData = { ...formData };
      
      // Clear fields not related to selected output type
      const fieldsToDelete = {
        webhook: ['email', 'sheetId'],
        email: ['webhookUrl', 'sheetId'],
        discord: ['email', 'sheetId'],
        sheets: ['email', 'webhookUrl'],
        smart_: ['email', 'webhookUrl', 'sheetId'] // For any smart_ type
      };

      const outputType = formData.outputType;
      let fieldsToRemove = [];

      if (outputType.startsWith('smart_')) {
        fieldsToRemove = fieldsToDelete.smart_;
      } else {
        fieldsToRemove = fieldsToDelete[outputType] || [];
      }

      fieldsToRemove.forEach(field => delete updatedFormData[field]);
      
      // Ensure config object exists
      if (!updatedFormData.config) {
        updatedFormData.config = {};
      }
      
      handleInputChange({
        target: { name: 'formData', value: updatedFormData }
      });
    }
  }, [formData.outputType]);

  // Auto-inject API key when provider is selected
  useEffect(() => {
    const selectedProvider = formData.aiProvider;
    if (selectedProvider && availableApiKeys.length > 0) {
      const apiKey = availableApiKeys.find(key => 
        key.provider === selectedProvider && key.validation_status === 'valid'
      );
      if (apiKey) {
        console.log(`Auto-injected API key for ${selectedProvider}`);
      }
    }
  }, [formData.aiProvider, availableApiKeys]);

  // ===== RENDER FUNCTIONS =====
  const renderBYOKStatus = () => {
    if (!isSmartOutput) return null;

    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Loading your API keys for AI integration...</span>
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
              <span className="text-sm text-yellow-700">No API keys configured for AI integration</span>
            </div>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
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
            <span className="text-green-600 mr-2">🔑</span>
            <span className="text-sm text-green-700">
              AI integration ready with {validKeys.length} API key{validKeys.length > 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded text-sm"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  };

  const renderTraditionalOutputConfig = () => {
    if (!isTraditionalOutput) return null;

    const configs = {
      webhook: (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Webhook URL</label>
            <input
              type="text"
              name="webhookUrl"
              value={formData.webhookUrl || ''}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
              placeholder="https://api.telegram.org/bot{TOKEN}/sendMessage"
            />
            <p className="text-xs text-gray-500 mt-1">
              The URL where output data will be sent via a POST request.
            </p>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">HTTP Method</label>
            <select
              name="webhookMethod"
              value={formData.webhookMethod || 'POST'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Headers (JSON)</label>
            <textarea
              name="webhookHeaders"
              value={formData.webhookHeaders || '{\n  "Content-Type": "application/json"\n}'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={3}
              placeholder='{"Content-Type": "application/json"}'
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Payload (JSON)</label>
            <textarea
              name="webhookPayload"
              value={formData.webhookPayload || '{\n  "chat_id": "YOUR_CHAT_ID",\n  "text": "{{message}}",\n  "parse_mode": "Markdown"\n}'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={6}
              placeholder='{"message": "{{output}}", "timestamp": "{{timestamp}}"}'
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2">🤖 Telegram Bot Quick Setup</h4>
            <p className="text-sm text-blue-700 mb-2">For Telegram bots, use this configuration:</p>
            <div className="space-y-2 text-xs">
              <div><strong>URL:</strong> <code className="bg-white px-1 rounded">https://api.telegram.org/bot{'{TOKEN}'}/sendMessage</code></div>
              <div className="text-blue-600">Replace <code>YOUR_CHAT_ID</code> with your actual Telegram chat ID.</div>
            </div>
          </div>
        </div>
      ),

      discord: (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Discord Webhook URL</label>
          <input
            type="text"
            name="webhookUrl"
            value={formData.webhookUrl || ''}
            onChange={handleFormChange}
            className="w-full p-2 border rounded"
            placeholder="Discord webhook URL"
          />
          <p className="text-xs text-gray-500 mt-1">
            Discord webhook URL to send notifications to a Discord channel.
          </p>
        </div>
      ),

      sheets: (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Sheet ID</label>
          <input
            type="text"
            name="sheetId"
            value={formData.sheetId || ''}
            onChange={handleFormChange}
            className="w-full p-2 border rounded"
            placeholder="Google Sheet ID"
          />
          <p className="text-xs text-gray-500 mt-1">
            The ID of your Google Sheet where data should be appended.
          </p>
        </div>
      ),

      email: (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
              placeholder="recipient@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address where output will be sent.
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Subject (Optional)</label>
            <input
              type="text"
              name="subject"
              value={formData.subject || 'Workflow Results'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
              placeholder="Email Subject"
            />
          </div>
        </div>
      )
    };

    return configs[formData.outputType] || null;
  };

  const renderSmartModePromotion = () => {
    if (!isTraditionalOutput) return null;

    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-blue-800 mb-1">💡 Want AI to help?</h4>
            <p className="text-sm text-blue-700">
              Switch to <strong>🤖 AI-Powered Integration</strong> to describe what you want in plain English
              instead of configuring URLs and settings manually.
            </p>
          </div>
          <button
            onClick={() => handleInputChange({
              target: { name: 'outputType', value: 'smart_api' }
            })}
            className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Try AI Mode
          </button>
        </div>
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <>
      {/* Output Type Selection */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2 flex items-center font-medium">
          Output Type
          <HelpTooltip type="output" field="outputType" />
        </label>
        
        <div className="grid grid-cols-1 gap-2">
          {outputTypes.map(type => (
            <label key={type.value} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="outputType"
                value={type.value}
                checked={formData.outputType === type.value}
                onChange={handleInputChange}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{type.label}</div>
                <div className="text-xs text-gray-600">{type.description}</div>
              </div>
              {type.value.startsWith('smart_') && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                  AI-Powered
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* BYOK Status Display */}
      {renderBYOKStatus()}

      {/* Description */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="output" field="description" />
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="Describe what this output should do (e.g., 'Send results to Slack channel', 'Save to Airtable', 'Email summary')"
        />
      </div>

      {/* LLM Configuration for Smart Outputs */}
      {isSmartOutput && (
        <LLMConfigSection
          formData={{
            frameworkConfig: {
              model: formData.aiModel,
              temperature: formData.temperature || 0.7,
              max_tokens: formData.maxTokens || 1000,
              api_key: formData.aiProvider ? `[BYOK:${formData.aiProvider}]` : ''
            }
          }}
          handleInputChange={(e) => {
            const { name, value } = e.target;
            const mappings = {
              'frameworkConfig.model': 'aiModel',
              'frameworkConfig.temperature': 'temperature',
              'frameworkConfig.max_tokens': 'maxTokens'
            };
            
            if (mappings[name]) {
              handleInputChange({ target: { name: mappings[name], value } });
            }
          }}
          framework={formData.aiProvider || 'openai'}
          showApiKey={true}
        />
      )}

      {/* Test Integration Button for Smart Outputs */}
      {isSmartOutput && formData.aiProvider && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleTestSmartIntegration}
            disabled={isTestingIntegration}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isTestingIntegration ? '🔄 Testing...' : '🧪 Test Smart Integration'}
          </button>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Test your AI-powered output configuration with sample data
          </div>
        </div>
      )}

      {/* Service Detection for Smart Outputs */}
      {isSmartOutput && formData.description && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm">
            <strong>🔍 Detected Service:</strong> {extractServiceName(formData.description)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            AI will automatically configure the integration based on your description
          </div>
        </div>
      )}

      {/* Smart Integration Configuration */}
      {isSmartOutput && (
        <div className="mb-6">
          <SmartOutputEditor 
            formData={formData}
            handleInputChange={handleFormChange}
            onTestIntegration={handleTestSmartIntegration}
            isTestingIntegration={isTestingIntegration}
            testResult={null}
          />
        </div>
      )}

      {/* Traditional Configuration */}
      {renderTraditionalOutputConfig()}

      {/* Smart Mode Promotion */}
      {renderSmartModePromotion()}
    </>
  );
};

OutputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default OutputEditor;