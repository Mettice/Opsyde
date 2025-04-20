import React, { useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const DelayNode = React.memo(({ data, isConnectable, selected }) => {
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
        nodeType: data.nodeType || 'delay'
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
        nodeType: data.nodeType || 'delay'
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

  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-amber-500' : 'border-amber-200'} p-3 rounded-lg shadow-md w-64 delay-node ${selected ? 'selected' : ''}`}
    >
      {/* Target handle at top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-amber-600 hover:bg-amber-500 hover:w-5 hover:h-5 transition-all -top-2"
        id="target"
        title="Connect from: Agent, Task, Tool, Trigger"
      >
        <div className="absolute -top-5 text-xs text-gray-500 whitespace-nowrap">← Input</div>
      </Handle>
      
      <h3 className="text-lg font-bold text-amber-700 mb-1">{data.label || 'Delay'}</h3>
      
      {data.description && (
        <div className="text-xs text-gray-600 mb-2">
          {data.description}
        </div>
      )}
      
      <div className="flex items-center justify-center p-3 bg-amber-50 rounded-lg mb-3">
        <div className="text-center">
          <span className="text-2xl text-amber-600">⏱️</span>
          <div className="text-sm font-medium text-amber-800 mt-1">
            Wait for {data.duration || '5s'}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex mt-3 space-x-2">
        <button 
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit delay"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button 
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete delay"
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
        className="w-4 h-4 bg-amber-600 hover:bg-amber-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id="source"
        title="Connect to: Agent, Task, Tool"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Output</div>
      </Handle>
    </div>
  );
});

DelayNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    duration: PropTypes.string,
    description: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

DelayNode.displayName = 'DelayNode';

export default DelayNode; 