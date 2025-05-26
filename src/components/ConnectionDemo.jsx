import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';

import AnimatedEdge from './AnimatedEdge';
import ConnectionLine from './ConnectionLine';
import { useConnectionAnimation, useConnectionLabels } from '../hooks/useConnectionAnimation';
import '../styles/ConnectionLine.css';

// Enhanced demo nodes with more realistic data
const initialNodes = [
  {
    id: 'trigger-1',
    type: 'input',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Webhook Trigger',
      description: 'Receives incoming data',
      dataType: 'webhook'
    },
    style: {
      background: '#9C27B0',
      color: 'white',
      border: '2px solid #7B1FA2',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px'
    }
  },
  {
    id: 'processor-1',
    type: 'default',
    position: { x: 350, y: 100 },
    data: { 
      label: 'Data Processor',
      description: 'Processes incoming data',
      dataType: 'processor'
    },
    style: {
      background: '#2196F3',
      color: 'white',
      border: '2px solid #1976D2',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px'
    }
  },
  {
    id: 'ai-agent-1',
    type: 'default',
    position: { x: 600, y: 50 },
    data: { 
      label: 'AI Agent',
      description: 'Analyzes data with AI',
      dataType: 'ai'
    },
    style: {
      background: '#FF9800',
      color: 'white',
      border: '2px solid #F57C00',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px'
    }
  },
  {
    id: 'database-1',
    type: 'output',
    position: { x: 600, y: 200 },
    data: { 
      label: 'Database',
      description: 'Stores processed data',
      dataType: 'database'
    },
    style: {
      background: '#4CAF50',
      color: 'white',
      border: '2px solid #388E3C',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px'
    }
  },
  {
    id: 'notification-1',
    type: 'output',
    position: { x: 850, y: 100 },
    data: { 
      label: 'Notification',
      description: 'Sends alerts',
      dataType: 'notification'
    },
    style: {
      background: '#F44336',
      color: 'white',
      border: '2px solid #D32F2F',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '150px'
    }
  }
];

// Enhanced demo edges with realistic data flow patterns
const initialEdges = [
  {
    id: 'e1-2',
    source: 'trigger-1',
    target: 'processor-1',
    type: 'animated',
    data: {
      label: 'Raw Data',
      dataType: 'json',
      throughput: 0,
      state: 'idle'
    },
    animated: false
  },
  {
    id: 'e2-3',
    source: 'processor-1',
    target: 'ai-agent-1',
    type: 'animated',
    data: {
      label: 'Processed Data',
      dataType: 'structured',
      throughput: 0,
      state: 'idle'
    },
    animated: false
  },
  {
    id: 'e2-4',
    source: 'processor-1',
    target: 'database-1',
    type: 'animated',
    data: {
      label: 'Store Data',
      dataType: 'database',
      throughput: 0,
      state: 'idle'
    },
    animated: false
  },
  {
    id: 'e3-5',
    source: 'ai-agent-1',
    target: 'notification-1',
    type: 'animated',
    data: {
      label: 'AI Results',
      dataType: 'alert',
      throughput: 0,
      state: 'idle'
    },
    animated: false
  }
];

// Edge types configuration
const edgeTypes = {
  animated: AnimatedEdge,
};

// Enhanced demo scenarios
const demoScenarios = [
  {
    id: 'realtime-data',
    name: '🚀 Real-time Data Flow',
    description: 'Simulate high-throughput data processing with performance metrics',
    icon: '⚡'
  },
  {
    id: 'ai-workflow',
    name: '🤖 AI Processing Pipeline',
    description: 'Show AI agent processing with variable latency and success rates',
    icon: '🧠'
  },
  {
    id: 'error-handling',
    name: '❌ Error Recovery Demo',
    description: 'Demonstrate error states, retries, and recovery patterns',
    icon: '🔄'
  },
  {
    id: 'batch-processing',
    name: '📦 Batch Processing',
    description: 'Show batch data processing with queue management',
    icon: '📊'
  },
  {
    id: 'performance-test',
    name: '🏃‍♂️ Performance Stress Test',
    description: 'High-frequency updates with throughput monitoring',
    icon: '🔥'
  }
];

