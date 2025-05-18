import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ToolType } from './useNodeManagement';

export function useToolTemplates({
  addTool,
  addAgent,
  addNode
}) {
  // Apply template to add multiple nodes and edges
  const applyFlowTemplate = useCallback((template) => {
    try {
      // Implementation for applying a flow template
      if (!template || !template.nodes) {
        toast.error("Invalid template structure");
        return;
      }
      
      const idMap = {};
      const newNodes = [];
      const newEdges = [];
      
      // Create nodes from template
      template.nodes.forEach(node => {
        const oldId = node.id;
        const type = node.type;
        
        // Add the node based on its type
        let newId;
        switch (type) {
          case 'agent':
            newId = addAgent(node.data.framework || 'openrouter');
            break;
          case 'tool':
            newId = addTool(node.data.toolType || ToolType.API, node.data.framework || '');
            break;
          default:
            newId = addNode(type, node.data);
            break;
        }
        
        // Store the mapping from old to new ID
        if (newId) {
          idMap[oldId] = newId;
        }
      });
      
      // Create edges with updated IDs
      if (template.edges) {
        template.edges.forEach(edge => {
          const sourceId = idMap[edge.source];
          const targetId = idMap[edge.target];
          
          if (sourceId && targetId) {
            newEdges.push({
              id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              source: sourceId,
              target: targetId
            });
          }
        });
      }
      
      toast.success(`Applied template: ${template.name || 'Unnamed template'}`);
      return { newNodes, newEdges };
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template: ' + error.message);
      return null;
    }
  }, [addAgent, addTool, addNode]);
  
  // Select tool template
  const onSelectToolTemplate = useCallback((templateData) => {
    try {
      // Implementation for selecting a tool template
      const nodeId = addTool(
        templateData.toolType || ToolType.API,
        templateData.framework || ''
      );
      
      // If the template has more specific settings, update the node
      if (nodeId) {
        // Additional node configuration would go here
        
        toast.success(`Added tool: ${templateData.name || 'Unnamed tool'}`);
      }
    } catch (error) {
      console.error('Error selecting tool template:', error);
      toast.error('Failed to add tool: ' + error.message);
    }
  }, [addTool]);
  
  // Handle tool from registry
  const handleToolFromRegistry = useCallback((registryTool) => {
    try {
      // Implementation for handling a tool from registry
      if (!registryTool) {
        toast.error("Invalid tool data");
        return;
      }
      
      // Determine the tool type
      let toolType = ToolType.API;
      if (registryTool.type === 'llm') {
        toolType = ToolType.LLM;
      } else if (registryTool.type === 'webhook') {
        toolType = ToolType.WEBHOOK;
      }
      
      // Add the tool
      const nodeId = addTool(toolType, registryTool.framework || '');
      
      // If successfully added, update with registry data
      if (nodeId) {
        // Additional configuration would go here
        
        toast.success(`Added tool from registry: ${registryTool.name || 'Unnamed tool'}`);
      }
    } catch (error) {
      console.error('Error adding tool from registry:', error);
      toast.error('Failed to add tool from registry: ' + error.message);
    }
  }, [addTool]);
  
  return {
    applyFlowTemplate,
    onSelectToolTemplate,
    handleToolFromRegistry
  };
}