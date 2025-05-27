// FlowCanvas.jsx
import React, { useRef, useMemo, useCallback, useEffect, useState, forwardRef } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  useKeyPress
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

// Custom components
import AnimatedEdge from './AnimatedEdge';
import FloatingMetricsPanel from "./builder/FloatingMetricsPanel";
import TemplateGallery from './flowcanvas/TemplateGallery';
import ContextMenu from './ContextMenu';
import SaveTemplateModal from './SaveTemplateModal';
import TemplateManager from './TemplateManager';

// Utilities
import { validateConnection } from '../utils/validateConnection';
import { nodeTypes } from '../utils/nodeTypes';
import { useBuilderUI } from '../contexts/BuilderUIContext';
import { 
  cloneNode, 
  copyNodesToClipboard, 
  pasteNodesFromClipboard, 
  saveAsTemplate,
  validateClipboardData
} from '../utils/flowUtils';

// Enhanced edge types with execution state
const edgeTypes = {
  default: AnimatedEdge,
  animated: AnimatedEdge,
};

// Safe toast helper with fallback
const safeToast = {
  success: (message) => {
    if (toast && typeof toast.success === 'function') {
      toast.success(message);
    } else {
      console.log('SUCCESS:', message);
    }
  },
  error: (message) => {
    if (toast && typeof toast.error === 'function') {
      toast.error(message);
    } else {
      console.error('ERROR:', message);
    }
  },
  info: (message) => {
    if (toast && typeof toast === 'function') {
      toast(message);
    } else if (toast && typeof toast.info === 'function') {
      toast.info(message);
    } else {
      console.log('INFO:', message);
    }
  }
};

