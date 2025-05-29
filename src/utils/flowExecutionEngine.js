import { toast } from 'react-hot-toast';

// Import the workflow data manager
import { get_workflow_context } from '../backend/core/workflow_data_manager.py';

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
      
    case 'universal_polling':
      const serviceName = nodeData.serviceName || 'Unknown API';
      const apiEndpoint = nodeData.apiEndpoint || '';
      const pollingInterval = nodeData.pollingInterval || 300;
      const changeMethod = nodeData.changeDetectionMethod || 'array_length';
      
      // ACTUALLY FETCH THE API DATA instead of just returning a status
      try {
        console.log(`🔍 Fetching real data from ${serviceName}: ${apiEndpoint}`);
        
        // Set up headers for authentication
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'CrewBuilder-Universal-Polling/1.0'
        };
        
        // Handle authentication
        const authType = nodeData.authType || 'none';
        if (authType === 'api_key' && nodeData.apiKey) {
          headers['Authorization'] = `Bearer ${nodeData.apiKey}`;
        } else if (authType === 'bearer_token' && nodeData.bearerToken) {
          headers['Authorization'] = `Bearer ${nodeData.bearerToken}`;
        } else if (authType === 'basic_auth' && nodeData.username && nodeData.password) {
          const credentials = btoa(`${nodeData.username}:${nodeData.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        
        // Fetch the actual API data
        const response = await fetch(apiEndpoint, {
          method: 'GET',
          headers: headers,
          timeout: 30000
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const apiData = await response.json();
        console.log(`✅ Successfully fetched data from ${serviceName}:`, apiData);
        
        // 🎯 ENHANCED DATA PROCESSING FOR CRYPTO VISIBILITY
        let processedData = apiData;
        let cryptoSummary = '';
        
        // Special handling for DexScreener data
        if (serviceName.toLowerCase().includes('dexscreener') || apiEndpoint.includes('dexscreener')) {
          if (apiData.pairs && Array.isArray(apiData.pairs)) {
            const pairs = apiData.pairs;
            console.log(`🪙 DexScreener found ${pairs.length} crypto pairs:`);
            
            // Log each crypto pair for visibility
            pairs.forEach((pair, index) => {
              const token = pair.baseToken || {};
              const price = pair.priceUsd || 'N/A';
              const liquidity = pair.liquidity?.usd || 'N/A';
              const volume24h = pair.volume?.h24 || 'N/A';
              const change24h = pair.priceChange?.h24 || 'N/A';
              
              console.log(`🪙 Pair ${index + 1}: ${token.symbol} (${token.name})`);
              console.log(`   💰 Price: $${price}`);
              console.log(`   💧 Liquidity: $${liquidity}`);
              console.log(`   📊 Volume 24h: $${volume24h}`);
              console.log(`   📈 Change 24h: ${change24h}%`);
            });
            
            // Create a summary for the agent (REDUCED TOKEN USAGE)
            cryptoSummary = pairs.map((pair, index) => {
              const token = pair.baseToken || {};
              return `Token ${index + 1}: ${token.symbol} (${token.name}) - Price: $${pair.priceUsd || 'N/A'}, Liquidity: $${pair.liquidity?.usd || 'N/A'}, Volume: $${pair.volume?.h24 || 'N/A'}, Change: ${pair.priceChange?.h24 || 'N/A'}%`;
            }).join('\n');
            
            // 🔥 LIMIT DATA TO REDUCE TOKEN USAGE
            // Only pass essential fields to the agent
            processedData = {
              pairs: pairs.map(pair => ({
                baseToken: {
                  symbol: pair.baseToken?.symbol,
                  name: pair.baseToken?.name
                },
                priceUsd: pair.priceUsd,
                liquidity: { usd: pair.liquidity?.usd },
                volume: { h24: pair.volume?.h24 },
                priceChange: { h24: pair.priceChange?.h24 },
                chainId: pair.chainId,
                url: pair.url
              })),
              schemaVersion: apiData.schemaVersion,
              total_pairs: pairs.length
            };
            
            console.log(`🎯 Processed data for agent (reduced size):`, processedData);
          }
        }
        
        // Apply field filtering if configured
        let filteredData = processedData;
        const includeFields = nodeData.includeFields || nodeData.targetFields;
        const excludeFields = nodeData.excludeFields;
        
        if (includeFields && includeFields.length > 0) {
          console.log(`🎯 Applying field filtering - Include: ${includeFields.join(', ')}`);
          // Filter to include only specified fields
          if (Array.isArray(processedData)) {
            filteredData = processedData.map(item => {
              const filtered = {};
              includeFields.forEach(field => {
                if (item[field] !== undefined) {
                  filtered[field] = item[field];
                }
              });
              return filtered;
            });
          } else if (processedData.pairs && Array.isArray(processedData.pairs)) {
            // DexScreener format
            filteredData = {
              ...processedData,
              pairs: processedData.pairs.map(pair => {
                const filtered = {};
                includeFields.forEach(field => {
                  if (field.includes('.')) {
                    // Handle nested fields like 'baseToken.symbol'
                    const parts = field.split('.');
                    let value = pair;
                    for (const part of parts) {
                      value = value?.[part];
                    }
                    if (value !== undefined) {
                      // Set nested value in filtered object
                      let target = filtered;
                      for (let i = 0; i < parts.length - 1; i++) {
                        if (!target[parts[i]]) target[parts[i]] = {};
                        target = target[parts[i]];
                      }
                      target[parts[parts.length - 1]] = value;
                    }
                  } else if (pair[field] !== undefined) {
                    filtered[field] = pair[field];
                  }
                });
                return filtered;
              })
            };
          }
          console.log(`🎯 Filtered data:`, filteredData);
        }
        
        // Return the actual API data for the agent to process
        result.output = `✅ Fetched ${Array.isArray(apiData) ? apiData.length : apiData.pairs?.length || 'unknown'} items from ${serviceName}`;
        result.type = 'api_data';
        result.service_name = serviceName;
        result.api_endpoint = apiEndpoint;
        result.polling_interval = pollingInterval;
        result.change_detection_method = changeMethod;
        result.api_data = filteredData; // This is the key - pass the filtered data
        result.raw_data = apiData; // Keep original for reference
        result.crypto_summary = cryptoSummary; // Human-readable summary
        result.data_summary = `Retrieved real data from ${serviceName} API`;
        result.token_optimization = `Data filtered to reduce token usage: ${JSON.stringify(filteredData).length} chars vs ${JSON.stringify(apiData).length} chars original`;
        
        console.log(`🎯 Trigger returning optimized API data:`, result);
        
      } catch (error) {
        console.error(`❌ Failed to fetch API data from ${serviceName}:`, error);
        result.output = `❌ Failed to fetch data from ${serviceName}: ${error.message}`;
        result.type = 'error';
        result.error = error.message;
        result.service_name = serviceName;
        result.api_endpoint = apiEndpoint;
      }
      break;
      
    case 'universal_webhook':
      const webhookServiceName = nodeData.serviceName || 'Unknown Service';
      const webhookService = nodeData.webhookService || 'generic';
      result.output = `Universal Webhook trigger '${label}' activated - ready to receive ${webhookServiceName} webhooks`;
      result.type = 'trigger_status';
      result.service_name = webhookServiceName;
      result.webhook_service = webhookService;
      result.webhook_url = `/api/triggers/${triggerId}`;
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
  console.log('🚀 Starting flow execution with enhanced data management');
  
  // Create workflow context for data management
  const workflowId = `flow_${Date.now()}`;
  const executionState = {};
  const results = [];
  
  try {
    // Get execution order
    const executionOrder = topologicalSort(nodes, edges);
    console.log('📋 Execution order:', executionOrder);
    
    // Execute nodes in order
    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) {
        console.warn(`⚠️ Node ${nodeId} not found`);
        continue;
      }
      
      console.log(`🔄 Executing node: ${nodeId} (${node.type})`);
      onNodeStart(nodeId, node);
      
      try {
        // Collect inputs for this node
        const nodeInputs = collectInputData(nodeId, edges, executionState, inputs);
        console.log(`📥 Node inputs for ${nodeId}:`, nodeInputs);
        
        // Execute the node
        const result = await executeNodeByType(node, nodeInputs, executors);
        console.log(`✅ Node ${nodeId} completed:`, result);
        
        // Store result in execution state
        executionState[nodeId] = result;
        
        // Register with workflow context (if backend integration available)
        try {
          // This would be called via API in a real implementation
          console.log(`📝 Registering output for ${node.type} node: ${nodeId}`);
          // await registerNodeOutput(workflowId, nodeId, node.type, result);
        } catch (error) {
          console.warn('Could not register with workflow context:', error.message);
        }
        
        // Notify completion
        onNodeComplete(nodeId, node, result);
        
        // Add to results
        results.push({
          nodeId,
          nodeType: node.type,
          result,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Error executing node ${nodeId}:`, error);
        
        const errorResult = {
          type: 'error',
          error: error.message,
          nodeId,
          timestamp: new Date().toISOString()
        };
        
        executionState[nodeId] = errorResult;
        results.push({
          nodeId,
          nodeType: node.type,
          result: errorResult,
          timestamp: new Date().toISOString()
        });
        
        onNodeComplete(nodeId, node, errorResult);
        
        // Continue execution for now (could be made configurable)
      }
    }
    
    console.log('✅ Flow execution completed');
    onFlowComplete(results, executionState);
    
    return {
      success: true,
      results,
      executionState,
      workflowId,
      summary: {
        totalNodes: nodes.length,
        executedNodes: results.length,
        errors: results.filter(r => r.result.type === 'error').length
      }
    };
    
  } catch (error) {
    console.error('❌ Flow execution failed:', error);
    onFlowComplete([], executionState, error);
    
    return {
      success: false,
      error: error.message,
      results,
      executionState,
      workflowId
    };
  }
};

// Helper function to register node output (would call backend API)
async function registerNodeOutput(workflowId, nodeId, nodeType, outputData) {
  // This would make an API call to the backend to register the output
  // For now, just log it
  console.log(`📝 Would register: ${workflowId} -> ${nodeId} (${nodeType}) -> ${typeof outputData}`);
}

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