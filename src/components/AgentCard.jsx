import React, { useCallback, memo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Make sure your component is memoized
const AgentCard = memo(({ data, isConnectable, selected }) => {
  // Create stable event handlers with useCallback
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
        nodeType: data.nodeType || 'agent'
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
        nodeType: data.nodeType || 'agent'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Handle rendering with an improved error message if data is missing
  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: AgentCard requires the 'data' prop
      </div>
    );
  }

  return (
    <div 
      className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-blue-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id} // Add data attribute for debugging
    >
      {/* Target handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500"
      />
      
      {/* Node content */}
      <div
        className="font-semibold text-gray-800 mb-1 truncate"
        title={data.label || 'Unnamed Agent'}
      >
        {data.label || 'Unnamed Agent'}
      </div>
      
      <div
        className="text-sm text-gray-500 mb-1 truncate"
        title={data.role || 'No role defined'}
      >
        {data.role || 'No role defined'}
      </div>
      
      {data.goal && (
        <div
          className="text-xs text-gray-600 mb-1 truncate"
          title={data.goal}
        >
          <span className="font-medium">Goal:</span> {data.goal}
        </div>
      )}
      
      {data.llmModel && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Model:</span> {data.llmModel}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button
          type="button"
          onClick={handleEditClick}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
          aria-label="Edit agent"
        >
          Edit
        </button>
        
        <button
          type="button"
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          aria-label="Delete agent"
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
      />
    </div>
  );
});

// Define PropTypes for type safety and documentation
AgentCard.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    role: PropTypes.string,
    goal: PropTypes.string,
    llmModel: PropTypes.string,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
AgentCard.displayName = 'AgentCard';

export default AgentCard;