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
    const [monthlyTokens, setMonthlyTokens] = useState(100000);
  
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
            if (result.settings && result.settings.api_keys) {
              result.settings.api_keys.forEach(key => {
                keyMap[key.provider] = {
                  ...key,
                  isValid: key.validation_status === 'valid'
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
            provider: providerId,
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
            provider: providerId
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Compact Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  🔑 API Key Manager
                </h1>
                <p className="text-gray-600 text-sm mt-1">Manage your API keys for external services</p>
              </div>
              
              {/* Compact Status Overview */}
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{keys ? Object.keys(keys).length : 0}</div>
                  <div className="text-xs text-gray-500">Total Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {keys ? Object.values(keys).filter(key => key?.isValid).length : 0}
                  </div>
                  <div className="text-xs text-gray-500">Valid Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{availableProviders?.length || 0}</div>
                  <div className="text-xs text-gray-500">Providers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - API Keys */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  🔐 Your API Keys
                  <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {keys ? Object.keys(keys).length : 0} configured
                  </span>
                </h2>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading API keys...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableProviders?.map(provider => (
                      <APIKeyCard
                        key={provider.id}
                        provider={provider}
                        existingKey={keys?.[provider.id]}
                        onSave={saveApiKey}
                        onValidate={validateApiKey}
                        onDelete={deleteApiKey}
                      />
                    )) || <div className="text-gray-500">No providers available</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Analytics & Tools */}
            <div className="space-y-6">
              
              {/* Usage Analytics - Compact */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  📊 Usage Analytics
                </h3>
                
                {usageStats && Object.keys(usageStats).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(usageStats).map(([provider, stats]) => (
                      <div key={provider} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            keys[provider]?.isValid ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium">{provider}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{stats?.usage_count || 0}</div>
                          <div className="text-xs text-gray-500">uses</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No usage data available</p>
                )}
              </div>

              {/* Cost Calculator - Compact */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  💰 Cost Calculator
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Token Estimate
                    </label>
                    <input
                      type="number"
                      value={monthlyTokens}
                      onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="100000"
                    />
                  </div>
                  
                  <CostCalculator providers={availableProviders} usageStats={usageStats} monthlyTokens={monthlyTokens} />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Quick Actions</h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    🔄 Refresh All Keys
                  </button>
                  
                  <button
                    onClick={() => {
                      if (keys && Object.keys(keys).length > 0) {
                        Object.keys(keys).forEach(provider => validateApiKey(provider));
                      } else {
                        toast.info('No API keys to validate');
                      }
                    }}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    ✅ Validate All Keys
                  </button>
                  
                  <button
                    onClick={() => window.open('/builder', '_blank')}
                    className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    🚀 Go to Builder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const APIKeyCard = ({ provider, existingKey, onSave, onValidate, onDelete }) => {
    const [apiKey, setApiKey] = useState(existingKey?.masked_value || '');
    const [isEditing, setIsEditing] = useState(!existingKey);
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [validating, setValidating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleTestAndSave = async () => {
      if (!apiKey.trim()) {
        toast.error('Please enter an API key');
        return;
      }

      try {
        setTesting(true);
        await onSave(provider.id, apiKey);
        setIsEditing(false);
        toast.success(`${provider.name} API key saved successfully!`);
      } catch (error) {
        toast.error(`Failed to save ${provider.name} API key: ${error.message}`);
      } finally {
        setTesting(false);
      }
    };

    const handleValidate = async () => {
      if (!existingKey) {
        toast.error('No API key to validate');
        return;
      }

      try {
        setValidating(true);
        await onValidate(provider.id);
      } catch (error) {
        toast.error(`Validation failed: ${error.message}`);
      } finally {
        setValidating(false);
      }
    };

    const handleDelete = async () => {
      if (!window.confirm(`Are you sure you want to delete the ${provider.name} API key?`)) {
        return;
      }

      try {
        setDeleting(true);
        await onDelete(provider.id);
        setApiKey('');
        setIsEditing(true);
        toast.success(`${provider.name} API key deleted`);
      } catch (error) {
        toast.error(`Failed to delete API key: ${error.message}`);
      } finally {
        setDeleting(false);
      }
    };

    const getStatusColor = () => {
      if (!existingKey) return 'bg-gray-100 text-gray-600';
      return existingKey.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    };

    const getStatusText = () => {
      if (!existingKey) return 'Not configured';
      return existingKey.isValid ? 'Valid' : 'Invalid';
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <span className="text-lg mr-2">{provider.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{provider.name}</h3>
              <p className="text-xs text-gray-500">{provider.description}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* API Key Input */}
        {isEditing ? (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider.name} API key`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? '👁️' : '🙈'}
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleTestAndSave}
                disabled={testing || !apiKey.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {testing ? '⏳ Saving...' : '💾 Save Key'}
              </button>
              
              {existingKey && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Key Display */}
            <div className="bg-gray-50 p-2 rounded border text-sm font-mono">
              {showKey ? existingKey?.key_value || 'No key' : existingKey?.masked_value || 'No key'}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors"
              >
                ✏️ Edit
              </button>
              
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-md text-sm transition-colors"
              >
                {validating ? '⏳' : '✅'} Test
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
              >
                {deleting ? '⏳' : '🗑️'}
              </button>
            </div>
            
            <button
              onClick={() => setShowKey(!showKey)}
              className="w-full text-xs text-gray-500 hover:text-gray-700"
            >
              {showKey ? '🙈 Hide key' : '👁️ Show key'}
            </button>
          </div>
        )}

        {/* Pricing Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Input:</span>
              <span>${provider.pricing?.input || '0.001'}/1K tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Output:</span>
              <span>${provider.pricing?.output || '0.002'}/1K tokens</span>
            </div>
          </div>
          
          {provider.supported_models && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Models ({provider.supported_models.length}):</div>
              <div className="flex flex-wrap gap-1">
                {provider.supported_models.slice(0, 3).map(model => (
                  <span key={model} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {model}
                  </span>
                ))}
                {provider.supported_models.length > 3 && (
                  <span className="text-xs text-gray-500">+{provider.supported_models.length - 3} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const CostCalculator = ({ providers, usageStats, monthlyTokens }) => {
    const calculateCosts = () => {
      if (!providers || !usageStats) return [];
  
      return providers.map(provider => {
        const usage = usageStats.provider_stats?.find(s => s.provider === provider.id);
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
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-lg font-semibold text-blue-900">
          Total estimated monthly cost: ${totalCost.toFixed(2)}
        </div>
        <div className="text-sm text-blue-700 mt-1">
          Based on {monthlyTokens.toLocaleString()} tokens across {costs.filter(c => c.hasKey).length} configured providers
        </div>
      </div>
    );
  };
  
  export default APIKeyManager;