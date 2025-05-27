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
  const triggerNodes = [];
  
  // Initialize graph and in-degree count
  nodes.forEach(node => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
    
    // Identify trigger nodes
    const nodeType = node.type || (node.data && node.data.nodeType);
    if (nodeType === 'trigger') {
      triggerNodes.push(node.id);
    }
  });
  
  // Build the graph
  edges.forEach(edge => {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  });
  
  // Find all nodes with no incoming edges (in-degree = 0)
  // Prioritize trigger nodes
  const queue = [];
  
  // First add trigger nodes with no incoming edges
  triggerNodes.forEach(nodeId => {
    if (inDegree[nodeId] === 0) {
      queue.push(nodeId);
    }
  });
  
  // Then add other nodes with no incoming edges
  nodes.forEach(node => {
    if (inDegree[node.id] === 0 && !triggerNodes.includes(node.id)) {
      queue.push(node.id);
    }
  });
  
  const result = [];
  
  // Process queue
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);
    
    // For each neighbor, reduce in-degree by 1
    graph[current].forEach(neighbor => {
      inDegree[neighbor]--;
      
      // If in-degree becomes 0, add to queue
      // Prioritize trigger nodes
      if (inDegree[neighbor] === 0) {
        if (triggerNodes.includes(neighbor)) {
          queue.unshift(neighbor); // Add trigger nodes to front
        } else {
          queue.push(neighbor);
        }
      }
    });
  }
  
  // Check for cycles
  if (result.length !== nodes.length) {
    console.warn('Graph contains cycles, execution order may not be optimal');
  }
  
  console.log('Execution order:', result);
  console.log('Trigger nodes found:', triggerNodes);
  
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
      
      // Special handling for agent connection to task node
      if (edge.targetHandle === 'agent' && sourceOutput) {
        // Store agent data properly for task nodes
        inputs.agent = sourceOutput;
        console.log("Setting agent data for task node:", nodeId, inputs.agent);
      }
      // Regular handling for other connections
      else {
        // Special handling for agent data
        if (sourceOutput.type === 'agent_status') {
          // Store agent data in a consistent format
          inputs.agent = {
            type: 'agent_status',
            agent_name: sourceOutput.agent_name,
            agent_role: sourceOutput.agent_role,
            agent_id: sourceOutput.agent_id,
            llmModel: sourceOutput.llmModel,
            temperature: sourceOutput.temperature,
            maxTokens: sourceOutput.maxTokens,
            useMemory: sourceOutput.useMemory,
            prompt: sourceOutput.prompt,
            status: sourceOutput.status
          };
        }
        
        // Special handling for CV parser results
        if (sourceOutput.type === 'cv_result' && sourceOutput.data) {
          // Store CV data under both the edge label and a consistent key
          inputs[inputKey] = sourceOutput;
          inputs.cv_result = sourceOutput;
          // Also store the data directly for backward compatibility
          inputs.cv_data = sourceOutput.data;
        } else {
          // Handle different output formats
          if (typeof sourceOutput === 'object' && sourceOutput !== null) {
            // If it has a data field and is from a tool, preserve the structure
            if (sourceOutput.data && sourceOutput.type) {
              inputs[inputKey] = sourceOutput;
            }
            // If the output is an object with an 'output' field, use that
            else if (sourceOutput.output !== undefined) {
              inputs[inputKey] = sourceOutput;
            } else {
              // Otherwise use the whole object
              inputs[inputKey] = sourceOutput;
            }
          } else {
            // For primitive values
            inputs[inputKey] = sourceOutput;
          }
        }
      }
    }
  });
  
  return inputs;
};

// Add this helper function at the top of the file
function removeCircularReferences(obj) {
  const seen = new WeakSet();
  
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (key === '_owner' || key === '_store' || key.startsWith('__react')) {
      return undefined; // Remove React-specific circular references
    }
    
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined; // Remove circular reference
      }
      seen.add(value);
    }
    return value;
  }));
}

/**
 * Execute a trigger node
 * @param {Object} node - Trigger node object
 * @param {Object} inputs - Input data (usually empty for triggers)
 * @returns {Promise<Object>} - Trigger execution result
 */
export const executeTriggerNode = async (node, inputs) => {
  const nodeData = node.data || {};
  const triggerType = nodeData.triggerType || 'manual';
  const triggerId = node.id;
  const label = nodeData.label || 'Trigger';
  
  console.log(`Executing trigger node ${triggerId} of type ${triggerType}`);
  
  // Create base result
  const result = {
    status: 'started',
    trigger_type: triggerType,
    trigger_id: triggerId,
    label: label,
    timestamp: new Date().toISOString(),
    execution_index: 0 // Triggers are always first
  };
  
  switch (triggerType) {
    case 'manual':
      result.output = `Manual trigger '${label}' activated - workflow started`;
      result.type = 'trigger_status';
      break;
      
    case 'webhook':
      result.output = `Webhook trigger '${label}' activated - workflow started`;
      result.type = 'trigger_status';
      result.webhook_url = `/api/triggers/${triggerId}`;
      break;
      
    case 'schedule':
      const runAt = nodeData.runAt || 'N/A';
      const scheduleType = nodeData.scheduleType || 'once';
      result.output = `Scheduled trigger '${label}' activated at ${runAt} - workflow started`;
      result.type = 'trigger_status';
      result.schedule_type = scheduleType;
      result.run_at = runAt;
      break;
      
    default:
      result.output = `Unknown trigger type: ${triggerType}`;
      result.type = 'error';
      result.error = `Unsupported trigger type: ${triggerType}`;
      break;
  }
  
  return result;
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
  
  // Handle trigger nodes with built-in executor
  if (nodeType === 'trigger') {
    return await executeTriggerNode(node, inputs);
  }
  
  const executor = executors[nodeType];
  
  if (!executor) {
    throw new Error(`No executor found for node type: ${nodeType}`);
  }
  
  try {
    const result = await executor(node, inputs);
    
    // Clean the result before returning
    const cleanedResult = removeCircularReferences(result);
    
    // Special handling for CV parser results
    if (node.data?.customTool === 'cv_parser' && cleanedResult?.type === 'cv_result') {
      return {
        type: 'cv_result',
        data: cleanedResult.data,
        nodeId: node.id,
        nodeType: nodeType,
        nodeName: node.data?.label || 'CV Parser'
      };
    }
    
    return cleanedResult;
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
      
      // Clean the result before storing
      const cleanedResult = removeCircularReferences(result);
      
      // Store the result
      executionState[nodeId] = cleanedResult;
      
      // Log successful execution
      logs.push({
        nodeId: node.id,
        nodeName: node.data?.label || 'Unnamed Node',
        type: node.type || (node.data && node.data.nodeType),
        typeDescription: getNodeTypeDescription(node),
        status: 'completed',
        result: cleanedResult,
        timestamp: new Date().toISOString()
      });
      
      // Notify that node execution is complete
      onNodeComplete(node, cleanedResult);
      
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