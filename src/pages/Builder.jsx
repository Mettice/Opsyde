import React, { useEffect, useCallback, useState, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

// Context Providers
import { FlowProvider, useFlow } from '../contexts/FlowContext';
import { BuilderUIProvider, useBuilderUI } from '../contexts/BuilderUIContext';
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';

// Components
import NavHeader from '../components/profile/NavHeader';
import CleanHeader from '../components/builder/CleanHeader';
import ModernSidebar from '../components/builder/ModernSidebar';
import InputPanel from '../components/builder/InputPanel';
import FlowCanvass from '../components/FlowCanvass';
import FloatingMetricsPanel from '../components/builder/FloatingMetricsPanel';
import ZoomControls from '../components/builder/ZoomControls';
import OutputConfigPanel from '../components/builder/OutputConfigPanel';
import EditModall from '../components/EditModall';
import ToolTemplates from '../components/templates/ToolTemplates';
import PreviewMode from '../components/PreviewMode';
import HelpPanel from '../components/HelpPanel';
import TemplateModal from '../components/builder/TemplateModal';
import RunCrewButton from '../components/RunCrewButton';
import WebRunnerPanel from '../components/webrunners/WebRunnerPanel';
import WebhookFlowModal from '../components/WebhookFlowModal';
import TriggerHistoryPanel from '../components/TriggerHistoryPanel';
import UnifiedExecutionPanel from '../components/execution-panel/UnifiedExecutionPanel';
import Notification from '../components/Notification';
import SmartToolSelector from '../components/templates/SmartToolSelector';
import HelpTooltip from '../components/HelpTooltip';
import CrewAIImporter from '../components/CrewAIImporter';

// Data
import { flowTemplates } from '../data/flowTemplates';

// Custom Hooks
import { useNodeManagement } from '../hooks/useNodeManagement';
import { useFlowExecution } from '../hooks/useFlowExecution';
import { useWorkflowExport } from './builders/useWorkflowExport';
import { useToolTemplates } from '../hooks/useToolTemplates';
import { useTriggers } from '../hooks/useTriggers';
import useThrottledViewport from '../hooks/useThrottledViewport';
import useThrottledZoom from '../hooks/useThrottledZoom';
import { useSmartToolSelector } from '../hooks/useToolExecution';

// Utility imports
import { duplicateFlow } from '../utils/flowUtils';

// The main content component (using contexts)
const BuilderPageContent = () => {
  const { 
    nodes, edges, 
    setNodes, setEdges,
    selectedNode, setSelectedNode,
    projectName, setProjectName,
    editingProjectName, setEditingProjectName,
    currentFlowId,
    inputs, setInputs,
    onNodesChange, onEdgesChange,
    onConnect, canConnect, onNodeDragStop,
    cleanNodesForSave
  } = useFlow();

  const {
    // Modal states
    showEditModal, closeEditModal, toggleEditModal,
    showHelpPanel, closeHelpPanel, toggleHelpPanel,
    showPreview, closePreview, togglePreview,
    showToolTemplates, closeToolTemplates, toggleToolTemplates,
    showTemplateModal, closeTemplateModal, toggleTemplateModal,
    showWebhookFlowModal, closeWebhookFlowModal,
    
    // Panel states
    showRunnerPanel, toggleRunnerPanel,
    showTriggerHistory, toggleTriggerHistory,
    showExecutionPanel, toggleExecutionPanel,
    
    // Minimized states
    minimizeRunnerPanel, toggleMinimizeRunnerPanel,
    minimizeExecutionPanel, toggleMinimizeExecutionPanel,
    
    // Settings
    executionMode, toggleExecutionMode,
    customPollingInterval, setCustomPollingInterval,
    
    // Webhook flow data
    incomingFlow, setIncomingFlow
  } = useBuilderUI();
  
  const { 
    notifications, 
    addNotification, 
    removeNotification,
    clearAllNotifications,
    clearNotificationHistory
  } = useNotifications();
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Reference to flow instance for viewport operations
  const flowInstance = React.useRef(null);
  
  // Throttled viewport and zoom
  const [viewport, setViewport] = useThrottledViewport(16);
  const { zoomIn, zoomOut, resetZoom } = useThrottledZoom(flowInstance, 16);
  
  // Custom hooks
  const {
    addAgent,
    addTask,
    addChatNode,
    addDelayNode,
    addTriggerNode,
    addLogicNode,
    addInputNode,
    addOutputNode,
    addTool,
    handleNodeEdit,
    handleNodeDelete
  } = useNodeManagement();

  // Smart Tool Selector hook
  const {
    isOpen: showSmartTools,
    availableTools: smartTools,
    openSelector: openSmartTools,
    closeSelector: closeSmartTools,
    addTool: addSmartTool
  } = useSmartToolSelector();
  
  // Function to properly handle node edit saves with clean data
  const onSaveEdit = useCallback((formData) => {
    console.log("Saving edited node with formData:", formData);
    
    // Create a deep copy to avoid reference issues, but preserve important functions
    const cleanFormData = JSON.parse(JSON.stringify(formData, (key, value) => {
      // Skip functions and React elements
      if (typeof value === 'function' || (value && value.$$typeof)) {
        return undefined;
      }
      return value;
    }));
    
    console.log("Cleaned formData:", cleanFormData);
    
    // Add safety check for selectedNode
    if (!selectedNode || !selectedNode.id) {
      console.error("Cannot update node: selectedNode is undefined or missing id");
      closeEditModal();
      return;
    }
    
    setNodes(nodes => 
      nodes.map(node => {
        // Add safety check for node
        if (!node || !node.id) {
          console.warn("Skipping invalid node during update");
          return node;
        }
        
        if (node.id === selectedNode.id) {
          console.log(`Updating node ${node.id} with new data`);
          
          // Create a cleaned node with the new data
          const updatedNode = {
            ...node,
            data: {
              ...cleanFormData,
              nodeId: node.id,
              nodeType: node.type,
              // Re-add the callbacks
              onEdit: () => handleNodeEdit(node.id),
              onDelete: () => handleNodeDelete(node.id)
            }
          };
          
          console.log("Updated node:", updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
    
    closeEditModal();
  }, [selectedNode, handleNodeEdit, handleNodeDelete, closeEditModal, setNodes]);

  // Handle smart tool selection (converts to node)
  const handleSmartToolSelect = (toolNode) => {
    // Calculate a good position for the new node
    const newPosition = {
      x: Math.random() * 400 + 100, // Random position to avoid overlap
      y: Math.random() * 400 + 100
    };

    // Create a new node from the smart tool
    const newNode = {
      id: toolNode.id || `smart-tool-${Date.now()}`,
      type: 'tool',
      position: newPosition,
      data: {
        ...toolNode.data,
        // Ensure the node has edit and delete handlers
        onEdit: () => handleNodeEdit(toolNode.id || `smart-tool-${Date.now()}`),
        onDelete: () => handleNodeDelete(toolNode.id || `smart-tool-${Date.now()}`)
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    closeSmartTools();
    
    addNotification({
      message: `Added ${toolNode.data.label} smart tool to workflow`,
      type: "success"
    });
  };

  // Quick add smart tool function
  const handleQuickAddSmartTool = async (category, service) => {
    // For now, just open the smart tool selector
    // You could extend this to pre-select category/service if Smart Tool Selector supports it
    openSmartTools();
  };

  // Add event listeners for node editing
  useEffect(() => {
    // Function to handle custom node-edit events
    const handleNodeEditEvent = (event) => {
      const { nodeId, nodeType, data } = event.detail;
      console.log("-------- Node Edit Event Received --------");
      console.log("Event detail:", event.detail);
      console.log("Node ID from event:", nodeId);
      console.log("Node type from event:", nodeType);
      console.log("All nodes:", nodes);
      
      // Find the node by ID
      const node = nodes.find(n => n.id === nodeId);
      console.log("Found node:", node);
      
      if (node) {
        // Set the selected node to show the edit modal
        setSelectedNode({
          ...node,
          type: nodeType || node.type
        });
        
        // Open the edit modal
        toggleEditModal(true);
        console.log("Edit modal should now be open");
      } else {
        console.warn(`Node with ID ${nodeId} not found`);
      }
    };
    
    // Function to handle custom node-delete events
    const handleNodeDeleteEvent = (event) => {
      const { nodeId } = event.detail;
      console.log("Node delete event received:", { nodeId });
      
      if (nodeId) {
        handleNodeDelete(nodeId);
      }
    };
    
    // Function to handle node result updates
    const handleNodeResultsUpdate = (event) => {
      const { updates } = event.detail;
      console.log("Node results update event received:", updates);
      
      if (updates && updates.length > 0) {
        // Apply each update
        const updatedNodes = [...nodes];
        
        updates.forEach(update => {
          if (update.type === 'replace' && update.id) {
            const index = updatedNodes.findIndex(n => n.id === update.id);
            if (index !== -1) {
              // Replace the node with the updated version
              updatedNodes[index] = update.item;
            }
          }
        });
        
        // Update nodes state
        setNodes(updatedNodes);
      }
    };
    
    // Add the event listeners
    document.addEventListener('node-edit', handleNodeEditEvent);
    document.addEventListener('node-delete', handleNodeDeleteEvent);
    document.addEventListener('update-node-results', handleNodeResultsUpdate);
    
    // Clean up the event listeners when the component unmounts
    return () => {
      document.removeEventListener('node-edit', handleNodeEditEvent);
      document.removeEventListener('node-delete', handleNodeDeleteEvent);
      document.removeEventListener('update-node-results', handleNodeResultsUpdate);
    };
  }, [nodes, handleNodeDelete, setSelectedNode, toggleEditModal, setNodes]);
  
  const {
    isExecuting,
    textLogs,
    structuredLogs,
    setTextLogs,
    setStructuredLogs,
    executionState,
    runCrew,
    validateFlow,
    nodeStates,
    connectionStates,
    testExecutionStates
  } = useFlowExecution({ nodes, edges, inputs });
  
  const {
    exportYAML,
    exportMainPy,
    exportProject,
    saveProject,
    loadProject
  } = useWorkflowExport({
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
  });
  
  // Add undo/redo handlers
  const handleUndo = () => {
    // If you're using a history management hook, call its undo function
    // For now, we'll just create a stub
    console.log("Undo operation triggered");
    // You could implement using window.history.back() or manage a custom history stack
  };

  const handleRedo = () => {
    // If you're using a history management hook, call its redo function
    // For now, we'll just create a stub
    console.log("Redo operation triggered");
    // You could implement using window.history.forward() or manage a custom history stack
  };
  
  const {
    onSelectToolTemplate,
    handleToolFromRegistry,
    applyFlowTemplate
  } = useToolTemplates({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory: (state) => {
      // Simple history logging for now
      console.log('State change:', {
        nodes: state.nodes.length,
        edges: state.edges.length,
        timestamp: new Date().toISOString()
      });
      // TODO: Implement proper undo/redo history stack if needed
    },
    handleNodeEdit,
    handleNodeDelete
  });
  
  const {
    executedTriggers
  } = useTriggers({ customPollingInterval, addNotification });
  
  // Output configuration state
  const [outputConfig, setOutputConfig] = React.useState({
    emailEnabled: false,
    email: '',
    discordEnabled: false,
    discordWebhook: '',
    sheetsEnabled: false,
    sheetId: ''
  });
  
  // Handle webhook flow import
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
      closeWebhookFlowModal();
      setIncomingFlow(null);
      
      addNotification({
        message: `Replaced workflow with ${nodesWithOrigin.length} nodes from ${origin || 'external source'}`,
        type: "success"
      });
    }
  };
  
  // Handle merging the incoming flow with the current flow
  const handleMergeFlow = () => {
    if (incomingFlow) {
      // Check if the flow has origin metadata
      const origin = incomingFlow.metadata?.origin || incomingFlow.metadata?.source;
      
      // Add origin to each node if it exists in the metadata
      const nodesWithOrigin = incomingFlow.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          origin: origin || node.data.origin || null
        },
        // Adjust positions to prevent overlap with existing nodes
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50
        }
      }));
      
      // Update nodes and edges with the merged data
      setNodes(nodes => [...nodes, ...nodesWithOrigin]);
      setEdges(edges => [...edges, ...incomingFlow.edges]);
      
      closeWebhookFlowModal();
      setIncomingFlow(null);
      
      addNotification({
        message: `Merged ${nodesWithOrigin.length} nodes from ${origin || 'external source'} into workflow`,
        type: "success"
      });
    }
  };

  // Handle duplicating the current flow
  const handleDuplicateFlow = () => {
    if (nodes.length === 0) {
      addNotification({
        message: "No nodes to duplicate. Create some nodes first.",
        type: "warning"
      });
      return;
    }

    try {
      // Use the duplicateFlow utility to create duplicates
      const { nodes: duplicatedNodes, edges: duplicatedEdges } = duplicateFlow(nodes, edges);
      
      // Add the duplicated nodes and edges to the current flow
      setNodes(currentNodes => [...currentNodes, ...duplicatedNodes]);
      setEdges(currentEdges => [...currentEdges, ...duplicatedEdges]);
      
      addNotification({
        message: `Successfully duplicated ${duplicatedNodes.length} nodes and ${duplicatedEdges.length} connections`,
        type: "success"
      });

      // Auto-fit the view to show all nodes including duplicates
      setTimeout(() => {
        if (flowInstance.current) {
          flowInstance.current.fitView({ padding: 0.1 });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error duplicating flow:', error);
      addNotification({
        message: `Error duplicating flow: ${error.message}`,
        type: "error"
      });
    }
  };

  const getConnectedNodes = useCallback((nodeId) => {
    if (!nodeId) return [];
    
    // Get edges that connect TO this node (incoming edges)
    // Add safety checks for edges array and edge properties
    const incomingEdges = (edges || []).filter(edge => edge && edge.target === nodeId);
    
    // Get the source nodes that connect to this logic node
    const connectedNodes = incomingEdges.map(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      if (!sourceNode) return null;
      
      // Get output schema based on node type
      const nodeType = sourceNode.type || sourceNode.data?.nodeType;
      const nodeLabel = sourceNode.data?.label || sourceNode.data?.name || `${nodeType} Node`;
      
      return {
        id: sourceNode.id,
        type: nodeLabel, // Use the actual label for display
        nodeType: nodeType, // Keep the actual node type
        outputs: getOutputSchemaForNode(sourceNode.data, nodeType)
      };
    }).filter(Boolean); // Remove null entries
    
    return connectedNodes;
  }, [nodes, edges]);
  
  // Function to get output schema for each node type (same as in EditModal)
  const getOutputSchemaForNode = (nodeData, nodeType) => {
    const schemas = {
      agent: {
        response: { type: 'string', sample: 'AI agent response text' },
        status: { type: 'string', sample: 'completed' },
        token_usage: { type: 'number', sample: 150 },
        execution_time: { type: 'number', sample: 2.5 }
      },
      task: {
        result: { type: 'string', sample: 'Task execution result' },
        status: { type: 'string', sample: 'success' },
        output: { type: 'object', sample: '{data: "processed"}' },
        duration: { type: 'number', sample: 1.5 }
      },
      tool: {
        response: { type: 'object', sample: '{result: "tool output"}' },
        status_code: { type: 'number', sample: 200 },
        success: { type: 'boolean', sample: true },
        error: { type: 'string', sample: null }
      },
      input: {
        value: { type: 'string', sample: 'User input text' },
        type: { type: 'string', sample: 'text' },
        timestamp: { type: 'number', sample: Date.now() }
      },
      chatbot: {
        message: { type: 'string', sample: 'Chatbot response' },
        conversation_id: { type: 'string', sample: 'conv_123' },
        user_input: { type: 'string', sample: 'User message' }
      },
      trigger: {
        triggered: { type: 'boolean', sample: true },
        trigger_time: { type: 'string', sample: '2024-01-01T12:00:00Z' },
        payload: { type: 'object', sample: '{data: "trigger data"}' }
      },
      delay: {
        completed: { type: 'boolean', sample: true },
        duration: { type: 'string', sample: '5s' },
        start_time: { type: 'string', sample: '2024-01-01T12:00:00Z' }
      }
    };
    
    return schemas[nodeType] || {};
  };

  const [showCrewAIImporter, setShowCrewAIImporter] = useState(false);

  // Add handler for CrewAI import
  const handleCrewAIImport = useCallback(async (importData) => {
    try {
      console.log('Importing CrewAI workflow:', importData);
      
      // Clear existing nodes and edges
      setNodes([]);
      setEdges([]);
      
      // Add imported nodes and edges
      setNodes(importData.nodes);
      setEdges(importData.edges);
      
      // Show success notification
      addNotification({
        message: `Successfully imported ${importData.nodes.length} nodes and ${importData.edges.length} connections from CrewAI YAML`,
        type: 'success'
      });
      
      // Auto-fit the view to show all imported nodes
      setTimeout(() => {
        if (flowInstance.current) {
          flowInstance.current.fitView({ padding: 0.1 });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error importing CrewAI workflow:', error);
      addNotification({
        message: `Error importing CrewAI workflow: ${error.message}`,
        type: 'error'
      });
    }
  }, [setNodes, setEdges, addNotification, flowInstance]);

  // Load workflow from dashboard if available
  useEffect(() => {
    const loadWorkflowFromDashboard = () => {
      const workflowData = localStorage.getItem('loadWorkflow');
      if (workflowData) {
        try {
          const workflow = JSON.parse(workflowData);
          
          // Load the workflow data
          if (workflow.nodes) {
            setNodes(workflow.nodes);
          }
          if (workflow.edges) {
            setEdges(workflow.edges);
          }
          if (workflow.name) {
            setProjectName(workflow.name);
          }
          
          // Clear the localStorage item
          localStorage.removeItem('loadWorkflow');
          
          toast.success(`Loaded workflow: ${workflow.name || 'Untitled'}`);
        } catch (error) {
          console.error('Error loading workflow from dashboard:', error);
          toast.error('Failed to load workflow from dashboard');
        }
      }
    };

    loadWorkflowFromDashboard();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Toolbar - Essential Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Nodai</h1>
            <div className="text-sm text-gray-500">|</div>
            <div className="text-sm text-gray-600">{projectName || 'Untitled Project'}</div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save Button */}
            <button
              onClick={saveProject}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </button>
            
            {/* Load/Import Dropdown */}
            <div className="relative group">
              <button className="px-3 py-1.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Load
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  onClick={loadProject}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Load Project
                </button>
                <button
                  onClick={() => setShowCrewAIImporter(true)}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import CrewAI YAML
                </button>
              </div>
            </div>
            
            {/* Export Dropdown */}
            <div className="relative group">
              <button className="px-3 py-1.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  onClick={exportYAML}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export YAML
                </button>
                <button
                  onClick={exportMainPy}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Export Python
                </button>
              </div>
            </div>
            
            {/* Duplicate Button */}
            <button
              onClick={handleDuplicateFlow}
              className="px-3 py-1.5 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
              title="Duplicate Flow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Modern Sidebar */}
        <ModernSidebar 
          onAddNode={(nodeType) => {
            switch(nodeType) {
              case 'agent': addAgent(); break;
              case 'task': addTask(); break;
              case 'tool': 
              case 'web_search':
              case 'file_reader':
              case 'api_call':
              case 'database':
              case 'email':
              case 'custom_tool':
                addTool(); break;
              case 'chatbot': addChatNode(); break;
              case 'trigger': addTriggerNode(); break;
              case 'input': addInputNode(); break;
              case 'output': addOutputNode(); break;
              case 'logic': addLogicNode(); break;
              case 'delay': addDelayNode(); break;
              default: console.warn('Unknown node type:', nodeType);
            }
          }}
          onOpenTemplates={() => toggleTemplateModal(true)}
          onOpenToolTemplates={() => toggleToolTemplates(true)}
          onOpenSmartTools={openSmartTools}
          // Project Management
          onSaveProject={saveProject}
          onLoadProject={loadProject}
          onExportYAML={exportYAML}
          onExportPython={exportMainPy}
          onDuplicateFlow={handleDuplicateFlow}
          // UI Controls
          onShowCrewAIImporter={() => setShowCrewAIImporter(true)}
        />
        
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Input Panel - Compact */}
          <div className="border-b border-gray-200 bg-white px-4 py-2">
            <div className="flex items-center gap-4">
        <InputPanel inputs={inputs} setInputs={setInputs} nodes={nodes} />
        <button 
                className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg transition-colors"
          onClick={() => toggleTriggerHistory(true)}
        >
          Trigger History
        </button>
            </div>
      </div>
      
          {/* Output Config - Compact */}
      <OutputConfigPanel outputConfig={outputConfig} setOutputConfig={setOutputConfig} />
      
          {/* Flow Canvas */}
          <div className="flex-1 relative bg-gray-50">
        <ReactFlowProvider>
          <FlowCanvass
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => handleNodeEdit(node.id)}
            onNodeDragStop={onNodeDragStop}
            onEdgeClick={(_, edge) => {
              if (window.confirm('Do you want to delete this connection?')) {
                setEdges(edges => edges.filter(e => e.id !== edge.id));
              }
            }}
            connectionLineType="bezier"
            defaultEdgeOptions={{
              type: 'animated',
              animated: isExecuting,
              style: {
                stroke: '#888',
                strokeWidth: 1.5,
                strokeDasharray: '5,5'
              }
            }}
            onMove={setViewport}
            viewport={viewport}
            ref={flowInstance}
            nodeStates={nodeStates}
            connectionStates={connectionStates}
            isExecuting={isExecuting}
          />
        </ReactFlowProvider>
        
            {/* Zoom Controls */}
        <ZoomControls 
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetView={resetZoom}
          fitView={() => flowInstance.current?.fitView({ padding: 0.2 })}
        />
          </div>
        </div>
      </div>
      
      {/* Unified Execution Panel */}
      {showExecutionPanel && (
        <UnifiedExecutionPanel
          logs={textLogs}
          structuredLogs={structuredLogs}
          isMinimized={minimizeExecutionPanel}
          onToggleMinimize={toggleMinimizeExecutionPanel}
          onClose={() => toggleExecutionPanel(false)}
          onClearLogs={() => {
            setTextLogs([]);
            setStructuredLogs([]);
          }}
          executionMode={executionMode}
          pollingInterval={customPollingInterval}
          onPollingIntervalChange={setCustomPollingInterval}
          nodes={nodes}
        />
      )}
      
      {/* RunCrew Button - Bottom Right (Restored) */}
      <RunCrewButton
        onClick={() => {
          runCrew();
          toggleExecutionPanel(true);
        }}
        isRunning={isExecuting}
        hasErrors={validateFlow().some(issue => issue.type === 'error')}
        nodeCount={nodes.length}
      />
      
      {/* Center Bottom Action Group */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 z-50">
        <button
          onClick={() => togglePreview(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg transition-colors"
          title="Preview workflow"
        >
          👁️ Preview
        </button>
        
        <button
          onClick={() => {
            console.log('🧪 Test States clicked - Starting test execution...');
            testExecutionStates();
          }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors"
          title="Run test execution to simulate workflow states"
        >
          🧪 Test States
        </button>
      </div>
      
      {/* Modals and Overlays */}
      {showEditModal && selectedNode && (
        <EditModall
          isOpen={showEditModal}
          onClose={closeEditModal}
          onSave={onSaveEdit}
          nodeData={selectedNode.data}
          nodeType={selectedNode.type}
          connectedNodes={getConnectedNodes(selectedNode.id)}
        />
      )}
      
      {showToolTemplates && (
        <ToolTemplates
          onClose={closeToolTemplates}
          onSelectTemplate={onSelectToolTemplate}
          showRegistry={true}
          onSelectToolFromRegistry={handleToolFromRegistry}
        />
      )}

      {showSmartTools && (
        <SmartToolSelector
          onToolSelect={handleSmartToolSelect}
          onClose={closeSmartTools}
        />
      )}
      
      {showPreview && (
        <PreviewMode 
          nodes={nodes}
          edges={edges}
          onClose={closePreview}
        />
      )}
      
      {showHelpPanel && (
        <HelpPanel onClose={closeHelpPanel} />
      )}
      
      {showTemplateModal && (
        <TemplateModal
          templates={flowTemplates}
          onClose={closeTemplateModal}
          onSelectTemplate={applyFlowTemplate}
        />
      )}

      {showTriggerHistory && (
        <TriggerHistoryPanel 
          isVisible={showTriggerHistory}
          onClose={() => toggleTriggerHistory(false)}
          executedTriggers={executedTriggers}
        />
      )}

      {showWebhookFlowModal && (
        <WebhookFlowModal
          isOpen={showWebhookFlowModal}
          onClose={closeWebhookFlowModal}
          onReplace={handleReplaceFlow}
          onMerge={handleMergeFlow}
          onDuplicate={handleDuplicateFlow}
          flowData={incomingFlow}
        />
      )}

      {showCrewAIImporter && (
        <CrewAIImporter
          onImport={handleCrewAIImport}
          onClose={() => setShowCrewAIImporter(false)}
        />
      )}

      {/* Notifications */}
      <div className="fixed bottom-4 left-4 space-y-2 z-50">
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
    </div>
  );
};

// Wrapper component that provides all contexts
const Builder = () => {
  return (
    <FlowProvider>
      <BuilderUIProvider>
        <NotificationProvider>
          <BuilderPageContent />
        </NotificationProvider>
      </BuilderUIProvider>
    </FlowProvider>
  );
};

export default Builder;