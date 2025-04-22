import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const InputNode = memo(({ data, isConnectable, selected }) => {
  const [inputValue, setInputValue] = useState(data.value || '');
  
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

  const inputType = data.inputType || 'text';
  const isRequired = data.isRequired || false;
  
  return (
    <div
      style={{
        background: 'white',
        border: `2px solid ${selected ? '#3b82f6' : '#c7d2fe'}`,
        borderRadius: '0.5rem',
        padding: '0.75rem',
        width: '16rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        position: 'relative'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ 
          width: '2rem', 
          height: '2rem', 
          borderRadius: '9999px', 
          backgroundColor: '#e0e7ff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: '0.5rem',
          color: '#4f46e5'
        }}>
          {inputType === 'file' ? '📁' : inputType === 'url' ? '🔗' : '📝'}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{data.label || 'Input'}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {inputType} input
            {isRequired && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*required</span>}
          </div>
        </div>
      </div>
      
      {/* Input field */}
      {inputType === 'text' && (
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter text input here..."
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            border: '1px solid #d1d5db', 
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}
          rows={3}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      {inputType === 'file' && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ 
            display: 'block',
            width: '100%',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#eef2ff',
            color: '#4338ca',
            border: '1px solid #c7d2fe',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            <span>Upload File</span>
            <input 
              type="file" 
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          {data.fileName && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
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
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            border: '1px solid #d1d5db', 
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick(e);
          }}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          Edit
        </button>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(e);
          }}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
        >
          Delete
        </button>
      </div>
      
      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#4f46e5', width: '12px', height: '12px', bottom: '-6px' }}
        isConnectable={isConnectable}
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