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
    // Update the node data if needed
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
        Error: InputNode requires the 'data' prop
      </div>
    );
  }

  const inputType = data.inputType || 'text';
  const inputKey = data.inputKey || 'input';
  const isRequired = data.isRequired || false;
  const variableName = data.variableName || inputKey;

  return (
    <div 
      ref={cardRef}
      className={`bg-white border-2 ${selected ? 'border-indigo-500' : 'border-indigo-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id}
    >
      {/* Node content */}
      <div className="font-semibold text-gray-800 mb-1 flex items-center">
        <span className="mr-2">📥</span>
        {data.label || 'Input Node'}
        {isRequired && (
          <span className="ml-1 text-xs text-red-500 font-normal">*required</span>
        )}
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        <span className="font-medium">Type:</span> {inputType.charAt(0).toUpperCase() + inputType.slice(1)}
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        <span className="font-medium">Variable:</span> {`{{${variableName}}}`}
      </div>
      
      {inputType === 'text' && (
        <div className="mb-2">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            placeholder={`Enter ${data.label || 'text'} here...`}
            className="w-full p-2 border border-gray-300 rounded text-sm"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {inputType === 'file' && (
        <div className="mb-2">
          <label className="block w-full px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded cursor-pointer text-sm text-center hover:bg-indigo-100">
            <span>Upload File</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          {data.fileName && (
            <div className="mt-1 text-xs text-gray-600">
              Uploaded: {data.fileName}
            </div>
          )}
        </div>
      )}
      
      {inputType === 'url' && (
        <div className="mb-2">
          <input
            type="url"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter URL..."
            className="w-full p-2 border border-gray-300 rounded text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit input"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete input"
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
        className="w-4 h-4 bg-indigo-600 hover:bg-indigo-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id={`${data.id}-source`}
        title="Connect to any node"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Output</div>
      </Handle>
    </div>
  );
});

InputNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    inputType: PropTypes.string,
    inputKey: PropTypes.string,
    value: PropTypes.string,
    fileName: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
    isRequired: PropTypes.bool,
    variableName: PropTypes.string,
    onValueChange: PropTypes.func,
    onFileUpload: PropTypes.func
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

InputNode.displayName = 'InputNode';

export default InputNode; 