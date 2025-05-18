import { useState, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { executeFlow } from '../api';

// Get API URL from environment or use default
const API_URL = window.REACT_APP_API_URL || 'http://localhost:8000';

export const useFlowExecution = ({ nodes, edges, inputs }) => {
  const { addNotification } = useNotifications();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [textLogs, setTextLogs] = useState([]);
  const [structuredLogs, setStructuredLogs] = useState([]);
  const [executionState, setExecutionState] = useState({});
  
  // Helper function to clean node data for execution
  const cleanDataForFlow = useCallback((obj) => {
    const seen = new WeakSet();
    
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      // Skip React-specific properties
      if (key.startsWith('_') || key.startsWith('__react')) {
        return undefined;
      }
      
      // Handle DOM elements and React components
      if (value instanceof Element || (value && value.$$typeof)) {
        return undefined;
      }
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined;
        }
        seen.add(value);
      }
      
      return value;
    }));
  }, []);

  // Create node and connection maps for logging
  const createNodeMaps = useCallback(() => {
    // Map nodes to their details
    const nodeMap = nodes.reduce((acc, node) => {
      acc[node.id] = {
        id: node.id,
        type: node.type,
        label: node.data?.label || node.id,
        data: node.data
      };
      return acc;
    }, {});
    
    // Create connections map
    const connectionsMap = {};
    edges.forEach(edge => {
      if (!connectionsMap[edge.source]) {
        connectionsMap[edge.source] = [];
      }
      connectionsMap[edge.source].push(edge.target);
    });
    
    return { nodeMap, connectionsMap };
  }, [nodes, edges]);

  // Run the flow
  const runCrew = useCallback(async () => {
    try {
      setIsExecuting(true);
      setStructuredLogs([]);
      setTextLogs([]); // Clear text logs when starting execution
      
      // Clean the nodes and edges data
      const cleanedNodes = nodes.map(node => cleanDataForFlow({
        ...node,
        data: {
          ...node.data,
          onEdit: undefined,
          onDelete: undefined,
          onValueChange: undefined,
          ref: undefined,
          component: undefined
        }
      }));
      
      const cleanedEdges = edges.map(edge => cleanDataForFlow(edge));
      
      // Log starting execution
      addNotification({
        message: 'Starting flow execution',
        type: 'info'
      });
      
      // Create node and connection maps for logging
      const { nodeMap, connectionsMap } = createNodeMaps();
      
      // Add to text logs
      setTextLogs(prev => [...prev, 
        `🚀 Starting flow execution at ${new Date().toLocaleTimeString()}`,
        `📊 Flow contains ${nodes.length} nodes and ${edges.length} connections`
      ]);
      
      // Log each node
      nodes.forEach(node => {
        const nodeInfo = {
          'agent': { emoji: '🧠', description: 'AI Agent' },
          'task': { emoji: '📋', description: 'Task' },
          'input': { emoji: '📥', description: 'Input Node' },
          'output': { emoji: '📤', description: 'Output Node' },
          'tool': { emoji: '🔧', description: 'Tool' },
          'logic': { emoji: '🔀', description: 'Logic Node' },
          'trigger': { emoji: '⚡', description: 'Trigger' },
          'delay': { emoji: '⏱️', description: 'Delay Node' },
          'chatbot': { emoji: '💬', description: 'Chat Node' }
        }[node.type] || { emoji: '📦', description: 'Node' };
        
        setTextLogs(prev => [...prev, 
          `${nodeInfo.emoji} Found ${nodeInfo.description}: "${node.data?.label || node.id}" [ID: ${node.id}]`,
          `   ↳ Type: ${node.type}`,
          `   ↳ Connections: ${connectionsMap[node.id]?.length || 0} outgoing`
        ]);
      });
      
      setStructuredLogs(prev => [...prev, {
        type: 'info',
        status: 'started',
        message: 'Starting flow execution',
        timestamp: new Date().toISOString()
      }]);

      // Execute the flow using the API
      try {
        const result = await executeFlow(cleanedNodes, cleanedEdges, inputs);
        
        console.log('Flow execution result:', result);
        
        // Process raw logs into structured format with more details
        let newStructuredLogs = [];
        
        // Start with a flow execution started log
        newStructuredLogs.push({
          type: 'flow_started',
          message: 'Flow execution started',
          timestamp: new Date().toISOString(),
          nodeCount: nodes.length,
          edgeCount: edges.length
        });
        
        // Add a log for each node found
        nodes.forEach(node => {
          newStructuredLogs.push({
            type: 'node_found',
            nodeId: node.id,
            nodeType: node.type,
            nodeName: node.data?.label || node.id,
            connections: connectionsMap[node.id] || [],
            timestamp: new Date().toISOString()
          });
        });
        
        // Process logs from the API result
        if (result.logs && Array.isArray(result.logs)) {
          result.logs.forEach(logEntry => {
            if (typeof logEntry === 'string') {
              // Handle string logs
              newStructuredLogs.push({
                type: 'log_message',
                message: logEntry,
                timestamp: new Date().toISOString()
              });
            } else if (logEntry && typeof logEntry === 'object') {
              // Add log entry directly to structured logs
              newStructuredLogs.push({
                ...logEntry,
                timestamp: logEntry.timestamp || new Date().toISOString()
              });
            }
          });
        }
        
        // Update structured logs state
        setStructuredLogs(prev => [...prev, ...newStructuredLogs]);
        
        // Process and display results
        setExecutionState(result.state || {});
        
        // Update node data with results for visualization
        if (result.node_results && typeof result.node_results === 'object') {
          const nodeUpdates = [];
          
          Object.entries(result.node_results).forEach(([nodeId, nodeResult]) => {
            // Find the node in the current nodes array
            const node = nodes.find(n => n.id === nodeId);
            
            if (node) {
              // Create an update object for the node
              const updatedNode = {
                ...node,
                data: {
                  ...node.data,
                  // Add execution results to the node data
                  result: {
                    type: nodeResult.nodeType || node.type,
                    status: nodeResult.status || 'completed',
                    data: nodeResult.result || nodeResult.output || 'Node executed successfully',
                    timestamp: nodeResult.timestamp || new Date().toISOString()
                  }
                }
              };
              
              // Apply the update
              nodeUpdates.push({
                id: nodeId,
                type: 'replace',
                item: updatedNode
              });
            }
          });
          
          // If we have node updates, apply them
          if (nodeUpdates.length > 0) {
            console.log('Updating nodes with execution results:', nodeUpdates);
            
            // We can't update nodes directly, so create a custom event
            const event = new CustomEvent('update-node-results', {
              detail: { updates: nodeUpdates }
            });
            document.dispatchEvent(event);
          }
        }
        
        // Count processed nodes
        const processedNodeCount = Object.keys(result.node_results || {}).length;
        
        // Add completion to text logs
        setTextLogs(prev => [...prev, 
          `✅ Flow execution completed at ${new Date().toLocaleTimeString()}`,
          `📊 Summary: ${processedNodeCount} nodes processed successfully`
        ]);
        
        addNotification({
          message: `Flow execution completed with ${processedNodeCount} nodes processed`,
          type: 'success'
        });
        
        return result;
      } catch (error) {
        console.error("Error processing flow execution result:", error);
        
        // Add error to structured logs
        setStructuredLogs(prev => [
          ...prev, 
          {
            type: 'error',
            message: `Error processing flow result: ${error.message}`,
            timestamp: new Date().toISOString()
          }
        ]);
        
        // Add error to text logs
        setTextLogs(prev => [...prev, `❌ Error: ${error.message}`]);
        
        addNotification({
          message: `Error executing flow: ${error.message}`,
          type: 'error'
        });
        
        throw error;
      } finally {
        setIsExecuting(false);
      }
    } catch (error) {
      console.error('Error executing flow:', error);
      setStructuredLogs(prev => [...prev, {
        type: 'error',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
      
      // Add error to text logs
      setTextLogs(prev => [...prev, `❌ Error executing flow: ${error.message}`]);
      
      addNotification({
        message: `Error executing flow: ${error.message}`,
        type: 'error'
      });
      
      setIsExecuting(false);
      return null;
    }
  }, [nodes, edges, inputs, cleanDataForFlow, addNotification, createNodeMaps]);

  // Validate the flow
  const validateFlow = useCallback(() => {
    const issues = [];
    
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
      return !hasConnections && node.type !== 'trigger'; // Triggers can be isolated
    });
    
    if (isolatedNodes.length > 0) {
      issues.push({
        type: 'warning',
        message: `${isolatedNodes.length} node(s) are not connected to the flow`,
        nodes: isolatedNodes
      });
    }
    
    // Check for missing required inputs
    const inputNodes = nodes.filter(node => node.type === 'input');
    const missingRequiredInputs = inputNodes.filter(node => {
      return node.data?.isRequired && 
             (!inputs[node.data.variableName] || inputs[node.data.variableName] === '');
    });
    
    if (missingRequiredInputs.length > 0) {
      issues.push({
        type: 'error',
        message: `${missingRequiredInputs.length} required input(s) are missing values`,
        nodes: missingRequiredInputs
      });
    }
    
    return issues;
  }, [nodes, edges, inputs]);

  return {
    isExecuting,
    textLogs,
    structuredLogs,
    executionState,
    runCrew,
    validateFlow
  };
}; 