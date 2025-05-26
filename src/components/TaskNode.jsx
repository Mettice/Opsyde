import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import registry from '../data/tool_registry.json';

const TaskNode = React.memo(({ data, isConnectable, selected }) => {
  const [showDependencies, setShowDependencies] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  
  const framework = data.framework || 'crewai';
  const frameworkConfig = registry.frameworks[framework]?.config || {};

  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'processing':
        return { icon: '⚡', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'success':
        return { icon: '✅', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'error':
        return { icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'waiting':
        return { icon: '⏳', color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      default:
        return { icon: '📋', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get priority color
  const getPriorityColor = () => {
    switch (data.priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log('========== TaskNode Edit Button Clicked ==========');
    console.log('Node ID:', data.nodeId);
    console.log('Node Type:', data.nodeType || 'task');
    console.dir(data);
    
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
    <div 
      className={`
        relative group w-80
        bg-gradient-to-br from-white via-yellow-50/30 to-yellow-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-yellow-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-yellow-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-yellow-400 shadow-yellow-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-yellow-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 opacity-75 animate-spin-slow -z-10" 
             style={{ padding: '2px' }}>
          <div className="w-full h-full rounded-2xl bg-white"></div>
        </div>
      )}

      {/* Execution Progress Ring */}
      {(status === 'processing' || executionProgress > 0) && (
        <div className="absolute -top-2 -right-2 w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              className="text-gray-200"
            />
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeDasharray={`${executionProgress * 0.88} 88`}
              className="text-yellow-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-yellow-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* Target handle at top - regular input */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="input"
        isConnectable={isConnectable} 
        className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ top: -8 }}
      />
      
      {/* Special agent handle on the left - for agent connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="agent"
        isConnectable={isConnectable} 
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ left: -8, top: 40 }}
      />
      
      {/* Header Section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl ${statusDisplay.bgColor} 
              flex items-center justify-center text-2xl
              shadow-inner border ${statusDisplay.borderColor}
              ${status === 'processing' ? 'animate-bounce' : ''}
            `}>
              {statusDisplay.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800 leading-tight">
                {data.label || 'Task'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {data.type || 'Sequential'} Task
                </span>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${getPriorityColor()}`}>
                  {data.priority || 'Medium'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${statusDisplay.color} ${statusDisplay.bgColor}
          `}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {/* Key Information */}
        <div className="space-y-2 text-sm">
          {data.description && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[70px]">Description:</span>
              <span className="text-gray-800 flex-1">{data.description}</span>
            </div>
          )}
          {data.expectedOutput && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[70px]">Expected:</span>
              <span className="text-gray-800 flex-1 line-clamp-2">{data.expectedOutput}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${executionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gray-600">
              ⚡ {executionTime > 0 ? `${executionTime.toFixed(1)}s` : '--'}
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              💰 ${cost > 0 ? cost.toFixed(3) : '0.000'}
            </span>
          </div>
          {data.async && (
            <span className="flex items-center gap-1 text-purple-600">
              🔄 Async
            </span>
          )}
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setShowDependencies(!showDependencies)}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
        >
          {showDependencies ? '🔼 Hide Dependencies' : '🔽 Show Dependencies'}
        </button>
        
        {showDependencies && data.dependencies && data.dependencies.length > 0 && (
          <div className="mt-2 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="text-xs font-medium text-gray-700 mb-2">Dependencies:</div>
            <div className="space-y-1">
              {data.dependencies.map((dep, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border">
                  <span className="font-medium text-gray-800 truncate" title={formatDependencyLabel(dep)}>
                    {formatDependencyLabel(dep)}
                  </span>
                  {dep.type && (
                    <span className="text-gray-500 ml-2">({dep.type})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleEditClick}
            onMouseDown={(e) => { if (e) e.stopPropagation(); }}
            onPointerDown={(e) => { if (e) e.stopPropagation(); }}
            onTouchStart={(e) => { if (e) e.stopPropagation(); }}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
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
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
            aria-label="Delete task"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Source handle at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="output"
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-yellow-600 to-yellow-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-yellow-400/20 -z-10 blur-xl" />
      )}
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
    nodeType: PropTypes.string,
    executionState: PropTypes.object
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

TaskNode.displayName = 'TaskNode';

export default TaskNode;