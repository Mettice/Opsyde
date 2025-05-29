// frontend/src/components/settings/APIKeyManager.jsx - NEW COMPONENT
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const APIKeyManager = () => {
    const [keys, setKeys] = useState({});
    const [showKey, setShowKey] = useState({});
    const [loading, setLoading] = useState(true);
    const [userSettings, setUserSettings] = useState(null);
    const [availableProviders, setAvailableProviders] = useState([]);
    const [usageStats, setUsageStats] = useState(null);
  
    // Load user settings and API keys on component mount
    useEffect(() => {
      loadUserSettings();
      loadAvailableProviders();
    }, []);
  
    const loadUserSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/user-settings/');
  
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUserSettings(result.settings);
            
            // Convert API keys to the format expected by the UI
            const keyMap = {};
            if (result.settings.api_keys) {
              result.settings.api_keys.forEach(key => {
                keyMap[key.provider_id] = {
                  masked_value: key.masked_value,
                  validation_status: key.validation_status,
                  usage_count: key.usage_count,
                  created_at: key.created_at,
                  last_used: key.last_used
                };
              });
            }
            setKeys(keyMap);
            
            toast.success('Settings loaded successfully');
          } else {
            toast.error('Failed to load settings: ' + result.message);
          }
        } else {
          toast.error('Failed to connect to settings service');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Error loading settings: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
  
    const loadAvailableProviders = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/user-settings/providers');
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.providers) {
            setAvailableProviders(result.data.providers);
            console.log('Loaded providers:', result.data.providers);
          }
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      }
    };
  
    const saveApiKey = async (providerId, apiKey) => {
      try {
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider_id: providerId,
            api_key: apiKey
          })
        });
  
        const result = await response.json();
        
        if (result.success) {
          toast.success(result.message || `${providerId} API key saved successfully`);
          await loadUserSettings(); // Reload to get updated data
          return true;
        } else {
          toast.error(result.message || 'Failed to save API key');
          return false;
        }
      } catch (error) {
        console.error('Error saving API key:', error);
        toast.error('Error saving API key: ' + error.message);
        return false;
      }
    };
  
    const validateApiKey = async (providerId) => {
      try {
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider_id: providerId
          })
        });
  
        const result = await response.json();
        
        if (result.valid) {
          toast.success(`${providerId} API key is valid`);
          await loadUserSettings(); // Reload to get updated validation status
        } else {
          toast.error(`${providerId} API key is invalid: ${result.error || 'Unknown error'}`);
        }
        
        return result.valid;
      } catch (error) {
        console.error('Error validating API key:', error);
        toast.error('Error validating API key: ' + error.message);
        return false;
      }
    };
  
    const deleteApiKey = async (providerId) => {
      try {
        const response = await fetch(`http://localhost:8000/api/user-settings/api-keys/${providerId}`, {
          method: 'DELETE'
        });
  
        const result = await response.json();
        
        if (result.success) {
          toast.success(result.message || `${providerId} API key deleted successfully`);
          await loadUserSettings(); // Reload to get updated data
          return true;
        } else {
          toast.error(result.message || 'Failed to delete API key');
          return false;
        }
      } catch (error) {
        console.error('Error deleting API key:', error);
        toast.error('Error deleting API key: ' + error.message);
        return false;
      }
    };
  
    const loadUsageStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/user-settings/usage');
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUsageStats(result.data);
          }
        }
      } catch (error) {
        console.error('Error loading usage stats:', error);
      }
    };
  
    useEffect(() => {
      if (userSettings) {
        loadUsageStats();
      }
    }, [userSettings]);
  
    const keyConfigs = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'For GPT-4, GPT-3.5 models',
        icon: '🤖',
        getInstructions: () => 'Get your key from platform.openai.com/api-keys',
        testUrl: 'https://api.openai.com/v1/models',
        pricing: '$0.03 per 1K tokens (GPT-4)',
        placeholder: 'sk-...'
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'For Claude-3 models',
        icon: '🧠',
        getInstructions: () => 'Get your key from console.anthropic.com',
        pricing: '$0.015 per 1K tokens',
        placeholder: 'sk-ant-...'
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access to 50+ AI models',
        icon: '🔀',
        getInstructions: () => 'Get your key from openrouter.ai/keys',
        pricing: 'Varies by model (often cheaper)',
        placeholder: 'sk-or-...'
      },
      {
        id: 'google',
        name: 'Google AI',
        description: 'For Gemini models',
        icon: '🔍',
        getInstructions: () => 'Get your key from makersuite.google.com',
        pricing: 'Free tier available',
        placeholder: 'AI...'
      }
    ];
  
    const integrationConfigs = [
      {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'CRM integration',
        icon: '🎯',
        getInstructions: () => 'Create private app in HubSpot developer settings'
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Team notifications',
        icon: '💬',
        getInstructions: () => 'Create webhook in Slack app settings'
      }
    ];
  
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading API Key Manager...</span>
        </div>
      );
    }
  
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔑 API Key Manager</h1>
          <p className="text-gray-600">
            Manage your API keys for unlimited LLM providers. Set once, use everywhere across all workflows.
          </p>
          
          {/* Stats Summary */}
          {usageStats && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{usageStats.total_keys}</div>
                <div className="text-sm text-blue-700">Total Keys</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{usageStats.valid_keys}</div>
                <div className="text-sm text-green-700">Valid Keys</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{usageStats.invalid_keys}</div>
                <div className="text-sm text-yellow-700">Invalid Keys</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{usageStats.supported_providers}</div>
                <div className="text-sm text-purple-700">Available Providers</div>
              </div>
            </div>
          )}
        </div>
  
        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableProviders.map((provider) => (
            <APIKeyCard
              key={provider.id}
              provider={provider}
              existingKey={keys[provider.id]}
              onSave={saveApiKey}
              onValidate={validateApiKey}
              onDelete={deleteApiKey}
            />
          ))}
        </div>
  
        {/* Usage Analytics */}
        {usageStats && usageStats.provider_stats && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Usage Analytics</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Used
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usageStats.provider_stats.map((stat) => (
                      <tr key={stat.provider_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{stat.icon}</span>
                            <span className="font-medium text-gray-900">{stat.provider_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            stat.validation_status === 'valid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {stat.validation_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.usage_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.last_used ? new Date(stat.last_used).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
  
        {/* Cost Calculator */}
        <CostCalculator providers={availableProviders} usageStats={usageStats} />
      </div>
    );
  };
  
  const APIKeyCard = ({ provider, existingKey, onSave, onValidate, onDelete }) => {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);
  
    const handleTestAndSave = async () => {
      if (!apiKey.trim()) {
        toast.error('Please enter an API key');
        return;
      }
  
      setIsLoading(true);
      try {
        const success = await onSave(provider.id, apiKey);
        if (success) {
          setApiKey('');
          setShowKey(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleValidate = async () => {
      if (!existingKey) {
        toast.error('No API key to validate');
        return;
      }
  
      setIsLoading(true);
      try {
        await onValidate(provider.id);
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleDelete = async () => {
      if (!existingKey) {
        return;
      }
  
      if (window.confirm(`Are you sure you want to delete the ${provider.name} API key?`)) {
        setIsLoading(true);
        try {
          await onDelete(provider.id);
        } finally {
          setIsLoading(false);
        }
      }
    };
  
    const getStatusColor = () => {
      if (!existingKey) return 'bg-gray-100 text-gray-800';
      
      switch (existingKey.validation_status) {
        case 'valid':
          return 'bg-green-100 text-green-800';
        case 'invalid':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-yellow-100 text-yellow-800';
      }
    };
  
    const getStatusText = () => {
      if (!existingKey) return 'Not configured';
      return existingKey.validation_status || 'Unknown';
    };
  
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{provider.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
              <p className="text-sm text-gray-600">{provider.description}</p>
            </div>
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
  
        {/* Key Format Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Expected format:</div>
          <code className="text-sm font-mono text-gray-800">{provider.key_format}</code>
        </div>
  
        {/* Pricing Info */}
        {provider.pricing_info && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 mb-1">Pricing:</div>
            <div className="text-sm text-blue-800">
              {typeof provider.pricing_info === 'object' ? (
                Object.entries(provider.pricing_info).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                  </div>
                ))
              ) : (
                provider.pricing_info
              )}
            </div>
          </div>
        )}
  
        {/* Supported Models */}
        {provider.supported_models && provider.supported_models.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-600 mb-2">Supported models ({provider.supported_models.length}):</div>
            <div className="flex flex-wrap gap-1">
              {provider.supported_models.slice(0, 3).map((model) => (
                <span key={model} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {model}
                </span>
              ))}
              {provider.supported_models.length > 3 && (
                <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  +{provider.supported_models.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
  
        {/* Existing Key Info */}
        {existingKey && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-green-800">Key configured</div>
                <div className="text-xs text-green-600">
                  {existingKey.masked_value} • Used {existingKey.usage_count || 0} times
                </div>
                {existingKey.last_used && (
                  <div className="text-xs text-green-600">
                    Last used: {new Date(existingKey.last_used).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleValidate}
                  disabled={isLoading}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Validate'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* API Key Input */}
        <div className="space-y-3">
          <div>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider.name} API key`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showKey}
                  onChange={(e) => setShowKey(e.target.checked)}
                  className="mr-2"
                />
                Show key
              </label>
              <a
                href={provider.get_key_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Get API key →
              </a>
            </div>
          </div>
  
          <button
            onClick={handleTestAndSave}
            disabled={isLoading || !apiKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            {isLoading ? 'Saving...' : existingKey ? 'Update Key' : 'Save Key'}
          </button>
        </div>
      </div>
    );
  };
  
  const CostCalculator = ({ providers, usageStats }) => {
    const [monthlyTokens, setMonthlyTokens] = useState(100000);
  
    const calculateCosts = () => {
      if (!providers || !usageStats) return [];
  
      return providers.map(provider => {
        const usage = usageStats.provider_stats?.find(s => s.provider_id === provider.id);
        const hasKey = usage && usage.validation_status === 'valid';
        
        let estimatedCost = 0;
        if (provider.pricing_info && typeof provider.pricing_info === 'object') {
          // Calculate based on first model pricing if available
          const firstModel = Object.keys(provider.pricing_info)[0];
          if (firstModel && provider.pricing_info[firstModel].input) {
            estimatedCost = (monthlyTokens / 1000) * provider.pricing_info[firstModel].input;
          }
        }
  
        return {
          provider: provider.name,
          icon: provider.icon,
          hasKey,
          estimatedCost,
          usageCount: usage?.usage_count || 0
        };
      });
    };
  
    const costs = calculateCosts();
    const totalCost = costs.reduce((sum, cost) => sum + (cost.hasKey ? cost.estimatedCost : 0), 0);
  
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Cost Calculator</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated monthly tokens:
            </label>
            <input
              type="number"
              value={monthlyTokens}
              onChange={(e) => setMonthlyTokens(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costs.map((cost) => (
              <div key={cost.provider} className={`p-4 rounded-lg border ${
                cost.hasKey ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">{cost.icon}</span>
                  <span className="font-medium">{cost.provider}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {cost.hasKey ? (
                    <>
                      <div>Est. cost: ${cost.estimatedCost.toFixed(2)}/month</div>
                      <div>Usage: {cost.usageCount} times</div>
                    </>
                  ) : (
                    <div>No API key configured</div>
                  )}
                </div>
              </div>
            ))}
          </div>
  
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-lg font-semibold text-blue-900">
              Total estimated monthly cost: ${totalCost.toFixed(2)}
            </div>
            <div className="text-sm text-blue-700 mt-1">
              Based on {monthlyTokens.toLocaleString()} tokens across {costs.filter(c => c.hasKey).length} configured providers
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default APIKeyManager;