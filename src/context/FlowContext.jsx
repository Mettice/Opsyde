import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { validateConnection } from '../utils/validateConnection';
import { memoizedRecommendTemplates as recommendTemplates } from '../utils/memoizedRecommendTemplates';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';

// Create the context
const FlowContext = createContext(null);

// Custom hook to use the flow context
export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

// Provider component
export const FlowProvider = ({ children }) => {
  // Initialize with empty arrays
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState({ sourceType: null, targetType: null });
  const [connectionSourceType, setConnectionSourceType] = useState(null);
  
  // UI state
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showConnectionRules, setShowConnectionRules] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showConnectionGuideModal, setShowConnectionGuideModal] = useState(false);
  const [showConnectionDiagram, setShowConnectionDiagram] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  
  // Handle connections
  const onConnect = useCallback((params) => {
    if (isValidConnection(params)) {
      setEdges((eds) => addEdge(params, eds));
    }
  }, []);

  const handleConnectStart = useCallback((event, { nodeId, handleType }) => {
    const sourceNode = nodes.find(node => node.id === nodeId);
    if (sourceNode) {
      setConnectionInfo({
        sourceType: sourceNode.type,
        targetType: null
      });
      setIsConnecting(true);
    }
  }, [nodes]);

  const handleConnectStop = useCallback(() => {
    setConnectionInfo({ sourceType: null, targetType: null });
    setIsConnecting(false);
  }, []);

  const handleEdgeClick = useCallback((event, edge) => {
    const isConfirmed = window.confirm('Are you sure you want to remove this connection?');
    if (isConfirmed) {
      setEdges(edges => edges.filter(e => e.id !== edge.id));
    }
  }, [setEdges]);

  const isValidConnection = useCallback((params) => {
    return validateConnection(params, nodes, edges, toast);
  }, [nodes, edges]);

  const getNewNodePosition = (nodes) => {
    if (!nodes.length) {
      return { x: 100, y: 100 };
    }
    
    // Find the rightmost node
    const rightmostNode = nodes.reduce((max, node) => 
      node.position.x > max.position.x ? node : max
    );
    
    // Position the new node to the right of the rightmost node
    return {
      x: rightmostNode.position.x + 250,
      y: rightmostNode.position.y
    };
  };

  const handleApplyTemplate = useCallback((template) => {
    if (!template) return;
    
    if (template.nodes && template.edges) {
      setNodes(template.nodes);
      setEdges(template.edges);
    } else {
      const newNode = {
        id: `${template.type}-${Date.now()}`,
        type: template.type,
        position: getNewNodePosition(nodes),
        data: {
          ...template,
          nodeId: `${template.type}-${Date.now()}`,
          nodeType: template.type
        }
      };
      setNodes(nodes => [...nodes, newNode]);
    }
  }, [nodes, setNodes, setEdges]);

  // Memoize the context value
  const value = useMemo(() => ({
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    handleConnectStart,
    handleConnectStop,
    handleEdgeClick,
    isConnecting,
    connectionInfo,
    showTemplateGallery,
    setShowTemplateGallery,
    showConnectionRules,
    setShowConnectionRules,
    showRecommendations,
    setShowRecommendations,
    showConnectionGuideModal,
    setShowConnectionGuideModal,
    showConnectionDiagram,
    setShowConnectionDiagram,
    debugMode,
    setDebugMode,
    connectionSourceType,
    setConnectionSourceType,
    recommendations,
    setRecommendations,
    handleApplyTemplate
  }), [
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    handleConnectStart,
    handleConnectStop,
    handleEdgeClick,
    isConnecting,
    connectionInfo,
    showTemplateGallery,
    showConnectionRules,
    showRecommendations,
    showConnectionGuideModal,
    showConnectionDiagram,
    debugMode,
    connectionSourceType,
    recommendations,
    handleApplyTemplate
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newRecommendations = recommendTemplates(nodes, edges);
      setRecommendations(newRecommendations);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);

  return (
    <FlowContext.Provider value={value}>
      {children}
    </FlowContext.Provider>
  );
};