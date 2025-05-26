import { useState, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

// Get API URL from environment or use default
const API_URL = window.REACT_APP_API_URL || 'http://localhost:8000';

export const useFlowExecution = ({ nodes, edges, inputs }) => {
  const { addNotification } = useNotifications();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [textLogs, setTextLogs] = useState([]);
  const [structuredLogs, setStructuredLogs] = useState([]);
  const [executionState, setExecutionState] = useState({});
  
  // Enhanced helper function to clean node data and handle circular references
  const cleanDataForFlow = useCallback((obj, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[Max Depth Reached]';
    }
    
    // Handle null/undefined
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Handle primitives
    if (typeof obj !== 'object') {
      return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => cleanDataForFlow(item, depth + 1));
    }
    
    // Handle DOM elements
    if (obj instanceof Element || obj instanceof Node) {
      return `[DOM Element: ${obj.tagName || obj.nodeName}]`;
    }
    
    // Handle React elements and components
    if (obj.$$typeof || obj._owner || obj._store) {
      return '[React Element]';
    }
    
    // Handle functions
    if (typeof obj === 'function') {
      return `[Function: ${obj.name || 'anonymous'}]`;
    }
    
    // Create a new object and copy safe properties
    const cleaned = {};
    const seenObjects = new WeakSet();
    
    try {
      for (const key in obj) {
        // Skip React-specific properties and private properties
        if (
          key.startsWith('_') || 
          key.startsWith('__react') ||
          key.startsWith('__webpack') ||
          key === '$$typeof' ||
          key === '_owner' ||
          key === '_store' ||
          key === 'ref' ||
          key === 'key'
        ) {
          continue;
        }
        
        try {
          const value = obj[key];
          
          // Handle functions
          if (typeof value === 'function') {
            cleaned[key] = `[Function: ${value.name || 'anonymous'}]`;
            continue;
          }
          
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (seenObjects.has(value)) {
              cleaned[key] = '[Circular Reference]';
              continue;
            }
            seenObjects.add(value);
          }
          
          // Recursively clean the value
          cleaned[key] = cleanDataForFlow(value, depth + 1);
        } catch (error) {
          cleaned[key] = `[Error accessing property: ${error.message}]`;
        }
      }
    } catch (error) {
      return `[Error processing object: ${error.message}]`;
    }
    
    return cleaned;
  }, []);

  // Enhanced function to extract node name with multiple fallbacks
  const extractNodeName = useCallback((node, logEntry) => {
    // Try multiple sources for node name
    const possibleNames = [
      logEntry?.node_name,
      logEntry?.nodeName,
      logEntry?.node_label,
      logEntry?.nodeLabel,
      logEntry?.label,
      node?.data?.label,
      node?.data?.name,
      node?.data?.title,
      node?.label,
      node?.name,
      node?.title
    ];
    
    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim()) {
        return name.trim();
      }
    }
    
    // Fallback to node type + ID
    const nodeType = logEntry?.node_type || logEntry?.nodeType || node?.type || 'Node';
    const nodeId = logEntry?.node_id || logEntry?.nodeId || node?.id || 'unknown';
    
    return `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${nodeId}`;
  }, []);

  // Enhanced function to extract node type
  const extractNodeType = useCallback((node, logEntry) => {
    return logEntry?.node_type || 
           logEntry?.nodeType || 
           logEntry?.type || 
           node?.type || 
           'unknown';
  }, []);

  // Enhanced helper function to get node emoji
  const getNodeEmoji = useCallback((nodeType) => {
    const emojiMap = {
      'agent': '🧠',
      'task': '📋',
      'input': '📥',
      'output': '📤',
      'tool': '🔧',
      'logic': '🔀',
      'trigger': '⚡',
      'delay': '⏱️',
      'chatbot': '💬',
      'api': '🌐',
      'database': '🗄️',
      'email': '📧',
      'webhook': '🔗',
      'condition': '🤔',
      'loop': '🔄',
      'transform': '🔄',
      'filter': '🔍'
    };
    return emojiMap[nodeType?.toLowerCase()] || '📦';
  }, []);

  // Enhanced helper function to generate text logs
  const generateTextLog = useCallback((logEntry) => {
    try {
      const emoji = getNodeEmoji(logEntry.node_type);
      const status = logEntry.status === 'error' ? '❌' : 
                    logEntry.status === 'completed' ? '✅' : 
                    logEntry.status === 'running' ? '⏳' : '📝';
      
      const nodeName = logEntry.node_name || 'Unknown Node';
      const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
      
      if (logEntry.type === 'error' || logEntry.status === 'error') {
        return `${status} ${emoji} ${nodeName}: Error - ${logEntry.error || logEntry.message || 'Unknown error'}`;
      } else if (logEntry.result) {
        const resultText = formatResult(logEntry.result);
        return `${status} ${emoji} ${nodeName}: ${resultText}`;
      } else if (logEntry.message) {
        return `${status} ${emoji} ${nodeName}: ${logEntry.message}`;
      } else {
        return `${status} ${emoji} ${nodeName}: Processing completed`;
      }
    } catch (error) {
      console.warn('Error generating text log:', error);
      return `📝 ${logEntry.node_name || 'Unknown'}: Log entry processed`;
    }
  }, [getNodeEmoji]);

  // Helper function to format results safely
  const formatResult = useCallback((result) => {
    try {
      if (typeof result === 'string') {
        return result.length > 100 ? `${result.substring(0, 100)}...` : result;
      } else if (typeof result === 'object' && result !== null) {
        if (result.output) {
          return typeof result.output === 'string' ? 
                 (result.output.length > 100 ? `${result.output.substring(0, 100)}...` : result.output) :
                 'Output generated';
        } else if (result.data) {
          return 'Data processed';
        } else {
          return 'Result generated';
        }
      } else {
        return 'Completed successfully';
      }
    } catch (error) {
      return 'Result processed';
    }
  }, []);

  // Create enhanced node and connection maps for logging
  const createNodeMaps = useCallback(() => {
    // Map nodes to their details with better error handling
    const nodeMap = nodes.reduce((acc, node) => {
      try {
        acc[node.id] = {
          id: node.id,
          type: node.type || 'unknown',
          label: extractNodeName(node, null),
          data: cleanDataForFlow(node.data || {})
        };
      } catch (error) {
        console.warn(`Error processing node ${node.id}:`, error);
        acc[node.id] = {
          id: node.id,
          type: 'unknown',
          label: `Node ${node.id}`,
          data: {}
        };
      }
      return acc;
    }, {});
    
    // Create connections map with error handling
    const connectionsMap = {};
    edges.forEach(edge => {
      try {
        if (!connectionsMap[edge.source]) {
          connectionsMap[edge.source] = [];
        }
        connectionsMap[edge.source].push(edge.target);
      } catch (error) {
        console.warn('Error processing edge:', edge, error);
      }
    });
    
    return { nodeMap, connectionsMap };
  }, [nodes, edges, cleanDataForFlow, extractNodeName]);

  // Enhanced function to safely process log entries
  const processLogEntry = useCallback((logEntry, nodeMap) => {
    try {
      const nodeId = logEntry.node_id || logEntry.nodeId;
      const node = nodeId ? nodeMap[nodeId] : null;
      
      // Extract comprehensive node information
      const enhancedLogEntry = {
        ...logEntry,
        timestamp: logEntry.metadata?.timestamp || 
                  logEntry.timestamp || 
                  new Date().toISOString(),
        node_id: nodeId,
        node_name: extractNodeName(node, logEntry),
        node_type: extractNodeType(node, logEntry),
        node_label: extractNodeName(node, logEntry), // For backward compatibility
        // Safely clean the result data
        result: logEntry.result ? cleanDataForFlow(logEntry.result) : logEntry.result,
        // Add status information
        status: logEntry.metadata?.has_error ? 'error' : 
                logEntry.status || 
                (logEntry.error ? 'error' : 'completed'),
        // Clean error information
        error: logEntry.error ? cleanDataForFlow(logEntry.error) : logEntry.error
      };
      
      return enhancedLogEntry;
    } catch (error) {
      console.warn('Error processing log entry:', error);
      return {
        ...logEntry,
        timestamp: new Date().toISOString(),
        node_name: 'Unknown Node',
        node_type: 'unknown',
        status: 'error',
        error: `Error processing log: ${error.message}`
      };
    }
  }, [cleanDataForFlow, extractNodeName, extractNodeType]);

  // Run the flow with enhanced error handling and real-time streaming
  const runCrew = useCallback(async () => {
    try {
      setIsExecuting(true);
      setStructuredLogs([]);
      setTextLogs([]);
      
      // Create node and connection maps for logging
      const { nodeMap, connectionsMap } = createNodeMaps();
      
      // Enhanced node cleaning with better error handling
      const cleanedNodes = nodes.map(node => {
        try {
          return cleanDataForFlow({
            ...node,
            data: {
              ...node.data,
              // Remove all function references and React-specific properties
              onEdit: undefined,
              onDelete: undefined,
              onValueChange: undefined,
              onChange: undefined,
              onClick: undefined,
              ref: undefined,
              component: undefined,
              // Keep essential data
              label: node.data?.label || node.label || `Node ${node.id}`,
              type: node.type,
              id: node.id
            }
          });
        } catch (error) {
          console.warn(`Error cleaning node ${node.id}:`, error);
          return {
            id: node.id,
            type: node.type || 'unknown',
            data: {
              label: `Node ${node.id}`,
              type: node.type || 'unknown'
            }
          };
        }
      });
      
      const cleanedEdges = edges.map(edge => cleanDataForFlow(edge));
      
      // Log starting execution with enhanced information
      addNotification({
        message: 'Starting flow execution',
        type: 'info'
      });
      
      const startTime = new Date().toLocaleTimeString();
      setTextLogs(prev => [...prev, 
        `🚀 Starting flow execution at ${startTime}`,
        `📊 Flow contains ${nodes.length} nodes and ${edges.length} connections`,
        '📋 Node Overview:'
      ]);
      
      // Log each node with enhanced information
      nodes.forEach(node => {
        const emoji = getNodeEmoji(node.type);
        const nodeName = extractNodeName(node, null);
        setTextLogs(prev => [...prev, 
          `  ${emoji} ${nodeName} (${node.type || 'unknown'})`
        ]);
      });
      
      setTextLogs(prev => [...prev, '⚡ Starting execution...']);
      
      // Execute the flow using streaming API with enhanced error handling
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 300000); // 5 minute timeout
        
        const response = await fetch(`${API_URL}/run-crew`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            nodes: cleanedNodes,
            edges: cleanedEdges,
            inputs: inputs || {}
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body reader available');
        }
        
        let buffer = '';
        let allLogs = [];
        let nodeResults = {};
        let hasReceivedData = false;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            hasReceivedData = true;
            
            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim()) {
                try {
                  // Parse JSON line
                  const rawLogEntry = JSON.parse(line);
                  console.log('Raw log entry:', rawLogEntry);
                  
                  // Process and enhance the log entry
                  const logEntry = processLogEntry(rawLogEntry, nodeMap);
                  console.log('Processed log entry:', logEntry);
                  
                  allLogs.push(logEntry);
                  
                  // Add to structured logs in real-time
                  setStructuredLogs(prev => [...prev, logEntry]);
                  
                  // Generate enhanced text log
                  const logText = generateTextLog(logEntry);
                  setTextLogs(prev => [...prev, logText]);
                  
                  // Extract and store node results
                  if (logEntry.node_id) {
                    nodeResults[logEntry.node_id] = {
                      nodeId: logEntry.node_id,
                      nodeType: logEntry.node_type,
                      nodeName: logEntry.node_name,
                      result: logEntry.result,
                      status: logEntry.status,
                      timestamp: logEntry.timestamp,
                      error: logEntry.error
                    };
                  }
                } catch (parseError) {
                  console.warn('Failed to parse log line:', line, parseError);
                  // Add as text log if JSON parsing fails
                  setTextLogs(prev => [...prev, `📝 ${line.substring(0, 200)}...`]);
                }
              }
            }
          }
        } catch (readerError) {
          console.error('Error reading stream:', readerError);
          if (readerError.name === 'AbortError') {
            throw new Error('Execution timed out after 5 minutes');
          }
          throw readerError;
        } finally {
          reader.releaseLock();
        }
        
        // Process any remaining buffer content
        if (buffer.trim()) {
          try {
            const rawLogEntry = JSON.parse(buffer);
            const logEntry = processLogEntry(rawLogEntry, nodeMap);
            allLogs.push(logEntry);
            setStructuredLogs(prev => [...prev, logEntry]);
            
            if (logEntry.node_id) {
              nodeResults[logEntry.node_id] = {
                nodeId: logEntry.node_id,
                nodeType: logEntry.node_type,
                nodeName: logEntry.node_name,
                result: logEntry.result,
                status: logEntry.status,
                timestamp: logEntry.timestamp,
                error: logEntry.error
              };
            }
          } catch (parseError) {
            console.warn('Failed to parse remaining buffer:', buffer, parseError);
            setTextLogs(prev => [...prev, `📝 ${buffer.substring(0, 200)}...`]);
          }
        }
        
        // Check if we received any data
        if (!hasReceivedData) {
          throw new Error('No data received from server. The execution may have failed to start.');
        }
        
        // Update execution state
        setExecutionState(nodeResults);
        
        // Count processed nodes
        const processedNodeCount = Object.keys(nodeResults).length;
        const errorCount = Object.values(nodeResults).filter(r => r.status === 'error').length;
        
        // Add completion to text logs
        const endTime = new Date().toLocaleTimeString();
        setTextLogs(prev => [...prev, 
          '',
          `✅ Flow execution completed at ${endTime}`,
          `📊 Summary: ${processedNodeCount} nodes processed`,
          errorCount > 0 ? `❌ Errors: ${errorCount} nodes had errors` : '✨ All nodes completed successfully'
        ]);
        
        addNotification({
          message: `Flow execution completed with ${processedNodeCount} nodes processed${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
          type: errorCount > 0 ? 'warning' : 'success'
        });
        
        return {
          success: true,
          logs: allLogs,
          node_results: nodeResults,
          state: nodeResults
        };
        
      } catch (error) {
        console.error("Error processing flow execution result:", error);
        
        // Add error to structured logs
        setStructuredLogs(prev => [
          ...prev, 
          {
            type: 'error',
            message: `Error processing flow result: ${error.message}`,
            timestamp: new Date().toISOString(),
            error: error.message,
            status: 'error'
          }
        ]);
        
        // Add error to text logs
        setTextLogs(prev => [...prev, `❌ Error: ${error.message}`]);
        
        addNotification({
          message: `Error executing flow: ${error.message}`,
          type: 'error'
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Error executing flow:', error);
      setStructuredLogs(prev => [...prev, {
        type: 'error',
        status: 'error',
        error: error.message,
        message: error.message,
        timestamp: new Date().toISOString()
      }]);
      
      // Add error to text logs
      setTextLogs(prev => [...prev, `❌ Error executing flow: ${error.message}`]);
      
      addNotification({
        message: `Error executing flow: ${error.message}`,
        type: 'error'
      });
      
      return {
        success: false,
        error: error.message,
        logs: [],
        node_results: {},
        state: {}
      };
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, inputs, cleanDataForFlow, addNotification, createNodeMaps, processLogEntry, extractNodeName, getNodeEmoji, generateTextLog, formatResult]);

  // Enhanced validate flow function
  const validateFlow = useCallback(() => {
    const issues = [];
    
    try {
      // Check for empty flow
      if (nodes.length === 0) {
        issues.push({
          type: 'error',
          message: 'Flow is empty. Add nodes to create a workflow.'
        });
        return issues;
      }
      
      // Check for nodes without connections
      const isolatedNodes = nodes.filter(node => {
        const hasConnections = edges.some(edge => 
          edge.source === node.id || edge.target === node.id
        );
        return !hasConnections && node.type !== 'trigger' && node.type !== 'input';
      });
      
      if (isolatedNodes.length > 0) {
        issues.push({
          type: 'warning',
          message: `${isolatedNodes.length} node(s) are not connected to the flow`,
          nodes: isolatedNodes.map(node => ({
            id: node.id,
            name: extractNodeName(node, null),
            type: node.type
          }))
        });
      }
      
      // Check for missing required inputs
      const inputNodes = nodes.filter(node => node.type === 'input');
      const missingRequiredInputs = inputNodes.filter(node => {
        const variableName = node.data?.variableName || node.data?.name || node.id;
        return node.data?.isRequired && 
               (!inputs[variableName] || inputs[variableName] === '');
      });
      
      if (missingRequiredInputs.length > 0) {
        issues.push({
          type: 'error',
          message: `${missingRequiredInputs.length} required input(s) are missing values`,
          nodes: missingRequiredInputs.map(node => ({
            id: node.id,
            name: extractNodeName(node, null),
            type: node.type,
            variableName: node.data?.variableName || node.data?.name || node.id
          }))
        });
      }
      
      // Check for circular dependencies
      const checkCircular = (nodeId, visited = new Set(), path = []) => {
        if (path.includes(nodeId)) {
          return path.slice(path.indexOf(nodeId));
        }
        if (visited.has(nodeId)) {
          return null;
        }
        
        visited.add(nodeId);
        path.push(nodeId);
        
        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          const cycle = checkCircular(edge.target, visited, [...path]);
          if (cycle) {
            return cycle;
          }
        }
        
        return null;
      };
      
      for (const node of nodes) {
        const cycle = checkCircular(node.id);
        if (cycle) {
          issues.push({
            type: 'error',
            message: 'Circular dependency detected in flow',
            cycle: cycle.map(nodeId => {
              const node = nodes.find(n => n.id === nodeId);
              return {
                id: nodeId,
                name: extractNodeName(node, null)
              };
            })
          });
          break;
        }
      }
      
    } catch (error) {
      console.error('Error validating flow:', error);
      issues.push({
        type: 'error',
        message: `Error validating flow: ${error.message}`
      });
    }
    
    return issues;
  }, [nodes, edges, inputs, extractNodeName]);

  return {
    isExecuting,
    textLogs,
    structuredLogs,
    executionState,
    runCrew,
    validateFlow,
    // Additional utility functions
    cleanDataForFlow,
    extractNodeName,
    getNodeEmoji
  };
};