import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const TaskNode = React.memo(({ data, isConnectable, selected }) => {
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
        nodeType: data.nodeType || 'task'
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
        nodeType: data.nodeType || 'task'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Handle rendering with an error message if data is missing
  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: TaskNode requires the 'data' prop
      </div>
    );
  }

  const [showDependencies, setShowDependencies] = useState(false);
  
  // Add this to the TaskNode component to better display dependencies
  const formatDependencyLabel = (dependency) => {
    if (!dependency) return '';
    
    // If it's just a string, return it
    if (typeof dependency === 'string') return dependency;
    
    // If it has a label property, use that
    if (dependency.label) return dependency.label;
    
    // If it has a name property, use that
    if (dependency.name) return dependency.name;
    
    // Otherwise, return the type if available
    return dependency.type || 'Unknown';
  };

  return (
    <div 
      className={`bg-yellow-50 border-2 ${selected ? 'border-blue-500' : 'border-yellow-200'} shadow-md rounded p-3 w-72`}
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
        title={data.label || 'Unnamed Task'}
      >
        {data.label || 'Unnamed Task'}
      </div>
      
      {data.description && (
        <div 
          className="text-sm text-gray-600 mb-1 truncate"
          title={data.description}
        >
          <span className="font-medium">Description:</span> {data.description}
        </div>
      )}
      
      {data.expectedOutput && (
        <div 
          className="text-sm text-gray-600 mb-1 truncate"
          title={data.expectedOutput}
        >
          <span className="font-medium">Output:</span> {data.expectedOutput}
        </div>
      )}
      
      {data.async && (
        <div className="text-xs bg-yellow-100 px-2 py-1 rounded inline-block mb-2" title="This task runs asynchronously">
          Async
        </div>
      )}
      
      {/* New dependency section */}
      <div className="mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDependencies(!showDependencies);
          }}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded mb-2"
        >
          {showDependencies ? 'Hide Dependencies' : 'Show Dependencies'}
        </button>
        
        {showDependencies && data.dependencies && data.dependencies.length > 0 && (
          <div className="mt-1 text-xs bg-gray-50 p-2 rounded">
            <div className="font-semibold mb-1">Dependencies:</div>
            <ul className="list-disc pl-4">
              {data.dependencies.map((dep, index) => (
                <li key={index} className="truncate" title={formatDependencyLabel(dep)}>
                  {formatDependencyLabel(dep)}
                  {dep.type && <span className="text-gray-500"> ({dep.type})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button 
          type="button"
          onClick={handleEditClick} 
          onMouseDown={(e) => { if (e) e.stopPropagation(); }}
          onPointerDown={(e) => { if (e) e.stopPropagation(); }}
          onTouchStart={(e) => { if (e) e.stopPropagation(); }}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
          aria-label="Edit task"
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
          aria-label="Delete task"
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

// Define PropTypes for type safety and documentation
TaskNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
    expectedOutput: PropTypes.string,
    async: PropTypes.bool,
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
TaskNode.displayName = 'TaskNode';

export default TaskNode;