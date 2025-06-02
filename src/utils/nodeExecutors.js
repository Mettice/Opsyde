import axios from 'axios';
import { apiClient } from '../api/client';

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
export async function executeNode(node, connectedAgentData, inputs = {}, workflowContext = null) {
  try {

    const resolvedNode = resolveInheritance(node, workflowContext);
    // Prefer node.data.nodeType over node.type
    const nodeType = resolvedNode.data?.nodeType || resolvedNode.type;
    const nodeData = resolvedNode.data || {};
    const nodeId = resolvedNode.id || nodeData.nodeId || "unknown";


    // For task nodes, ensure we have a connected agent with proper data
    if (nodeType === "task") {
      if (!connectedAgentData || !Object.keys(connectedAgentData).length) {
        throw new Error("Task execution requires a connected agent with valid data");
      }

      // Validate required agent fields
      const requiredFields = ["framework", "llmModel", "temperature", "max_tokens"];
      const missingFields = requiredFields.filter(field => !connectedAgentData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required agent fields: ${missingFields.join(", ")}`);
      }
function resolveInheritance(node, workflowContext) {
        if (!workflowContext || !node.data?.inherits_from) {
          return node; // No inheritance, return as-is
        }
        
        const parentNode = workflowContext.nodes?.find(n => n.id === node.data.inherits_from);
        if (!parentNode) {
          return node; // Parent not found, return as-is
        }
        
        // Merge parent data with node data (node data takes precedence)
        const mergedData = {
          ...parentNode.data,
          ...node.data,
          // Special handling for nested objects like frameworkConfig
          frameworkConfig: {
            ...parentNode.data?.frameworkConfig,
            ...node.data?.frameworkConfig
          }
        };
        
        return {
          ...node,
          data: mergedData
        };
      }

      // Sanitize and structure agent data
      const sanitizedAgent = {
        id: connectedAgentData.id || connectedAgentData.nodeId || "unknown-agent",
        agent_id: connectedAgentData.id || connectedAgentData.nodeId || "unknown-agent",
        framework: (connectedAgentData.framework || "openai").toLowerCase().trim(),
        llmModel: connectedAgentData.llmModel || "gpt-4",
        temperature: Math.min(Math.max(parseFloat(connectedAgentData.temperature || 0.7), 0), 1),
        max_tokens: Math.min(Math.max(parseInt(connectedAgentData.max_tokens || 4000), 1), 8000),
        memoryEnabled: Boolean(connectedAgentData.memoryEnabled),
        role: connectedAgentData.role || "",
        goal: connectedAgentData.goal || "",
        backstory: connectedAgentData.backstory || "",
        frameworkConfig: connectedAgentData.frameworkConfig || {}
      };

      // Sanitize and structure task data
      const sanitizedTask = {
        id: node.id || nodeData.nodeId || "unknown-task",
        task_id: node.id || nodeData.nodeId || "unknown-task",
        prompt: nodeData.prompt || "",
        description: nodeData.description || "",
        expectedOutput: nodeData.expectedOutput || "",
        isAsync: Boolean(nodeData.async),
        ...nodeData
      };

      // Call the agent-task endpoint
      const response = await fetch(`${BACKEND_URL}/api/nodes/run-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          node_id: nodeId,
          agent: sanitizedAgent,
          inputs: cleanDataForBackend(inputs)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to execute task");
      }

      const result = await response.json();
      return result;
    }

    // Handle other node types (chat, tool, etc.)
    const cleanedInputs = cleanDataForBackend(inputs);
    
    // Use the client API instead of direct axios calls
    let response;
    
    switch(nodeType) {
      case "tool":
        // Make sure to send all required tool data
        const toolData = {
          id: nodeId,
          toolType: nodeData?.toolType || "llm",
          framework: nodeData?.framework,
          config: nodeData?.config || {},
          inputs: cleanedInputs
        };
        console.log("Executing tool with data:", toolData);
        
        try {
          response = await apiClient.executeTool(toolData);
        } catch (error) {
          console.error("Error executing tool node:", error, toolData);
          throw error;
        }
        break;
      case "input":
        try {
          console.log("Executing input node:", nodeId, cleanedInputs);
          response = await apiClient.executeInputNode(nodeId, cleanedInputs);
        } catch (error) {
          console.error("Error executing input node:", error, nodeId, cleanedInputs);
          throw error;
        }
        break;
      case "agent":
        try {
          console.log("Executing agent node:", nodeId, cleanedInputs);
          response = await apiClient.executeAgentNode(nodeId, cleanedInputs);
          
          // Format the agent data for consumption by task nodes
          // Ensure it includes all required fields
          return {
            nodeId: nodeId,
            id: nodeId,
            agent_id: nodeId,
            framework: nodeData.framework || "openai",
            llmModel: nodeData.llmModel || "gpt-4",
            temperature: nodeData.temperature || 0.7,
            max_tokens: nodeData.max_tokens || 4000,
            memoryEnabled: nodeData.memoryEnabled || false,
            role: nodeData.role || "",
            goal: nodeData.goal || "",
            backstory: nodeData.backstory || "",
            ...response
          };
        } catch (error) {
          console.error("Error executing agent node:", error);
          throw error;
        }
        break;
      case "output":
        response = await apiClient.executeOutputNode(nodeId, cleanedInputs);
        break;
      case "logic":
        response = await apiClient.executeLogicNode(nodeId, nodeData, cleanedInputs);
        break;
      case "delay":
        response = await apiClient.executeDelayNode(nodeId, nodeData, cleanedInputs);
        break;
      case "chat":
      case "chatbot":
        response = await apiClient.executeChatNode(nodeId, nodeData, cleanedInputs);
        break;
      case "task":
        response = await apiClient.executeTaskNode(nodeId, connectedAgentData, cleanedInputs);
        break;
      default:
        // For all other node types, use the general execute endpoint
        response = await apiClient.executeNode({
          id: nodeId,
          type: nodeType,
          data: nodeData
        }, cleanedInputs);
    }
    
    // Handle error responses
    if (response && response.type === "error") {
      const error = response.error || {};
      return {
        type: "error",
        error: {
          type: error.type || "unknown",
          message: error.message || "Unknown error",
          nodeId: error.node_id || (node && node.id) || "unknown",
          nodeType: error.node_type || nodeType || "unknown",
          details: error.details || {},
          timestamp: error.timestamp || new Date().toISOString()
        }
      };
    }

    return response || { type: "unknown", value: null };
    
  } catch (error) {
    console.error("Error executing node:", error);
    throw error;
  }
}

