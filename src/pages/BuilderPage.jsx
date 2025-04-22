import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';
import { toast } from 'react-toastify';
import { useAuth } from '../auth/AuthProvider';
import { saveFlow, updateFlow } from '../api';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import NavHeader from '../components/profile/NavHeader';
import TopActionToolbar from '../components/builder/TopActionToolbar';

// Components
import FlowCanvas from '../components/FlowCanvas';
import HelpPanel from '../components/HelpPanel';
import PreviewMode from '../components/PreviewMode';
import EditModal from '../components/EditModal';
import ToolTemplates from '../components/templates/ToolsTemplates';
import InputPanel from '../components/builder/InputPanel';
import GraphMetricsPanel from '../components/builder/GraphMetricsPanel';
import ConnectionLine from '../components/builder/ConnectionLine';
import TemplateModal from '../components/builder/TemplateModal';
import RunCrewButton from '../components/RunCrewButton';
import WebRunnerPanel from '../components/webrunners/WebRunnerPanel';
import OutputPanel from '../components/webrunners/OutputPanel';
import OutputConfigPanel from '../components/builder/OutputConfigPanel';
import { sendToEmail, postToDiscord, pushToSheets, postToSlack } from '../utils/outputUtils';
import Notification from '../components/Notification';
import WebhookFlowModal from '../components/WebhookFlowModal';
import TriggerHistoryPanel from '../components/TriggerHistoryPanel';
import FloatingMetricsPanel from '../components/builder/FloatingMetricsPanel';
import ZoomControls from '../components/builder/ZoomControls';
import EnhancedToolbar from '../components/builder/EnhancedToolbar';
import FlowExecutionPanel from '../components/webrunners/FlowExecutionPanel';
import UnifiedExecutionPanel from '../components/webrunners/UnifiedExecutionPanel';

// Custom Hooks
import { useBuilderHistory } from '../hooks/useBuilderHistory';
import { useNodeInteractions } from '../hooks/useNodeInteractions';
import { useWorkflowExport } from '../hooks/useWorkflowExport';
import { useToolTemplates } from '../hooks/useToolTemplates';

