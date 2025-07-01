// Types
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    request_id?: string;
    version: string;
  };
}

interface LLMModeStatusResponse {
  llm_mode_enabled: boolean;
  smart_mapping_enabled: boolean;
  available_providers: string[];
  current_status: string;
  statistics: {
    total_nodes_processed: number;
    llm_mode_usage: number;
    traditional_mode_usage: number;
    average_execution_time: number;
    success_rate: number;
    token_usage: {
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    };
  };
  timestamp: string;
}

// Extend Window interface
declare global {
  interface Window {
    REACT_APP_API_URL?: string;
  }
}

interface Flow {
  id: string;
  user_id: string;
  name: string;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

interface NodeData {
  id: string;
  type: string;
  data: any;
}

interface ToolData {
  id: string;
  toolType?: string;
  framework?: string;
  config?: any;
  inputs: any;
}

class APIError extends Error {
  code: string;
  details?: any;

  constructor(error: NonNullable<APIResponse<any>['error']>) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}

// Configuration
const API_URL = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  console.log("Raw response:", response);
  
  // Check if response is empty
  const text = await response.text();
  console.log("Raw response text:", text);
  
  if (!text || text.trim() === '') {
    console.warn("Empty response received from server");
    throw new APIError({
      code: "EMPTY_RESPONSE",
      message: "Server returned an empty response. This usually indicates a backend error or missing route.",
      details: {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      }
    });
  }
  
  try {
    const data = JSON.parse(text);
    
    // Handle API response format
    if (data && typeof data === 'object') {
      if (data.success === false) {
        throw new APIError(data.error || {
          code: "API_ERROR",
          message: data.message || "API request failed"
        });
      }
      
      // Return data directly if it's not wrapped in a response object
      if (data.data !== undefined) {
        return data.data;
      }
      
      // If no data property, return the whole object
      return data;
    }
    
    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error("Failed to parse response as JSON:", error);
    throw new APIError({
      code: "PARSE_ERROR",
      message: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        responseText: text.substring(0, 500) // First 500 chars for debugging
      }
    });
  }
}

// Add streaming workflow execution interface
interface StreamingWorkflowResponse {
  type: 'node_start' | 'node_complete' | 'node_error' | 'workflow_complete' | 'workflow_error' | 'llm_processing' | 'smart_mapping';
  node_id?: string;
  node_type?: string;
  data?: any;
  error?: string;
  timestamp: string;
  metadata?: {
    execution_time?: number;
    framework?: string;
    llm_tokens?: number;
    smart_mapping_applied?: boolean;
  };
}