// Map node types to the unified executor
export const nodeExecutors = {
  tool: (node, inputs) => executeNode(node, null, inputs),
  task: (node, inputs) => {
    // Look for agent data in the inputs
    let agentData = inputs.agent;
    console.log("Task node inputs:", inputs);
    
    // Fallback: Check if agent data is in one of the input fields with a specific prefix
    if (!agentData) {
      // Find any field that might contain agent data
      for (const [key, value] of Object.entries(inputs)) {
        if (key.startsWith('input_from_agent')) {
          console.log(`Found potential agent data in ${key}`, value);
          agentData = value;
          // Add it to the agent key for proper handling
          inputs.agent = value;
          break;
        }
      }
    }
    
    if (!agentData) {
      console.error("Task node requires a connected agent, but none was found in inputs:", inputs);
      throw new Error("Task execution requires a connected agent with valid data");
    }
    
    // Ensure the agent data has all the required fields
    const requiredFields = ["framework", "llmModel", "temperature", "max_tokens"];
    const missingFields = requiredFields.filter(field => !agentData[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required agent fields: ${missingFields.join(", ")}`, agentData);
      
      // Try to supplement missing fields from the node.data if available
      const agentNode = agentData.nodeId ? 
        document.querySelector(`[data-id="${agentData.nodeId}"]`) : null;
      
      if (agentNode) {
        console.log("Found agent node in DOM, trying to extract data");
        // Use node.data to populate missing fields if possible
        const nodeData = node.data || {};
        
        agentData = {
          ...agentData,
          framework: agentData.framework || nodeData.framework || "openai",
          llmModel: agentData.llmModel || nodeData.llmModel || "gpt-4",
          temperature: agentData.temperature || nodeData.temperature || 0.7,
          max_tokens: agentData.max_tokens || nodeData.max_tokens || 4000,
        };
      } else {
        // Provide defaults for missing fields
        agentData = {
          ...agentData,
          framework: agentData.framework || "openai",
          llmModel: agentData.llmModel || "gpt-4",
          temperature: agentData.temperature || 0.7,
          max_tokens: agentData.max_tokens || 4000,
        };
      }
      
      console.log("Updated agent data:", agentData);
    }
    
    return executeNode(node, agentData, inputs);
  },
  input: (node, inputs) => executeNode(node, null, inputs),
  output: (node, inputs) => executeNode(node, null, inputs),
  chat: (node, inputs) => executeNode(node, null, inputs),
  chatbot: (node, inputs) => executeNode(node, null, inputs), 
  logic: (node, inputs) => executeNode(node, null, inputs),
  delay: (node, inputs) => executeNode(node, null, inputs),
  agent: (node, inputs) => executeNode(node, null, inputs)
}; 