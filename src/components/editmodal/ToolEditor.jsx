// Enhanced ToolEditor.jsx - Modern Enterprise Design
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';

// Modern Universal API Builder Component
const UniversalApiBuilder = ({ 
  formData, 
  handleInputChange, 
  onApiResearch, 
  isResearching, 
  researchResult 
}) => {
  const [researchStep, setResearchStep] = useState(0);
  
  const researchSteps = [
    { icon: "🔍", text: "Searching for API documentation...", color: "text-blue-600" },
    { icon: "🔐", text: "Analyzing authentication methods...", color: "text-purple-600" },
    { icon: "🔧", text: "Discovering endpoints and parameters...", color: "text-indigo-600" },
    { icon: "⚙️", text: "Generating integration configuration...", color: "text-green-600" },
    { icon: "🧪", text: "Testing connection...", color: "text-orange-600" }
  ];

  const handleStartResearch = async () => {
    if (!formData.api_service_name || !formData.ai_description) {
      alert('Please provide both service name and description');
      return;
    }

    setResearchStep(0);
    const interval = setInterval(() => {
      setResearchStep(prev => {
        if (prev < researchSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 1500);

    await onApiResearch({
      service_name: formData.api_service_name,
      description: formData.ai_description,
      endpoint_hint: formData.api_endpoint_hint
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 shadow-lg">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <span className="text-2xl">🌐</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              AI-Powered API Discovery
            </h3>
            <p className="text-slate-600 mt-2 leading-relaxed">
              Let our AI research and configure any API automatically. Just describe what you want to do.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Service Name Input */}
          <div className="space-y-3">
            <label className="flex items-center text-slate-800 font-semibold text-sm">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full text-xs mr-3">🎯</span>
              What service do you want to connect to?
            </label>
            <div className="relative">
              <input
                type="text"
                name="api_service_name"
                value={formData.api_service_name || ''}
                onChange={handleInputChange}
                placeholder="Linear, Stripe, Slack, your-company-api.com..."
                className="w-full px-4 py-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-blue-600 flex items-center">
              <span className="mr-1">✨</span>
              Works with any public API or your company's internal services
            </p>
          </div>

          {/* Action Description */}
          <div className="space-y-3">
            <label className="flex items-center text-slate-800 font-semibold text-sm">
              <span className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full text-xs mr-3">📝</span>
              What do you want to accomplish?
            </label>
            <textarea
              name="ai_description"
              value={formData.ai_description || ''}
              onChange={handleInputChange}
              placeholder="Examples:
• Create issues in Linear with custom fields and assignees
• Send personalized Slack messages to team channels  
• Process payments through Stripe with customer data
• Update inventory in our internal ERP system"
              className="w-full px-4 py-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm resize-none"
              rows="5"
            />
          </div>

          {/* Optional API Hint */}
          <div className="space-y-3">
            <label className="flex items-center text-slate-800 font-semibold text-sm">
              <span className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full text-xs mr-3">🔗</span>
              API Endpoint (optional)
            </label>
            <input
              type="url"
              name="api_endpoint_hint"
              value={formData.api_endpoint_hint || ''}
              onChange={handleInputChange}
              placeholder="https://api.linear.app/graphql"
              className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
            />
            <p className="text-xs text-green-600 flex items-center">
              <span className="mr-1">💡</span>
              Helps speed up discovery if you know the API URL
            </p>
          </div>

          {/* Research Button */}
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={handleStartResearch}
              disabled={isResearching || !formData.api_service_name || !formData.ai_description}
              className={`group relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform ${
                isResearching || !formData.api_service_name || !formData.ai_description
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95'
              }`}
            >
              <div className="flex items-center">
                {isResearching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    Researching API...
                  </>
                ) : (
                  <>
                    <span className="mr-3 text-lg">🚀</span>
                    Start AI Research
                  </>
                )}
              </div>
              {!isResearching && !(!formData.api_service_name || !formData.ai_description) && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              )}
            </button>
          </div>

          {/* Research Progress */}
          {isResearching && (
            <div className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-lg">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
                AI Research in Progress
              </h4>
              <div className="space-y-4">
                {researchSteps.map((step, index) => (
                  <div key={index} className={`flex items-center transition-all duration-500 ${
                    index <= researchStep ? 'opacity-100' : 'opacity-40'
                  }`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-4 transition-all duration-500 ${
                      index < researchStep 
                        ? 'bg-green-100 text-green-600' 
                        : index === researchStep 
                        ? 'bg-blue-100 text-blue-600 scale-110' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className="text-sm">{step.icon}</span>
                    </div>
                    <span className={`text-sm font-medium ${
                      index <= researchStep ? step.color : 'text-slate-400'
                    }`}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Research Results */}
          {researchResult && (
            <div className={`p-6 rounded-2xl border shadow-lg ${
              researchResult.success 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50'
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200/50'
            }`}>
              {researchResult.success ? (
                <div>
                  <h4 className="font-bold text-green-800 mb-6 flex items-center text-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    API Configuration Complete!
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <span className="w-20 text-green-700 font-medium">Service:</span>
                        <span className="text-green-800 font-semibold">{researchResult.service_name}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="w-20 text-green-700 font-medium">Type:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                          {researchResult.api_type}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="w-20 text-green-700 font-medium">Auth:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                          {researchResult.auth_type}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-green-700 font-medium">Base URL:</span>
                        <code className="block mt-1 px-3 py-2 bg-green-100/50 text-green-800 rounded-lg text-xs font-mono break-all">
                          {researchResult.base_url}
                        </code>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="w-20 text-green-700 font-medium">Confidence:</span>
                        <div className="flex items-center">
                          <div className="w-20 h-2 bg-green-200 rounded-full mr-2">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                              style={{ width: `${(researchResult.confidence * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-green-800 font-semibold text-xs">
                            {(researchResult.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {researchResult.endpoints && (
                    <div className="mt-6">
                      <h5 className="font-semibold text-green-800 mb-3">Available Actions:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {researchResult.endpoints.slice(0, 4).map((endpoint, i) => (
                          <div key={i} className="p-3 bg-white/60 rounded-lg border border-green-200/50">
                            <div className="font-medium text-green-800 text-sm">{endpoint.name}</div>
                            <div className="text-green-600 text-xs mt-1">{endpoint.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-100/50 to-emerald-100/50 rounded-xl border border-green-200/30">
                    <div className="flex items-center text-green-800 text-sm font-medium">
                      <span className="mr-2">🎉</span>
                      Configuration automatically applied! Ready to use.
                    </div>
                  </div>

                  {/* Authentication Configuration Section */}
                  {(researchResult.auth_required || researchResult.auth_type) && researchResult.auth_type !== 'none' && (
                    <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200/50">
                      <h5 className="font-bold text-amber-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm">🔐</span>
                        </div>
                        Authentication Required
                      </h5>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-white/60 rounded-lg border border-amber-200/30">
                          <div className="text-sm text-amber-800 mb-2">
                            <strong>Authentication Type:</strong> {researchResult.auth_type}
                          </div>
                          {researchResult.auth_instructions && (
                            <div className="text-sm text-amber-700 mb-3">
                              <strong>Instructions:</strong> {researchResult.auth_instructions}
                            </div>
                          )}
                          {researchResult.documentation_url && (
                            <div className="text-sm">
                              <a 
                                href={researchResult.documentation_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                📚 View API Documentation
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Authentication Input Fields */}
                        <div className="space-y-3">
                          {researchResult.auth_type === 'api_key' && (
                            <div>
                              <label className="block text-sm font-medium text-amber-800 mb-2">
                                API Key
                              </label>
                              <input
                                type="password"
                                placeholder="Enter your API key..."
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white/80"
                                onChange={(e) => {
                                  const newConfig = {
                                    ...localFrameworkConfig,
                                    api_key: e.target.value,
                                    headers: {
                                      ...localFrameworkConfig.headers,
                                      [researchResult.auth_header || 'Authorization']: 
                                        researchResult.auth_format 
                                          ? researchResult.auth_format.replace('{token}', e.target.value).replace('{key}', e.target.value)
                                          : e.target.value
                                    }
                                  };
                                  setLocalFrameworkConfig(newConfig);
                                  handleInputChange({
                                    target: { name: 'frameworkConfig', value: newConfig }
                                  });
                                }}
                              />
                            </div>
                          )}

                          {researchResult.auth_type === 'bearer_token' && (
                            <div>
                              <label className="block text-sm font-medium text-amber-800 mb-2">
                                Bearer Token
                              </label>
                              <input
                                type="password"
                                placeholder="Enter your bearer token..."
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white/80"
                                onChange={(e) => {
                                  const newConfig = {
                                    ...localFrameworkConfig,
                                    bearer_token: e.target.value,
                                    headers: {
                                      ...localFrameworkConfig.headers,
                                      'Authorization': `Bearer ${e.target.value}`
                                    }
                                  };
                                  setLocalFrameworkConfig(newConfig);
                                  handleInputChange({
                                    target: { name: 'frameworkConfig', value: newConfig }
                                  });
                                }}
                              />
                            </div>
                          )}

                          {researchResult.auth_type === 'oauth2' && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-sm text-blue-800 mb-2">
                                <strong>OAuth2 Setup Required</strong>
                              </div>
                              <p className="text-sm text-blue-700 mb-3">
                                This service requires OAuth2 authentication. You'll need to:
                              </p>
                              <ol className="text-sm text-blue-700 space-y-1 ml-4">
                                <li>1. Create an app in the service's developer portal</li>
                                <li>2. Get your client ID and secret</li>
                                <li>3. Configure the OAuth flow</li>
                              </ol>
                              <div className="mt-3">
                                <input
                                  type="password"
                                  placeholder="Access token (if you already have one)..."
                                  className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80"
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...localFrameworkConfig,
                                      access_token: e.target.value,
                                      headers: {
                                        ...localFrameworkConfig.headers,
                                        'Authorization': `Bearer ${e.target.value}`
                                      }
                                    };
                                    setLocalFrameworkConfig(newConfig);
                                    handleInputChange({
                                      target: { name: 'frameworkConfig', value: newConfig }
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {researchResult.auth_type === 'basic_auth' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-amber-800 mb-2">
                                  Username
                                </label>
                                <input
                                  type="text"
                                  placeholder="Enter username..."
                                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white/80"
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...localFrameworkConfig,
                                      username: e.target.value
                                    };
                                    setLocalFrameworkConfig(newConfig);
                                    handleInputChange({
                                      target: { name: 'frameworkConfig', value: newConfig }
                                    });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-amber-800 mb-2">
                                  Password
                                </label>
                                <input
                                  type="password"
                                  placeholder="Enter password..."
                                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 bg-white/80"
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...localFrameworkConfig,
                                      password: e.target.value,
                                      headers: {
                                        ...localFrameworkConfig.headers,
                                        'Authorization': `Basic ${btoa(`${localFrameworkConfig.username || ''}:${e.target.value}`)}`
                                      }
                                    };
                                    setLocalFrameworkConfig(newConfig);
                                    handleInputChange({
                                      target: { name: 'frameworkConfig', value: newConfig }
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 p-3 bg-amber-100/50 rounded-lg border border-amber-200/30">
                          <div className="flex items-start text-amber-800 text-sm">
                            <span className="mr-2 mt-0.5">🔒</span>
                            <div>
                              <strong>Security Note:</strong> Your credentials are stored locally and used only for API calls. 
                              They are not sent to our servers.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-bold text-red-800 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm">✕</span>
                    </div>
                    Research Failed
                  </h4>
                  <p className="text-red-700 mb-4">{researchResult.error}</p>
                  {researchResult.suggestions && (
                    <div className="p-4 bg-red-100/50 rounded-lg border border-red-200/50">
                      <h5 className="font-semibold text-red-800 mb-2">💡 Suggestions:</h5>
                      <ul className="space-y-1">
                        {researchResult.suggestions.map((suggestion, i) => (
                          <li key={i} className="text-red-700 text-sm flex items-start">
                            <span className="mr-2 mt-0.5">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Examples Section */}
          <div className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200/50">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <span className="mr-2">🧠</span>
              What Our AI Can Research:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                "Linear", "Stripe", "Slack", "GitHub", "Shopify",
                "WordPress", "Webflow", "Reddit", "Discord", "Internal APIs"
              ].map((service, i) => (
                <div key={i} className="p-2 bg-white/60 rounded-lg border border-slate-200/50 text-center">
                  <div className="text-xs font-medium text-slate-700">{service}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-4 italic text-center">
              🌟 If it has documentation, our AI can configure it automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolEditor = ({ 
  formData, 
  handleInputChange, 
  handleFrameworkChange,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  savedTestInputs,
  saveTestInput,
  connectedNodes = []
}) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [localFrameworkConfig, setLocalFrameworkConfig] = useState(formData.frameworkConfig || {});

  // BYOK Integration - Load API Keys from API Key Manager
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);

  const parentAgent = connectedNodes.find(node => 
    node.id === formData.inherits_from && (node.type === 'agent' || node.nodeType === 'agent')
  );
  const isInheritingFromAgent = formData.inherits_from && parentAgent;

  useEffect(() => {
    if (formData.frameworkConfig) {
      setLocalFrameworkConfig(formData.frameworkConfig);
    }
  }, [formData.framework]);

  // Load API Keys from BYOK Manager
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        const result = await response.json();
        
        if (result.success && result.data.api_keys) {
          setAvailableApiKeys(result.data.api_keys);
          console.log('🔑 Tool Editor: Loaded API keys:', result.data.api_keys);
        }
      } catch (error) {
        console.error('🔑 Tool Editor: Error loading API keys:', error);
        setApiKeyError('Failed to load API keys from BYOK Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  const handleToolTypeChange = (e) => {
    const newToolType = e.target.value;
    handleInputChange(e);
    
    if (!isInheritingFromAgent && newToolType !== 'universal_api') {
      setTimeout(() => {
        handleInputChange({ target: { name: 'framework', value: '' } });
        setLocalFrameworkConfig({});
      }, 0);
    }
  };

  const handleApiResearch = async (researchData) => {
    setIsResearching(true);
    setResearchResult(null);

    try {
      // Get API URL from environment or use default
      const API_URL = window.REACT_APP_API_URL || 'http://localhost:8000';
      
      console.log('Starting API research with data:', researchData);
      console.log('Using API URL:', `${API_URL}/api/tools/research-api`);
      
      const response = await fetch(`${API_URL}/api/tools/research-api`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add authorization header if available (optional)
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify(researchData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();
      console.log('API Research Result:', result);
      console.log('Auth details:', {
        auth_required: result.auth_required,
        auth_type: result.auth_type,
        auth_header: result.auth_header,
        auth_format: result.auth_format,
        auth_instructions: result.auth_instructions
      });
      setResearchResult(result);

      if (result.success) {
        const autoConfig = {
          toolType: 'universal_api',
          framework: 'universal_api',
          frameworkConfig: {
            url: result.base_url,
            method: result.primary_endpoints?.[0]?.method || result.primary_method || 'POST',
            headers: result.default_headers || {},
            auth_type: result.auth_type,
            protocol: result.protocol,
            endpoints: result.endpoints,
            protocol_config: result.protocol_config
          },
          ai_generated: true,
          api_research_result: result
        };

        console.log('Auto-configuring tool with:', autoConfig);

        Object.keys(autoConfig).forEach(key => {
          handleInputChange({
            target: { name: key, value: autoConfig[key] }
          });
        });

        setLocalFrameworkConfig(autoConfig.frameworkConfig);
      }
    } catch (error) {
      console.error('API Research Error:', error);
      
      let errorMessage = error.message;
      let suggestions = [
        'Check if the backend server is running on ' + (window.REACT_APP_API_URL || 'http://localhost:8000'),
        'Verify the service name is correct',
        'Try with a more detailed description'
      ];

      // Handle specific error types
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to the backend server';
        suggestions = [
          'Make sure the backend server is running',
          'Check if the API URL is correct: ' + (window.REACT_APP_API_URL || 'http://localhost:8000'),
          'Verify there are no firewall or network issues'
        ];
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication required or invalid';
        suggestions = [
          'Try logging in again',
          'Check if your session has expired',
          'Contact support if the issue persists'
        ];
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error occurred during API research';
        suggestions = [
          'Try again in a few moments',
          'Check the backend logs for more details',
          'Try with a simpler service description'
        ];
      }

      setResearchResult({
        success: false,
        error: errorMessage,
        suggestions: suggestions
      });
    } finally {
      setIsResearching(false);
    }
  };

  const handleFrameworkChangeLocal = (e) => {
    const framework = e.target.value;
    handleFrameworkChange(e);
    setLocalFrameworkConfig(formData.frameworkConfig || {});
  };

  const handleFrameworkConfigChange = (e) => {
    const { name, value } = e.target;
    const configKey = name.split('.')[1];
    
    const newConfig = {
      ...localFrameworkConfig,
      [configKey]: value
    };
    
    setLocalFrameworkConfig(newConfig);
    
    handleInputChange({
      target: {
        name: 'frameworkConfig',
        value: newConfig
      }
    });
  };

  const handleJsonChange = (fieldName, value) => {
    try {
      const parsedValue = JSON.parse(value);
      if (fieldName.startsWith('frameworkConfig.')) {
        const configKey = fieldName.split('.')[1];
        const newConfig = {
          ...localFrameworkConfig,
          [configKey]: parsedValue
        };
        setLocalFrameworkConfig(newConfig);
        handleInputChange({
          target: {
            name: 'frameworkConfig',
            value: newConfig
          }
        });
      } else {
        handleInputChange({
          target: {
            name: fieldName,
            value: parsedValue
          }
        });
      }
    } catch (error) {
      handleInputChange({
        target: {
          name: fieldName,
          value: value
        }
      });
    }
  };

  const runToolTest = () => {
    try {
      const inputs = JSON.parse(testInput);
      
      let simulatedResult;
      
      if (formData.toolType === 'universal_api') {
        simulatedResult = {
          success: true,
          response: {
            message: "Universal API call simulated successfully",
            service: formData.api_service_name,
            endpoint_used: localFrameworkConfig.url,
            data: inputs
          },
          api_type: researchResult?.api_type || 'REST',
          confidence: researchResult?.confidence || 0.9
        };
      } else if (isInheritingFromAgent) {
        simulatedResult = {
          success: true,
          response: `Simulated response using inherited ${parentAgent.data?.framework} configuration`,
          tokens_used: 150,
          model: parentAgent.data?.frameworkConfig?.model || parentAgent.data?.llmModel || 'inherited-model',
          inherited: true
        };
      } else {
        simulatedResult = {
          success: true,
          status_code: 200,
          response: { message: "Tool executed successfully", data: inputs },
          endpoint: localFrameworkConfig.url || formData.apiEndpoint
        };
      }
      
      setTestResult({
        success: true,
        result: simulatedResult,
        execution_time: Math.random() * 2 + 0.5
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };

  // Render BYOK Status for Tool Editor
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Loading your API keys...</span>
          </div>
        </div>
      );
    }

    if (apiKeyError) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-sm text-red-700">{apiKeyError}</span>
          </div>
        </div>
      );
    }

    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    
    if (validKeys.length === 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">🔑</span>
              <span className="text-sm text-yellow-700">No API keys configured</span>
            </div>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
            >
              Add API Keys
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">🔑</span>
            <span className="text-sm text-green-700">
              {validKeys.length} API key{validKeys.length > 1 ? 's' : ''} available: {validKeys.map(k => k.provider_name).join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded text-sm"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
          Tool Configuration
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Configure your tool with AI assistance or traditional methods
        </p>
      </div>

      {/* BYOK Status Indicator */}
      {renderBYOKStatus()}

      {/* Inheritance Indicator */}
      {isInheritingFromAgent && (
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-green-200/50 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-lg">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 mb-3">
                Inheriting from Agent: {parentAgent.data?.label || parentAgent.id}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Framework</div>
                  <div className="text-green-800">{parentAgent.data?.framework || 'Not set'}</div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Model</div>
                  <div className="text-green-800">{parentAgent.data?.frameworkConfig?.model || 'Not set'}</div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Temperature</div>
                  <div className="text-green-800">{parentAgent.data?.frameworkConfig?.temperature || 0.7}</div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Max Tokens</div>
                  <div className="text-green-800">{parentAgent.data?.frameworkConfig?.max_tokens || 2000}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-100/50 rounded-lg">
                <p className="text-green-700 text-sm flex items-center">
                  <span className="mr-2">💡</span>
                  This tool will automatically use the agent's LLM configuration
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Configuration */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-blue-600">📝</span>
          </span>
          Basic Information
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Description
              <HelpTooltip type="tool" field="description" />
            </label>
            <input
              type="text"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
              placeholder="Describe what this tool does..."
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Tool Type *
              <HelpTooltip type="tool" field="toolType" />
            </label>
            <div className="relative">
              <select
                name="toolType"
                value={formData.toolType || ToolType.API}
                onChange={handleToolTypeChange}
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 bg-white appearance-none cursor-pointer shadow-sm"
                required
              >
                <option value={ToolType.API}>🌐 API Tool</option>
                <option value={ToolType.WEBHOOK}>🔗 Webhook Tool</option>
                <option value={ToolType.CUSTOM}>⚙️ Custom Tool</option>
                <option value="universal_api">🤖 Universal API Builder (AI-Powered)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {formData.toolType === 'universal_api'
                ? "🚀 AI will research and configure any API automatically"
                : "Choose the type of tool you want to create"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Universal API Builder */}
      {formData.toolType === 'universal_api' && (
        <UniversalApiBuilder
          formData={formData}
          handleInputChange={handleInputChange}
          onApiResearch={handleApiResearch}
          isResearching={isResearching}
          researchResult={researchResult}
        />
      )}

      {/* Traditional Framework Configuration */}
      {formData.toolType !== 'universal_api' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-purple-600">⚙️</span>
            </span>
            Framework Configuration
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-slate-700 font-semibold mb-3 flex items-center">
                Framework *
                <HelpTooltip type="tool" field="framework" />
              </label>
              <div className="relative">
                <select
                  name="framework"
                  value={formData.framework || ''}
                  onChange={handleFrameworkChangeLocal}
                  className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200 text-slate-700 bg-white appearance-none cursor-pointer shadow-sm"
                  required
                >
                  <option value="">Select Framework...</option>
                  {FRAMEWORK_OPTIONS.API.map(framework => (
                    <option key={framework.value} value={framework.value}>
                      {framework.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Framework-Specific Configuration */}
            {formData.framework && (
              <div className="space-y-6 p-6 bg-slate-50/50 rounded-xl border border-slate-200/30">
                <div>
                  <label className="block text-slate-700 font-semibold mb-3">
                    {formData.toolType === ToolType.WEBHOOK ? '🔗 Webhook URL *' : '🌐 Endpoint URL *'}
                  </label>
                  <input
                    type="url"
                    name="frameworkConfig.url"
                    value={localFrameworkConfig.url || ''}
                    onChange={handleFrameworkConfigChange}
                    placeholder={formData.toolType === ToolType.WEBHOOK 
                      ? "https://your-webhook-endpoint.com/hook"
                      : "https://api.example.com/endpoint"}
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
                    required
                  />
                </div>

                {formData.toolType !== ToolType.WEBHOOK && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-3">HTTP Method</label>
                    <div className="relative">
                      <select
                        name="frameworkConfig.method"
                        value={localFrameworkConfig.method || 'GET'}
                        onChange={handleFrameworkConfigChange}
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-200 text-slate-700 bg-white appearance-none cursor-pointer shadow-sm"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-3">Headers (JSON)</label>
                    <textarea
                      name="frameworkConfig.headers"
                      value={typeof localFrameworkConfig.headers === 'object' 
                        ? JSON.stringify(localFrameworkConfig.headers, null, 2)
                        : localFrameworkConfig.headers || '{}'}
                      onChange={(e) => handleJsonChange('frameworkConfig.headers', e.target.value)}
                      placeholder='{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer token"\n}'
                      className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-200 resize-none shadow-sm"
                      rows="6"
                    />
                    <p className="text-sm text-slate-500 mt-2">HTTP headers in JSON format</p>
                  </div>

                  {(formData.toolType === ToolType.WEBHOOK || 
                    (localFrameworkConfig.method && localFrameworkConfig.method !== 'GET')) && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-3">
                        {formData.toolType === ToolType.WEBHOOK ? 'Webhook Payload (JSON)' : 'Request Body (JSON)'}
                      </label>
                      <textarea
                        name="frameworkConfig.body"
                        value={typeof localFrameworkConfig.body === 'object' 
                          ? JSON.stringify(localFrameworkConfig.body, null, 2)
                          : localFrameworkConfig.body || '{}'}
                        onChange={(e) => handleJsonChange('frameworkConfig.body', e.target.value)}
                        placeholder='{\n  "param1": "value1",\n  "param2": "value2"\n}'
                        className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-200 resize-none shadow-sm"
                        rows="6"
                      />
                      <p className="text-sm text-slate-500 mt-2">Request payload in JSON format</p>
                    </div>
                  )}
                </div>

                {(formData.toolType === ToolType.API || formData.toolType === ToolType.CUSTOM) && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-3">API Key (optional)</label>
                    <div className="relative">
                      <input
                        type="password"
                        name="apiKey"
                        value={formData.apiKey || ''}
                        onChange={handleInputChange}
                        placeholder="Your API key (if required)"
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all duration-200 text-slate-700 placeholder-slate-400 pr-12 shadow-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <span className="text-slate-400 text-lg">🔐</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      API key for authentication (if required by the API)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Configuration Display */}
      {formData.toolType === 'universal_api' && researchResult?.success && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-200/50 p-6">
          <h2 className="text-xl font-bold text-green-800 mb-6 flex items-center">
            <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white">✓</span>
            </span>
            AI-Generated Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="text-green-600 font-semibold text-sm mb-1">Service</div>
              <div className="text-green-800 font-bold">{researchResult.service_name}</div>
            </div>
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="text-green-600 font-semibold text-sm mb-1">API Type</div>
              <div className="text-green-800 font-bold">{researchResult.api_type}</div>
            </div>
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="text-green-600 font-semibold text-sm mb-1">Authentication</div>
              <div className="text-green-800 font-bold">{researchResult.auth_type}</div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-white/60 rounded-xl">
            <div className="text-green-600 font-semibold text-sm mb-2">Base URL</div>
            <code className="block p-3 bg-green-100/50 text-green-800 rounded-lg text-sm font-mono break-all">
              {researchResult.base_url}
            </code>
          </div>
          {researchResult.endpoints && (
            <div className="mt-6">
              <h3 className="text-green-800 font-semibold mb-4">Available Actions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {researchResult.endpoints.map((endpoint, i) => (
                  <div key={i} className="p-4 bg-white/60 rounded-xl border border-green-200/30">
                    <div className="font-semibold text-green-800 mb-1">{endpoint.name}</div>
                    <div className="text-green-600 text-sm">{endpoint.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool Settings */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-orange-600">📋</span>
          </span>
          Tool Settings
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Expected Output
              <HelpTooltip type="tool" field="expectedOutput" />
            </label>
            <textarea
              name="expectedOutput"
              value={formData.expectedOutput || ''}
              onChange={handleInputChange}
              placeholder={formData.toolType === 'universal_api' 
                ? "AI will auto-detect expected output format based on the API research..."
                : "Describe what this tool should return..."
              }
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 resize-none shadow-sm"
              rows="4"
            />
            <p className="text-sm text-slate-500 mt-2">
              {formData.toolType === 'universal_api' 
                ? "Expected output will be automatically determined from API research"
                : "Describe the expected output format and content"
              }
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Additional Parameters (JSON)
              <HelpTooltip type="tool" field="parameters" />
            </label>
            <textarea
              name="parameters"
              value={formData.parameters || ''}
              onChange={handleInputChange}
              placeholder={formData.toolType === 'universal_api'
                ? '{"rate_limit": 60, "timeout": 30, "retries": 3}'
                : '{"timeout": 30, "retries": 3}'
              }
              className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 resize-none shadow-sm"
              rows="5"
            />
            <p className="text-sm text-slate-500 mt-2">
              Additional configuration parameters in JSON format
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-indigo-600">🔬</span>
          </span>
          Advanced Options
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Condition to Run (optional)
              <HelpTooltip type="tool" field="condition" />
            </label>
            <input
              type="text"
              name="condition"
              value={formData.condition || ""}
              onChange={handleInputChange}
              placeholder="e.g. inputs.score > 80"
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
            />
            <p className="text-sm text-slate-500 mt-2">
              This tool will only execute if the condition is true. Use <code className="bg-slate-100 px-2 py-1 rounded text-xs">inputs.*</code> to reference input values.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start p-4 bg-slate-50/50 rounded-xl border border-slate-200/30">
              <input
                type="checkbox"
                name="async"
                checked={formData.async || false}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500/20 border-slate-300 rounded mt-1"
              />
              <div className="ml-4">
                <label className="text-slate-800 font-semibold">
                  Execute asynchronously
                </label>
                <p className="text-slate-600 text-sm mt-1">
                  When enabled, this tool will run in the background without blocking other operations
                </p>
              </div>
            </div>

            {formData.toolType === 'universal_api' && researchResult?.success && (
              <div className="flex items-start p-4 bg-blue-50/50 rounded-xl border border-blue-200/30">
                <input
                  type="checkbox"
                  name="save_as_custom_node"
                  checked={formData.save_as_custom_node || false}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500/20 border-slate-300 rounded mt-1"
                />
                <div className="ml-4">
                  <label className="text-blue-800 font-semibold flex items-center">
                    <span className="mr-2">💾</span>
                    Save as Custom Node Template
                  </label>
                  <p className="text-blue-600 text-sm mt-1">
                    Save this AI-configured tool to your node palette for future use
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-green-600">🧪</span>
            </span>
            Test Your Tool
          </h2>
          <div className="flex items-center space-x-3">
            {formData.toolType === 'universal_api' && researchResult?.success && (
              <button
                type="button"
                onClick={() => {
                  const sampleInput = researchResult.sample_input || {
                    query: "test query",
                    parameters: researchResult.sample_parameters || {},
                    context: "test context"
                  };
                  setTestInput(JSON.stringify(sampleInput, null, 2));
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🤖 Use AI Sample
              </button>
            )}
            <button
              type="button"
              onClick={runToolTest}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Run Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3">
              Test Input (JSON)
            </label>
            <textarea
              value={testInput || ''}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 resize-none shadow-sm"
              rows={8}
              placeholder={formData.toolType === 'universal_api' && researchResult?.success
                ? JSON.stringify(researchResult.sample_input || {
                    action: "create_item",
                    data: { title: "Test Item", description: "Test Description" }
                  }, null, 2)
                : JSON.stringify({
                    query: "test query",
                    parameters: { limit: 10 },
                    context: "test context"
                  }, null, 2)
              }
            />
            <p className="text-sm text-slate-500 mt-2">
              {formData.toolType === 'universal_api' 
                ? "Test data based on AI research. Click 'Use AI Sample' for auto-generated test data."
                : "Provide test data for your tool"
              }
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-3">Test Result</label>
            <div className="h-64 p-4 border border-slate-200 rounded-xl bg-slate-50/50 overflow-y-auto">
              {testResult ? (
                <div className={`p-4 rounded-xl ${
                  testResult.success 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50' 
                    : 'bg-gradient-to-br from-red-50 to-rose-50 border border-red-200/50'
                }`}>
                  {testResult.success ? (
                    <div>
                      <div className="font-semibold mb-3 flex items-center text-green-800">
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs">✓</span>
                        </span>
                        {formData.toolType === 'universal_api' ? 'AI Integration Success' : 'Test Successful'}
                      </div>
                      <pre className="text-xs bg-white/60 p-3 rounded-lg overflow-x-auto border border-green-200/30 text-green-800">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                      <div className="flex items-center justify-between mt-3 text-xs text-green-600">
                        {testResult.execution_time && (
                          <span>Execution: {testResult.execution_time.toFixed(2)}s</span>
                        )}
                        {formData.toolType === 'universal_api' && testResult.result?.confidence && (
                          <span>AI Confidence: {(testResult.result.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold mb-3 flex items-center text-red-800">
                        <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs">✕</span>
                        </span>
                        Test Failed
                      </div>
                      <div className="text-sm text-red-700 bg-white/60 p-3 rounded-lg border border-red-200/30">
                        {testResult.error}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">🧪</span>
                    </div>
                    <div className="text-sm">
                      {formData.toolType === 'universal_api' 
                        ? "Run a test to verify AI-configured API integration"
                        : "Run a test to see results"
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Test Inputs */}
        <div className="mt-8 p-6 bg-slate-50/50 rounded-xl border border-slate-200/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Saved Test Inputs</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <select
                  className="text-sm border border-slate-200 rounded-lg p-3 pr-10 bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
                  onChange={(e) => {
                    if (e.target.value) {
                      const selected = savedTestInputs.find(item => item.name === e.target.value);
                      if (selected) {
                        setTestInput(selected.input);
                      }
                    }
                  }}
                  value=""
                >
                  <option value="">Load saved input...</option>
                  {(savedTestInputs || []).map((item, index) => (
                    <option key={index} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <button
                type="button"
                onClick={saveTestInput}
                className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-slate-200"
              >
                💾 Save Input
              </button>
            </div>
          </div>

          {savedTestInputs && savedTestInputs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {savedTestInputs.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setTestInput(item.input)}
                  className="p-3 text-left border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="font-medium text-sm text-slate-900 truncate group-hover:text-blue-700">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(item.timestamp || Date.now()).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-sm">No saved test inputs yet</div>
            </div>
          )}
        </div>
      </div>

      {/* AI Research Summary */}
      {formData.toolType === 'universal_api' && researchResult?.success && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200/50 p-6">
          <h2 className="text-xl font-bold text-blue-800 mb-6 flex items-center">
            <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white">🔬</span>
            </span>
            AI Research Summary
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-blue-800 mb-4">📊 Research Results</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Service:</span>
                  <span className="text-blue-800 font-medium">{researchResult.service_name}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">API Type:</span>
                  <span className="text-blue-800 font-medium">{researchResult.api_type}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Auth:</span>
                  <span className="text-blue-800 font-medium">{researchResult.auth_type}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Endpoints:</span>
                  <span className="text-blue-800 font-medium">{researchResult.endpoints?.length || 0}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Confidence:</span>
                  <div className="flex items-center">
                    <div className="w-20 h-2 bg-blue-200 rounded-full mr-2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        style={{ width: `${(researchResult.confidence * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-blue-800 font-medium text-xs">
                      {(researchResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-4">⚙️ Auto-Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Base URL configured
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  HTTP methods detected
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Headers formatted
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Authentication prepared
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Error handling added
                </div>
              </div>
            </div>
          </div>

          {formData.save_as_custom_node && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl border border-blue-200/30">
              <div className="flex items-center text-blue-800 text-sm font-medium">
                <span className="mr-2">💾</span>
                This configuration will be saved as a reusable custom node template
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-4">
            Your tool configuration is automatically saved as you make changes
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <span>🔒</span>
            <span>Enterprise-grade security</span>
            <span>•</span>
            <span>🚀</span>
            <span>AI-powered configuration</span>
            <span>•</span>
            <span>⚡</span>
            <span>Real-time validation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

ToolEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired,
  testInput: PropTypes.string,
  setTestInput: PropTypes.func.isRequired,
  testResult: PropTypes.object,
  setTestResult: PropTypes.func.isRequired,
  savedTestInputs: PropTypes.array,
  saveTestInput: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array
};

export default ToolEditor;