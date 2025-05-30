import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { toast } from 'react-hot-toast';

const TriggerEditor = ({ formData, handleInputChange }) => {
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

  // Auto-inject API key when provider is selected
  useEffect(() => {
    if (formData.authType === 'api_key' && formData.serviceName && availableApiKeys.length > 0) {
      const serviceName = formData.serviceName.toLowerCase();
      let matchingKey = null;

      // Try to match service name to provider
      if (serviceName.includes('airtable')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'airtable' && key.validation_status === 'valid');
      } else if (serviceName.includes('notion')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'notion' && key.validation_status === 'valid');
      } else if (serviceName.includes('slack')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'slack' && key.validation_status === 'valid');
      } else if (serviceName.includes('github')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'github' && key.validation_status === 'valid');
      }

      // Auto-inject the API key if found and not already set
      if (matchingKey && !formData.apiKey) {
        handleInputChange({ target: { name: 'apiKey', value: matchingKey.masked_value } });
        toast.success(`🔑 Auto-injected ${matchingKey.provider_name} API key from BYOK Manager`);
      }
    }
  }, [formData.authType, formData.serviceName, availableApiKeys, formData.apiKey, handleInputChange]);

  // Render BYOK Status for Universal API Polling
  const renderBYOKStatus = () => {
    if (formData.triggerType !== 'universal_polling') return null;

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
            <span className="text-yellow-700 text-sm">🔑 No API keys configured for external APIs</span>
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
            ✅ {validKeys.length}/{totalKeys} API keys ready for external services
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

  const registerTrigger = async () => {
    if (!formData.nodeId) {
      toast.error('Node ID is missing. Please save the node first.');
      return;
    }
    
    try {
      // This is a stub for the real implementation which would find connected nodes
      // In a real implementation, these functions would be passed as props or imported
      const connectedNodes = []; // findConnectedNodes(formData.nodeId);
      const connectedEdges = []; // findConnectedEdges(formData.nodeId);
      
      // Create a flow object with just the connected components
      const flow = {
        nodes: connectedNodes,
        edges: connectedEdges,
        trigger_id: formData.nodeId,
        trigger_type: formData.triggerType
      };
      
      // Register the trigger with the backend
      const response = await fetch('http://localhost:8000/api/triggers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_id: formData.nodeId,
          flow: flow,
          owner: 'current_user' // Replace with actual user ID if available
        })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        toast.success(`Trigger registered: ${result.webhook_url}`);
      } else {
        toast.error('Failed to register trigger: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Error registering trigger: ' + error.message);
      console.error('Error registering trigger:', error);
    }
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="trigger" field="description" />
        </label>
        <input
          type="text"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="Brief description of this trigger's purpose"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Trigger Type
          <HelpTooltip type="trigger" field="triggerType" />
        </label>
        <select
          name="triggerType"
          value={formData.triggerType || 'manual'}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          <option value="manual">Manual</option>
          <option value="webhook">Webhook</option>
          <option value="schedule">Schedule</option>
          <option value="universal_polling">Universal API Polling</option>
          <option value="universal_webhook">Universal Webhook</option>
        </select>
      </div>

      {formData.triggerType === 'schedule' && (
        <>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 flex items-center">
              Schedule Type
            </label>
            <select
              name="scheduleType"
              value={formData.scheduleType || 'once'}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="once">Run Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          {/* Date/Time picker for one-time schedules */}
          {formData.scheduleType === 'once' && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Run At
                <HelpTooltip type="trigger" field="runAt" />
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={formData.runDate || ''}
                  onChange={(e) => {
                    handleInputChange({ target: { name: 'runDate', value: e.target.value } });
                    // Combine date and time into runAt
                    const newDate = e.target.value;
                    const currentTime = formData.runTime || '12:00';
                    handleInputChange({ target: { name: 'runAt', value: `${newDate} ${currentTime}` } });
                  }}
                  className="flex-1 p-2 border rounded"
                />
                <input
                  type="time"
                  value={formData.runTime || ''}
                  onChange={(e) => {
                    handleInputChange({ target: { name: 'runTime', value: e.target.value } });
                    // Combine date and time into runAt
                    const currentDate = formData.runDate || new Date().toISOString().split('T')[0];
                    const newTime = e.target.value;
                    handleInputChange({ target: { name: 'runAt', value: `${currentDate} ${newTime}` } });
                  }}
                  className="flex-1 p-2 border rounded"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Select when this trigger should execute
              </div>
            </div>
          )}
          
          {/* Weekly schedule options */}
          {formData.scheduleType === 'weekly' && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">
                Day of Week
              </label>
              <select
                name="scheduleWeekday"
                value={formData.scheduleWeekday || 'monday'}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}
          
          {/* Monthly schedule options */}
          {formData.scheduleType === 'monthly' && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">
                Day of Month
              </label>
              <select
                name="scheduleMonthDay"
                value={formData.scheduleMonthDay || 1}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              >
                {[...Array(31)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Daily schedule options */}
          {formData.scheduleType === 'daily' && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">
                Time Window
              </label>
              <div className="flex space-x-2 items-center">
                <input
                  type="time"
                  name="scheduleStartTime"
                  value={formData.scheduleStartTime || '09:00'}
                  onChange={handleInputChange}
                  className="flex-1 p-2 border rounded"
                />
                <span>to</span>
                <input
                  type="time"
                  name="scheduleEndTime"
                  value={formData.scheduleEndTime || '17:00'}
                  onChange={handleInputChange}
                  className="flex-1 p-2 border rounded"
                />
              </div>
            </div>
          )}
        </>
      )}

      {formData.triggerType === 'webhook' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 flex items-center">
            Webhook URL
            <HelpTooltip type="trigger" field="webhook" />
          </label>
          <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
            {`${window.location.origin}/trigger/${formData.nodeId || 'id'}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Send a POST request to this URL to trigger the workflow
          </div>
          <div className="mt-2">
            <button
              type="button"
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/trigger/${formData.nodeId || 'id'}`);
                toast.success('Webhook URL copied to clipboard');
              }}
            >
              Copy URL
            </button>
            <button
              type="button"
              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded ml-2"
              onClick={registerTrigger}
            >
              Register Webhook
            </button>
            <button
              type="button"
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded ml-2"
              onClick={async () => {
                try {
                  const response = await fetch(`http://localhost:8000/api/triggers/${formData.nodeId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
                  });
                  const result = await response.json();
                  toast.success('Webhook test triggered successfully');
                } catch (error) {
                  toast.error('Failed to test webhook');
                  console.error(error);
                }
              }}
            >
              Test Webhook
            </button>
          </div>
        </div>
      )}

      {formData.triggerType === 'universal_polling' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">🔄 Universal API Polling</h3>
            <p className="text-sm text-blue-700">
              Monitor ANY API for changes - works with thousands of services including Airtable, Notion, Slack, 
              Google Sheets, Stripe, GitHub, custom APIs, and more. Just provide the endpoint!
            </p>
            <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs">
              <strong>💡 Pro Tip:</strong> For monitoring <strong>multiple APIs/sheets</strong>, use the <strong>AI Tool Builder</strong> instead of creating multiple triggers. 
              One trigger = One API endpoint. Multiple data sources = Use AI Tool Builder with integration logic.
            </div>
          </div>

          {/* BYOK Status Display */}
          {renderBYOKStatus()}

          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              Service/API Name
            </label>
            <input
              type="text"
              name="serviceName"
              value={formData.serviceName || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="e.g., Airtable, Notion, Slack, Stripe, GitHub, Custom CRM, etc."
            />
            <div className="text-xs text-gray-500 mt-1">
              What service are you monitoring? (helps with auto-configuration)
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              API Endpoint URL
            </label>
            <input
              type="url"
              name="apiEndpoint"
              value={formData.apiEndpoint || ''}
              onChange={(e) => {
                let url = e.target.value;
                
                // Auto-convert Airtable web URLs to API URLs
                if (url.includes('airtable.com/app') && !url.includes('api.airtable.com')) {
                  const match = url.match(/airtable\.com\/(app[^\/]+)\/([^\/]+)/);
                  if (match) {
                    const baseId = match[1];
                    const tableId = match[2];
                    url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
                    
                    // Show a helpful toast
                    setTimeout(() => {
                      toast.success(`🔄 Auto-converted to API URL: ${url}`, { duration: 4000 });
                    }, 100);
                  }
                }
                
                handleInputChange({ target: { name: 'apiEndpoint', value: url } });
              }}
              className="w-full p-2 border rounded"
              placeholder="https://api.example.com/endpoint or any API URL"
            />
            <div className="text-xs text-gray-500 mt-1">
              The API endpoint to monitor for changes
            </div>
            
            {/* Popular API Templates */}
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'Airtable' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME' } });
                  handleInputChange({ target: { name: 'authType', value: 'api_key' } });
                }}
              >
                📊 Airtable
              </button>
              <button
                type="button"
                className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'Notion' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://api.notion.com/v1/databases/YOUR_DATABASE_ID/query' } });
                }}
              >
                📝 Notion
              </button>
              <button
                type="button"
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'Google Sheets' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0&usp=sharing' } });
                  handleInputChange({ target: { name: 'authType', value: 'none' } });
                  handleInputChange({ target: { name: 'changeDetectionMethod', value: 'response_hash' } });
                }}
              >
                📈 Google Sheets (CSV)
              </button>
              <button
                type="button"
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'Google Sheets API' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1?key=YOUR_API_KEY' } });
                  handleInputChange({ target: { name: 'authType', value: 'none' } });
                  handleInputChange({ target: { name: 'changeDetectionMethod', value: 'array_length' } });
                }}
              >
                📊 Google Sheets API
              </button>
              <button
                type="button"
                className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'Slack' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://slack.com/api/conversations.history?channel=YOUR_CHANNEL_ID' } });
                }}
              >
                💬 Slack
              </button>
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'GitHub' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://api.github.com/repos/OWNER/REPO/issues' } });
                }}
              >
                🐙 GitHub
              </button>
              <button
                type="button"
                className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'JSONPlaceholder' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://jsonplaceholder.typicode.com/posts' } });
                  handleInputChange({ target: { name: 'authType', value: 'none' } });
                  handleInputChange({ target: { name: 'changeDetectionMethod', value: 'array_length' } });
                }}
              >
                🧪 Test API
              </button>
              <button
                type="button"
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                onClick={() => {
                  handleInputChange({ target: { name: 'serviceName', value: 'REST Countries' } });
                  handleInputChange({ target: { name: 'apiEndpoint', value: 'https://restcountries.com/v3.1/all' } });
                  handleInputChange({ target: { name: 'authType', value: 'none' } });
                  handleInputChange({ target: { name: 'changeDetectionMethod', value: 'array_length' } });
                }}
              >
                🌍 Countries API
              </button>
            </div>
            
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>💡 Tip:</strong> Use the templates above as starting points, then replace placeholder values with your actual IDs.
            </div>
            
            {/* Google Sheets specific guidance */}
            {formData.serviceName && formData.serviceName.toLowerCase().includes('google') && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-xs">
                <strong>📊 Google Sheets Setup:</strong>
                <div className="mt-1 space-y-1">
                  <div>1. <strong>Make sheet public:</strong> Share → "Anyone with the link can view"</div>
                  <div>2. <strong>Get Sheet ID:</strong> Copy from URL between /d/ and /edit</div>
                  <div>3. <strong>Your Sheet ID:</strong> <code className="bg-white px-1 rounded">1idkMT0Jq_0RQQOVTL6J-wMdO0Mws6AR72-74o84d8e8</code></div>
                  <div>4. <strong>Test URL:</strong> Replace YOUR_SHEET_ID with your actual ID</div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              Polling Interval
            </label>
            <select
              name="pollingInterval"
              value={formData.pollingInterval || '300'}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="30">Every 30 seconds</option>
              <option value="60">Every 1 minute</option>
              <option value="300">Every 5 minutes</option>
              <option value="600">Every 10 minutes</option>
              <option value="1800">Every 30 minutes</option>
              <option value="3600">Every 1 hour</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              Authentication (Optional)
            </label>
            <select
              name="authType"
              value={formData.authType || 'none'}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="none">No Authentication</option>
              <option value="api_key">API Key</option>
              <option value="bearer_token">Bearer Token</option>
              <option value="basic_auth">Basic Auth</option>
            </select>

            {formData.authType === 'api_key' && (
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Your API key"
              />
            )}

            {formData.authType === 'bearer_token' && (
              <input
                type="password"
                name="bearerToken"
                value={formData.bearerToken || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Your bearer token"
              />
            )}

            {formData.authType === 'basic_auth' && (
              <div className="space-y-2">
                <input
                  type="text"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Username"
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Password"
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              Change Detection Method
            </label>
            <select
              name="changeDetectionMethod"
              value={formData.changeDetectionMethod || 'array_length'}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="array_length">Monitor Array Length (Best for lists/tables)</option>
              <option value="field_value">Monitor Specific Field</option>
              <option value="response_hash">Monitor Entire Response</option>
              <option value="timestamp">Monitor Timestamp Field</option>
            </select>

            {/* Detailed explanations for each method */}
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              {formData.changeDetectionMethod === 'array_length' && (
                <div>
                  <strong>📊 Array Length Detection (Best for Lists)</strong>
                  <p className="mt-1 text-blue-700">
                    Monitors how many items are in an array/list. When new items are added, 
                    the count increases and triggers your workflow. Perfect for detecting new records, issues, messages, etc.
                  </p>
                  <p className="mt-1 text-blue-600 font-medium">
                    Example: API returns 10 items → Someone adds 1 → Now 11 items → Workflow triggers!
                  </p>
                </div>
              )}
              
              {formData.changeDetectionMethod === 'field_value' && (
                <div>
                  <strong>🎯 Field Value Detection</strong>
                  <p className="mt-1 text-blue-700">
                    Monitors a specific field in your data. When that field's value changes, 
                    it triggers your workflow. Great for status changes, counters, etc.
                  </p>
                  <p className="mt-1 text-blue-600 font-medium">
                    Example: Monitor "data[0].status" - triggers when the first item's status changes
                  </p>
                </div>
              )}
              
              {formData.changeDetectionMethod === 'response_hash' && (
                <div>
                  <strong>🔍 Entire Response Detection</strong>
                  <p className="mt-1 text-blue-700">
                    Monitors the entire API response. Any change anywhere in your data triggers the workflow.
                    Most sensitive but may trigger frequently.
                  </p>
                  <p className="mt-1 text-blue-600 font-medium">
                    Example: Any field in any item changes → Workflow triggers
                  </p>
                </div>
              )}
              
              {formData.changeDetectionMethod === 'timestamp' && (
                <div>
                  <strong>⏰ Timestamp Detection</strong>
                  <p className="mt-1 text-blue-700">
                    Monitors a timestamp field to detect when data was last modified.
                    Perfect for APIs that include "updated_at" or "modified" fields.
                  </p>
                  <p className="mt-1 text-blue-600 font-medium">
                    Example: Monitor "data[0].updated_at" timestamp
                  </p>
                </div>
              )}
            </div>

            {formData.changeDetectionMethod === 'field_value' && (
              <div className="mt-2">
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Field Path to Monitor
                </label>
                <input
                  type="text"
                  name="changeDetectionField"
                  value={formData.changeDetectionField || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="e.g., data[0].status, items[0].name, response.count"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Use dot notation to specify the exact field path in the API response
                </div>
              </div>
            )}

            {formData.changeDetectionMethod === 'timestamp' && (
              <div className="mt-2">
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Timestamp Field Path
                </label>
                <input
                  type="text"
                  name="timestampField"
                  value={formData.timestampField || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="e.g., data[0].updated_at, lastModified, timestamp"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Path to the timestamp field that indicates when data was last updated
                </div>
              </div>
            )}
          </div>

          {/* SIMPLIFIED: Universal Data Selection */}
          <div className="mb-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 Data Selection Workflow</h3>
              <p className="text-sm text-blue-700 mb-3">
                Control what data reaches your agent. Review detected changes before processing.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="requireDataApproval"
                      checked={formData.requireDataApproval || false}
                      onChange={(e) => handleInputChange({ target: { name: 'requireDataApproval', value: e.target.checked } })}
                      className="mr-2"
                    />
                    <span className="font-medium text-blue-800">🔍 Review Data Before Agent Processing</span>
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.apiEndpoint) {
                        toast.error('Please set API endpoint first');
                        return;
                      }
                      
                      try {
                        toast.loading('🔍 Discovering available fields...', { id: 'discover-fields' });
                        
                        const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling-simple', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            apiEndpoint: formData.apiEndpoint,
                            authType: formData.authType || 'none',
                            apiKey: formData.apiKey || '',
                            bearerToken: formData.bearerToken || '',
                            username: formData.username || '',
                            password: formData.password || '',
                            serviceName: formData.serviceName || 'Unknown API'
                          })
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          if (result.success && result.sample_data) {
                            // Smart field extraction for different API types
                            const extractSmartFields = (data) => {
                              let fieldsToExtract = [];
                              
                              // Handle CSV parsed data (Google Sheets)
                              if (data.source === 'csv_parsed' && data.headers && data.records) {
                                // For CSV data, the fields are simply the column headers
                                fieldsToExtract = data.headers.map((header, index) => `records[0].${header}`);
                                console.log('🔍 Detected CSV format, extracted column headers as fields:', fieldsToExtract);
                                return fieldsToExtract;
                              }
                              
                              // Handle Airtable format: { records: [{ fields: {...} }] }
                              if (data.records && Array.isArray(data.records) && data.records.length > 0) {
                                const firstRecord = data.records[0];
                                if (firstRecord.fields) {
                                  fieldsToExtract = Object.keys(firstRecord.fields).map(field => `records[0].fields.${field}`);
                                  console.log('🔍 Detected Airtable format, extracted fields:', fieldsToExtract);
                                }
                              }
                              // Handle DexScreener format: { pairs: [...] } or direct array
                              else if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
                                const extractFields = (obj, prefix = '') => {
                                  const fields = [];
                                  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                                    for (const [key, value] of Object.entries(obj)) {
                                      const fieldPath = prefix ? `${prefix}.${key}` : key;
                                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                        fields.push(fieldPath);
                                        const nestedFields = extractFields(value, fieldPath);
                                        fields.push(...nestedFields);
                                      } else {
                                        fields.push(fieldPath);
                                      }
                                    }
                                  }
                                  return fields;
                                };
                                fieldsToExtract = extractFields(data.pairs[0], 'pairs[0]');
                                console.log('🔍 Detected structured API format, extracted fields:', fieldsToExtract);
                              }
                              // Handle direct array format
                              else if (Array.isArray(data) && data.length > 0) {
                                const extractFields = (obj, prefix = '') => {
                                  const fields = [];
                                  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                                    for (const [key, value] of Object.entries(obj)) {
                                      const fieldPath = prefix ? `${prefix}.${key}` : key;
                                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                        fields.push(fieldPath);
                                        const nestedFields = extractFields(value, fieldPath);
                                        fields.push(...nestedFields);
                                      } else {
                                        fields.push(fieldPath);
                                      }
                                    }
                                  }
                                  return fields;
                                };
                                fieldsToExtract = extractFields(data[0], '[0]');
                                console.log('🔍 Detected direct array format, extracted fields:', fieldsToExtract);
                              }
                              // Handle generic object
                              else if (typeof data === 'object') {
                                const extractFields = (obj, prefix = '') => {
                                  const fields = [];
                                  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                                    for (const [key, value] of Object.entries(obj)) {
                                      const fieldPath = prefix ? `${prefix}.${key}` : key;
                                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                        fields.push(fieldPath);
                                        const nestedFields = extractFields(value, fieldPath);
                                        fields.push(...nestedFields);
                                      } else {
                                        fields.push(fieldPath);
                                      }
                                    }
                                  }
                                  return fields;
                                };
                                fieldsToExtract = extractFields(data);
                                console.log('🔍 Detected generic object format, extracted fields:', fieldsToExtract);
                              }
                              
                              return fieldsToExtract;
                            };
                            
                            const discoveredFields = extractSmartFields(result.sample_data);
                            handleInputChange({ target: { name: 'discoveredFields', value: discoveredFields } });
                            handleInputChange({ target: { name: 'showFieldSelection', value: true } });
                            
                            toast.success(`✅ Discovered ${discoveredFields.length} fields!`, {
                              id: 'discover-fields',
                              duration: 3000
                            });
                          } else {
                            toast.error('Failed to discover fields', { id: 'discover-fields' });
                          }
                        } else {
                          toast.error('Failed to connect to API', { id: 'discover-fields' });
                        }
                      } catch (error) {
                        toast.error(`Error: ${error.message}`, { id: 'discover-fields' });
                      }
                    }}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                  >
                    🔍 Discover Fields
                  </button>
                </div>
                
                {formData.requireDataApproval ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                    <strong>✅ Interactive Mode:</strong> When data changes are detected, you'll review and select what to send to your agent.
                    <br />
                    <span className="text-green-700">Perfect for ensuring your agent only processes relevant data!</span>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <strong>⚡ Auto Mode:</strong> All detected changes will automatically be sent to your agent.
                    <br />
                    <span className="text-yellow-700">Enable "Review Data" for more control over what your agent processes.</span>
                  </div>
                )}
                
                {/* Field Selection (only show if fields discovered) */}
                {formData.showFieldSelection && formData.discoveredFields && formData.discoveredFields.length > 0 && (
                  <div className="p-3 bg-white border border-blue-300 rounded">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Fields ({formData.discoveredFields.length})
                      </label>
                      <p className="text-xs text-gray-600 mb-2">
                        Select which fields to monitor for changes. Only changes in selected fields will trigger your workflow.
                      </p>
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                      <div className="grid grid-cols-1 gap-1">
                        {formData.discoveredFields.map((field, index) => (
                          <label key={index} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={(formData.selectedFields || []).includes(field)}
                              onChange={(e) => {
                                const currentFields = formData.selectedFields || [];
                                const newFields = e.target.checked 
                                  ? [...currentFields, field]
                                  : currentFields.filter(f => f !== field);
                                handleInputChange({ target: { name: 'selectedFields', value: newFields } });
                              }}
                              className="mr-2"
                            />
                            <span className="font-mono text-xs text-gray-700">{field}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Quick selection buttons */}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange({ target: { name: 'selectedFields', value: formData.discoveredFields } });
                        }}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                      >
                        ✅ Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange({ target: { name: 'selectedFields', value: [] } });
                        }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                      >
                        🗑️ Clear All
                      </button>
                    </div>
                    
                    {/* Selection summary */}
                    {formData.selectedFields && formData.selectedFields.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                        <strong>✅ Monitoring {formData.selectedFields.length} fields:</strong>
                        <div className="mt-1 font-mono">
                          {formData.selectedFields.slice(0, 3).join(', ')}
                          {formData.selectedFields.length > 3 && ` ... and ${formData.selectedFields.length - 3} more`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* NEW: Field Filtering Section */}
          <div className="mb-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">🎯 Field Filtering (Optional)</h3>
              <p className="text-sm text-purple-700 mb-3">
                Filter API data to include only specific columns. Perfect for focusing on "topic" and "description" fields only.
              </p>
              
              {/* ChatGPT's Smart Filtering Mode Toggle */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="summaryMode"
                      checked={formData.summaryMode || false}
                      onChange={(e) => handleInputChange({ target: { name: 'summaryMode', value: e.target.checked } })}
                      className="mr-2"
                    />
                    <span className="font-medium text-blue-800">🧠 Smart Filtering Mode (ChatGPT Strategy)</span>
                  </label>
                </div>
                <p className="text-xs text-blue-700">
                  Automatically optimize data for AI processing: reduce tokens by 80-90%, select most important fields, 
                  and limit records to prevent overflow. Based on ChatGPT's recommendations.
                </p>
                
                {formData.summaryMode && (
                  <div className="mt-3 space-y-3 p-3 bg-white border border-blue-300 rounded">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max Records
                        </label>
                        <select
                          name="maxRecords"
                          value={formData.maxRecords || 5}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="3">3 records (safest)</option>
                          <option value="5">5 records (recommended)</option>
                          <option value="10">10 records (moderate)</option>
                          <option value="20">20 records (high)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Token Limit
                        </label>
                        <select
                          name="maxTokens"
                          value={formData.maxTokens || 2000}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="1000">1,000 tokens (minimal)</option>
                          <option value="2000">2,000 tokens (recommended)</option>
                          <option value="4000">4,000 tokens (generous)</option>
                          <option value="6000">6,000 tokens (maximum)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="p-2 bg-green-100 border border-green-300 rounded text-xs">
                      <strong>💡 Smart Mode Benefits:</strong> Automatically selects essential fields, 
                      removes noise, optimizes for {formData.serviceName || 'your API'}, and prevents token overflow.
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Include Only These Fields (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="targetFields"
                    value={formData.targetFieldsString || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const fieldsArray = value ? value.split(',').map(f => f.trim()).filter(f => f) : [];
                      handleInputChange({ target: { name: 'targetFields', value: fieldsArray } });
                      // Also store as string for display
                      handleInputChange({ target: { name: 'targetFieldsString', value: value } });
                    }}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="e.g., baseToken.symbol, priceUsd, liquidity.usd, volume.h24"
                    disabled={formData.summaryMode}
                  />
                  <div className="text-xs text-purple-600 mt-1">
                    {formData.summaryMode ? 
                      "🧠 Smart Mode: Fields auto-selected based on API type" : 
                      "💡 Example: \"baseToken.symbol, priceUsd\" - Agent will only receive these fields"
                    }
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Exclude These Fields (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="excludeFields"
                    value={formData.excludeFieldsString || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const fieldsArray = value ? value.split(',').map(f => f.trim()).filter(f => f) : [];
                      handleInputChange({ target: { name: 'excludeFields', value: fieldsArray } });
                      // Also store as string for display
                      handleInputChange({ target: { name: 'excludeFieldsString', value: value } });
                    }}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="e.g., info, labels, boosts, profile"
                  />
                  <div className="text-xs text-purple-600 mt-1">
                    💡 Example: "info, labels" - Remove noise and metadata fields
                  </div>
                </div>
                
                {/* ChatGPT's Service-Specific Recommendations */}
                {formData.serviceName && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-xs font-medium text-yellow-800 mb-1">
                      🎯 Recommended for {formData.serviceName}:
                    </div>
                    <div className="text-xs text-yellow-700">
                      {formData.serviceName.toLowerCase().includes('dexscreener') && (
                        <>
                          <strong>Include:</strong> baseToken.symbol, baseToken.name, priceUsd, liquidity.usd, volume.h24, priceChange.h24, chainId<br/>
                          <strong>Exclude:</strong> info, labels, boosts, profile
                        </>
                      )}
                      {formData.serviceName.toLowerCase().includes('airtable') && (
                        <>
                          <strong>Include:</strong> fields.Topic, fields.Description, fields.Status<br/>
                          <strong>Exclude:</strong> createdTime, id (unless needed)
                        </>
                      )}
                      {formData.serviceName.toLowerCase().includes('notion') && (
                        <>
                          <strong>Include:</strong> properties.Name, properties.Status, properties.Description<br/>
                          <strong>Exclude:</strong> object, parent, archived
                        </>
                      )}
                      {!formData.serviceName.toLowerCase().includes('dexscreener') && 
                       !formData.serviceName.toLowerCase().includes('airtable') && 
                       !formData.serviceName.toLowerCase().includes('notion') && (
                        "Use 'Preview Data' to see available fields, then select the most important ones for your use case."
                      )}
                    </div>
                    
                    {formData.serviceName.toLowerCase().includes('dexscreener') && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange({ target: { name: 'targetFieldsString', value: 'baseToken.symbol, baseToken.name, priceUsd, liquidity.usd, volume.h24, priceChange.h24, chainId' } });
                          handleInputChange({ target: { name: 'targetFields', value: ['baseToken.symbol', 'baseToken.name', 'priceUsd', 'liquidity.usd', 'volume.h24', 'priceChange.h24', 'chainId'] } });
                          handleInputChange({ target: { name: 'excludeFieldsString', value: 'info, labels, boosts, profile' } });
                          handleInputChange({ target: { name: 'excludeFields', value: ['info', 'labels', 'boosts', 'profile'] } });
                        }}
                        className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
                      >
                        🚀 Apply DexScreener Optimization
                      </button>
                    )}
                  </div>
                )}
                
                <div className="p-2 bg-purple-100 border border-purple-300 rounded text-xs">
                  <strong>🎯 Pro Tip:</strong> Use field filtering to reduce token usage and focus your AI agent on relevant data only. 
                  {formData.summaryMode ? 
                    " Smart Mode handles this automatically!" : 
                    " For crypto data, focus on price, volume, and liquidity fields."
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Smart Endpoint Guidance - Universal Detection */}
          {formData.apiEndpoint && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <strong>🔍 Smart Endpoint Analysis:</strong>
              <div className="mt-2">
                {(() => {
                  const url = formData.apiEndpoint.toLowerCase();
                  
                  // DexScreener Detection
                  if (url.includes('dexscreener.com')) {
                    if (url.includes('token-boosts')) {
                      return (
                        <div className="space-y-2">
                          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                            <strong>⚠️ Token Boosts Endpoint Detected</strong>
                            <p className="text-yellow-700 mt-1">
                              This endpoint provides promotion data, not trading data (price, volume, market cap).
                            </p>
                          </div>
                          <div className="text-blue-700">
                            <strong>💡 For Trading Data, Consider:</strong>
                            <ul className="mt-1 ml-4 list-disc">
                              <li><code>/latest/dex/search?q=TOKEN</code> - Search for specific tokens</li>
                              <li><code>/latest/dex/pairs/CHAIN/ADDRESS</code> - Specific pair data</li>
                              <li><code>/token-profiles/latest/v1</code> - Token profiles with metadata</li>
                            </ul>
                          </div>
                        </div>
                      );
                    } else if (url.includes('/search')) {
                      return (
                        <div className="p-2 bg-green-100 border border-green-300 rounded">
                          <strong>✅ Trading Data Endpoint</strong>
                          <p className="text-green-700 mt-1">
                            This endpoint provides trading data: price, volume, liquidity, market cap.
                          </p>
                        </div>
                      );
                    } else if (url.includes('/pairs/')) {
                      return (
                        <div className="p-2 bg-green-100 border border-green-300 rounded">
                          <strong>✅ Specific Pair Endpoint</strong>
                          <p className="text-green-700 mt-1">
                            This endpoint provides detailed data for a specific trading pair.
                          </p>
                        </div>
                      );
                    } else if (url.includes('token-profiles')) {
                      return (
                        <div className="p-2 bg-blue-100 border border-blue-300 rounded">
                          <strong>📊 Token Profiles Endpoint</strong>
                          <p className="text-blue-700 mt-1">
                            This endpoint provides token metadata and profile information.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2 bg-gray-100 border border-gray-300 rounded">
                          <strong>🤔 Unknown DexScreener Endpoint</strong>
                          <p className="text-gray-700 mt-1">
                            Use "Preview Data" to see what this endpoint returns.
                          </p>
                        </div>
                      );
                    }
                  }
                  
                  // Airtable Detection
                  else if (url.includes('airtable.com')) {
                    if (url.includes('api.airtable.com')) {
                      return (
                        <div className="p-2 bg-green-100 border border-green-300 rounded">
                          <strong>✅ Airtable API Endpoint</strong>
                          <p className="text-green-700 mt-1">
                            This will return records from your Airtable base. Make sure you have the correct API key.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                          <strong>⚠️ Airtable Web URL Detected</strong>
                          <p className="text-yellow-700 mt-1">
                            This looks like a web URL. For API access, use: <code>https://api.airtable.com/v0/BASE_ID/TABLE_NAME</code>
                          </p>
                        </div>
                      );
                    }
                  }
                  
                  // Google Sheets Detection
                  else if (url.includes('docs.google.com') || url.includes('sheets.googleapis.com')) {
                    if (url.includes('/export?format=csv')) {
                      return (
                        <div className="p-2 bg-green-100 border border-green-300 rounded">
                          <strong>✅ Google Sheets CSV Export</strong>
                          <p className="text-green-700 mt-1">
                            This will return CSV data. Make sure the sheet is publicly accessible.
                          </p>
                        </div>
                      );
                    } else if (url.includes('sheets.googleapis.com')) {
                      return (
                        <div className="p-2 bg-blue-100 border border-blue-300 rounded">
                          <strong>📊 Google Sheets API</strong>
                          <p className="text-blue-700 mt-1">
                            This uses the official Google Sheets API. Ensure you have proper authentication.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                          <strong>⚠️ Google Sheets Web URL</strong>
                          <p className="text-yellow-700 mt-1">
                            For API access, use the CSV export URL or Google Sheets API endpoint.
                          </p>
                        </div>
                      );
                    }
                  }
                  
                  // GitHub Detection
                  else if (url.includes('github.com') || url.includes('api.github.com')) {
                    if (url.includes('api.github.com')) {
                      return (
                        <div className="p-2 bg-green-100 border border-green-300 rounded">
                          <strong>✅ GitHub API Endpoint</strong>
                          <p className="text-green-700 mt-1">
                            This will return GitHub data (repos, issues, etc.). Consider rate limits.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                          <strong>⚠️ GitHub Web URL</strong>
                          <p className="text-yellow-700 mt-1">
                            For API access, use: <code>https://api.github.com/repos/OWNER/REPO/issues</code>
                          </p>
                        </div>
                      );
                    }
                  }
                  
                  // Notion Detection
                  else if (url.includes('notion.com') || url.includes('api.notion.com')) {
                    if (url.includes('api.notion.com')) {
                      return (
                        <div className="p-2 bg-green-100 border border-green-300 rounded">
                          <strong>✅ Notion API Endpoint</strong>
                          <p className="text-green-700 mt-1">
                            This will return Notion database or page data. Ensure proper integration setup.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                          <strong>⚠️ Notion Web URL</strong>
                          <p className="text-yellow-700 mt-1">
                            For API access, use: <code>https://api.notion.com/v1/databases/DATABASE_ID/query</code>
                          </p>
                        </div>
                      );
                    }
                  }
                  
                  // Slack Detection
                  else if (url.includes('slack.com')) {
                    return (
                      <div className="p-2 bg-blue-100 border border-blue-300 rounded">
                        <strong>📱 Slack API Endpoint</strong>
                        <p className="text-blue-700 mt-1">
                          This will return Slack data. Make sure you have proper bot permissions and tokens.
                        </p>
                      </div>
                    );
                  }
                  
                  // Generic API Detection
                  else if (url.includes('api.') || url.includes('/api/')) {
                    return (
                      <div className="p-2 bg-blue-100 border border-blue-300 rounded">
                        <strong>🔗 API Endpoint Detected</strong>
                        <p className="text-blue-700 mt-1">
                          This appears to be an API endpoint. Use "Preview Data" to see the response structure.
                        </p>
                      </div>
                    );
                  }
                  
                  // Unknown/Generic URL
                  else {
                    return (
                      <div className="p-2 bg-gray-100 border border-gray-300 rounded">
                        <strong>🤔 Unknown Endpoint Type</strong>
                        <p className="text-gray-700 mt-1">
                          Use "Preview Data" to test this endpoint and see what data it returns.
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
              
              {/* Universal Guidance */}
              <div className="mt-3 p-2 bg-white border border-blue-300 rounded">
                <strong>💡 Universal Tips:</strong>
                <ul className="mt-1 ml-4 list-disc text-blue-700">
                  <li>Use "Preview Data" to see exactly what this endpoint returns</li>
                  <li>Check authentication requirements for your specific service</li>
                  <li>Consider rate limits and polling frequency</li>
                  <li>Test with a longer polling interval first (5+ minutes)</li>
                </ul>
              </div>
            </div>
          )}

          {/* AI-Powered Test API Connection Button */}
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    toast.loading('Testing backend connection...', { id: 'test-backend' });
                    
                    const response = await fetch('http://localhost:8000/api/triggers/debug/test', {
                      method: 'GET'
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      toast.success(`✅ Backend connected: ${result.message}`, {
                        id: 'test-backend',
                        duration: 3000
                      });
                    } else {
                      toast.error(`❌ Backend error: ${response.status}`, {
                        id: 'test-backend',
                        duration: 3000
                      });
                    }
                  } catch (error) {
                    toast.error(`❌ Backend unreachable: ${error.message}`, {
                      id: 'test-backend',
                      duration: 3000
                    });
                  }
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded transition-colors"
              >
                🔧 Test Backend
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  if (!formData.apiEndpoint) {
                    toast.error('Please enter an API endpoint first');
                    return;
                  }
                  
                  try {
                    console.log('🔍 Starting Preview Data request...');
                    toast.loading('🔍 Fetching data preview...', { id: 'preview-data' });
                    
                    const requestBody = {
                      apiEndpoint: formData.apiEndpoint,
                      authType: formData.authType || 'none',
                      apiKey: formData.apiKey || '',
                      bearerToken: formData.bearerToken || '',
                      username: formData.username || '',
                      password: formData.password || '',
                      changeDetectionMethod: formData.changeDetectionMethod || 'array_length',
                      serviceName: formData.serviceName || 'Unknown API',
                      // ADD FIELD FILTERING TO PREVIEW
                      selectedFields: formData.selectedFields || [],
                      targetFields: formData.targetFields || [],
                      excludeFields: formData.excludeFields || [],
                      summaryMode: formData.summaryMode || false,
                      maxRecords: formData.maxRecords || 10,
                      maxTokens: formData.maxTokens || 4000
                    };
                    
                    console.log('🔍 Request body:', requestBody);
                    
                    // Use the simpler backend endpoint that doesn't rely on AI
                    const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling-simple', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(requestBody)
                    });
                    
                    console.log('🔍 Response status:', response.status, response.statusText);
                    console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
                    
                    if (!response.ok) {
                      const errorText = await response.text();
                      console.error('🔍 Error response:', errorText);
                      toast.error(`❌ Failed to fetch data: ${response.status}`, {
                        id: 'preview-data',
                        duration: 4000
                      });
                      return;
                    }
                    
                    const result = await response.json();
                    console.log('🔍 Parsed result:', result);
                    
                    if (result.success && result.sample_data) {
                      console.log('🔍 Success! Sample data received:', result.sample_data);
                      
                      // Create a user-friendly data preview
                      let previewText = "📊 Data Structure Preview:\n\n";
                      
                      // Show filtering status
                      if (result.filtering_applied) {
                        const selectedCount = (formData.selectedFields || []).length;
                        const targetCount = (formData.targetFields || []).length;
                        const excludeCount = (formData.excludeFields || []).length;
                        
                        previewText += "🎯 FILTERED DATA (What Your Agent Will Receive):\n";
                        if (selectedCount > 0) {
                          previewText += `✅ Selected ${selectedCount} specific fields\n`;
                        }
                        if (targetCount > 0) {
                          previewText += `✅ Including ${targetCount} target fields\n`;
                        }
                        if (excludeCount > 0) {
                          previewText += `✅ Excluding ${excludeCount} unwanted fields\n`;
                        }
                        previewText += "\n";
                      } else {
                        previewText += "📋 RAW DATA (No filtering applied):\n\n";
                      }
                      
                      // Analyze the data structure for better display
                      const data = result.sample_data;
                      
                      if (Array.isArray(data)) {
                        previewText += `📋 Array with ${data.length} items\n`;
                        if (data.length > 0 && typeof data[0] === 'object') {
                          previewText += `🔑 Sample item fields: ${Object.keys(data[0]).join(', ')}\n\n`;
                          previewText += `📄 First item:\n${JSON.stringify(data[0], null, 2)}`;
                        }
                      } else if (typeof data === 'object' && data !== null) {
                        // Check for CSV parsed data (Google Sheets)
                        if (data.source === 'csv_parsed' && data.headers && data.records) {
                          previewText += `📊 Google Sheets CSV: ${data.total_rows} rows, ${data.total_columns} columns\n`;
                          previewText += `🔑 Column headers: ${data.headers.join(', ')}\n\n`;
                          
                          if (data.records.length > 0) {
                            previewText += `📄 Sample record (first row):\n`;
                            const firstRecord = data.records[0];
                            for (const [key, value] of Object.entries(firstRecord)) {
                              previewText += `  ${key}: "${value}"\n`;
                            }
                            
                            if (data.records.length > 1) {
                              previewText += `\n📄 Second record:\n`;
                              const secondRecord = data.records[1];
                              for (const [key, value] of Object.entries(secondRecord)) {
                                previewText += `  ${key}: "${value}"\n`;
                              }
                            }
                          }
                        }
                        // Check for common patterns
                        else if (data.records && Array.isArray(data.records)) {
                          previewText += `📊 Airtable-style: ${data.records.length} records\n`;
                          if (data.records.length > 0) {
                            const firstRecord = data.records[0];
                            if (firstRecord.fields) {
                              previewText += `🔑 Available fields: ${Object.keys(firstRecord.fields).join(', ')}\n\n`;
                              previewText += `📄 Sample record:\n${JSON.stringify(firstRecord, null, 2)}`;
                            }
                          }
                        } else if (data.values && Array.isArray(data.values)) {
                          previewText += `📈 Google Sheets-style: ${data.values.length} rows\n`;
                          if (data.values.length > 0) {
                            previewText += `🔑 First row (headers): ${data.values[0].join(', ')}\n`;
                            if (data.values.length > 1) {
                              previewText += `📄 Sample data row:\n${JSON.stringify(data.values[1], null, 2)}`;
                            }
                          }
                        } else {
                          // Generic object
                          previewText += `🔑 Object keys: ${Object.keys(data).join(', ')}\n\n`;
                          previewText += `📄 Sample data:\n${JSON.stringify(data, null, 2).substring(0, 400)}...`;
                        }
                      } else {
                        previewText += `📄 Raw data:\n${JSON.stringify(data, null, 2)}`;
                      }
                      
                      // Truncate if too long
                      if (previewText.length > 800) {
                        previewText = previewText.substring(0, 800) + '\n\n... (truncated)';
                      }
                      
                      if (result.filtering_applied) {
                        previewText += '\n\n🎯 This filtered data is what your agent will receive!';
                        previewText += '\n💡 Raw data has been filtered based on your field selections.';
                      } else {
                        previewText += '\n\n📋 This raw data is what your agent will receive!';
                        previewText += '\n💡 No field filtering applied - agent gets all data.';
                      }
                      
                      toast.success(previewText, {
                        id: 'preview-data',
                        duration: 12000,
                        style: {
                          maxWidth: '700px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap'
                        }
                      });
                      
                      // Also log full data to console for developers
                      console.log('🔍 Full Data Preview for Agent:', result.sample_data);
                      console.log('📊 Data Structure Analysis:', result.data_structure);
                      
                    } else {
                      console.error('🔍 Request failed:', result);
                      toast.error(`❌ ${result.error || 'Failed to fetch data preview'}`, {
                        id: 'preview-data',
                        duration: 6000
                      });
                    }
                    
                  } catch (error) {
                    console.error('🔍 Exception caught:', error);
                    toast.error(`❌ Preview error: ${error.message}`, {
                      id: 'preview-data',
                      duration: 6000
                    });
                  }
                }}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded transition-colors"
              >
                🔍 Preview Data
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    toast.loading('🤖 AI is analyzing your API...', { id: 'test-connection' });
                    
                    // Check if this is a CSV endpoint (Google Sheets, etc.)
                    if (formData.apiEndpoint && (formData.apiEndpoint.includes('output=csv') || formData.apiEndpoint.includes('export?format=csv'))) {
                      // For CSV endpoints, use the simple test instead of AI analysis
                      toast.success('📊 CSV endpoint detected - using simple analysis instead of AI', {
                        id: 'test-connection',
                        duration: 3000
                      });
                      
                      // Trigger the simple preview instead
                      setTimeout(() => {
                        document.querySelector('button[onclick*="preview-data"]')?.click();
                      }, 500);
                      return;
                    }
                    
                    // Use the backend debug endpoint with AI analysis
                    const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        apiEndpoint: formData.apiEndpoint,
                        authType: formData.authType || 'none',
                        apiKey: formData.apiKey || '',
                        bearerToken: formData.bearerToken || '',
                        username: formData.username || '',
                        password: formData.password || '',
                        changeDetectionMethod: formData.changeDetectionMethod || 'array_length',
                        serviceName: formData.serviceName || 'Unknown API'
                      })
                    });
                    
                    // Check if response is ok first
                    if (!response.ok) {
                      const errorText = await response.text();
                      toast.error(`❌ Server error (${response.status}): ${errorText.substring(0, 100)}`, {
                        id: 'test-connection',
                        duration: 6000
                      });
                      console.error('Server error:', response.status, errorText);
                      return;
                    }
                    
                    // Try to parse JSON with error handling
                    let result;
                    try {
                      const responseText = await response.text();
                      if (!responseText.trim()) {
                        throw new Error('Empty response from server');
                      }
                      result = JSON.parse(responseText);
                    } catch (jsonError) {
                      toast.error(`❌ Invalid response from server: ${jsonError.message}`, {
                        id: 'test-connection',
                        duration: 6000
                      });
                      console.error('JSON parsing error:', jsonError);
                      return;
                    }
                    
                    if (result.success) {
                      const { data_structure, change_detection_info, ai_insights } = result;
                      
                      // Show success message with AI insights
                      let message = `✅ API connection successful!`;
                      
                      if (data_structure?.records_count !== undefined) {
                        message += ` Found ${data_structure.records_count} items.`;
                      } else if (data_structure?.item_count !== undefined) {
                        message += ` Found ${data_structure.item_count} items.`;
                      } else if (data_structure?.keys) {
                        message += ` Found data with keys: ${data_structure.keys.slice(0, 3).join(', ')}${data_structure.keys.length > 3 ? '...' : ''}`;
                      }
                      
                      toast.success(message, { 
                        id: 'test-connection',
                        duration: 8000
                      });
                      
                      // Log detailed AI analysis
                      console.log('🤖 AI API Analysis:', result);
                      console.log('📊 Data Structure:', data_structure);
                      console.log('🎯 Change Detection Recommendations:', change_detection_info);
                      if (ai_insights) {
                        console.log('🔍 AI Service Insights:', ai_insights);
                      }
                      
                      // Debug: Log the full result structure
                      console.log('🔧 DEBUG: Full result keys:', Object.keys(result));
                      console.log('🔧 DEBUG: change_detection_info keys:', change_detection_info ? Object.keys(change_detection_info) : 'undefined');
                      
                      // Show AI recommendations - ONLY if AI actually provided them
                      if (change_detection_info?.explanation) {
                        setTimeout(() => {
                          toast.success(
                            `🤖 AI Recommendation: ${change_detection_info.explanation}`,
                            { duration: 6000 }
                          );
                        }, 1000);
                      }
                      
                      // Show AI recommended method if different from current
                      if (change_detection_info?.ai_recommended_method && 
                          change_detection_info.ai_recommended_method !== formData.changeDetectionMethod) {
                        setTimeout(() => {
                          toast.success(
                            `💡 AI suggests using "${change_detection_info.ai_recommended_method}" method for better results`,
                            { duration: 8000 }
                          );
                        }, 1500);
                      }
                      
                      // Show suggested field paths if available
                      if (change_detection_info?.suggested_paths && change_detection_info.suggested_paths.length > 0) {
                        setTimeout(() => {
                          toast.success(
                            `💡 Suggested monitoring paths: ${change_detection_info.suggested_paths.slice(0, 2).join(', ')}`,
                            { duration: 8000 }
                          );
                        }, 2000);
                      }
                      
                      // Show service insights if detected
                      if (ai_insights?.detected_service) {
                        setTimeout(() => {
                          toast.success(
                            `🔍 AI detected service: ${ai_insights.detected_service} (${ai_insights.api_type || 'API'})`,
                            { duration: 6000 }
                          );
                        }, 2500);
                      }
                      
                      // Show data structure summary
                      if (data_structure) {
                        const itemCount = data_structure.records_count || data_structure.item_count || data_structure.keys?.length;
                        const serviceName = ai_insights?.detected_service || formData.serviceName || 'API';
                        
                        if (itemCount !== undefined) {
                          setTimeout(() => {
                            toast.success(
                              `📊 Analysis Complete: ${serviceName} with ${itemCount} ${data_structure.records_count ? 'records' : data_structure.item_count ? 'items' : 'fields'} detected`,
                              { duration: 6000 }
                            );
                          }, 3000);
                        }
                      }
                      
                    } else {
                      // Show error with AI suggestion if available
                      let errorMessage = result.error || 'Unknown error occurred';
                      if (result.ai_suggestion) {
                        errorMessage += ` | AI Suggestion: ${result.ai_suggestion}`;
                      }
                      
                      toast.error(`❌ ${errorMessage}`, {
                        id: 'test-connection',
                        duration: 8000
                      });
                      console.error('API test failed:', result);
                    }
                    
                  } catch (error) {
                    toast.error(`❌ Connection error: ${error.message}`, {
                      id: 'test-connection',
                      duration: 6000
                    });
                    console.error('API test error:', error);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🤖 AI-Powered API Analysis & Test
              </button>
            </div>
            
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>💡 Pro Tip:</strong> Use <strong>"Preview Data"</strong> to see exactly what your agent will receive, then craft better prompts in the Agent node!
            </div>
          </div>
          
          {/* Individual Node Testing */}
          <div className="mb-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">🧪 Individual Node Testing</h3>
              <p className="text-sm text-green-700 mb-3">
                Test each component independently before running the full workflow
              </p>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.apiEndpoint) {
                      toast.error('Please configure the trigger first');
                      return;
                    }
                    
                    try {
                      toast.loading('🔄 Testing trigger only...', { id: 'test-trigger' });
                      
                      // Test just the trigger configuration
                      const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          apiEndpoint: formData.apiEndpoint,
                          authType: formData.authType || 'none',
                          apiKey: formData.apiKey || '',
                          bearerToken: formData.bearerToken || '',
                          username: formData.username || '',
                          password: formData.password || '',
                          changeDetectionMethod: formData.changeDetectionMethod || 'array_length',
                          serviceName: formData.serviceName || 'Unknown API'
                        })
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                          toast.success(`✅ Trigger Test Passed! Connected to ${result.service_detected || formData.serviceName}`, {
                            id: 'test-trigger',
                            duration: 4000
                          });
                        } else {
                          toast.error(`❌ Trigger Test Failed: ${result.error}`, {
                            id: 'test-trigger',
                            duration: 4000
                          });
                        }
                      } else {
                        toast.error(`❌ Trigger Test Failed: ${response.status}`, {
                          id: 'test-trigger',
                          duration: 4000
                        });
                      }
                    } catch (error) {
                      toast.error(`❌ Trigger Test Error: ${error.message}`, {
                        id: 'test-trigger',
                        duration: 4000
                      });
                    }
                  }}
                  className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded transition-colors"
                >
                  🔄 Test Trigger Only
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    toast('💡 To test the Agent: Go to Agent node → Use "Test Agent" button with sample data from Preview Data', {
                      duration: 6000,
                      icon: '💡'
                    });
                  }}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors"
                >
                  🤖 Test Agent (Guide)
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    toast('💡 To test the Task: Go to Task node → Use "Test Task" button after agent is configured', {
                      duration: 6000,
                      icon: '💡'
                    });
                  }}
                  className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-sm rounded transition-colors"
                >
                  📋 Test Task (Guide)
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    toast('💡 Full workflow test: Use the "▶️ Run Crew" button to test the complete flow', {
                      duration: 6000,
                      icon: '💡'
                    });
                  }}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded transition-colors"
                >
                  🚀 Test Full Flow (Guide)
                </button>
              </div>
              
              <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs">
                <strong>🎯 Testing Strategy:</strong> 
                <br />1. Test Trigger → 2. Preview Data → 3. Configure Agent with real data → 4. Test Agent → 5. Test Task → 6. Run Full Flow
              </div>
            </div>
          </div>
          
          {/* Quick Data Summary */}
          {formData.apiEndpoint && (
            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">📋 Current Configuration</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Service:</strong> {formData.serviceName || 'Unknown'}</div>
                  <div><strong>Endpoint:</strong> <code className="bg-gray-200 px-1 rounded text-xs">{formData.apiEndpoint}</code></div>
                  <div><strong>Auth:</strong> {formData.authType || 'none'}</div>
                  <div><strong>Detection:</strong> {formData.changeDetectionMethod || 'array_length'}</div>
                  <div><strong>Interval:</strong> Every {Math.floor((formData.pollingInterval || 300) / 60)} minutes</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Use "Preview Data" to see what your agent will receive from this API
                </div>
              </div>
            </div>
          )}

          {/* Test Data Approval Workflow */}
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!formData.apiEndpoint) {
                    toast.error('Please set API endpoint first');
                    return;
                  }
                  
                  try {
                    toast.loading('🔍 Testing data approval workflow...', { id: 'test-approval' });
                    
                    // Simulate the approval workflow
                    const mockChanges = [
                      {
                        type: "new",
                        id: "record_1",
                        data: {
                          "baseToken.symbol": "PEPE",
                          "priceUsd": "0.00001234",
                          "volume.h24": 1000000,
                          "liquidity.usd": 500000
                        }
                      },
                      {
                        type: "modified",
                        id: "record_2", 
                        data: {
                          "baseToken.symbol": "DOGE",
                          "priceUsd": "0.08456",
                          "volume.h24": 2000000,
                          "liquidity.usd": 750000
                        }
                      }
                    ];
                    
                    // Show approval interface
                    const approvalMessage = `
🔍 Data Approval Required

${mockChanges.length} changes detected:
• ${mockChanges.filter(r => r.type === 'new').length} new records
• ${mockChanges.filter(r => r.type === 'modified').length} modified records

Selected Fields: ${(formData.selectedFields || ['All fields']).join(', ')}

In the real workflow:
1. ✅ You review the actual data
2. ✅ Select which records to process  
3. ✅ Agent only gets approved data
4. ✅ Future polling uses same settings

This prevents unwanted data from reaching your agent!
                    `;
                    
                    toast.success(approvalMessage, {
                      id: 'test-approval',
                      duration: 10000,
                      style: {
                        maxWidth: '500px',
                        fontSize: '12px',
                        whiteSpace: 'pre-line'
                      }
                    });
                    
                  } catch (error) {
                    toast.error(`Error: ${error.message}`, { id: 'test-approval' });
                  }
                }}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded transition-colors"
              >
                🧪 Test Approval Workflow
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const workflow = `
🎯 Your New Workflow:

1. 🔍 Trigger detects API changes
2. 📋 You review detected data  
3. ✅ Select what to send to agent
4. 🤖 Agent processes only approved data
5. ⚡ Future runs use same settings

Benefits:
• ✅ Full control over agent input
• ✅ No unwanted data processing  
• ✅ Universal for any API
• ✅ Clean, focused results
                  `;
                  
                  toast.success(workflow, {
                    duration: 8000,
                    style: {
                      maxWidth: '400px',
                      fontSize: '12px',
                      whiteSpace: 'pre-line'
                    }
                  });
                }}
                className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors"
              >
                💡 How It Works
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

TriggerEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default TriggerEditor;