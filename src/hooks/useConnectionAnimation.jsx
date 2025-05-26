import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Enhanced connection animation hook with real-time execution flow visualization
 */
export const useConnectionAnimation = () => {
  const [activeConnections, setActiveConnections] = useState(new Set());
  const [connectionStates, setConnectionStates] = useState(new Map());
  const [performanceMetrics, setPerformanceMetrics] = useState(new Map());
  const [executionFlow, setExecutionFlow] = useState([]);
  const [currentExecutingNode, setCurrentExecutingNode] = useState(null);
  const timeoutsRef = useRef(new Map());

  // Enhanced connection state update with real-time metrics
  const updateConnectionState = useCallback((edgeId, state, options = {}) => {
    const {
      throughput = 0,
      dataSize = 0,
      errorRate = 0,
      latency = 0,
      dataPreview = null,
      dataType = 'data',
      animated = false
    } = options;

    setConnectionStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(edgeId) || {};
      
      newStates.set(edgeId, {
        ...currentState,
        state,
        throughput,
        dataSize,
        errorRate,
        latency,
        dataPreview,
        dataType,
        animated,
        timestamp: Date.now(),
        // Enhanced visual properties
        particles: state === 'active' || state === 'processing',
        glowing: state === 'active' || state === 'processing' || state === 'success',
        pulsing: state === 'processing' || errorRate > 0
      });
      
      return newStates;
    });

    // Update performance metrics
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
        ...currentMetrics,
        totalDataTransferred: currentMetrics.totalDataTransferred + dataSize,
        averageThroughput: (currentMetrics.averageThroughput + throughput) / 2,
        peakThroughput: Math.max(currentMetrics.peakThroughput, throughput),
        totalTransactions: currentMetrics.totalTransactions + 1,
        averageLatency: (currentMetrics.averageLatency + latency) / 2,
        errorCount: currentMetrics.errorCount + (errorRate > 0 ? 1 : 0),
        lastUpdate: Date.now()
      });

      return newMetrics;
    });
  }, []);

  // Enhanced connection activation with realistic simulation
  const activateConnection = useCallback((edgeId, duration = 3000, options = {}) => {
    const {
      dataType = 'data',
      simulateRealistic = true,
      onComplete = null
    } = options;

    setActiveConnections(prev => new Set([...prev, edgeId]));

    if (simulateRealistic) {
      // Simulate realistic data flow with varying throughput
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          clearInterval(interval);
          setActiveConnections(prev => {
            const newSet = new Set(prev);
            newSet.delete(edgeId);
            return newSet;
          });
          
          updateConnectionState(edgeId, 'success', {
            throughput: 0,
            dataType,
            animated: false
          });
          
          if (onComplete) onComplete();
          return;
        }

        // Simulate varying throughput with realistic patterns
        const baseThroughput = 50;
        const variation = Math.sin(progress * Math.PI * 4) * 30;
        const randomNoise = (Math.random() - 0.5) * 20;
        const currentThroughput = Math.max(0, baseThroughput + variation + randomNoise);
        
        // Simulate occasional errors
        const errorRate = Math.random() > 0.95 ? Math.random() * 0.1 : 0;
        
        // Simulate latency variations
        const baseLatency = 50;
        const latencyVariation = Math.random() * 30;
        const currentLatency = baseLatency + latencyVariation;

        updateConnectionState(edgeId, 'active', {
          throughput: currentThroughput,
          dataSize: currentThroughput * 0.1, // Convert to data size
          errorRate,
          latency: currentLatency,
          dataType,
          animated: true,
          dataPreview: generateDataPreview(dataType, progress)
        });
      }, 100);

      // Store interval for cleanup
      timeoutsRef.current.set(edgeId, interval);
    } else {
      // Simple activation
      updateConnectionState(edgeId, 'active', {
        throughput: 75,
        dataType,
        animated: true
      });

      const timeout = setTimeout(() => {
        setActiveConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(edgeId);
          return newSet;
        });
        
        updateConnectionState(edgeId, 'success', {
          throughput: 0,
          dataType,
          animated: false
        });
        
        if (onComplete) onComplete();
      }, duration);

      timeoutsRef.current.set(edgeId, timeout);
    }
  }, [updateConnectionState]);

  // Generate realistic data preview based on type
  const generateDataPreview = useCallback((dataType, progress) => {
    switch (dataType) {
      case 'file':
        return `Processing file... ${Math.round(progress * 100)}% complete`;
      case 'text':
        return `Text data: "${generateSampleText(progress)}"`;
      case 'api':
        return `API Response: ${generateApiResponse(progress)}`;
      case 'json':
        return `JSON: {"progress": ${Math.round(progress * 100)}, "status": "processing"}`;
      default:
        return `Data transfer: ${Math.round(progress * 100)}% complete`;
    }
  }, []);

  const generateSampleText = (progress) => {
    const texts = [
      "Analyzing customer feedback...",
      "Processing natural language...",
      "Extracting key insights...",
      "Generating summary report..."
    ];
    const index = Math.floor(progress * texts.length);
    return texts[Math.min(index, texts.length - 1)];
  };

  const generateApiResponse = (progress) => {
    const responses = [
      "Connecting to API...",
      "Authenticating request...",
      "Fetching data...",
      "Processing response..."
    ];
    const index = Math.floor(progress * responses.length);
    return responses[Math.min(index, responses.length - 1)];
  };

  // Enhanced workflow execution with visual flow tracking
  const animateWorkflowExecution = useCallback(async (edges, options = {}) => {
    const {
      stepDelay = 1000,
      onNodeStart = null,
      onNodeComplete = null,
      onWorkflowComplete = null,
      showRealTimeFlow = true
    } = options;

    setExecutionFlow([]);
    
    // Group edges by execution order (topological sort)
    const executionOrder = calculateExecutionOrder(edges);
    
    for (let i = 0; i < executionOrder.length; i++) {
      const batch = executionOrder[i];
      
      // Execute batch of connections in parallel
      const batchPromises = batch.map(async (edge) => {
        const { source, target, id } = edge;
        
        // Update execution flow
        setExecutionFlow(prev => [...prev, {
          edgeId: id,
          sourceNode: source,
          targetNode: target,
          status: 'starting',
          timestamp: Date.now()
        }]);

        // Notify node start
        if (onNodeStart) {
          onNodeStart(source, target);
        }

        setCurrentExecutingNode(source);

        // Activate connection with realistic simulation
        return new Promise((resolve) => {
          activateConnection(id, stepDelay, {
            dataType: edge.data?.dataType || 'data',
            simulateRealistic: showRealTimeFlow,
            onComplete: () => {
              // Update execution flow
              setExecutionFlow(prev => prev.map(item => 
                item.edgeId === id 
                  ? { ...item, status: 'completed', completedAt: Date.now() }
                  : item
              ));

              // Notify node completion
              if (onNodeComplete) {
                onNodeComplete(source, target);
              }

              resolve();
            }
          });
        });
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i < executionOrder.length - 1) {
        await new Promise(resolve => setTimeout(resolve, stepDelay / 2));
      }
    }

    setCurrentExecutingNode(null);
    
    if (onWorkflowComplete) {
      onWorkflowComplete();
    }
  }, [activateConnection]);

  // Calculate execution order using topological sort
  const calculateExecutionOrder = useCallback((edges) => {
    // Simple implementation - group by depth level
    const levels = [];
    const processed = new Set();
    
    // Find starting edges (no dependencies)
    const startingEdges = edges.filter(edge => 
      !edges.some(e => e.target === edge.source)
    );
    
    if (startingEdges.length > 0) {
      levels.push(startingEdges);
      startingEdges.forEach(edge => processed.add(edge.id));
    }
    
    // Process remaining edges level by level
    while (processed.size < edges.length) {
      const nextLevel = edges.filter(edge => 
        !processed.has(edge.id) && 
        edges.filter(e => e.target === edge.source).every(e => processed.has(e.id))
      );
      
      if (nextLevel.length === 0) break; // Prevent infinite loop
      
      levels.push(nextLevel);
      nextLevel.forEach(edge => processed.add(edge.id));
    }
    
    return levels;
  }, []);

  // Enhanced connection error handling
  const setConnectionError = useCallback((edgeId, errorMessage, options = {}) => {
    const { errorType = 'general', retryable = true } = options;
    
    updateConnectionState(edgeId, 'error', {
      errorRate: 1,
      dataType: 'error',
      animated: true,
      dataPreview: `Error: ${errorMessage}`,
      errorType,
      retryable,
      errorTimestamp: Date.now()
    });

    setActiveConnections(prev => {
      const newSet = new Set(prev);
      newSet.delete(edgeId);
      return newSet;
    });
  }, [updateConnectionState]);

  // Enhanced connection success
  const setConnectionSuccess = useCallback((edgeId, successData = {}) => {
    const { 
      finalThroughput = 0,
      totalDataTransferred = 0,
      executionTime = 0
    } = successData;
    
    updateConnectionState(edgeId, 'success', {
      throughput: finalThroughput,
      dataSize: totalDataTransferred,
      errorRate: 0,
      latency: 0,
      dataType: 'success',
      animated: false,
      dataPreview: `Success: ${totalDataTransferred}KB transferred in ${executionTime}ms`,
      executionTime
    });

    setActiveConnections(prev => {
      const newSet = new Set(prev);
      newSet.delete(edgeId);
      return newSet;
    });
  }, [updateConnectionState]);

  // Get real-time connection metrics
  const getConnectionMetrics = useCallback((edgeId) => {
    const state = connectionStates.get(edgeId);
    const metrics = performanceMetrics.get(edgeId);
    
    return {
      state: state?.state || 'idle',
      throughput: state?.throughput || 0,
      latency: state?.latency || 0,
      errorRate: state?.errorRate || 0,
      dataPreview: state?.dataPreview,
      metrics: metrics || null,
      isActive: activeConnections.has(edgeId)
    };
  }, [connectionStates, performanceMetrics, activeConnections]);

  // Enhanced path highlighting with animation
  const highlightPath = useCallback((nodeIds, options = {}) => {
    const { 
      color = '#3b82f6',
      duration = 3000,
      animationType = 'pulse'
    } = options;

    // Find edges that connect the nodes in the path
    const pathEdges = [];
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const sourceId = nodeIds[i];
      const targetId = nodeIds[i + 1];
      
      // Find edge connecting these nodes
      connectionStates.forEach((state, edgeId) => {
        // This would need edge source/target info - simplified for now
        pathEdges.push(edgeId);
      });
    }

    // Animate each edge in sequence
    pathEdges.forEach((edgeId, index) => {
      setTimeout(() => {
        updateConnectionState(edgeId, 'active', {
          throughput: 100,
          dataType: 'highlight',
          animated: true,
          dataPreview: `Path highlight ${index + 1}/${pathEdges.length}`
        });

        // Clear highlight after duration
        setTimeout(() => {
          updateConnectionState(edgeId, 'idle', {
            throughput: 0,
            animated: false
          });
        }, duration);
      }, index * 500);
    });
  }, [connectionStates, updateConnectionState]);

  // Cleanup function
  const clearAllAnimations = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach((timeout) => {
      if (typeof timeout === 'number') {
        clearTimeout(timeout);
      } else {
        clearInterval(timeout);
      }
    });
    timeoutsRef.current.clear();

    // Reset all states
    setActiveConnections(new Set());
    setConnectionStates(new Map());
    setPerformanceMetrics(new Map());
    setExecutionFlow([]);
    setCurrentExecutingNode(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllAnimations();
    };
  }, [clearAllAnimations]);

  return {
    // State
    activeConnections,
    connectionStates,
    performanceMetrics,
    executionFlow,
    currentExecutingNode,
    
    // Actions
    updateConnectionState,
    activateConnection,
    setConnectionError,
    setConnectionSuccess,
    animateWorkflowExecution,
    highlightPath,
    clearAllAnimations,
    
    // Utilities
    getConnectionMetrics
  };
};

