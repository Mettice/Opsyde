// BuilderPage.js - Refactored
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';
import { toast } from 'react-toastify';




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
import OutputConfigPanel from '../components/builder/OutputConfigPanel';
import InputPanel from '../components/builder/InputPanel';
import { sendToEmail, postToDiscord, pushToSheets, postToSlack } from '../utils/outputUtils';
import Notification from '../components/Notification';
import WebhookFlowModal from '../components/WebhookFlowModal';

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
  const [notifications, setNotifications] = useState([]);

  // Add inputs state
  const [inputs, setInputs] = useState({});
  
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
    onConnectEnd,
    onEdgeClick
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
    saveProject: originalSaveProject,
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


  const [outputConfig, setOutputConfig] = useState({
    emailEnabled: false,
    email: '',
    discordEnabled: false,
    discordWebhook: '',
    sheetsEnabled: false,
    sheetId: ''
  });
  
  const [incomingFlow, setIncomingFlow] = useState(null);
  const [showWebhookFlowModal, setShowWebhookFlowModal] = useState(false);

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

  // Add Chat Node function
  const addChatNode = () => {
    const id = `chat-${Date.now()}`;
    const newNode = {
      id,
      type: 'chatbot',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: `Chatbot ${nodes.filter(n => n.type === 'chatbot' || n.type === 'chat').length + 1}`,
        description: 'Interactive chatbot for user conversations',
        prompt: 'Hi, how can I help you today?',
        llmModel: 'gpt-4',
        memory: false,
        temperature: 0.7,
        max_tokens: 500,
        nodeId: id,
        nodeType: 'chatbot',
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  };

  // Add Delay Node function
  const addDelayNode = () => {
    const id = `delay-${Date.now()}`;
    const newNode = {
      id,
      type: 'delay',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: 'Delay',
        description: 'Pause execution for a specified duration',
        duration: '5s',
        nodeId: id,
        nodeType: 'delay',
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  };

  // Add Trigger Node function
  const addTriggerNode = () => {
    // First check if there's already a trigger node (connected or not)
    const existingTriggerNodes = nodes.filter(node => node.type === 'trigger');
    
    if (existingTriggerNodes.length > 0) {
      toast.warning('Only one trigger node is allowed per flow. Delete the existing trigger node first.');
      return; // Exit the function early - don't add another trigger
    }
    
    const id = `trigger-${Date.now()}`;
    const newNode = {
      id,
      type: 'trigger',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      data: {
        label: 'Trigger',
        description: 'Start workflow execution',
        triggerType: 'manual',
        runAt: '',
        nodeId: id,
        nodeType: 'trigger',
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  };

  // Add Logic Node function
  const addLogicNode = () => {
    const id = `logic-${Date.now()}`;
    const newNode = {
      id,
      type: 'logic',
      position: getSafeNodePosition(nodes),
      data: {
        label: 'Logic Node',
        name: 'Condition',
        description: 'Evaluates a condition and routes flow',
        condition: 'inputs.value > 10',
        nodeId: id,
        nodeType: 'logic',
        onEdit: () => handleNodeEdit(id),
        onDelete: () => handleNodeDelete(id)
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
    onAddChat: addChatNode,
    onAddDelay: addDelayNode,
    onAddTrigger: addTriggerNode,
    onAddLogicNode: addLogicNode,
    onExportYAML: exportYAML,
    onExportPython: exportMainPy,
    onSaveProject: originalSaveProject,
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

  // Handle post-execution actions like sending to email, Discord, etc.
  const handlePostExecution = async (logs) => {
    const toolNodes = nodes.filter((node) => node.type === "tool");

    for (const tool of toolNodes) {
      const { exportTo, config = {} } = tool.data;

      if (exportTo === "email") {
        await sendToEmail(logs, config.to);
      } else if (exportTo === "discord") {
        await sendToDiscord(logs, config.webhook);
      } else if (exportTo === "sheets") {
        await sendToSheets(logs);
      }
    }
  };

  // Add this helper function to check if auto-export is configured
  const isAutoExportConfigured = () => {
    const { emailEnabled, email, discordEnabled, discordWebhook, sheetsEnabled, sheetId } = outputConfig;
    return (
      (emailEnabled && email) ||
      (discordEnabled && discordWebhook) ||
      (sheetsEnabled && sheetId)
    );
  };

  // Add this function to show notifications
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Update the runCrew function to handle the webhook flow response
  const runCrew = async () => {
    if (isRunning) return;
    
    // Check for errors
    const errors = checkWorkflowErrors();
    if (errors.length > 0) {
      toast.error("Please fix workflow errors before running");
      return;
    }
    
    setIsRunning(true);
    setExecutionLogs('');
    setShowRunnerPanel(true);
    setMinimizeRunnerPanel(false);
    
    try {
      // Prepare the payload
      const payload = {
        nodes,
        edges,
        metadata: {
          name: projectName,
          output: outputConfig
        }
      };
      
      // THIS IS THE FIX - Ensure inputs are properly formatted
      if (inputs) {
        if (typeof inputs === 'string') {
          payload.inputs = { input: inputs };
        } else if (typeof inputs === 'object' && inputs !== null) {
          payload.inputs = inputs;
        } else {
          payload.inputs = {};
        }
      } else {
        payload.inputs = {};
      }
      
      // Send the request
      const response = await fetch(`${BACKEND_URL}/run-crew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Handle the response
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let logs = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        logs += text;
        setExecutionLogs(logs);
      }
      
      // Show output panel when done
      setShowOutputPanel(true);
      
      // Handle outputs based on configuration
      if (outputConfig.emailEnabled && outputConfig.email) {
        await sendToEmail(logs, outputConfig.email);
        addNotification("Results sent to email", "success");
      }
      
      if (outputConfig.discordEnabled && outputConfig.discordWebhook) {
        await postToDiscord(logs, outputConfig.discordWebhook);
        addNotification("Results posted to Discord", "success");
      }
      
      if (outputConfig.sheetsEnabled) {
        await pushToSheets(logs);
        addNotification("Results exported to Google Sheets", "success");
      }
      
    } catch (error) {
      console.error("Error running workflow:", error);
      setExecutionLogs(prev => prev + `\n\nERROR: ${error.message}`);
      addNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  // Add this function to handle exports
  const handleExport = async (type, config = {}) => {
    try {
      let result;

      switch (type) {
        case 'yaml':
        case 'json':
          exportProject(type);
          return;

        case 'email':
          result = await sendToEmail(executionLogs, config.to || outputConfig.email);
          break;

        case 'discord':
          result = await postToDiscord(config.webhook_url || outputConfig.discordWebhook, executionLogs);
          break;

        case 'sheets':
          result = await pushToSheets(outputConfig.sheetId || config.sheetId, executionLogs);
          break;

        case 'slack':
          result = await postToSlack(config.webhook || '', executionLogs);
          break;

        default:
          throw new Error(`Unknown export type: ${type}`);
      }

      setExecutionLogs(prev => prev + `\n${result}`);

    } catch (error) {
      toast.error(`Error exporting to ${type}: ` + error.message);
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

  // Update the handleReplaceFlow function
  const handleReplaceFlow = () => {
    if (incomingFlow) {
      // Check if the flow has origin metadata
      const origin = incomingFlow.metadata?.origin || incomingFlow.metadata?.source;
      
      // Add origin to each node if it exists in the metadata
      const nodesWithOrigin = incomingFlow.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          origin: origin || node.data.origin || null
        }
      }));
      
      setNodes(nodesWithOrigin);
      setEdges(incomingFlow.edges);
      addToHistory({ nodes: nodesWithOrigin, edges: incomingFlow.edges });
      setShowWebhookFlowModal(false);
      setIncomingFlow(null);
      
      // Show success notification
      addNotification({
        message: `Replaced workflow with ${nodesWithOrigin.length} nodes from ${origin || 'external source'}`,
        type: "success"
      });
    }
  };

  // Update the handleMergeFlow function
  const handleMergeFlow = () => {
    if (incomingFlow) {
      // Create a map of old IDs to new IDs
      const idMap = {};
      
      // Check if the flow has origin metadata
      const origin = incomingFlow.metadata?.origin || incomingFlow.metadata?.source;
      
      // Create new nodes with unique IDs and add origin
      const newNodes = incomingFlow.nodes.map(node => {
        const oldId = node.id;
        const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        idMap[oldId] = newId;
        
        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + 50, // Offset slightly to avoid exact overlap
            y: node.position.y + 50
          },
          data: {
            ...node.data,
            nodeId: newId,
            origin: origin || node.data.origin || null
          }
        };
      });
      
      // Update edge references to use new node IDs
      const newEdges = incomingFlow.edges.map(edge => ({
        ...edge,
        id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: idMap[edge.source] || edge.source,
        target: idMap[edge.target] || edge.target
      }));
      
      // Merge with existing flow
      setNodes(nodes => [...nodes, ...newNodes]);
      setEdges(edges => [...edges, ...newEdges]);
      addToHistory({ nodes: [...nodes, ...newNodes], edges: [...edges, ...newEdges] });
      setShowWebhookFlowModal(false);
      setIncomingFlow(null);
      
      // Show success notification
      addNotification({
        message: `Merged ${newNodes.length} nodes from ${origin || 'external source'} into your workflow`,
        type: "success"
      });
    }
  };

  // Find the import handler function and modify it
  const handleImportSelect = (option) => {
    switch (option) {
      case 'template':
        setShowTemplateModal(true);
        break;
      case 'json':
        // Trigger file input for JSON import
        document.getElementById('json-import').click();
        break;
      // Comment out or conditionally show these options
      /*
      case 'zapier':
        // Zapier import logic
        break;
      case 'make':
        // Make.com import logic
        break;
      */
      default:
        break;
    }
    setShowImportDropdown(false);
  };

  // Add this validation function
  const validateFlow = () => {
    const errors = [];
    
    // Check for multiple active trigger nodes
    const triggerNodes = nodes.filter(node => 
      node.type === 'trigger' && 
      edges.some(edge => edge.source === node.id)
    );
    
    if (triggerNodes.length > 1) {
      errors.push('Multiple active trigger nodes detected. Only one trigger node can be active in a flow.');
    }
    
    // Add other validation rules as needed
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Then create a wrapper function that adds validation
  const enhancedSaveProject = () => {
    const validation = validateFlow();
    
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    
    // Call the original function
    originalSaveProject();
  };

  // Create a proper onConnect handler
  const handleConnect = useCallback((params) => {
    // Check if we're trying to connect from a trigger node
    if (params.source) {
      const sourceNode = nodes.find(n => n.id === params.source);
      if (sourceNode?.type === 'trigger') {
        // Check if there's already another trigger with connections
        const existingTriggerWithConnections = edges.some(edge => {
          const edgeSourceNode = nodes.find(n => n.id === edge.source);
          return edgeSourceNode?.type === 'trigger' && edge.source !== params.source;
        });
        
        if (existingTriggerWithConnections) {
          toast.error("Only one trigger node can be active in a flow");
          return;
        }
      }
    }
    
    // Create a new edge using the addEdge utility
    const newEdge = addEdge(params, edges);
    setEdges(newEdge);
    
    // If you need to call your custom onConnect logic as well
    if (onConnect) {
      onConnect(params);
    }
  }, [nodes, edges, setEdges, onConnect]);

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
      
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100">
        <Toolbar {...toolbarProps} />
        <InputPanel inputs={inputs} setInputs={setInputs} nodes={nodes} />
      </div>
      
      {/* Add OutputConfigPanel here */}
      <OutputConfigPanel outputConfig={outputConfig} setOutputConfig={setOutputConfig} />
      
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={onNodeClick}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onNodeDragStop={onNodeDragStop}
            onEdgeClick={onEdgeClick}
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

      {/* Notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      {/* Webhook Flow Modal */}
      <WebhookFlowModal
        isOpen={showWebhookFlowModal}
        onClose={() => setShowWebhookFlowModal(false)}
        onReplace={handleReplaceFlow}
        onMerge={handleMergeFlow}
        flowData={incomingFlow}
      />
    </div>
  );
};


export default BuilderPage;