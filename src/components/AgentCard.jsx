import React, { useCallback, memo, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Make sure your component is memoized
const AgentCard = memo(({ data, isConnectable, selected }) => {
  const editButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const cardRef = useRef(null);
  
  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    // Ensure we have an event object
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Dispatch a custom event that Builder.jsx will listen for
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    // Ensure we have an event object
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Dispatch a custom event that Builder.jsx will listen for
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Add event listeners directly to the buttons and prevent propagation
  useEffect(() => {
    const editButton = editButtonRef.current;
    const deleteButton = deleteButtonRef.current;
    const card = cardRef.current;
    
    // Define stopPropagation function once to reuse
    const stopPropagation = (e) => {
      e.stopPropagation();
    };
    
    if (editButton) {
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEditClick(e);
      }, true);
      
      editButton.addEventListener('mousedown', stopPropagation, true);
      editButton.addEventListener('touchstart', stopPropagation, true);
    }
    
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteClick(e);
      }, true);
      
      deleteButton.addEventListener('mousedown', stopPropagation, true);
      deleteButton.addEventListener('touchstart', stopPropagation, true);
    }
    
    // Prevent the card from triggering edit on click
    if (card) {
      const handleCardClick = (e) => {
        // Only stop propagation if the click is directly on the card
        // and not on a button or handle
        if (e.target === card || card.contains(e.target)) {
          if (!e.target.closest('button') && 
              !e.target.classList.contains('edit-button') && 
              !e.target.classList.contains('delete-button') &&
              !e.target.classList.contains('react-flow__handle')) {
            // Allow the click to propagate for selection, but don't trigger edit
            e.stopImmediatePropagation();
          }
        }
      };
      
      card.addEventListener('click', handleCardClick, true);
      
      return () => {
        card.removeEventListener('click', handleCardClick, true);
        
        if (editButton) {
          // Use anonymous functions for event handlers that include handleEditClick
          editButton.removeEventListener('click', (e) => {
            e.stopPropagation();
            handleEditClick(e);
          }, true);
          editButton.removeEventListener('mousedown', stopPropagation, true);
          editButton.removeEventListener('touchstart', stopPropagation, true);
        }
        
        if (deleteButton) {
          // Use anonymous functions for event handlers that include handleDeleteClick
          deleteButton.removeEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteClick(e);
          }, true);
          deleteButton.removeEventListener('mousedown', stopPropagation, true);
          deleteButton.removeEventListener('touchstart', stopPropagation, true);
        }
      };
    }
  }, [handleEditClick, handleDeleteClick]);

  // Handle rendering with an improved error message if data is missing
  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: AgentCard requires the 'data' prop
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-blue-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id} // Add data attribute for debugging
    >
      {/* Target handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-blue-500 hover:bg-blue-400 hover:w-5 hover:h-5 transition-all -top-2"
        id={`${data.id}-target`}
        title="Connect from: Tool"
      >
        <div className="absolute -top-5 text-xs text-gray-500 whitespace-nowrap">← Tool</div>
      </Handle>
      
      {/* Node content */}
      <div
        className="font-semibold text-gray-800 mb-1 truncate"
        title={data.label || 'Unnamed Agent'}
      >
        {data.label || 'Unnamed Agent'}
      </div>
      
      <div
        className="text-sm text-gray-500 mb-1 truncate"
        title={data.role || 'No role defined'}
      >
        {data.role || 'No role defined'}
      </div>
      
      {data.goal && (
        <div
          className="text-xs text-gray-600 mb-1 truncate"
          title={data.goal}
        >
          <span className="font-medium">Goal:</span> {data.goal}
        </div>
      )}
      
      {data.llmModel && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Model:</span> {data.llmModel}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit agent"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete agent"
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
        className="w-4 h-4 bg-blue-600 hover:bg-blue-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id={`${data.id}-source`}
        title="Connect to: Task"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Task</div>
      </Handle>
    </div>
  );
});

// Define PropTypes for type safety and documentation
AgentCard.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    role: PropTypes.string,
    goal: PropTypes.string,
    llmModel: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
AgentCard.displayName = 'AgentCard';

export default AgentCard;