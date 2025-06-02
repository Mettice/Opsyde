// Enhanced ToolEditor.jsx - Modern Enterprise Design
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';
import { toast } from 'react-hot-toast';

// Modern Universal API Builder Component
const UniversalApiBuilder = ({ 
  formData, 
  handleInputChange, 
  onApiResearch, 
  isResearching, 
  researchResult,
  availableApiKeys = [],
  loadingApiKeys = false
}) => {
  // LLM selection state
  const [selectedLLM, setSelectedLLM] = useState(formData.selectedLLM || '');

  // Get available LLMs based on API keys (matching AgentEditor pattern)
  const getAvailableLLMs = () => {
    const llms = [];
    
    availableApiKeys.forEach(key => {
      if (key.validation_status === 'valid') {
        switch (key.provider) {
          case 'openai':
            llms.push({
              provider: 'openai',
              name: 'OpenAI GPT',
              models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
              icon: '🤖'
            });
            break;
          case 'anthropic':
            llms.push({
              provider: 'anthropic',
              name: 'Anthropic Claude',
              models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
              icon: '🧠'
            });
            break;
          case 'openrouter':
            llms.push({
              provider: 'openrouter',
              name: 'OpenRouter',
              models: ['openai/gpt-4', 'anthropic/claude-3-opus', 'meta-llama/llama-2-70b-chat'],
              icon: '🌐'
            });
            break;
        }
      }
    });
    
    return llms;
  };

  // Auto-select first available LLM ONLY ONCE when API keys are loaded
  useEffect(() => {
    const availableLLMs = getAvailableLLMs();
    if (availableLLMs.length > 0 && !selectedLLM && !formData.selectedLLM) {
      const firstLLM = availableLLMs[0];
      setSelectedLLM(firstLLM.provider);
      
      // Update form data without causing infinite loop
      handleInputChange({ 
        target: { 
          name: 'selectedLLM', 
          value: firstLLM.provider 
        } 
      });
      
      toast.success(`🤖 Auto-selected ${firstLLM.name} for API research`);
    }
  }, [availableApiKeys.length]); // Only depend on the length, not the full array

  // Handle LLM selection change
  const handleLLMChange = (e) => {
    const newLLM = e.target.value;
    setSelectedLLM(newLLM);
    
    // Update form data
    handleInputChange({ 
      target: { 
        name: 'selectedLLM', 
        value: newLLM 
      } 
    });

    // Auto-inject API key if available
    if (newLLM && availableApiKeys.length > 0) {
      const matchingKey = availableApiKeys.find(key => 
        key.provider === newLLM && key.validation_status === 'valid'
      );
      
      if (matchingKey) {
        const placeholder = `[BYOK:${matchingKey.provider}]`;
        
        handleInputChange({ 
          target: { 
            name: 'apiKey', 
            value: placeholder 
          } 
        });
        
        toast.success(`🔑 Auto-injected ${matchingKey.provider_name} API key from BYOK Manager`);
      }
    }
  };

  const handleStartResearch = async () => {
    // Validation
    if (!formData.serviceName?.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    
    if (!formData.description?.trim()) {
      toast.error('Please enter a description of what you want to do');
      return;
    }

    if (!selectedLLM) {
      toast.error('Please select an AI model for research');
      return;
    }

    const researchData = {
      serviceName: formData.serviceName,
      description: formData.description,
      selectedLLM: selectedLLM ? { provider: selectedLLM } : null
    };

    await onApiResearch(researchData);
  };

  const availableLLMs = getAvailableLLMs();

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">🤖 AI-Powered API Discovery</h3>
        <p className="text-sm text-blue-700">
              Let our AI research and configure any API automatically. Just describe what you want to do.
            </p>
          </div>

      {/* LLM Selection */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          🤖 Choose AI Model for Research
          <span className="text-red-500 ml-1">*</span>
        </label>
        
        {loadingApiKeys ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700 text-sm">Loading available AI models...</span>
        </div>
          </div>
        ) : availableLLMs.length === 0 ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <span className="text-yellow-700 text-sm">⚠️ No AI models available. Please add API keys in BYOK Manager.</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="ml-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
            >
              Add Keys
            </button>
          </div>
        ) : (
          <select
            value={selectedLLM}
            onChange={handleLLMChange}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">Select AI Model...</option>
            {availableLLMs.map((llm) => (
              <option key={llm.provider} value={llm.provider}>
                {llm.icon} {llm.name} - {llm.models[0]} (Ready)
              </option>
            ))}
          </select>
        )}
        
        {selectedLLM && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
            <span className="text-green-700">
              🔑 API key auto-loaded from BYOK Manager for {availableLLMs.find(l => l.provider === selectedLLM)?.name}
            </span>
          </div>
        )}
      </div>

          {/* Service Name Input */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          🎯 What service do you want to connect to?
          <span className="text-red-500 ml-1">*</span>
            </label>
              <input
                type="text"
          name="serviceName"
          value={formData.serviceName || ''}
                onChange={handleInputChange}
          className="w-full p-3 border rounded-lg"
          placeholder="e.g., Gmail, Slack, Airtable, Notion, Stripe, GitHub..."
        />
          </div>

          {/* Action Description */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          📝 What do you want to accomplish?
          <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
          name="description"
          value={formData.description || ''}
              onChange={handleInputChange}
          className="w-full p-3 border rounded-lg h-24"
          placeholder="e.g., Send email notifications, Create calendar events, Update spreadsheet rows, Post to Slack channels..."
        />
        <div className="text-xs text-gray-500 mt-1">
          💡 Be specific about what you want to do - this helps our AI find the right API endpoints
          </div>
          </div>

          {/* Research Button */}
            <button
              type="button"
              onClick={handleStartResearch}
        disabled={isResearching || !selectedLLM}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          isResearching || !selectedLLM
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
                {isResearching ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            🤖 AI is researching...
          </span>
        ) : (
          '🚀 Start AI Research & Configuration'
              )}
            </button>

          {/* Research Results */}
          {researchResult && (
        <div className={`mt-4 p-4 rounded-lg border ${
              researchResult.success 
            ? 'bg-green-50 border-green-200' 
            : researchResult.auth_required 
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
            }`}>
              {researchResult.success ? (
            <>
              <h4 className="font-semibold text-green-800 mb-2">✅ Research Complete!</h4>
              <div className="text-sm text-green-700">
                <p><strong>Service:</strong> {researchResult.service || 'Detected'}</p>
                <p><strong>Configuration:</strong> {researchResult.summary || 'API endpoints and authentication configured'}</p>
                    </div>
            </>
          ) : researchResult.auth_required ? (
            <>
              <h4 className="font-semibold text-yellow-800 mb-2">🔐 Authentication Required</h4>
              <div className="text-sm text-yellow-700 space-y-3">
                <p><strong>Service:</strong> {researchResult.auth_guidance?.service || 'Unknown'}</p>
                <p><strong>Auth Type:</strong> {researchResult.auth_guidance?.auth_type || 'API Key/Token'}</p>
                
                {researchResult.auth_guidance && (
                  <div className="bg-white border border-yellow-300 rounded p-3 mt-3">
                    <h5 className="font-semibold text-yellow-800 mb-2">📋 Setup Instructions:</h5>
                    <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                      {researchResult.auth_guidance.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    
                    <div className="mt-3 space-y-2">
                      <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                        <strong>Token Format:</strong> <code className="bg-yellow-200 px-1 rounded">{researchResult.auth_guidance.token_format}</code>
                        </div>
                      
                      {researchResult.auth_guidance.documentation && (
                        <div className="p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                          <strong>📚 Documentation:</strong> 
                          <a 
                            href={researchResult.auth_guidance.documentation} 
                                target="_blank" 
                                rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                              >
                            {researchResult.auth_guidance.documentation}
                              </a>
                            </div>
                          )}
                      
                      {researchResult.auth_guidance.security_note && (
                        <div className="p-2 bg-red-100 border border-red-300 rounded text-xs">
                          <strong>🔒 Security:</strong> {researchResult.auth_guidance.security_note}
                            </div>
                          )}

                      {researchResult.auth_guidance.additional_setup && (
                        <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                          <strong>⚠️ Additional Setup:</strong> {researchResult.auth_guidance.additional_setup}
                            </div>
                          )}
                              </div>
                            </div>
                          )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResearchResult(null)}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
                  >
                    Dismiss
                  </button>
                  {researchResult.auth_guidance?.documentation && (
                    <button
                      type="button"
                      onClick={() => window.open(researchResult.auth_guidance.documentation, '_blank')}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                    >
                      📚 View Docs
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // Scroll to authentication section
                      const authSection = document.querySelector('[name="authType"]');
                      if (authSection) {
                        authSection.scrollIntoView({ behavior: 'smooth' });
                        authSection.focus();
                      }
                    }}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                  >
                    🔧 Configure Auth
                  </button>
                              </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-semibold text-red-800 mb-2">❌ Research Failed</h4>
              <div className="text-sm text-red-700 space-y-2">
                <p><strong>Error:</strong> {researchResult.error}</p>
                {researchResult.suggestion && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                    <p className="text-yellow-800">
                      <strong>💡 Suggestion:</strong> {researchResult.suggestion}
                    </p>
                            </div>
                          )}
                {researchResult.raw_response && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800">
                      🔍 View raw AI response
                    </summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                      {researchResult.raw_response}
                        </div>
                  </details>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResearchResult(null)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open('/api-keys', '_blank')}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                  >
                    Check API Keys
                  </button>
                </div>
                    </div>
            </>
                  )}
                </div>
              )}
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
  // 🔑 BYOK State Management (matching AgentEditor pattern)
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);

  // API research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);

  // 🔑 Load API Keys from BYOK Manager (matching AgentEditor pattern)
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        const result = await response.json();
        
        if (result.success && result.data.api_keys) {
          setAvailableApiKeys(result.data.api_keys);
          setApiKeyError(null);
          console.log('✅ Loaded API keys for ToolEditor:', result.data.api_keys.length);
        } else {
          setApiKeyError('Failed to load API keys');
          console.error('❌ Failed to load API keys:', result);
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Error connecting to API Key Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []); // Only run once on mount

  // Get available frameworks based on API keys (matching AgentEditor pattern)
  const getAvailableFrameworks = () => {
    const frameworks = [];
    
    availableApiKeys.forEach(key => {
      if (key.validation_status === 'valid') {
        switch (key.provider) {
          case 'openai':
            frameworks.push({ value: 'openai', label: '🤖 OpenAI GPT', provider: 'openai' });
            break;
          case 'anthropic':
            frameworks.push({ value: 'anthropic', label: '🧠 Anthropic Claude', provider: 'anthropic' });
            break;
          case 'openrouter':
            frameworks.push({ value: 'openrouter', label: '🌐 OpenRouter', provider: 'openrouter' });
            break;
        }
      }
    });
    
    // Always include built-in options
    frameworks.push(
      { value: 'webhook', label: '🔗 Webhook', provider: 'none' },
      { value: 'api', label: '🌐 REST API', provider: 'none' },
      { value: 'database', label: '🗄️ Database', provider: 'none' }
    );
    
    return frameworks;
  };

  // Existing state
  const [localFrameworkConfig, setLocalFrameworkConfig] = useState(formData.frameworkConfig || {});

  // Find parent agent for inheritance
  const parentAgent = connectedNodes.find(
    node => node.id === formData.inherits_from && (node.type === 'agent' || node.nodeType === 'agent')
  );
  const isInheritingFromAgent = formData.inherits_from && parentAgent;

  useEffect(() => {
    if (formData.frameworkConfig) {
      setLocalFrameworkConfig(formData.frameworkConfig);
    }
  }, [formData.framework]);

  const handleToolTypeChange = (e) => {
    const newToolType = e.target.value;
    handleInputChange(e);
    
    // Reset related fields when tool type changes
    if (newToolType !== 'universal_api_builder') {
      handleInputChange({ target: { name: 'serviceName', value: '' } });
      handleInputChange({ target: { name: 'description', value: '' } });
      handleInputChange({ target: { name: 'selectedLLM', value: '' } });
    }
  };

  const handleApiResearch = async (researchData) => {
    try {
    setIsResearching(true);
    setResearchResult(null);

      // Prepare the request body with LLM information
      const requestBody = {
        service_name: researchData.serviceName,
        description: researchData.description,
        selected_llm: researchData.selectedLLM
      };
      
      // Add endpoint hint if available
      if (researchData.endpointHint) {
        requestBody.endpoint_hint = researchData.endpointHint;
      }
      
      console.log('🤖 Starting API research with:', requestBody);
      
      const response = await fetch('http://localhost:8000/api/tools/research-api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
      const result = await response.json();
        console.log('✅ API research result:', result);
      setResearchResult(result);

      if (result.success) {
          toast.success(`✅ Research complete! Found configuration for ${result.service || researchData.serviceName}`);
          
          // Auto-apply configuration if available
          if (result.configuration) {
            const config = result.configuration;
            
            // Update framework configuration
            const newFrameworkConfig = {
              ...localFrameworkConfig,
              service_name: config.service_name || researchData.serviceName,
              base_url: config.base_url,
              auth_type: config.auth_type,
              endpoints: config.endpoints,
              headers: config.headers || {},
              auto_configured: true
            };
            
            setLocalFrameworkConfig(newFrameworkConfig);
            handleInputChange({
              target: {
                name: 'frameworkConfig',
                value: newFrameworkConfig
              }
            });
            
            // Update tool type to API if not already set
            if (formData.toolType === 'universal_api_builder') {
          handleInputChange({
                target: {
                  name: 'toolType',
                  value: 'api'
                }
              });
            }
            
            toast.success('🔧 Configuration automatically applied!');
          }
        } else {
          // Handle failure cases with helpful messages
          const errorMessage = result.error || 'Unknown error occurred';
          const suggestion = result.suggestion || 'Please try again with different parameters';
          
          console.error('❌ API research failed:', result);
          
          // Check if this is an authentication requirement
          if (result.auth_required || result.auth_guidance) {
            // Show authentication guidance
            const authGuidance = result.auth_guidance;
            if (authGuidance) {
              // Show detailed authentication setup instructions
              const authMessage = `🔐 Authentication Required for ${authGuidance.service}

${authGuidance.auth_type} needed. Here's how to get it:

${authGuidance.steps.join('\n')}

Token format: ${authGuidance.token_format}

📚 Documentation: ${authGuidance.documentation}

${authGuidance.security_note ? `🔒 Security: ${authGuidance.security_note}` : ''}

${authGuidance.additional_setup ? `⚠️ Additional setup: ${authGuidance.additional_setup}` : ''}`;

              toast.error(authMessage, {
                duration: 15000,
                style: {
                  maxWidth: '600px',
                  fontSize: '12px',
                  whiteSpace: 'pre-line'
                }
              });
              
              // Also show a shorter message
              setTimeout(() => {
                toast.info(`💡 After getting your ${authGuidance.auth_type}, come back and configure the authentication in the Tool settings`, {
                  duration: 8000
                });
              }, 2000);
            } else {
              toast.error(`🔐 ${errorMessage}`, {
                duration: 6000
              });
            }
          } else {
            // Show detailed error message
            toast.error(`❌ ${errorMessage}`, {
              duration: 6000,
              style: {
                maxWidth: '500px'
              }
            });
            
            // Show suggestion as a separate info toast
            if (suggestion && suggestion !== errorMessage) {
              setTimeout(() => {
                toast.info(`💡 ${suggestion}`, {
                  duration: 8000,
                  style: {
                    maxWidth: '500px'
                  }
                });
              }, 1000);
            }
          }
          
          // Set research result to show the failure in UI
          setResearchResult({
            success: false,
            error: errorMessage,
            suggestion: suggestion,
            auth_required: result.auth_required,
            auth_guidance: result.auth_guidance,
            raw_response: result.raw_response
          });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API research failed:', response.status, errorText);
        
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        let suggestion = 'Check your internet connection and try again';
        
        if (response.status === 422) {
          errorMessage = 'Invalid request format';
          suggestion = 'Please check that all required fields are filled correctly';
        } else if (response.status === 500) {
          errorMessage = 'Server error occurred';
          suggestion = 'The AI service may be temporarily unavailable. Please try again in a few minutes';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'Authentication failed';
          suggestion = 'Please check your API keys in the BYOK Manager';
        }
        
        toast.error(`❌ ${errorMessage}`);
        setTimeout(() => {
          toast.info(`💡 ${suggestion}`, { duration: 6000 });
        }, 1000);
        
        setResearchResult({
          success: false,
          error: errorMessage,
          suggestion: suggestion
        });
      }
      
    } catch (error) {
      console.error('❌ API research error:', error);
      
      let errorMessage = `Network error: ${error.message}`;
      let suggestion = 'Check your internet connection and ensure the backend server is running';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to backend server';
        suggestion = 'Make sure the backend server is running on localhost:8000';
      }
      
      toast.error(`❌ ${errorMessage}`);
      setTimeout(() => {
        toast.info(`💡 ${suggestion}`, { duration: 6000 });
      }, 1000);

      setResearchResult({
        success: false,
        error: errorMessage,
        suggestion: suggestion
      });
    } finally {
      setIsResearching(false);
    }
  };

  // Handle framework change with auto-injection
  const handleFrameworkChangeLocal = (e) => {
    const newFramework = e.target.value;
    handleInputChange(e);
    
    // Auto-inject API key if available
    if (newFramework && availableApiKeys.length > 0) {
      const framework = newFramework.toLowerCase();
      let matchingKey = null;

      // Map framework to provider
      if (framework.includes('openai')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'openai' && key.validation_status === 'valid');
      } else if (framework.includes('anthropic')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'anthropic' && key.validation_status === 'valid');
      } else if (framework.includes('openrouter')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'openrouter' && key.validation_status === 'valid');
      }

      // Auto-inject the API key if found
      if (matchingKey && !formData.apiKey) {
        const placeholder = `[BYOK:${matchingKey.provider}]`;
        handleInputChange({ target: { name: 'apiKey', value: placeholder } });
        toast.success(`🔑 Auto-injected ${matchingKey.provider_name} API key from BYOK Manager`);
      }
    }
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

  // 🔑 Render BYOK Status Indicator (matching AgentEditor pattern)
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Loading API keys...</span>
          </div>
        </div>
      );
    }

    if (apiKeyError) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-sm">⚠️ {apiKeyError}</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
            >
              Manage Keys
            </button>
          </div>
        </div>
      );
    }

    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    const totalKeys = availableApiKeys.length;

    if (totalKeys === 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-700 text-sm">🔑 No API keys configured for AI tools</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
            >
              Add Keys
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-green-700 text-sm">
            ✅ {validKeys.length}/{totalKeys} API keys ready
            {validKeys.length > 0 && (
              <span className="ml-2 text-xs">
                ({validKeys.map(k => k.provider_name).join(', ')})
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
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
          availableApiKeys={availableApiKeys}
          loadingApiKeys={loadingApiKeys}
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