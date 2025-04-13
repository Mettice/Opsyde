// BuilderPage.js
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { saveAs } from 'file-saver';
import yaml from 'js-yaml';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';
import toast from 'react-hot-toast';

import FlowCanvas from '../components/FlowCanvas';
import HelpPanel from '../components/HelpPanel';
import PreviewMode from '../components/PreviewMode';
import EditModal from '../components/EditModal';
import ToolTemplates from '../components/templates/ToolTemplates';
import { getSafeNodePosition } from '../utils/getSafeNodePosition';
import { flowTemplates } from '../data/flowTemplates';
import { templateToNode } from '../utils/templateToNode';
import ConnectionLine from '../components/ConnectionLine';

// Add this function at the top of your file, outside any component
function inspectNode(node) {
  return {
    id: node.id,
    type: node.type,
    dataType: node.data?.nodeType,
    label: node.data?.label,
    rawNode: { ...node }
  };
}

// Memoized Toolbar to avoid unnecessary re-renders
const Toolbar = React.memo(({
  onAddAgent,
  onAddTask,
  onAddTool,
  onExportYAML,
  onExportPython,
  onSaveProject,
  onLoadProject,
  onPreviewWorkflow,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenTemplates,
}) => (
  <div className="cursor-move select-none">
    <div className="bg-white border-b p-2 flex space-x-2 overflow-x-auto">
      <button className="bg-blue-500 text-white px-4 py-2 rounded flex items-center" onClick={onAddAgent}>
        Add Agent
      </button>
      <button className="bg-yellow-500 text-white px-4 py-2 rounded flex items-center" onClick={onAddTask}>
        Add Task
      </button>
      <button className="bg-blue-400 text-white px-4 py-2 rounded flex items-center" onClick={onAddTool}>
        Add Tool
      </button>
      <button className="bg-purple-400 text-white px-4 py-2 rounded flex items-center" onClick={onOpenTemplates}>
        Templates
      </button>
      <button className="bg-green-500 text-white px-4 py-2 rounded flex items-center" onClick={onExportYAML}>
        Export YAML
      </button>
      <button className="bg-indigo-500 text-white px-4 py-2 rounded flex items-center" onClick={onExportPython}>
        Export main.py
      </button>
      <button className="bg-purple-500 text-white px-4 py-2 rounded flex items-center" onClick={onSaveProject}>
        Save Project
      </button>
      <button className="bg-indigo-400 text-white px-4 py-2 rounded flex items-center" onClick={onLoadProject}>
        Load Project
      </button>
      <button className="bg-pink-500 text-white px-4 py-2 rounded flex items-center" onClick={onPreviewWorkflow}>
        Preview Workflow
      </button>
      <button 
        className={`px-4 py-2 rounded flex items-center ${canUndo ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-500'}`} 
        onClick={onUndo} 
        disabled={!canUndo}
      >
        Undo
      </button>
      <button 
        className={`px-4 py-2 rounded flex items-center ${canRedo ? 'bg-gray-700 text-white' : 'bg-gray-300 text-gray-500'}`} 
        onClick={onRedo} 
        disabled={!canRedo}
      >
        Redo
      </button>
    </div>
  </div>
));

