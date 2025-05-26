// FlowCanvas.jsx
import React, { useRef, useMemo, useCallback, useState, useEffect, forwardRef, memo } from 'react';
import ReactFlow, {
  MiniMap,
  Background,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

// Custom components
import ConnectionLine from './ConnectionLine';
import AnimatedEdge from './AnimatedEdge';
import ConnectionGuide from './ConnectionGuide';
import ConnectionRulesPanel from './builder/ConnectionRulesPanel';
import ZoomControls from './builder/ZoomControls';
import FloatingMetricsPanel from "./builder/FloatingMetricsPanel";
import TemplateGallery from './flowcanvas/TemplateGallery';
import NodeResultDisplay from './flowcanvas/NodeResultDisplay';
import DebugPanel from './flowcanvas/DebugPanel';
import ConnectionDiagram from './flowcanvas/ConnectionDiagram';

// Utilities
import { validateConnection } from '../utils/validateConnection';
import { nodeTypes } from '../utils/nodeTypes';
import { useFlow } from '../contexts/FlowContext';
import { useBuilderUI } from '../contexts/BuilderUIContext';

// Custom styles
import './flowcanvas/FlowCanvas.css';

// Enhanced edge types with our AnimatedEdge
const edgeTypes = {
  default: AnimatedEdge,
  animated: AnimatedEdge,
  bezier: AnimatedEdge,
  smoothstep: AnimatedEdge,
  straight: AnimatedEdge,
};

// Define the base component
const FlowCanvasBase = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onNodeDragStop,
  onConnectStart,
  onConnectEnd,
  onMove,
  viewport,
  className,
  style,
  reactFlowRef,
  // New props for execution state
  nodeStates = new Map(),
  connectionStates = new Map(),
  isExecuting = false
}) => {
  // Context hooks
  const { setSelectedNode, canConnect } = useFlow();
  const { toggleTemplateGallery, showTemplateGallery } = useBuilderUI();
  
  // Local state
  const [connectionInfo, setConnectionInfo] = useState({ sourceType: null, targetType: null });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectionGuideModal, setShowConnectionGuideModal] = useState(false);
  const [connectionSourceType, setConnectionSourceType] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [showConnectionDiagram, setShowConnectionDiagram] = useState(false);
  
  // Refs
  const reactFlowWrapper = useRef(null);
  const flowInstance = useRef(null);
  
  // Memoized values
  const customNodeTypes = useMemo(() => nodeTypes, []);
  const customEdgeTypes = useMemo(() => edgeTypes, []);

  // Enhanced nodes with execution state
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => {
      const nodeState = nodeStates.get(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          executionState: nodeState || { status: 'idle', progress: 0, time: 0, cost: 0 },
          resultDisplay: node.data?.result ? <NodeResultDisplay result={node.data.result} /> : null
        }
      };
    });
  }, [nodes, nodeStates]);

  // Enhanced edges with connection state
  const enhancedEdges = useMemo(() => {
    return edges.map(edge => {
      const connectionState = connectionStates.get(edge.id);
      return {
        ...edge,
        type: 'animated', // Use our AnimatedEdge
        data: {
          ...edge.data,
          ...connectionState,
          isActive: connectionState?.state === 'active' || connectionState?.state === 'processing',
          sourceType: nodes.find(n => n.id === edge.source)?.type,
          targetType: nodes.find(n => n.id === edge.target)?.type,
        },
        animated: connectionState?.state === 'active' || connectionState?.state === 'processing' || isExecuting,
        style: {
          ...edge.style,
          strokeWidth: connectionState?.state === 'active' ? 3 : 2,
          stroke: connectionState?.state === 'success' ? '#10b981' : 
                  connectionState?.state === 'error' ? '#ef4444' :
                  connectionState?.state === 'active' ? '#3b82f6' : '#9ca3af'
        }
      };
    });
  }, [edges, connectionStates, nodes, isExecuting]);

  // Validate connections
  const isValidConnection = useCallback((params) => {
    return validateConnection(params, nodes, edges, toast);
  }, [nodes, edges]);

  // Fit view handler
  const handleFitView = useCallback(() => {
    if (flowInstance.current) {
      flowInstance.current.fitView({ padding: 0.2 });
    }
  }, []);

  // Connect event handlers
  const handleConnectStart = useCallback((event, { nodeId, handleType }) => {
    const sourceNode = nodes.find(node => node.id === nodeId);
    if (sourceNode) {
      setConnectionInfo({
        sourceType: sourceNode.type,
        targetType: null
      });
      setIsConnecting(true);
    }
    if (onConnectStart) {
      onConnectStart(event, { nodeId, handleType });
    }
  }, [nodes, onConnectStart]);

  const handleConnectStop = useCallback((event) => {
    setConnectionInfo({ sourceType: null, targetType: null });
    setIsConnecting(false);
    if (onConnectEnd) {
      onConnectEnd(event);
    }
  }, [onConnectEnd]);

  // Handle connection guide modal
  useEffect(() => {
    const handleShowConnectionGuide = (e) => {
      setShowConnectionGuideModal(true);
      if (e.detail && e.detail.sourceType) {
        setConnectionSourceType(e.detail.sourceType);
      } else {
        setConnectionSourceType(null);
      }
    };

    document.addEventListener('show-connection-guide', handleShowConnectionGuide);
    
    return () => {
      document.removeEventListener('show-connection-guide', handleShowConnectionGuide);
    };
  }, []);

  // Handle edge click (with deletion confirmation)
  const handleEdgeClick = useCallback((event, edge) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      onEdgesChange([{ id: edge.id, type: 'remove' }]);
      toast.success('Connection deleted');
    }
  }, [onEdgesChange]);

  // Highlight nodes by type
  const highlightNodesByType = useCallback((nodeType) => {
    const updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        highlighted: node.type === nodeType
      }
    }));
    
    onNodesChange(updatedNodes);
    
    // Clear the highlight after a few seconds
    setTimeout(() => {
      onNodesChange(nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          highlighted: false
        }
      })));
    }, 3000);
  }, [nodes, onNodesChange]);

  // Handle node clicks - select the node
  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(event, node);
    }
  }, [onNodeClick, setSelectedNode]);

  // Store ReactFlow instance globally for connection animations
  useEffect(() => {
    if (flowInstance.current) {
      window.reactFlowInstance = flowInstance.current;
    }
  }, [flowInstance.current]);

  return (
    <div className={`h-full relative ${className}`} ref={reactFlowWrapper} style={{ width: '100%', height: '100vh', ...style }}>
      {/* Connection Guide Modal */}
      <ConnectionGuide 
        isVisible={showConnectionGuideModal} 
        sourceType={connectionSourceType}
        onClose={() => setShowConnectionGuideModal(false)}
      />
      
      {/* Active Connection Guide */}
      {isConnecting && (
        <div className="active-connection-guide">
          <div className="guide-content">
            {connectionInfo.sourceType ? `Connecting from: ${connectionInfo.sourceType}` : 'Click and drag to connect nodes'}
          </div>
        </div>
      )}
      
      {/* Execution Status Indicator */}
      {isExecuting && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="font-medium">Workflow Executing...</span>
          </div>
        </div>
      )}
      
      {/* Connection Diagram */}
      <ConnectionDiagram 
        isVisible={showConnectionDiagram} 
        onClose={() => setShowConnectionDiagram(false)} 
      />
      
      {/* ReactFlow Component */}
      <ReactFlow
        ref={reactFlowRef}
        nodes={enhancedNodes}
        edges={enhancedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(params) => {
          // Validation logic
          const sourceNode = nodes.find(n => n.id === params.source);
          const targetNode = nodes.find(n => n.id === params.target);
          const sourceType = sourceNode?.type || 'unknown';
          const targetType = targetNode?.type || 'unknown';
          
          // Check for trigger node rules
          if (sourceNode?.type === 'trigger') {
            const existingTriggerWithConnections = edges.some(edge => {
              const edgeSourceNode = nodes.find(n => n.id === edge.source);
              return edgeSourceNode?.type === 'trigger' && edge.source !== params.source;
            });
            
            if (existingTriggerWithConnections) {
              toast.error("Only one trigger node can be active in a flow");
              return;
            }
          }

          // Validate the connection
          const isValid = isValidConnection(params);
          
          if (isValid) {
            if (onConnect) {
              onConnect(params);
            }
          } else {
            toast.error(`Invalid connection: ${sourceType} → ${targetType}`);
          }
        }}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectStop}
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        nodeTypes={customNodeTypes}
        edgeTypes={customEdgeTypes}
        connectionLineComponent={ConnectionLine}
        isValidConnection={isValidConnection}
        className={className}
        style={style}
        fitView
        onInit={(reactFlowInstance) => {
          flowInstance.current = reactFlowInstance;
          reactFlowWrapper.current.reactFlowInstance = reactFlowInstance;
          window.reactFlowInstance = reactFlowInstance; // Store globally for animations
        }}
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        snapToGrid={true}
        snapGrid={[15, 15]}
        // Enhanced default edge options for better animations
        defaultEdgeOptions={{
          type: 'animated',
          animated: isExecuting,
          style: {
            strokeWidth: 2,
            stroke: '#9ca3af',
          },
        }}
      >
        <MiniMap 
          nodeStrokeColor={(n) => {
            const nodeState = nodeStates.get(n.id);
            if (nodeState?.status === 'processing') return '#3b82f6';
            if (nodeState?.status === 'success') return '#10b981';
            if (nodeState?.status === 'error') return '#ef4444';
            
            if (n.type === 'agent') return '#0088FF';
            if (n.type === 'task') return '#00FF88';
            if (n.type === 'tool') return '#FF8800';
            if (n.type === 'trigger') return '#9C27B0';
            return '#FF0000';
          }}
          nodeColor={(n) => {
            const nodeState = nodeStates.get(n.id);
            if (nodeState?.status === 'processing') return '#3b82f630';
            if (nodeState?.status === 'success') return '#10b98130';
            if (nodeState?.status === 'error') return '#ef444430';
            
            if (n.type === 'agent') return '#0088FF30';
            if (n.type === 'task') return '#00FF8830';
            if (n.type === 'tool') return '#FF880030';
            if (n.type === 'trigger') return '#9C27B030';
            return '#FF000030';
          }}
          style={{
            backgroundColor: '#f8f8f8',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}
        />
        
        <ZoomControls
          zoomIn={() => flowInstance.current?.zoomIn()}
          zoomOut={() => flowInstance.current?.zoomOut()}
          resetView={() => flowInstance.current?.setViewport({ x: 0, y: 0, zoom: 1 })}
          fitView={() => flowInstance.current?.fitView({ padding: 0.2 })}
        />
        
        <Background
          variant="dots"
          gap={12}
          size={1}
          color="#e0e0e0"
          style={{ backgroundColor: '#ffffff' }}
        />
        
        <FloatingMetricsPanel 
          nodes={enhancedNodes} 
          edges={enhancedEdges} 
          onHighlightNodes={highlightNodesByType}
          nodeStates={nodeStates}
          connectionStates={connectionStates}
          isExecuting={isExecuting}
        />
      </ReactFlow>
      
      {/* Bottom controls */}
      <div className="flow-controls">
        <button 
          onClick={handleFitView}
          className="control-button fit-view"
          title="Fit view to all nodes"
        >
          Fit View
        </button>
        <button 
          onClick={() => toggleTemplateGallery()}
          className="control-button template-gallery"
          title="Browse templates"
        >
          {showTemplateGallery ? 'Hide Templates' : 'Show Templates'}
        </button>
        <button 
          onClick={() => setShowConnectionDiagram(true)}
          className="control-button connection-diagram"
          title="Show connection rules"
        >
          Connection Rules
        </button>
      </div>

      {/* Template Gallery */}
      {showTemplateGallery && <TemplateGallery />}

      {/* Debug controls */}
      <button 
        onClick={() => setDebugMode(!debugMode)}
        className="debug-toggle-button"
      >
        {debugMode ? 'Hide Debug' : 'Debug'}
      </button>
      
      {/* Debug panel */}
      {debugMode && (
        <DebugPanel 
          nodes={enhancedNodes}
          edges={enhancedEdges}
          isConnecting={isConnecting}
          connectionInfo={connectionInfo}
          nodeStates={nodeStates}
          connectionStates={connectionStates}
          isExecuting={isExecuting}
        />
      )}
    </div>
  );
};

FlowCanvasBase.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  onNodesChange: PropTypes.func.isRequired,
  onEdgesChange: PropTypes.func.isRequired,
  onConnect: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func,
  onEdgeClick: PropTypes.func,
  onNodeDragStop: PropTypes.func,
  onConnectStart: PropTypes.func,
  onConnectEnd: PropTypes.func,
  onMove: PropTypes.func,
  viewport: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    zoom: PropTypes.number
  }),
  className: PropTypes.string,
  style: PropTypes.object,
  reactFlowRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any })
  ]),
  // New props for execution state
  nodeStates: PropTypes.instanceOf(Map),
  connectionStates: PropTypes.instanceOf(Map),
  isExecuting: PropTypes.bool
};

// Define the FlowCanvass component with forwardRef
const FlowCanvass = forwardRef((props, ref) => (
  <ReactFlowProvider>
    <FlowCanvasBase {...props} reactFlowRef={ref} />
  </ReactFlowProvider>
));

FlowCanvass.displayName = 'FlowCanvass';

// Export the memoized component
export default memo(FlowCanvass);