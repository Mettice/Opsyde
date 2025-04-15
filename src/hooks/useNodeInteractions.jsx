// hooks/useNodeInteractions.js
import { useCallback, useRef } from 'react';
import { addEdge } from 'reactflow';
import toast from 'react-hot-toast';
import { normalizeType } from '../utils/nodeHelpers';

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
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
  
    if (!sourceNode || !targetNode) {
      toast.error("Connection failed: source or target node not found");
      return;
    }
  
    const sourceType = normalizeType(sourceNode);
    const targetType = normalizeType(targetNode);
  
    console.log("🔌 Attempting connection:", sourceType, "→", targetType);
  
    let isValid = false;
    let message = '';
  
    if (sourceType === "tool" && targetType === "agent") {
      isValid = true;
      message = `✅ Agent "${targetNode.data.label}" will use tool "${sourceNode.data.label}".`;
    } else if (sourceType === "agent" && targetType === "task") {
      isValid = true;
      message = `✅ Agent "${sourceNode.data.label}" will perform task "${targetNode.data.label}".`;
    } else if (sourceType === "task" && targetType === "task") {
      isValid = true;
      message = `✅ Task "${targetNode.data.label}" depends on task "${sourceNode.data.label}".`;
    } else {
      // Invalid case messages
      if (sourceType === "task" && targetType === "agent") {
        message = `❌ Invalid: Tasks cannot assign agents. Use Agent → Task.`;
      } else if (sourceType === "agent" && targetType === "tool") {
        message = `❌ Invalid: Agents cannot directly link to Tools. Use Tool → Agent.`;
      } else if (sourceType === "tool" && targetType === "task") {
        message = `❌ Invalid: Tools cannot be assigned to Tasks directly. Connect Tool → Agent.`;
      } else {
        message = `❌ Invalid connection: ${sourceType} → ${targetType}`;
      }
    }
  
    if (!isValid) {
      toast.error(message);
      return;
    }
  
    // Add edge with styling
    const edgeId = `edge-${Date.now()}`;
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          id: edgeId,
          type: "bezier",
          animated: true,
          style: {
            stroke: '#888',
            strokeWidth: 1.5,
            strokeDasharray: '5,5'
          },
          data: { label: message }
        },
        eds
      )
    );
  
    toast.success(message);
  
    addToHistory({
      nodes,
      edges: [...edges, {
        ...params,
        id: edgeId,
        type: "bezier",
        animated: true,
        style: {
          stroke: '#888',
          strokeWidth: 1.5,
          strokeDasharray: '5,5'
        },
        data: { label: message }
      }]
    });
  }, [nodes, edges, setEdges, addToHistory]);

  return {
    handleNodeEdit,
    handleNodeDelete,
    onNodeClick,
    onNodeDragStop,
    onConnect,
    onConnectStart,
    onConnectEnd
  };
};