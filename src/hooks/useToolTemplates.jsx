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

    // Create a unique ID for the tool
    const toolId = `tool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create the new node
    const newNode = {
      id: toolId,
      type: 'tool',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: toolData.name,
        description: toolData.description,
        toolType: toolData.type || 'custom',
        customTool: toolData.customTool || (toolData.type === 'custom' ? toolData.name.toLowerCase().replace(/\s+/g, '_') : undefined),
        framework: typeof toolData.framework === 'string' ? toolData.framework : toolData.framework?.id || 'openrouter',
        frameworkConfig: typeof toolData.framework === 'object' ? toolData.framework : {},
        category: toolData.category,
        parameters: parameters,
        nodeId: toolId,
        nodeType: 'tool',
        apiEndpoint: toolData.apiEndpoint || '',
        value: {}
      }
    };

    console.log('Adding new tool node:', {
      id: newNode.id,
      type: newNode.type,
      toolType: newNode.data.toolType,
      customTool: newNode.data.customTool,
      framework: newNode.data.framework
    });

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
        
        // Rehydrate agent assignments
        const rehydratedNodes = newNodes.map(node => {
          if (node.type === 'task') {
            // Find any edge where this task is the target
            const agentEdge = newEdges.find(edge => {
              const sourceNode = newNodes.find(n => n.id === edge.source);
              return edge.target === node.id && sourceNode?.type === 'agent';
            });

            if (agentEdge) {
              const agentNode = newNodes.find(n => n.id === agentEdge.source);
              if (agentNode) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    agentId: agentNode.id,
                    agentName: agentNode.data?.label || 'Unknown Agent',
                    agentRole: agentNode.data?.role || 'Assistant'
                  }
                };
              }
            }
          }
          return node;
        });
        
        // Set the new nodes and edges
        setNodes(rehydratedNodes);
        setEdges(newEdges);
        
        // Add to history
        addToHistory({ nodes: rehydratedNodes, edges: newEdges });
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
  }, [handleNodeEdit, handleNodeDelete, setNodes, setEdges, addToHistory]);

  return {
    addTool,
    onSelectToolTemplate,
    handleToolFromRegistry,
    applyFlowTemplate
  };
};