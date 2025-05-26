import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// Create context
const FlowContext = createContext(null);

// Hook to use the Flow context
export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

// Flow Provider component
export const FlowProvider = ({ children }) => {
  // Flow state
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [projectName, setProjectName] = useState("Untitled Workflow");
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState(uuidv4());
  const [inputs, setInputs] = useState({});
  
  // History for undo/redo
  const historyRef = useRef({
    past: [],
    future: []
  });

  // Handle node changes
  const onNodesChange = useCallback((changes) => {
    // Save current state to history
    historyRef.current.past.push({ nodes, edges });
    historyRef.current.future = [];
    
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [nodes, edges, setNodes]);

  // Handle edge changes
  const onEdgesChange = useCallback((changes) => {
    // Save current state to history
    historyRef.current.past.push({ nodes, edges });
    historyRef.current.future = [];
    
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [nodes, edges, setEdges]);

  // Handle connections
  const onConnect = useCallback((params) => {
    // Save current state to history
    historyRef.current.past.push({ nodes, edges });
    historyRef.current.future = [];
    
    setEdges((eds) => addEdge(params, eds));
  }, [nodes, edges, setEdges]);

  // Validate if a connection can be made
  const canConnect = useCallback((source, target) => {
    // Add your validation logic here
    return true;
  }, []);

  // Handle node drag stop
  const onNodeDragStop = useCallback((event, node) => {
    // Any logic to run when a node stops being dragged
  }, []);

  // Clean nodes for saving (remove runtime-specific properties)
  const cleanNodesForSave = useCallback(() => {
    return nodes.map(node => {
      const { data, ...rest } = node;
      const cleanedData = { ...data };
      
      // Remove runtime-specific properties
      delete cleanedData.resultDisplay;
      
      return {
        ...rest,
        data: cleanedData
      };
    });
  }, [nodes]);

  // Apply template function
  const applyTemplate = useCallback((template) => {
    // Save current state to history
    historyRef.current.past.push({ nodes, edges });
    historyRef.current.future = [];
    
    if (template.nodes && template.edges) {
      // It's a complete flow template
      const idMapping = {};
      
      // Create nodes with new IDs
      const newNodes = template.nodes.map(node => {
        const newId = `${node.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        idMapping[node.id] = newId;
        
        return {
          ...node,
          id: newId,
          data: {
            ...node.data,
            nodeId: newId
          }
        };
      });
      
      // Update edge references with new IDs
      const newEdges = template.edges.map(edge => {
        const newId = `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        return {
          ...edge,
          id: newId,
          source: idMapping[edge.source],
          target: idMapping[edge.target]
        };
      });
      
      // Set the new nodes and edges
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      // It's a single node template
      const newId = `${template.type}-${Date.now()}`;
      const newNode = {
        id: newId,
        type: template.type,
        position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
        data: {
          label: template.name || `New ${template.type}`,
          nodeId: newId,
          nodeType: template.type,
          ...template.data
        }
      };
      
      setNodes(prev => [...prev, newNode]);
    }
  }, [nodes, edges, setNodes, setEdges]);

  // Context value
  const value = {
    nodes, setNodes,
    edges, setEdges,
    selectedNode, setSelectedNode,
    projectName, setProjectName,
    editingProjectName, setEditingProjectName,
    currentFlowId, setCurrentFlowId,
    inputs, setInputs,
    onNodesChange,
    onEdgesChange,
    onConnect,
    canConnect,
    onNodeDragStop,
    cleanNodesForSave,
    applyTemplate,
    history: historyRef.current
  };

  return (
    <FlowContext.Provider value={value}>
      {children}
    </FlowContext.Provider>
  );
}; 