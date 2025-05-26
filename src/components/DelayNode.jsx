import React, { useCallback, useMemo, useEffect, useState } from 'react';
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
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setRemainingTime(data.executionState.remainingTime || 0);
    }
  }, [data.executionState]);

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'processing':
        return { icon: '⏳', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'success':
        return { icon: '✅', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'error':
        return { icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'waiting':
        return { icon: '⏱️', color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      default:
        return { icon: '⏱️', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

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

  // Parse duration for display
  const parseDuration = (duration) => {
    if (!duration) return '5s';
    
    // Convert various formats to readable format
    if (typeof duration === 'number') {
      if (duration < 60) return `${duration}s`;
      if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
      return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    }
    
    return duration;
  };

  return (
    <div 
      className={`
        relative group w-80
        bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-amber-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-amber-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-amber-400 shadow-amber-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-amber-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 opacity-75 animate-spin-slow -z-10" 
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
              className="text-amber-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-amber-400 to-amber-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ top: -8 }}
        id="target"
        title="Connect from: Agent, Task, Tool, Trigger"
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
                {data.label || 'Delay'}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                Timer Node
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

        {data.description && (
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[70px]">Description:</span>
              <span className="text-gray-800 flex-1 text-sm">{data.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 ease-out"
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
            {remainingTime > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                ⏳ {remainingTime.toFixed(1)}s left
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Delay Display */}
      <div className="px-4 pb-3">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-4">
          <div className="text-center">
            <div className="text-3xl mb-2">
              {status === 'processing' ? '⏳' : '⏱️'}
            </div>
            <div className="text-lg font-bold text-amber-800 mb-1">
              Wait for {parseDuration(data.duration)}
            </div>
            {status === 'processing' && remainingTime > 0 && (
              <div className="text-sm text-amber-600">
                {remainingTime.toFixed(1)}s remaining
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleEditClick}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Edit
          </button>
          
          <button 
            type="button"
            onClick={handleDeleteClick}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Delete
          </button>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-amber-600 to-amber-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
        id="source"
        title="Connect to: Agent, Task, Tool"
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-amber-400/20 -z-10 blur-xl" />
      )}
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
    executionState: PropTypes.object,
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

DelayNode.displayName = 'DelayNode';

export default DelayNode; 