// hooks/useNodeInteractions.js
import { useCallback, useRef } from 'react';
import { addEdge } from 'reactflow';
import toast from 'react-hot-toast';
import { normalizeType } from '../utils/nodeHelpers';
import { validateConnection } from '../utils/validateConnection';


export const useNodeInteractions = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  addToHistory,
  setSelectedNode,
  setShowEditModal
}) => {
  const connectingNodeId = useRef(null);

  // Node edit handler
  const handleNodeEdit = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // Normalize the node type
      let normalizedType = node.type;
      if (normalizedType === 'agentNode') normalizedType = 'agent';
      if (normalizedType === 'taskNode') normalizedType = 'task';
      if (normalizedType === 'toolNode') normalizedType = 'tool';
      
      setSelectedNode({
        ...node,
        type: normalizedType // Use the normalized type
      });
      setShowEditModal(true);
    }
  }, [nodes, setSelectedNode, setShowEditModal]);
  
  // Node delete handler
  const handleNodeDelete = useCallback((nodeId) => {
    setNodes((nodes) => nodes.filter(node => node.id !== nodeId));
    setEdges((edges) => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    
    // Add to history
    addToHistory({ 
      nodes: nodes.filter(node => node.id !== nodeId), 
      edges: edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId) 
    });
  }, [nodes, edges, setNodes, setEdges, addToHistory]);

  // Handle node click for selection
  const onNodeClick = useCallback((event, node) => {
    console.log('Node clicked:', node);
    // Only for selection, not editing
  }, []);

  // Handle node drag stop
  const onNodeDragStop = useCallback((event, node) => {
    if (!node || !node.id) {
      console.warn("Node drag stopped with invalid node:", node);
      return;
    }

    const originalNode = nodes.find(n => n.id === node.id);
    if (!originalNode) {
      console.warn(`Original node with id ${node.id} not found in workflow`);
      return;
    }

    if (
      originalNode.position.x === node.position.x &&
      originalNode.position.y === node.position.y
    ) {
      return;
    }
    
    addToHistory({ nodes, edges });
  }, [nodes, edges, addToHistory]);

  // Connection handlers
  const onConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  const onConnectEnd = useCallback(() => {
    connectingNodeId.current = null;
  }, []);

  const onConnect = useCallback((params) => {
    const isValid = validateConnection(params, nodes, edges, toast);

    if (!isValid) return;

    const edgeId = `edge-${Date.now()}`;

    const newEdge = {
      ...params,
      id: edgeId,
      type: "bezier",
      animated: true,
      style: {
        stroke: '#888',
        strokeWidth: 1.5,
        strokeDasharray: '5,5'
      },
      data: {
        label: `${params.source} → ${params.target}`
      }
    };

    setEdges((eds) => addEdge(newEdge, eds));

    toast.success("Connection added!");

    addToHistory({
      nodes,
      edges: [...edges, newEdge]
    });
  }, [nodes, edges, setEdges, addToHistory]);

  // Edge click handler
  const onEdgeClick = useCallback((event, edge) => {
    // Confirm before deleting
    if (window.confirm('Are you sure you want to delete this connection?')) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      
      // Add to history
      addToHistory({
        nodes,
        edges: edges.filter((e) => e.id !== edge.id)
      });
      
      toast.success('Connection deleted');
    }
  }, [nodes, edges, setEdges, addToHistory]);

  return {
    handleNodeEdit,
    handleNodeDelete,
    onNodeClick,
    onNodeDragStop,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onEdgeClick
  };
};