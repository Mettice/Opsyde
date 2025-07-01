import axios from 'axios';
import { apiClient } from '../api/client';
import { useLLMMode } from '../contexts/LLMContext';

const BACKEND_URL = '/api';

// NEW: Enhanced LLM Context Helper
function getLLMContext() {
  const llmContext = window.LLM_CONTEXT || {};
  const userKeys = window.USER_API_KEYS || {};
  
  return {
    llm_mode_enabled: llmContext.llmModeEnabled || false,
    smart_mapping_enabled: llmContext.smartMappingEnabled || true,
    user_keys: userKeys,
    execution_timestamp: new Date().toISOString()
  };
}

// NEW: Enhanced Input Node Execution with LLM-centric processing
async function executeInputNodeEnhanced(node, inputs, workflowContext) {
  const nodeData = node.data || {};
  const nodeId = node.id || nodeData.nodeId || "unknown";
  const inputType = nodeData.inputType || "text";
  
  console.log("🚀 Enhanced input node execution:", {
    nodeId,
    inputType,
    hasMultimodalData: !!nodeData.multimodalResult,
    inputKeys: Object.keys(inputs),
    llmModeEnabled: getLLMContext().llm_mode_enabled
  });

  try {
    // Get LLM context
    const llmContext = getLLMContext();
    
    // Prepare the request payload for backend processing with LLM context
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
        node_id: nodeId,
        ...llmContext
      }
    };

    // Call enhanced backend input node processor
    const response = await fetch(`${BACKEND_URL}/nodes/input-enhanced`, {
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
    console.log("✅ Enhanced input node processing result:", result);

    // Return standardized result format
    return {
      success: result.success || false,
      data: result.data || result.value || {},
      metadata: {
        ...result.metadata || {},
        llm_processed: llmContext.llm_mode_enabled,
        smart_mapping_applied: result.metadata?.smart_mapping_applied || false,
        execution_time: result.metadata?.execution_time || 0
      },
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

// NEW: Enhanced Universal Node Executor with LLM Integration
export async function executeNodeEnhanced(node, connectedAgentData, inputs = {}, workflowContext = null) {
  try {
    const resolvedNode = resolveInheritance(node, workflowContext);
    const nodeType = resolvedNode.data?.nodeType || resolvedNode.type;
    const nodeData = resolvedNode.data || {};
    const nodeId = resolvedNode.id || nodeData.nodeId || "unknown";

    // Get LLM context for all executions
    const llmContext = getLLMContext();
    
    console.log("🧠 Enhanced node execution:", {
      nodeId,
      nodeType,
      llmModeEnabled: llmContext.llm_mode_enabled,
      smartMappingEnabled: llmContext.smart_mapping_enabled
    });

    // Enhanced context with LLM integration
    const enhancedContext = {
      ...workflowContext,
      ...llmContext,
      node_metadata: {
        node_id: nodeId,
        node_type: nodeType,
        execution_timestamp: new Date().toISOString()
      }
    };

    // Route through LLM processor if enabled
    if (llmContext.llm_mode_enabled) {
      console.log("🚀 Routing through LLM processor for node:", nodeId);
      return await executeNodeWithLLMMode(nodeType, nodeData, inputs, connectedAgentData, enhancedContext);
    }

    // Traditional execution with enhanced context
    return await executeNodeTraditional(nodeType, nodeData, inputs, connectedAgentData, enhancedContext);

  } catch (error) {
    console.error("❌ Enhanced node execution failed:", error);
    return {
      success: false,
      data: null,
      error: error.message,
      metadata: {
        node_type: nodeType,
        execution_timestamp: new Date().toISOString(),
        llm_processed: false,
        error_type: error.constructor.name
      }
    };
  }
}

// NEW: LLM-Centric Node Execution
async function executeNodeWithLLMMode(nodeType, nodeData, inputs, connectedAgentData, context) {
  console.log("🧠 LLM-centric execution for:", nodeType);
  
  try {
    const payload = {
      node_type: nodeType,
      node_data: nodeData,
      inputs: inputs,
      agent_data: connectedAgentData,
      context: context,
      execution_mode: 'llm_centric',
      enable_smart_mapping: context.smart_mapping_enabled,
      enable_multimodal: true
    };

    const response = await fetch(`${BACKEND_URL}/nodes/execute-llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || "LLM execution failed");
    }

    const result = await response.json();
    console.log("✅ LLM execution completed:", result.success);

    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        llm_processed: true,
        smart_mapping_applied: result.metadata?.smart_mapping_applied || false,
        framework_used: result.metadata?.framework || 'unknown',
        execution_time: result.metadata?.execution_time || 0,
        token_usage: result.metadata?.token_usage || {}
      },
      error: result.error || null
    };

  } catch (error) {
    console.error("❌ LLM execution failed, falling back to traditional:", error);
    // Fallback to traditional execution
    return await executeNodeTraditional(nodeType, nodeData, inputs, connectedAgentData, context);
  }
}

// Enhanced Traditional Node Execution
async function executeNodeTraditional(nodeType, nodeData, inputs, connectedAgentData, context) {
  console.log("⚙️ Traditional execution for:", nodeType);
  
  // Route to specific node type handlers
  switch (nodeType) {
    case "input":
      return await executeInputNodeEnhanced({ data: nodeData, id: context.node_metadata?.node_id }, inputs, context);
    
    case "task":
      return await executeTaskNodeEnhanced(nodeData, inputs, connectedAgentData, context);
    
    case "tool":
      return await executeToolNodeEnhanced(nodeData, inputs, context);
    
    case "chat":
      return await executeChatNodeEnhanced(nodeData, inputs, context);
    
    case "agent":
      return await executeAgentNodeEnhanced(nodeData, inputs, context);
    
    case "output":
      return await executeOutputNodeEnhanced(nodeData, inputs, context);
    
    case "logic":
      return await executeLogicNodeEnhanced(nodeData, inputs, context);
    
    case "delay":
      return await executeDelayNodeEnhanced(nodeData, inputs, context);
    
    default:
      console.warn("⚠️ Unknown node type, using generic execution:", nodeType);
      return await executeGenericNodeEnhanced(nodeType, nodeData, inputs, context);
  }
}

// NEW: Enhanced Task Node Execution
async function executeTaskNodeEnhanced(nodeData, inputs, connectedAgentData, context) {
  console.log("📋 Enhanced task execution");
  
      if (!connectedAgentData || !Object.keys(connectedAgentData).length) {
        throw new Error("Task execution requires a connected agent with valid data");
      }

      // Validate required agent fields
      const requiredFields = ["framework", "llmModel", "temperature", "max_tokens"];
      const missingFields = requiredFields.filter(field => !connectedAgentData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required agent fields: ${missingFields.join(", ")}`);
  }

  const payload = {
    task_data: {
      id: context.node_metadata?.node_id || "unknown-task",
      description: nodeData.description || "",
      prompt: nodeData.prompt || "",
      expected_output: nodeData.expectedOutput || "",
      async: nodeData.async || false
    },
    agent_data: {
      id: connectedAgentData.id || "unknown-agent",
      framework: connectedAgentData.framework.toLowerCase().trim(),
      llmModel: connectedAgentData.llmModel,
        temperature: Math.min(Math.max(parseFloat(connectedAgentData.temperature || 0.7), 0), 1),
        max_tokens: Math.min(Math.max(parseInt(connectedAgentData.max_tokens || 4000), 1), 8000),
        role: connectedAgentData.role || "",
        goal: connectedAgentData.goal || "",
      backstory: connectedAgentData.backstory || ""
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/run-task-enhanced`, {
        method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
      });

      if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Task execution failed");
      }

      const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "task",
        agent_framework: connectedAgentData.framework,
        llm_processed: context.llm_mode_enabled
      },
      error: result.error || null
    };

  } catch (error) {
    console.error("❌ Enhanced task execution failed:", error);
    throw error;
  }
}

// NEW: Enhanced Tool Node Execution
async function executeToolNodeEnhanced(nodeData, inputs, context) {
  console.log("🔧 Enhanced tool execution");
  
  const payload = {
    tool_data: {
      id: context.node_metadata?.node_id || "unknown-tool",
      toolType: nodeData.toolType || "llm",
      framework: nodeData.framework || "openai",
      config: nodeData.config || {},
      api_service_name: nodeData.api_service_name
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/tools/run-tool-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Tool execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "tool",
        tool_type: nodeData.toolType,
        framework_used: nodeData.framework
      },
      error: result.error || null
    };

        } catch (error) {
    console.error("❌ Enhanced tool execution failed:", error);
          throw error;
        }
}

// NEW: Enhanced Chat Node Execution
async function executeChatNodeEnhanced(nodeData, inputs, context) {
  console.log("💬 Enhanced chat execution");
  
  const payload = {
    chat_data: {
      id: context.node_metadata?.node_id || "unknown-chat",
      prompt: nodeData.prompt || "",
      model: nodeData.model || "gpt-4",
      temperature: nodeData.temperature || 0.7,
      max_tokens: nodeData.max_tokens || 1000,
      system_message: nodeData.systemMessage || ""
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/run-chat-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Chat execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "chat",
        model_used: nodeData.model
      },
      error: result.error || null
    };

        } catch (error) {
    console.error("❌ Enhanced chat execution failed:", error);
          throw error;
        }
}

// NEW: Enhanced Agent Node Execution
async function executeAgentNodeEnhanced(nodeData, inputs, context) {
  console.log("🤖 Enhanced agent execution");
  
  const payload = {
    agent_data: {
      id: context.node_metadata?.node_id || "unknown-agent",
      role: nodeData.role || "",
      goal: nodeData.goal || "",
      backstory: nodeData.backstory || "",
            framework: nodeData.framework || "openai",
            llmModel: nodeData.llmModel || "gpt-4",
            temperature: nodeData.temperature || 0.7,
      max_tokens: nodeData.max_tokens || 4000
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/run-agent-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Agent execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "agent",
        framework_used: nodeData.framework
      },
      error: result.error || null
    };

        } catch (error) {
    console.error("❌ Enhanced agent execution failed:", error);
          throw error;
        }
}

// NEW: Enhanced Output Node Execution
async function executeOutputNodeEnhanced(nodeData, inputs, context) {
  console.log("📤 Enhanced output execution");
  
  const payload = {
    output_data: {
      id: context.node_metadata?.node_id || "unknown-output",
      outputType: nodeData.outputType || "email",
      destination: nodeData.destination || "",
      template: nodeData.template || "",
      config: nodeData.config || {}
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/run-output-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Output execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "output",
        output_type: nodeData.outputType
      },
      error: result.error || null
    };
    
  } catch (error) {
    console.error("❌ Enhanced output execution failed:", error);
    throw error;
  }
}

// NEW: Enhanced Logic Node Execution
async function executeLogicNodeEnhanced(nodeData, inputs, context) {
  console.log("🔀 Enhanced logic execution");
  
  const payload = {
    logic_data: {
      id: context.node_metadata?.node_id || "unknown-logic",
      condition: nodeData.condition || "",
      operator: nodeData.operator || "equals",
      value: nodeData.value || ""
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/run-logic-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Logic execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "logic",
        condition_result: result.data?.condition_result
      },
      error: result.error || null
    };

  } catch (error) {
    console.error("❌ Enhanced logic execution failed:", error);
    throw error;
  }
}

// NEW: Enhanced Delay Node Execution
async function executeDelayNodeEnhanced(nodeData, inputs, context) {
  console.log("⏱️ Enhanced delay execution");
  
  const payload = {
    delay_data: {
      id: context.node_metadata?.node_id || "unknown-delay",
      duration: nodeData.duration || "1s",
      unit: nodeData.unit || "seconds"
    },
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/run-delay-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Delay execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: "delay",
        delay_duration: nodeData.duration
      },
      error: result.error || null
    };

  } catch (error) {
    console.error("❌ Enhanced delay execution failed:", error);
    throw error;
  }
}

// NEW: Generic Enhanced Node Execution
async function executeGenericNodeEnhanced(nodeType, nodeData, inputs, context) {
  console.log("🔧 Generic enhanced execution for:", nodeType);
  
  const payload = {
    node_type: nodeType,
    node_data: nodeData,
    inputs: inputs,
    context: context
  };

  try {
    const response = await fetch(`${BACKEND_URL}/nodes/execute-generic-enhanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Generic execution failed");
    }

    const result = await response.json();
    return {
      success: result.success || false,
      data: result.data || result.output || {},
      metadata: {
        ...result.metadata || {},
        node_type: nodeType,
        execution_mode: "generic"
      },
      error: result.error || null
    };

  } catch (error) {
    console.error("❌ Generic enhanced execution failed:", error);
    throw error;
  }
}

// Unified node executor (backward compatibility)
export async function executeNode(node, connectedAgentData, inputs = {}, workflowContext = null) {
  // Use the enhanced version by default
  return await executeNodeEnhanced(node, connectedAgentData, inputs, workflowContext);
}

// ... existing legacy functions for backward compatibility ... 