// Enhanced FlowCanvas component with execution visuals and cloning
const FlowCanvasBase = forwardRef(({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  className = '',
  style = {},
  nodeStates = new Map(),
  connectionStates = new Map(),
  isExecuting = false,
  ...reactFlowProps // All other props go to ReactFlow, not the div
}, ref) => {
  const { 
    showTemplateGallery,
    toggleTemplateGallery,
  } = useBuilderUI();

  const reactFlowInstance = useReactFlow();
  
  // Ensure nodes and edges are valid arrays and filter out null/undefined values
  const safeNodes = useMemo(() => {
    return Array.isArray(nodes) ? nodes.filter(node => node && typeof node === 'object' && node.id) : [];
  }, [nodes]);

  const safeEdges = useMemo(() => {
    return Array.isArray(edges) ? edges.filter(edge => edge && typeof edge === 'object' && edge.id) : [];
  }, [edges]);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedNodes: [],
    nodeType: null
  });

  // Template modals state
  const [saveTemplateModal, setSaveTemplateModal] = useState({
    isOpen: false,
    selectedNodes: [],
    selectedEdges: []
  });
  
  const [templateManager, setTemplateManager] = useState({
    isOpen: false,
    currentPosition: { x: 100, y: 100 }
  });

  // Mouse position tracking for paste operations
  const [mousePosition, setMousePosition] = useState({ x: 100, y: 100 });
  const [canPaste, setCanPaste] = useState(false);

  // Check clipboard on mount and focus
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const isValid = await validateClipboardData();
        setCanPaste(isValid);
      } catch (error) {
        console.warn('Error checking clipboard:', error);
        setCanPaste(false);
      }
    };

    checkClipboard();
    window.addEventListener('focus', checkClipboard);
    return () => window.removeEventListener('focus', checkClipboard);
  }, []);

  // Keyboard shortcuts
  const deletePressed = useKeyPress('Delete');
  const ctrlCPressed = useKeyPress(['Meta+c', 'Control+c']);
  const ctrlVPressed = useKeyPress(['Meta+v', 'Control+v']);
  const ctrlDPressed = useKeyPress(['Meta+d', 'Control+d']);

  // Node operations - Define callbacks before useEffect hooks
  const handleDuplicateNodes = useCallback((selectedNodes) => {
    if (selectedNodes.length === 0) return;

    const clonedNodes = selectedNodes.map(node => cloneNode(node));
    const newNodes = [...safeNodes, ...clonedNodes];
    
    // Update selection to show only the new cloned nodes
    const updatedNodes = newNodes.map(node => ({
      ...node,
      selected: clonedNodes.some(cloned => cloned.id === node.id)
    }));
    
    onNodesChange([{ type: 'reset', items: updatedNodes }]);
    
    safeToast.success(`Duplicated ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`);
  }, [safeNodes, onNodesChange]);

  const handleCopyNodes = useCallback(async (selectedNodes) => {
    if (selectedNodes.length === 0) return;

    const selectedEdges = safeEdges.filter(edge => 
      selectedNodes.some(node => node.id === edge.source) && 
      selectedNodes.some(node => node.id === edge.target)
    );

    try {
      const success = await copyNodesToClipboard(selectedNodes, selectedEdges);
      
      if (success) {
        setCanPaste(true);
        safeToast.success(`Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''} to clipboard`);
      } else {
        safeToast.error('Failed to copy nodes. Try using the context menu instead.');
      }
    } catch (error) {
      console.error('Copy operation failed:', error);
      safeToast.error('Failed to copy nodes to clipboard');
    }
  }, [safeEdges]);

  const handlePasteNodes = useCallback(async () => {
    try {
      const pastedData = await pasteNodesFromClipboard(mousePosition);
      
      if (pastedData && pastedData.nodes && pastedData.nodes.length > 0) {
        const newNodes = [...safeNodes, ...pastedData.nodes];
        const newEdges = [...safeEdges, ...(pastedData.edges || [])];
        
        // Update selection to show only the pasted nodes
        const updatedNodes = newNodes.map(node => ({
          ...node,
          selected: pastedData.nodes.some(pasted => pasted.id === node.id)
        }));
        
        onNodesChange([{ type: 'reset', items: updatedNodes }]);
        onEdgesChange([{ type: 'reset', items: newEdges }]);
        
        safeToast.success(`Pasted ${pastedData.nodes.length} node${pastedData.nodes.length > 1 ? 's' : ''}`);
      } else {
        safeToast.info('No nodes to paste. Copy some nodes first using Ctrl+C or the context menu.');
      }
    } catch (error) {
      console.error('Paste operation failed:', error);
      safeToast.error('Failed to paste nodes from clipboard');
    }
  }, [safeNodes, safeEdges, mousePosition, onNodesChange, onEdgesChange]);

  const handleDeleteNodes = useCallback((selectedNodes) => {
    if (selectedNodes.length === 0) return;

    const nodeIds = selectedNodes.map(node => node.id);
    const remainingNodes = safeNodes.filter(node => !nodeIds.includes(node.id));
    const remainingEdges = safeEdges.filter(edge => 
      !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
    );
    
    onNodesChange([{ type: 'reset', items: remainingNodes }]);
    onEdgesChange([{ type: 'reset', items: remainingEdges }]);
    
    safeToast.success(`Deleted ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`);
  }, [safeNodes, safeEdges, onNodesChange, onEdgesChange]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Context menu action wrappers
  const handleContextDuplicate = useCallback((selectedNodes) => {
    handleDuplicateNodes(selectedNodes);
    closeContextMenu();
  }, [handleDuplicateNodes, closeContextMenu]);

  const handleContextCopy = useCallback((selectedNodes) => {
    handleCopyNodes(selectedNodes);
    closeContextMenu();
  }, [handleCopyNodes, closeContextMenu]);

  const handleContextPaste = useCallback(() => {
    handlePasteNodes();
    closeContextMenu();
  }, [handlePasteNodes, closeContextMenu]);

  const handleContextDelete = useCallback((selectedNodes) => {
    handleDeleteNodes(selectedNodes);
    closeContextMenu();
  }, [handleDeleteNodes, closeContextMenu]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const selectedNodes = safeNodes.filter(node => node && node.selected);
    
    if (deletePressed && selectedNodes.length > 0) {
      handleContextDelete(selectedNodes);
    }
  }, [deletePressed, safeNodes, handleContextDelete]);

  useEffect(() => {
    const selectedNodes = safeNodes.filter(node => node && node.selected);
    
    if (ctrlCPressed && selectedNodes.length > 0) {
      handleContextCopy(selectedNodes);
    }
  }, [ctrlCPressed, safeNodes, safeEdges, handleContextCopy]);

  useEffect(() => {
    if (ctrlVPressed) {
      handleContextPaste();
    }
  }, [ctrlVPressed, mousePosition, handleContextPaste]);

  useEffect(() => {
    const selectedNodes = safeNodes.filter(node => node && node.selected);
    
    if (ctrlDPressed && selectedNodes.length > 0) {
      handleContextDuplicate(selectedNodes);
    }
  }, [ctrlDPressed, safeNodes, handleContextDuplicate]);

  // Enhanced connection validation
  const isValidConnection = useCallback((connection) => {
    return validateConnection(connection, safeNodes, safeEdges, safeToast);
  }, [safeNodes, safeEdges]);

  const handleConnect = useCallback((params) => {
    console.log('Connection attempt:', params);
    
    if (validateConnection(params, safeNodes, safeEdges, safeToast)) {
      onConnect(params);
      safeToast.success('Connection created successfully!');
    } else {
      safeToast.error('Invalid connection');
    }
  }, [safeNodes, safeEdges, onConnect]);

  // Mouse tracking for paste position
  const handleMouseMove = useCallback((event) => {
    if (reactFlowInstance) {
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setMousePosition(position);
    }
  }, [reactFlowInstance]);

  // Context menu handlers
  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    
    const selectedNodes = safeNodes.filter(node => node && node.selected);
    const nodeType = selectedNodes.length === 1 ? selectedNodes[0].type : null;
    
    setContextMenu({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY },
      selectedNodes,
      nodeType
    });
  }, [safeNodes]);

  const handleSaveAsTemplate = useCallback((selectedNodes) => {
    if (selectedNodes.length === 0) return;

    const selectedEdges = safeEdges.filter(edge => 
      selectedNodes.some(node => node.id === edge.source) && 
      selectedNodes.some(node => node.id === edge.target)
    );

    setSaveTemplateModal({
      isOpen: true,
      selectedNodes,
      selectedEdges
    });
    
    closeContextMenu();
  }, [safeEdges, closeContextMenu]);

  const handleSaveTemplate = useCallback(async (selectedNodes, selectedEdges, name, description) => {
    try {
      const template = await saveAsTemplate(selectedNodes, selectedEdges, name, description);
      
      if (template) {
        safeToast.success('Template saved successfully!');
        setSaveTemplateModal({ isOpen: false, selectedNodes: [], selectedEdges: [] });
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      console.error('Template save error:', error);
      safeToast.error('Failed to save template');
    }
  }, []);

  const handleOpenTemplateManager = useCallback(() => {
    setTemplateManager({
      isOpen: true,
      currentPosition: mousePosition
    });
  }, [mousePosition]);

  const handleApplyTemplate = useCallback((templateNodes, templateEdges) => {
    try {
      const newNodes = [...safeNodes, ...templateNodes];
      const newEdges = [...safeEdges, ...templateEdges];
      
      // Update selection to show only the template nodes
      const updatedNodes = newNodes.map(node => ({
      ...node,
        selected: templateNodes.some(template => template.id === node.id)
      }));
      
      onNodesChange([{ type: 'reset', items: updatedNodes }]);
      onEdgesChange([{ type: 'reset', items: newEdges }]);
      
      safeToast.success(`Applied template with ${templateNodes.length} nodes`);
      setTemplateManager({ isOpen: false, currentPosition: { x: 100, y: 100 } });
    } catch (error) {
      console.error('Template apply error:', error);
      safeToast.error('Failed to apply template');
    }
  }, [safeNodes, safeEdges, onNodesChange, onEdgesChange]);

  // Enhanced nodes with execution state
  const enhancedNodes = useMemo(() => {
    return (safeNodes || []).map(node => {
      if (!node) return null;
      return {
        ...node,
        data: {
          ...(node.data || {}),
          executionState: nodeStates.get(node.id) || { status: 'idle', progress: 0 }
        }
      };
    }).filter(Boolean);
  }, [safeNodes, nodeStates]);

  // Enhanced edges with connection state
  const enhancedEdges = useMemo(() => {
    return (safeEdges || []).map(edge => {
      if (!edge) return null;
      return {
        ...edge,
      data: {
          ...(edge.data || {}),
          state: connectionStates.get(edge.id)?.state || 'idle',
          animated: connectionStates.get(edge.id)?.state === 'active' || connectionStates.get(edge.id)?.state === 'processing'
      }
      };
    }).filter(Boolean);
  }, [safeEdges, connectionStates]);

  return (
    <div 
      ref={ref}
      className={`flow-canvas relative ${className}`} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        ...style 
      }}
      onMouseMove={handleMouseMove}
      onContextMenu={handleContextMenu}
    >
      <ReactFlow
        nodes={enhancedNodes}
        edges={enhancedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        {...reactFlowProps}
      >
        <Background 
          variant="dots" 
          gap={20} 
          size={1} 
          color="#e2e8f0"
        />
        
        <MiniMap 
          position="bottom-left"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          nodeColor={(node) => {
            const state = nodeStates.get(node.id);
            const status = state?.status || 'idle';
            
            // Color based on execution state
            switch (status) {
              case 'processing':
                return '#3b82f6'; // Blue for processing
              case 'success':
                return '#22c55e'; // Green for success
              case 'error':
                return '#ef4444'; // Red for error
              default:
                // Default colors by type
                switch (node.type) {
                  case 'agent': return '#8b5cf6';
                  case 'task': return '#f59e0b';
                  case 'trigger': return '#ec4899';
                  case 'tool': return '#10b981';
                  case 'chatbot': return '#06b6d4';
                  case 'input': return '#84cc16';
                  case 'output': return '#f97316';
                  case 'logic': return '#eab308';
                  case 'delay': return '#a855f7';
                  default: return '#6b7280';
                }
            }
          }}
        />

        {/* Floating Metrics Panel */}
        <Panel position="top-right">
        <FloatingMetricsPanel 
          nodes={nodes} 
          edges={edges} 
            nodeStates={nodeStates}
            connectionStates={connectionStates}
            isExecuting={isExecuting}
          />
        </Panel>

        {/* Template Manager Button */}
        <Panel position="top-left">
          <button
            onClick={handleOpenTemplateManager}
            className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            title="Template Manager"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span className="text-sm font-medium">Templates</span>
            </div>
          </button>
        </Panel>
      </ReactFlow>
      
      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onDuplicate={() => handleContextDuplicate(contextMenu.selectedNodes)}
        onCopy={() => handleContextCopy(contextMenu.selectedNodes)}
        onPaste={handleContextPaste}
        onSaveAsTemplate={() => handleSaveAsTemplate(contextMenu.selectedNodes)}
        onDelete={() => handleContextDelete(contextMenu.selectedNodes)}
        selectedNodes={contextMenu.selectedNodes}
        canPaste={canPaste}
        nodeType={contextMenu.nodeType}
      />

      {/* Save Template Modal */}
      <SaveTemplateModal
        isOpen={saveTemplateModal.isOpen}
        onClose={() => setSaveTemplateModal({ isOpen: false, selectedNodes: [], selectedEdges: [] })}
        onSave={handleSaveTemplate}
        selectedNodes={saveTemplateModal.selectedNodes}
        selectedEdges={saveTemplateModal.selectedEdges}
      />

      {/* Template Manager */}
      <TemplateManager
        isOpen={templateManager.isOpen}
        onClose={() => setTemplateManager({ isOpen: false, currentPosition: { x: 100, y: 100 } })}
        onApplyTemplate={handleApplyTemplate}
        currentPosition={templateManager.currentPosition}
      />

      {/* Template Gallery */}
      {showTemplateGallery && <TemplateGallery />}

      {/* Floating Template Button */}
      {!showTemplateGallery && (
      <button 
          onClick={() => toggleTemplateGallery(true)}
          className="fixed bottom-32 left-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 group"
          title="Browse Templates"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <span className="hidden group-hover:block text-sm font-medium whitespace-nowrap">
              Templates
            </span>
          </div>
      </button>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 text-xs">
        <div className="font-medium text-gray-800 mb-2">Shortcuts:</div>
        <div className="space-y-1 text-gray-600">
          <div>Ctrl+C: Copy</div>
          <div>Ctrl+V: Paste</div>
          <div>Ctrl+D: Duplicate</div>
          <div>Delete: Remove</div>
          <div>Right-click: Menu</div>
        </div>
      </div>

      {/* Simple Visual Metrics */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">Nodes: {nodes.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Connections: {edges.length}</span>
          </div>
          {isExecuting && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="text-orange-600">Executing</span>
            </div>
          )}
        </div>
      </div>

      {/* Template Manager Modal */}
      {templateManager.isOpen && (
        <TemplateManager
          isOpen={templateManager.isOpen}
          onClose={() => setTemplateManager({ isOpen: false, currentPosition: { x: 100, y: 100 } })}
          onApplyTemplate={handleApplyTemplate}
          position={templateManager.currentPosition}
        />
      )}

      {/* Debug Panel for Development */}
      {process.env.NODE_ENV === 'development' && (
        <Panel position="bottom-right">
          <div className="bg-black/80 text-white p-2 rounded text-xs space-y-1">
            <div>Toast Available: {toast ? '✅' : '❌'}</div>
            <div>Can Paste: {canPaste ? '✅' : '❌'}</div>
            <div>Selected: {safeNodes.filter(n => n.selected).length} nodes</div>
            <div>Clipboard: {navigator.clipboard ? 'API' : 'Fallback'}</div>
          </div>
        </Panel>
      )}
    </div>
  );
});

FlowCanvasBase.displayName = 'FlowCanvasBase';

FlowCanvasBase.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  onNodesChange: PropTypes.func.isRequired,
  onEdgesChange: PropTypes.func.isRequired,
  onConnect: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func,
  onEdgeClick: PropTypes.func,
  onPaneClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  nodeStates: PropTypes.instanceOf(Map),
  connectionStates: PropTypes.instanceOf(Map),
  isExecuting: PropTypes.bool,
};

// Wrap with ReactFlowProvider
const FlowCanvass = forwardRef((props, ref) => (
  <ReactFlowProvider>
    <FlowCanvasBase {...props} ref={ref} />
  </ReactFlowProvider>
));

FlowCanvass.displayName = 'FlowCanvass';

export default FlowCanvass;