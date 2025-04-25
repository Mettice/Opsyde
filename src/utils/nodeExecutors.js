import { toast } from 'react-hot-toast';
import { sendToEmail, postToDiscord, pushToSheets, postToSlack } from './outputUtils';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Helper function to remove circular references
function removeCircularReferences(obj) {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  }));
}

// Add this helper at the top of the file
function cleanDataForBackend(obj) {
  if (!obj) return obj;
  
  // Handle DOM elements and React components
  if (obj instanceof Element || (obj && obj.$$typeof)) {
    return undefined;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDataForBackend(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip React-specific properties and DOM elements
      if (key.startsWith('_') || key.startsWith('__react')) {
        continue;
      }
      cleaned[key] = cleanDataForBackend(value);
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Execute an agent node by calling the backend
 */
export const executeAgentNode = async (node, inputs) => {
  const data = node.data || {};
  const label = data.label || 'Agent';
  const role = data.role || 'Assistant';
  
  console.log(`Executing agent node: ${label} (${role})`, inputs);
  
  try {
    // Create a complete agent data structure
    const agentData = {
      nodeId: node.id,
      label,
      role,
      llmModel: data.llmModel || 'gpt-4',
      temperature: data.temperature || 0.7,
      maxTokens: data.max_tokens || 4000,
      useMemory: data.enableMemory || false,
      prompt: data.prompt || '',
      type: 'agent'
    };

    // Clean the data before sending to backend
    const cleanedData = cleanDataForBackend({
      ...data,
      ...agentData,
      // Remove any React-specific or circular references
      onEdit: undefined,
      onDelete: undefined,
      onValueChange: undefined,
      ref: undefined,
      component: undefined
    });

    const cleanedInputs = cleanDataForBackend(inputs);
    
    const response = await fetch(`${BACKEND_URL}/execute-node`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nodeType: 'agent',
        nodeData: cleanedData,
        inputs: cleanedInputs
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const result = await response.json();
    
    // Return a complete agent status object
    return {
      output: `Agent ${label} ready for tasks`,
      type: 'agent_status',
      agent_name: label,
      agent_role: role,
      agent_id: node.id,
      llmModel: agentData.llmModel,
      temperature: agentData.temperature,
      maxTokens: agentData.maxTokens,
      useMemory: agentData.useMemory,
      prompt: agentData.prompt,
      status: 'ready'
    };
  } catch (error) {
    console.error('Error executing agent node:', error);
    return {
      output: `Error executing agent: ${error.message}`,
      type: 'error',
      error: true,
      message: error.message
    };
  }
};

/**
 * Execute a task node by calling the backend
 */
export const executeTaskNode = async (node, inputs) => {
  const data = node.data || {};
  const label = data.label || 'Task';
  
  // Find agent data from inputs
  const agentData = inputs.agent;
  
  // Debug task data
  console.log('Task node execution:', {
    taskId: node.id,
    label: label,
    agentData: agentData,
    data: data,
    inputs: inputs
  });
  
  // Check for assigned agent
  if (!agentData || !agentData.type === 'agent_status') {
    const error = `Task '${label}' requires an agent`;
    console.error('No agent assigned to task:', {
      taskId: node.id,
      label: label,
      data: data
    });
    return {
      output: error,
      type: 'error',
      error: 'No agent assigned',
      nodeId: node.id,
      nodeType: 'task'
    };
  }
  
  console.log(`Executing task node: ${label} with agent:`, agentData);
  
  try {
    // Clean the data before sending to backend
    const cleanedData = cleanDataForBackend({
      ...data,
      label,
      description: data.description || '',
      expectedOutput: data.expectedOutput || '',
      agent: {
        type: 'agent_status',
        agent_name: agentData.agent_name,
        agent_role: agentData.agent_role,
        agent_id: agentData.agent_id,
        llmModel: agentData.llmModel || 'gpt-4',
        temperature: agentData.temperature || 0.7,
        maxTokens: agentData.maxTokens || 4000,
        useMemory: agentData.useMemory || false,
        prompt: agentData.prompt || ''
      }
    });
    
    const cleanedInputs = cleanDataForBackend(inputs);
    
    // Call the backend to execute the task
    const response = await fetch(`${BACKEND_URL}/execute-node`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nodeType: 'task',
        nodeData: cleanedData,
        inputs: cleanedInputs
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      ...result,
      output: result.output || `Task '${label}' executed by ${agentData.agent_name}`,
      type: 'task_result',
      task_name: label,
      agent: agentData.agent_name,
      agent_settings: {
        llm_model: agentData.llmModel,
        temperature: agentData.temperature,
        max_tokens: agentData.maxTokens,
        memory_enabled: agentData.useMemory
      },
      nodeId: node.id
    };
  } catch (error) {
    console.error('Error executing task node:', {
      error: error.message,
      nodeId: node.id,
      label: label
    });
    return {
      output: `Error executing task: ${error.message}`,
      type: 'error',
      error: true,
      message: error.message,
      nodeId: node.id
    };
  }
};

/**
 * Execute a tool node by calling the backend
 */
export const executeToolNode = async (node, inputs, retries = 3) => {
  const data = node.data || {};
  const label = data.label || 'Tool';
  const toolType = data.toolType?.toLowerCase() || 'unknown';
  const customTool = data.customTool || (toolType === 'custom' ? 'cv_parser' : undefined);
  
  console.log(`Executing tool node:`, {
    label,
    toolType,
    customTool,
    data,
    inputs
  });
  
  try {
    // Clean the data before sending to backend
    const cleanedData = cleanDataForBackend({
      ...data,
      toolType: customTool || toolType,
      customTool: customTool
    });
    const cleanedInputs = cleanDataForBackend(inputs);
    
    // Call the backend to execute the tool
    const response = await fetch(`${BACKEND_URL}/execute-node`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nodeType: 'tool',
        nodeData: {
          ...cleanedData,
          // Ensure we pass both toolType and customTool
          toolType: customTool || toolType,
          customTool: customTool
        },
        inputs: cleanedInputs
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server responded with ${response.status}`);
    }
    
    const result = await response.json();
    
    // Check if result contains an error
    if (result.type === 'error') {
      if (retries > 0) {
        console.log(`Retrying tool node (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return executeToolNode(node, inputs, retries - 1);
      }
      throw new Error(result.error || 'Tool execution failed');
    }
    
    // Special handling for CV parser results
    if (customTool === 'cv_parser' && result.data) {
      // Clean the CV parser results to remove any circular references
      const cleanedData = removeCircularReferences(result.data);
      const output = {
        type: 'cv_result',
        data: cleanedData,
        nodeId: node.id,
        nodeType: 'tool',
        toolType: 'cv_parser',
        // Add a formatted output for display
        output: `CV Parsed Successfully:\n- Experience: ${cleanedData.experience_years} years\n- Skills: ${cleanedData.skills.join(', ')}\n- Education: ${cleanedData.education.map(e => `${e.degree} in ${e.field}`).join(', ')}`
      };
      
      // Log the structured output
      console.log('CV Parser output:', output);
      
      return output;
    }
    
    return result;
  } catch (error) {
    console.error('Error executing tool node:', {
      error: error.message,
      nodeId: node.id,
      toolType,
      customTool
    });
    return {
      output: `Error executing tool: ${error.message}`,
      type: 'error',
      error: true,
      message: error.message,
      nodeId: node.id
    };
  }
};

/**
 * Execute an input node
 * @param {Object} node - Input node
 * @param {Object} inputs - Global inputs
 * @returns {Promise<Object>} - Execution result
 */
export const executeInputNode = async (node, inputs) => {
  const data = node.data || {};
  const inputType = data.inputType || 'text';
  const inputKey = data.inputKey || 'input';
  const variableName = data.variableName || inputKey;
  
  console.log(`Executing input node: ${data.label || 'Input'} (${inputType})`, inputs);
  
  // Get the input value from the global inputs
  let inputValue = inputs[variableName];
  
  // If the input is required but not provided, throw an error
  if (data.isRequired && (inputValue === undefined || inputValue === null || inputValue === '')) {
    throw new Error(`Required input "${data.label || variableName}" is missing`);
  }
  
  // Process based on input type
  if (inputType === 'file' && typeof inputValue === 'object') {
    return {
      output: `File uploaded: ${inputValue.filename || 'unknown'}`,
      file: inputValue,
      type: 'file_input'
    };
  }
  
  return {
    output: inputValue,
    type: 'input_result',
    inputType: inputType,
    variableName: variableName
  };
};

/**
 * Execute an output node
 * @param {Object} node - Output node
 * @param {Object} inputs - Input data
 * @returns {Promise<Object>} - Execution result
 */
export const executeOutputNode = async (node, inputs) => {
  const data = node.data || {};
  const outputType = data.outputType || 'webhook';
  const label = data.label || 'Output';
  
  console.log(`Executing output node: ${label} (${outputType})`, inputs);
  
  // Get the input data to send
  const outputData = inputs.output || inputs;
  let result;
  
  // Process based on output type
  switch (outputType) {
    case 'webhook':
      const webhookUrl = data.webhookUrl;
      if (!webhookUrl) {
        throw new Error('Webhook URL is required');
      }
      // In a real implementation, this would call the webhook
      result = `Sent to webhook: ${webhookUrl}`;
      break;
      
    case 'discord':
      const discordWebhook = data.webhookUrl;
      if (!discordWebhook) {
        throw new Error('Discord webhook URL is required');
      }
      result = await postToDiscord(discordWebhook, outputData);
      break;
      
    case 'sheets':
      const sheetId = data.sheetId;
      if (!sheetId) {
        throw new Error('Google Sheet ID is required');
      }
      result = await pushToSheets(sheetId, outputData);
      break;
      
    case 'email':
      const email = data.email;
      if (!email) {
        throw new Error('Email address is required');
      }
      result = await sendToEmail(email, 'Workflow Output', outputData);
      break;
      
    default:
      throw new Error(`Unknown output type: ${outputType}`);
  }
  
  return {
    output: result,
    type: 'output_result',
    outputType: outputType
  };
};

/**
 * Execute a logic node
 * @param {Object} node - Logic node
 * @param {Object} inputs - Input data
 * @returns {Promise<Object>} - Execution result
 */
export const executeLogicNode = async (node, inputs) => {
  const data = node.data || {};
  const condition = data.condition || '';
  
  console.log(`Executing logic node: ${data.label || 'Logic'}`, inputs);
  
  // Evaluate the condition
  let result = false;
  
  try {
    // Simple evaluation using Function constructor
    // Note: This is not secure for production use
    const evalFunc = new Function('inputs', `return ${condition}`);
    result = evalFunc(inputs);
  } catch (error) {
    throw new Error(`Error evaluating condition: ${error.message}`);
  }
  
  return {
    output: `Condition evaluated to: ${result}`,
    result: result,
    path: result ? 'true' : 'false',
    type: 'logic_result'
  };
};

/**
 * Execute a delay node
 * @param {Object} node - Delay node
 * @param {Object} inputs - Input data
 * @returns {Promise<Object>} - Execution result
 */
export const executeDelayNode = async (node, inputs) => {
  const data = node.data || {};
  const duration = parseInt(data.duration || '1000', 10);
  
  console.log(`Executing delay node: ${data.label || 'Delay'} (${duration}ms)`, inputs);
  
  // Create a promise that resolves after the specified duration
  await new Promise(resolve => setTimeout(resolve, duration));
  
  return {
    output: `Delayed for ${duration}ms`,
    duration: duration,
    type: 'delay_result'
  };
};

/**
 * Execute a trigger node
 * @param {Object} node - Trigger node
 * @param {Object} inputs - Input data
 * @returns {Promise<Object>} - Execution result
 */
export const executeTriggerNode = async (node, inputs) => {
  const data = node.data || {};
  const triggerType = data.triggerType || 'manual';
  
  console.log(`Executing trigger node: ${data.label || 'Trigger'} (${triggerType})`, inputs);
  
  return {
    output: `Trigger ${data.label || 'Trigger'} (${triggerType}) activated`,
    triggerType: triggerType,
    type: 'trigger_result',
    timestamp: new Date().toISOString()
  };
};

/**
 * Map of node types to executor functions
 */
export const nodeExecutors = {
  agent: executeAgentNode,
  task: executeTaskNode,
  tool: executeToolNode,
  input: executeInputNode,
  output: executeOutputNode,
  logic: executeLogicNode,
  delay: executeDelayNode,
  trigger: executeTriggerNode,
  // Add aliases for compatibility
  chatbot: executeAgentNode,
  chat: executeAgentNode
}; 