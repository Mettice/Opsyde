import React, { useCallback, useEffect, useState, memo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

// Add these utility functions at the top of the file, before the TriggerNode component
const findConnectedNodes = (nodeId, allNodes, allEdges) => {
  // Start with direct connections
  const connectedNodeIds = new Set();
  
  // Find all nodes that are connected to this node (directly or indirectly)
  const findConnections = (id) => {
    const outgoingEdges = allEdges.filter(edge => edge.source === id);
    
    for (const edge of outgoingEdges) {
      if (!connectedNodeIds.has(edge.target)) {
        connectedNodeIds.add(edge.target);
        findConnections(edge.target);
      }
    }
  };
  
  // Start the recursive search
  findConnections(nodeId);
  
  // Return the actual node objects
  return Array.from(connectedNodeIds).map(id => 
    allNodes.find(node => node.id === id)
  ).filter(Boolean);
};

const findConnectedEdges = (nodeId, allEdges) => {
  // Find all edges that are connected to this node (directly or indirectly)
  const connectedNodeIds = new Set([nodeId]);
  const connectedEdges = new Set();
  
  // Keep finding connections until no new ones are found
  let foundNew = true;
  while (foundNew) {
    foundNew = false;
    
    for (const edge of allEdges) {
      // If we already know about this edge, skip it
      if (connectedEdges.has(edge.id)) continue;
      
      // If the source is in our connected nodes, add the target and the edge
      if (connectedNodeIds.has(edge.source)) {
        connectedNodeIds.add(edge.target);
        connectedEdges.add(edge.id);
        foundNew = true;
      }
    }
  }
  
  // Return the actual edge objects
  return Array.from(connectedEdges).map(id => 
    allEdges.find(edge => edge.id === id)
  ).filter(Boolean);
};

const TriggerNode = memo(({ 
  data, 
  isConnectable, 
  selected,
  // Visual enhancement props
  isCompact = false,
  isDimmed = false,
  isHighlighted = false,
  enhancementMode = 'default',
  onHover,
  onUnhover
}) => {
  // Add state to store nodes and edges from the parent component
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false); // Track registration status
  const [isRegistering, setIsRegistering] = useState(false); // Track registration in progress
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // Get icon based on trigger type - moved before getStatusDisplay
  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'webhook':
        return '🔗';
      case 'schedule':
        return '⏰';
      case 'universal_polling':
        return '🔄';
      case 'universal_webhook':
        return '📡';
      case 'manual':
        return '⚡';
      default:
        return '⚡';
    }
  };

  // Beautiful trigger-specific colors and status system
  const getStatusConfig = () => {
    const configs = {
      processing: {
        icon: '⚡',
        pulse: 'animate-pulse',
        glow: 'shadow-purple-500/40',
        gradient: 'from-purple-400/20 to-indigo-500/20',
        border: 'border-purple-400/60',
        dot: 'bg-gradient-to-r from-purple-400 to-indigo-600',
        overlay: 'bg-gradient-to-br from-purple-500/10 to-indigo-600/10'
      },
      success: {
        icon: '✅',
        pulse: '',
        glow: 'shadow-green-500/40',
        gradient: 'from-green-400/20 to-emerald-500/20',
        border: 'border-green-400/60',
        dot: 'bg-gradient-to-r from-green-400 to-emerald-500',
        overlay: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10'
      },
      error: {
        icon: '⚠️',
        pulse: 'animate-bounce',
        glow: 'shadow-red-500/40',
        gradient: 'from-red-400/20 to-pink-500/20',
        border: 'border-red-400/60',
        dot: 'bg-gradient-to-r from-red-400 to-pink-500',
        overlay: 'bg-gradient-to-br from-red-500/10 to-pink-600/10'
      },
      waiting: {
        icon: '⏳',
        pulse: 'animate-pulse',
        glow: 'shadow-yellow-500/40',
        gradient: 'from-yellow-400/20 to-orange-500/20',
        border: 'border-yellow-400/60',
        dot: 'bg-gradient-to-r from-yellow-400 to-orange-500',
        overlay: 'bg-gradient-to-br from-yellow-500/10 to-orange-600/10'
      },
      idle: {
        icon: getTriggerIcon(),
        pulse: '',
        glow: 'shadow-purple-300/50',
        gradient: 'from-white/90 to-purple-50/80',
        border: 'border-purple-200/70',
        dot: 'bg-gradient-to-r from-purple-400 to-indigo-500',
        overlay: 'bg-gradient-to-br from-purple-500/5 to-indigo-600/5'
      }
    };
    return configs[status] || configs.idle;
  };

  const statusConfig = getStatusConfig();

  // Beautiful trigger type specific colors
  const getTriggerTypeConfig = () => {
    const configs = {
      webhook: {
        emoji: '🔗',
        name: 'Webhook',
        colors: {
          primary: 'from-blue-400 to-cyan-600',
          secondary: 'from-blue-50/90 to-cyan-100/80',
          accent: 'bg-gradient-to-r from-blue-500 to-cyan-600',
          text: 'text-blue-700',
          glow: 'shadow-blue-400/30',
          border: 'border-blue-300/50',
          glass: 'bg-gradient-to-br from-blue-500/10 to-cyan-600/10'
        }
      },
      schedule: {
        emoji: '⏰',
        name: 'Schedule',
        colors: {
          primary: 'from-amber-400 to-orange-600',
          secondary: 'from-amber-50/90 to-orange-100/80',
          accent: 'bg-gradient-to-r from-amber-500 to-orange-600',
          text: 'text-amber-700',
          glow: 'shadow-amber-400/30',
          border: 'border-amber-300/50',
          glass: 'bg-gradient-to-br from-amber-500/10 to-orange-600/10'
        }
      },
      universal_polling: {
        emoji: '🔄',
        name: 'API Polling',
        colors: {
          primary: 'from-emerald-400 to-teal-600',
          secondary: 'from-emerald-50/90 to-teal-100/80',
          accent: 'bg-gradient-to-r from-emerald-500 to-teal-600',
          text: 'text-emerald-700',
          glow: 'shadow-emerald-400/30',
          border: 'border-emerald-300/50',
          glass: 'bg-gradient-to-br from-emerald-500/10 to-teal-600/10'
        }
      },
      universal_webhook: {
        emoji: '📡',
        name: 'Universal Webhook',
        colors: {
          primary: 'from-indigo-400 to-purple-600',
          secondary: 'from-indigo-50/90 to-purple-100/80',
          accent: 'bg-gradient-to-r from-indigo-500 to-purple-600',
          text: 'text-indigo-700',
          glow: 'shadow-indigo-400/30',
          border: 'border-indigo-300/50',
          glass: 'bg-gradient-to-br from-indigo-500/10 to-purple-600/10'
        }
      },
      manual: {
        emoji: '⚡',
        name: 'Manual',
        colors: {
          primary: 'from-purple-400 to-pink-600',
          secondary: 'from-purple-50/90 to-pink-100/80',
          accent: 'bg-gradient-to-r from-purple-500 to-pink-600',
          text: 'text-purple-700',
          glow: 'shadow-purple-400/30',
          border: 'border-purple-300/50',
          glass: 'bg-gradient-to-br from-purple-500/10 to-pink-600/10'
        }
      },
      default: {
        emoji: '⚡',
        name: 'Trigger',
        colors: {
          primary: 'from-purple-400 to-indigo-600',
          secondary: 'from-purple-50/90 to-indigo-100/80',
          accent: 'bg-gradient-to-r from-purple-500 to-indigo-600',
          text: 'text-purple-700',
          glow: 'shadow-purple-400/30',
          border: 'border-purple-300/50',
          glass: 'bg-gradient-to-br from-purple-500/10 to-indigo-600/10'
        }
      }
    };
    return configs[data.triggerType] || configs.default;
  };

  const triggerTypeConfig = getTriggerTypeConfig();
  
  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'trigger'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'trigger'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Get description based on trigger type
  const getTriggerDescription = () => {
    switch (data.triggerType) {
      case 'webhook':
        return 'Webhook Trigger';
      case 'schedule':
        if (data.scheduleType === 'once') {
          return `Scheduled at ${data.runAt || 'N/A'}`;
        } else if (data.scheduleType === 'daily') {
          return `Daily at ${data.runTime || '12:00'}`;
        } else if (data.scheduleType === 'weekly') {
          return `Weekly on ${data.scheduleWeekday || 'Monday'}`;
        } else if (data.scheduleType === 'monthly') {
          return `Monthly on day ${data.scheduleMonthDay || '1'}`;
        }
        return `Scheduled (${data.scheduleType})`;
      case 'universal_polling':
        const serviceName = data.serviceName || 'API';
        const interval = data.pollingInterval ? Math.floor(data.pollingInterval / 60) : 5;
        return `${serviceName} Polling (${interval}min)`;
      case 'universal_webhook':
        const webhookService = data.serviceName || 'Service';
        return `${webhookService} Webhook`;
      case 'manual':
        return 'Manual Trigger';
      default:
        return 'Manual Trigger';
    }
  };

  const getDisplayName = () => {
    return data.label || getTriggerDescription();
  };

  // Update the registerTrigger function to include connected nodes
  const registerTrigger = useCallback(async () => {
    console.log("Attempting to register trigger:", data);
    if (!data.nodeId || isRegistering || isRegistered) {
      console.log("Skipping registration - already registered or in progress");
      return;
    }
    
    setIsRegistering(true);
    
    try {
      // Try to get the ReactFlow instance to find connected nodes
      let connectedNodes = [];
      let connectedEdges = [];
      
      // Try to get the ReactFlow instance from the global window object
      if (window.reactFlowInstance) {
        const allNodes = window.reactFlowInstance.getNodes();
        const allEdges = window.reactFlowInstance.getEdges();
        
        // Find nodes connected to this trigger
        connectedNodes = findConnectedNodes(data.nodeId, allNodes, allEdges);
        connectedEdges = findConnectedEdges(data.nodeId, allEdges);
        
        console.log("Found connected nodes:", connectedNodes.length);
        console.log("Found connected edges:", connectedEdges.length);
      } else {
        console.warn("ReactFlow instance not available, can't find connected nodes");
      }
      
      console.log("Registering trigger:", data.nodeId, "with type:", data.triggerType);
      
      // Format the date and time properly for scheduled triggers
      let formattedRunAt = data.runAt;
      if (data.triggerType === 'schedule' && data.scheduleType === 'once') {
        // Make sure we have a properly formatted date and time
        if (data.runDate && data.runTime) {
          formattedRunAt = `${data.runDate} ${data.runTime}`;
        }
        
        // If no date is provided, set it to 5 minutes in the future
        if (!formattedRunAt && !data.runDate) {
          const futureDate = new Date(Date.now() + 5 * 60 * 1000);
          const year = futureDate.getFullYear();
          const month = String(futureDate.getMonth() + 1).padStart(2, '0');
          const day = String(futureDate.getDate()).padStart(2, '0');
          const hours = String(futureDate.getHours()).padStart(2, '0');
          const minutes = String(futureDate.getMinutes()).padStart(2, '0');
          
          formattedRunAt = `${year}-${month}-${day} ${hours}:${minutes}`;
          console.log("No date provided, setting to 5 minutes in future:", formattedRunAt);
        }
      }
      
      // Create a flow object with the trigger node and any connected nodes
      const flow = {
        nodes: [
          // Include the trigger node itself
          {
            id: data.nodeId,
            type: "trigger",
            data: {
              ...data,
              triggerType: data.triggerType,
              scheduleType: data.scheduleType || 'once',
              runAt: formattedRunAt || data.runAt || '',
              runTime: data.runTime || '12:00',
              scheduleWeekday: data.scheduleWeekday || 'monday',
              scheduleMonthDay: data.scheduleMonthDay || '1'
            }
          },
          // Include any connected nodes
          ...connectedNodes
        ],
        edges: connectedEdges,
        trigger_id: data.nodeId,
        trigger_type: data.triggerType
      };
      
      // Use the backend URL from environment if available, otherwise use default
      const backendUrl = (window.BACKEND_URL || 'http://localhost:8000') + '/api/triggers/register';
      console.log(`Sending trigger registration to: ${backendUrl}`);
      console.log("Registration payload:", JSON.stringify(flow, null, 2));
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_id: data.nodeId,
          flow: flow,
          owner: 'current_user'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Trigger registration successful:", result);
        
        setIsRegistered(true);
        
        // Show a proper toast notification
        toast.success(`Trigger "${data.label || 'Unnamed'}" has been scheduled successfully!`, {
          duration: 4000,
          position: 'top-right',
        });
      } else {
        console.error("Trigger registration failed:", response.status, response.statusText);
        // Try to get more details about the error
        try {
          const errorText = await response.text();
          console.error("Error details:", errorText);
          toast.error(`Failed to schedule trigger: ${response.statusText}`, {
            duration: 4000,
            position: 'top-right',
          });
        } catch (e) {
          console.error("Could not get error details");
          toast.error("Failed to schedule trigger. Check console for details.", {
            duration: 4000,
            position: 'top-right',
          });
        }
      }
    } catch (error) {
      console.error('Error registering trigger:', error);
      
      // Provide specific, helpful error messages
      let userMessage = "Failed to set up trigger";
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = "Network error. Please check your connection.";
      } else if (error.message.includes('validation') || error.message.includes('400')) {
        userMessage = "Please check your trigger configuration.";
      } else if (error.message.includes('auth') || error.message.includes('401') || error.message.includes('403')) {
        userMessage = "Authentication error. Please log in again.";
      } else if (error.message.includes('timeout')) {
        userMessage = "Request timed out. Please try again.";
      } else if (error.message.includes('500')) {
        userMessage = "Server error. Please try again later.";
      }
      
      toast.error(userMessage, {
        duration: 4000,
        position: 'top-right',
      });
    } finally {
      setIsRegistering(false);
    }
  }, [data, isRegistering, isRegistered]);

  // Check if trigger should be auto-registered
  const shouldAutoRegister = useCallback(() => {
    if (isRegistered || isRegistering) return false;
    
    // Only auto-register when user has provided enough info
    if (data.triggerType === 'webhook') {
      return data.nodeId && data.label; // Ensure basic info is set
    } else if (data.triggerType === 'schedule') {
      return (data.runDate && data.runTime) || data.runAt;
    } else if (data.triggerType === 'universal_polling') {
      return data.apiEndpoint && data.serviceName; // Require essential fields
    } else if (data.triggerType === 'universal_webhook') {
      return data.nodeId && data.serviceName; // Require basic info
    }
    
    return false;
  }, [data.triggerType, data.scheduleType, data.runAt, data.runDate, data.runTime, data.nodeId, data.label, data.apiEndpoint, data.serviceName, isRegistered, isRegistering]);

  // Auto-register trigger when conditions are met
  useEffect(() => {
    if (shouldAutoRegister()) {
      console.log("Auto-registering trigger");
      toast.info("Setting up your trigger...", { duration: 2000 });
      registerTrigger();
    }
  }, [shouldAutoRegister, registerTrigger]);

  // Reset registration status when trigger data changes significantly
  useEffect(() => {
    setIsRegistered(false);
  }, [data.nodeId, data.triggerType]);

  // Add this at the beginning of the component
  useEffect(() => {
    console.log("TriggerNode rendered with data:", data);
  }, [data]);

  // Use effect to handle global events for nodes/edges updates
  useEffect(() => {
    const handleNodesEdgesUpdate = (event) => {
      if (event.detail) {
        setAllNodes(event.detail.nodes || []);
        setAllEdges(event.detail.edges || []);
      }
    };

    window.addEventListener('nodesEdgesUpdate', handleNodesEdgesUpdate);
    return () => {
      window.removeEventListener('nodesEdgesUpdate', handleNodesEdgesUpdate);
    };
  }, []);

  // Mouse event handlers for visual enhancements
  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
    if (onHover) {
      onHover(data.nodeId);
    }
  }, [onHover, data.nodeId]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    if (onUnhover) {
      onUnhover(data.nodeId);
    }
  }, [onUnhover, data.nodeId]);

  // Calculate node size based on hierarchy (enhancement mode)
  const getNodeSize = () => {
    if (enhancementMode === 'compact') return 'w-64 h-auto'; // Compact mode
    if (enhancementMode === 'lanes') return 'w-72 h-auto'; // Lanes mode
    if (isCompact) return 'w-56 h-auto'; // General compact
    return 'w-80 h-auto'; // Default size
  };

  // Enhanced opacity and scaling for focus mode
  const getEnhancementStyles = () => {
    let styles = 'transition-all duration-300 ease-out ';
    
    if (isDimmed) {
      styles += 'opacity-40 scale-95 ';
    } else if (isHighlighted) {
      styles += 'opacity-100 scale-105 shadow-2xl ring-2 ring-purple-400 ';
    }
    
    if (enhancementMode === 'focus' && !isHighlighted && !isDimmed) {
      styles += 'opacity-70 ';
    }
    
    return styles;
  };

  return (
    <>
      {/* 🔥 PREMIUM GLASSMORPHISM TRIGGER CARD */}
      <div 
        className={`
          relative group w-72 h-auto overflow-hidden
          backdrop-blur-xl bg-white/80 border border-white/40
          rounded-3xl shadow-2xl ${statusConfig.glow} ${triggerTypeConfig.colors.glow}
          transition-all duration-700 ease-out
          hover:scale-[1.03] hover:shadow-2xl hover:bg-white/90
          hover:backdrop-blur-2xl hover:-translate-y-1
          ${selected ? 'ring-2 ring-purple-400/60 ring-offset-2 ring-offset-white/50 shadow-purple-400/40' : ''}
          ${isHighlighted ? 'scale-105 ring-2 ring-purple-400/60 shadow-purple-400/40' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${statusConfig.pulse}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Beautiful Animated Background Gradients */}
        <div className={`absolute inset-0 ${triggerTypeConfig.colors.glass} rounded-3xl`} />
        <div className={`absolute inset-0 ${statusConfig.overlay} rounded-3xl`} />
        
        {/* Floating Glass Orbs for Premium Effect */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm opacity-60" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-tr from-white/30 to-transparent rounded-full blur-sm opacity-40" />
        
        {/* Status indicator dot with beautiful gradient */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`w-4 h-4 rounded-full ${statusConfig.dot} ${statusConfig.pulse} shadow-lg border border-white/50`} />
        </div>

        {/* Execution Progress Ring - Premium Style */}
        {(status === 'processing' || executionProgress > 0) && (
          <div className="absolute -top-2 -right-2 w-8 h-8 z-20">
            <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16" cy="16" r="14"
                fill="none" stroke="currentColor" strokeWidth="2"
                className="text-white/30"
              />
              <circle
                cx="16" cy="16" r="14"
                fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${executionProgress * 0.88} 88`}
                className={`${triggerTypeConfig.colors.text} transition-all duration-300`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-bold ${triggerTypeConfig.colors.text}`}>
                {Math.round(executionProgress)}%
              </span>
            </div>
          </div>
        )}

        {/* Main content with glassmorphism container */}
        <div className="relative p-6 space-y-4">
          {/* Header: Trigger Icon + Status with premium styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Premium Trigger Icon */}
              <div className={`
                w-14 h-14 rounded-2xl ${triggerTypeConfig.colors.secondary} 
                ${triggerTypeConfig.colors.border} border-2
                flex items-center justify-center text-2xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                relative overflow-hidden
              `}>
                {/* Icon background glow */}
                <div className={`absolute inset-0 ${triggerTypeConfig.colors.accent} opacity-10 rounded-2xl`} />
                <span className="relative z-10">{triggerTypeConfig.emoji}</span>
              </div>
              
              {/* Status Icon with premium effect */}
              <div className="relative">
                <div className={`
                  w-12 h-12 rounded-xl bg-white/60 backdrop-blur-sm
                  flex items-center justify-center text-xl
                  shadow-lg border border-white/40
                  ${statusConfig.pulse}
                `}>
                  {statusConfig.icon}
                </div>
              </div>
            </div>
            
            {/* Action buttons - beautiful glass effect */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <button
                onClick={handleEditClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white/90 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Edit Trigger"
              >
                <span className="text-lg">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Trigger"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>

          {/* Smart Content Hierarchy with beautiful typography */}
          <div className="space-y-3">
            {/* Primary: Trigger Name with gradient text */}
            <h3 className={`
              font-bold text-xl leading-tight
              bg-gradient-to-r ${triggerTypeConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Secondary: Trigger Description */}
            <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
              {getTriggerDescription()}
            </p>
          </div>

          {/* Footer: Trigger Type Badge with premium styling */}
          <div className="flex items-center justify-between pt-3 border-t border-white/30">
            <div className={`
              px-4 py-2 rounded-full ${triggerTypeConfig.colors.secondary}
              ${triggerTypeConfig.colors.text} text-sm font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              hover:scale-105 transition-transform duration-300
            `}>
              {triggerTypeConfig.name}
            </div>
            
            {/* Performance metrics with glass effect */}
            <div className="flex gap-2 text-xs">
              <div className="px-2 py-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/40 shadow-md">
                <span className="text-gray-600 font-semibold">
                  ⚡ {executionTime > 0 ? `${executionTime.toFixed(1)}s` : '--'}
                </span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-white/50 backdrop-blur-sm border border-white/40 shadow-md">
                <span className="text-gray-600 font-semibold">
                  💰 ${cost > 0 ? cost.toFixed(3) : '0.000'}
                </span>
              </div>
            </div>
          </div>

          {/* Execution progress bar with beautiful styling */}
          {status === 'processing' && executionProgress > 0 && (
            <div className="space-y-2 pt-2">
              <div className="w-full bg-white/40 backdrop-blur-sm rounded-full h-2 shadow-inner border border-white/30">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${triggerTypeConfig.colors.accent} shadow-lg`}
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 text-center font-medium bg-white/40 backdrop-blur-sm rounded-lg py-1 px-2">
                {executionProgress}% • {executionTime}s
              </div>
            </div>
          )}

          {/* API Data Preview - Enhanced for Universal Polling */}
          {data.triggerType === 'universal_polling' && data.serviceName && (
            <div className="pt-2">
              <div className={`${triggerTypeConfig.colors.secondary} backdrop-blur-sm rounded-xl border ${triggerTypeConfig.colors.border} p-3 shadow-md`}>
                <div className="text-center space-y-2">
                  <div className={`text-sm font-bold ${triggerTypeConfig.colors.text}`}>
                    📊 {data.serviceName}
                  </div>
                  {data.apiEndpoint && (
                    <div className={`text-xs ${triggerTypeConfig.colors.text} opacity-80 truncate`}>
                      {data.apiEndpoint.replace('https://', '').replace('http://', '')}
                    </div>
                  )}
                  <div className="flex justify-center gap-2 text-xs">
                    {data.changeDetectionMethod && (
                      <span className={`${triggerTypeConfig.colors.secondary} px-2 py-1 rounded-lg border ${triggerTypeConfig.colors.border} font-medium`}>
                        {data.changeDetectionMethod.replace('_', ' ')}
                      </span>
                    )}
                    {data.pollingInterval && (
                      <span className={`${triggerTypeConfig.colors.secondary} px-2 py-1 rounded-lg border ${triggerTypeConfig.colors.border} font-medium`}>
                        {Math.floor(data.pollingInterval / 60)}min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection handle with beautiful styling */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 border-2 border-white shadow-xl rounded-full"
        />
      </div>

      {/* Rich Tooltip with premium glassmorphism */}
      {showTooltip && data.description && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                       bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                       border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Tooltip content with beautiful styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 text-lg">{triggerTypeConfig.emoji}</span>
              <div className="font-bold text-purple-300">Trigger Details</div>
            </div>
            
            <div className="text-sm leading-relaxed">{data.description}</div>
            
            <div className="flex justify-between pt-3 border-t border-gray-700 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span>🎯</span>Type: {triggerTypeConfig.name}
              </span>
              <span className="flex items-center gap-1">
                <span>⚡</span>Status: {status}
              </span>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 
                         bg-gray-900 rotate-45 border-l border-t border-gray-700/50"></div>
        </div>
      )}
    </>
  );
});

TriggerNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    triggerType: PropTypes.string,
    runAt: PropTypes.string,
    description: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
    executionState: PropTypes.object,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
  isCompact: PropTypes.bool,
  isDimmed: PropTypes.bool,
  isHighlighted: PropTypes.bool,
  enhancementMode: PropTypes.string,
  onHover: PropTypes.func,
  onUnhover: PropTypes.func,
};

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode; 