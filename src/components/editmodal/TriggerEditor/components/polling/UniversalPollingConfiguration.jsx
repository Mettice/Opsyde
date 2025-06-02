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

const UniversalPollingConfiguration = ({ formData, handleInputChange }) => {
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

  return (
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

      <BYOKStatusSection 
        loadingApiKeys={loadingApiKeys}
        apiKeyError={apiKeyError}
        availableApiKeys={availableApiKeys}
      />

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

      <DataFilteringSection 
        formData={formData}
        handleInputChange={handleInputChange}
      />

      <TestingSection 
        formData={formData}
        handleInputChange={handleInputChange}
      />

      <ConfigurationSummary 
        formData={formData}
      />
    </div>
  );
};

UniversalPollingConfiguration.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default UniversalPollingConfiguration; 