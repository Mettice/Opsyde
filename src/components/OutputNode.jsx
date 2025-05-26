import React, { useCallback, memo, useRef, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Safe accessor helper function
const safeAccess = (obj, path, defaultValue = null) => {
  if (!obj) return defaultValue;
  
  const parts = path.split('.');
  let result = obj;
  
  for (const part of parts) {
    if (result === null || result === undefined) return defaultValue;
    result = result[part];
  }
  
  return result !== undefined ? result : defaultValue;
};

const OutputNode = memo(({ data, isConnectable, selected }) => {
  // State for hiding API endpoint/details
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  
  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  const outputType = data.outputType || 'webhook';
  
  // Get appropriate icon and label for output type
  const getOutputTypeDisplay = (type) => {
    switch (type) {
      case 'smart_email':
        return { icon: '🤖📧', label: 'Smart Email', description: 'AI-powered email formatting' };
      case 'smart_api':
        return { icon: '🤖🔗', label: 'AI Integration', description: 'AI-powered API integration' };
      case 'webhook':
        return { icon: '🔗', label: 'Webhook', description: 'HTTP webhook' };
      case 'email':
        return { icon: '📧', label: 'Email', description: 'Direct email' };
      case 'discord':
        return { icon: '💬', label: 'Discord', description: 'Discord webhook' };
      case 'sheets':
        return { icon: '📊', label: 'Google Sheets', description: 'Spreadsheet integration' };
      default:
        return { icon: '📤', label: 'Output', description: type };
    }
  };

  // Get output type icon for status display - moved before getStatusDisplay
  const getOutputTypeIcon = () => {
    const typeDisplay = getOutputTypeDisplay(outputType);
    return typeDisplay.icon;
  };

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
        return { icon: getOutputTypeIcon(), color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const typeDisplay = getOutputTypeDisplay(outputType);
  
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

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(prev => !prev);
  }, []);

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

      <Handle
        type="target"
        position={Position.Top}
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
                {data.label || 'Output'}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                {typeDisplay.label}
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

        {/* AI-Powered badge for smart outputs */}
        {outputType.startsWith('smart_') && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border bg-purple-100 text-purple-700 border-purple-200">
              🤖 AI-Powered
            </span>
          </div>
        )}

        <div className="mb-3">
          <div className="flex items-start gap-2">
            <span className="font-medium text-gray-600 min-w-[70px]">Type:</span>
            <span className="text-gray-800 flex-1 text-sm">{typeDisplay.description}</span>
          </div>
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
        </div>
      </div>
      
      {/* Configuration section */}
      {/* Smart output configuration display */}
      {outputType.startsWith('smart_') && (
        <div className="px-4 pb-3">
          <div className="bg-purple-50/60 backdrop-blur-sm rounded-xl border border-purple-200/50 p-3">
            <div className="text-xs font-medium text-purple-800 mb-2">AI Configuration:</div>
            {data.ai_description && (
              <div className="text-xs text-purple-700 mb-1">
                <strong>Task:</strong> {data.ai_description.substring(0, 50)}...
              </div>
            )}
            {data.service_type && (
              <div className="text-xs text-purple-700 mb-1">
                <strong>Type:</strong> {data.service_type}
              </div>
            )}
            {outputType === 'smart_email' && data.recipient_email && (
              <div className="text-xs text-purple-700">
                <strong>Recipient:</strong> {data.recipient_email}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Traditional configuration displays */}
      {outputType === 'webhook' && data.webhook && (
        <div className="px-4 pb-3">
          <button
            onClick={toggleApiVisibility}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
          >
            {hideApiEndpoint ? '👁️ Show Webhook URL' : '🔒 Hide Webhook URL'}
          </button>
          
          {!hideApiEndpoint && (
            <div className="mt-2 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/50">
              <div className="text-xs font-mono text-gray-800 break-all">
                {data.webhook}
              </div>
            </div>
          )}
        </div>
      )}
      
      {outputType === 'email' && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Email Configuration:</div>
            <div className="text-xs text-gray-600">Email: {data.email || 'Not set'}</div>
          </div>
        </div>
      )}
      
      {outputType === 'discord' && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Discord Configuration:</div>
            <div className="text-xs text-gray-600">Webhook configured: {data.webhook ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
      
      {outputType === 'sheets' && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Sheets Configuration:</div>
            <div className="text-xs text-gray-600">Sheet ID: {data.sheetId || 'Not set'}</div>
          </div>
        </div>
      )}
      
      {/* Don't render results here - they should only appear in the execution panel */}
      
      {/* Action buttons */}
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

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-blue-400/20 -z-10 blur-xl" />
      )}
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