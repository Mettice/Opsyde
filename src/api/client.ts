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
const API_URL = window.REACT_APP_API_URL || 'http://localhost:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  try {
    // Log the response status
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Clone the response before reading it, so we can use it again if needed
    const clonedResponse = response.clone();
    
    // Try to parse as JSON
    let text;
    try {
      text = await response.text();
      console.log("Raw response:", text);
    } catch (e) {
      console.error("Error reading response text, trying cloned response:", e);
      text = await clonedResponse.text();
    }
    
    // Parse response if it's valid JSON
    let data: APIResponse<T>;
    try {
      data = JSON.parse(text);
      console.log("Parsed response data:", data);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      throw new APIError({
        code: `PARSE_ERROR`,
        message: `Failed to parse response: ${text}`,
        details: { responseText: text }
      });
    }
    
    if (!response.ok) {
      console.error("Non-OK response:", response.status, data);
      throw new APIError({
        code: `HTTP_${response.status}`,
        message: data.error?.message || `HTTP Error ${response.status}`,
        details: data.error?.details || data
      });
    }
    
    // Check if the response has the expected structure
    if (data.success === false) {
      console.error("API reported failure:", data.error);
      throw new APIError(data.error || { 
        code: 'API_ERROR', 
        message: 'API request failed',
        details: data
      });
    }
    
    // If we get here and there's no data field in a success response
    if (data.success === true && data.data === undefined) {
      console.warn("Success response with no data field:", data);
      return data as unknown as T;
    }
    
    return data.data as T;
  } catch (e) {
    console.error("Error in handleResponse:", e);
    throw e;
  }
}

