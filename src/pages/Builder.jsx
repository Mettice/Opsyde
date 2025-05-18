import React, { useEffect, useCallback } from 'react';
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
import EnhancedToolbar from '../components/builder/EnhancedToolbar';
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
import OutputPanel from '../components/webrunners/OutputPanel';
import WebhookFlowModal from '../components/WebhookFlowModal';
import TriggerHistoryPanel from '../components/TriggerHistoryPanel';
import UnifiedExecutionPanel from '../components/webrunners/UnifiedExecutionPanel';
import Notification from '../components/Notification';

// Custom Hooks
import { useNodeManagement } from '../hooks/useNodeManagement';
import { useFlowExecution } from '../hooks/useFlowExecution';
import { useWorkflowExport } from '../hooks/useWorkflowExport';
import { useToolTemplates } from '../hooks/useToolTemplates';
import { useTriggers } from '../hooks/useTriggers';
import useThrottledViewport from '../hooks/useThrottledViewport';
import useThrottledZoom from '../hooks/useThrottledZoom';

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
    showTemplateModal, closeTemplateModal,
    showWebhookFlowModal, closeWebhookFlowModal,
    
    // Panel states
    showRunnerPanel, toggleRunnerPanel,
    showOutputPanel, toggleOutputPanel,
    showTriggerHistory, toggleTriggerHistory,
    showExecutionPanel, toggleExecutionPanel,
    
    // Minimized states
    minimizeRunnerPanel, toggleMinimizeRunnerPanel,
    minimizeOutputPanel, toggleMinimizeOutputPanel,
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
    
    setNodes(nodes => 
      nodes.map(node => {
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
    executionState,
    runCrew,
    validateFlow
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
    addNotification
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
  
  // Create toolbar props
  const toolbarProps = {
    onAddAgent: addAgent,
    onAddTask: addTask,
    onAddTool: () => toggleToolTemplates(true),
    onAddChat: addChatNode,
    onAddDelay: addDelayNode,
    onAddTrigger: addTriggerNode,
    onAddLogicNode: addLogicNode,
    onAddInputNode: addInputNode,
    onAddOutputNode: addOutputNode,
    onSaveProject: saveProject,
    onLoadProject: loadProject,
    onExportYAML: exportYAML,
    onExportPython: exportMainPy,
    onExportProject: exportProject,
    onPreviewWorkflow: () => togglePreview(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleExecutionMode: toggleExecutionMode,
    executionMode
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <NavHeader 
        showHelp={() => toggleHelpPanel(true)} 
        projectName={projectName}
        editingProjectName={editingProjectName}
        setEditingProjectName={setEditingProjectName}
        setProjectName={setProjectName}
        isBuilderPage={true}
      />
      
      <EnhancedToolbar toolbarProps={toolbarProps} />
      
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100">
        <InputPanel inputs={inputs} setInputs={setInputs} nodes={nodes} />
        <button 
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm ml-2"
          onClick={() => toggleTriggerHistory(true)}
        >
          Trigger History
        </button>
      </div>
      
      <OutputConfigPanel outputConfig={outputConfig} setOutputConfig={setOutputConfig} />
      
      <div className="flex-1 relative">
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
              type: 'bezier',
              animated: true,
              style: {
                stroke: '#888',
                strokeWidth: 1.5,
                strokeDasharray: '5,5'
              }
            }}
            onMove={setViewport}
            viewport={viewport}
            ref={flowInstance}
          />
        </ReactFlowProvider>
        
        <ZoomControls 
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetView={resetZoom}
          fitView={() => flowInstance.current?.fitView({ padding: 0.2 })}
        />
      </div>
      
      {/* Conditionally rendered modals */}
      {showEditModal && selectedNode && (
        <EditModall
          isOpen={showEditModal}
          onClose={closeEditModal}
          onSave={onSaveEdit}
          nodeData={selectedNode.data}
          nodeType={selectedNode.type}
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

      {/* Run Button */}
      <RunCrewButton 
        onClick={() => {
          runCrew();
          // Automatically show the execution panel when running a flow
          toggleExecutionPanel(true);
        }}
        isRunning={isExecuting}
        hasErrors={validateFlow().length > 0}
        nodeCount={nodes.length}
      />

      {/* Panels */}
      {showRunnerPanel && (
        <WebRunnerPanel
          logs={executionLogs}
          onClose={() => toggleRunnerPanel(false)}
          isMinimized={minimizeRunnerPanel}
          onToggleMinimize={toggleMinimizeRunnerPanel}
        />
      )}

      {showOutputPanel && (
        <OutputPanel
          logs={executionLogs}
          onExport={handleExport}
          isMinimized={minimizeOutputPanel}
          onToggleMinimize={toggleMinimizeOutputPanel}
        />
      )}

      {showTriggerHistory && (
        <TriggerHistoryPanel 
          isVisible={showTriggerHistory}
          onClose={() => toggleTriggerHistory(false)}
          executedTriggers={executedTriggers}
        />
      )}

      {showExecutionPanel && (
        <UnifiedExecutionPanel
          logs={textLogs}
          structuredLogs={structuredLogs}
          isMinimized={minimizeExecutionPanel}
          onToggleMinimize={toggleMinimizeExecutionPanel}
          onClose={() => {
            toggleExecutionPanel(false);
            setStructuredLogs([]);
          }}
          executionMode={executionMode}
          pollingInterval={customPollingInterval}
          onPollingIntervalChange={setCustomPollingInterval}
        />
      )}

      {/* Webhook Flow Modal */}
      {showWebhookFlowModal && (
        <WebhookFlowModal
          isOpen={showWebhookFlowModal}
          onClose={closeWebhookFlowModal}
          onReplace={handleReplaceFlow}
          onMerge={handleMergeFlow}
          flowData={incomingFlow}
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