const ConnectionDemo = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isExecuting, setIsExecuting] = useState(false);
  const [nodeStates, setNodeStates] = useState(new Map());
  const [connectionStates, setConnectionStates] = useState(new Map());

  // Initialize connection animation hooks
  const {
    activateConnection,
    setConnectionSuccess,
    setConnectionError,
    animateDataFlow,
    clearAllAnimations
  } = useConnectionAnimation();

  const {
    setConnectionLabel,
    setEdgeDataType,
    autoDetectDataType
  } = useConnectionLabels(edges, setEdges);

  // Enhanced connection handler
  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      type: 'animated',
      data: {
        label: 'New Connection',
        dataType: 'data',
        throughput: 0,
        state: 'idle'
      }
    };
    
    // Auto-detect data type based on connected nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (sourceNode && targetNode) {
      const detection = autoDetectDataType(sourceNode, targetNode);
      newEdge.data.dataType = detection.type;
      newEdge.data.label = `${getDataTypeIcon(detection.type)} ${detection.type}`;
    }
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [nodes, setEdges, autoDetectDataType]);

  // Helper function to get data type icons
  const getDataTypeIcon = (dataType) => {
    const iconMap = {
      file: '📄',
      api: '🔗',
      text: '📝',
      json: '📋',
      image: '🖼️',
      email: '📧',
      database: '🗄️',
      data: '📦'
    };
    return iconMap[dataType] || '📦';
  };

  // Demo functions
  const runDataFlowDemo = useCallback(async () => {
    setIsExecuting(true);
    clearAllAnimations();

    // Simulate workflow execution
    const executionSteps = [
      { nodeId: 'trigger-1', edgeId: 'e1-2', duration: 1000 },
      { nodeId: 'processor-1', edgeId: 'e2-3', duration: 1500 },
      { nodeId: 'processor-1', edgeId: 'e2-4', duration: 1200 },
      { nodeId: 'ai-agent-1', edgeId: 'e3-5', duration: 2000 }
    ];

    for (const step of executionSteps) {
      // Update node state to processing
      setNodeStates(prev => {
        const newStates = new Map(prev);
        newStates.set(step.nodeId, {
          status: 'processing',
          progress: 50,
          time: Date.now(),
          cost: Math.random() * 0.1
        });
        return newStates;
      });

      // Activate connection if edge exists
      if (step.edgeId) {
        setConnectionStates(prev => {
          const newStates = new Map(prev);
          newStates.set(step.edgeId, {
            state: 'active',
            dataType: 'processing',
            throughput: Math.random() * 100 + 50,
            dataSize: Math.random() * 1000 + 100,
            timestamp: Date.now()
          });
          return newStates;
        });

        // Update edge animation
        setEdges(eds => eds.map(edge => 
          edge.id === step.edgeId 
            ? { ...edge, animated: true, style: { ...edge.style, stroke: '#3b82f6', strokeWidth: 3 } }
            : edge
        ));
      }

      await new Promise(resolve => setTimeout(resolve, step.duration));

      // Update node state to success
      setNodeStates(prev => {
        const newStates = new Map(prev);
        newStates.set(step.nodeId, {
          status: 'success',
          progress: 100,
          time: Date.now(),
          cost: Math.random() * 0.1
        });
        return newStates;
      });

      // Update connection to success
      if (step.edgeId) {
        setConnectionStates(prev => {
          const newStates = new Map(prev);
          newStates.set(step.edgeId, {
            ...newStates.get(step.edgeId),
            state: 'success'
          });
          return newStates;
        });

        // Update edge to success style
        setEdges(eds => eds.map(edge => 
          edge.id === step.edgeId 
            ? { ...edge, animated: false, style: { ...edge.style, stroke: '#10b981', strokeWidth: 2 } }
            : edge
        ));
      }
    }

    setIsExecuting(false);
  }, [clearAllAnimations, setEdges]);

  const runErrorDemo = useCallback(async () => {
    setIsExecuting(true);
    clearAllAnimations();

    // Simulate error in AI agent
    setNodeStates(prev => {
      const newStates = new Map(prev);
      newStates.set('ai-agent-1', {
        status: 'error',
        progress: 0,
        time: Date.now(),
        cost: 0,
        error: 'AI service unavailable'
      });
      return newStates;
    });

    setConnectionStates(prev => {
      const newStates = new Map(prev);
      newStates.set('e2-3', {
        state: 'error',
        dataType: 'error',
        error: 'Connection failed',
        timestamp: Date.now()
      });
      return newStates;
    });

    // Update edge to error style
    setEdges(eds => eds.map(edge => 
      edge.id === 'e2-3' 
        ? { ...edge, animated: true, style: { ...edge.style, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' } }
        : edge
    ));

    setTimeout(() => {
      setIsExecuting(false);
    }, 3000);
  }, [clearAllAnimations, setEdges]);

  const resetDemo = useCallback(() => {
    setIsExecuting(false);
    setNodeStates(new Map());
    setConnectionStates(new Map());
    clearAllAnimations();
    
    // Reset edge styles
    setEdges(eds => eds.map(edge => ({
      ...edge,
      animated: false,
      style: {
        stroke: '#9ca3af',
        strokeWidth: 2,
        strokeDasharray: 'none'
      }
    })));
  }, [clearAllAnimations, setEdges]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">🚀</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Connection Demo</h2>
            <p className="text-sm text-gray-600">Advanced flow visualization</p>
          </div>
        </div>

        {/* Performance Dashboard */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 font-medium">Data Transferred</div>
            <div className="text-lg font-bold text-blue-800">
              {(performanceStats.totalDataTransferred / 1024).toFixed(1)}KB
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 font-medium">Avg Throughput</div>
            <div className="text-lg font-bold text-green-800">
              {performanceStats.averageThroughput.toFixed(2)}
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
            <div className="text-xs text-purple-600 font-medium">Active</div>
            <div className="text-lg font-bold text-purple-800">
              {performanceStats.activeConnections}
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
            <div className="text-xs text-red-600 font-medium">Error Rate</div>
            <div className="text-lg font-bold text-red-800">
              {performanceStats.errorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Demo Scenarios */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Demo Scenarios</h3>
          {demoScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                switch (scenario.id) {
                  case 'realtime-data': runDataFlowDemo(); break;
                  case 'ai-workflow': runAIWorkflow(); break;
                  case 'error-handling': runErrorDemo(); break;
                  case 'batch-processing': runBatchProcessing(); break;
                  case 'performance-test': runPerformanceTest(); break;
                }
              }}
              disabled={isExecuting}
              className={`w-full p-3 rounded-lg text-left transition-all duration-200 border ${
                currentScenario === scenario.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-400 shadow-lg'
                  : isExecuting
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{scenario.icon}</span>
                <div>
                  <div className="font-medium text-sm">{scenario.name}</div>
                  <div className="text-xs opacity-80">{scenario.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={resetDemo}
            disabled={isExecuting}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
          >
            Reset Demo
          </button>
        </div>

        {/* Status Indicator */}
        {isExecuting && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">
              Running: {demoScenarios.find(s => s.id === currentScenario)?.name || 'Demo'}
            </span>
          </div>
        )}
      </div>

      {/* Enhanced ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={edgeTypes}
        connectionLineComponent={ConnectionLine}
        connectionLineType={ConnectionLineType.Bezier}
        fitView
        className="bg-gradient-to-br from-gray-50 to-gray-100"
        style={{
          background: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
        }}
      >
        <Background 
          color="#e5e7eb" 
          gap={20} 
          size={1}
          style={{ opacity: 0.5 }}
        />
        <Controls 
          className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg"
        />
        <MiniMap 
          className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg"
          nodeColor={(node) => {
            const state = nodeStates.get(node.id);
            if (state?.status === 'processing') return '#3b82f6';
            if (state?.status === 'success') return '#10b981';
            if (state?.status === 'error') return '#ef4444';
            return '#9ca3af';
          }}
        />
      </ReactFlow>

      {/* Features Showcase */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-4 max-w-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-3">✨ Enhanced Features</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Real-time throughput monitoring</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Dynamic particle trails</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>Performance metrics tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>Smart data type detection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>Error handling & recovery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            <span>Interactive hover effects</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDemo; 