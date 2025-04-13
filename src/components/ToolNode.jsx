import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Use React.memo to prevent unnecessary re-renders
const ToolNode = React.memo(({ data, isConnectable, selected }) => {
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
      className={`bg-blue-50 border-2 ${selected ? 'border-blue-500' : 'border-blue-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id} // Add data attribute for debugging
    >
      {/* Target handle at top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-blue-500"
        id={`${data.id}-target`} // Add id for debugging
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
          className="text-sm text-gray-600 mb-2 truncate"
          title={data.description}
        >
          <span className="font-medium">Performs</span> {data.description}
        </div>
      )}
      
      {data.toolType && (
        <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded inline-block mb-2">
          {data.toolType}
        </div>
      )}
      
      {data.apiEndpoint && (
        <div 
          className="text-xs text-gray-500 mb-1 truncate" 
          title={data.apiEndpoint}
        >
          <span className="font-medium">API:</span> {data.apiEndpoint}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button 
          type="button"
          onClick={handleEditClick} 
          onMouseDown={(e) => { if (e) e.stopPropagation(); }}
          onPointerDown={(e) => { if (e) e.stopPropagation(); }}
          onTouchStart={(e) => { if (e) e.stopPropagation(); }}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
          aria-label="Edit tool"
        >
          Edit
        </button>
        
        <button 
          type="button"
          onClick={handleDeleteClick}
          onMouseDown={(e) => { if (e) e.stopPropagation(); }}
          onPointerDown={(e) => { if (e) e.stopPropagation(); }}
          onTouchStart={(e) => { if (e) e.stopPropagation(); }}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          aria-label="Delete tool"
        >
          Delete
        </button>
      </div>
      
      {/* Source handle at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500"
        id={`${data.id}-source`} // Add id for debugging
      />
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
    onEdit: PropTypes.func,
    onDelete: PropTypes.func,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
ToolNode.displayName = 'ToolNode';

export default ToolNode;