import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import registry from '../data/tool_registry.json';

const TaskNode = React.memo(({ data, isConnectable, selected }) => {
  const [showDependencies, setShowDependencies] = useState(false);
  const framework = data.framework || 'crewai';
  const frameworkConfig = registry.frameworks[framework]?.config || {};

  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log('========== TaskNode Edit Button Clicked ==========');
    console.log('Node ID:', data.nodeId);
    console.log('Node Type:', data.nodeType || 'task');
    console.dir(data);
    
    // Dispatch a custom event for the parent to handle
    const editEvent = new CustomEvent('node-edit', {
      detail: {
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'task',
        data
      }
    });
    
    console.log('Dispatching event with detail:', editEvent.detail);
    document.dispatchEvent(editEvent);
    
    console.log('Edit event dispatched for node:', data.nodeId);
  }, [data]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.id || data.nodeId,
        nodeType: data.nodeType || 'task'
      } 
    });
    document.dispatchEvent(event);
  }, [data]);

  const formatDependencyLabel = (dependency) => {
    if (!dependency) return '';
    if (typeof dependency === 'string') return dependency;
    if (dependency.label) return dependency.label;
    if (dependency.name) return dependency.name;
    return dependency.type || 'Unknown';
  };

  return (
    <div className={`bg-yellow-50 border-2 ${selected ? 'border-blue-500' : 'border-yellow-200'} shadow-md rounded p-3 w-72`}>
      {/* Target handle at top - regular input */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="input"
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-yellow-500 hover:bg-yellow-400 hover:w-4 hover:h-4 transition-all"
      />
      
      {/* Special agent handle on the left - for agent connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="agent"
        isConnectable={isConnectable} 
        className="w-3 h-3 bg-blue-500 hover:bg-blue-400 hover:w-4 hover:h-4 transition-all"
        style={{ left: -5, top: 30 }}
      />
      
      {/* Node header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <div>
            <h3 className="font-semibold text-lg">{data.label || 'Task'}</h3>
            <div className="text-xs text-gray-500">{data.type || 'Sequential'}</div>
          </div>
        </div>
      </div>

      {/* Task Details */}
      <div className="space-y-2 text-sm">
        {data.description && (
          <div>
            <span className="font-medium">Description:</span> {data.description}
          </div>
        )}
        {data.expectedOutput && (
          <div>
            <span className="font-medium">Expected Output:</span> {data.expectedOutput}
          </div>
        )}
      </div>

      {/* Task Info */}
      <div className="mt-2 space-y-1 text-xs text-gray-600">
        <div>
          <span className="font-medium">Priority:</span> {data.priority || 'Medium'}
        </div>
      </div>

      {/* Async Badge */}
      {data.async && (
        <div className="mt-2">
          <span className="text-xs bg-yellow-100 px-2 py-1 rounded">Async</span>
        </div>
      )}

      {/* Dependencies Section */}
      <div className="mt-2">
        <button
          onClick={() => setShowDependencies(!showDependencies)}
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

      {/* Action Buttons */}
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
        id="output"
        isConnectable={isConnectable}
        className="w-3 h-3 bg-yellow-600 hover:bg-yellow-500 hover:w-4 hover:h-4 transition-all"
      />
    </div>
  );
});

TaskNode.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
    expectedOutput: PropTypes.string,
    async: PropTypes.bool,
    type: PropTypes.string,
    priority: PropTypes.string,
    dependencies: PropTypes.array,
    framework: PropTypes.string,
    nodeType: PropTypes.string
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

TaskNode.displayName = 'TaskNode';

export default TaskNode;