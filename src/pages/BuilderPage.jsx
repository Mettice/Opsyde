// BuilderPage.js - Refactored
import React, { useState, useRef, useEffect } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';
import toast from 'react-hot-toast';

// Components
import FlowCanvas from '../components/FlowCanvas';
import HelpPanel from '../components/HelpPanel';
import PreviewMode from '../components/PreviewMode';
import EditModal from '../components/EditModal';
import ToolTemplates from '../components/templates/ToolsTemplates';
import Toolbar from '../components/builder/Toolbar';
import GraphMetricsPanel from '../components/builder/GraphMetricsPanel';
import ConnectionLine from '../components/builder/ConnectionLine';
import TemplateModal from '../components/builder/TemplateModal';
import RunCrewButton from '../components/RunCrewButton';
import WebRunnerPanel from '../components/webrunners/WebRunnerPanel';
import OutputPanel from '../components/webrunners/OutputPanel';

// Custom Hooks
import { useBuilderHistory } from '../hooks/useBuilderHistory';
import { useNodeInteractions } from '../hooks/useNodeInteractions';
import { useWorkflowExport } from '../hooks/useWorkflowExport';
import { useToolTemplates } from '../hooks/useToolTemplates';

// Utils and Data
import { generateDefaultNodes } from '../utils/nodeHelpers';
import { flowTemplates } from '../data/flowTemplates';
import { getSafeNodePosition } from '../utils/getSafeNodePosition';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const BuilderPage = () => {
  // Use ReactFlow's state hooks directly
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Project metadata state
  const [projectName, setProjectName] = useState("Untitled Workflow");
  const [editingProjectName, setEditingProjectName] = useState(false);
  
  // UI state
  const [selectedNode, setSelectedNode] = useState(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToolTemplates, setShowToolTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState('');
  const [showRunnerPanel, setShowRunnerPanel] = useState(false);
  const [minimizeRunnerPanel, setMinimizeRunnerPanel] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const [minimizeOutputPanel, setMinimizeOutputPanel] = useState(false);

  // Refs
  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);
  
  // Custom hooks
  const { 
    history, 
    historyIndex, 
    canUndo, 
    canRedo, 
    addToHistory, 
    undo, 
    redo 
  } = useBuilderHistory({ nodes: [], edges: [] });

  const {
    handleNodeEdit,
    handleNodeDelete,
    onNodeClick,
    onNodeDragStop,
    onConnect,
    onConnectStart,
    onConnectEnd
  } = useNodeInteractions({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory,
    setSelectedNode,
    setShowEditModal
  });

  const {
    exportYAML,
    exportMainPy,
    saveProject,
    loadProject,
    exportProject
  } = useWorkflowExport({
    projectName,
    nodes,
    edges,
    setNodes,
    setEdges,
    setProjectName,
    addToHistory,
    handleNodeEdit,
    handleNodeDelete
  });

  const {
    addTool,
    onSelectToolTemplate,
    handleToolFromRegistry,
    applyFlowTemplate
  } = useToolTemplates({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory,
    handleNodeEdit,
    handleNodeDelete
  });

  // Add Agent function - kept in main component as it's simple
  const addAgent = () => {
    const id = `agent-${Date.now()}`;
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
    addToHistory({ nodes: [...nodes, newNode], edges });
  };

  // Add Task function - kept in main component as it's simple
  const addTask = () => {
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
    addToHistory({ nodes: [...nodes, newNode], edges });
  };

  // Generate default nodes on initial load
  useEffect(() => {
    const defaultNodes = generateDefaultNodes();
    setNodes(defaultNodes);
  }, [setNodes]);

  // Handle saving edits from modal
  const onSaveEdit = (formData) => {
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === selectedNode.id) {
          // Preserve the nodeId, nodeType, and callbacks
          return {
            ...node,
            data: {
              ...formData,
              nodeId: node.id,
              nodeType: node.type,
              onEdit: () => handleNodeEdit(node.id),
              onDelete: () => handleNodeDelete(node.id)
            }
          };
        }
        return node;
      })
    );
    
    setShowEditModal(false);
    addToHistory({ nodes, edges });
  };

  // Add these handler functions to your BuilderPage component
  const handleUndo = () => {
    const result = undo(handleNodeEdit, handleNodeDelete);
    if (result) {
      setNodes(result.nodes);
      setEdges(result.edges);
    }
  };

  const handleRedo = () => {
    const result = redo(handleNodeEdit, handleNodeDelete);
    if (result) {
      setNodes(result.nodes);
      setEdges(result.edges);
    }
  };

  // Toolbar props
  const toolbarProps = {
    onAddAgent: addAgent,
    onAddTask: addTask,
    onAddTool: () => setShowToolTemplates(true),
    onExportYAML: exportYAML,
    onExportPython: exportMainPy,
    onSaveProject: saveProject,
    onLoadProject: loadProject,
    onPreviewWorkflow: () => setShowPreview(true),
    onUndo: handleUndo,  // Use the handler function
    onRedo: handleRedo,  // Use the handler function
    canUndo,
    canRedo,
    onExportProject: exportProject,
  };

  // Add this effect to ensure callbacks are attached to default nodes
  useEffect(() => {
    if (nodes.length > 0) {
      // Add callbacks to existing nodes if they don't have them
      const nodesWithCallbacks = nodes.map(node => {
        if (!node.data.onEdit || !node.data.onDelete) {
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => handleNodeEdit(node.id),
              onDelete: () => handleNodeDelete(node.id)
            }
          };
        }
        return node;
      });
      
      if (JSON.stringify(nodes) !== JSON.stringify(nodesWithCallbacks)) {
        setNodes(nodesWithCallbacks);
      }
    }
  }, [nodes, handleNodeEdit, handleNodeDelete]);

  useEffect(() => {
    const handleNodeEdit = (event) => {
      const { nodeId } = event.detail;
      // Your edit logic here
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setShowEditModal(true);
      }
    };

    const handleNodeDelete = (event) => {
      const { nodeId } = event.detail;
      // Your delete logic here
      setNodes(nodes => nodes.filter(n => n.id !== nodeId));
      setEdges(edges => edges.filter(e => e.source !== nodeId && e.target !== nodeId));
      addToHistory({ 
        nodes: nodes.filter(n => n.id !== nodeId), 
        edges: edges.filter(e => e.source !== nodeId && e.target !== nodeId) 
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
  }, [nodes, edges, setNodes, setEdges, addToHistory, setSelectedNode, setShowEditModal]);

  // Add this function to handle running the crew
  const runCrew = async () => {
    try {
      setIsRunning(true);
      setExecutionLogs('');
      setShowRunnerPanel(true);
      setMinimizeRunnerPanel(false);
      
      // Prepare the payload
      const payload = {
        nodes: nodes.map(node => {
          // Clean node data for API
          const { data, ...rest } = node;
          const cleanData = { ...data };
          delete cleanData.onEdit;
          delete cleanData.onDelete;
          return { ...rest, data: cleanData };
        }),
        edges: edges,
        inputs: {} // Add any global inputs here
      };
      
      // Call the API with streaming response
      const response = await fetch(`${BACKEND_URL}/run-crew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        setExecutionLogs(prev => prev + text);
      }
      
      // Show output panel when execution is complete
      setShowOutputPanel(true);
      setMinimizeOutputPanel(false);
    } catch (error) {
      console.error('Error running crew:', error);
      setExecutionLogs(prev => prev + `\n❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Add this function to handle exports
  const handleExport = async (type, config = {}) => {
    try {
      if (type === 'yaml' || type === 'json') {
        // Handle file exports
        exportProject(type);
        return;
      }
      
      // Prepare the payload
      const payload = {
        logs: executionLogs,
        ...config
      };
      
      // Determine the endpoint
      let endpoint;
      switch (type) {
        case 'email':
          endpoint = `${BACKEND_URL}/send-email`;
          break;
        case 'discord':
          endpoint = `${BACKEND_URL}/post-discord`;
          break;
        case 'sheets':
          endpoint = `${BACKEND_URL}/export-sheets`;
          break;
        default:
          throw new Error(`Unknown export type: ${type}`);
      }
      
      // Call the API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      // Show result in logs
      setExecutionLogs(prev => prev + `\n${result.status}`);
      
    } catch (error) {
      console.error(`Error exporting to ${type}:`, error);
      setExecutionLogs(prev => prev + `\n❌ Export Error: ${error.message}`);
    }
  };

  // Add this function to check for workflow errors
  const checkWorkflowErrors = () => {
    const errors = [];
    
    // Check if there are any nodes
    if (nodes.length === 0) {
      errors.push('Workflow has no nodes');
    }
    
    // Check if there are any edges
    if (edges.length === 0 && nodes.length > 1) {
      errors.push('Nodes are not connected');
    }
    
    // Check for agents without tasks
    const agentIds = nodes.filter(n => n.type === 'agent').map(n => n.id);
    const agentsWithTasks = new Set(
      edges.filter(e => 
        agentIds.includes(e.source) && 
        nodes.find(n => n.id === e.target && n.type === 'task')
      ).map(e => e.source)
    );
    
    if (agentIds.length > 0 && agentsWithTasks.size === 0) {
      errors.push('No agents are assigned to tasks');
    }
    
    return errors;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-gray-800 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Nodes Flow </h1>
            <p className="text-sm text-gray-300">Visual AI Agent Workflow Designer</p>
          </div>
          
          <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
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
          </div>
          
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center" 
            onClick={() => setShowHelpPanel(true)}
          >
            Help
          </button>
        </div>
      </header>
      
      <Toolbar {...toolbarProps} />
      
      <div className="flex-1 relative">
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
        
        {/* Add the metrics panel */}
        {showMetrics && <GraphMetricsPanel nodes={nodes} edges={edges} />}
        
        {/* Toggle metrics button */}
        <button 
          className="absolute top-4 right-4 bg-gray-700 text-white px-3 py-1 rounded text-sm z-40"
          onClick={() => setShowMetrics(!showMetrics)}
        >
          {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
        </button>
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
          showRegistry={true}
          onSelectToolFromRegistry={handleToolFromRegistry}
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
          templates={flowTemplates}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={applyFlowTemplate}
        />
      )}

      {/* Run Crew Button */}
      <RunCrewButton 
        onClick={runCrew}
        isRunning={isRunning}
        hasErrors={checkWorkflowErrors().length > 0}
        nodeCount={nodes.length}
      />

      {/* Web Runner Panel */}
      {showRunnerPanel && (
        <WebRunnerPanel
          logs={executionLogs}
          onClose={() => setShowRunnerPanel(false)}
          isMinimized={minimizeRunnerPanel}
          onToggleMinimize={() => setMinimizeRunnerPanel(!minimizeRunnerPanel)}
        />
      )}

      {/* Output Panel */}
      {showOutputPanel && (
        <OutputPanel
          logs={executionLogs}
          onExport={handleExport}
          isMinimized={minimizeOutputPanel}
          onToggleMinimize={() => setMinimizeOutputPanel(!minimizeOutputPanel)}
        />
      )}
    </div>
  );
};

export default BuilderPage;