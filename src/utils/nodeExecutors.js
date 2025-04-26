import axios from 'axios';

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

// Helper to clean data for backend
function cleanDataForBackend(obj) {
  if (!obj) return obj;
  
  if (obj instanceof Element || (obj && obj.$$typeof)) {
    return undefined;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDataForBackend(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('_') || key.startsWith('__react')) {
        continue;
      }
      cleaned[key] = cleanDataForBackend(value);
    }
    return cleaned;
  }
  
  return obj;
}

// Unified node executor
export const executeNode = async (node, inputs, previousResult = null, connectedAgentData = null) => {
  try {
    const cleanedInputs = cleanDataForBackend(inputs);
    const cleanedData = cleanDataForBackend(node.data);

    let response;
    if (node.type === "tool") {
      response = await axios.post(`${BACKEND_URL}/api/run-tool`, { 
        tool: cleanedData, 
        inputs: cleanedInputs,
        node_id: node.id
      });
    } 
    else if (node.type === "task") {
      response = await axios.post(`${BACKEND_URL}/api/run-agent-task`, {
        agent: connectedAgentData,
        task: cleanedData,
        inputs: cleanedInputs,
        node_id: node.id
      });
    }
    else if (node.type === "input") {
      response = await axios.post(`${BACKEND_URL}/api/run-trigger`, { 
        input: cleanedData,
        inputs: cleanedInputs,
        node_id: node.id
      });
    }
    else if (node.type === "output") {
      response = await axios.post(`${BACKEND_URL}/api/run-output`, {
        output: cleanedData,
        result: previousResult,
        node_id: node.id
      });
    }
    else if (node.type === "chat" || node.type === "chatbot") {
      response = await axios.post(`${BACKEND_URL}/api/run-chat`, {
        chat: cleanedData,
        inputs: cleanedInputs,
        node_id: node.id
      });
    }

  
    else if (node.type === "logic") {
      response = await axios.post(`${BACKEND_URL}/api/run-logic`, {
        logic: cleanedData,
        inputs: cleanedInputs,
        node_id: node.id
      });
    }
    else if (node.type === "delay") {
      response = await axios.post(`${BACKEND_URL}/api/run-delay`, {
        delay: cleanedData,
        inputs: cleanedInputs,
        node_id: node.id
      });
    }
    else {
      console.error("❗ Unknown node type:", node.type);
      throw new Error(`No executor found for node type: ${node.type}`);
    }

    // Handle error responses
    if (response.data.type === "error") {
      const error = response.data.error;
      return {
        type: "error",
        error: {
          type: error.type,
          message: error.message,
          nodeId: error.node_id || node.id,
          nodeType: error.node_type || node.type,
          details: error.details,
          timestamp: error.timestamp
        }
      };
    }

    // Optimize output size by removing duplicate data
    if (response.data.type !== "error") {
      // Remove inputs from output if they're identical to what was sent
      if (response.data.inputs && JSON.stringify(response.data.inputs) === JSON.stringify(cleanedInputs)) {
        delete response.data.inputs;
      }
      
      // Remove raw data if processed data is available
      if (response.data.processed_data && response.data.raw_data) {
        delete response.data.raw_data;
      }
      
      // Truncate long text fields
      if (response.data.output && typeof response.data.output === 'string' && response.data.output.length > 1000) {
        response.data.output = response.data.output.substring(0, 1000) + '...';
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error executing node:", error);
    throw error;
  }
};

// Map node types to the unified executor
export const nodeExecutors = {
  tool: (node, inputs) => executeNode(node, inputs),
  task: (node, inputs) => executeNode(node, inputs, null, inputs.agent),
  input: (node, inputs) => executeNode(node, inputs),
  output: (node, inputs) => executeNode(node, inputs, inputs),
  chat: (node, inputs) => executeNode(node, inputs),
  chatbot: (node, inputs) => executeNode(node, inputs), 
  logic: (node, inputs) => executeNode(node, inputs),
  delay: (node, inputs) => executeNode(node, inputs)
}; 