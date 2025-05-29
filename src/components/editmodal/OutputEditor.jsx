import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import SmartOutputEditor from './SmartOutputEditor'; 

const OutputEditor = ({ formData, handleInputChange }) => {
  // NEW: State for smart integration testing
  const [isTestingIntegration, setIsTestingIntegration] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
          console.log('🔑 Output Editor: Loaded API keys:', result.data.api_keys);
        }
      } catch (error) {
        console.error('🔑 Output Editor: Error loading API keys:', error);
        setApiKeyError('Failed to load API keys from BYOK Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // EXISTING: When output type changes, ensure config is properly set
  useEffect(() => {
    if (formData.outputType) {
      const updatedFormData = { ...formData };
      
      // EXISTING: Clear any fields not related to the selected output type
      if (formData.outputType === 'webhook') {
        delete updatedFormData.email;
        delete updatedFormData.sheetId;
      } else if (formData.outputType === 'email') {
        delete updatedFormData.webhookUrl;
        delete updatedFormData.sheetId;
      } else if (formData.outputType === 'discord') {
        delete updatedFormData.email;
        delete updatedFormData.sheetId;
      } else if (formData.outputType === 'sheets') {
        delete updatedFormData.email;
        delete updatedFormData.webhookUrl;
      }
      // NEW: Handle smart output types
      else if (formData.outputType.startsWith('smart_')) {
        // Clear traditional fields when switching to smart mode
        delete updatedFormData.email;
        delete updatedFormData.webhookUrl;
        delete updatedFormData.sheetId;
      }
      
      // Create a config object if needed
      if (!updatedFormData.config) {
        updatedFormData.config = {};
      }
      
      handleInputChange({
        target: {
          name: 'formData',
          value: updatedFormData
        }
      });
    }
  }, [formData.outputType]);

  // EXISTING: Custom input handler to organize config properly
  const handleOutputConfigChange = (e) => {
    const { name, value } = e.target;
    
    const newEvent = {
      target: { name, value }
    };
    
    // Also update config structure to ensure backend compatibility
    const config = formData.config || {};
    
    if (name === 'email') {
      config.email = value;
    } else if (name === 'webhookUrl') {
      config.url = value;
    } else if (name === 'sheetId') {
      config.sheet_id = value;
    }
    // NEW: Handle smart integration fields
    else if (name === 'ai_description') {
      config.ai_description = value;
    } else if (name === 'service_type') {
      config.service_type = value;
    } else if (name === 'output_format') {
      config.output_format = value;
    }
    
    // Update the config object in the form data
    handleInputChange({
      target: {
        name: 'config',
        value: config
      }
    });
    
    // Forward the original input change
    handleInputChange(newEvent);
  };

  // NEW: Test smart integration
  const handleTestSmartIntegration = async () => {
    setIsTestingIntegration(true);
    setTestResult(null);
    
    try {
      // Determine which endpoint to use based on output type
      const isSmartEmail = formData.outputType === 'smart_email';
      const endpoint = isSmartEmail ? '/api/tools/research-email-format' : '/api/tools/research-output-api';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: extractServiceName(formData.ai_description || formData.config?.ai_description),
          description: formData.ai_description || formData.config?.ai_description,
          endpoint_hint: formData.manual_endpoint || formData.config?.manual_endpoint,
          output_type: formData.outputType,
          email_style: isSmartEmail ? (formData.service_type || formData.config?.service_type) : undefined
        })
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error.message,
        fallback_suggestion: "Try using manual configuration instead"
      });
    } finally {
      setIsTestingIntegration(false);
    }
  };

  // Helper function to extract service name from description
  const extractServiceName = (description) => {
    if (!description) return 'unknown_service';
    
    const commonServices = ['hubspot', 'slack', 'notion', 'discord', 'airtable', 'linear', 'webflow'];
    const descriptionLower = description.toLowerCase();
    
    for (const service of commonServices) {
      if (descriptionLower.includes(service)) {
        return service;
      }
    }
    
    // Try to extract from common patterns
    const words = descriptionLower.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && word.endsWith('api')) {
        return word.replace('api', '');
      }
    }
    
    return 'unknown_service';
  };

  // NEW: Enhanced output type options
  const outputTypes = [
    // EXISTING: Traditional outputs
    { value: 'webhook', label: '🔗 Webhook', description: 'Send to any webhook URL' },
    { value: 'discord', label: '💬 Discord', description: 'Post to Discord channel' },
    { value: 'sheets', label: '📊 Google Sheets', description: 'Append to spreadsheet' },
    { value: 'email', label: '📧 Email', description: 'Send via email' },
    
    // NEW: Smart outputs
    { value: 'smart_api', label: '🤖 AI-Powered Integration', description: 'Let AI figure out the integration' },
    { value: 'smart_email', label: '🤖 Smart Email', description: 'AI-enhanced email formatting' },
  ];

  // Render BYOK Status for Output Editor
  const renderBYOKStatus = () => {
    // Only show for smart outputs that use AI
    if (!formData.outputType?.startsWith('smart_')) {
      return null;
    }

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

  return (
    <>
      {/* ENHANCED: Output Type Selection */}
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

      {/* NEW: Smart Integration Configuration */}
      {(formData.outputType === 'smart_api' || formData.outputType === 'smart_email') && (
        <div className="mb-6">
          {renderBYOKStatus()}
          <SmartOutputEditor 
            formData={formData}
            handleInputChange={handleOutputConfigChange}
            onTestIntegration={handleTestSmartIntegration}
            isTestingIntegration={isTestingIntegration}
            testResult={testResult}
          />
        </div>
      )}

      {/* EXISTING: Traditional Configuration (unchanged) */}
      {formData.outputType === 'webhook' && (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Webhook URL</label>
            <input
              type="text"
              name="webhookUrl"
              value={formData.webhookUrl || ''}
              onChange={handleOutputConfigChange}
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
              onChange={handleOutputConfigChange}
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
              onChange={handleOutputConfigChange}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={3}
              placeholder='{"Content-Type": "application/json"}'
            />
            <p className="text-xs text-gray-500 mt-1">
              HTTP headers to send with the request (JSON format).
            </p>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Payload (JSON)</label>
            <textarea
              name="webhookPayload"
              value={formData.webhookPayload || '{\n  "chat_id": "YOUR_CHAT_ID",\n  "text": "{{message}}",\n  "parse_mode": "Markdown"\n}'}
              onChange={handleOutputConfigChange}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={6}
              placeholder='{"message": "{{output}}", "timestamp": "{{timestamp}}"}'
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON payload to send. Use {'{variable}'} for dynamic values from previous nodes.
            </p>
          </div>

          {/* Telegram Quick Setup */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2">🤖 Telegram Bot Quick Setup</h4>
            <p className="text-sm text-blue-700 mb-2">
              For Telegram bots, use this configuration:
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <strong>URL:</strong> <code className="bg-white px-1 rounded">https://api.telegram.org/bot{'{TOKEN}'}/sendMessage</code>
              </div>
              <div>
                <strong>Payload:</strong>
                <div className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto font-mono border">
                  {"{"}<br/>
                  &nbsp;&nbsp;"chat_id": "YOUR_CHAT_ID",<br/>
                  &nbsp;&nbsp;"text": "{'{telegram_message}'}",<br/>
                  &nbsp;&nbsp;"parse_mode": "Markdown"<br/>
                  {"}"}
                </div>
              </div>
              <div className="text-blue-600">
                Replace <code>YOUR_CHAT_ID</code> with your actual Telegram chat ID.
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.outputType === 'discord' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Discord Webhook URL</label>
          <input
            type="text"
            name="webhookUrl"
            value={formData.webhookUrl || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="Discord webhook URL"
          />
          <p className="text-xs text-gray-500 mt-1">
            Discord webhook URL to send notifications to a Discord channel.
          </p>
        </div>
      )}

      {formData.outputType === 'sheets' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Sheet ID</label>
          <input
            type="text"
            name="sheetId"
            value={formData.sheetId || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="Google Sheet ID"
          />
          <p className="text-xs text-gray-500 mt-1">
            The ID of your Google Sheet where data should be appended.
          </p>
        </div>
      )}

      {formData.outputType === 'email' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="recipient@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email address where output will be sent.
          </p>
          
          <div className="mt-3">
            <label className="block text-gray-700 mb-1">Subject (Optional)</label>
            <input
              type="text"
              name="subject"
              value={formData.subject || 'Workflow Results'}
              onChange={handleOutputConfigChange}
              className="w-full p-2 border rounded"
              placeholder="Email Subject"
            />
          </div>
        </div>
      )}

      {/* NEW: Smart vs Manual Toggle for Traditional Outputs */}
      {['webhook', 'discord', 'sheets', 'email'].includes(formData.outputType) && (
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
      )}

      {/* Debug information - uncomment if needed for testing */}
      {/* <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </div> */}
    </>
  );
};

OutputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default OutputEditor;