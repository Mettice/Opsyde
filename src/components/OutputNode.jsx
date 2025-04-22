import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const OutputNode = memo(({ data, isConnectable, selected }) => {
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
        nodeType: data.nodeType || 'output'
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
        nodeType: data.nodeType || 'output'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Add event listeners directly to the buttons and prevent propagation
  useEffect(() => {
    const editButton = editButtonRef.current;
    const deleteButton = deleteButtonRef.current;
    const card = cardRef.current;
    
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

  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: OutputNode requires the 'data' prop
      </div>
    );
  }

  const outputType = data.outputType || 'webhook';
  
  // Get icon based on output type
  const getIcon = () => {
    switch (outputType) {
      case 'webhook':
        return '🔗';
      case 'discord':
        return '💬';
      case 'sheets':
        return '📊';
      case 'email':
        return '📧';
      default:
        return '📤';
    }
  };

  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-teal-500' : 'border-teal-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id}
    >
      {/* Target handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-teal-500 hover:bg-teal-400 hover:w-5 hover:h-5 transition-all -top-2"
        id={`${data.id}-target`}
        title="Connect from any node"
      >
        <div className="absolute -top-5 text-xs text-gray-500 whitespace-nowrap">← Input</div>
      </Handle>
      
      {/* Node content */}
      <div className="font-semibold text-gray-800 mb-1 flex items-center">
        <span className="mr-2">{getIcon()}</span>
        {data.label || 'Output Node'}
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        <span className="font-medium">Type:</span> {outputType.charAt(0).toUpperCase() + outputType.slice(1)}
      </div>
      
      {outputType === 'webhook' && data.webhookUrl && (
        <div className="text-xs text-gray-600 mb-2 truncate" title={data.webhookUrl}>
          <span className="font-medium">URL:</span> {data.webhookUrl}
        </div>
      )}
      
      {outputType === 'discord' && data.webhookUrl && (
        <div className="text-xs text-gray-600 mb-2 truncate" title={data.webhookUrl}>
          <span className="font-medium">Webhook:</span> {data.webhookUrl}
        </div>
      )}
      
      {outputType === 'sheets' && data.sheetId && (
        <div className="text-xs text-gray-600 mb-2 truncate" title={data.sheetId}>
          <span className="font-medium">Sheet ID:</span> {data.sheetId}
        </div>
      )}
      
      {outputType === 'email' && data.email && (
        <div className="text-xs text-gray-600 mb-2 truncate" title={data.email}>
          <span className="font-medium">Email:</span> {data.email}
        </div>
      )}
      
      {data.description && (
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">Description:</span> {data.description}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit output"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete output"
          data-no-drag="true"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

OutputNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    outputType: PropTypes.string,
    webhookUrl: PropTypes.string,
    sheetId: PropTypes.string,
    email: PropTypes.string,
    description: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

OutputNode.displayName = 'OutputNode';

export default OutputNode; 