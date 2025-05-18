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
import { edgeTypes } from './flowcanvas/edgeTypes';

// Custom styles
import './flowcanvas/FlowCanvas.css';

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
  reactFlowRef
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

  // Process nodes to add result display components
  const processedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        resultDisplay: node.data?.result ? <NodeResultDisplay result={node.data.result} /> : null
      }
    }));
  }, [nodes]);

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
      
      {/* Connection Diagram */}
      <ConnectionDiagram 
        isVisible={showConnectionDiagram} 
        onClose={() => setShowConnectionDiagram(false)} 
      />
      
      {/* ReactFlow Component */}
      <ReactFlow
        ref={reactFlowRef}
        nodes={processedNodes}
        edges={edges}
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
        }}
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.type === 'agent') return '#0088FF';
            if (n.type === 'task') return '#00FF88';
            if (n.type === 'tool') return '#FF8800';
            if (n.type === 'trigger') return '#9C27B0';
            return '#FF0000';
          }}
          nodeColor={(n) => {
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
          nodes={nodes} 
          edges={edges} 
          onHighlightNodes={highlightNodesByType}
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
          nodes={nodes}
          edges={edges}
          isConnecting={isConnecting}
          connectionInfo={connectionInfo}
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
  ])
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