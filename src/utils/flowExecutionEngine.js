import { toast } from 'react-hot-toast';

/**
 * Topologically sort nodes based on their dependencies
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Array} - Sorted array of node IDs
 */
export const topologicalSort = (nodes, edges) => {
  const inDegree = {};
  const adjList = {};
  const result = [];

  // Initialize in-degree and adjacency list
  nodes.forEach(node => {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
  });

  // Build adjacency list and calculate in-degrees
  edges.forEach(edge => {
    if (edge.source && edge.target) {
      adjList[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  });

  // Initialize queue with nodes having in-degree 0
  const queue = nodes.filter(node => inDegree[node.id] === 0).map(node => node.id);

  while (queue.length > 0) {
    const nodeId = queue.shift();
    result.push(nodeId);

    // For each neighbor
    adjList[nodeId].forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  // Check for cycles (optional - for debugging)
  if (result.length !== nodes.length) {
    console.warn('Cycle detected in graph or disconnected nodes');
    // Add remaining nodes to ensure execution continues
    nodes.forEach(node => {
      if (!result.includes(node.id)) {
        result.push(node.id);
      }
    });
  }

  return result;
};

/**
 * Collect input data for a node from its dependencies
 * @param {string} nodeId - ID of the node
 * @param {Array} edges - Array of edge objects
 * @param {Object} executionState - Current execution state with node outputs
 * @param {Object} globalInputs - Global inputs for the flow
 * @param {Array} nodes - Array of node objects
 * @returns {Object} - Collected input data
 */
export const collectInputData = (nodeId, edges, executionState, globalInputs = {}, nodes = []) => {
  console.log(`🌐 Collecting input data for node: ${nodeId}`);
  
  const inputs = { ...globalInputs };
  
  // Find all edges that connect to this node (incoming edges)
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  
  console.log(`🔗 Found ${incomingEdges.length} incoming connections for ${nodeId}`);
  
  // Find the node object to get its schema
  let nodeObj = null;
  if (Array.isArray(nodes) && nodes.length > 0) {
    nodeObj = nodes.find(n => n.id === nodeId);
  }
  // Fallback: try to get from executionState if not found
  if (!nodeObj && executionState[nodeId]?.node) {
    nodeObj = executionState[nodeId].node;
  }
  const inputSchema = nodeObj?.data?.input_schema || null;
  const expectedKeys = inputSchema ? Object.keys(inputSchema) : [];
  
  incomingEdges.forEach(edge => {
    const sourceNodeId = edge.source;
    const sourceResult = executionState[sourceNodeId];
    
    if (!sourceResult) {
      console.log(`⚠️ No result found for source node: ${sourceNodeId}`);
      return;
    }
    
    const outputHandle = edge.sourceHandle || 'output';
    let processedData = sourceResult;
    
    // 🚀 NEW: Preprocess Airtable data for agent consumption
    if (sourceResult.metadata?.serviceName === 'Airtable' || 
        sourceResult.metadata?.source_api === 'Airtable' ||
        (sourceResult.content && typeof sourceResult.content === 'object' && 
         (sourceResult.content.api_data || sourceResult.content.records))) {
      
      console.log('🔧 Preprocessing Airtable data for agent consumption...');
      
      // Extract clean data from the source result
      let rawData = sourceResult.content || sourceResult.output || sourceResult;
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData);
        } catch (e) {
          // Keep as string if not JSON
        }
      }
      
      const extractedData = extractAirtableData(rawData);
      
      if (extractedData.textSummary) {
        // Provide both structured and text formats for agent
        processedData = {
          // Text format for agent processing
          text: extractedData.textSummary,
          // Structured format for programmatic access
          structured: extractedData.data,
          // Summary information
          summary: `Retrieved ${extractedData.totalRecords} records from Airtable with fields: ${extractedData.fields.join(', ')}`,
          // Original metadata
          metadata: sourceResult.metadata || {}
        };
        
        console.log(`✅ Preprocessed Airtable data: ${extractedData.totalRecords} records extracted`);
      } else {
        processedData = sourceResult;
      }
    }
    
    // --- SCHEMA-AWARE MAPPING ---
    let mapped = false;
    // 1. If outputHandle matches a key in the schema, use it
    if (inputSchema && expectedKeys.includes(outputHandle)) {
      inputs[outputHandle] = processedData;
      mapped = true;
    }
    // 2. If not, try to map to the first required key
    if (!mapped && inputSchema) {
      const requiredKey = expectedKeys.find(k => !inputSchema[k].optional);
      if (requiredKey && !inputs[requiredKey]) {
        inputs[requiredKey] = processedData;
        mapped = true;
      }
    }
    // 3. If still not mapped, default to 'input' or use outputHandle
    if (!mapped) {
      if (inputSchema && expectedKeys.includes('input')) {
        inputs['input'] = processedData;
      } else {
        inputs[outputHandle] = processedData;
      }
    }
    
    console.log(`📤 Input from ${sourceNodeId} (${outputHandle}):`, 
                typeof processedData === 'object' ? 
                `${Object.keys(processedData).length} properties` : 
                typeof processedData);
  });
  
  console.log(`🎯 Final inputs for ${nodeId}:`, Object.keys(inputs));
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
        const nodeInputs = collectInputData(nodeId, edges, executionState, inputs, nodes);
        console.log(`�� Node inputs for ${nodeId}:`, nodeInputs);
        
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

// Helper function to determine content type based on data
function determineContentType(data) {
  if (!data) return 'empty';
  
  if (typeof data === 'string') {
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      try {
        JSON.parse(data);
        return 'json';
      } catch {
        return 'text';
      }
    }
    if (data.includes('\n') && data.length > 100) return 'long_text';
    if (data.includes('http://') || data.includes('https://')) return 'url';
    return 'text';
  }
  
  if (typeof data === 'object') {
    if (Array.isArray(data)) return 'array';
    if (data.type === 'api_data' || data.api_data) return 'api_data';
    if (data.records && Array.isArray(data.records)) return 'records';
    return 'object';
  }
  
  if (typeof data === 'number') return 'number';
  if (typeof data === 'boolean') return 'boolean';
  
  return 'unknown';
}

