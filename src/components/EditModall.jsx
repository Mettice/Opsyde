import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import CommonFields from './CommonFields';
import ModalFooter from './ModalFooter';
import HelpTooltip from './HelpTooltip';
import AgentEditor from './editmodal/AgentEditor';
import TaskEditor from './editmodal/TaskEditor';
import ToolEditor from './editmodal/ToolEditor';
import ChatbotEditor from './editmodal/ChatbotEditor';
import DelayEditor from './editmodal/DelayEditor';
import TriggerEditor from './editmodal/TriggerEditor';
import LogicEditor from './editmodal/LogicEditor';
import InputEditor from './editmodal/InputEditor';
import OutputEditor from './editmodal/OutputEditor';
import InheritanceSelector from './editmodal/shared/InheritanceSelector';


// Tool type constants
export const ToolType = {
  LLM: 'llm',
  API: 'api',
  WEBHOOK: 'webhook',
  CUSTOM: 'custom'
};

// Framework constants
export const FRAMEWORK_OPTIONS = {
  AGENT: [
    { value: 'openai', label: 'OpenAI' },
    { value: 'crewai', label: 'CrewAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'autogen', label: 'Autogen' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'huggingface', label: 'HuggingFace' },
    { value: 'llamaindex', label: 'LlamaIndex' },
    { value: 'webhook', label: 'Webhook' }
  ],
  LLM: [
    { value: 'openai', label: 'OpenAI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'huggingface', label: 'HuggingFace' }
  ],
  API: [
    { value: 'webhook', label: 'Webhook' },
    { value: 'api', label: 'API' },
    { value: 'custom', label: 'Custom' }
  ]
};

// Function to get output schema for each node type
const getOutputSchemaForNode = (nodeData, nodeType) => {
  const schemas = {
    agent: {
      response: { type: 'string', sample: 'AI agent response text' },
      status: { type: 'string', sample: 'completed' },
      token_usage: { type: 'number', sample: 150 },
      execution_time: { type: 'number', sample: 2.5 },
      'data.result': { type: 'string', sample: 'Agent execution result' },
      'data.status': { type: 'string', sample: 'completed|error' }
    },
    task: {
      result: { type: 'string', sample: 'Task execution result' },
      status: { type: 'string', sample: 'success' },
      output: { type: 'object', sample: '{data: "processed"}' },
      duration: { type: 'number', sample: 1.5 },
      'data.result': { type: 'string', sample: 'Task output' },
      'data.status': { type: 'string', sample: 'completed|failed' },
      'data.task_name': { type: 'string', sample: 'Task name' }
    },
    tool: {
      response: { type: 'object', sample: '{result: "tool output"}' },
      status_code: { type: 'number', sample: 200 },
      success: { type: 'boolean', sample: true },
      error: { type: 'string', sample: null }
    },
    input: {
      value: { type: 'string', sample: 'User input text' },
      type: { type: 'string', sample: 'text' },
      timestamp: { type: 'number', sample: Date.now() }
    },
    chatbot: {
      message: { type: 'string', sample: 'Chatbot response' },
      conversation_id: { type: 'string', sample: 'conv_123' },
      user_input: { type: 'string', sample: 'User message' }
    },
    trigger: {
      triggered: { type: 'boolean', sample: true },
      trigger_time: { type: 'string', sample: '2024-01-01T12:00:00Z' },
      payload: { type: 'object', sample: '{data: "trigger data"}' }
    },
    delay: {
      completed: { type: 'boolean', sample: true },
      duration: { type: 'string', sample: '5s' },
      start_time: { type: 'string', sample: '2024-01-01T12:00:00Z' }
    }
  };
  
  return schemas[nodeType] || {};
};

/**
 * Modal component for editing node properties
 */
const EditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  nodeData, 
  nodeType, 
  availableDependencies = [], 
  connectedNodes = [],
  workflowNodes = []
}) => {
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
    agentConfig: '',
    frameworkConfig: {
      model: '',
      temperature: 0.7,
      max_tokens: 2000,
      url: '',
      task: '',
      index_type: ''
    }
  });

  // Track if form has been modified
  const [isModified, setIsModified] = useState(false);
  
  // Add error state
  const [error, setError] = useState(null);
  
  // For logic node testing
  const [testInput, setTestInput] = useState('{\n  "value": 15,\n  "status": "approved",\n  "message": "Success"\n}');
  const [testResult, setTestResult] = useState(null);
  const [savedTestInputs, setSavedTestInputs] = useState([]);

  // Use a default value if nodeType is undefined
  const currentNodeType = nodeType || 'agent';

  // Function to get connected nodes with their output schemas
  const getConnectedNodesWithSchemas = () => {
    return connectedNodes.map(node => ({
      id: node.id,
      type: node.type || node.nodeType,
      outputs: getOutputSchemaForNode(node.data, node.type || node.nodeType)
    }));
  };

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
        agentConfig: nodeData.agentConfig || '',
        frameworkConfig: nodeData.frameworkConfig || {}
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
      
      // Set framework-specific configuration
      if (nodeData.framework && nodeData.frameworkConfig) {
        cleanData.frameworkConfig = {
          ...cleanData.frameworkConfig,
          ...nodeData.frameworkConfig
        };
      }
      
      setFormData(cleanData);
      setIsModified(false);
    }
  }, [nodeData]);
  
  // Generic handler for input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('frameworkConfig.')) {
      const configKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        frameworkConfig: {
          ...prev.frameworkConfig,
          [configKey]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    setIsModified(true);
  };

  // Validate form and trigger save
  const handleSave = async () => {
    setError(null); // Clear any previous errors
    
    // Validate required fields
    const requiredFields = ['label'];
    if (currentNodeType === 'agent') {
      requiredFields.push('role', 'goal', 'backstory', 'framework');
    }

    const missingFields = requiredFields.filter(field => !formData[field]);
    
    // Framework specific validation
    if (formData.framework) {
      if (formData.framework === 'webhook') {
        if (!formData.frameworkConfig?.url) {
          missingFields.push('webhook URL');
        }
      } else if (!formData.frameworkConfig?.model) {
        missingFields.push('model');
      }
    }

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      // Clean the form data
      const cleanedData = {
        ...formData,
        frameworkConfig: Object.fromEntries(
          Object.entries(formData.frameworkConfig || {})
            .filter(([_, value]) => value !== '' && value !== undefined)
        )
      };

      // For input nodes, ensure inputType is explicitly set
      if (currentNodeType === 'input') {
        // Make sure inputType is properly set
        cleanedData.inputType = formData.inputType || 'text';
        console.log('Saving input node with type:', cleanedData.inputType);
      }

      console.log('Saving node with data:', cleanedData);
      
      await onSave(cleanedData);
      setIsModified(false);
      onClose();
    } catch (error) {
      console.error('Error saving node:', error);
      setError('Failed to save node. Please try again.');
    }
  };

  // Function to handle framework change
  const handleFrameworkChange = (e) => {
    const framework = e.target.value;
    
    // Set appropriate default configuration based on node type and tool type
    let defaultConfig = {};
    
    if (currentNodeType === 'tool') {
      // Handle tool node framework changes
      if (formData.toolType === ToolType.LLM) {
        defaultConfig = {
          model: framework === 'openai' ? 'gpt-4' : 
                 framework === 'anthropic' ? 'claude-3-sonnet' :
                 framework === 'openrouter' ? 'meta-llama/llama-2-70b-chat' : '',
          temperature: 0.7,
          max_tokens: 4000
        };
      } else if (formData.toolType === ToolType.API || 
                 formData.toolType === ToolType.WEBHOOK || 
                 formData.toolType === ToolType.CUSTOM) {
        defaultConfig = {
          method: 'POST',
          headers: {},
          body: {}
        };
      }
    } else if (currentNodeType === 'agent') {
      // Handle agent node framework changes (existing logic)
      if (framework === 'webhook') {
        defaultConfig = {
          url: '',
          method: 'POST',
          headers: {},
          body: {}
        };
      } else {
        defaultConfig = {
          model: framework === 'openai' ? 'gpt-4' : 
                 framework === 'anthropic' ? 'claude-3-sonnet' :
                 framework === 'crewai' ? 'gpt-4' : 
                 framework === 'autogen' ? 'gpt-4' : '',
          temperature: 0.7,
          max_tokens: 2000
        };
      }
    }
  
    console.log('Framework changed to:', framework, 'with config:', defaultConfig);
  
    setFormData(prev => ({
      ...prev,
      framework,
      frameworkConfig: defaultConfig
    }));
    
    setIsModified(true);
  };

  // Return null if modal is not open
  if (!isOpen) return null;

  // Save test input function
  const saveTestInput = () => {
    try {
      // Parse to validate it's valid JSON
      const parsedInput = JSON.parse(testInput);
      
      // Create a name for the saved input
      const inputName = `Test ${savedTestInputs.length + 1}`;
      
      // Add to saved inputs
      setSavedTestInputs([
        ...savedTestInputs,
        { name: inputName, input: testInput, timestamp: Date.now() }
      ]);
      
      toast.success('Test input saved');
    } catch (error) {
      toast.error('Invalid JSON: ' + error.message);
    }
  };



  const getInheritableNodes = () => {
    return workflowNodes.filter(node => 
      node.id !== nodeData?.nodeId && // Can't inherit from self
      node.type !== nodeType // Usually can't inherit from same type
    );
  };

  // Render the appropriate node editor based on node type
  const renderNodeEditor = () => {
    const editorProps = {
      formData, 
      setFormData,
      handleInputChange,
      handleFrameworkChange,
      testInput,
      setTestInput,
      testResult,
      setTestResult,
      savedTestInputs,
      saveTestInput,
      connectedNodes: getConnectedNodesWithSchemas() // Pass processed connected nodes
    };


  
    const inheritanceSelector = (
      <InheritanceSelector
        formData={formData}
        handleInputChange={handleInputChange}
        availableNodes={getInheritableNodes()}
        nodeType={currentNodeType}
      />
    );

    switch (currentNodeType) {
      case 'agent':
        return <AgentEditor {...editorProps} />;
      case 'task':
        return (
          <>
          {inheritanceSelector}
          <TaskEditor {...editorProps} availableDependencies={availableDependencies} />
          </>
        );
      case 'tool':
        return (<>
        {inheritanceSelector}
        <ToolEditor {...editorProps} />
        </>);
      case 'chatbot':
        return <ChatbotEditor {...editorProps} />;
      case 'delay':
        return <DelayEditor {...editorProps} />;
      case 'trigger':
        return <TriggerEditor {...editorProps} />;
      case 'logic':
        return <LogicEditor {...editorProps} />;
      case 'input':
        return <InputEditor {...editorProps} />;
      case 'output':
        return <OutputEditor {...editorProps} />;
      default:
        return <div>Unknown node type: {currentNodeType}</div>;
    }
  };

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
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}
        <h2 className="text-xl font-bold mb-4 flex items-center">
          Edit {currentNodeType === 'agent' ? 'Agent' : currentNodeType === 'task' ? 'Task' : currentNodeType === 'chatbot' ? 'Chatbot' : currentNodeType === 'delay' ? 'Delay' : currentNodeType === 'trigger' ? 'Trigger' : currentNodeType === 'logic' ? 'Logic' : 'Tool'}
          <HelpTooltip type={currentNodeType} />
        </h2>

        {/* Common fields like name/label */}
        <CommonFields formData={formData} handleInputChange={handleInputChange} nodeType={currentNodeType} />
        
        {/* Node-specific editor */}
        {renderNodeEditor()}
        
        {/* Modal Buttons */}
        <ModalFooter 
          isModified={isModified} 
          onClose={onClose} 
          onSave={handleSave} 
        />
      </div>
    </div>
  );
};

// Define PropTypes AFTER the component declaration
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
  ),
  connectedNodes: PropTypes.array
};

export default EditModal;