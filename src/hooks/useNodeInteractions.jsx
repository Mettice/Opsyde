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
        type: normalizedType
      });
      setShowEditModal(true);
    }
  }, [nodes, setSelectedNode, setShowEditModal]);
  
  // Node delete handler
  const handleNodeDelete = useCallback((nodeId) => {
    // When deleting an agent, remove its ID from any tasks it was assigned to
    const node = nodes.find(n => n.id === nodeId);
    if (node?.type === 'agent') {
      setNodes(nodes => nodes.map(n => {
        if (n.type === 'task' && n.data?.agentId === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              agentId: undefined,
              agentName: undefined,
              agentRole: undefined
            }
          };
        }
        return n;
      }));
    }

    setNodes((nodes) => nodes.filter(node => node.id !== nodeId));
    setEdges((edges) => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    
    addToHistory({ 
      nodes: nodes.filter(node => node.id !== nodeId), 
      edges: edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId) 
    });
  }, [nodes, edges, setNodes, setEdges, addToHistory]);

  // Handle node click for selection
  const onNodeClick = useCallback((event, node) => {
    // Prevent event object from being logged
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Only log the node data we need, without the event object
    if (node) {
      console.log('Node clicked:', {
        id: node.id,
        type: node.type,
        label: node.data?.label
      });
    }
  }, []);

  // Handle node drag stop
  const onNodeDragStop = useCallback((event, node) => {
    // Prevent event object from being logged
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (!node || !node.id) {
      console.warn('Invalid node in drag stop:', { id: node?.id, type: node?.type });
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
    
    // Update node position
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            position: node.position,
          };
        }
        return n;
      })
    );
    
    addToHistory({ nodes, edges });
  }, [nodes, edges, addToHistory, setNodes]);

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
      console.error('Source or target node not found');
      return;
    }

    // Handle agent to task assignment
    if (sourceNode.type === 'agent' && targetNode.type === 'task') {
      console.log('Assigning agent to task:', {
        agent: sourceNode.data,
        task: targetNode.data
      });

      // Update the task node with agent information
      setNodes(nodes => nodes.map(node => {
        if (node.id === targetNode.id) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              agentId: sourceNode.id,
              agentName: sourceNode.data?.label || 'Unknown Agent',
              agentRole: sourceNode.data?.role || 'Assistant'
            }
          };
          console.log('Updated task node:', updatedNode);
          return updatedNode;
        }
        return node;
      }));
    }

    // Check if connection is valid
    const isValid = validateConnection(params, nodes, edges, toast);
    if (!isValid) return;

    // Generate edge ID and add edge
    const edgeId = `edge-${Date.now()}`;
    const newEdge = {
      ...params,
      id: edgeId,
      type: 'bezier',
      animated: true,
      data: {
        sourceType: sourceNode.type,
        targetType: targetNode.type
      }
    };

    setEdges(eds => addEdge(newEdge, eds));
    toast.success('Connection added!');

    addToHistory({
      nodes,
      edges: [...edges, newEdge]
    });
  }, [nodes, edges, setNodes, setEdges, addToHistory]);

  // Edge click handler
  const onEdgeClick = useCallback((event, edge) => {
    // Prevent event object from being logged
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

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