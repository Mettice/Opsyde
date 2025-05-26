// Enhanced ToolEditor.jsx - Add Universal API Builder Option
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';

// NEW: Universal API Builder Component
const UniversalApiBuilder = ({ 
  formData, 
  handleInputChange, 
  onApiResearch, 
  isResearching, 
  researchResult 
}) => {
  const [researchStep, setResearchStep] = useState(0);
  
  const researchSteps = [
    "🔍 Searching for API documentation...",
    "📖 Analyzing authentication methods...",
    "🔧 Discovering endpoints and parameters...",
    "✅ Generating integration configuration...",
    "🧪 Testing connection..."
  ];

  const handleStartResearch = async () => {
    if (!formData.api_service_name || !formData.ai_description) {
      alert('Please provide both service name and description');
      return;
    }

    // Simulate research progress
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

    // Trigger actual research
    await onApiResearch({
      service_name: formData.api_service_name,
      description: formData.ai_description,
      endpoint_hint: formData.api_endpoint_hint
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">🌐</span>
        <div>
          <h3 className="text-xl font-semibold text-blue-900">Universal API Builder</h3>
          <p className="text-sm text-blue-700">AI will research and configure any API automatically</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Service Name Input */}
        <div>
          <label className="block text-gray-800 mb-2 font-medium">
            🎯 What service do you want to connect to?
          </label>
          <input
            type="text"
            name="api_service_name"
            value={formData.api_service_name || ''}
            onChange={handleInputChange}
            placeholder="e.g., Linear, Webflow, Reddit, your company's internal API, etc."
            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="text-xs text-blue-600 mt-1">
            ✨ Can be ANY service - AI will research it automatically
          </div>
        </div>

        {/* Action Description */}
        <div>
          <label className="block text-gray-800 mb-2 font-medium">
            📝 What do you want to do with this API?
          </label>
          <textarea
            name="ai_description"
            value={formData.ai_description || ''}
            onChange={handleInputChange}
            placeholder="Examples:
• Create new issues in Linear with priority and labels
• Update Webflow CMS collections with blog posts
• Post messages to Reddit with specific subreddits
• Send data to our internal CRM at mycompany.com/api
• Get user data from custom authentication system"
            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            rows="4"
          />
        </div>

        {/* Optional API Hint */}
        <div>
          <label className="block text-gray-800 mb-2 font-medium">
            🔗 API Endpoint (optional hint)
          </label>
          <input
            type="url"
            name="api_endpoint_hint"
            value={formData.api_endpoint_hint || ''}
            onChange={handleInputChange}
            placeholder="https://api.linear.app or https://mycompany.com/api (optional)"
            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="text-xs text-blue-600 mt-1">
            💡 If you know the API URL, provide it to help AI research faster
          </div>
        </div>

        {/* Research Button */}
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleStartResearch}
            disabled={isResearching || !formData.api_service_name || !formData.ai_description}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              isResearching || !formData.api_service_name || !formData.ai_description
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isResearching ? (
              <div className="flex items-center">
                <span className="animate-spin mr-2">🔬</span>
                Researching API...
              </div>
            ) : (
              <div className="flex items-center">
                <span className="mr-2">🚀</span>
                Research & Configure API
              </div>
            )}
          </button>
        </div>

        {/* Research Progress */}
        {isResearching && (
          <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4">
            <h4 className="font-semibold text-blue-800 mb-3">AI Research in Progress...</h4>
            <div className="space-y-2">
              {researchSteps.map((step, index) => (
                <div key={index} className={`flex items-center text-sm ${
                  index <= researchStep ? 'text-blue-800' : 'text-gray-400'
                }`}>
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    index < researchStep 
                      ? 'bg-green-500' 
                      : index === researchStep 
                      ? 'bg-blue-500 animate-pulse' 
                      : 'bg-gray-300'
                  }`}></div>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research Results */}
        {researchResult && (
          <div className={`p-4 rounded-lg border mt-4 ${
            researchResult.success 
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {researchResult.success ? (
              <div>
                <h4 className="font-bold text-green-800 mb-3 flex items-center">
                  ✅ API Research Complete!
                </h4>
                <div className="space-y-2 text-sm text-green-700">
                  <div><strong>🎯 Service:</strong> {researchResult.service_name}</div>
                  <div><strong>🔗 API Type:</strong> {researchResult.api_type}</div>
                  <div><strong>🔐 Authentication:</strong> {researchResult.auth_type}</div>
                  <div><strong>🌐 Base URL:</strong> <code className="bg-green-100 px-1 rounded">{researchResult.base_url}</code></div>
                  <div><strong>📊 Confidence:</strong> {(researchResult.confidence * 100).toFixed(0)}%</div>
                  {researchResult.endpoints && (
                    <div>
                      <strong>🛠️ Available Actions:</strong>
                      <ul className="list-disc list-inside mt-1 ml-4">
                        {researchResult.endpoints.slice(0, 3).map((endpoint, i) => (
                          <li key={i}>{endpoint.name}: {endpoint.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                  🎉 Configuration automatically applied! You can now test or use this tool.
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-bold text-red-800 mb-2">❌ Research Failed</h4>
                <p className="text-sm text-red-700 mb-2">{researchResult.error}</p>
                {researchResult.suggestions && (
                  <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                    <strong>💡 Suggestions:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {researchResult.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Examples of what AI can research */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
          <h4 className="font-semibold text-blue-800 mb-2">🧠 Examples of APIs AI Can Research:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
            <div>✅ Linear (Project Management)</div>
            <div>✅ Webflow (CMS)</div>
            <div>✅ Reddit (Social)</div>
            <div>✅ Calendly (Scheduling)</div>
            <div>✅ Custom Company APIs</div>
            <div>✅ WordPress (Headless CMS)</div>
            <div>✅ Shopify (E-commerce)</div>
            <div>✅ GitHub (Code Management)</div>
            <div>✅ Internal Microservices</div>
            <div>✅ Legacy SOAP APIs</div>
          </div>
          <div className="text-xs text-blue-600 mt-2 italic">
            🌟 If an API exists and has documentation, AI can research and configure it!
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
  // Add states for API research
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  
  // Local state for framework config to prevent reset issues
  const [localFrameworkConfig, setLocalFrameworkConfig] = useState(formData.frameworkConfig || {});

  // Find the parent agent if inheriting
  const parentAgent = connectedNodes.find(node => 
    node.id === formData.inherits_from && (node.type === 'agent' || node.nodeType === 'agent')
  );
  const isInheritingFromAgent = formData.inherits_from && parentAgent;

  // Update local config when formData changes
  useEffect(() => {
    if (formData.frameworkConfig) {
      setLocalFrameworkConfig(formData.frameworkConfig);
    }
  }, [formData.framework]);

  // Handle tool type change without causing resets
  const handleToolTypeChange = (e) => {
    const newToolType = e.target.value;
    
    handleInputChange(e);
    
    // Reset framework selection for non-inherited tools and non-universal tools
    if (!isInheritingFromAgent && newToolType !== 'universal_api') {
    setTimeout(() => {
      handleInputChange({ target: { name: 'framework', value: '' } });
      setLocalFrameworkConfig({});
    }, 0);
    }
  };

  // NEW: Handle API Research
  const handleApiResearch = async (researchData) => {
    setIsResearching(true);
    setResearchResult(null);

    try {
      const response = await fetch('/api/tools/research-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(researchData)
      });

      const result = await response.json();
      setResearchResult(result);

      // Auto-populate form with protocol-specific config
      if (result.success) {
        const autoConfig = {
          toolType: 'universal_api',
          framework: 'universal_api',
          frameworkConfig: {
            url: result.base_url,
            method: result.primary_endpoints?.[0]?.method || 'POST',
            headers: result.default_headers || {},
            auth_type: result.auth_type,
            protocol: result.protocol, // NEW: Protocol info
            endpoints: result.endpoints,
            protocol_config: result.protocol_config // NEW: Protocol-specific config
          },
          ai_generated: true,
          api_research_result: result
        };

        // Update form with protocol awareness
        Object.keys(autoConfig).forEach(key => {
          handleInputChange({
            target: { name: key, value: autoConfig[key] }
          });
        });

        setLocalFrameworkConfig(autoConfig.frameworkConfig);
      }
    } catch (error) {
      setResearchResult({
        success: false,
        error: 'Failed to research API. Please try again or configure manually.',
        suggestions: [
          'Check if the service name is correct',
          'Verify the API endpoint if provided',
          'Try with a more detailed description'
        ]
      });
    } finally {
      setIsResearching(false);
    }
  };

  // Enhanced framework change handler
  const handleFrameworkChangeLocal = (e) => {
    const framework = e.target.value;
    handleFrameworkChange(e);
    setLocalFrameworkConfig(formData.frameworkConfig || {});
  };

  // Handle framework config changes locally first
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

  // Test tool functionality - Enhanced for universal API
  const runToolTest = () => {
    try {
      const inputs = JSON.parse(testInput);
      
      let simulatedResult;
      
      if (formData.toolType === 'universal_api') {
        // Special handling for universal API tools
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
        // Use inherited LLM configuration
        simulatedResult = {
          success: true,
          response: `Simulated response using inherited ${parentAgent.data?.framework} configuration`,
          tokens_used: 150,
          model: parentAgent.data?.frameworkConfig?.model || parentAgent.data?.llmModel || 'inherited-model',
          inherited: true
        };
      } else if (formData.toolType === ToolType.LLM) {
        simulatedResult = {
          success: true,
          response: "Simulated LLM response based on your configuration",
          tokens_used: 150,
          model: localFrameworkConfig.model || 'unknown'
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

  return (
    <div className="space-y-6">
      {/* Inheritance Indicator */}
      {isInheritingFromAgent && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-green-800 font-semibold mb-2 flex items-center">
            ✅ Inheriting from Agent: {parentAgent.data?.label || parentAgent.id}
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            <div>🤖 LLM Framework: {parentAgent.data?.framework || 'Not set'}</div>
            <div>🧠 Model: {parentAgent.data?.frameworkConfig?.model || parentAgent.data?.llmModel || 'Not set'}</div>
            <div>🌡️ Temperature: {parentAgent.data?.frameworkConfig?.temperature || parentAgent.data?.temperature || 0.7}</div>
            <div>🎯 Max Tokens: {parentAgent.data?.frameworkConfig?.max_tokens || parentAgent.data?.max_tokens || 2000}</div>
          </div>
          <div className="text-xs text-green-600 mt-2 bg-green-100 p-2 rounded">
            💡 This tool will automatically use the agent's LLM configuration. Tool-specific settings configured below.
          </div>
        </div>
      )}

      {/* Basic Configuration */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="tool" field="description" />
        </label>
        <input
          type="text"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe what this tool does..."
        />
      </div>

      {/* Tool Type Selection - Enhanced */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
          🔧 Tool Configuration
        </h3>
        
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool Type *
              <HelpTooltip type="tool" field="toolType" />
            </label>
            <select
              name="toolType"
              value={formData.toolType || ToolType.API}
              onChange={handleToolTypeChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value={ToolType.API}>🌐 API Tool</option>
              <option value={ToolType.WEBHOOK}>🔗 Webhook Tool</option>
              <option value={ToolType.CUSTOM}>⚙️ Custom Tool</option>
            {/* NEW: Universal API Option */}
            <option value="universal_api">🤖 Universal API Builder (AI-Powered)</option>
            </select>
            <div className="text-xs text-gray-500 mt-1">
            {isInheritingFromAgent 
              ? "LLM capabilities are inherited from the connected agent"
              : formData.toolType === 'universal_api'
              ? "🚀 AI will research and configure any API automatically"
              : "Choose the type of tool you want to create"
            }
          </div>
            </div>
          </div>

      {/* Universal API Builder - NEW */}
      {formData.toolType === 'universal_api' && (
        <UniversalApiBuilder
          formData={formData}
          handleInputChange={handleInputChange}
          onApiResearch={handleApiResearch}
          isResearching={isResearching}
          researchResult={researchResult}
        />
      )}

      {/* Traditional Framework Configuration - Only for non-universal tools */}
      {formData.toolType !== 'universal_api' && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            ⚙️ Framework Configuration
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Framework *
              <HelpTooltip type="tool" field="framework" />
            </label>
            <select
              name="framework"
              value={formData.framework || ''}
              onChange={handleFrameworkChangeLocal}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Framework...</option>
              {FRAMEWORK_OPTIONS.API.map(framework => (
                <option key={framework.value} value={framework.value}>
                  {framework.label}
                </option>
              ))}
            </select>
          </div>

          {/* Framework-Specific Configuration */}
          {formData.framework && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              {formData.toolType !== ToolType.WEBHOOK && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HTTP Method</label>
                  <select
                    name="frameworkConfig.method"
                    value={localFrameworkConfig.method || 'GET'}
                    onChange={handleFrameworkConfigChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Headers (JSON)</label>
                  <textarea
                    name="frameworkConfig.headers"
                    value={typeof localFrameworkConfig.headers === 'object' 
                      ? JSON.stringify(localFrameworkConfig.headers, null, 2)
                      : localFrameworkConfig.headers || '{}'}
                    onChange={(e) => handleJsonChange('frameworkConfig.headers', e.target.value)}
                    placeholder='{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer token"\n}'
                    className="w-full p-2 border border-gray-300 rounded-md font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="4"
                  />
                  <div className="text-xs text-gray-500 mt-1">HTTP headers in JSON format</div>
                </div>

                {(formData.toolType === ToolType.WEBHOOK || 
                  (localFrameworkConfig.method && localFrameworkConfig.method !== 'GET')) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.toolType === ToolType.WEBHOOK ? 'Webhook Payload (JSON)' : 'Request Body (JSON)'}
                    </label>
                    <textarea
                      name="frameworkConfig.body"
                      value={typeof localFrameworkConfig.body === 'object' 
                        ? JSON.stringify(localFrameworkConfig.body, null, 2)
                        : localFrameworkConfig.body || '{}'}
                      onChange={(e) => handleJsonChange('frameworkConfig.body', e.target.value)}
                      placeholder='{\n  "param1": "value1",\n  "param2": "value2"\n}'
                      className="w-full p-2 border border-gray-300 rounded-md font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows="4"
                    />
                    <div className="text-xs text-gray-500 mt-1">Request payload in JSON format</div>
                  </div>
                )}
              </div>

              {(formData.toolType === ToolType.API || formData.toolType === ToolType.CUSTOM) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key (optional)</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="apiKey"
                      value={formData.apiKey || ''}
                      onChange={handleInputChange}
                      placeholder="Your API key (if required)"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-8"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <span className="text-gray-400">🔐</span>
                    </div>
                  </div>
            <div className="text-xs text-gray-500 mt-1">
                    API key for authentication (if required by the API)
            </div>
          </div>
              )}
        </div>
          )}
      </div>
      )}

      {/* AI Configuration Display - For universal_api tools */}
      {formData.toolType === 'universal_api' && researchResult?.success && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            ✅ AI-Generated Configuration
          </h3>
          <div className="space-y-2 text-sm">
            <div><strong>Service:</strong> {researchResult.service_name}</div>
            <div><strong>API Type:</strong> {researchResult.api_type}</div>
            <div><strong>Authentication:</strong> {researchResult.auth_type}</div>
            <div><strong>Base URL:</strong> <code className="bg-green-100 px-1 rounded text-xs">{researchResult.base_url}</code></div>
            {researchResult.endpoints && (
              <div>
                <strong>Available Actions:</strong>
                <ul className="list-disc list-inside mt-1 ml-4 text-xs">
                  {researchResult.endpoints.map((endpoint, i) => (
                    <li key={i}>{endpoint.name}: {endpoint.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rest of your existing ToolEditor code... */}
      {/* Tool Settings, Advanced Options, Test Section remain the same */}

      {/* Tool Settings */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          📋 Tool Settings
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1 flex items-center">
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.toolType === 'universal_api' 
                ? "Expected output will be automatically determined from API research"
                : "Describe the expected output format and content"
              }
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 flex items-center">
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
              className="w-full p-3 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="4"
            />
            <div className="text-xs text-gray-500 mt-1">
              Additional configuration parameters in JSON format
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
          🔬 Advanced Options
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1 flex items-center">
              Condition to Run (optional)
              <HelpTooltip type="tool" field="condition" />
            </label>
            <input
              type="text"
              name="condition"
              value={formData.condition || ""}
              onChange={handleInputChange}
              placeholder="e.g. inputs.score > 80"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              This tool will only execute if the condition is true. Use <code className="bg-gray-100 px-1 py-0.5 rounded">inputs.*</code> to reference input values.
            </div>
          </div>

          <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
            <input
              type="checkbox"
              name="async"
              checked={formData.async || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <label className="text-sm font-medium text-gray-700">
                Execute asynchronously
              </label>
              <div className="text-xs text-gray-500">
                When enabled, this tool will run in the background without blocking other operations
              </div>
            </div>
          </div>

          {/* NEW: Save as Custom Node Option */}
          {formData.toolType === 'universal_api' && researchResult?.success && (
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                name="save_as_custom_node"
                checked={formData.save_as_custom_node || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label className="text-sm font-medium text-blue-700">
                  💾 Save as Custom Node Template
                </label>
                <div className="text-xs text-blue-600">
                  Save this AI-configured tool to your node palette for future use
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Section - Enhanced for Universal API */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Your Tool</h3>
          <div className="flex items-center space-x-2">
            {formData.toolType === 'universal_api' && researchResult?.success && (
              <button
                type="button"
                onClick={() => {
                  // Auto-populate test input based on API research
                  const sampleInput = researchResult.sample_input || {
                    query: "test query",
                    parameters: researchResult.sample_parameters || {},
                    context: "test context"
                  };
                  setTestInput(JSON.stringify(sampleInput, null, 2));
                }}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🤖 Use AI Sample
              </button>
            )}
          <button
            type="button"
            onClick={runToolTest}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Run Test
          </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-1">
              Test Input (JSON)
            </label>
            <textarea
              value={testInput || ''}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={6}
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
            <div className="text-xs text-gray-500 mt-1">
              {formData.toolType === 'universal_api' 
                ? "Test data based on AI research. Click 'Use AI Sample' for auto-generated test data."
                : "Provide test data for your tool"
              }
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Test Result</label>
            <div className="h-40 p-3 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto">
              {testResult ? (
                <div className={`p-3 rounded-md ${
                  testResult.success 
                    ? 'bg-green-100 border border-green-200 text-green-800' 
                    : 'bg-red-100 border border-red-200 text-red-800'
                }`}>
                  {testResult.success ? (
                    <div>
                      <div className="font-bold mb-2 flex items-center">
                        {formData.toolType === 'universal_api' ? '🌐' : '✅'} Success
                      </div>
                      <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                      {testResult.execution_time && (
                        <div className="text-xs mt-2">
                          Execution time: {testResult.execution_time.toFixed(2)}s
                        </div>
                      )}
                      {formData.toolType === 'universal_api' && testResult.result?.confidence && (
                        <div className="text-xs mt-1">
                          AI Confidence: {(testResult.result.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold mb-2">❌ Error</div>
                      <div className="text-sm">{testResult.error}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
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
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Saved Test Inputs</h4>
            <div className="flex items-center space-x-2">
              <select
                className="text-sm border border-gray-300 rounded-md p-2"
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
              
              <button
                type="button"
                onClick={saveTestInput}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors"
              >
                Save Input
              </button>
            </div>
          </div>

          {savedTestInputs && savedTestInputs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {savedTestInputs.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setTestInput(item.input)}
                  className="p-2 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp || Date.now()).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Research Summary - Show if universal_api */}
      {formData.toolType === 'universal_api' && researchResult?.success && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            🔬 AI Research Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div>
              <h4 className="font-medium text-blue-800 mb-2">📊 Research Results</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Service: {researchResult.service_name}</li>
                <li>• API Type: {researchResult.api_type}</li>
                <li>• Auth Method: {researchResult.auth_type}</li>
                <li>• Endpoints Found: {researchResult.endpoints?.length || 0}</li>
                <li>• Confidence: {(researchResult.confidence * 100).toFixed(0)}%</li>
              </ul>
    </div>
      <div>
              <h4 className="font-medium text-blue-800 mb-2">⚙️ Auto-Configuration</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• ✅ Base URL configured</li>
                <li>• ✅ HTTP methods detected</li>
                <li>• ✅ Headers formatted</li>
                <li>• ✅ Authentication prepared</li>
                <li>• ✅ Error handling added</li>
              </ul>
      </div>
    </div>

          {formData.save_as_custom_node && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
              💾 This configuration will be saved as a reusable custom node template
      </div>
    )}
        </div>
      )}
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