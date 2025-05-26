import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';

const AgentCard = React.memo(({ data, selected, isConnectable }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting

  // Get framework ID if an object is passed, otherwise use the string value
  const frameworkId = typeof data.framework === 'object' ? data.framework.id || 'openrouter' : data.framework || 'openrouter';
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
      setIsProcessing(data.executionState.status === 'processing');
    }
  }, [data.executionState]);

  const handleEditClick = useCallback((e) => {
    // Stop event propagation
    e?.stopPropagation();
    e?.preventDefault();
    
    // Create and dispatch custom event without passing the original event
    document.dispatchEvent(new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent',
        data: {
          ...data,
          framework: frameworkId
        }
      } 
    }));
  }, [data, frameworkId]);

  const handleDeleteClick = useCallback((e) => {
    // Stop event propagation
    e?.stopPropagation();
    e?.preventDefault();
    
    // Create and dispatch custom event without passing the original event
    document.dispatchEvent(new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

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
        return { icon: '🤖', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get framework badge color
  const getFrameworkBadgeColor = () => {
    switch (frameworkId.toLowerCase()) {
      case 'openai':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'anthropic':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'openrouter':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'crewai':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Ensure data is properly structured before rendering
  const safeData = {
    ...data,
    label: data.label || 'Agent',
    role: data.role || '',
    goal: data.goal || '',
    backstory: data.backstory || '',
    llmModel: data.llmModel || 'gpt-4',
    temperature: data.temperature || 0.7,
    max_tokens: data.max_tokens || 4000,
    enableMemory: data.enableMemory || false,
    prompt: data.prompt || ''
  };

  return (
    <div 
      className={`
        relative group w-80 
        bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-blue-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-blue-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-blue-400 shadow-blue-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-blue-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
      onClick={(e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-75 animate-spin-slow -z-10" 
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
              className="text-blue-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ top: -8 }}
        isConnectable={isConnectable}
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
                {safeData.label}
              </h3>
              <div className={`
                inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border
                ${getFrameworkBadgeColor()}
              `}>
                {frameworkId}
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
          {safeData.role && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[45px]">Role:</span>
              <span className="text-gray-800 flex-1">{safeData.role}</span>
            </div>
          )}
          {safeData.goal && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[45px]">Goal:</span>
              <span className="text-gray-800 flex-1 line-clamp-2">{safeData.goal}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
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
          {safeData.enableMemory && (
            <span className="flex items-center gap-1 text-purple-600">
              🧠 Memory
            </span>
          )}
        </div>
      </div>

      {/* Configuration Details */}
      <div className="px-4 pb-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium text-gray-600">Model:</span>
              <div className="text-gray-800 font-mono">{safeData.llmModel}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Temp:</span>
              <div className="text-gray-800">{safeData.temperature}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tokens:</span>
              <div className="text-gray-800">{safeData.max_tokens}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Memory:</span>
              <div className={safeData.enableMemory ? 'text-green-600' : 'text-gray-400'}>
                {safeData.enableMemory ? 'On' : 'Off'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleEditClick}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
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

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-4 h-4 bg-gradient-to-r from-blue-600 to-blue-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
        isConnectable={isConnectable}
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-blue-400/20 -z-10 blur-xl" />
      )}
    </div>
  );
});

AgentCard.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string.isRequired,
    label: PropTypes.string,
    framework: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    nodeType: PropTypes.string,
    role: PropTypes.string,
    goal: PropTypes.string,
    backstory: PropTypes.string,
    llmModel: PropTypes.string,
    temperature: PropTypes.number,
    max_tokens: PropTypes.number,
    enableMemory: PropTypes.bool,
    prompt: PropTypes.string,
    executionState: PropTypes.object
  }).isRequired,
  selected: PropTypes.bool,
  isConnectable: PropTypes.bool
};

AgentCard.displayName = 'AgentCard';

export default AgentCard;