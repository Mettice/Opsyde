// FlowCanvas.jsx
import React, { useRef, useMemo, useCallback, useEffect, useState, forwardRef } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

// Custom components
import AnimatedEdge from './AnimatedEdge';
import FloatingMetricsPanel from "./builder/FloatingMetricsPanel";
import TemplateGallery from './flowcanvas/TemplateGallery';

// Utilities
import { validateConnection } from '../utils/validateConnection';
import { nodeTypes } from '../utils/nodeTypes';
import { useBuilderUI } from '../contexts/BuilderUIContext';

// Enhanced edge types with execution state
const edgeTypes = {
  default: AnimatedEdge,
  animated: AnimatedEdge,
};

// Enhanced FlowCanvas component with execution visuals
const FlowCanvasBase = forwardRef(({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  className = '',
  style = {},
  nodeStates = new Map(),
  connectionStates = new Map(),
  isExecuting = false,
  ...reactFlowProps // All other props go to ReactFlow, not the div
}, ref) => {
  const { 
    showTemplateGallery,
  } = useBuilderUI();

  // Enhanced connection validation
  const isValidConnection = useCallback((connection) => {
    return validateConnection(connection, nodes, edges, toast);
  }, [nodes, edges]);

  const handleConnect = useCallback((params) => {
    console.log('Connection attempt:', params);
    
    if (validateConnection(params, nodes, edges, toast)) {
      onConnect(params);
      toast.success('Connection created successfully!');
    } else {
      toast.error('Invalid connection');
    }
  }, [nodes, edges, onConnect]);

  // Enhanced nodes with execution state
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        executionState: nodeStates.get(node.id) || { status: 'idle', progress: 0 }
      }
    }));
  }, [nodes, nodeStates]);

  // Enhanced edges with connection state
  const enhancedEdges = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        state: connectionStates.get(edge.id)?.state || 'idle',
        animated: connectionStates.get(edge.id)?.state === 'active' || connectionStates.get(edge.id)?.state === 'processing'
      }
    }));
  }, [edges, connectionStates]);

  return (
    <div 
      ref={ref}
      className={`flow-canvas relative ${className}`} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        ...style 
      }}
      // NO PROPS SPREAD HERE - that was causing the warnings
    >
      <ReactFlow
        nodes={enhancedNodes}
        edges={enhancedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        {...reactFlowProps} // All other props go here to ReactFlow
      >
        <Background 
          variant="dots" 
          gap={20} 
          size={1} 
          color="#e2e8f0"
        />
        
        <MiniMap 
          position="bottom-left"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          nodeColor={(node) => {
            const state = nodeStates.get(node.id);
            const status = state?.status || 'idle';
            
            // Color based on execution state
            switch (status) {
              case 'processing':
                return '#3b82f6'; // Blue for processing
              case 'success':
                return '#22c55e'; // Green for success
              case 'error':
                return '#ef4444'; // Red for error
              default:
                // Default colors by type
                switch (node.type) {
                  case 'agent': return '#8b5cf6';
                  case 'task': return '#f59e0b';
                  case 'trigger': return '#ec4899';
                  case 'tool': return '#10b981';
                  case 'chatbot': return '#06b6d4';
                  case 'input': return '#84cc16';
                  case 'output': return '#f97316';
                  case 'logic': return '#eab308';
                  case 'delay': return '#a855f7';
                  default: return '#6b7280';
                }
            }
          }}
        />

        {/* Floating Metrics Panel */}
        <Panel position="top-right">
          <FloatingMetricsPanel 
            nodes={nodes}
            edges={edges}
            nodeStates={nodeStates}
            connectionStates={connectionStates}
            isExecuting={isExecuting}
          />
        </Panel>
      </ReactFlow>

      {/* Template Gallery */}
      {showTemplateGallery && <TemplateGallery />}

      {/* Simple Visual Metrics */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">Nodes: {nodes.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Connections: {edges.length}</span>
          </div>
          {isExecuting && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="text-orange-600">Executing</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

FlowCanvasBase.displayName = 'FlowCanvasBase';

FlowCanvasBase.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  onNodesChange: PropTypes.func.isRequired,
  onEdgesChange: PropTypes.func.isRequired,
  onConnect: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func,
  onEdgeClick: PropTypes.func,
  onPaneClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  nodeStates: PropTypes.instanceOf(Map),
  connectionStates: PropTypes.instanceOf(Map),
  isExecuting: PropTypes.bool,
};

// Wrap with ReactFlowProvider
const FlowCanvass = forwardRef((props, ref) => (
  <ReactFlowProvider>
    <FlowCanvasBase {...props} ref={ref} />
  </ReactFlowProvider>
));

FlowCanvass.displayName = 'FlowCanvass';

export default FlowCanvass;