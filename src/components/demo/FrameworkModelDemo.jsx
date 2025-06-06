import React, { useState, useEffect } from 'react';
import EnhancedFrameworkSelector from '../toolTemplates/EnhancedFrameworkSelector';

const FrameworkModelDemo = () => {
  const [selectedFramework, setSelectedFramework] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showOnlyNative, setShowOnlyNative] = useState(false);
  const [compatibilityData, setCompatibilityData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load compatibility data from API
  useEffect(() => {
    const loadCompatibilityData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/framework-models/compatibility?show_only_native=${showOnlyNative}`);
        const data = await response.json();
        
        if (data.success) {
          setCompatibilityData(data);
        } else {
          console.error('Failed to load compatibility data');
        }
      } catch (error) {
        console.error('Error loading compatibility data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompatibilityData();
  }, [showOnlyNative]);

  // Check model support
  const checkModelSupport = async () => {
    if (!selectedFramework || !selectedProvider || !selectedModel) return;
    
    try {
      const response = await fetch(
        `http://localhost:8000/framework-models/check-support/${selectedFramework}/${selectedProvider}/${selectedModel}`
      );
      const data = await response.json();
      console.log('Model Support Check:', data);
    } catch (error) {
      console.error('Error checking model support:', error);
    }
  };

  // Auto-check when all selections are made
  useEffect(() => {
    if (selectedFramework && selectedProvider && selectedModel) {
      checkModelSupport();
    }
  }, [selectedFramework, selectedProvider, selectedModel]);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
          <span className="text-lg text-gray-600">Loading framework compatibility data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Framework-Model Compatibility System
        </h1>
        <p className="text-lg text-gray-600">
          Modern automation platform supporting 10+ LLM providers across 6 AI frameworks with BYOK integration
        </p>
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-sm text-green-600 font-medium">✅ Native Support</span>
            <span className="ml-2 text-xs text-gray-500">Framework supports model natively</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-orange-600 font-medium">⚠️ Fallback Mode</span>
            <span className="ml-2 text-xs text-gray-500">Uses universal tool simulation</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Selection Controls</h3>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showOnlyNative}
              onChange={(e) => setShowOnlyNative(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show only native support</span>
          </label>
        </div>
      </div>

      {/* Main Selector */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Framework & Model Selection</h2>
        <EnhancedFrameworkSelector
          selectedFramework={selectedFramework}
          setSelectedFramework={setSelectedFramework}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          showOnlyNativeSupport={showOnlyNative}
          className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
        />
      </div>

      {/* System Statistics */}
      {compatibilityData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{compatibilityData.frameworks.length}</div>
              <div className="text-sm text-blue-700">AI Frameworks</div>
              <div className="text-xs text-blue-600 mt-1">
                {compatibilityData.frameworks.filter(f => f.user_has_keys).length} with your API keys
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{compatibilityData.user_api_keys.length}</div>
              <div className="text-sm text-green-700">Active API Keys</div>
              <div className="text-xs text-green-600 mt-1">
                From BYOK Manager
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(compatibilityData.models).reduce((total, framework) => 
                  total + Object.values(framework).reduce((fTotal, provider) => fTotal + provider.length, 0), 0
                )}
              </div>
              <div className="text-sm text-purple-700">Total Models</div>
              <div className="text-xs text-purple-600 mt-1">
                Across all frameworks
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(compatibilityData.models).reduce((total, framework) => 
                  total + Object.values(framework).reduce((fTotal, provider) => 
                    fTotal + provider.filter(m => m.native).length, 0
                  ), 0
                )}
              </div>
              <div className="text-sm text-orange-700">Native Models</div>
              <div className="text-xs text-orange-600 mt-1">
                Fully supported
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Framework Details */}
      {compatibilityData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🤖 Framework Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compatibilityData.frameworks.map(framework => (
              <div 
                key={framework.id} 
                className={`p-4 rounded-lg border ${
                  framework.user_has_keys 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{framework.icon}</span>
                    <span className="font-medium text-gray-900">{framework.name}</span>
                  </div>
                  {framework.user_has_keys ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {framework.key_count} keys
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      No keys
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{framework.description}</p>
                <div className="text-xs text-gray-500">
                  Supports: {framework.supported_providers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Selection Summary */}
      {selectedFramework && selectedProvider && selectedModel && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Current Selection</h2>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Framework</h4>
                <p className="text-sm text-gray-600">{selectedFramework}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Provider</h4>
                <p className="text-sm text-gray-600">{selectedProvider}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Model</h4>
                <p className="text-sm text-gray-600">{selectedModel}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔗 API Endpoints</h2>
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded border">
            <code className="text-sm">GET /framework-models/compatibility</code>
            <p className="text-xs text-gray-600 mt-1">Get full framework-model compatibility matrix</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <code className="text-sm">GET /framework-models/frameworks</code>
            <p className="text-xs text-gray-600 mt-1">Get available frameworks with user's API key status</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <code className="text-sm">GET /framework-models/models/{`{framework}`}/{`{provider}`}</code>
            <p className="text-xs text-gray-600 mt-1">Get models for specific framework-provider combination</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <code className="text-sm">GET /framework-models/check-support/{`{framework}`}/{`{provider}`}/{`{model}`}</code>
            <p className="text-xs text-gray-600 mt-1">Check if model is natively supported</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          🚀 CrewBuilder Framework-Model Compatibility System - Modern Automation Platform
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supporting unlimited LLM providers with BYOK integration and intelligent fallback execution
        </p>
      </div>
    </div>
  );
};

export default FrameworkModelDemo; 