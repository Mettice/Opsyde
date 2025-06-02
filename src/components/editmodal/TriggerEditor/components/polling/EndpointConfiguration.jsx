import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const EndpointConfiguration = ({ formData, handleInputChange }) => {
  const apiTemplates = [
    {
      name: 'Airtable',
      icon: '📊',
      serviceName: 'Airtable',
      endpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
      authType: 'api_key',
      bgColor: 'bg-blue-100 hover:bg-blue-200',
      textColor: 'text-blue-700'
    },
    {
      name: 'Notion',
      icon: '📝',
      serviceName: 'Notion',
      endpoint: 'https://api.notion.com/v1/databases/YOUR_DATABASE_ID/query',
      authType: 'bearer_token',
      bgColor: 'bg-purple-100 hover:bg-purple-200',
      textColor: 'text-purple-700'
    },
    {
      name: 'Google Sheets (CSV)',
      icon: '📈',
      serviceName: 'Google Sheets',
      endpoint: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0&usp=sharing',
      authType: 'none',
      changeDetectionMethod: 'response_hash',
      bgColor: 'bg-green-100 hover:bg-green-200',
      textColor: 'text-green-700'
    },
    {
      name: 'Google Sheets API',
      icon: '📊',
      serviceName: 'Google Sheets API',
      endpoint: 'https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1?key=YOUR_API_KEY',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-green-100 hover:bg-green-200',
      textColor: 'text-green-700'
    },
    {
      name: 'Slack',
      icon: '💬',
      serviceName: 'Slack',
      endpoint: 'https://slack.com/api/conversations.history?channel=YOUR_CHANNEL_ID',
      authType: 'bearer_token',
      bgColor: 'bg-orange-100 hover:bg-orange-200',
      textColor: 'text-orange-700'
    },
    {
      name: 'GitHub',
      icon: '🐙',
      serviceName: 'GitHub',
      endpoint: 'https://api.github.com/repos/OWNER/REPO/issues',
      authType: 'bearer_token',
      bgColor: 'bg-gray-100 hover:bg-gray-200',
      textColor: 'text-gray-700'
    },
    {
      name: 'Test API',
      icon: '🧪',
      serviceName: 'JSONPlaceholder',
      endpoint: 'https://jsonplaceholder.typicode.com/posts',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200',
      textColor: 'text-yellow-700'
    },
    {
      name: 'Countries API',
      icon: '🌍',
      serviceName: 'REST Countries',
      endpoint: 'https://restcountries.com/v3.1/all',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-red-100 hover:bg-red-200',
      textColor: 'text-red-700'
    }
  ];

  const handleTemplateClick = (template) => {
    handleInputChange({ target: { name: 'serviceName', value: template.serviceName } });
    handleInputChange({ target: { name: 'apiEndpoint', value: template.endpoint } });
    handleInputChange({ target: { name: 'authType', value: template.authType } });
    if (template.changeDetectionMethod) {
      handleInputChange({ target: { name: 'changeDetectionMethod', value: template.changeDetectionMethod } });
    }
  };

  const handleEndpointChange = (e) => {
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
  };

  return (
    <>
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
          onChange={handleEndpointChange}
          className="w-full p-2 border rounded"
          placeholder="https://api.example.com/endpoint or any API URL"
        />
        <div className="text-xs text-gray-500 mt-1">
          The API endpoint to monitor for changes
        </div>
        
        {/* Popular API Templates */}
        <div className="mt-2 flex flex-wrap gap-1">
          {apiTemplates.map((template, index) => (
            <button
              key={index}
              type="button"
              className={`text-xs ${template.bgColor} ${template.textColor} px-2 py-1 rounded`}
              onClick={() => handleTemplateClick(template)}
            >
              {template.icon} {template.name}
            </button>
          ))}
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
    </>
  );
};

EndpointConfiguration.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default EndpointConfiguration; 