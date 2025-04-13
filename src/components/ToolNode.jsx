import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Use React.memo to prevent unnecessary re-renders
const ToolNode = memo(({ data, isConnectable, selected }) => {
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  const editButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const cardRef = useRef(null);
  
  // Create stable event handler wrappers with useCallback
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
        nodeType: data.nodeType || 'tool'
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
        nodeType: data.nodeType || 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(!hideApiEndpoint);
  }, [hideApiEndpoint]);

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
        if (e.target === card || card.contains(e.target)) {
          if (!e.target.closest('button') && 
              !e.target.classList.contains('edit-button') && 
              !e.target.classList.contains('delete-button') &&
              !e.target.classList.contains('react-flow__handle')) {
            e.stopImmediatePropagation();
          }
        }
      };
      
      card.addEventListener('click', handleCardClick, true);
      
      return () => {
        card.removeEventListener('click', handleCardClick, true);
        
        if (editButton) {
          editButton.removeEventListener('click', (e) => {
            e.stopPropagation();
            handleEditClick(e);
          }, true);
          editButton.removeEventListener('mousedown', stopPropagation, true);
          editButton.removeEventListener('touchstart', stopPropagation, true);
        }
        
        if (deleteButton) {
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

  // Format API endpoint for display
  const formatApiEndpoint = (endpoint) => {
    if (!endpoint) return '';
    return hideApiEndpoint ? 
      endpoint.replace(/^(https?:\/\/[^\/]+)(.*)$/, '$1/****') : 
      endpoint;
  };

  // Handle rendering with an error message if data is missing
  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: ToolNode requires the 'data' prop
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-green-500' : 'border-green-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id} // Add data attribute for debugging
    >
      {/* Target handle at top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-4 h-4 bg-green-500 hover:bg-green-400 hover:w-5 hover:h-5 transition-all -top-2"
        id={`${data.id}-target`}
        title="Tools don't receive connections"
      />
      
      {/* Node content */}
      <div 
        className="font-semibold text-gray-800 mb-1"
        title={data.label || 'Unnamed Tool'}
      >
        {data.label || 'Unnamed Tool'}
      </div>
      
      {data.description && (
        <div 
          className="text-sm text-gray-500 mb-1 truncate"
          title={data.description}
        >
          <span className="font-medium">Performs</span> {data.description}
        </div>
      )}
      
      {data.toolType && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Type:</span> {data.toolType}
        </div>
      )}
      
      {data.apiEndpoint && (
        <div className="text-xs text-gray-600 mb-1 flex items-center">
          <span className="font-medium mr-1">API:</span> 
          <span className="truncate flex-1" title={data.apiEndpoint}>
            {formatApiEndpoint(data.apiEndpoint)}
          </span>
          <button 
            onClick={toggleApiVisibility}
            className="ml-1 text-gray-500 hover:text-gray-700 text-xs p-1"
            title={hideApiEndpoint ? "Show full API endpoint" : "Hide API endpoint"}
          >
            {hideApiEndpoint ? "👁️" : "🔒"}
          </button>
        </div>
      )}
      
      {data.parameters && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Parameters:</span> 
          <span className="italic">
            {Array.isArray(data.parameters) 
              ? data.parameters.join(', ') 
              : data.parameters.split('\n').join(', ')}
          </span>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button 
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit tool"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button 
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete tool"
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
        className="w-4 h-4 bg-green-600 hover:bg-green-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id={`${data.id}-source`}
        title="Connect to: Agent"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Agent</div>
      </Handle>
    </div>
  );
});

// Prop types for better type checking and documentation
ToolNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
    toolType: PropTypes.string,
    apiEndpoint: PropTypes.string,
    parameters: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
ToolNode.displayName = 'ToolNode';

export default ToolNode;