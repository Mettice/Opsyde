import { toast } from 'react-hot-toast';

/**
 * Topologically sort nodes based on their dependencies
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Array} - Sorted array of node IDs
 */
export const topologicalSort = (nodes, edges) => {
  // Create adjacency list
  const graph = {};
  const inDegree = {};
  
  // Initialize graph and in-degree count
  nodes.forEach(node => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  });
  
  // Build the graph
  edges.forEach(edge => {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  });
  
  // Find all nodes with no incoming edges (in-degree = 0)
  const queue = nodes
    .filter(node => inDegree[node.id] === 0)
    .map(node => node.id);
  
  const result = [];
  
  // Process queue
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);
    
    // For each neighbor, reduce in-degree by 1
    graph[current].forEach(neighbor => {
      inDegree[neighbor]--;
      
      // If in-degree becomes 0, add to queue
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  // Check for cycles
  if (result.length !== nodes.length) {
    console.warn('Graph contains cycles, execution order may not be optimal');
  }
  
  return result;
};

/**
 * Collect input data for a node from its dependencies
 * @param {string} nodeId - ID of the node
 * @param {Array} edges - Array of edge objects
 * @param {Object} executionState - Current execution state with node outputs
 * @param {Object} globalInputs - Global inputs for the flow
 * @returns {Object} - Collected input data
 */
export const collectInputData = (nodeId, edges, executionState, globalInputs = {}) => {
  const inputs = { ...globalInputs };
  
  // Find all edges where this node is the target
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  
  // For each incoming edge, get the output from the source node
  incomingEdges.forEach(edge => {
    const sourceId = edge.source;
    const sourceOutput = executionState[sourceId];
    
    if (sourceOutput !== undefined) {
      // Use the edge label as the input key if available
      const inputKey = edge.label || `input_from_${sourceId}`;
      
      // Handle different output formats
      if (typeof sourceOutput === 'object' && sourceOutput !== null) {
        // If the output is an object with an 'output' field, use that
        if (sourceOutput.output !== undefined) {
          inputs[inputKey] = sourceOutput.output;
        } else {
          // Otherwise use the whole object
          inputs[inputKey] = sourceOutput;
        }
      } else {
        // For primitive values
        inputs[inputKey] = sourceOutput;
      }
    }
  });
  
  return inputs;
};

/**
 * Execute a node based on its type
 * @param {Object} node - Node object
 * @param {Object} inputs - Input data for the node
 * @param {Object} executors - Object mapping node types to executor functions
 * @returns {Promise<any>} - Result of node execution
 */
export const executeNodeByType = async (node, inputs, executors) => {
  const nodeType = node.type || (node.data && node.data.nodeType);
  
  if (!nodeType) {
    throw new Error(`Node ${node.id} has no type`);
  }
  
  const executor = executors[nodeType];
  
  if (!executor) {
    throw new Error(`No executor found for node type: ${nodeType}`);
  }
  
  try {
    return await executor(node, inputs);
  } catch (error) {
    console.error(`Error executing node ${node.id} of type ${nodeType}:`, error);
    toast.error(`Error in ${node.data?.label || nodeType} node: ${error.message}`);
    return {
      error: true,
      message: error.message,
      nodeId: node.id,
      nodeType
    };
  }
};

/**
 * Run a flow with the given nodes and edges
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {Object} inputs - Global inputs for the flow
 * @param {Object} executors - Object mapping node types to executor functions
 * @param {Function} onNodeStart - Callback when a node starts execution
 * @param {Function} onNodeComplete - Callback when a node completes execution
 * @param {Function} onFlowComplete - Callback when the flow completes
 * @returns {Promise<Object>} - Execution state with results for each node
 */
export const runFlow = async (
  nodes, 
  edges, 
  inputs = {}, 
  executors = {}, 
  onNodeStart = () => {}, 
  onNodeComplete = () => {},
  onFlowComplete = () => {}
) => {
  // Initialize execution state
  const executionState = {};
  const logs = [];
  
  // Get execution order
  const executionOrder = topologicalSort(nodes, edges);
  
  // Execute nodes in order
  for (const nodeId of executionOrder) {
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      console.warn(`Node ${nodeId} not found`);
      continue;
    }
    
    // Notify that node execution is starting
    onNodeStart(node);
    
    // Log start of execution
    logs.push({
      nodeId: node.id,
      nodeName: node.data?.label || 'Unnamed Node',
      type: node.type || (node.data && node.data.nodeType),
      typeDescription: getNodeTypeDescription(node),
      status: 'started',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Collect inputs for this node
      const nodeInputs = collectInputData(nodeId, edges, executionState, inputs);
      
      // Execute the node
      const result = await executeNodeByType(node, nodeInputs, executors);
      
      // Store the result
      executionState[nodeId] = result;
      
      // Log successful execution
      logs.push({
        nodeId: node.id,
        nodeName: node.data?.label || 'Unnamed Node',
        type: node.type || (node.data && node.data.nodeType),
        typeDescription: getNodeTypeDescription(node),
        status: 'completed',
        result,
        timestamp: new Date().toISOString()
      });
      
      // Notify that node execution is complete
      onNodeComplete(node, result);
      
    } catch (error) {
      console.error(`Error executing node ${nodeId}:`, error);
      
      // Log error
      logs.push({
        nodeId: node.id,
        nodeName: node.data?.label || 'Unnamed Node',
        type: node.type || (node.data && node.data.nodeType),
        typeDescription: getNodeTypeDescription(node),
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Store error result
      executionState[nodeId] = {
        error: true,
        message: error.message
      };
      
      // Notify that node execution failed
      onNodeComplete(node, { error: true, message: error.message });
    }
  }
  
  // Notify that flow execution is complete
  onFlowComplete(executionState, logs);
  
  return {
    state: executionState,
    logs
  };
};

// Add this helper function to get a descriptive node type
function getNodeTypeDescription(node) {
  const type = node.type || (node.data && node.data.nodeType);
  const data = node.data || {};
  
  switch (type) {
    case 'agent':
      return `Agent: ${data.role || 'Assistant'}`;
    case 'task':
      return `Task: ${data.description ? data.description.substring(0, 20) + '...' : 'Task'}`;
    case 'tool':
      return `Tool: ${data.toolType || 'Generic'}`;
    case 'input':
      return `Input: ${data.inputType || 'Text'}`;
    case 'output':
      return `Output: ${data.outputType || 'Generic'}`;
    case 'logic':
      return `Logic: Condition`;
    case 'delay':
      return `Delay: ${data.duration || '1000'}ms`;
    case 'trigger':
      return `Trigger: ${data.triggerType || 'Manual'}`;
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
  }
} 