/**
 * Enhanced connection labels hook with dynamic data type detection
 */
export const useConnectionLabels = () => {
  const [connectionLabels, setConnectionLabels] = useState(new Map());
  const [edgeDataTypes, setEdgeDataTypes] = useState(new Map());

  const setConnectionLabel = useCallback((edgeId, label, options = {}) => {
    const { 
      persistent = true,
      showPreview = true,
      metadata = {}
    } = options;

    setConnectionLabels(prev => {
      const newLabels = new Map(prev);
      newLabels.set(edgeId, {
        label,
        persistent,
        showPreview,
        metadata,
        timestamp: Date.now()
      });
      return newLabels;
    });
  }, []);

  const autoDetectDataType = useCallback((sourceNode, targetNode) => {
    // Enhanced data type detection with more patterns
    const patterns = {
      file: /file|document|pdf|doc|upload/i,
      text: /text|string|content|message|description/i,
      api: /api|endpoint|request|response|http/i,
      json: /json|object|data|payload/i,
      image: /image|photo|picture|img|visual/i,
      video: /video|movie|clip|media/i,
      audio: /audio|sound|music|voice/i,
      database: /database|db|sql|query|table/i,
      email: /email|mail|message|notification/i,
      webhook: /webhook|hook|callback|trigger/i
    };

    const sourceText = `${sourceNode?.type || ''} ${sourceNode?.data?.label || ''} ${sourceNode?.data?.description || ''}`.toLowerCase();
    const targetText = `${targetNode?.type || ''} ${targetNode?.data?.label || ''} ${targetNode?.data?.description || ''}`.toLowerCase();
    const combinedText = `${sourceText} ${targetText}`;

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(combinedText)) {
        return type;
      }
    }

    // Default based on node types
    if (sourceNode?.type === 'input' || targetNode?.type === 'input') return 'input';
    if (sourceNode?.type === 'output' || targetNode?.type === 'output') return 'output';
    if (sourceNode?.type === 'agent' || targetNode?.type === 'agent') return 'agent';
    if (sourceNode?.type === 'task' || targetNode?.type === 'task') return 'task';
    if (sourceNode?.type === 'tool' || targetNode?.type === 'tool') return 'tool';

    return 'data';
  }, []);

  const setEdgeDataType = useCallback((edgeId, dataType, autoLabel = true) => {
    setEdgeDataTypes(prev => {
      const newTypes = new Map(prev);
      newTypes.set(edgeId, dataType);
      return newTypes;
    });

    if (autoLabel) {
      const labelMap = {
        file: 'File Transfer',
        text: 'Text Data',
        api: 'API Call',
        json: 'JSON Data',
        image: 'Image Data',
        video: 'Video Stream',
        audio: 'Audio Data',
        database: 'Database Query',
        email: 'Email Message',
        webhook: 'Webhook Event',
        input: 'User Input',
        output: 'Output Data',
        agent: 'Agent Response',
        task: 'Task Result',
        tool: 'Tool Output'
      };

      setConnectionLabel(edgeId, labelMap[dataType] || 'Data Flow');
    }
  }, [setConnectionLabel]);

  return {
    connectionLabels,
    edgeDataTypes,
    setConnectionLabel,
    autoDetectDataType,
    setEdgeDataType
  };
};

export default useConnectionAnimation; 