// FlowCanvas.jsx
import React, { useRef, useMemo, useCallback, useEffect, useState, forwardRef } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  useKeyPress,
  Controls
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

// Custom components
import AnimatedEdge from './AnimatedEdge';
import FloatingIntegrationHub from "./FloatingIntegrationHub";
import TemplateGallery from './flowcanvas/TemplateGallery';
import ContextMenu from './ContextMenu';
import SaveTemplateModal from './SaveTemplateModal';
import TemplateManager from './TemplateManager';
import LLMModeToggle from './LLMModeToggle';

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

// 🦄 MAGICAL NEURAL NETWORK BACKGROUND COMPONENT
const MagicalCanvasBackground = ({ isExecuting, nodeCount, connectionCount }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const animationFrame = () => {
      setTime(Date.now() * 0.001);
      requestAnimationFrame(animationFrame);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrame();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Generate neural network nodes
  const neuralNodes = useMemo(() => {
    const nodes = [];
    const nodeCountBase = Math.max(15, Math.min(30, nodeCount * 2));
    
    for (let i = 0; i < nodeCountBase; i++) {
      nodes.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
        color: `hsl(${200 + Math.random() * 60}, 70%, ${60 + Math.random() * 20}%)`
      });
    }
    return nodes;
  }, [nodeCount]);

  // Generate floating orbs
  const floatingOrbs = useMemo(() => {
    const orbs = [];
    for (let i = 0; i < 8; i++) {
      orbs.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 60 + 40,
        speed: Math.random() * 0.3 + 0.1,
        hue: Math.random() * 360,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
    return orbs;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at ${mousePos.x * 0.1}% ${mousePos.y * 0.1}%, 
              rgba(59, 130, 246, 0.1) 0%, 
              rgba(147, 51, 234, 0.05) 50%, 
              transparent 100%),
            linear-gradient(135deg, 
              #f8fafc 0%, 
              #e2e8f0 25%, 
              #cbd5e1 50%, 
              #e2e8f0 75%, 
              #f1f5f9 100%)
          `,
          animation: isExecuting ? 'pulse 2s ease-in-out infinite' : 'none'
        }}
      />

      {/* Floating Gradient Orbs */}
      {floatingOrbs.map((orb) => (
        <div
          key={`orb-${orb.id}`}
          className="absolute rounded-full blur-xl"
          style={{
            left: `${orb.x + Math.sin(time * orb.speed + orb.id) * 10}%`,
            top: `${orb.y + Math.cos(time * orb.speed + orb.id) * 8}%`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            background: `radial-gradient(circle, 
              hsla(${orb.hue + time * 20}, 70%, 60%, ${orb.opacity}) 0%, 
              hsla(${orb.hue + time * 20 + 60}, 70%, 70%, ${orb.opacity * 0.5}) 50%, 
              transparent 100%)`,
            transform: `scale(${1 + Math.sin(time * 0.5 + orb.id) * 0.2})`,
            transition: 'all 0.3s ease'
          }}
        />
      ))}

      {/* Neural Network Constellation */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="50%" stopColor="rgba(147, 51, 234, 0.2)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
          </linearGradient>
        </defs>

        {/* Neural Network Connections */}
        {neuralNodes.map((node, i) => 
          neuralNodes.slice(i + 1).map((otherNode, j) => {
            const distance = Math.sqrt(
              Math.pow(node.x - otherNode.x, 2) + 
              Math.pow(node.y - otherNode.y, 2)
            );
            
            if (distance < 25) {
              const opacity = Math.max(0, (25 - distance) / 25) * 0.4;
              const animatedOpacity = opacity * (1 + Math.sin(time * 2 + i + j) * 0.3);
              
              return (
                <line
                  key={`connection-${i}-${j}`}
                  x1={`${node.x + Math.sin(time * node.speed + node.phase) * 2}%`}
                  y1={`${node.y + Math.cos(time * node.speed + node.phase) * 2}%`}
                  x2={`${otherNode.x + Math.sin(time * otherNode.speed + otherNode.phase) * 2}%`}
                  y2={`${otherNode.y + Math.cos(time * otherNode.speed + otherNode.phase) * 2}%`}
                  stroke="url(#connectionGradient)"
                  strokeWidth={isExecuting ? "2" : "1"}
                  opacity={animatedOpacity}
                  filter="url(#glow)"
                >
                  {isExecuting && (
                    <animate
                      attributeName="opacity"
                      values={`${animatedOpacity};${animatedOpacity * 1.5};${animatedOpacity}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </line>
              );
            }
            return null;
          })
        )}

        {/* Neural Network Nodes */}
        {neuralNodes.map((node) => (
          <circle
            key={`node-${node.id}`}
            cx={`${node.x + Math.sin(time * node.speed + node.phase) * 2}%`}
            cy={`${node.y + Math.cos(time * node.speed + node.phase) * 2}%`}
            r={node.size}
            fill={node.color}
            opacity={0.6 + Math.sin(time * 2 + node.phase) * 0.2}
            filter="url(#glow)"
          >
            {isExecuting && (
              <animate
                attributeName="r"
                values={`${node.size};${node.size * 1.5};${node.size}`}
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))}

        {/* Interactive Particles around Mouse */}
        {Array.from({ length: 5 }).map((_, i) => (
          <circle
            key={`mouse-particle-${i}`}
            cx={mousePos.x + Math.sin(time * 3 + i) * 30}
            cy={mousePos.y + Math.cos(time * 3 + i) * 30}
            r={2 + Math.sin(time * 4 + i) * 1}
            fill={`hsl(${220 + i * 20}, 70%, 60%)`}
            opacity={0.4}
            filter="url(#glow)"
          />
        ))}
      </svg>

      {/* Floating Code Snippets */}
      <div className="absolute inset-0">
        {['AI', 'ML', 'API', 'LLM', 'GPT', 'CREW'].map((text, i) => (
          <div
            key={`code-${i}`}
            className="absolute text-xs font-mono text-blue-400/20 select-none"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + Math.sin(time * 0.3 + i) * 10}%`,
              transform: `rotate(${Math.sin(time * 0.2 + i) * 5}deg)`,
              animation: `float 6s ease-in-out infinite ${i * 0.5}s`
            }}
          >
            {text}
          </div>
        ))}
      </div>

      {/* Corner Decorative Elements */}
      <div className="absolute top-4 right-4 w-16 h-16 opacity-10">
        <div className="w-full h-full border-2 border-blue-400 rounded-full animate-spin-slow" />
        <div className="absolute inset-2 border border-purple-400 rounded-full animate-pulse" />
      </div>

      <div className="absolute bottom-4 left-4 w-12 h-12 opacity-10">
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg animate-pulse" 
             style={{ transform: `rotate(${time * 10}deg)` }} />
      </div>

      {/* Execution Energy Waves */}
      {isExecuting && (
        <div className="absolute inset-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`wave-${i}`}
              className="absolute inset-0 border-2 border-blue-400/20 rounded-full"
              style={{
                animation: `ping 2s cubic-bezier(0, 0, 0.2, 1) infinite ${i * 0.5}s`,
                transform: 'scale(0.5)'
              }}
            />
          ))}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

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
  nodeStates = {},
  connectionStates = {},
  isExecuting = false,
  ...reactFlowProps // All other props go to ReactFlow, not the div
}, ref) => {
  const { 
    showTemplateGallery,
    toggleTemplateGallery,
  } = useBuilderUI();

  const reactFlowInstance = useReactFlow();
  
  // Store flow instance globally for fitView access
  useEffect(() => {
    if (reactFlowInstance) {
      window.flowInstance = { current: reactFlowInstance };
    }
  }, [reactFlowInstance]);

  // Ensure nodes and edges are valid arrays and filter out null/undefined values
  const safeNodes = useMemo(() => {
    return Array.isArray(nodes) ? nodes.filter(node => node && typeof node === 'object' && node.id) : [];
  }, [nodes]);

  const safeEdges = useMemo(() => {
    const validEdgeTypes = ['default', 'animated'];
    return Array.isArray(edges) ? edges.filter(edge => edge && typeof edge === 'object' && edge.id).map(edge => {
      // Ensure edge has a valid type
      if (!edge.type || !validEdgeTypes.includes(edge.type)) {
        console.warn(`Invalid edge type '${edge.type}' for edge ${edge.id}, using 'default'`);
        return { ...edge, type: 'default' };
      }
      return edge;
    }) : [];
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

  // Keyboard shortcuts
  const deletePressed = useKeyPress('Delete');
  const ctrlCPressed = useKeyPress(['Meta+c', 'Control+c']);
  const ctrlVPressed = useKeyPress(['Meta+v', 'Control+v']);
  const ctrlDPressed = useKeyPress(['Meta+d', 'Control+d']);

  // Ensure normal paste operations work in input fields
  useEffect(() => {
    const handleGlobalPaste = (event) => {
      const target = event.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true' ||
                          target.closest('input') ||
                          target.closest('textarea') ||
                          target.closest('[contenteditable="true"]');
      
      // If we're in an input field, ensure the browser handles paste normally
      if (isInputField) {
        // Don't prevent default - let browser handle normal paste
        console.log('Normal paste operation in input field');
        return;
      }
    };

    // Add global paste listener with low priority
    document.addEventListener('paste', handleGlobalPaste, { passive: true });
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

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
        setCanPaste(false);
        safeToast.error('Failed to copy nodes. Try using the context menu instead.');
      }
    } catch (error) {
      console.error('Copy operation failed:', error);
      setCanPaste(false);
      safeToast.error('Failed to copy nodes to clipboard');
    }
  }, [safeEdges]);

  const handlePasteNodes = useCallback(async () => {
    try {
      // Check if clipboard has valid data before attempting paste
      const isValid = await validateClipboardData();
      setCanPaste(isValid);
      
      if (!isValid) {
        safeToast.info('No nodes to paste. Copy some nodes first using Ctrl+C or the context menu.');
        return;
      }
      
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

  // Missing context menu handlers
  const handleContextMenuClose = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  const handleContextEdit = useCallback((selectedNodes) => {
    if (selectedNodes.length === 1) {
      // Trigger edit for the selected node
      const node = selectedNodes[0];
      if (onNodeClick) {
        onNodeClick(null, node);
      }
    }
    closeContextMenu();
  }, [onNodeClick, closeContextMenu]);

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
    // Only handle our custom paste if we're not in an input field
    const handleCustomPaste = (event) => {
      // Check if the target is an input field, textarea, or contenteditable
      const target = event.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true' ||
                          target.closest('input') ||
                          target.closest('textarea') ||
                          target.closest('[contenteditable="true"]');
      
      // If we're in an input field, let the browser handle paste normally
      if (isInputField) {
        console.log('Paste in input field - letting browser handle it');
        return;
      }
      
      // Only handle our custom paste for the flow canvas
      if (ctrlVPressed) {
        event.preventDefault();
        handleContextPaste();
      }
    };

    if (ctrlVPressed) {
      // Add a small delay to check the active element
      setTimeout(() => {
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' || 
                            activeElement.tagName === 'TEXTAREA' || 
                            activeElement.contentEditable === 'true' ||
                            activeElement.closest('input') ||
                            activeElement.closest('textarea') ||
                            activeElement.closest('[contenteditable="true"]');
        
        if (!isInputField) {
          handleContextPaste();
        }
      }, 10);
    }
  }, [ctrlVPressed, handleContextPaste]);

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

  // Context menu template handler - moved here to fix initialization order
  const handleContextSaveTemplate = useCallback((selectedNodes) => {
    handleSaveAsTemplate(selectedNodes);
  }, [handleSaveAsTemplate]);

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
          executionState: nodeStates[node.id] || { status: 'idle', progress: 0 }
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
          state: connectionStates[edge.id]?.state || 'idle',
          animated: connectionStates[edge.id]?.state === 'active' || connectionStates[edge.id]?.state === 'processing'
      }
      };
    }).filter(Boolean);
  }, [safeEdges, connectionStates]);

  const handleRunWorkflow = useCallback(() => {
    if (nodes.length === 0) {
      toast.error('No nodes to execute! Add some nodes first.');
      return;
    }

    // Check if there are any disconnected nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (disconnectedNodes.length > 0 && nodes.length > 1) {
      toast.error(`Found ${disconnectedNodes.length} disconnected nodes. Please connect all nodes.`);
      return;
    }

    // Prepare workflow data
    const workflowData = {
      workflow_id: `flow_${Date.now()}`,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        data: node.data,
        position: node.position
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: edge.data
      })),
      inputs: {}
    };

    // Show success message and trigger execution
    toast.success('🚀 Starting workflow execution...');
    
    // Here you would typically call your API
    // For now, we'll simulate the execution
    console.log('Executing workflow:', workflowData);
    
    // You can integrate with your existing API like this:
    // executeWorkflow(workflowData).then(result => {
    //   toast.success('✅ Workflow completed successfully!');
    // }).catch(error => {
    //   toast.error(`❌ Workflow failed: ${error.message}`);
    // });
    
  }, [nodes, edges]);

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
      {/* 🦄 MAGICAL NEURAL NETWORK BACKGROUND */}
      <MagicalCanvasBackground 
        isExecuting={isExecuting}
        nodeCount={nodes.length}
        connectionCount={edges.length}
      />

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
          style={{ opacity: 0.3 }}
        />
        
        <MiniMap 
          position="bottom-left"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)'
          }}
          nodeColor={(node) => {
            const state = nodeStates[node.id];
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

        {/* Floating Integration Hub */}
        <FloatingIntegrationHub 
          onAddNode={(nodeData) => {
            // Add new integration node to the canvas
            const newNode = {
              ...nodeData,
              position: nodeData.position || { x: 300, y: 300 }
            };
            
            // Use existing node management functions
            onNodesChange([{
              type: 'add',
              item: newNode
            }]);
            
            // Show success toast
            toast.success(`Added ${nodeData.data?.label || 'integration'} to canvas`);
          }}
          reactFlowInstance={reactFlowInstance}
        />

      </ReactFlow>
      
      {/* Context Menu */}
      {contextMenu.isVisible && (
        <ContextMenu 
          isVisible={contextMenu.isVisible}
          position={contextMenu.position}
          selectedNodes={contextMenu.selectedNodes}
          nodeType={contextMenu.nodeType}
          onClose={handleContextMenuClose}
          onEdit={handleContextEdit}
          onDelete={handleContextDelete}
          onCopy={handleContextCopy}
          onDuplicate={handleContextDuplicate}
          onSaveTemplate={handleContextSaveTemplate}
        />
      )}
      
      {/* Save Template Modal */}
      {saveTemplateModal.isOpen && (
        <SaveTemplateModal
          isOpen={saveTemplateModal.isOpen}
          onClose={() => setSaveTemplateModal(prev => ({ ...prev, isOpen: false }))}
          selectedNodes={saveTemplateModal.selectedNodes}
          selectedEdges={saveTemplateModal.selectedEdges}
        />
      )}
      
      {/* Template Manager Modal */}
      {templateManager.isOpen && (
        <TemplateManager
          isOpen={templateManager.isOpen}
          onClose={() => setTemplateManager(prev => ({ ...prev, isOpen: false }))}
          onSelect={handleTemplateSelect}
          position={templateManager.currentPosition}
        />
      )}

      {/* Template Gallery */}
      {showTemplateGallery && (
        <TemplateGallery 
          isVisible={showTemplateGallery}
          onClose={() => toggleTemplateGallery(false)}
        />
      )}

      {/* NEW: LLM Mode Toggle Panel - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <LLMModeToggle className="w-80" />
      </div>

      {/* Minimal Metrics Panel - Bottom Right */}
      <div className="absolute bottom-4 right-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-white/30 shadow-lg p-3 text-sm min-w-[180px]">
          <div className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
            <span>Canvas</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-700 text-xs">Nodes</span>
              </div>
              <span className="font-mono text-blue-600 font-semibold text-sm">{safeNodes.length}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-700 text-xs">Connections</span>
              </div>
              <span className="font-mono text-green-600 font-semibold text-sm">{safeEdges.length}</span>
            </div>

            {/* Execution Status Indicator */}
            {isExecuting && (
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  <span className="text-gray-700 text-xs">Status</span>
                </div>
                <span className="text-orange-600 font-semibold text-sm">Running</span>
              </div>
            )}
          </div>
        </div>
      </div>
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
  nodeStates: PropTypes.object,
  connectionStates: PropTypes.object,
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