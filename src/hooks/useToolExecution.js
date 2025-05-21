import { useState, useCallback } from 'react';

// Custom hook for executing tools created by Smart Tool Selector
export const useToolExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const executeToolService = useCallback(async (toolNode, runtimeInputs = {}) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // Extract execution configuration from the tool node
      const executionConfig = toolNode.data.executionConfig;
      if (!executionConfig) {
        throw new Error('Tool node missing execution configuration');
      }
      
      // Execute using the enhanced endpoint
      const response = await fetch('/api/tools/services/execute/smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          execution_config: executionConfig,
          runtime_inputs: runtimeInputs
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Tool execution failed');
      }
      
      setLastResult(result);
      return result;
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const validateToolConfig = useCallback(async (toolNode) => {
    try {
      const executionConfig = toolNode.data.executionConfig;
      if (!executionConfig) {
        return { valid: false, errors: ['Missing execution configuration'] };
      }
      
      const response = await fetch('/api/tools/services/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: executionConfig.category,
          service: executionConfig.service,
          config: executionConfig.config
        })
      });
      
      const result = await response.json();
      return result.success ? result.data : { valid: false, errors: [result.error?.message || 'Validation failed'] };
      
    } catch (err) {
      return { valid: false, errors: [err.message] };
    }
  }, []);

  return {
    executeToolService,
    validateToolConfig,
    isExecuting,
    lastResult,
    error,
    clearError: () => setError(null)
  };
};

// Hook for managing tool configurations and Smart Tool Selector
export const useSmartToolSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTools, setAvailableTools] = useState([]);

  const openSelector = useCallback(() => setIsOpen(true), []);
  const closeSelector = useCallback(() => setIsOpen(false), []);

  const addTool = useCallback((toolNode) => {
    setAvailableTools(prev => [...prev, toolNode]);
    setIsOpen(false);
  }, []);

  const removeTool = useCallback((toolId) => {
    setAvailableTools(prev => prev.filter(tool => tool.id !== toolId));
  }, []);

  const updateTool = useCallback((toolId, updates) => {
    setAvailableTools(prev => 
      prev.map(tool => 
        tool.id === toolId 
          ? { ...tool, ...updates }
          : tool
      )
    );
  }, []);

  return {
    isOpen,
    availableTools,
    openSelector,
    closeSelector,
    addTool,
    removeTool,
    updateTool
  };
};

// Default export
export default useToolExecution;