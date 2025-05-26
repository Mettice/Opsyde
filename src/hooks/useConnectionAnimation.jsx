import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Enhanced connection animation hook with performance metrics and throughput tracking
 */
export const useConnectionAnimation = (edges, setEdges) => {
  const [activeConnections, setActiveConnections] = useState(new Set());
  const [connectionStates, setConnectionStates] = useState(new Map());
  const [performanceMetrics, setPerformanceMetrics] = useState(new Map());
  const timeoutsRef = useRef(new Map());

  // Enhanced connection state update with performance tracking
  const updateConnectionState = useCallback((edgeId, state, options = {}) => {
    const { 
      duration = 0, 
      throughput = 0, 
      dataSize = 0, 
      errorRate = 0,
      latency = 0,
      dataPreview = null 
    } = options;

    setConnectionStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(edgeId) || {};
      
      newStates.set(edgeId, {
        ...currentState,
        state,
        timestamp: Date.now(),
        throughput,
        dataSize,
        errorRate,
        latency,
        dataPreview
      });
      
      return newStates;
    });

    // Update performance metrics
    if (throughput > 0 || dataSize > 0) {
      setPerformanceMetrics(prev => {
        const newMetrics = new Map(prev);
        const currentMetrics = newMetrics.get(edgeId) || {
          totalDataTransferred: 0,
          averageThroughput: 0,
          peakThroughput: 0,
          totalTransactions: 0,
          averageLatency: 0,
          errorCount: 0
        };

        newMetrics.set(edgeId, {
          totalDataTransferred: currentMetrics.totalDataTransferred + dataSize,
          averageThroughput: (currentMetrics.averageThroughput + throughput) / 2,
          peakThroughput: Math.max(currentMetrics.peakThroughput, throughput),
          totalTransactions: currentMetrics.totalTransactions + 1,
          averageLatency: (currentMetrics.averageLatency + latency) / 2,
          errorCount: currentMetrics.errorCount + (state === 'error' ? 1 : 0)
        });

        return newMetrics;
      });
    }

    // Update edge data
    setEdges(edges => edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            connectionState: state,
            isActive: state === 'active' || state === 'processing',
            throughput,
            errorRate,
            latency,
            dataPreview,
            lastUpdate: Date.now()
          }
        };
      }
      return edge;
    }));

    // Auto-clear temporary states
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        updateConnectionState(edgeId, 'idle');
      }, duration);
      
      timeoutsRef.current.set(edgeId, timeoutId);
    }
  }, [setEdges]);

  // Enhanced activation with throughput simulation
  const activateConnection = useCallback((edgeId, duration = 3000, options = {}) => {
    const { 
      simulateThroughput = true, 
      maxThroughput = 1.0,
      dataType = 'data',
      dataPreview = null 
    } = options;

    setActiveConnections(prev => new Set([...prev, edgeId]));
    
    if (simulateThroughput) {
      // Simulate realistic throughput patterns
      const startTime = Date.now();
      const updateInterval = 100; // Update every 100ms
      
      const throughputSimulation = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          clearInterval(throughputSimulation);
          updateConnectionState(edgeId, 'success', { 
            throughput: 0, 
            dataSize: Math.random() * 1000,
            latency: 50 + Math.random() * 100,
            dataPreview 
          });
          setActiveConnections(prev => {
            const newSet = new Set(prev);
            newSet.delete(edgeId);
            return newSet;
          });
          return;
        }

        // Simulate variable throughput with realistic patterns
        const basePattern = Math.sin(progress * Math.PI * 2) * 0.3 + 0.7;
        const noise = (Math.random() - 0.5) * 0.2;
        const currentThroughput = Math.max(0, Math.min(maxThroughput, basePattern + noise));
        
        updateConnectionState(edgeId, 'processing', {
          throughput: currentThroughput,
          dataSize: currentThroughput * 10,
          latency: 20 + Math.random() * 50,
          dataPreview
        });
      }, updateInterval);
      
      timeoutsRef.current.set(`${edgeId}-simulation`, throughputSimulation);
    } else {
      updateConnectionState(edgeId, 'processing', { dataPreview });
      
      setTimeout(() => {
        updateConnectionState(edgeId, 'success');
        setActiveConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(edgeId);
          return newSet;
        });
      }, duration);
    }
  }, [updateConnectionState]);

  // Enhanced error state with error details
  const setConnectionError = useCallback((edgeId, errorDetails = {}, duration = 2000) => {
    const { 
      errorMessage = 'Connection failed',
      errorCode = 'CONN_ERROR',
      retryCount = 0 
    } = errorDetails;

    updateConnectionState(edgeId, 'error', {
      errorRate: 1.0,
      dataPreview: `Error: ${errorMessage}`,
      errorCode,
      retryCount
    });

    if (duration > 0) {
      setTimeout(() => {
        updateConnectionState(edgeId, 'idle');
      }, duration);
    }
  }, [updateConnectionState]);

  // Enhanced success state with completion metrics
  const setConnectionSuccess = useCallback((edgeId, successDetails = {}, duration = 1500) => {
    const { 
      dataTransferred = 0,
      processingTime = 0,
      resultPreview = null 
    } = successDetails;

    updateConnectionState(edgeId, 'success', {
      throughput: 0,
      dataSize: dataTransferred,
      latency: processingTime,
      dataPreview: resultPreview || 'Success'
    });

    if (duration > 0) {
      setTimeout(() => {
        updateConnectionState(edgeId, 'idle');
      }, duration);
    }
  }, [updateConnectionState]);

  // Batch data flow animation with realistic timing
  const animateDataFlow = useCallback(async (path, options = {}) => {
    const { 
      stepDelay = 800, 
      batchSize = 3,
      dataType = 'data',
      onStepComplete = null 
    } = options;

    for (let i = 0; i < path.length - 1; i += batchSize) {
      const batch = path.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (edgeId, batchIndex) => {
        const delay = batchIndex * 200; // Stagger within batch
        
        setTimeout(() => {
          activateConnection(edgeId, stepDelay * 0.8, {
            simulateThroughput: true,
            maxThroughput: 0.8 + Math.random() * 0.4,
            dataType,
            dataPreview: `${dataType} batch ${Math.floor(i / batchSize) + 1}`
          });
        }, delay);
      });

      await Promise.all(batchPromises);
      
      if (onStepComplete) {
        onStepComplete(i / batchSize + 1, Math.ceil(path.length / batchSize));
      }
      
      // Wait before next batch
      if (i + batchSize < path.length) {
        await new Promise(resolve => setTimeout(resolve, stepDelay));
      }
    }
  }, [activateConnection]);

  // Enhanced workflow execution with performance monitoring
  const animateWorkflowExecution = useCallback(async (workflow, options = {}) => {
    const { 
      stepDelay = 1000, 
      onStepComplete = null,
      onComplete = null,
      enableMetrics = true 
    } = options;

    const startTime = Date.now();
    let totalDataProcessed = 0;
    let totalErrors = 0;

    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      const { edgeId, nodeId, expectedDuration = 1000, dataSize = 100 } = step;

      try {
        // Simulate step execution with realistic metrics
        await new Promise((resolve, reject) => {
          const stepStartTime = Date.now();
          
          activateConnection(edgeId, expectedDuration, {
            simulateThroughput: true,
            maxThroughput: dataSize / expectedDuration,
            dataType: step.dataType || 'data',
            dataPreview: `Processing step ${i + 1}: ${nodeId}`
          });

          setTimeout(() => {
            const stepDuration = Date.now() - stepStartTime;
            const success = Math.random() > 0.1; // 90% success rate
            
            if (success) {
              totalDataProcessed += dataSize;
              setConnectionSuccess(edgeId, {
                dataTransferred: dataSize,
                processingTime: stepDuration,
                resultPreview: `Step ${i + 1} completed`
              });
              resolve();
            } else {
              totalErrors++;
              setConnectionError(edgeId, {
                errorMessage: `Step ${i + 1} failed`,
                errorCode: 'STEP_ERROR'
              });
              reject(new Error(`Step ${i + 1} failed`));
            }
          }, expectedDuration);
        });

        if (onStepComplete) {
          onStepComplete(i + 1, workflow.length, {
            dataProcessed: totalDataProcessed,
            errors: totalErrors,
            duration: Date.now() - startTime
          });
        }

        // Wait before next step
        if (i < workflow.length - 1) {
          await new Promise(resolve => setTimeout(resolve, stepDelay));
        }
      } catch (error) {
        console.warn(`Workflow step ${i + 1} failed:`, error);
        // Continue with next step even if current fails
      }
    }

    const totalDuration = Date.now() - startTime;
    
    if (onComplete) {
      onComplete({
        totalSteps: workflow.length,
        dataProcessed: totalDataProcessed,
        errors: totalErrors,
        duration: totalDuration,
        successRate: ((workflow.length - totalErrors) / workflow.length) * 100
      });
    }
  }, [activateConnection, setConnectionSuccess, setConnectionError]);

  // Real-time performance monitoring
  const getConnectionMetrics = useCallback((edgeId) => {
    const state = connectionStates.get(edgeId);
    const metrics = performanceMetrics.get(edgeId);
    
    return {
      currentState: state?.state || 'idle',
      throughput: state?.throughput || 0,
      latency: state?.latency || 0,
      errorRate: state?.errorRate || 0,
      dataPreview: state?.dataPreview,
      metrics: metrics || null
    };
  }, [connectionStates, performanceMetrics]);

  // Enhanced connection highlighting with performance context
  const highlightPath = useCallback((pathEdges, options = {}) => {
    const { 
      highlightColor = '#3b82f6', 
      duration = 3000,
      showMetrics = true 
    } = options;

    pathEdges.forEach((edgeId, index) => {
      setTimeout(() => {
        setEdges(edges => edges.map(edge => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              data: {
                ...edge.data,
                highlighted: true,
                highlightColor,
                showMetrics
              },
              style: {
                ...edge.style,
                stroke: highlightColor,
                strokeWidth: 3,
                filter: 'drop-shadow(0 0 6px currentColor)'
              }
            };
          }
          return edge;
        }));
      }, index * 200);
    });

    // Clear highlighting after duration
    setTimeout(() => {
      setEdges(edges => edges.map(edge => {
        if (pathEdges.includes(edge.id)) {
          return {
            ...edge,
            data: {
              ...edge.data,
              highlighted: false
            },
            style: {
              ...edge.style,
              stroke: undefined,
              strokeWidth: undefined,
              filter: undefined
            }
          };
        }
        return edge;
      }));
    }, duration);
  }, [setEdges]);

  // Cleanup function
  const clearAllAnimations = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach((timeout, key) => {
      if (typeof timeout === 'number') {
        clearTimeout(timeout);
      } else {
        clearInterval(timeout);
      }
    });
    timeoutsRef.current.clear();

    // Reset states
    setActiveConnections(new Set());
    setConnectionStates(new Map());
    setPerformanceMetrics(new Map());

    // Reset edge states
    setEdges(edges => edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        connectionState: 'idle',
        isActive: false,
        throughput: 0,
        errorRate: 0,
        highlighted: false
      }
    })));
  }, [setEdges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllAnimations();
    };
  }, [clearAllAnimations]);

  return {
    // Core functions
    updateConnectionState,
    activateConnection,
    setConnectionError,
    setConnectionSuccess,
    
    // Advanced animations
    animateDataFlow,
    animateWorkflowExecution,
    highlightPath,
    
    // Monitoring
    getConnectionMetrics,
    performanceMetrics,
    connectionStates,
    activeConnections,
    
    // Utilities
    clearAllAnimations
  };
};