// Utils and Data
import { generateDefaultNodes } from '../utils/nodeHelpers';
import { flowTemplates } from '../data/flowTemplates';
import { getSafeNodePosition } from '../utils/getSafeNodePosition';
import { runFlow } from '../utils/flowExecutionEngine';
import { nodeExecutors } from '../utils/nodeExecutors';

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
  const [executionLogs, setExecutionLogs] = useState([]);
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

  // Add this at the component level, outside any effects or callbacks
  const notifiedTriggers = useRef(new Set());

  // Add this state near the top of your component with other state declarations
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  // Also add a flowInstance ref to use with the fitView function
  const flowInstance = useRef(null);

  // Add this state
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [minimizeExecutionPanel, setMinimizeExecutionPanel] = useState(false);

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

  // Add Input Node function
  const addInputNode = (inputType = 'text') => {
    const id = `input-${Date.now()}`;
    const variableName = inputType === 'text' ? 'text_input' : 
                         inputType === 'file' ? 'file_upload' : 'url_input';
    
    const newNode = {
      id,
      type: 'input',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',
      targetPosition: 'top',
      style: { zIndex: 1 },
      data: {
        label: `${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input`,
        inputType: inputType,
        inputKey: variableName,
        variableName: variableName,
        isRequired: false,
        value: '',
        inputs: {},
        nodeId: id,
        nodeType: 'input',
        onValueChange: (value) => {
          setInputs(prev => ({
            ...prev,
            [variableName]: value
          }));
        }
      }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    addToHistory({ nodes: [...nodes, newNode], edges });
  };

  // Add Output Node function
  const addOutputNode = (outputType = 'webhook') => {
    const id = `output-${Date.now()}`;
    let label, configField;
    
    switch (outputType) {
      case 'webhook':
        label = 'Webhook Output';
        configField = 'webhookUrl';
        break;
      case 'discord':
        label = 'Discord Output';
        configField = 'webhookUrl';
        break;
      case 'sheets':
        label = 'Sheets Output';
        configField = 'sheetId';
        break;
      case 'email':
        label = 'Email Output';
        configField = 'email';
        break;
      default:
        label = 'Output Node';
        configField = 'webhookUrl';
    }
    
    const newNode = {
      id,
      type: 'output',
      position: getSafeNodePosition(nodes),
      sourcePosition: 'bottom',  // Can connect from bottom
      targetPosition: 'top',     // Can only receive connections on top
      style: { zIndex: 1 },     // Ensure proper layering
      data: {
        label,
        outputType,
        [configField]: '',
        description: `Send output to ${outputType}`,
        nodeId: id,
        nodeType: 'output'
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

  // Add this helper function to check if auto-export is configured
  const isAutoExportConfigured = () => {
    const { emailEnabled, email, discordEnabled, discordWebhook, sheetsEnabled, sheetId } = outputConfig;
    return (
      (emailEnabled && email) ||
      (discordEnabled && discordWebhook) ||
      (sheetsEnabled && sheetId)
    );
  };

  // Update the addNotification function to ensure unique keys
  const addNotification = useCallback((notification) => {
    // Generate a truly unique ID by combining timestamp with a random string
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setNotifications(prev => [
      ...prev,
      {
        id: uniqueId,
        message: notification.message,
        type: notification.type || 'info',
        timestamp: new Date()
      }
    ]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(uniqueId);
    }, 5000);
  }, []);

  // Make sure the removeNotification function is properly defined
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Add these state variables
  const [executionMode, setExecutionMode] = useState('hybrid'); // 'local', 'backend', or 'hybrid'
  const [textLogs, setTextLogs] = useState('');
  const [structuredLogs, setStructuredLogs] = useState([]);

  // Add this function to check for flow validation issues
  const validateFlow = () => {
    const issues = [];
    
    // Check for nodes without connections
    const isolatedNodes = nodes.filter(node => {
      const hasConnections = edges.some(edge => 
        edge.source === node.id || edge.target === node.id
      );
      return !hasConnections && node.type !== 'trigger'; // Triggers can be isolated
    });
    
    if (isolatedNodes.length > 0) {
      issues.push({
        type: 'warning',
        message: `${isolatedNodes.length} node(s) are not connected to the flow`,
        nodes: isolatedNodes
      });
    }
    
    // Check for missing required inputs
    const inputNodes = nodes.filter(node => node.type === 'input');
    const missingRequiredInputs = inputNodes.filter(node => {
      return node.data?.isRequired && 
             (!inputs[node.data.variableName] || inputs[node.data.variableName] === '');
    });
    
    if (missingRequiredInputs.length > 0) {
      issues.push({
        type: 'error',
        message: `${missingRequiredInputs.length} required input(s) are missing values`,
        nodes: missingRequiredInputs
      });
    }
    
    // Check for output nodes without incoming connections
    const outputNodes = nodes.filter(node => node.type === 'output');
    const disconnectedOutputs = outputNodes.filter(node => {
      return !edges.some(edge => edge.target === node.id);
    });
    
    if (disconnectedOutputs.length > 0) {
      issues.push({
        type: 'warning',
        message: `${disconnectedOutputs.length} output node(s) have no incoming connections`,
        nodes: disconnectedOutputs
      });
    }
    
    return issues;
  };

  // Update the runCrew function to use the enhanced validation
  const runCrew = async () => {
    if (isExecuting) return;
    
    // Check for errors
    const errors = checkWorkflowErrors();
    if (errors.length > 0) {
      toast.error("Please fix workflow errors before running");
      return;
    }
    
    // Run the enhanced validation
    const validationIssues = validateFlow();
    
    // Show warnings but allow execution to continue
    validationIssues.forEach(issue => {
      if (issue.type === 'warning') {
        toast.warning(issue.message);
        
        // Highlight the nodes with issues
        setNodes(nodes => 
          nodes.map(n => 
            issue.nodes.some(node => node.id === n.id)
              ? { 
                  ...n, 
                  style: { 
                    ...n.style, 
                    borderColor: '#f59e0b', // Amber color for warnings
                    borderWidth: 2,
                    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.5)'
                  } 
                } 
              : n
          )
        );
      } else if (issue.type === 'error') {
        toast.error(issue.message);
        
        // Highlight the nodes with errors
        setNodes(nodes => 
          nodes.map(n => 
            issue.nodes.some(node => node.id === n.id)
              ? { 
                  ...n, 
                  style: { 
                    ...n.style, 
                    borderColor: '#ef4444', // Red color for errors
                    borderWidth: 2,
                    boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.5)'
                  } 
                } 
              : n
          )
        );
        
        // Don't continue execution if there are errors
        return;
      }
    });
    
    // Continue with execution if there are no errors
    if (validationIssues.some(issue => issue.type === 'error')) {
      return;
    }
    
    setIsExecuting(true);
    setTextLogs('');
    setStructuredLogs([]);
    setShowExecutionPanel(true);
    setMinimizeExecutionPanel(false);
    
    try {
      if (executionMode === 'local' || executionMode === 'hybrid') {
        // Frontend execution for visualization
        
        // Highlight the node being executed
        const handleNodeStart = (node) => {
          // Update node styling to show it's being executed
          setNodes(nodes => 
            nodes.map(n => 
              n.id === node.id 
                ? { 
                    ...n, 
                    style: { 
                      ...n.style, 
                      borderColor: '#3b82f6', 
                      borderWidth: 2,
                      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)'
                    } 
                  } 
                : n
            )
          );
        };
        
        // Update node styling when execution completes
        const handleNodeComplete = (node, result) => {
          // Update node styling based on result
          setNodes(nodes => 
            nodes.map(n => 
              n.id === node.id 
                ? { 
                    ...n, 
                    style: { 
                      ...n.style, 
                      borderColor: result && result.error ? '#ef4444' : '#10b981', 
                      borderWidth: 2,
                      boxShadow: result && result.error 
                        ? '0 0 0 2px rgba(239, 68, 68, 0.5)' 
                        : '0 0 0 2px rgba(16, 185, 129, 0.5)'
                    } 
                  } 
                : n
            )
          );
        };
        
        // Run the flow
        const { logs } = await runFlow(
          nodes, 
          edges, 
          inputs, 
          nodeExecutors,
          handleNodeStart,
          handleNodeComplete,
          (state, logs) => {
            console.log('Flow execution completed:', state);
            // Reset node styling after a delay
            setTimeout(() => {
              setNodes(nodes => 
                nodes.map(n => ({ 
                  ...n, 
                  style: { 
                    ...n.style, 
                    borderColor: undefined, 
                    borderWidth: undefined,
                    boxShadow: undefined
                  } 
                }))
              );
            }, 2000);
          }
        );
        
        // Update logs
        setStructuredLogs(logs);
      }
      
      if (executionMode === 'backend' || executionMode === 'hybrid') {
        // Backend execution for actual processing
        
        // Prepare the payload
        const payload = {
          nodes,
          edges,
          metadata: {
            name: projectName,
            output: outputConfig
          }
        };
        
        // Ensure inputs are properly formatted
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
          setTextLogs(logs);
        }
        
        // Show output panel when done
        setShowOutputPanel(true);
        
        // Handle outputs based on configuration
        if (outputConfig.emailEnabled && outputConfig.email) {
          await sendToEmail(logs, outputConfig.email);
          addNotification({
            message: "Results sent to email",
            type: "success"
          });
        }
        
        if (outputConfig.discordEnabled && outputConfig.discordWebhook) {
          await postToDiscord(logs, outputConfig.discordWebhook);
          addNotification({
            message: "Results posted to Discord",
            type: "success"
          });
        }
        
        if (outputConfig.sheetsEnabled) {
          await pushToSheets(logs);
          addNotification({
            message: "Results exported to Google Sheets",
            type: "success"
          });
        }
      }
      
      // Show success message
      toast.success('Flow executed successfully');
      
    } catch (error) {
      console.error('Error executing flow:', error);
      toast.error(`Error executing flow: ${error.message}`);
      
      if (executionMode === 'backend' || executionMode === 'hybrid') {
        setTextLogs(prev => prev + `\n\nERROR: ${error.message}`);
      }
      
      addNotification({
        message: `Error: ${error.message}`,
        type: "error"
      });
    } finally {
      setIsExecuting(false);
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

  // Enhance the saveProject function
  const enhancedSaveProject = () => {
    // If you have validation, keep it
    const errors = checkWorkflowErrors();
    if (errors.length > 0) {
      toast.error("Please fix workflow errors before saving");
      return;
    }
    
    // If user is logged in, save to Supabase
    if (user) {
      saveToSupabase();
    } else {
      toast.error("Please sign in to save your flow");
      navigate('/login');
    }
  };

  // Update the loadProject function
  const enhancedLoadProject = () => {
    if (!user) {
      toast.error("Please sign in to load flows");
      navigate('/login');
      return;
    }
    
    // Call the original function
    loadProject();
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

  useEffect(() => {
    // Store the current nodes and edges in the window object
    // so they can be accessed by the TriggerNode component
    window.currentNodes = nodes;
    window.currentEdges = edges;
  }, [nodes, edges]);

  // Add this to the BuilderPage component
  const [executedTriggers, setExecutedTriggers] = useState([]);

  // Then update the useEffect for fetching executed triggers
  useEffect(() => {
    // Function to fetch recently executed triggers
    const fetchExecutedTriggers = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/executed-triggers`);
        if (response.ok) {
          const data = await response.json();
          
          // Only process if we have triggers
          if (data.triggers && data.triggers.length > 0) {
            // Get only triggers executed in the last 5 minutes AND not completed
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentTriggers = data.triggers.filter(trigger => {
              // Skip completed triggers entirely
              if (trigger.completed) return false;
              
              // Check if it's recent
              if (!trigger.last_executed) return false;
              const executionTime = new Date(trigger.last_executed);
              return executionTime > fiveMinutesAgo;
            });
            
            // Find truly new triggers (not previously notified)
            const newTriggers = recentTriggers.filter(trigger => {
              const triggerKey = `${trigger.id}-${trigger.last_executed}`;
              if (notifiedTriggers.current.has(triggerKey)) {
                return false;
              }
              
              // Add to notified set
              notifiedTriggers.current.add(triggerKey);
              return true;
            });
            
            // Only show notifications for truly new executions
            if (newTriggers.length > 0) {
              // Show at most one notification to avoid flooding
              const latestTrigger = newTriggers[0];
              addNotification({
                message: `Trigger "${latestTrigger.label || latestTrigger.id}" executed at ${new Date(latestTrigger.last_executed).toLocaleTimeString()}`,
                type: "success"
              });
              
              if (newTriggers.length > 1) {
                addNotification({
                  message: `${newTriggers.length - 1} more triggers were executed`,
                  type: "info"
                });
              }
            }
            
            // Update the state with all triggers
            setExecutedTriggers(data.triggers);
          }
        }
      } catch (error) {
        console.error("Error fetching executed triggers:", error);
      }
    };
    
    // Initial fetch
    fetchExecutedTriggers();
    
    // Poll for executed triggers every 10 seconds
    const interval = setInterval(fetchExecutedTriggers, 10000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, [BACKEND_URL, addNotification]);

  // Add state for the trigger history panel
  const [showTriggerHistory, setShowTriggerHistory] = useState(false);

  // Add this function to clean up completed triggers from the UI
  const cleanupCompletedTriggers = useCallback(() => {
    // Filter out completed triggers that have been shown for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    setExecutedTriggers(prev => 
      prev.filter(trigger => 
        !trigger.completed || 
        !trigger.completed_at || 
        new Date(trigger.completed_at) > fiveMinutesAgo
      )
    );
  }, []);

  // Call this function periodically
  useEffect(() => {
    const interval = setInterval(cleanupCompletedTriggers, 60000); // Every minute
    return () => clearInterval(interval);
  }, [cleanupCompletedTriggers]);

  // Add this function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Add this function to clear the notification history
  const clearNotificationHistory = useCallback(() => {
    // Clear the notified triggers set
    notifiedTriggers.current.clear();
  }, []);

  // Add these imports at the top
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentFlowId, setCurrentFlowId] = useState(null);

  // Add this useEffect to load flow data if available
  useEffect(() => {
    // Check if we have a flow to load from localStorage
    const savedFlow = localStorage.getItem('currentFlow');
    
    if (savedFlow) {
      try {
        const flowData = JSON.parse(savedFlow);
        setProjectName(flowData.name);
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
        setCurrentFlowId(flowData.id);
        
        // Clear localStorage after loading
        localStorage.removeItem('currentFlow');
        
        // Add to history
        addToHistory({ nodes: flowData.nodes, edges: flowData.edges });
        
        toast.success('Flow loaded successfully');
      } catch (error) {
        console.error('Error loading saved flow:', error);
        toast.error('Failed to load saved flow');
      }
    }
  }, []);

  // Add this function to save to Supabase
  const saveToSupabase = async () => {
    if (!user) {
      toast.error('You must be logged in to save flows');
      navigate('/login');
      return;
    }
    
    try {
      if (currentFlowId) {
        // Update existing flow
        await updateFlow(currentFlowId, projectName, nodes, edges);
        toast.success('Flow updated successfully');
      } else {
        // Create new flow
        const { data } = await saveFlow(user.id, projectName, nodes, edges);
        if (data && data[0]) {
          setCurrentFlowId(data[0].id);
        }
        toast.success('Flow saved successfully');
      }
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error('Failed to save flow');
    }
  };

  // Then define toolbarProps AFTER all functions are defined
  const toolbarProps = {
    onAddAgent: addAgent,
    onAddTask: addTask,
    onAddTool: () => setShowToolTemplates(true),
    onAddChat: addChatNode,
    onAddDelay: addDelayNode,
    onAddTrigger: addTriggerNode,
    onAddLogicNode: addLogicNode,
    onAddInputNode: addInputNode,
    onAddOutputNode: addOutputNode,
    onSaveProject: enhancedSaveProject,
    onLoadProject: enhancedLoadProject,
    onExportYAML: exportYAML,
    onExportPython: exportMainPy,
    onExportProject: exportProject,
    onPreviewWorkflow: () => setShowPreview(true),
    canUndo,
    canRedo,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleExecutionMode: () => {
      setExecutionMode(prev => {
        if (prev === 'local') return 'backend';
        if (prev === 'backend') return 'hybrid';
        return 'local';
      });
    },
    executionMode
  };

  // Add this state variable near the top with your other state variables
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Add this function to handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Inside your component, add zoom functions
  const zoomIn = () => {
    setViewport((prev) => ({ ...prev, zoom: prev.zoom * 1.2 }));
  };

  const zoomOut = () => {
    setViewport((prev) => ({ ...prev, zoom: prev.zoom * 0.8 }));
  };

  const resetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  // Add this near the top of BuilderPage component
  useEffect(() => {
    // Handler for edit events
    const handleNodeEditEvent = (event) => {
      const nodeId = event.detail.nodeId;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setShowEditModal(true);
      }
    };

    // Handler for delete events
    const handleNodeDeleteEvent = (event) => {
      const nodeId = event.detail.nodeId;
      if (window.confirm('Are you sure you want to delete this node?')) {
        setNodes(nodes => nodes.filter(n => n.id !== nodeId));
        setEdges(edges => edges.filter(e => e.source !== nodeId && e.target !== nodeId));
      }
    };

    // Add event listeners
    document.addEventListener('node-edit', handleNodeEditEvent);
    document.addEventListener('node-delete', handleNodeDeleteEvent);

    // Cleanup
    return () => {
      document.removeEventListener('node-edit', handleNodeEditEvent);
      document.removeEventListener('node-delete', handleNodeDeleteEvent);
    };
  }, [nodes, setNodes, setEdges]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <NavHeader 
        showHelp={() => setShowHelpPanel(true)} 
        projectName={projectName}
        editingProjectName={editingProjectName}
        setEditingProjectName={setEditingProjectName}
        setProjectName={setProjectName}
        isBuilderPage={true}
      />
      
      {/* Replace TopActionToolbar with EnhancedToolbar */}
      <EnhancedToolbar toolbarProps={toolbarProps} />
      
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100">
        <InputPanel inputs={inputs} setInputs={setInputs} nodes={nodes} />
        <button 
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm ml-2"
          onClick={() => setShowTriggerHistory(true)}
        >
          Trigger History
        </button>
      </div>
      
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
            onViewportChange={setViewport}
            onInit={(instance) => {
              flowInstance.current = instance;
            }}
          />
        </ReactFlowProvider>
        
        {/* Replace the old metrics panel with the floating one */}
        <FloatingMetricsPanel nodes={nodes} edges={edges} />

        {/* Add zoom controls */}
        <ZoomControls 
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetView={resetView}
          fitView={() => flowInstance.current?.fitView({ padding: 0.2 })}
        />
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
        isRunning={isExecuting}
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
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 mb-2 flex space-x-2 z-50">
          <button
            onClick={clearNotificationHistory}
            className="px-3 py-1 bg-blue-200 text-blue-700 rounded hover:bg-blue-300"
          >
            Reset Notification History
          </button>
          <button
            onClick={clearAllNotifications}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear All Notifications
          </button>
        </div>
      )}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 mt-10">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            id={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      {/* Webhook Flow Modal */}
      <WebhookFlowModal
        isOpen={showWebhookFlowModal}
        onClose={() => setShowWebhookFlowModal(false)}
        onReplace={handleReplaceFlow}
        onMerge={handleMergeFlow}
        flowData={incomingFlow}
      />

      {/* Trigger History Panel */}
      {showTriggerHistory && (
        <TriggerHistoryPanel 
          isVisible={showTriggerHistory}
          onClose={() => setShowTriggerHistory(false)}
        />
      )}

      {/* Flow Execution Panel */}
      {showExecutionPanel && (
        <UnifiedExecutionPanel
          logs={textLogs}
          structuredLogs={structuredLogs}
          isMinimized={minimizeExecutionPanel}
          onToggleMinimize={() => setMinimizeExecutionPanel(!minimizeExecutionPanel)}
          onClose={() => setShowExecutionPanel(false)}
          executionMode={executionMode}
        />
      )}
    </div>
  );
};

export default BuilderPage;