export class APIClient {
  private static instance: APIClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = API_URL;
  }

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  // Create a common request method to reduce duplication
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      console.log(`Sending request to ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      return handleResponse<T>(response);
    } catch (error) {
      console.error(`Error in request to ${url}:`, error);
      throw error;
    }
  }

  async saveFlow(userId: string, name: string, nodes: any[], edges: any[]): Promise<Flow> {
    return this.request<Flow>(`${this.baseUrl}/api/workflows`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name, nodes, edges })
    });
  }

  async updateFlow(flowId: string, name: string, nodes: any[], edges: any[]): Promise<Flow> {
    return this.request<Flow>(`${this.baseUrl}/api/workflows/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, nodes, edges })
    });
  }

  async fetchFlows(userId: string): Promise<Flow[]> {
    try {
      console.log(`Fetching flows for user ${userId} from ${this.baseUrl}/api/workflows`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      try {
        // Try the /api/workflows endpoint first
        let response = await fetch(`${this.baseUrl}/api/workflows?owner_id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          credentials: 'same-origin',
          signal: controller.signal
        });
        
        // If that fails with 404, try the old /api/flows endpoint
        if (!response.ok && response.status === 404) {
          console.log(`Falling back to alternate flows endpoint: ${this.baseUrl}/api/flows`);
          response = await fetch(`${this.baseUrl}/api/flows?owner_id=${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'same-origin',
            signal: controller.signal
          });
        }
        
        if (!response.ok) {
          console.error(`Error fetching flows: ${response.status} ${response.statusText}`);
          return [];
        }
        
        const data = await handleResponse<any>(response);
        return Array.isArray(data.data) ? data.data : 
               data.data?.data && Array.isArray(data.data.data) ? data.data.data : [];
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error("Error fetching flows:", error);
      // Return empty array for UI to handle gracefully
      return [];
    }
  }

  async fetchFlowById(flowId: string): Promise<Flow> {
    const response = await fetch(`${this.baseUrl}/api/workflows/${flowId}`);
    return handleResponse<Flow>(response);
  }

  async deleteFlow(flowId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/workflows/${flowId}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(response);
  }

  async executeNode(nodeData: NodeData, inputs?: any): Promise<any> {
    // Based on node type, call the appropriate method
    const nodeType = nodeData.type?.toLowerCase();
    
    if (nodeType === 'tool') {
      return this.executeTool({
        id: nodeData.id,
        inputs: inputs
      });
    } else if (nodeType === 'agent') {
      return this.executeAgentNode(nodeData.id, inputs);
    } else if (nodeType === 'input') {
      return this.executeInputNode(nodeData.id, inputs);
    } else if (nodeType === 'output') {
      return this.executeOutputNode(nodeData.id, inputs);
    } else if (nodeType === 'task') {
      // For task nodes, the agent data should be in inputs.agent
      const agentData = inputs?.agent || {};
      return this.executeTaskNode(nodeData.id, agentData, inputs);
    } else if (nodeType === 'logic') {
      return this.executeLogicNode(nodeData.id, nodeData.data, inputs);
    } else if (nodeType === 'delay') {
      return this.executeDelayNode(nodeData.id, nodeData.data, inputs);
    } else if (nodeType === 'chat') {
      return this.executeChatNode(nodeData.id, nodeData.data, inputs);
    } else {
      // Default to the general execute endpoint
      const response = await fetch(`${this.baseUrl}/api/nodes/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_data: nodeData, inputs })
      });
      return handleResponse(response);
    }
  }

  async executeTool(toolData: ToolData): Promise<any> {
    console.log("Executing tool with URL:", `${this.baseUrl}/api/tools/run-tool`);
    console.log("Tool data:", JSON.stringify(toolData, null, 2));
    
    try {
      // Format the data to match what the backend expects
      const formattedData = {
        node_id: toolData.id,
        toolType: toolData.toolType || "llm", // Default to llm if not specified
        framework: toolData.framework,
        config: toolData.config || {},
        inputs: toolData.inputs || {}
      };
      
      console.log("Formatted tool data:", JSON.stringify(formattedData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/tools/run-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      
      if (!response.ok) {
        console.error("Tool execution failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error("Tool execution error:", error);
      throw error;
    }
  }

  async executeInputNode(nodeId: string, inputs: any): Promise<any> {
    console.log("Executing input node with URL:", `${this.baseUrl}/api/nodes/run-input`);
    console.log("Input data:", { node_id: nodeId, inputs });
    
    try {
      // Format the data to match what the backend expects
      const formattedData = {
        node_id: nodeId,
        data: {}, // Include any input-specific data here
        inputs: inputs || {}
      };
      
      console.log("Formatted input data:", JSON.stringify(formattedData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/nodes/run-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      
      if (!response.ok) {
        console.error("Input node execution failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error("Input node execution error:", error);
      throw error;
    }
  }

  async executeAgentNode(nodeId: string, inputs: any): Promise<any> {
    console.log("Executing agent node with URL:", `${this.baseUrl}/api/nodes/run-agent`);
    console.log("Agent data:", { node_id: nodeId, inputs });
    
    try {
      // Format the data to match what the backend expects
      const formattedData = {
        node_id: nodeId,
        data: {}, // Include any agent-specific data here
        inputs: inputs || {}
      };
      
      console.log("Formatted agent data:", JSON.stringify(formattedData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/nodes/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
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
      
      console.log("Formatted output data:", JSON.stringify(formattedData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/nodes/run-output`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
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
    const response = await fetch(`${this.baseUrl}/api/nodes/run-logic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, data, inputs })
    });
    return handleResponse(response);
  }
  
  async executeDelayNode(nodeId: string, data: any, inputs: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/nodes/run-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, data, inputs })
    });
    return handleResponse(response);
  }
  
  async executeChatNode(nodeId: string, data: any, inputs: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/nodes/run-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, data, inputs })
    });
    return handleResponse(response);
  }
  
  async executeTaskNode(nodeId: string, agentData: any, inputs: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/nodes/run-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        node_id: nodeId, 
        // Properly format agent connections by adding the agent data to the inputs
        // under a special 'agent' key that the task node expects
        inputs: {
          ...inputs,
          // Add the connected agent
          agent: agentData
        }
      })
    });
    return handleResponse(response);
  }

  async executeFlow(nodes: any[], edges: any[], inputs: any): Promise<any> {
    console.log("Executing flow with URL:", `${this.baseUrl}/api/execute-flow`);
    
    try {
      const formattedData = {
        nodes,
        edges,
        inputs: inputs || {}
      };
      
      console.log("Flow execution data:", JSON.stringify({
        nodeCount: nodes.length,
        edgeCount: edges.length,
        inputKeys: Object.keys(inputs || {})
      }));
      
      const response = await fetch(`${this.baseUrl}/api/execute-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      
      if (!response.ok) {
        console.error("Flow execution failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }
      
      const result = await handleResponse<any>(response);
      
      // Process the result to ensure node_results are properly formatted
      const processedResult: any = {
        ...result,
        node_results: {}
      };
      
      // Extract node results from logs if available
      if (result && result.logs && Array.isArray(result.logs)) {
        // Process each log entry to extract node results
        result.logs.forEach((log: any) => {
          if (log && log.nodeId && (log.result !== undefined || log.output !== undefined)) {
            processedResult.node_results[log.nodeId] = {
              ...log,
              status: log.status || 'completed'
            };
          }
        });
      }
      
      console.log("Processed flow execution result:", processedResult);
      return processedResult;
    } catch (error) {
      console.error("Flow execution error:", error);
      throw error;
    }
  }

  async fetchExecutedTriggers(): Promise<any[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      try {
        // Try the first endpoint
        let response = await fetch(`${this.baseUrl}/api/triggers/executed`, {
          mode: 'cors',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        // If the first endpoint fails, try the alternate endpoint
        if (!response.ok && response.status === 404) {
          console.log("Falling back to alternate trigger endpoint");
          response = await fetch(`${this.baseUrl}/api/triggers/executed-triggers`, {
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
        }
        
        if (!response.ok) {
          console.error(`Trigger endpoint error: ${response.status} ${response.statusText}`);
          return [];
        }
        
        const data = await handleResponse<any>(response);
        return data.data?.triggers || [];
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error("Error fetching executed triggers:", error instanceof DOMException && error.name === 'AbortError' 
        ? "Request timed out" : error);
      return [];
    }
  }

  async parseCV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/api/parse-cv`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  }

}

export const apiClient = APIClient.getInstance();
