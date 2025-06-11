import axios from 'axios';
import { apiClient } from '../api/client';
import { useLLMMode } from '../contexts/LLMContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// NEW: Enhanced Input Node Execution with LLM-centric processing
async function executeInputNodeEnhanced(node, inputs, workflowContext) {
  const nodeData = node.data || {};
  const nodeId = node.id || nodeData.nodeId || "unknown";
  const inputType = nodeData.inputType || "text";
  
  console.log("🚀 Enhanced input node execution:", {
    nodeId,
    inputType,
    hasMultimodalData: !!nodeData.multimodalResult,
    inputKeys: Object.keys(inputs)
  });

  try {
    // Prepare the request payload for backend processing
    const payload = {
      node: {
        id: nodeId,
        type: "input",
        data: {
          ...nodeData,
          // Include the node's current value (could be multimodal result)
          value: nodeData.value || nodeData.multimodalResult || inputs.value || ""
        }
      },
      inputs: inputs,
      context: {
        execution_timestamp: new Date().toISOString(),
        workflow_context: workflowContext,
        node_id: nodeId
      }
    };

    // Call backend input node processor
    const response = await fetch(`${BACKEND_URL}/api/nodes/input`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || "Failed to process input node");
    }

    const result = await response.json();
    console.log("✅ Input node processing result:", result);

    // Return standardized result format
    return {
      success: result.success || false,
      data: result.data || result.value || {},
      metadata: result.metadata || {},
      error: result.error || null
    };

  } catch (error) {
    console.error("❌ Enhanced input node execution failed:", error);
    
    // Fallback: create a basic result from the input
    return {
      success: false,
      data: {
        type: "text_input",
        input_type: inputType,
        label: nodeData.label || "Input",
        value: nodeData.value || inputs.value || "",
        text_content: String(nodeData.value || inputs.value || "")
      },
      metadata: {
        node_type: "input",
        input_type: inputType,
        timestamp: new Date().toISOString(),
        llm_processed: false,
        fallback: true,
        error: error.message
      },
      error: error.message
    };
  }
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
          console.log("🎯 Executing input node:", nodeId, "Type:", nodeData.inputType, cleanedInputs);
          
          // NEW: Enhanced input processing with context chaining
          const inputNodeResult = await executeInputNodeEnhanced(node, cleanedInputs, workflowContext);
          
          // Return standardized format for downstream nodes
          return {
            nodeId: nodeId,
            nodeType: "input",
            success: inputNodeResult.success,
            data: inputNodeResult.data,
            
            // NEW: Provide standardized outputs for easy downstream consumption
            processed_content: inputNodeResult.data?.processed_content || inputNodeResult.data?.text_content || inputNodeResult.data?.value,
            extracted_entities: inputNodeResult.data?.extracted_entities || [],
            file_info: inputNodeResult.data?.filename ? {
              filename: inputNodeResult.data.filename,
              type: inputNodeResult.data.file_type,
              size: inputNodeResult.data.file_size
            } : null,
            
            // Context for chaining
            context: {
              input_type: inputNodeResult.data?.input_type,
              llm_processed: inputNodeResult.metadata?.llm_processed || false,
              api_used: inputNodeResult.metadata?.api_used,
              processing_timestamp: inputNodeResult.metadata?.processing_timestamp || new Date().toISOString()
            },
            
            // Full result for debugging
            raw_result: inputNodeResult,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error("❌ Error executing input node:", error, nodeId, cleanedInputs);
          return {
            nodeId: nodeId,
            nodeType: "input",
            success: false,
            error: error.message,
            data: null,
            timestamp: new Date().toISOString()
          };
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

// Enhanced execute function that includes LLM mode
export const executeNodeWithLLMMode = async (nodeType, nodeData, inputs, llmModeEnabled = false, smartMappingEnabled = true) => {
  try {
    console.log(`🚀 Executing ${nodeType} node with LLM mode: ${llmModeEnabled}`);
    
    // Add LLM mode configuration to node data
    const enhancedNodeData = {
      ...nodeData,
      llm_mode_enabled: llmModeEnabled,
      smart_mapping_enabled: smartMappingEnabled
    };
    
    switch (nodeType) {
      case 'input':
        return await executeInputNodeEnhanced(enhancedNodeData, inputs);
      case 'chat':
        return await executeChatNode(enhancedNodeData, inputs);
      case 'task':
        return await executeTaskNode(enhancedNodeData, inputs);
      case 'logic':
        return await executeLogicNode(enhancedNodeData, inputs);
      case 'delay':
        return await executeDelayNode(enhancedNodeData, inputs);
      case 'agent':
        return await executeAgentNode(enhancedNodeData, inputs);
      case 'tool':
        return await executeToolNode(enhancedNodeData, inputs);
      case 'output':
        return await executeOutputNode(enhancedNodeData, inputs);
      default:
        throw new Error(`Unsupported node type: ${nodeType}`);
    }
  } catch (error) {
    console.error(`❌ Error executing ${nodeType} node:`, error);
    return {
      success: false,
      error: error.message,
      data: null,
      metadata: {
        node_type: nodeType,
        llm_mode_enabled: llmModeEnabled,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Enhanced chat node executor with LLM mode support
export const executeChatNode = async (nodeData, inputs) => {
  try {
    console.log('🗣️ Executing chat node with data:', nodeData);
    
    const response = await fetch('/api/nodes/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_data: nodeData,
        inputs: inputs
      })
    });

    if (!response.ok) {
      throw new Error(`Chat node execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Chat node result:', result);
    
    return {
      success: result.success || true,
      data: result.data || result,
      error: result.error || null,
      metadata: {
        ...result.metadata,
        node_type: 'chat',
        llm_mode_processed: nodeData.llm_mode_enabled
      }
    };
  } catch (error) {
    console.error('❌ Chat node execution error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      metadata: {
        node_type: 'chat',
        llm_mode_enabled: nodeData.llm_mode_enabled,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Enhanced task node executor with LLM mode support
export const executeTaskNode = async (nodeData, inputs) => {
  try {
    console.log('📋 Executing task node with data:', nodeData);
    
    const response = await fetch('/api/nodes/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_data: nodeData,
        inputs: inputs
      })
    });

    if (!response.ok) {
      throw new Error(`Task node execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Task node result:', result);
    
    return {
      success: result.success || true,
      data: result.data || result,
      error: result.error || null,
      metadata: {
        ...result.metadata,
        node_type: 'task',
        llm_mode_processed: nodeData.llm_mode_enabled
      }
    };
  } catch (error) {
    console.error('❌ Task node execution error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      metadata: {
        node_type: 'task',
        llm_mode_enabled: nodeData.llm_mode_enabled,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Enhanced logic node executor with LLM mode support
export const executeLogicNode = async (nodeData, inputs) => {
  try {
    console.log('🧠 Executing logic node with data:', nodeData);
    
    const response = await fetch('/api/nodes/logic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_data: nodeData,
        inputs: inputs
      })
    });

    if (!response.ok) {
      throw new Error(`Logic node execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Logic node result:', result);
    
    return {
      success: result.success || true,
      data: result.data || result,
      error: result.error || null,
      metadata: {
        ...result.metadata,
        node_type: 'logic',
        llm_mode_processed: nodeData.llm_mode_enabled
      }
    };
  } catch (error) {
    console.error('❌ Logic node execution error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      metadata: {
        node_type: 'logic',
        llm_mode_enabled: nodeData.llm_mode_enabled,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Enhanced delay node executor with LLM mode support
export const executeDelayNode = async (nodeData, inputs) => {
  try {
    console.log('⏱️ Executing delay node with data:', nodeData);
    
    const response = await fetch('/api/nodes/delay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_data: nodeData,
        inputs: inputs
      })
    });

    if (!response.ok) {
      throw new Error(`Delay node execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Delay node result:', result);
    
    return {
      success: result.success || true,
      data: result.data || result,
      error: result.error || null,
      metadata: {
        ...result.metadata,
        node_type: 'delay',
        llm_mode_processed: nodeData.llm_mode_enabled
      }
    };
  } catch (error) {
    console.error('❌ Delay node execution error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      metadata: {
        node_type: 'delay',
        llm_mode_enabled: nodeData.llm_mode_enabled,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// ... keep all existing functions ... 