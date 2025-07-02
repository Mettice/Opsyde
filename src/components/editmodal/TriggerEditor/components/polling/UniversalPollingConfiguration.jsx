import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

// Sub-components
import EndpointConfiguration from './EndpointConfiguration';
import AuthenticationSection from './AuthenticationSection';
import ChangeDetectionSection from './ChangeDetectionSection';
import DataFilteringSection from './DataFilteringSection';
import TestingSection from './TestingSection';
import ConfigurationSummary from './ConfigurationSummary';
import { LLMConfigSection } from '../../../shared/LLMConfigSection';
import VisualServiceExplorer from './VisualServiceExplorer';

const SERVICE_PRESETS = [
  {
    name: 'Airtable',
    endpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
    authType: 'api_key',
    pollingInterval: 600,
    changeDetection: 'array_length',
    hint: 'Monitor Airtable base for new/updated records.'
  },
  {
    name: 'Google Sheets',
    endpoint: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0',
    authType: 'none',
    pollingInterval: 600,
    changeDetection: 'response_hash',
    hint: 'Monitor Google Sheets for changes.'
  },
  {
    name: 'Slack',
    endpoint: 'https://slack.com/api/conversations.history?channel=YOUR_CHANNEL_ID',
    authType: 'bearer_token',
    pollingInterval: 300,
    changeDetection: 'array_length',
    hint: 'Monitor Slack channel for new messages.'
  }
];

