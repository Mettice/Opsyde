import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { toast } from 'react-hot-toast';

const TriggerEditor = ({ formData, handleInputChange }) => {
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
                      serviceName: formData.serviceName || 'Unknown API'
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
                      
                      // Analyze the data structure for better display
                      const data = result.sample_data;
                      
                      if (Array.isArray(data)) {
                        previewText += `📋 Array with ${data.length} items\n`;
                        if (data.length > 0 && typeof data[0] === 'object') {
                          previewText += `🔑 Sample item fields: ${Object.keys(data[0]).join(', ')}\n\n`;
                          previewText += `📄 First item:\n${JSON.stringify(data[0], null, 2)}`;
                        }
                      } else if (typeof data === 'object' && data !== null) {
                        // Check for common patterns
                        if (data.records && Array.isArray(data.records)) {
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
                      
                      previewText += '\n\n💡 This is what your agent will receive!';
                      
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
                  if (!formData.apiEndpoint) {
                    toast.error('Please enter an API endpoint first');
                    return;
                  }
                  
                  try {
                    toast.loading('🤖 AI is analyzing your API...', { id: 'test-connection' });
                    
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
                    toast.info('💡 To test the Agent: Go to Agent node → Use "Test Agent" button with sample data from Preview Data', {
                      duration: 6000
                    });
                  }}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors"
                >
                  🤖 Test Agent (Guide)
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    toast.info('💡 To test the Task: Go to Task node → Use "Test Task" button after agent is configured', {
                      duration: 6000
                    });
                  }}
                  className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-sm rounded transition-colors"
                >
                  📋 Test Task (Guide)
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    toast.info('💡 Full workflow test: Use the "▶️ Run Crew" button to test the complete flow', {
                      duration: 6000
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