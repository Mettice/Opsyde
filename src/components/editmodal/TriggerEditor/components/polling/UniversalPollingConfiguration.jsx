import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

// Sub-components
import BYOKStatusSection from './BYOKStatusSection';
import EndpointConfiguration from './EndpointConfiguration';
import AuthenticationSection from './AuthenticationSection';
import ChangeDetectionSection from './ChangeDetectionSection';
import DataFilteringSection from './DataFilteringSection';
import TestingSection from './TestingSection';
import ConfigurationSummary from './ConfigurationSummary';
import { LLMConfigSection } from '../../../shared/LLMConfigSection';
import VisualServiceExplorer from './VisualServiceExplorer';

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
          
          <div className="flex gap-2">
            <InfoTooltip tooltip="Quick setup with popular presets">
              <button
                onClick={() => setShowQuickStart(true)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-medium flex items-center gap-1"
              >
                🚀 Quick Start
              </button>
            </InfoTooltip>
            
            <InfoTooltip tooltip="Switch between visual service picker and manual configuration">
              <button
                onClick={() => setUseVisualMode(!useVisualMode)}
                className={`px-3 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1 ${
                  useVisualMode 
                    ? 'bg-purple-500 text-white shadow-sm' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{useVisualMode ? '🎨' : '📋'}</span>
                {useVisualMode ? 'Visual' : 'Manual'}
              </button>
            </InfoTooltip>
          </div>
        </div>
      </div>

      {/* Quick Start Modal - Compact */}
      {showQuickStart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">🚀 Quick Start</h3>
              <button 
                onClick={() => setShowQuickStart(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              {quickStartPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyQuickStart(preset)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="font-medium text-gray-800">{preset.name}</div>
                  <div className="text-sm text-gray-600">{preset.description}</div>
                </button>
              ))}
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              💡 Presets auto-configure common services. Customize after applying.
            </div>
          </div>
        </div>
      )}

      <BYOKStatusSection 
        loadingApiKeys={loadingApiKeys}
        apiKeyError={apiKeyError}
        availableApiKeys={availableApiKeys}
      />

      <LLMConfigSection 
        formData={formData}
        handleInputChange={handleInputChange}
        framework="trigger"
        showApiKey={true}
      />

      {/* Service Selection Mode */}
      {useVisualMode ? (
        <VisualServiceExplorer 
          formData={formData}
          handleInputChange={handleInputChange}
          onServiceSelected={handleServiceSelected}
        />
      ) : (
        <>
          {/* Collapsible Sections */}
          <div className="space-y-3">
            {/* Basic Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('basics')}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚙️</span>
                  <span className="font-medium text-gray-800">Basic Configuration</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Required</span>
                </div>
                <span className={`transform transition-transform ${expandedSections.basics ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>
              
              {expandedSections.basics && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <EndpointConfiguration 
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                  <AuthenticationSection 
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                  <ChangeDetectionSection 
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('advanced')}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔧</span>
                  <span className="font-medium text-gray-800">Advanced Options</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Optional</span>
                </div>
                <span className={`transform transition-transform ${expandedSections.advanced ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>
              
              {expandedSections.advanced && (
                <div className="border-t border-gray-100 p-4">
                  <DataFilteringSection 
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                </div>
              )}
            </div>

            {/* Testing & Validation */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('testing')}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🧪</span>
                  <span className="font-medium text-gray-800">Test & Validate</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Recommended</span>
                </div>
                <span className={`transform transition-transform ${expandedSections.testing ? 'rotate-180' : ''}`}>
                  ⌄
                </span>
              </button>
              
              {expandedSections.testing && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <TestingSection 
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                  <ConfigurationSummary 
                    formData={formData}
                  />
                </div>
              )}
            </div>
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