const BuilderPage = () => {
  // Use ReactFlow's state hooks directly
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // UI state
  const [projectName, setProjectName] = useState("Untitled Workflow");
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToolTemplates, setShowToolTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);
  const edgeIdCounter = useRef(0);

  // History management for undo/redo
  const [history, setHistory] = useState([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipNextHistoryUpdate = useRef(false);
  const debounceTimeoutRef = useRef(null);

  // Add to history with debouncing - DEFINE THIS FIRST
  const debouncedAddToHistory = useCallback((newWorkflow) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (skipNextHistoryUpdate.current) {
        skipNextHistoryUpdate.current = false;
        return;
      }
      
      // Create deep copies to avoid reference issues
      const newWorkflowCopy = {
        nodes: JSON.parse(JSON.stringify(newWorkflow.nodes.map(node => {
          // Clean up node data before storing in history
          const nodeCopy = { ...node };
          if (nodeCopy.data) {
            delete nodeCopy.data.onEdit;
            delete nodeCopy.data.onDelete;
          }
          return nodeCopy;
        }))),
        edges: JSON.parse(JSON.stringify(newWorkflow.edges))
      };
      
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(newWorkflowCopy);
      
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
      debounceTimeoutRef.current = null;
    }, 300);
  }, [history, historyIndex]);

  // Generate default nodes
  const generateDefaultNodes = useCallback(() => {
    const agentId = `agent-${Date.now()}`;
    const toolId = `tool-${Date.now() + 1}`;

    return [
      {
        id: agentId,
        type: 'agent',
        position: { x: 150 + Math.random() * 40, y: 200 + Math.random() * 40 },
        draggable: true,
        selectable: true,
        connectable: true,
        data: {
          label: 'Agent Alpha',
          role: 'Assistant',
          goal: 'Help with research',
          backstory: 'Default preloaded agent',
          llmModel: 'gpt-4',
          allowDelegation: true,
          verbose: true,
          nodeId: agentId,
          nodeType: 'agent'
        }
      },
      {
        id: toolId,
        type: 'tool',
        position: { x: 400, y: 250 },
        draggable: true,
        selectable: true,
        connectable: true,
        data: {
          label: 'Search Tool',
          description: 'Performs web search',
          toolType: 'api',
          apiEndpoint: '',
          apiKey: '',
          parameters: 'query',
          nodeId: toolId,
          nodeType: 'tool'
        }
      }
    ];
  }, []);

  // Generate default nodes on initial load
  useEffect(() => {
    const defaultNodes = generateDefaultNodes();
    setNodes(defaultNodes);
  }, [generateDefaultNodes, setNodes]);

  // Add event listeners for node edit and delete
  useEffect(() => {
    const handleNodeEdit = (event) => {
      const { nodeId, nodeType } = event.detail;
      console.log(`Edit event received for ${nodeType} with ID ${nodeId}`);
      
      // Find the node in the current state
      const nodeToEdit = nodes.find(n => n.id === nodeId);
      
      if (!nodeToEdit) {
        console.warn(`Node with ID ${nodeId} not found for editing`);
        return;
      }
      
      if (!nodeToEdit.data) {
        console.warn(`Node with ID ${nodeId} has no data property`);
        return;
      }
      
      // Set the selected node and show the modal
      setSelectedNode(nodeToEdit);
      setShowEditModal(true);
    };
    
    const handleNodeDelete = (event) => {
      const { nodeId } = event.detail;
      console.log(`Delete event received for node with ID ${nodeId}`);
      
      setNodes((nodes) => nodes.filter(node => node.id !== nodeId));
      setEdges((edges) => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
      
      // Add to history
      debouncedAddToHistory({ 
        nodes: nodes.filter(node => node.id !== nodeId), 
        edges: edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId) 
      });
    };
    
    // Add event listeners
    document.addEventListener('node-edit', handleNodeEdit);
    document.addEventListener('node-delete', handleNodeDelete);
    
    // Clean up
    return () => {
      document.removeEventListener('node-edit', handleNodeEdit);
      document.removeEventListener('node-delete', handleNodeDelete);
    };
  }, [nodes, edges, debouncedAddToHistory, setNodes, setEdges, setSelectedNode, setShowEditModal]);

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
  }, [nodes]);
  
  // Node delete handler
  const handleNodeDelete = useCallback((nodeId) => {
    setNodes((nodes) => nodes.filter(node => node.id !== nodeId));
    setEdges((edges) => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    
    // Add to history
    debouncedAddToHistory({ 
      nodes: nodes.filter(node => node.id !== nodeId), 
      edges: edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId) 
    });
  }, [nodes, edges]);

  // Handle node click for editing
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowEditModal(true);
  }, []);

  // Handle saving edits from modal
  const onSaveEdit = useCallback((formData) => {
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === selectedNode.id) {
          // Preserve the nodeId and nodeType
          return {
            ...node,
            data: {
              ...formData,
              nodeId: node.id,
              nodeType: node.type
            }
          };
        }
        return node;
      })
    );
    
    setShowEditModal(false);
    debouncedAddToHistory({ nodes, edges });
  }, [selectedNode, nodes, edges, debouncedAddToHistory]);

  // Connection handlers
  const onConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  // Add this function to fix the error
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
  
    debouncedAddToHistory({
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
  }, [nodes, edges, debouncedAddToHistory]);
  
  const normalizeType = (node) => {
    const type = (node?.type || '').toLowerCase();
    const dataType = (node?.data?.nodeType || '').toLowerCase();
    
    if (type.includes('agent') || dataType.includes('agent')) return 'agent';
    if (type.includes('task') || dataType.includes('task')) return 'task';
    if (type.includes('tool') || dataType.includes('tool')) return 'tool';
    return 'unknown';
  };
  
  
  // Add Agent function
  const addAgent = useCallback(() => {
    const id = `agent-${Date.now()}`;
    console.log("Creating new agent with ID:", id);
    
    const newNode = {
      id,
      type: 'agent',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: `Agent ${nodes.filter(n => n.type === 'agent').length + 1}`,
        role: 'Assistant',
        goal: '',
        backstory: '',
        llmModel: 'gpt-4',
        allowDelegation: false,
        verbose: true,
        nodeId: id,
        nodeType: 'agent'
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    debouncedAddToHistory({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, debouncedAddToHistory]);

  // Add Task function
  const addTask = useCallback(() => {
    const id = `task-${Date.now()}`;
    const newNode = {
      id,
      type: 'task',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: `New Task`,
        description: 'Task description',
        expectedOutput: 'Expected output of the task',
        async: false,
        nodeId: id,
        nodeType: 'task'
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    debouncedAddToHistory({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, debouncedAddToHistory]);

  // Tool template selection handler
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
        nodeType: 'tool'
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    setShowToolTemplates(false);
    debouncedAddToHistory({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, debouncedAddToHistory]);

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
    
    debouncedAddToHistory({ nodes, edges });
  }, [nodes, edges, debouncedAddToHistory]);

  // Export functions
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
    } catch (error) {
      console.error("Error exporting YAML:", error);
      alert("Failed to export YAML. Please try again.");
    }
  }, [projectName, nodes, edges]);

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
    } catch (error) {
      console.error("Error exporting Python:", error);
      alert("Failed to export Python code. Please try again.");
    }
  }, [projectName, nodes, edges]);

  // Project save/load functions
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
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project. Please try again.");
    }
  }, [projectName, nodes, edges]);

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
          setHistory([{ nodes: nodesWithCallbacks, edges: projectData.edges || [] }]);
          setHistoryIndex(0);
        } catch (error) {
          console.error("Error loading project:", error);
          alert("Failed to load project. The file may be corrupted or in an invalid format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handleNodeEdit, handleNodeDelete]);

  // Undo/redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      try {
        skipNextHistoryUpdate.current = true;
        const newIndex = historyIndex - 1;
        const previousState = history[newIndex];
        
        if (!previousState) {
          console.error("Previous state not found in history");
          return;
        }
        
        // Add callbacks to nodes
        const nodesWithCallbacks = previousState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onEdit: () => handleNodeEdit(node.id),
            onDelete: () => handleNodeDelete(node.id)
          }
        }));
        
        setNodes(nodesWithCallbacks);
        setEdges(previousState.edges);
        setHistoryIndex(newIndex);
      } catch (error) {
        console.error("Error during undo operation:", error);
      }
    }
  }, [history, historyIndex, handleNodeEdit, handleNodeDelete]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      try {
        skipNextHistoryUpdate.current = true;
        const newIndex = historyIndex + 1;
        const nextState = history[newIndex];
        
        if (!nextState) {
          console.error("Next state not found in history");
          return;
        }
        
        // Add callbacks to nodes
        const nodesWithCallbacks = nextState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onEdit: () => handleNodeEdit(node.id),
            onDelete: () => handleNodeDelete(node.id)
          }
        }));
        
        setNodes(nodesWithCallbacks);
        setEdges(nextState.edges);
        setHistoryIndex(newIndex);
      } catch (error) {
        console.error("Error during redo operation:", error);
      }
    }
  }, [history, historyIndex, handleNodeEdit, handleNodeDelete]);

  // Memoize toolbar props to prevent unnecessary re-renders
  const toolbarProps = useMemo(() => ({
    onAddAgent: addAgent,
    onAddTask: addTask,
    onAddTool: () => setShowToolTemplates(true),
    onExportYAML: exportYAML,
    onExportPython: exportMainPy,
    onSaveProject: saveProject,
    onLoadProject: loadProject,
    onPreviewWorkflow: () => setShowPreview(true),
    onUndo: undo,
    onRedo: redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    onOpenTemplates: () => setShowTemplateModal(true)
  }), [
    addAgent,
    addTask,
    setShowToolTemplates,
    exportYAML,
    exportMainPy,
    saveProject,
    loadProject,
    showPreview,
    undo,
    redo,
    historyIndex,
    history.length,
    setShowTemplateModal
  ]);

  // Add this function to the Builder component to handle applying a flow template
  const applyFlowTemplate = useCallback((template) => {
    console.log("Builder applying template:", template);
    
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
        debouncedAddToHistory({ nodes: newNodes, edges: newEdges });
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
          debouncedAddToHistory({ 
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
  }, [handleNodeEdit, handleNodeDelete, debouncedAddToHistory, templateToNode, nodes, edges]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-gray-800 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">CrewBuilder</h1>
            <p className="text-sm text-gray-300">Visual AI Agent Workflow Designer</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="bg-gray-700 rounded-md px-4 py-2 flex items-center">
              <span className="text-gray-400 mr-2">Project:</span>
              {editingProjectName ? (
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setEditingProjectName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingProjectName(false)}
                  autoFocus
                  className="bg-gray-600 text-white px-2 py-1 rounded"
                />
              ) : (
                <span className="font-medium cursor-pointer" onClick={() => setEditingProjectName(true)}>
                  {projectName}
                </span>
              )}
            </div>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center" 
              onClick={() => setShowHelpPanel(true)}
            >
              Help
            </button>
          </div>
        </div>
      </header>
      
      <Toolbar {...toolbarProps} />
      
      <div className="flex-1">
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onNodeDragStop={onNodeDragStop}
            onTemplateApply={applyFlowTemplate}
            templates={flowTemplates}
            connectionLineComponent={ConnectionLine}
            connectionLineType="bezier"
            defaultEdgeOptions={{
              type: 'bezier',
              animated: true,
              style: {
                stroke: '#888',
                strokeWidth: 1.5,
                strokeDasharray: '5,5'
              }
            }}
          />
        </ReactFlowProvider>
      </div>
      
      {showEditModal && selectedNode && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={onSaveEdit}
          nodeData={selectedNode.data}
          nodeType={selectedNode.type}
        />
      )}
      
      {showToolTemplates && (
        <ToolTemplates
          onClose={() => setShowToolTemplates(false)}
          onSelectTemplate={onSelectToolTemplate}
        />
      )}
      
      {showPreview && (
        <PreviewMode
          nodes={nodes}
          edges={edges}
          onClose={() => setShowPreview(false)}
        />
      )}
      
      {showHelpPanel && (
        <HelpPanel onClose={() => setShowHelpPanel(false)} />
      )}
      
      {showTemplateModal && (
        <TemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={(template) => {
            if (template.nodes && template.edges) {
              // It's a flow template
              applyFlowTemplate(template);
            } else {
              // It's a node template
              const newNode = templateToNode(template);
              if (newNode) {
                setNodes(nodes => [...nodes, newNode]);
                debouncedAddToHistory({ nodes: [...nodes, newNode], edges });
              }
            }
            setShowTemplateModal(false);
          }}
        />
      )}
    </div>
  );
};

// Simple TemplateModal component
const TemplateModal = React.memo(({ onClose, onSelectTemplate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Select a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flowTemplates.map((template, index) => (
            <div 
              key={index}
              className="border rounded-lg p-4 cursor-pointer hover:bg-blue-50"
              onClick={() => onSelectTemplate(template)}
            >
              <h3 className="font-bold">{template.name}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

export default BuilderPage;