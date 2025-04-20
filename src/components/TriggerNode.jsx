import React, { useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import { findConnectedNodes, findConnectedEdges } from '../utils/flowUtils';

const TriggerNode = React.memo(({ data, isConnectable, selected }) => {
  const editButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const cardRef = useRef(null);
  
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

  // Add this function to register the trigger when it's created or updated
  const registerTrigger = useCallback(async () => {
    if (!data.nodeId) return;
    
    try {
      // Find all nodes and edges connected to this trigger
      const connectedNodes = findConnectedNodes(data.nodeId);
      const connectedEdges = findConnectedEdges(data.nodeId);
      
      // Create a flow object with just the connected components
      const flow = {
        nodes: connectedNodes,
        edges: connectedEdges,
        trigger_id: data.nodeId,
        trigger_type: data.triggerType
      };
      
      // Register the trigger with the backend
      const response = await fetch('/register-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_id: data.nodeId,
          flow: flow,
          owner: 'current_user' // Replace with actual user ID if available
        })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        console.log(`Trigger registered: ${result.webhook_url}`);
        // Optionally update the node data with the webhook URL
      } else {
        console.error('Failed to register trigger:', result);
      }
    } catch (error) {
      console.error('Error registering trigger:', error);
    }
  }, [data.nodeId, data.triggerType]);

  // Call this function when the node is created or updated
  useEffect(() => {
    if (data.triggerType === 'webhook') {
      registerTrigger();
    }
  }, [data.triggerType, registerTrigger]);

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