// 🚀 NEW: Airtable data extraction and flattening
function extractAirtableData(data) {
  try {
    // Handle direct Airtable API response format
    if (data.api_data && data.api_data.records) {
      const records = data.api_data.records;
      return extractAirtableRecords(records);
    }
    
    // Handle nested trigger data format
    if (data.type === 'api_data' && data.api_data && data.api_data.records) {
      const records = data.api_data.records;
      return extractAirtableRecords(records);
    }
    
    // Handle direct records array
    if (Array.isArray(data.records)) {
      return extractAirtableRecords(data.records);
    }
    
    // Handle single record
    if (data.data && data.data.Fields) {
      return extractSingleAirtableRecord(data);
    }
    
    return data; // Return as-is if not Airtable format
  } catch (error) {
    console.error('🔧 Error extracting Airtable data:', error);
    return data;
  }
}

function extractAirtableRecords(records) {
  if (!Array.isArray(records)) return records;
  
  const extractedRecords = records.map(record => extractSingleAirtableRecord(record));
  
  // Create a summary for agent consumption
  const summary = {
    totalRecords: extractedRecords.length,
    fields: extractedRecords.length > 0 ? Object.keys(extractedRecords[0]) : [],
    data: extractedRecords,
    // Create a readable text summary for agents
    textSummary: extractedRecords.map((record, index) => {
      const fields = Object.entries(record)
        .filter(([key, value]) => key !== 'id' && key !== 'Created Time')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `Record ${index + 1}: ${fields}`;
    }).join('\n')
  };
  
  return summary;
}

function extractSingleAirtableRecord(record) {
  try {
    // Extract from nested structure: record.data.Fields
    if (record.data && record.data.Fields) {
      return {
        id: record.id || record.data.Id,
        createdTime: record.data['Created Time'],
        ...record.data.Fields // Spread all the field values
      };
    }
    
    // Handle direct field access
    if (record.fields) {
      return {
        id: record.id,
        ...record.fields
      };
    }
    
    return record; // Return as-is if structure doesn't match
  } catch (error) {
    console.error('🔧 Error extracting single Airtable record:', error);
    return record;
  }
}

/**
 * 🔧 ENHANCED: Extract meaningful content from standardized node results
 * This handles the new standardized format: { success, data, error, metadata }
 * and provides clean content for display with better error handling
 */