export class APIClient {
  private static instance: APIClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = window.REACT_APP_API_URL || '/api';
  }

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return handleResponse<T>(response);
  }

  async saveFlow(userId: string, name: string, nodes: any[], edges: any[]): Promise<Flow> {
    return this.request<Flow>(`/workflows`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name, nodes, edges })
    });
  }

  async updateFlow(flowId: string, name: string, nodes: any[], edges: any[]): Promise<Flow> {
    return this.request<Flow>(`/workflows/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, nodes, edges })
    });
  }

  async fetchFlows(userId: string): Promise<Flow[]> {
    try {
      console.log(`Fetching flows for user ${userId} from ${this.baseUrl}/workflows`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      try {
        // Try the /workflows endpoint first
        let response = await fetch(`${this.baseUrl}/workflows?owner_id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          credentials: 'same-origin',
          signal: controller.signal
        });
        
        // If that fails with 404, try the old /flows endpoint
        if (!response.ok && response.status === 404) {
          console.log(`Falling back to alternate flows endpoint: ${this.baseUrl}/flows`);
          response = await fetch(`${this.baseUrl}/flows?owner_id=${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'same-origin',
            signal: controller.signal
          });
        }
        
        clearTimeout(timeout);
        return handleResponse<Flow[]>(response);
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching flows:', error);
      throw error;
    }
  }

  async fetchFlowById(flowId: string): Promise<Flow> {
    const response = await fetch(`${this.baseUrl}/workflows/${flowId}`);
    return handleResponse<Flow>(response);
  }

  async deleteFlow(flowId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/workflows/${flowId}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(response);
  }

  // Enhanced LLM context injection with comprehensive data
  private injectLLMContext(payload: any): any {
    const llmContext = (window as any).LLM_CONTEXT || {};
    const userKeys = (window as any).USER_API_KEYS || {};
    
    return {
      ...payload,
      llm_mode_enabled: llmContext.llmModeEnabled || false,
      smart_mapping_enabled: llmContext.smartMappingEnabled || true,
      user_keys: userKeys,
      execution_context: {
        timestamp: new Date().toISOString(),
        session_id: this.generateSessionId(),
        llm_preferences: {
          prefer_streaming: true,
          enable_smart_routing: llmContext.smartMappingEnabled || true,
          enable_multimodal: true
        }
      }
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Enhanced executeNode with comprehensive LLM routing
  async executeNode(nodeData: NodeData, inputs?: any): Promise<any> {
    const nodeType = nodeData.type?.toLowerCase();
    
    // Always inject LLM context for all node executions
    const enhancedPayload = this.injectLLMContext({
      node_data: nodeData,
      inputs: inputs || {},
      node_type: nodeType
    });

    // Route based on node type with LLM context
    switch (nodeType) {
      case 'tool':
        return this.executeTool({
          id: nodeData.id,
          toolType: nodeData.data?.toolType,
          framework: nodeData.data?.framework,
          config: nodeData.data?.config,
          inputs: inputs
        });
      
      case 'agent':
        return this.executeAgentNode(nodeData.id, inputs);
      
      case 'input':
        return this.executeInputNode(nodeData.id, inputs);
      
      case 'output':
        return this.executeOutputNode(nodeData.id, inputs);
      
      case 'task':
        const agentData = inputs?.agent || {};
        return this.executeTaskNode(nodeData.id, agentData, inputs);
      
      case 'logic':
        return this.executeLogicNode(nodeData.id, nodeData.data, inputs);
      
      case 'delay':
        return this.executeDelayNode(nodeData.id, nodeData.data, inputs);
      
      case 'chat':
        return this.executeChatNode(nodeData.id, nodeData.data, inputs);
      
      default:
        // Use the enhanced universal node execution endpoint
        const response = await fetch(`${this.baseUrl}/nodes/execute-enhanced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enhancedPayload)
        });
        return handleResponse(response);
    }
  }

  // NEW: Streaming workflow execution with real-time LLM updates
  async executeWorkflowStream(
    nodes: any[], 
    edges: any[], 
    inputs: any,
    onUpdate?: (update: StreamingWorkflowResponse) => void
  ): Promise<ReadableStream<StreamingWorkflowResponse>> {
    const payload = this.injectLLMContext({
      nodes,
      edges,
      inputs,
      execution_mode: 'streaming',
      enable_real_time_updates: true
    });

    const response = await fetch(`${this.baseUrl}/workflows/execute-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Streaming execution failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No readable stream available');
    }

    const decoder = new TextDecoder();
    
    return new ReadableStream<StreamingWorkflowResponse>({
      start(controller) {
        function pump(): Promise<void> {
          return reader!.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }

            // Parse streaming JSON responses
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const update: StreamingWorkflowResponse = JSON.parse(line);
                
                // Call the update callback if provided
                if (onUpdate) {
                  onUpdate(update);
                }
                
                controller.enqueue(update);
              } catch (e) {
                console.warn('Failed to parse streaming update:', line);
              }
            }

            return pump();
          });
        }

        return pump();
      }
    });
  }

  // NEW: Enhanced workflow execution with LLM context
  async executeWorkflowEnhanced(nodes: any[], edges: any[], inputs: any): Promise<any> {
    const payload = this.injectLLMContext({
      nodes,
      edges,
      inputs,
      execution_mode: 'enhanced',
      enable_llm_routing: true,
      enable_smart_mapping: true
    });

    const response = await fetch(`${this.baseUrl}/workflows/execute-enhanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return handleResponse(response);
  }

  // Enhanced tool execution with comprehensive LLM support
  async executeTool(toolData: ToolData): Promise<any> {
    console.log("🔧 Executing tool with enhanced LLM context:", toolData.id);
    
    try {
      const formattedData = {
        node_id: toolData.id,
        toolType: toolData.toolType || "llm",
        framework: toolData.framework,
        config: toolData.config || {},
        inputs: toolData.inputs || {},
        tool_metadata: {
          execution_timestamp: new Date().toISOString(),
          requires_llm_processing: true
        }
      };
      
      const payload = this.injectLLMContext(formattedData);
      
      console.log("🧠 Enhanced tool payload with LLM context:", {
        nodeId: payload.node_id,
        llmEnabled: payload.llm_mode_enabled,
        smartMapping: payload.smart_mapping_enabled,
        hasUserKeys: Object.keys(payload.user_keys || {}).length > 0
      });
      
      const response = await fetch(`${this.baseUrl}/tools/run-tool-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Enhanced tool execution failed:", errorText);
        throw new Error(`Tool execution failed: ${response.status} - ${errorText}`);
      }
      
      const result = await handleResponse<any>(response);
      console.log("✅ Enhanced tool execution completed:", (result as any).success);
      return result;
      
    } catch (error) {
      console.error("❌ Enhanced tool execution error:", error);
      throw error;
    }
  }

  // NEW: Get LLM execution metrics
  async getLLMExecutionMetrics(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/llm/metrics`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  }

  // NEW: Test LLM connectivity and performance
  async testLLMConnectivity(): Promise<any> {
    const payload = this.injectLLMContext({
      test_type: 'connectivity',
      include_performance_metrics: true
    });

    const response = await fetch(`${this.baseUrl}/llm/test-connectivity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }

  // Enhanced input node execution with multimodal support
  async executeInputNode(nodeId: string, inputs: any): Promise<any> {
    console.log("📥 Executing enhanced input node:", nodeId);
    
    try {
      const formattedData = {
        node_id: nodeId,
        data: {
          input_type: inputs?.inputType || 'text',
          supports_multimodal: true,
          enable_smart_processing: true
        },
        inputs: inputs || {},
        processing_options: {
          enable_llm_enhancement: true,
          enable_content_extraction: true,
          enable_entity_recognition: true
        }
      };
      
      const payload = this.injectLLMContext(formattedData);
      
      console.log("🧠 Enhanced input payload:", {
        nodeId: payload.node_id,
        inputType: payload.data.input_type,
        llmEnabled: payload.llm_mode_enabled
      });
      
      const response = await fetch(`${this.baseUrl}/nodes/run-input-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Enhanced input execution failed:", errorText);
        throw new Error(`Input execution failed: ${response.status} - ${errorText}`);
      }
      
      const result = await handleResponse<any>(response);
      console.log("✅ Enhanced input execution completed:", (result as any).success);
      return result;
      
    } catch (error) {
      console.error("❌ Enhanced input execution error:", error);
      throw error;
    }
  }

  async executeAgentNode(nodeId: string, inputs: any): Promise<any> {
    console.log("Executing agent node with URL:", `${this.baseUrl}/nodes/run-agent`);
    console.log("Agent data:", { node_id: nodeId, inputs });
    
    try {
      // Format the data to match what the backend expects
      const formattedData = {
        node_id: nodeId,
        data: {}, // Include any agent-specific data here
        inputs: inputs || {}
      };
      
      // Inject LLM context
      const payload = this.injectLLMContext(formattedData);
      
      console.log("Formatted agent data with LLM context:", JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${this.baseUrl}/nodes/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error("Agent node execution failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error("Agent node execution error:", error);
      throw error;
    }
  }

  async executeOutputNode(nodeId: string, inputs: any): Promise<any> {
    try {
      console.log("Executing output node with ID:", nodeId, "Inputs:", inputs);
      
      // Format the data to match what the backend expects
      const formattedData = {
        node_id: nodeId,
        output_type: inputs?.output_type || 'email',  // Default to email if not specified
        config: inputs?.config || {},
        data: {
          output_type: inputs?.output_type || 'email',
          recipient: inputs?.recipient || inputs?.email,
          subject: inputs?.subject || "CrewFlow Notification",
          body: inputs?.body || inputs?.content || inputs?.message || "This is a notification from CrewFlow"
        },
        inputs: inputs || {}
      };
      
      // Inject LLM context
      const payload = this.injectLLMContext(formattedData);
      
      console.log("Formatted output data with LLM context:", JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${this.baseUrl}/nodes/run-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error(`Output node execution failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Output node execution failed: ${errorText || response.statusText}`);
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error("Error executing output node:", error);
      throw error;
    }
  }

  async executeLogicNode(nodeId: string, data: any, inputs: any): Promise<any> {
    const formattedData = { node_id: nodeId, data, inputs };
    const payload = this.injectLLMContext(formattedData);
    
    const response = await fetch(`${this.baseUrl}/nodes/run-logic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }
  
  async executeDelayNode(nodeId: string, data: any, inputs: any): Promise<any> {
    const formattedData = { node_id: nodeId, data, inputs };
    const payload = this.injectLLMContext(formattedData);
    
    const response = await fetch(`${this.baseUrl}/nodes/run-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }
  
  async executeChatNode(nodeId: string, data: any, inputs: any): Promise<any> {
    const formattedData = { node_id: nodeId, data, inputs };
    const payload = this.injectLLMContext(formattedData);
    
    const response = await fetch(`${this.baseUrl}/nodes/run-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }

  async executeTaskNode(nodeId: string, agentData: any, inputs: any): Promise<any> {
    const formattedData = { node_id: nodeId, agent_data: agentData, inputs };
    const payload = this.injectLLMContext(formattedData);
    
    const response = await fetch(`${this.baseUrl}/nodes/run-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }

  async executeFlow(nodes: any[], edges: any[], inputs: any): Promise<any> {
    const formattedData = { nodes, edges, inputs };
    const payload = this.injectLLMContext(formattedData);
    
    const response = await fetch(`${this.baseUrl}/workflows/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  }

  async fetchExecutedTriggers(): Promise<any[]> {
    return this.request<any[]>(`/triggers/executed`);
  }

  // LLM Mode endpoints
  async getLLMModeStatus(): Promise<{ llm_mode_enabled: boolean; smart_mapping_enabled: boolean }> {
    try {
      const response = await this.request<LLMModeStatusResponse>(`/llm-mode/status`);
      
      // The backend may return the data directly or wrapped in a response object
      if (response && typeof response === 'object') {
        // Check if it's the direct response format
        if ('llm_mode_enabled' in response && 'smart_mapping_enabled' in response) {
          return {
            llm_mode_enabled: response.llm_mode_enabled,
            smart_mapping_enabled: response.smart_mapping_enabled
          };
        }
        
        // Check if it's wrapped in a data property
        const responseWithData = response as any;
        if ('data' in responseWithData && responseWithData.data) {
          const data = responseWithData.data;
          return {
            llm_mode_enabled: data.llm_mode_enabled || false,
            smart_mapping_enabled: data.smart_mapping_enabled || false
          };
        }
        
        // Fallback: try to extract from any property
        const obj = response as any;
        return {
          llm_mode_enabled: obj.llm_mode_enabled || false,
          smart_mapping_enabled: obj.smart_mapping_enabled || false
        };
      }
      
      // Fallback to default values if response is unexpected
      console.warn('Unexpected LLM status response format:', response);
      return {
        llm_mode_enabled: false,
        smart_mapping_enabled: true
      };
    } catch (error) {
      console.error('Error fetching LLM mode status:', error);
      // Return default values on error
      return {
        llm_mode_enabled: false,
        smart_mapping_enabled: true
      };
    }
  }

  async toggleLLMMode(enabled: boolean, smart_mapping_enabled: boolean): Promise<{ llm_mode_enabled: boolean; smart_mapping_enabled: boolean }> {
    try {
      const response = await this.request<{ llm_mode_enabled: boolean; smart_mapping_enabled: boolean }>(`/llm-mode/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled, smart_mapping_enabled })
      });
      
      // Handle response format similar to getLLMModeStatus
      if (response && typeof response === 'object') {
        const obj = response as any;
        return {
          llm_mode_enabled: obj.llm_mode_enabled || enabled,
          smart_mapping_enabled: obj.smart_mapping_enabled || smart_mapping_enabled
        };
      }
      
      return { llm_mode_enabled: enabled, smart_mapping_enabled };
    } catch (error) {
      console.error('Error toggling LLM mode:', error);
      throw error;
    }
  }

  async testLLMMode(): Promise<any> {
    return this.request<any>(`/llm-mode/test`, {
      method: 'POST'
    });
  }

  async parseCV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/parse-cv`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  }

}

export const apiClient = APIClient.getInstance();
