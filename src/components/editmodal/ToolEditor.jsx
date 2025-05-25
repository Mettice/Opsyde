import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';

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
    
    // Reset framework selection for non-inherited tools
    if (!isInheritingFromAgent) {
      setTimeout(() => {
        handleInputChange({ target: { name: 'framework', value: '' } });
        setLocalFrameworkConfig({});
      }, 0);
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

  // Test tool functionality
  const runToolTest = () => {
    try {
      const inputs = JSON.parse(testInput);
      
      let simulatedResult;
      
      if (isInheritingFromAgent) {
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

      {/* Tool Type Selection */}
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
            {/* Smart Integration Options */}
            <option value="smart_api">🤖 AI-Powered Integration</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {isInheritingFromAgent 
              ? "LLM capabilities are inherited from the connected agent"
              : "Choose the type of tool you want to create"
            }
          </div>
        </div>
      </div>

      {/* Smart Integration Configuration */}
      {formData.toolType === 'smart_api' && (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
            🤖 AI-Powered Integration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Describe what you want this tool to do:
              </label>
              <textarea
                name="ai_description"
                value={formData.ai_description || ''}
                onChange={handleInputChange}
                placeholder="e.g., 'Send new leads to HubSpot CRM as contacts' or 'Update my Notion project status page'"
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                rows="3"
              />
              <div className="text-xs text-purple-600 mt-1">
                💡 AI will automatically detect the service and configure the integration
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Service Category (optional):
              </label>
              <select
                name="service_type"
                value={formData.service_type || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500"
              >
                <option value="">🔍 Let AI auto-detect</option>
                <option value="crm">👥 CRM (HubSpot, Salesforce, etc.)</option>
                <option value="communication">💬 Communication (Slack, Discord, etc.)</option>
                <option value="productivity">📝 Productivity (Notion, Airtable, etc.)</option>
                <option value="database">🗄️ Database (PostgreSQL, MySQL, etc.)</option>
                <option value="custom_api">🔧 Custom API/Webhook</option>
              </select>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>🔮 AI will handle:</strong>
                <br />• Service detection and API endpoint discovery
                <br />• Authentication requirements
                <br />• Data mapping and format conversion
                <br />• Error handling and retries
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Traditional Framework Configuration - Only for non-smart tools */}
      {formData.toolType !== 'smart_api' && (
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
              placeholder="Describe what this tool should return..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
            <div className="text-xs text-gray-500 mt-1">
              Describe the expected output format and content
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
              placeholder='{"timeout": 30, "retries": 3}'
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
        </div>
      </div>

      {/* Test Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Your Tool</h3>
          <button
            type="button"
            onClick={runToolTest}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Run Test
          </button>
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
              placeholder={JSON.stringify({
                query: "test query",
                parameters: { limit: 10 },
                context: "test context"
              }, null, 2)}
            />
            <div className="text-xs text-gray-500 mt-1">
              Provide test data for your tool
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
                      <div className="font-bold mb-2">✅ Success</div>
                      <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                      {testResult.execution_time && (
                        <div className="text-xs mt-2">
                          Execution time: {testResult.execution_time.toFixed(2)}s
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
                    <div className="text-sm">Run a test to see results</div>
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
                {savedTestInputs.map((item, index) => (
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

          {savedTestInputs.length > 0 && (
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
  savedTestInputs: PropTypes.array.isRequired,
  saveTestInput: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array
};

export default ToolEditor;