export const extractNodeContent = (nodeResult, nodeType = 'unknown') => {
  try {
    console.log(`🔧 Extracting content from ${nodeType} node:`, nodeResult);
    
    // Handle null/undefined
    if (!nodeResult) {
      return {
        content: 'No output',
        type: 'text',
        isError: false,
        metadata: {}
      };
    }

    // 🚀 ENHANCED: Handle standardized backend format {success, data, error, metadata}
    if (typeof nodeResult === 'object' && 'success' in nodeResult) {
      if (nodeResult.success && 'data' in nodeResult) {
        // Extract data from successful standardized result
        const extractedData = nodeResult.data;
        console.log(`✅ Extracted data from standardized format:`, extractedData);
        
        // 🚀 NEW: Handle different data types from standardized format
        if (typeof extractedData === 'object' && extractedData.type) {
          switch (extractedData.type) {
            case 'text_input':
              return {
                content: extractedData.text_content || extractedData.value || 'No input provided',
                type: 'input_text',
                isError: false,
                metadata: nodeResult.metadata || {},
                inputType: extractedData.input_type
              };
              
            case 'file_input':
              return {
                content: extractedData.extracted_text || `File: ${extractedData.filename}`,
                type: 'file_content',
                isError: false,
                metadata: nodeResult.metadata || {},
                filename: extractedData.filename,
                fileType: extractedData.file_type
              };
              
            case 'trigger_activation':
            case 'webhook_activation':
            case 'schedule_activation':
              return {
                content: extractedData.message || 'Trigger activated',
                type: 'trigger_status',
                isError: false,
                metadata: nodeResult.metadata || {},
                triggerType: extractedData.trigger_type
              };
              
            case 'api_data':
              const apiSummary = extractedData.data_summary || `API data from ${extractedData.service_name}`;
              return {
                content: apiSummary,
                type: 'api_response',
                isError: false,
                metadata: nodeResult.metadata || {},
                apiData: extractedData.api_data,
                recordCount: nodeResult.metadata?.record_count || 0
              };
              
            case 'chat_response':
              return {
                content: extractedData.response || 'No chat response',
                type: 'chat_message',
                isError: false,
                metadata: nodeResult.metadata || {},
                provider: extractedData.provider,
                model: extractedData.model
              };
              
            case 'agent_result':
              return {
                content: extractedData.result || extractedData.output || 'Agent completed',
                type: 'agent_response',
                isError: false,
                metadata: nodeResult.metadata || {},
                agentName: extractedData.agent_name,
                framework: nodeResult.metadata?.framework
              };
              
            case 'task_result':
              return {
                content: extractedData.result || extractedData.output || 'Task completed',
                type: 'task_response',
                isError: false,
                metadata: nodeResult.metadata || {},
                taskName: extractedData.task_name
              };
              
            case 'tool_result':
              return {
                content: extractedData.result || extractedData.data || 'Tool executed',
                type: 'tool_response',
                isError: false,
                metadata: nodeResult.metadata || {},
                toolType: nodeResult.metadata?.tool_type
              };
              
            default:
              // Generic standardized data
              return {
                content: extractedData,
                type: determineContentType(extractedData),
                isError: false,
                metadata: nodeResult.metadata || {},
                executionTime: nodeResult.metadata?.execution_time,
                framework: nodeResult.metadata?.framework
              };
          }
        } else {
          // Non-typed standardized data
          return {
            content: extractedData,
            type: determineContentType(extractedData),
            isError: false,
            metadata: nodeResult.metadata || {},
            executionTime: nodeResult.metadata?.execution_time,
            framework: nodeResult.metadata?.framework
          };
        }
      } else {
        // Handle error in standardized format
        return {
          content: nodeResult.error || 'Unknown error occurred',
          type: 'error', 
          isError: true,
          metadata: nodeResult.metadata || {}
        };
      }
    }

    // 🚀 ENHANCED: Handle legacy formats with better detection
    if (typeof nodeResult === 'object') {
      // Agent result format
      if (nodeResult.type === 'agent_result' || nodeResult.agent_name) {
        return {
          content: nodeResult.result || nodeResult.output || nodeResult.text_output || 'No agent output',
          type: 'agent_response',
          isError: false,
          metadata: {
            agentName: nodeResult.agent_name,
            role: nodeResult.role,
            framework: nodeResult.framework,
            llm: nodeResult.llm || {}
          }
        };
      }

      // Task result format  
      if (nodeResult.type === 'task_result') {
        return {
          content: nodeResult.result || nodeResult.output || 'Task completed',
          type: 'task_response',
          isError: false,
          metadata: {
            taskName: nodeResult.task_name,
            description: nodeResult.description,
            status: nodeResult.status
          }
        };
      }

      // Tool result format
      if (nodeResult.type === 'tool_result' || nodeResult.success !== undefined) {
        const toolContent = nodeResult.result || nodeResult.data || nodeResult.output || nodeResult.response;
        return {
          content: toolContent,
          type: 'tool_response',
          isError: !nodeResult.success,
          metadata: nodeResult.metadata || {}
        };
      }

      // Chat result format
      if (nodeResult.type === 'chat_result' || nodeResult.response) {
        return {
          content: nodeResult.response || nodeResult.text || 'Chat completed',
          type: 'chat_message',
          isError: false,
          metadata: {
            provider: nodeResult.provider,
            model: nodeResult.model
          }
        };
      }

      // Logic result format
      if (nodeResult.type === 'logic_result') {
        const logicOutput = nodeResult.output || {};
        const resultValue = logicOutput.result !== undefined ? logicOutput.result : 'Logic evaluated';
        return {
          content: `Logic condition: ${logicOutput.condition || 'N/A'} → ${resultValue}`,
          type: 'logic_evaluation',
          isError: false,
          metadata: {
            condition: logicOutput.condition,
            result: logicOutput.result,
            path: logicOutput.path
          }
        };
      }

      // Delay result format
      if (nodeResult.type === 'delay_result') {
        return {
          content: `Delay completed (${nodeResult.duration || 'unknown'}ms)`,
          type: 'delay_status',
          isError: false,
          metadata: {
            duration: nodeResult.duration,
            dataPassedThrough: nodeResult.value !== undefined
          }
        };
      }

      // Trigger result format
      if (nodeResult.type === 'trigger_status' || nodeResult.trigger_type) {
        // 🚀 NEW: Handle Airtable data in trigger results
        let content = nodeResult.output || nodeResult.message || 'Trigger activated';
        let metadata = {
          triggerType: nodeResult.trigger_type,
          serviceName: nodeResult.service_name
        };
        
        // Extract Airtable data if present
        if (nodeResult.service_name === 'Airtable' || 
            (nodeResult.output && typeof nodeResult.output === 'object' && 
             (nodeResult.output.api_data || nodeResult.output.records))) {
          console.log('🔧 Detected Airtable data in trigger, extracting...');
          const extractedData = extractAirtableData(nodeResult.output || nodeResult);
          
          if (extractedData.textSummary) {
            content = `📊 Airtable Data Retrieved (${extractedData.totalRecords} records):\n\n${extractedData.textSummary}`;
            metadata.airtableData = extractedData;
            metadata.extractedFields = extractedData.fields;
          }
        }
        
        return {
          content: content,
          type: 'trigger_status',
          isError: false,
          metadata: metadata
        };
      }

      // Input result format
      if (nodeResult.type === 'input_result' || nodeResult.input_type) {
        return {
          content: nodeResult.value || nodeResult.extracted_text || 'Input provided',
          type: 'input_text',
          isError: false,
          metadata: {
            inputType: nodeResult.input_type,
            label: nodeResult.label
          }
        };
      }

      // Universal API result format
      if (nodeResult.type === 'universal_api_result') {
        return {
          content: nodeResult.response || nodeResult.data || 'API call completed',
          type: 'api_response',
          isError: !nodeResult.success,
          metadata: {
            service: nodeResult.service_detected,
            protocol: nodeResult.protocol,
            ...nodeResult.metadata
          }
        };
      }

      // Error format
      if (nodeResult.type === 'error' || nodeResult.error) {
        return {
          content: nodeResult.error || nodeResult.message || 'Error occurred',
          type: 'error',
          isError: true,
          metadata: nodeResult.metadata || {}
        };
      }

      // Generic object - try to extract meaningful content
      const content = nodeResult.output || 
                     nodeResult.result || 
                     nodeResult.text_output ||
                     nodeResult.data ||
                     nodeResult.value ||
                     nodeResult.message ||
                     JSON.stringify(nodeResult, null, 2);

      return {
        content: content,
        type: determineContentType(content),
        isError: false,
        metadata: nodeResult.metadata || {}
      };
    }

    // Handle string results
    if (typeof nodeResult === 'string') {
      return {
        content: nodeResult,
        type: 'text',
        isError: false,
        metadata: {}
      };
    }

    // Handle other types (numbers, booleans, etc.)
    return {
      content: String(nodeResult),
      type: 'text',
      isError: false,
      metadata: {}
    };

  } catch (error) {
    console.error('Error extracting node content:', error);
    return {
      content: `Error extracting content: ${error.message}`,
      type: 'error',
      isError: true,
      metadata: {}
    };
  }
};

