// hooks/useWorkflowExport.js
import { useCallback } from 'react';
import { saveAs } from 'file-saver';
import yaml from 'js-yaml';
import toast from 'react-hot-toast';
import { exportProjectWithStructure, generateMainPyFile } from '../utils/exportProject';

export const useWorkflowExport = ({
  projectName,
  nodes,
  edges,
  setNodes,
  setEdges,
  setProjectName,
  addToHistory,
  handleNodeEdit,
  handleNodeDelete
}) => {
  // Export to YAML format
  const exportYAML = useCallback(() => {
    try {
      // Create a clean representation of the workflow
      const workflow = {
        name: projectName,
        agents: nodes
          .filter(node => node.type === 'agent')
          .map(node => {
            const { data } = node;
            return {
              id: node.id,
              name: data.label,
              role: data.role,
              goal: data.goal,
              backstory: data.backstory,
              llm: data.llmModel,
              allow_delegation: data.allowDelegation,
              verbose: data.verbose
            };
          }),
        tasks: nodes
          .filter(node => node.type === 'task')
          .map(node => {
            const { data } = node;
            
            // Find connected agents (assigned to this task)
            const assignedAgents = edges
              .filter(edge => edge.target === node.id)
              .map(edge => nodes.find(n => n.id === edge.source))
              .filter(n => n && n.type === 'agent')
              .map(n => n.id);
            
            // Find connected tools
            const usedTools = edges
              .filter(edge => edge.target === node.id)
              .map(edge => nodes.find(n => n.id === edge.source))
              .filter(n => n && n.type === 'tool')
              .map(n => n.id);
            
            // Find task dependencies
            const dependencies = edges
              .filter(edge => edge.target === node.id)
              .map(edge => nodes.find(n => n.id === edge.source))
              .filter(n => n && n.type === 'task')
              .map(n => n.id);
            
            return {
              id: node.id,
              name: data.label,
              description: data.description,
              expected_output: data.expectedOutput,
              agent: assignedAgents[0] || null,
              tools: usedTools,
              dependencies,
              async: data.async
            };
          }),
        tools: nodes
          .filter(node => node.type === 'tool')
          .map(node => {
            const { data } = node;
            return {
              id: node.id,
              name: data.label,
              description: data.description,
              type: data.toolType,
              api_endpoint: data.apiEndpoint,
              parameters: data.parameters ? data.parameters.split('\n').filter(p => p.trim()) : []
            };
          })
      };
      
      const yamlStr = yaml.dump(workflow, { indent: 2 });
      const blob = new Blob([yamlStr], { type: 'text/yaml' });
      saveAs(blob, `${projectName.replace(/\s+/g, '_').toLowerCase()}.yaml`);
      toast.success('YAML configuration exported successfully!');
    } catch (error) {
      console.error("Error exporting YAML:", error);
      toast.error("Failed to export YAML. Please try again.");
    }
  }, [projectName, nodes, edges]);

  // Export as Python main.py file
  const exportMainPy = useCallback(() => {
    try {
      let pythonCode = `import asyncio
from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool

config = {
    "verbose": True,
    "process": Process.SEQUENTIAL,
}

agents = {}
`;
      const agentNodes = nodes.filter(n => n.type === 'agent');
      if (agentNodes.length > 0) {
        pythonCode += '\n# Create agents\n';
        agentNodes.forEach(node => {
          pythonCode += `agents["${node.id}"] = Agent(
    name="${node.data.label}",
    role="${node.data.role || 'Assistant'}",
    goal="${node.data.goal || 'Help accomplish tasks'}",
    backstory="${node.data.backstory || ''}",
    verbose=${node.data.verbose ? 'True' : 'False'},
    allow_delegation=${node.data.allowDelegation ? 'True' : 'False'},
    llm="${node.data.llmModel || 'gpt-4'}"
)
`;
        });
      }
      
      const toolNodes = nodes.filter(n => n.type === 'tool');
      if (toolNodes.length > 0) {
        pythonCode += '\n# Create tools\ntools = {}\n';
        toolNodes.forEach(node => {
          const toolClassName = node.data.label.replace(/\s+/g, '') + 'Tool';
          const paramsList = node.data.parameters ? 
            node.data.parameters.split('\n')
              .map(p => p.trim())
              .filter(p => p)
              .join(', ') : '';
            
          pythonCode += `
class ${toolClassName}(BaseTool):
    name = "${node.data.label}"
    description = "${node.data.description || 'A tool'}"
    
    def _run(self, ${paramsList}) -> str:
        # TODO: Implement ${node.data.label} functionality
        return "Result from ${node.data.label}"

tools["${node.id}"] = ${toolClassName}()
`;
        });
      }
      
      const taskNodes = nodes.filter(n => n.type === 'task');
      if (taskNodes.length > 0) {
        // First define task variables without dependencies
        pythonCode += '\n# Create tasks\ntasks = []\n';
        
        // Create task variables first
        taskNodes.forEach((node, index) => {
          pythonCode += `task${index + 1} = Task(\n`;
          pythonCode += `    description="${node.data.description || 'Task description'}",\n`;
          pythonCode += `    expected_output="${node.data.expectedOutput || 'Expected output'}",\n`;
          
          const assignedAgentEdges = edges.filter(e => e.target === node.id && agentNodes.some(a => a.id === e.source));
          const assignedAgent = assignedAgentEdges.length > 0 
            ? `agents["${assignedAgentEdges[0].source}"]`
            : 'None  # TODO: Assign an agent to this task';
          pythonCode += `    agent=${assignedAgent},\n`;
          
          const usedToolsEdges = edges.filter(e => e.target === node.id && toolNodes.some(t => t.id === e.source));
          if (usedToolsEdges.length > 0) {
            pythonCode += `    tools=[${usedToolsEdges.map(e => `tools["${e.source}"]`).join(', ')}],\n`;
          } else {
            pythonCode += `    tools=[],\n`;
          }
          
          pythonCode += `    async_execution=${node.data.async ? 'True' : 'False'}\n`;
          pythonCode += `)\n`;
          pythonCode += `tasks.append(task${index + 1})\n\n`;
        });
        
        // Now add dependencies
        taskNodes.forEach((node, index) => {
          const dependencyEdges = edges.filter(e => e.target === node.id && taskNodes.some(t => t.id === e.source));
          if (dependencyEdges.length > 0) {
            pythonCode += `# Add dependencies for task${index + 1}\n`;
            pythonCode += `task${index + 1}.dependencies = [`;
            
            const deps = dependencyEdges.map(e => {
              const sourceIndex = taskNodes.findIndex(t => t.id === e.source);
              return `task${sourceIndex + 1}`;
            });
            
            pythonCode += deps.join(', ');
            pythonCode += `]\n\n`;
          }
        });
      }
      
      pythonCode += `
crew = Crew(
    agents=list(agents.values()),
    tasks=tasks,
    verbose=config["verbose"],
    process=config["process"]
)

async def main():
    result = await crew.kickoff()
    print("\\nResult:\\n", result)

if __name__ == "__main__":
    asyncio.run(main())
`;
      
      const blob = new Blob([pythonCode], { type: 'text/plain' });
      saveAs(blob, `${projectName.replace(/\s+/g, '_').toLowerCase()}_main.py`);
      toast.success('Python script exported successfully!');
    } catch (error) {
      console.error("Error exporting Python:", error);
      toast.error("Failed to export Python code. Please try again.");
    }
  }, [projectName, nodes, edges]);

  // Save project as JSON
  const saveProject = useCallback(() => {
    try {
      // Clean up workflow data for storage
      const cleanedNodes = nodes.map(node => {
        const { data, ...rest } = node;
        const cleanData = { ...data };
        
        // Remove callback functions before serialization
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        
        return {
          ...rest,
          data: cleanData,
        };
      });
      
      const projectData = {
        name: projectName,
        nodes: cleanedNodes,
        edges: edges,
        lastModified: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      saveAs(blob, `${projectName.replace(/\s+/g, '_').toLowerCase()}.json`);
      toast.success('Project saved successfully!');
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project. Please try again.");
    }
  }, [projectName, nodes, edges]);

  // Load project from JSON
  const loadProject = useCallback(() => {
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
          setProjectName(projectData.name || 'Imported Project');
          
          // Add callback functions to nodes
          const nodesWithCallbacks = projectData.nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onEdit: () => handleNodeEdit(node.id),
              onDelete: () => handleNodeDelete(node.id)
            }
          }));
          
          setNodes(nodesWithCallbacks);
          setEdges(projectData.edges || []);
          
          // Reset history with the loaded workflow
          addToHistory({ nodes: nodesWithCallbacks, edges: projectData.edges || [] });
          toast.success('Project loaded successfully!');
        } catch (error) {
          console.error("Error loading project:", error);
          toast.error("Failed to load project. The file may be corrupted or in an invalid format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handleNodeEdit, handleNodeDelete, setNodes, setEdges, setProjectName, addToHistory]);

  // Export full project with structure
  const exportProject = useCallback(() => {
    // Use a different variable name to avoid any circular reference
    const currentProjectName = projectName || 'crewai-project';
    
    // Show a loading toast
    const toastId = toast.loading('Preparing project export...');
    
    // First save the project in JSON format for later loading
    saveProject();
    
    // Then export the project structure (Python, YAML, etc.)
    exportProjectWithStructure(nodes, edges, currentProjectName)
      .then(success => {
        if (success) {
          // Also save the main.py content as JSON for easy reloading
          const mainPyContent = generateMainPyFile(currentProjectName);
          const mainPyJson = {
            projectName: currentProjectName,
            content: mainPyContent,
            timestamp: new Date().toISOString()
          };
          
          const jsonBlob = new Blob([JSON.stringify(mainPyJson, null, 2)], { type: 'application/json' });
          saveAs(jsonBlob, `${currentProjectName}_main.json`);
          
          toast.success('Project exported successfully!', { id: toastId });
        } else {
          toast.error('Failed to export project structure', { id: toastId });
        }
      })
      .catch(error => {
        console.error('Error exporting project:', error);
        toast.error(`Export failed: ${error.message}`, { id: toastId });
      });
  }, [nodes, edges, projectName, saveProject]);

  return {
    exportYAML,
    exportMainPy,
    saveProject,
    loadProject,
    exportProject
  };
};