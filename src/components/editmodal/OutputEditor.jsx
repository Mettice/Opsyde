import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import SmartOutputEditor from './SmartOutputEditor'; 

const OutputEditor = ({ formData, handleInputChange }) => {
  // NEW: State for smart integration testing
  const [isTestingIntegration, setIsTestingIntegration] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Webhook URL</label>
          <input
            type="text"
            name="webhookUrl"
            value={formData.webhookUrl || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="https://example.com/webhook"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL where output data will be sent via a POST request.
          </p>
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