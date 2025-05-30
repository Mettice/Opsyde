import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useBuilderUI } from '../../contexts/BuilderUIContext';
import { saveFlow, updateFlow } from '../../api';

export function useWorkflowExport({
  projectName,
  nodes,
  edges,
  currentFlowId,
  user,
  navigate,
  cleanNodesForSave,
  addNotification,
  setNodes,
  setEdges,
  setProjectName
}) {
  const { closeEditModal } = useBuilderUI();
  
  // Save project to backend
  const saveProject = useCallback(async () => {
    // Validation
    if (!projectName.trim()) {
      toast.error("Please provide a project name");
      return;
    }
    
    if (nodes.length === 0) {
      toast.error("Cannot save an empty workflow");
      return;
    }
    
    if (!user) {
      toast.error("Please sign in to save your flow");
      navigate('/login');
      return;
    }
    
    try {
      // Clean the nodes before saving
      const cleanedNodes = cleanNodesForSave(nodes);
      
      if (currentFlowId) {
        // Update existing flow
        await updateFlow(currentFlowId, projectName, cleanedNodes, edges);
        toast.success('Flow updated successfully');
        addNotification({
          message: 'Flow updated successfully',
          type: 'success'
        });
      } else {
        // Create new flow
        const { data } = await saveFlow(user.id, projectName, cleanedNodes, edges);
        if (data && data[0]) {
          setCurrentFlowId(data[0].id);
        }
        toast.success('Flow saved successfully');
        addNotification({
          message: 'Flow saved successfully',
          type: 'success'
        });
      }
      
      // Close any open modals
      closeEditModal();
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error('Failed to save flow: ' + error.message);
      addNotification({
        message: 'Failed to save flow: ' + error.message,
        type: 'error'
      });
    }
  }, [
    projectName, nodes, edges, user, currentFlowId,
    navigate, cleanNodesForSave, closeEditModal, addNotification
  ]);
  
  // Load project from backend or file
  const loadProject = useCallback(() => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const projectData = JSON.parse(event.target.result);
          
          // Validate the imported data
          if (!projectData.nodes || !Array.isArray(projectData.nodes)) {
            throw new Error('Invalid project data: missing or invalid nodes');
          }
          
          // Set project name
          if (projectData.name && setProjectName) {
            setProjectName(projectData.name);
          }
          
          // Import nodes and edges
          if (setNodes && setEdges) {
            setNodes(projectData.nodes || []);
            setEdges(projectData.edges || []);
          }
          
          toast.success('Project loaded successfully!');
          addNotification({
            message: `Project "${projectData.name || 'Untitled'}" loaded successfully`,
            type: 'success'
          });
        } catch (error) {
          console.error("Error loading project:", error);
          toast.error("Failed to load project. The file may be corrupted or in an invalid format.");
          addNotification({
            message: 'Failed to load project: ' + error.message,
            type: 'error'
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addNotification, setNodes, setEdges, setProjectName]);
  
  // Export to YAML
  const exportYAML = useCallback(() => {
    try {
      // Implementation for YAML export
      if (nodes.length === 0) {
        toast.error("Cannot export an empty workflow");
        return;
      }
      
      // Clean the nodes
      const cleanedNodes = cleanNodesForSave(nodes);
      
      // Format data for YAML export
      const flowData = {
        name: projectName,
        nodes: cleanedNodes.map(node => ({
          id: node.id,
          type: node.type,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target
        }))
      };
      
      // Generate YAML
      // ... YAML generation code ...
      
      // Download file
      const yamlString = JSON.stringify(flowData, null, 2); // Placeholder
      const blob = new Blob([yamlString], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('YAML exported successfully');
      addNotification({
        message: 'YAML exported successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting YAML:', error);
      toast.error('Failed to export YAML: ' + error.message);
    }
  }, [projectName, nodes, edges, cleanNodesForSave, addNotification]);
  
  // Export to Python
  const exportMainPy = useCallback(() => {
    try {
      if (nodes.length === 0) {
        toast.error("Cannot export an empty workflow");
        return;
      }
      
      // Clean the nodes
      const cleanedNodes = cleanNodesForSave(nodes);
      
      // Generate Python code
      let pythonCode = `# ${projectName}\n`;
      pythonCode += `# Generated from flow builder\n\n`;
      pythonCode += `import os\n`;
      pythonCode += `import asyncio\n\n`;
      
      // Add code for each node type
      // ... Python code generation ...
      
      // Download file
      const blob = new Blob([pythonCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}.py`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Python code exported successfully');
      addNotification({
        message: 'Python code exported successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting Python:', error);
      toast.error('Failed to export Python: ' + error.message);
    }
  }, [projectName, nodes, edges, cleanNodesForSave, addNotification]);
  
  // Export to JSON
  const exportProject = useCallback((format = 'json') => {
    try {
      if (nodes.length === 0) {
        toast.error("Cannot export an empty workflow");
        return;
      }
      
      // Clean the nodes
      const cleanedNodes = cleanNodesForSave(nodes);
      
      // Format data for export
      const flowData = {
        name: projectName,
        nodes: cleanedNodes,
        edges: edges,
        metadata: {
          createdAt: new Date().toISOString(),
          format: format
        }
      };
      
      // Download file
      const content = JSON.stringify(flowData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Project exported successfully');
      addNotification({
        message: 'Project exported successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting project:', error);
      toast.error('Failed to export project: ' + error.message);
    }
  }, [projectName, nodes, edges, cleanNodesForSave, addNotification]);
  
  return {
    saveProject,
    loadProject,
    exportYAML,
    exportMainPy,
    exportProject
  };
}