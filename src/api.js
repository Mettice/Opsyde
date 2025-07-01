import { apiClient } from './api/client';

const API_URL = '/api';

// Re-export all API functions using the TypeScript client
export const saveFlow = (userId, name, nodes, edges) => 
  apiClient.saveFlow(userId, name, nodes, edges);

export const updateFlow = (flowId, name, nodes, edges) => 
  apiClient.updateFlow(flowId, name, nodes, edges);

export const fetchFlows = (userId) => 
  apiClient.fetchFlows(userId);

export const fetchFlowById = (flowId) => 
  apiClient.fetchFlowById(flowId);

export const deleteFlow = (flowId) => 
  apiClient.deleteFlow(flowId);

export const executeWorkflow = async (workflowData, file = null) => {
  if (file) {
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve({
          filename: file.name,
          content: base64,
          type: file.type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    if (fileData) {
      workflowData.inputs = workflowData.inputs || {};
      workflowData.inputs.file_upload = fileData;
    }
  }

  return apiClient.executeNode(workflowData);
};

export const parseCV = async (file) => {
  return apiClient.parseCV(file);
};

export const executeNode = (nodeId, inputs) => 
  apiClient.executeNode({ id: nodeId }, inputs);

export const executeTool = (toolId, inputs) => 
  apiClient.executeTool({ id: toolId, inputs });

export const executeInputNode = (nodeId, inputs) => 
  apiClient.executeInputNode(nodeId, inputs);

export const executeTaskNode = (nodeId, agentData, inputs) => 
  apiClient.executeTaskNode(nodeId, agentData, inputs);

export const executeOutputNode = (nodeId, inputs) => 
  apiClient.executeOutputNode(nodeId, inputs);

export const fetchExecutedTriggers = () => 
  apiClient.fetchExecutedTriggers();

export const executeFlow = (nodes, edges, inputs) =>
  apiClient.executeFlow(nodes, edges, inputs); 