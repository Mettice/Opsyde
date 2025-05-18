import { useState, useCallback } from 'react';
import { runFlow } from '../utils/flowExecutionEngine';
import { nodeExecutors } from '../utils/nodeExecutors';
import { useFlow } from '../contexts/FlowContext';

export function useFlowExecution() {
  const { nodes, edges, inputs } = useFlow();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [textLogs, setTextLogs] = useState('');
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

  // Run the flow
  const runCrew = useCallback(async () => {
    try {
      setIsExecuting(true);
      setStructuredLogs([]);
      
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

      // Execute the flow
      const result = await runFlow(
        cleanedNodes,
        cleanedEdges,
        inputs,
        nodeExecutors,
        (node) => {
          setStructuredLogs(prev => [...prev, {
            nodeId: node.id,
            nodeName: node.data?.label || node.id,
            type: node.type,
            status: 'started',
            timestamp: new Date().toISOString()
          }]);
        },
        (node, result) => {
          setStructuredLogs(prev => [...prev, {
            nodeId: node.id,
            nodeName: node.data?.label || node.id,
            type: node.type,
            status: 'completed',
            result: cleanDataForFlow(result),
            timestamp: new Date().toISOString()
          }]);
        }
      );

      console.log('Flow execution completed:', result);
      setExecutionState(result.state);
      setStructuredLogs(prev => [...prev, ...result.logs]);
      
    } catch (error) {
      console.error('Error executing flow:', error);
      setStructuredLogs(prev => [...prev, {
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, inputs, cleanDataForFlow, nodeExecutors]);

  // Validate the flow
  const validateFlow = useCallback(() => {
    const issues = [];
    
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
    
    // More validation checks can be added here
    
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
}