/**
 * 🔧 NEW: Generate rich content information for display
 * Provides summary information about the content for UI components
 */
export const generateContentInfo = (extractedContent) => {
  if (!extractedContent || !extractedContent.content) {
    return {
      lines: 0,
      keys: 0,
      type: 'empty',
      size: 0,
      hasError: extractedContent?.error ? true : false
    };
  }

  const { content } = extractedContent;
  
  try {
    // Handle string content
    if (typeof content === 'string') {
      return {
        lines: content.split('\n').length,
        keys: 0,
        type: 'text',
        size: content.length,
        hasError: false
      };
    }
    
    // Handle object content
    if (typeof content === 'object' && content !== null) {
      const keys = Array.isArray(content) ? content.length : Object.keys(content).length;
      const jsonString = JSON.stringify(content, null, 2);
      const lines = jsonString.split('\n').length;
      
      return {
        lines: lines,
        keys: keys,
        type: Array.isArray(content) ? 'array' : 'object',
        size: jsonString.length,
        hasError: false
      };
    }
    
    // Handle other types
    return {
      lines: 1,
      keys: 0,
      type: typeof content,
      size: String(content).length,
      hasError: false
    };
    
  } catch (error) {
    return {
      lines: 0,
      keys: 0,
      type: 'error',
      size: 0,
      hasError: true
    };
  }
}; 