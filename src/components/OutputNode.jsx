import React, { useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const OutputNode = memo(({ data, isConnectable, selected }) => {
  const editButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const cardRef = useRef(null);
  
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
          editButton.removeEventListener('click', handleEditClick);
          editButton.removeEventListener('mousedown', stopPropagation);
          editButton.removeEventListener('touchstart', stopPropagation);
        }
        if (deleteButton) {
          deleteButton.removeEventListener('click', handleDeleteClick);
          deleteButton.removeEventListener('mousedown', stopPropagation);
          deleteButton.removeEventListener('touchstart', stopPropagation);
        }
      };
    }
  }, [handleEditClick, handleDeleteClick]);

  const outputType = data.outputType || 'webhook';
  
  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-teal-500' : 'border-teal-200'} rounded-lg p-3 w-72`}
      data-nodeid={data.id}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-teal-500 hover:bg-teal-400 hover:w-5 hover:h-5 transition-all -top-2"
      />
      
      <div className="font-semibold text-gray-800 mb-1">
        {data.label || 'Output'}
      </div>
      
      <div className="text-sm text-gray-500 mb-2">
        Type: {outputType}
      </div>
      
      {outputType === 'webhook' && data.webhookUrl && (
        <div className="text-xs text-gray-600 mb-2 truncate">
          URL: {data.webhookUrl}
        </div>
      )}
      
      {outputType === 'discord' && data.webhookUrl && (
        <div className="text-xs text-gray-600 mb-2 truncate">
          Discord Webhook: {data.webhookUrl}
        </div>
      )}
      
      {outputType === 'sheets' && data.sheetId && (
        <div className="text-xs text-gray-600 mb-2 truncate">
          Sheet ID: {data.sheetId}
        </div>
      )}
      
      {outputType === 'email' && data.email && (
        <div className="text-xs text-gray-600 mb-2 truncate">
          Email: {data.email}
        </div>
      )}
      
      <div className="flex mt-2 space-x-2">
        <button
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
        >
          Edit
        </button>
        
        <button
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

OutputNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

OutputNode.displayName = 'OutputNode';

export default OutputNode; 