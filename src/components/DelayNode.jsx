import React, { useCallback, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import clsx from 'clsx';

// Base styles
const baseStyles = {
  container: "bg-white p-3 rounded-lg shadow-md w-64",
  header: "text-lg font-bold text-amber-700 mb-1",
  description: "text-xs text-gray-600 mb-2",
  delayDisplay: "flex items-center justify-center p-3 bg-amber-50 rounded-lg mb-3",
  delayIcon: "text-2xl text-amber-600",
  delayText: "text-sm font-medium text-amber-800 mt-1",
  actionButtons: "flex mt-3 space-x-2",
  editButton: "text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded",
  deleteButton: "text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
};

const DelayNode = React.memo(({ data, isConnectable, selected }) => {
  // Memoized styles
  const containerStyle = useMemo(() => 
    clsx(
      baseStyles.container,
      selected ? 'border-2 border-amber-500' : 'border-2 border-amber-200'
    ), [selected]);

  const handleStyle = useMemo(() => ({
    source: {
      className: "w-4 h-4 bg-amber-600 hover:bg-amber-500 hover:w-5 hover:h-5 transition-all -bottom-2",
      style: { bottom: '-0.5rem' }
    },
    target: {
      className: "w-4 h-4 bg-amber-600 hover:bg-amber-500 hover:w-5 hover:h-5 transition-all -top-2",
      style: { top: '-0.5rem' }
    }
  }), []);

  // Memoized handlers
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    document.dispatchEvent(new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'delay'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    document.dispatchEvent(new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'delay'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  return (
    <div className={containerStyle} onClick={(e) => e.stopPropagation()}>
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        {...handleStyle.target}
        id="target"
        title="Connect from: Agent, Task, Tool, Trigger"
      >
        <div className="absolute -top-5 text-xs text-gray-500 whitespace-nowrap">← Input</div>
      </Handle>
      
      <div className={baseStyles.header}>{data.label || 'Delay'}</div>
      
      {data.description && (
        <div className={baseStyles.description}>{data.description}</div>
      )}
      
      <div className={baseStyles.delayDisplay}>
        <div className="text-center">
          <span className={baseStyles.delayIcon}>⏱️</span>
          <div className={baseStyles.delayText}>
            Wait for {data.duration || '5s'}
          </div>
        </div>
      </div>
      
      <div className={baseStyles.actionButtons}>
        <button 
          type="button"
          onClick={handleEditClick}
          className={baseStyles.editButton}
        >
          Edit
        </button>
        
        <button 
          type="button"
          onClick={handleDeleteClick}
          className={baseStyles.deleteButton}
        >
          Delete
        </button>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        {...handleStyle.source}
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