import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const InputNode = memo(({ data, isConnectable, selected }) => {
  const [inputValue, setInputValue] = useState(data.value || '');
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
        nodeType: data.nodeType || 'input'
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
        nodeType: data.nodeType || 'input'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (data.onValueChange) {
      data.onValueChange(e.target.value);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (data.onFileUpload) {
        data.onFileUpload(file.name, result);
      }
    };
    
    if (data.inputType === 'file-text') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // Add event listeners
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
  
  const inputType = data.inputType || 'text';
  const isRequired = data.isRequired || false;
  
  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-indigo-500' : 'border-indigo-200'} rounded-lg p-3 w-72`}
      data-nodeid={data.id}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-indigo-500 hover:bg-indigo-400 hover:w-5 hover:h-5 transition-all -top-2"
      />
      
      <div className="font-semibold text-gray-800 mb-1">
        {data.label || 'Input Node'}
      </div>
      
      <div className="text-sm text-gray-500 mb-2">
        Type: {inputType}
      </div>
      
      {inputType === 'text' && (
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter text input here..."
          className="w-full p-2 border rounded mb-2 text-sm"
          rows={3}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      {inputType === 'file' && (
        <div className="mb-2">
          <label className="block w-full p-2 bg-indigo-100 text-indigo-700 border rounded cursor-pointer">
            <span>Upload File</span>
            <input 
              type="file" 
              className="hidden"
              onChange={handleFileUpload}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          {data.fileName && (
            <div className="text-xs text-gray-600 mt-1">
              Uploaded: {data.fileName}
            </div>
          )}
        </div>
      )}
      
      {inputType === 'url' && (
        <input
          type="url"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter URL..."
          className="w-full p-2 border rounded mb-2 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
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

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-indigo-600 hover:bg-indigo-500 hover:w-5 hover:h-5 transition-all -bottom-2"
      />
    </div>
  );
});

InputNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

InputNode.displayName = 'InputNode';

export default InputNode; 