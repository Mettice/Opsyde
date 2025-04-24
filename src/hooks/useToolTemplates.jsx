// hooks/useToolTemplates.js
import { useCallback } from 'react';
import { getSafeNodePosition } from '../utils/getSafeNodePosition';
import { templateToNode } from '../utils/templateToNode';

export const useToolTemplates = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  addToHistory,
  handleNodeEdit,
  handleNodeDelete
}) => {
  // Add a new tool node
  const addTool = useCallback(() => {
    const id = `tool-${Date.now()}`;
    const newNode = {
      id,
      type: 'tool',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: 'New Tool',
        description: 'Tool description',
        toolType: 'api',
        apiEndpoint: '',
        parameters: '',
        nodeId: id,
        nodeType: 'tool'
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, setNodes, addToHistory]);

  // Select a tool from template
  const onSelectToolTemplate = useCallback((template) => {
    const id = `tool-${Date.now()}`;
    const newNode = {
      id,
      type: 'tool',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        ...template,
        nodeId: id,
        nodeType: 'tool',
        toolType: template.toolType === 'custom' ? 'custom' : (template.toolType || 'api'),
        customTool: template.toolType === 'custom' ? template.name.toLowerCase().replace(/\s+/g, '_') : undefined
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, setNodes, addToHistory]);

  // Handle selecting a tool from the registry
  const handleToolFromRegistry = useCallback((toolData) => {
    // Format parameters to be either a string or array
    let parameters = '';
    if (Array.isArray(toolData.parameters)) {
      parameters = toolData.parameters;
    } else if (typeof toolData.parameters === 'string') {
      parameters = toolData.parameters;
    } else if (typeof toolData.parameters === 'object' && toolData.parameters !== null) {
      parameters = Object.keys(toolData.parameters).join('\n');
    }

    const newNode = {
      id: `tool-${Date.now()}`,
      type: 'tool',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: toolData.name,
        description: toolData.description,
        toolType: toolData.type === 'custom' ? 'custom' : (toolData.type || 'api'),
        customTool: toolData.type === 'custom' ? toolData.name.toLowerCase().replace(/\s+/g, '_') : undefined,
        framework: typeof toolData.framework === 'string' ? toolData.framework : toolData.framework?.id || 'openrouter',
        frameworkConfig: typeof toolData.framework === 'object' ? toolData.framework : {},
        category: toolData.category,
        parameters: parameters,
        nodeId: `tool-${Date.now()}`,
        nodeType: 'tool',
        apiEndpoint: toolData.apiEndpoint || '',
        value: {}
      }
    };

    console.log('Adding new tool node:', newNode);
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, setNodes, addToHistory]);

  // Apply a complete flow template
  const applyFlowTemplate = useCallback((template) => {
    console.log("Applying template:", template);
    
    // If it's a flow template with nodes and edges
    if (template.nodes && template.edges) {
      try {
        // Generate new IDs for all nodes to avoid conflicts
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
              nodeId: newId,
              onEdit: () => handleNodeEdit(newId),
              onDelete: () => handleNodeDelete(newId)
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
        
        // Add to history
        addToHistory({ nodes: newNodes, edges: newEdges });
      } catch (error) {
        console.error("Error applying flow template:", error);
        alert("Failed to apply flow template. Please try again.");
      }
    } else {
      // It's a node template (agent, task, or tool)
      try {
        console.log("Creating node from template:", template);
        const newNode = templateToNode(template);
        console.log("Created node:", newNode);
        
        if (newNode) {
          // Position the node in a visible area
          const position = { 
            x: Math.random() * 300 + 100, 
            y: Math.random() * 300 + 100 
          };
          
          const nodeWithPosition = {
            ...newNode,
            position
          };
          
          setNodes(nodes => [...nodes, nodeWithPosition]);
          addToHistory({ 
            nodes: [...nodes, nodeWithPosition], 
            edges 
          });
        } else {
          console.error("Failed to create node from template:", template);
        }
      } catch (error) {
        console.error("Error creating node from template:", error, template);
      }
    }
  }, [handleNodeEdit, handleNodeDelete, setNodes, setEdges, nodes, edges, addToHistory]);

  return {
    addTool,
    onSelectToolTemplate,
    handleToolFromRegistry,
    applyFlowTemplate
  };
};