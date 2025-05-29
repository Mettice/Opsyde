import React, { useCallback, useEffect, useState } from 'react';
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

const TriggerNode = React.memo(({ data, isConnectable, selected }) => {
  // Add state to store nodes and edges from the parent component
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false); // Track registration status
  const [isRegistering, setIsRegistering] = useState(false); // Track registration in progress
  
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

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'processing':
        return { icon: '⚡', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'success':
        return { icon: '✅', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'error':
        return { icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'waiting':
        return { icon: '⏳', color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      default:
        return { icon: getTriggerIcon(), color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
    }
  };

  const statusDisplay = getStatusDisplay();
  
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
      toast.error(`Error registering trigger: ${error.message}`, {
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
    
    if (data.triggerType === 'webhook') {
      return true;
    } else if (data.triggerType === 'schedule') {
      // For scheduled triggers, make sure we have the date and time
      const runDate = data.runDate || (data.runAt ? data.runAt.split(' ')[0] : '');
      const runTime = data.runTime || (data.runAt ? data.runAt.split(' ')[1] : '');
      
      // Only register if we have both date and time or runAt is already set
      return (runDate && runTime) || data.runAt;
    }
    
    return false;
  }, [data.triggerType, data.scheduleType, data.runAt, data.runDate, data.runTime, isRegistered, isRegistering]);

  // Auto-register trigger when conditions are met
  useEffect(() => {
    if (shouldAutoRegister()) {
      console.log("Auto-registering trigger");
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

  return (
    <div 
      className={`
        relative group w-80
        bg-gradient-to-br from-white via-purple-50/30 to-purple-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-purple-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-purple-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-purple-400 shadow-purple-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-purple-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 opacity-75 animate-spin-slow -z-10" 
             style={{ padding: '2px' }}>
          <div className="w-full h-full rounded-2xl bg-white"></div>
        </div>
      )}

      {/* Execution Progress Ring */}
      {(status === 'processing' || executionProgress > 0) && (
        <div className="absolute -top-2 -right-2 w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              className="text-gray-200"
            />
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeDasharray={`${executionProgress * 0.88} 88`}
              className="text-purple-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-purple-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl ${statusDisplay.bgColor} 
              flex items-center justify-center text-2xl
              shadow-inner border ${statusDisplay.borderColor}
              ${status === 'processing' ? 'animate-bounce' : ''}
            `}>
              {statusDisplay.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800 leading-tight">
                {data.label || 'Trigger'}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                Workflow Trigger
              </div>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${statusDisplay.color} ${statusDisplay.bgColor}
          `}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {data.description && (
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[70px]">Description:</span>
              <span className="text-gray-800 flex-1 text-sm">{data.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${executionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gray-600">
              ⚡ {executionTime > 0 ? `${executionTime.toFixed(1)}s` : '--'}
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              💰 ${cost > 0 ? cost.toFixed(3) : '0.000'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Trigger Display */}
      <div className="px-4 pb-3">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-4">
          <div className="text-center">
            <div className="text-3xl mb-2">
              {getTriggerIcon()}
            </div>
            <div className="text-lg font-bold text-purple-800 mb-1">
              {getTriggerDescription()}
            </div>
          </div>
        </div>
      </div>
      
      {/* API Data Preview - Show for Universal Polling triggers */}
      {data.triggerType === 'universal_polling' && data.serviceName && (
        <div className="px-4 pb-3">
          <div className="bg-blue-50/60 backdrop-blur-sm rounded-xl border border-blue-200/50 p-3">
            <div className="text-center">
              <div className="text-xs font-semibold text-blue-800 mb-1">
                📊 {data.serviceName}
              </div>
              {data.apiEndpoint && (
                <div className="text-xs text-blue-600 mb-1 truncate">
                  {data.apiEndpoint.replace('https://', '').replace('http://', '')}
                </div>
              )}
              <div className="flex justify-center gap-2 text-xs text-blue-700">
                {data.changeDetectionMethod && (
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    {data.changeDetectionMethod.replace('_', ' ')}
                  </span>
                )}
                {data.pollingInterval && (
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    {Math.floor(data.pollingInterval / 60)}min
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(e);
            }}
            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Edit
          </button>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(e);
            }}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Source handle at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-purple-600 to-purple-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
        id={`${data.id}-source`}
        title="Connect to: Agent, Task, Tool"
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-purple-400/20 -z-10 blur-xl" />
      )}
    </div>
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
};

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode; 