import { useState, useCallback, useRef } from 'react';

/**
 * Smart Mapping Hook - Integrates with backend Smart Mapping System
 * Provides intelligent input mapping, debugging, and performance monitoring
 */
export const useSmartMapping = () => {
  const [mappingResults, setMappingResults] = useState({});
  const [mappingErrors, setMappingErrors] = useState({});
  const [mappingStats, setMappingStats] = useState({
    totalMappings: 0,
    successfulMappings: 0,
    averageConfidence: 0,
    averageExecutionTime: 0
  });
  const [debugMode, setDebugMode] = useState(false);
  const mappingCache = useRef(new Map());

  /**
   * Smart map inputs for a single node
   */
  const mapNodeInputs = useCallback(async (node, executionContext, previousOutputs = {}) => {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      if (!node?.id || !node?.type) {
        throw new Error('Invalid node structure: missing id or type');
      }

      // Check cache first (optional optimization)
      const cacheKey = `${node.id}-${JSON.stringify(executionContext)}-${JSON.stringify(previousOutputs)}`;
      if (mappingCache.current.has(cacheKey)) {
        const cached = mappingCache.current.get(cacheKey);
        if (debugMode) {
          console.log(`🚀 Smart Mapping Cache Hit for ${node.id}:`, cached);
        }
        return cached.mappedInputs;
      }

      // Call backend smart mapping with retry logic for 404s
      let response;
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          response = await fetch('/api/smart-mapping/map-inputs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              node,
              context: executionContext,
              previous_outputs: previousOutputs
            })
          });
          
          // If we get a 404 and it's not the last attempt, wait and retry
          if (response.status === 404 && attempt < maxAttempts - 1) {
            if (debugMode) {
              console.log(`🔄 Smart mapping endpoint not ready (attempt ${attempt + 1}/${maxAttempts}), retrying in 1s...`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempt++;
            continue;
          }
          
          break; // Exit retry loop if we get any other status or it's the last attempt
        } catch (error) {
          if (attempt === maxAttempts - 1) {
            throw error; // Re-throw on last attempt
          }
          attempt++;
          if (debugMode) {
            console.log(`🔄 Smart mapping request failed (attempt ${attempt}/${maxAttempts}), retrying...`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      if (!response.ok) {
        throw new Error(`Smart mapping failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Cache the result
      mappingCache.current.set(cacheKey, {
        mappedInputs: result.mapped_inputs,
        metadata: result.metadata,
        timestamp: Date.now()
      });

      // Update results state
      setMappingResults(prev => ({
        ...prev,
        [node.id]: {
          mappedInputs: result.mapped_inputs,
          confidence: result.metadata?.average_confidence || 0,
          executionTime,
          timestamp: Date.now(),
          source: 'smart_mapping'
        }
      }));

      // Update statistics
      setMappingStats(prev => {
        const newTotal = prev.totalMappings + 1;
        const newSuccessful = prev.successfulMappings + 1;
        
        return {
          totalMappings: newTotal,
          successfulMappings: newSuccessful,
          averageConfidence: (prev.averageConfidence * prev.totalMappings + (result.metadata?.average_confidence || 0)) / newTotal,
          averageExecutionTime: (prev.averageExecutionTime * prev.totalMappings + executionTime) / newTotal
        };
      });

      // Clear any previous errors for this node
      setMappingErrors(prev => {
        const updated = { ...prev };
        delete updated[node.id];
        return updated;
      });

      if (debugMode) {
        console.log(`🧠 Smart Mapping Success for ${node.id}:`, {
          node: node.type,
          inputsFound: Object.keys(result.mapped_inputs || {}).length,
          confidence: result.metadata?.average_confidence,
          executionTime: `${executionTime.toFixed(2)}ms`
        });
      }

      return result.mapped_inputs || {};

    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Store error
      setMappingErrors(prev => ({
        ...prev,
        [node.id]: {
          error: error.message,
          timestamp: Date.now(),
          executionTime
        }
      }));

      // Update statistics (failed mapping)
      setMappingStats(prev => ({
        ...prev,
        totalMappings: prev.totalMappings + 1,
        averageExecutionTime: (prev.averageExecutionTime * prev.totalMappings + executionTime) / (prev.totalMappings + 1)
      }));

      if (debugMode) {
        console.error(`❌ Smart Mapping Failed for ${node.id}:`, error);
      }

      // Return empty object on failure (graceful degradation)
      return {};
    }
  }, [debugMode]);

  /**
   * Smart map inputs for multiple nodes in batch
   */
  const mapMultipleNodes = useCallback(async (nodes, executionContext, nodeOutputs = {}) => {
    const results = {};
    
    // Process nodes in parallel for better performance
    const mappingPromises = nodes.map(async (node) => {
      const previousOutputs = Object.keys(nodeOutputs)
        .filter(key => key !== node.id) // Don't include self
        .reduce((acc, key) => {
          acc[key] = nodeOutputs[key];
          return acc;
        }, {});

      const mappedInputs = await mapNodeInputs(node, executionContext, previousOutputs);
      return { nodeId: node.id, mappedInputs };
    });

    try {
      const mappingResults = await Promise.all(mappingPromises);
      mappingResults.forEach(({ nodeId, mappedInputs }) => {
        results[nodeId] = mappedInputs;
      });
    } catch (error) {
      console.error('Batch smart mapping failed:', error);
    }

    return results;
  }, [mapNodeInputs]);

  /**
   * Get mapping debug information
   */
  const getMappingDebugInfo = useCallback((nodeId) => {
    const result = mappingResults[nodeId];
    const error = mappingErrors[nodeId];
    
    if (error) {
      return {
        status: 'error',
        error: error.error,
        timestamp: error.timestamp,
        executionTime: error.executionTime
      };
    }
    
    if (result) {
      return {
        status: 'success',
        inputsCount: Object.keys(result.mappedInputs || {}).length,
        confidence: result.confidence,
        executionTime: result.executionTime,
        timestamp: result.timestamp,
        inputs: result.mappedInputs
      };
    }
    
    return {
      status: 'not_mapped',
      message: 'Node has not been processed yet'
    };
  }, [mappingResults, mappingErrors]);

  /**
   * Clear mapping cache
   */
  const clearMappingCache = useCallback(() => {
    mappingCache.current.clear();
    setMappingResults({});
    setMappingErrors({});
    if (debugMode) {
      console.log('🧹 Smart Mapping cache cleared');
    }
  }, [debugMode]);

  /**
   * Get overall mapping performance metrics
   */
  const getPerformanceMetrics = useCallback(() => {
    const successRate = mappingStats.totalMappings > 0 
      ? (mappingStats.successfulMappings / mappingStats.totalMappings) * 100 
      : 0;

    return {
      ...mappingStats,
      successRate,
      cacheSize: mappingCache.current.size,
      errorCount: Object.keys(mappingErrors).length
    };
  }, [mappingStats, mappingErrors]);

  /**
   * Enable/disable debug mode
   */
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);

  /**
   * Integration with existing useFlowExecution hook
   */
  const enhanceFlowExecution = useCallback((originalExecuteNode) => {
    return async (node, inputs, context) => {
      // First, try smart mapping
      const smartMappedInputs = await mapNodeInputs(node, context, inputs);
      
      // Merge smart mapped inputs with provided inputs (provided inputs take precedence)
      const enhancedInputs = {
        ...smartMappedInputs,
        ...inputs
      };

      if (debugMode && Object.keys(smartMappedInputs).length > 0) {
        console.log(`🔧 Enhanced inputs for ${node.id}:`, {
          original: Object.keys(inputs || {}),
          smartMapped: Object.keys(smartMappedInputs),
          final: Object.keys(enhancedInputs)
        });
      }

      // Execute node with enhanced inputs
      return await originalExecuteNode(node, enhancedInputs, context);
    };
  }, [mapNodeInputs, debugMode]);

  return {
    // Core mapping functions
    mapNodeInputs,
    mapMultipleNodes,
    
    // State and results
    mappingResults,
    mappingErrors,
    mappingStats,
    
    // Debug and monitoring
    debugMode,
    toggleDebugMode,
    getMappingDebugInfo,
    getPerformanceMetrics,
    
    // Utilities
    clearMappingCache,
    enhanceFlowExecution
  };
};

/**
 * Hook for Smart Mapping debugging in development
 */
export const useSmartMappingDebugger = () => {
  const [debugLogs, setDebugLogs] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  const addDebugLog = useCallback((nodeId, action, data) => {
    if (!isRecording) return;
    
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      nodeId,
      action, // 'mapping_start', 'mapping_success', 'mapping_error', 'cache_hit'
      data
    };
    
    setDebugLogs(prev => [...prev.slice(-99), logEntry]); // Keep last 100 logs
  }, [isRecording]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setDebugLogs([]);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const exportLogs = useCallback(() => {
    const dataStr = JSON.stringify(debugLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart-mapping-debug-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [debugLogs]);

  return {
    debugLogs,
    isRecording,
    startRecording,
    stopRecording,
    addDebugLog,
    exportLogs,
    clearLogs: () => setDebugLogs([])
  };
}; 