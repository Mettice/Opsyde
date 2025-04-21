import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

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
  const editButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const cardRef = useRef(null);
  
  // Add state to store nodes and edges from the parent component
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  
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

  // Add event listeners to the buttons
  useEffect(() => {
    const editBtn = editButtonRef.current;
    const deleteBtn = deleteButtonRef.current;
    
    if (editBtn) {
      editBtn.addEventListener('click', handleEditClick);
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDeleteClick);
    }
    
    return () => {
      if (editBtn) {
        editBtn.removeEventListener('click', handleEditClick);
      }
      
      if (deleteBtn) {
        deleteBtn.removeEventListener('click', handleDeleteClick);
      }
    };
  }, [handleEditClick, handleDeleteClick]);

  // Get icon based on trigger type
  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'webhook':
        return '🔗';
      case 'schedule':
        return '⏰';
      default:
        return '⚡';
    }
  };

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
      default:
        return 'Manual Trigger';
    }
  };

  // Update the registerTrigger function to include connected nodes
  const registerTrigger = useCallback(async () => {
    console.log("Attempting to register trigger:", data);
    if (!data.nodeId) return;
    
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
      const backendUrl = (window.BACKEND_URL || 'http://localhost:8000') + '/api/register-trigger';
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
        
        // Show a success message to the user
        alert(`Trigger "${data.label || 'Unnamed'}" has been scheduled successfully!`);
      } else {
        console.error("Trigger registration failed:", response.status, response.statusText);
        // Try to get more details about the error
        try {
          const errorText = await response.text();
          console.error("Error details:", errorText);
          alert(`Failed to schedule trigger: ${response.statusText}`);
        } catch (e) {
          console.error("Could not get error details");
          alert("Failed to schedule trigger. Check console for details.");
        }
      }
    } catch (error) {
      console.error('Error registering trigger:', error);
      alert(`Error registering trigger: ${error.message}`);
    }
  }, [data]);

  // Update the useEffect to register both webhook and scheduled triggers
  useEffect(() => {
    // Only register when we have all the necessary data
    if (data.triggerType === 'webhook') {
      console.log("Registering webhook trigger");
      registerTrigger();
    } else if (data.triggerType === 'schedule') {
      // For scheduled triggers, make sure we have the date and time
      const runDate = data.runDate || (data.runAt ? data.runAt.split(' ')[0] : '');
      const runTime = data.runTime || (data.runAt ? data.runAt.split(' ')[1] : '');
      
      // Only register if we have both date and time or runAt is already set
      if ((runDate && runTime) || data.runAt) {
        console.log("Registering schedule trigger with date:", runDate, "time:", runTime);
        registerTrigger();
      } else {
        console.log("Not registering schedule trigger yet - missing date or time");
      }
    }
  }, [data.triggerType, data.scheduleType, data.runAt, data.runDate, data.runTime, registerTrigger]);

  // Add this at the beginning of the component
  useEffect(() => {
    console.log("TriggerNode rendered with data:", data);
  }, [data]);

  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-purple-500' : 'border-purple-200'} p-3 rounded-lg shadow-md w-64 trigger-node ${selected ? 'selected' : ''}`}
    >
      <h3 className="text-lg font-bold text-purple-700 mb-1">{data.label || 'Trigger'}</h3>
      
      {data.description && (
        <div className="text-xs text-gray-600 mb-2">
          {data.description}
        </div>
      )}
      
      <div className="flex items-center justify-center p-3 bg-purple-50 rounded-lg mb-3">
        <div className="text-center">
          <span className="text-2xl">{getTriggerIcon()}</span>
          <div className="text-sm font-medium text-purple-800 mt-1">
            {getTriggerDescription()}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex mt-3 space-x-2">
        <button 
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit trigger"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button 
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete trigger"
          data-no-drag="true"
        >
          Delete
        </button>
      </div>
      
      {/* Source handle at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-purple-600 hover:bg-purple-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id={`${data.id}-source`}
        title="Connect to: Agent, Task, Tool"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Output</div>
      </Handle>
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
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode; 