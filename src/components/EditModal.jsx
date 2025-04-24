import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from './HelpTooltip';
import { toast } from 'react-hot-toast';

/**
 * Modal component for editing node properties
 */
const EditModal = ({ isOpen, onClose, onSave, nodeData, nodeType, availableDependencies = [] }) => {
  // Initialize form data with default values
  const [formData, setFormData] = useState({
    label: '',
    role: '',
    description: '',
    goal: '',
    backstory: '',
    llmModel: 'gpt-4',
    allowDelegation: false,
    verbose: true,
    toolType: 'api',
    apiEndpoint: '',
    apiKey: '',
    parameters: '',
    expectedOutput: '',
    async: false,
    dependencies: [],
    webhookType: 'send-output',
    flowMode: 'replace',
    webhook_url: '',
    secretToken: '',
    prompt: '',
    model: 'gpt-4',
    enableMemory: false,
    condition: '',
    temperature: 0.7,
    max_tokens: 500,
    duration: '5s',
    triggerType: 'manual',
    runAt: '',
    scheduleType: 'once',
    scheduleDays: [],
    scheduleWeekday: 'monday',
    scheduleMonthDay: 1,
    inputType: 'text',
    variableName: '',
    isRequired: false,
    outputType: 'webhook',
    webhookUrl: '',
    sheetId: '',
    email: '',
    framework: '',
    agentConfig: ''
  });

  // Track if form has been modified
  const [isModified, setIsModified] = useState(false);
  
  // Populate form data when nodeData changes
  useEffect(() => {
    if (nodeData) {
      console.log("Setting form data from node data:", nodeData);
      
      // Create a clean copy without any potential circular references
      const cleanData = {
        label: nodeData.label || '',
        role: nodeData.role || '',
        description: nodeData.description || '',
        goal: nodeData.goal || '',
        backstory: nodeData.backstory || '',
        llmModel: nodeData.llmModel || 'gpt-4',
        allowDelegation: nodeData.allowDelegation || false,
        verbose: nodeData.verbose !== undefined ? nodeData.verbose : true,
        toolType: nodeData.toolType || 'api',
        apiEndpoint: nodeData.apiEndpoint || '',
        apiKey: nodeData.apiKey || '',
        parameters: nodeData.parameters || '',
        expectedOutput: nodeData.expectedOutput || '',
        async: nodeData.async || false,
        dependencies: nodeData.dependencies || [],
        webhookType: nodeData.webhookType || 'send-output',
        flowMode: nodeData.flowMode || 'replace',
        webhook_url: nodeData.webhook_url || '',
        secretToken: nodeData.secretToken || '',
        prompt: nodeData.prompt || '',
        model: nodeData.model || 'gpt-4',
        enableMemory: nodeData.enableMemory || false,
        condition: nodeData.condition || '',
        temperature: nodeData.temperature || 0.7,
        max_tokens: nodeData.max_tokens || 500,
        duration: nodeData.duration || '5s',
        triggerType: nodeData.triggerType || 'manual',
        runAt: nodeData.runAt || '',
        scheduleType: nodeData.scheduleType || 'once',
        scheduleDays: nodeData.scheduleDays || [],
        scheduleWeekday: nodeData.scheduleWeekday || 'monday',
        scheduleMonthDay: nodeData.scheduleMonthDay || 1,
        inputType: nodeData.inputType || 'text',
        variableName: nodeData.variableName || '',
        isRequired: nodeData.isRequired || false,
        outputType: nodeData.outputType || 'webhook',
        webhookUrl: nodeData.webhookUrl || '',
        sheetId: nodeData.sheetId || '',
        email: nodeData.email || '',
        framework: nodeData.framework || '',
        agentConfig: nodeData.agentConfig || ''
      };
      
      // Parse runAt into runDate and runTime if it exists
      if (nodeData.runAt) {
        try {
          const [date, time] = nodeData.runAt.split(' ');
          cleanData.runDate = date;
          cleanData.runTime = time;
        } catch (e) {
          console.error('Error parsing runAt:', e);
        }
      }
      
      setFormData(cleanData);
      setIsModified(false);
    }
  }, [nodeData]);
  
  // Generic handler for input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsModified(true);
  }, []);

  // Toggle API key visibility
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Format API key for display
  const formatApiKey = (key) => {
    if (!key) return '';
    return showApiKey ? key : '••••••••••••••••';
  };

  // Add these state variables at the top of your EditModal component
  const [testInput, setTestInput] = useState('{\n  "value": 15,\n  "status": "approved",\n  "message": "Success"\n}');
  const [testResult, setTestResult] = useState(null);
  const [savedTestInputs, setSavedTestInputs] = useState([]);

  // Add this function to save the current test input
  const saveTestInput = () => {
    try {
      // Parse to validate it's valid JSON
      const parsedInput = JSON.parse(testInput);
      
      // Create a name for the saved input
      const inputName = `Test ${savedTestInputs.length + 1}`;
      
      // Add to saved inputs
      setSavedTestInputs([
        ...savedTestInputs,
        { name: inputName, input: testInput }
      ]);
      
      toast.success('Test input saved');
    } catch (error) {
      toast.error('Invalid JSON: ' + error.message);
    }
  };

  // Return null if modal is not open
  if (!isOpen) return null;

  // Use a default value if nodeType is undefined
  const currentNodeType = nodeType || 'agent';

  // Validate form and trigger save
  const handleSave = () => {
    if (!formData.label.trim()) {
      alert('Name is required!');
      return;
    }
    
    // Create a clean copy of the formData to pass to onSave
    const cleanedFormData = { ...formData };
    
    // Perform additional validation if needed
    if (currentNodeType === 'tool' && formData.toolType === 'api' && formData.apiEndpoint) {
      // Simple URL validation
      try {
        new URL(formData.apiEndpoint);
      } catch (e) {
        // Only validate if something is entered
        if (formData.apiEndpoint.trim()) {
          alert('Please enter a valid API endpoint URL');
          return;
        }
      }
    }
    
    // For logic nodes, save the test input
    if (currentNodeType === 'logic' && testInput) {
      try {
        // Validate it's proper JSON
        JSON.parse(testInput);
        cleanedFormData.testInput = testInput;
      } catch (e) {
        // Invalid JSON, don't save it
        console.warn('Invalid test input JSON, not saving:', e);
      }
    }
    
    onSave(cleanedFormData);
    onClose();
  };
  
  const registerTrigger = useCallback(async () => {
    if (!formData.nodeId) return;
    
    try {
      // Find all nodes and edges connected to this trigger
      const connectedNodes = findConnectedNodes(formData.nodeId);
      const connectedEdges = findConnectedEdges(formData.nodeId);
      
      // Create a flow object with just the connected components
      const flow = {
        nodes: connectedNodes,
        edges: connectedEdges,
        trigger_id: formData.nodeId,
        trigger_type: formData.triggerType
      };
      
      // Register the trigger with the backend
      const response = await fetch('/register-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_id: formData.nodeId,
          flow: flow,
          owner: 'current_user' // Replace with actual user ID if available
        })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        console.log(`Trigger registered: ${result.webhook_url}`);
        // Optionally update the node data with the webhook URL
      } else {
        console.error('Failed to register trigger:', result);
      }
    } catch (error) {
      console.error('Error registering trigger:', error);
    }
  }, [formData.nodeId, formData.triggerType]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // Close when clicking the backdrop, but not when clicking the modal itself
        if (e.target === e.currentTarget) {
          if (isModified) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
              onClose();
            }
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="bg-white p-6 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto" onClick={(e) => { if (e) e.stopPropagation(); }}>
        <h2 className="text-xl font-bold mb-4 flex items-center">
          Edit {currentNodeType === 'agent' ? 'Agent' : currentNodeType === 'task' ? 'Task' : currentNodeType === 'chatbot' ? 'Chatbot' : currentNodeType === 'delay' ? 'Delay' : currentNodeType === 'trigger' ? 'Trigger' : currentNodeType === 'logic' ? 'Logic' : 'Tool'}
          <HelpTooltip type={currentNodeType} />
        </h2>

        {/* Name Field (Common to All Types) */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 flex items-center">
            Name
            <HelpTooltip type={currentNodeType} field="label" />
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Agent-Specific Fields */}
        {currentNodeType === 'agent' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Role
                <HelpTooltip type="agent" field="role" />
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., Researcher, Writer, Analyst"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Goal
                <HelpTooltip type="agent" field="goal" />
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="What is this agent trying to achieve?"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Backstory
                <HelpTooltip type="agent" field="backstory" />
              </label>
              <textarea
                value={formData.backstory}
                onChange={(e) => handleInputChange('backstory', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Background information that shapes the agent's perspective"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                LLM Model
                <HelpTooltip type="agent" field="llmModel" />
              </label>
              <select
                value={formData.llmModel}
                onChange={(e) => handleInputChange('llmModel', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="allowDelegation"
                checked={formData.allowDelegation}
                onChange={(e) => handleInputChange('allowDelegation', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="allowDelegation" className="text-gray-700 flex items-center">
                Allow Delegation
                <HelpTooltip type="agent" field="allowDelegation" />
              </label>
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="verbose"
                checked={formData.verbose}
                onChange={(e) => handleInputChange('verbose', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="verbose" className="text-gray-700 flex items-center">
                Verbose Output
                <HelpTooltip type="agent" field="verbose" />
              </label>
            </div>
          </>
        )}

        {/* Task-Specific Fields */}
        {currentNodeType === 'task' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="task" field="description" />
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Detailed description of what needs to be done"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Expected Output
                <HelpTooltip type="task" field="expectedOutput" />
              </label>
              <textarea
                value={formData.expectedOutput}
                onChange={(e) => handleInputChange('expectedOutput', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="What should this task produce?"
              />
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="async"
                checked={formData.async}
                onChange={(e) => handleInputChange('async', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="async" className="text-gray-700 flex items-center">
                Asynchronous Execution
                <HelpTooltip type="task" field="async" />
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Dependencies</label>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-500 mb-2">
                  Dependencies are automatically detected from connections, but you can specify dependency types:
                </p>
                {formData.dependencies && formData.dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <span className="text-sm font-medium mr-2">{dep.label}:</span>
                    <select
                      value={dep.type}
                      onChange={(e) => {
                        const newDeps = [...formData.dependencies];
                        newDeps[index] = { ...newDeps[index], type: e.target.value };
                        setFormData({ ...formData, dependencies: newDeps });
                      }}
                      className="text-sm p-1 border rounded"
                    >
                      <option value="data">Data Dependency</option>
                      <option value="execution">Execution Dependency</option>
                      <option value="optional">Optional</option>
                    </select>
                  </div>
                ))}
                {(!formData.dependencies || formData.dependencies.length === 0) && (
                  <p className="text-sm text-gray-400 italic">No dependencies detected. Connect this task to other tasks to create dependencies.</p>
                )}
              </div>
            </div>

            {/* Condition Field for Tasks and Tools */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                🧠 Condition to Run (optional)
                <HelpTooltip type="task" field="condition" />
              </label>
              <input
                type="text"
                value={formData.condition || ""}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                placeholder="e.g. inputs.score > 80"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="mt-2 text-xs text-gray-500 leading-snug">
                This node will only execute if the condition is true.<br />
                Use <code className="bg-gray-100 px-1 py-0.5 rounded">inputs.*</code> in your logic.
                <br />
                Examples:
                <ul className="list-disc list-inside mt-1">
                  <li><code>inputs.score &gt;= 80</code></li>
                  <li><code>inputs.job_title === "Engineer"</code></li>
                  <li><code>inputs.email.includes("@")</code></li>
                </ul>
              </div>
            </div>
          </>
        )}
        
        {/* Tool-Specific Fields */}
        {currentNodeType === 'tool' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="tool" field="description" />
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="What does this tool do?"
              />
            </div>

            {/* Tool configuration based on framework */}
            {formData.framework === 'cv_parser' && (
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  CV Parser will extract information from uploaded PDF documents
                </div>
              </div>
            )}

            {formData.framework === 'openrouter' && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Model</label>
                  <select
                    value={formData.model || 'gpt-4'}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Temperature</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature || 0.7}
                    onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </>
            )}

            {formData.framework === 'huggingface' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Model Name</label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., bert-base-uncased"
                />
              </div>
            )}

            {formData.framework === 'crewai' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Agent Configuration</label>
                <textarea
                  value={formData.agentConfig || ''}
                  onChange={(e) => handleInputChange('agentConfig', e.target.value)}
                  className="w-full p-2 border rounded"
                  rows="4"
                  placeholder="Configure agent properties..."
                />
              </div>
            )}

            {formData.framework === 'langchain' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Chain Type</label>
                <select
                  value={formData.chainType || 'llm'}
                  onChange={(e) => handleInputChange('chainType', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="llm">LLM Chain</option>
                  <option value="sequential">Sequential Chain</option>
                  <option value="router">Router Chain</option>
                </select>
              </div>
            )}

            {/* API Configuration if needed */}
            {formData.toolType === 'api' && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1 flex items-center">
                    API Endpoint
                    <HelpTooltip type="tool" field="apiEndpoint" />
                  </label>
                  <input
                    type="text"
                    value={formData.apiEndpoint || ''}
                    onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-1 flex items-center">
                    API Key
                    <HelpTooltip type="tool" field="apiKey" />
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey || ''}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Enter API key"
                  />
                </div>
              </>
            )}

            {/* Webhook Configuration if needed */}
            {formData.toolType === 'webhook' && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Webhook URL</label>
                  <input
                    type="text"
                    value={formData.webhook_url || ''}
                    onChange={(e) => handleInputChange('webhook_url', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="https://example.com/webhook"
                  />
                </div>
              </>
            )}

            {/* Parameters Section */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Parameters
                <HelpTooltip type="tool" field="parameters" />
              </label>
              <textarea
                value={formData.parameters || ''}
                onChange={(e) => handleInputChange('parameters', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="Parameters the tool accepts (one per line)"
              />
            </div>

            {/* Condition Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                🧠 Condition to Run (optional)
                <HelpTooltip type="tool" field="condition" />
              </label>
              <input
                type="text"
                value={formData.condition || ""}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                placeholder="e.g. inputs.score > 80"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Chat-Specific Fields */}
        {currentNodeType === 'chatbot' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="chatbot" field="description" />
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Brief description of this chatbot's purpose"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Initial Prompt / System Message
                <HelpTooltip type="chatbot" field="prompt" />
              </label>
              <textarea
                value={formData.prompt || ''}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Initial message or system instructions for the chatbot"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                LLM Model
                <HelpTooltip type="chatbot" field="llmModel" />
              </label>
              <select
                value={formData.llmModel || 'gpt-4'}
                onChange={(e) => handleInputChange('llmModel', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="mistral-large">Mistral Large</option>
                <option value="mistral-medium">Mistral Medium</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Temperature
                <HelpTooltip type="chatbot" field="temperature" />
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature || 0.7}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                  className="w-full mr-2"
                />
                <span className="text-sm w-10 text-center">{formData.temperature || 0.7}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Lower values (0.0) make responses more focused and deterministic.
                Higher values (1.0) make responses more creative and varied.
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Max Tokens
                <HelpTooltip type="chatbot" field="max_tokens" />
              </label>
              <input
                type="number"
                min="50"
                max="4000"
                value={formData.max_tokens || 500}
                onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              />
              <div className="text-xs text-gray-500 mt-1">
                Maximum length of the response. Higher values allow longer responses but may cost more.
              </div>
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="enableMemory"
                checked={formData.enableMemory || false}
                onChange={(e) => handleInputChange('enableMemory', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="enableMemory" className="text-gray-700 flex items-center">
                Enable Memory
                <HelpTooltip type="chatbot" field="enableMemory" />
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                🧠 Condition to Run (optional)
                <HelpTooltip type="chatbot" field="condition" />
              </label>
              <input
                type="text"
                value={formData.condition || ""}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                placeholder="e.g. inputs.score > 80"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="mt-2 text-xs text-gray-500 leading-snug">
                This node will only execute if the condition is true.<br />
                Use <code className="bg-gray-100 px-1 py-0.5 rounded">inputs.*</code> in your logic.
                <br />
                Examples:
                <ul className="list-disc list-inside mt-1">
                  <li><code>inputs.score &gt;= 80</code></li>
                  <li><code>inputs.job_title === "Engineer"</code></li>
                  <li><code>inputs.email.includes("@")</code></li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Delay-Specific Fields */}
        {currentNodeType === 'delay' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="delay" field="description" />
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Brief description of this delay's purpose"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Duration
                <HelpTooltip type="delay" field="duration" />
              </label>
              <input
                type="text"
                value={formData.duration || '5s'}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. 5s, 2m, 1h"
              />
              <div className="text-xs text-gray-500 mt-1">
                Format: 5s (seconds), 2m (minutes), 1h (hours)
              </div>
            </div>
          </>
        )}

        {/* Trigger-Specific Fields */}
        {currentNodeType === 'trigger' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="trigger" field="description" />
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Brief description of this trigger's purpose"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Trigger Type
                <HelpTooltip type="trigger" field="triggerType" />
              </label>
              <select
                value={formData.triggerType || 'manual'}
                onChange={(e) => handleInputChange('triggerType', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="manual">Manual</option>
                <option value="webhook">Webhook</option>
                <option value="schedule">Schedule</option>
              </select>
            </div>

            {formData.triggerType === 'schedule' && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1 flex items-center">
                    Schedule Type
                  </label>
                  <select
                    value={formData.scheduleType || 'once'}
                    onChange={(e) => handleInputChange('scheduleType', e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="once">Run Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                {/* Date/Time picker for one-time schedules */}
                {formData.scheduleType === 'once' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-1 flex items-center">
                      Run At
                      <HelpTooltip type="trigger" field="runAt" />
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={formData.runDate || ''}
                        onChange={(e) => {
                          handleInputChange('runDate', e.target.value);
                          // Combine date and time into runAt
                          const newDate = e.target.value;
                          const currentTime = formData.runTime || '12:00';
                          handleInputChange('runAt', `${newDate} ${currentTime}`);
                        }}
                        className="flex-1 p-2 border rounded"
                      />
                      <input
                        type="time"
                        value={formData.runTime || ''}
                        onChange={(e) => {
                          handleInputChange('runTime', e.target.value);
                          // Combine date and time into runAt
                          const currentDate = formData.runDate || new Date().toISOString().split('T')[0];
                          const newTime = e.target.value;
                          handleInputChange('runAt', `${currentDate} ${newTime}`);
                        }}
                        className="flex-1 p-2 border rounded"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Select when this trigger should execute
                    </div>
                  </div>
                )}
                
                {/* Weekly schedule options */}
                {formData.scheduleType === 'weekly' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-1">
                      Day of Week
                    </label>
                    <select
                      value={formData.scheduleWeekday || 'monday'}
                      onChange={(e) => handleInputChange('scheduleWeekday', e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                )}
                
                {/* Monthly schedule options */}
                {formData.scheduleType === 'monthly' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-1">
                      Day of Month
                    </label>
                    <select
                      value={formData.scheduleMonthDay || 1}
                      onChange={(e) => handleInputChange('scheduleMonthDay', parseInt(e.target.value))}
                      className="w-full p-2 border rounded"
                    >
                      {[...Array(31)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Daily schedule options */}
                {formData.scheduleType === 'daily' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-1">
                      Time Window
                    </label>
                    <div className="flex space-x-2 items-center">
                      <input
                        type="time"
                        value={formData.scheduleStartTime || '09:00'}
                        onChange={(e) => handleInputChange('scheduleStartTime', e.target.value)}
                        className="flex-1 p-2 border rounded"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={formData.scheduleEndTime || '17:00'}
                        onChange={(e) => handleInputChange('scheduleEndTime', e.target.value)}
                        className="flex-1 p-2 border rounded"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {formData.triggerType === 'webhook' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1 flex items-center">
                  Webhook URL
                  <HelpTooltip type="trigger" field="webhook" />
                </label>
                <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
                  {`${window.location.origin}/trigger/${formData.nodeId || 'id'}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Send a POST request to this URL to trigger the workflow
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/trigger/${formData.nodeId || 'id'}`);
                      toast.success('Webhook URL copied to clipboard');
                    }}
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded ml-2"
                    onClick={registerTrigger}
                  >
                    Register Webhook
                  </button>
                  <button
                    type="button"
                    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded ml-2"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/trigger/${formData.nodeId}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
                        });
                        const result = await response.json();
                        toast.success('Webhook test triggered successfully');
                      } catch (error) {
                        toast.error('Failed to test webhook');
                        console.error(error);
                      }
                    }}
                  >
                    Test Webhook
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Logic Node Fields */}
        {currentNodeType === 'logic' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="logic" field="description" />
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Evaluates a condition and routes flow"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Condition
                <HelpTooltip type="logic" field="condition" />
                <span 
                  className="ml-1 text-gray-500 cursor-help text-xs"
                  title="Use inputs.*, context.*, or env.* in conditions. You can write Python-like logic using and, or, not."
                >
                  ❓
                </span>
              </label>
              <textarea
                value={formData.condition || ''}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full p-2 border rounded font-mono"
                placeholder="inputs.value > 10"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">
                Use Python-like syntax. Available variables: inputs, context, env
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
              <h4 className="font-medium text-yellow-800 mb-2">Condition Examples:</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li><code className="bg-yellow-100 px-1 rounded">inputs.temperature {'>'} 70</code> - Check if temperature exceeds 70</li>
                <li><code className="bg-yellow-100 px-1 rounded">inputs.status == "approved"</code> - Check if status is "approved"</li>
                <li><code className="bg-yellow-100 px-1 rounded">"error" in inputs.message</code> - Check if message contains "error"</li>
                <li><code className="bg-yellow-100 px-1 rounded">len(inputs.items) {'>'} 0</code> - Check if items list is not empty</li>
                <li><code className="bg-yellow-100 px-1 rounded">inputs.score {'>'} 80 and inputs.status == "approved"</code> - Score AND status check</li>
                <li><code className="bg-yellow-100 px-1 rounded">inputs.country == "France" or inputs.score {'>'} 90</code> - Either country or high score</li>
                <li><code className="bg-yellow-100 px-1 rounded">not inputs.flagged</code> - Flag must be false or missing</li>
              </ul>
            </div>

            {/* Add condition testing section */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">Test Your Condition</h3>
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">
                  Test Input (JSON)
                </label>
                <textarea
                  value={testInput || '{\n  "value": 15,\n  "status": "approved",\n  "message": "Success"\n}'}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full p-2 border rounded font-mono text-sm"
                  rows={5}
                  placeholder='{"value": 15, "status": "approved"}'
                />
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold">Saved Inputs</h3>
                
                <div className="flex items-center space-x-2">
                  <select
                    className="text-sm border rounded p-1"
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
                    <option value="">Load saved input</option>
                    {savedTestInputs.map((item, index) => (
                      <option key={index} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    onClick={saveTestInput}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                  >
                    Save Input
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const inputs = JSON.parse(testInput);
                      // Simple evaluation using Function constructor
                      const result = new Function('inputs', `return ${formData.condition}`)(inputs);
                      setTestResult({
                        success: true,
                        result: result,
                        path: result ? 'true' : 'false'
                      });
                    } catch (error) {
                      setTestResult({
                        success: false,
                        error: error.message
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  Run Test
                </button>
                
                {testResult && (
                  <div className={`ml-4 p-2 rounded ${
                    testResult.success 
                      ? testResult.result 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {testResult.success 
                      ? <>
                          Result: <span className="font-bold">{testResult.result ? 'TRUE' : 'FALSE'}</span>
                          <div className="text-xs mt-1">
                            Flow will follow the <span className="font-semibold">{testResult.path}</span> path
                          </div>
                        </>
                      : <>Error: {testResult.error}</>
                    }
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Input Node-Specific Fields */}
        {currentNodeType === 'input' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Input Type
                <HelpTooltip type="input" field="inputType" />
              </label>
              <select
                value={formData.inputType || 'text'}
                onChange={(e) => handleInputChange('inputType', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="text">Text Input</option>
                <option value="file">File Upload</option>
                <option value="url">URL Input</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Variable Name
                <HelpTooltip type="input" field="variableName" />
              </label>
              <input
                type="text"
                value={formData.variableName || ''}
                onChange={(e) => handleInputChange('variableName', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., user_input"
              />
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="isRequired"
                checked={formData.isRequired || false}
                onChange={(e) => handleInputChange('isRequired', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isRequired" className="text-gray-700">Required Input</label>
            </div>
          </>
        )}

        {/* Output Node-Specific Fields */}
        {currentNodeType === 'output' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Output Type
                <HelpTooltip type="output" field="outputType" />
              </label>
              <select
                value={formData.outputType || 'webhook'}
                onChange={(e) => handleInputChange('outputType', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="webhook">Webhook</option>
                <option value="discord">Discord</option>
                <option value="sheets">Google Sheets</option>
                <option value="email">Email</option>
              </select>
            </div>

            {formData.outputType === 'webhook' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Webhook URL</label>
                <input
                  type="text"
                  value={formData.webhookUrl || ''}
                  onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="https://example.com/webhook"
                />
              </div>
            )}

            {formData.outputType === 'discord' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Discord Webhook URL</label>
                <input
                  type="text"
                  value={formData.webhookUrl || ''}
                  onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Discord webhook URL"
                />
              </div>
            )}

            {formData.outputType === 'sheets' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Sheet ID</label>
                <input
                  type="text"
                  value={formData.sheetId || ''}
                  onChange={(e) => handleInputChange('sheetId', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Google Sheet ID"
                />
              </div>
            )}

            {formData.outputType === 'email' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="recipient@example.com"
                />
              </div>
            )}
          </>
        )}

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => {
              if (isModified) {
                if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Define PropTypes for type safety and documentation
EditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  nodeData: PropTypes.object,
  nodeType: PropTypes.oneOf([
    'agent', 
    'task', 
    'tool', 
    'chatbot', 
    'delay', 
    'trigger', 
    'logic',
    'input',
    'output'
  ]),
  availableDependencies: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      name: PropTypes.string
    })
  )
};

export default EditModal;