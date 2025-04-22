import React, { useCallback, memo, useRef, useEffect } from 'react';
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

  // Add event listeners
  useEffect(() => {
    const editButton = editButtonRef.current;
    const deleteButton = deleteButtonRef.current;
    
    if (editButton) {
      editButton.addEventListener('click', handleEditClick);
    }
    
    if (deleteButton) {
      deleteButton.addEventListener('click', handleDeleteClick);
    }
    
    return () => {
      if (editButton) {
        editButton.removeEventListener('click', handleEditClick);
      }
      
      if (deleteButton) {
        deleteButton.removeEventListener('click', handleDeleteClick);
      }
    };
  }, [handleEditClick, handleDeleteClick]);
  
  const outputType = data.outputType || 'webhook';
  
  return (
    <div
      ref={cardRef}
      style={{
        background: 'white',
        border: `2px solid ${selected ? '#3b82f6' : '#99f6e4'}`,
        borderRadius: '0.5rem',
        padding: '0.75rem',
        width: '16rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        position: 'relative'
      }}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#0d9488', width: '12px', height: '12px', top: '-6px' }}
        isConnectable={isConnectable}
      />
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ 
          width: '2rem', 
          height: '2rem', 
          borderRadius: '9999px', 
          backgroundColor: '#ccfbf1', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: '0.5rem',
          color: '#0d9488'
        }}>
          {outputType === 'discord' ? '💬' : 
           outputType === 'sheets' ? '📊' : 
           outputType === 'email' ? '📧' : '📤'}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{data.label || 'Output'}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{outputType} output</div>
        </div>
      </div>
      
      {/* Output details */}
      <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: '500' }}>Type:</span> {outputType.charAt(0).toUpperCase() + outputType.slice(1)}
      </div>
      
      {outputType === 'webhook' && data.webhookUrl && (
        <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: '500' }}>URL:</span> {data.webhookUrl}
        </div>
      )}
      
      {outputType === 'discord' && data.webhookUrl && (
        <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: '500' }}>Webhook:</span> {data.webhookUrl}
        </div>
      )}
      
      {outputType === 'sheets' && data.sheetId && (
        <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: '500' }}>Sheet ID:</span> {data.sheetId}
        </div>
      )}
      
      {outputType === 'email' && data.email && (
        <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: '500' }}>Email:</span> {data.email}
        </div>
      )}
      
      {data.description && (
        <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '500' }}>Description:</span> {data.description}
        </div>
      )}
      
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          ref={editButtonRef}
          type="button"
          style={{
            fontSize: '0.75rem',
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            border: 'none',
            cursor: 'pointer'
          }}
          aria-label="Edit output"
        >
          Edit
        </button>
        
        <button
          ref={deleteButtonRef}
          type="button"
          style={{
            fontSize: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            border: 'none',
            cursor: 'pointer'
          }}
          aria-label="Delete output"
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