const UniversalPollingConfiguration = ({ formData, handleInputChange }) => {
  // BYOK Integration - Load API Keys from API Key Manager
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [useVisualMode, setUseVisualMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basics: true,
    advanced: false,
    testing: false
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [serviceHint, setServiceHint] = useState('');

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

  // Auto-detect service hint
  useEffect(() => {
    if (!formData.apiEndpoint) {
      setServiceHint('');
      return;
    }
    const url = formData.apiEndpoint.toLowerCase();
    if (url.includes('airtable.com')) setServiceHint('Airtable detected. Use API Key authentication.');
    else if (url.includes('slack.com')) setServiceHint('Slack detected. Use Bearer Token authentication.');
    else if (url.includes('google.com')) setServiceHint('Google Sheets detected. Use CSV export URL.');
    else setServiceHint('');
  }, [formData.apiEndpoint]);

  // Sync local state with formData when formData changes (fix for re-editing)
  useEffect(() => {
    // Reset local state to match formData
    setShowQuickStart(false);
    setUseVisualMode(false);
    setExpandedSections({
      basics: true,
      advanced: false,
      testing: false
    });
    setShowAdvanced(false);
    setTestResult(null);
    setTesting(false);
    
    // Update service hint based on current formData
    if (formData.apiEndpoint) {
      const url = formData.apiEndpoint.toLowerCase();
      if (url.includes('airtable.com')) setServiceHint('Airtable detected. Use API Key authentication.');
      else if (url.includes('slack.com')) setServiceHint('Slack detected. Use Bearer Token authentication.');
      else if (url.includes('google.com')) setServiceHint('Google Sheets detected. Use CSV export URL.');
      else setServiceHint('');
    }
  }, [formData.apiEndpoint, formData.serviceName, formData.authType, formData.pollingInterval, formData.changeDetectionMethod]);

  // Quick start presets
  const quickStartPresets = [
    {
      name: "🔥 Crypto Monitor",
      description: "Live crypto price tracking",
      config: {
        serviceName: 'DexScreener',
        apiEndpoint: 'https://api.dexscreener.com/latest/dex/search?q=PEPE',
        authType: 'none',
        pollingInterval: '300',
        changeDetectionMethod: 'array_length'
      }
    },
    {
      name: "📊 Airtable Sync",
      description: "Monitor database changes",
      config: {
        serviceName: 'Airtable',
        apiEndpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
        authType: 'api_key',
        pollingInterval: '600',
        changeDetectionMethod: 'array_length'
      }
    },
    {
      name: "📈 Sheets Monitor",
      description: "Track spreadsheet updates",
      config: {
        serviceName: 'Google Sheets',
        apiEndpoint: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0&usp=sharing',
        authType: 'none',
        pollingInterval: '600',
        changeDetectionMethod: 'response_hash'
      }
    },
    {
      name: "💬 Slack Monitor",
      description: "Watch channel messages",
      config: {
        serviceName: 'Slack',
        apiEndpoint: 'https://slack.com/api/conversations.history?channel=YOUR_CHANNEL_ID',
        authType: 'bearer_token',
        pollingInterval: '300',
        changeDetectionMethod: 'array_length'
      }
    }
  ];

  const applyQuickStart = (preset) => {
    Object.entries(preset.config).forEach(([key, value]) => {
      handleInputChange({ target: { name: key, value } });
    });
    setShowQuickStart(false);
    toast.success(`🚀 ${preset.name} applied! Update placeholders and test.`, {
      duration: 4000
    });
  };

  const handleServiceSelected = (service) => {
    setUseVisualMode(false);
    toast.success(`🎯 ${service.name} selected! Continue below.`, {
      duration: 3000
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Test connection handler
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(formData.apiEndpoint, { method: 'GET' });
      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      setTestResult({ success: true, data });
      toast.success('Connection successful!');
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      toast.error('Connection failed.');
    } finally {
      setTesting(false);
    }
  };

  // Apply preset
  const applyPreset = preset => {
    handleInputChange({ target: { name: 'apiEndpoint', value: preset.endpoint } });
    handleInputChange({ target: { name: 'authType', value: preset.authType } });
    handleInputChange({ target: { name: 'pollingInterval', value: preset.pollingInterval } });
    handleInputChange({ target: { name: 'changeDetectionMethod', value: preset.changeDetection } });
    toast.success(`${preset.name} preset applied!`);
  };

  // Helper component for info tooltips
  const InfoTooltip = ({ children, tooltip }) => (
    <div className="group relative inline-block">
      {children}
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {tooltip}
        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-200/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🔄</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                Universal API Monitor
                <InfoTooltip tooltip="Monitor ANY API for real-time changes. Works with 1000+ services including crypto, databases, social media, and more.">
                  <span className="text-blue-500 cursor-help text-sm">ℹ️</span>
                </InfoTooltip>
              </h3>
              <p className="text-sm text-gray-600">Monitor any API for real-time changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Selection Mode */}
      {useVisualMode ? (
        <VisualServiceExplorer 
          formData={formData}
          handleInputChange={handleInputChange}
          onServiceSelected={handleServiceSelected}
        />
      ) : (
        <>
          {/* Presets */}
          <div className="flex gap-2 mb-2">
            {SERVICE_PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs"
                onClick={() => applyPreset(preset)}
              >
                {preset.name} Preset
              </button>
            ))}
          </div>
          {/* Essential Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint URL</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                value={formData.apiEndpoint || ''}
                onChange={e => handleInputChange({ target: { name: 'apiEndpoint', value: e.target.value } })}
                placeholder="https://api.example.com/data"
              />
              {serviceHint && <div className="text-xs text-blue-600 mt-1">{serviceHint}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={formData.authType || 'none'}
                onChange={e => handleInputChange({ target: { name: 'authType', value: e.target.value } })}
              >
                <option value="none">None</option>
                <option value="api_key">API Key</option>
                <option value="bearer_token">Bearer Token</option>
                <option value="basic_auth">Basic Auth</option>
              </select>
              {/* Dynamic Auth Inputs */}
              {formData.authType === 'api_key' && (
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 mt-2"
                  placeholder="Enter API Key"
                  value={formData.apiKey || ''}
                  onChange={e => handleInputChange({ target: { name: 'apiKey', value: e.target.value } })}
                />
              )}
              {formData.authType === 'bearer_token' && (
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 mt-2"
                  placeholder="Enter Bearer Token"
                  value={formData.bearerToken || ''}
                  onChange={e => handleInputChange({ target: { name: 'bearerToken', value: e.target.value } })}
                />
              )}
              {formData.authType === 'basic_auth' && (
                <div className="flex flex-col gap-2 mt-2">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    placeholder="Username"
                    value={formData.username || ''}
                    onChange={e => handleInputChange({ target: { name: 'username', value: e.target.value } })}
                  />
                  <input
                    type="password"
                    className="w-full border rounded px-2 py-1"
                    placeholder="Password"
                    value={formData.password || ''}
                    onChange={e => handleInputChange({ target: { name: 'password', value: e.target.value } })}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Polling Interval (seconds)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={formData.pollingInterval || 300}
                min={10}
                onChange={e => handleInputChange({ target: { name: 'pollingInterval', value: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Detection Method</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={formData.changeDetectionMethod || 'array_length'}
                onChange={e => handleInputChange({ target: { name: 'changeDetectionMethod', value: e.target.value } })}
              >
                <option value="array_length">Array Length</option>
                <option value="field_value">Field Value</option>
                <option value="timestamp">Timestamp</option>
                <option value="response_hash">Response Hash</option>
              </select>
            </div>
          </div>

          {/* Add TestingSection for AI-powered analysis/test */}
          <TestingSection formData={formData} handleInputChange={handleInputChange} />

          {/* Advanced Options */}
          <div>
            <button
              type="button"
              className="text-xs text-blue-700 underline"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
            {showAdvanced && (
              <div className="mt-2 space-y-2">
                {/* Custom headers, data filtering, etc. can go here */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Custom Headers (JSON)</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 text-xs"
                    value={formData.customHeaders || ''}
                    onChange={e => handleInputChange({ target: { name: 'customHeaders', value: e.target.value } })}
                    placeholder='{"Authorization": "Bearer ..."}'
                  />
                </div>
                {/* Add more advanced options as needed */}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

UniversalPollingConfiguration.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default UniversalPollingConfiguration; 