/**
 * Enhanced connection labels hook with dynamic data type detection
 */
export const useConnectionLabels = (edges, setEdges) => {
  const [labelStates, setLabelStates] = useState(new Map());

  // Set connection label with enhanced metadata
  const setConnectionLabel = useCallback((edgeId, label, options = {}) => {
    const { 
      dataType = null, 
      persistent = false, 
      showPreview = true,
      metadata = {} 
    } = options;

    setLabelStates(prev => {
      const newStates = new Map(prev);
      newStates.set(edgeId, {
        label,
        dataType,
        persistent,
        showPreview,
        metadata,
        timestamp: Date.now()
      });
      return newStates;
    });

    setEdges(edges => edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            label,
            dataType,
            showPreview,
            metadata
          }
        };
      }
      return edge;
    }));
  }, [setEdges]);

  // Enhanced auto-detection with machine learning-like patterns
  const autoDetectDataType = useCallback((sourceNode, targetNode) => {
    const sourceType = sourceNode?.type?.toLowerCase() || '';
    const targetType = targetNode?.type?.toLowerCase() || '';
    
    // Enhanced detection patterns
    const detectionRules = [
      { pattern: /file|upload|document/, type: 'file', confidence: 0.9 },
      { pattern: /api|webhook|http/, type: 'api', confidence: 0.8 },
      { pattern: /text|string|message/, type: 'text', confidence: 0.7 },
      { pattern: /json|object|data/, type: 'json', confidence: 0.8 },
      { pattern: /image|photo|picture/, type: 'image', confidence: 0.9 },
      { pattern: /email|mail/, type: 'email', confidence: 0.8 },
      { pattern: /database|db|sql/, type: 'database', confidence: 0.8 }
    ];

    const sourceText = `${sourceType} ${sourceNode?.data?.label || ''} ${sourceNode?.data?.description || ''}`.toLowerCase();
    const targetText = `${targetType} ${targetNode?.data?.label || ''} ${targetNode?.data?.description || ''}`.toLowerCase();
    const combinedText = `${sourceText} ${targetText}`;

    let bestMatch = { type: 'data', confidence: 0 };

    detectionRules.forEach(rule => {
      if (rule.pattern.test(combinedText)) {
        if (rule.confidence > bestMatch.confidence) {
          bestMatch = { type: rule.type, confidence: rule.confidence };
        }
      }
    });

    return bestMatch;
  }, []);

  // Set data type for edge with auto-labeling
  const setEdgeDataType = useCallback((edgeId, dataType, autoLabel = true) => {
    setEdges(edges => edges.map(edge => {
      if (edge.id === edgeId) {
        const updatedEdge = {
          ...edge,
          data: {
            ...edge.data,
            dataType
          }
        };

        if (autoLabel) {
          const labelMap = {
            file: '📄 File',
            api: '🔗 API',
            text: '📝 Text',
            json: '📋 JSON',
            image: '🖼️ Image',
            email: '📧 Email',
            database: '🗄️ Database'
          };
          
          updatedEdge.data.label = labelMap[dataType] || '📦 Data';
        }

        return updatedEdge;
      }
      return edge;
    }));
  }, [setEdges]);

  return {
    setConnectionLabel,
    setEdgeDataType,
    autoDetectDataType,
    labelStates
  };
};

export default useConnectionAnimation; 