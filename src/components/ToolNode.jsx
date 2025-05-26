import React, { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Base styles defined outside component
const baseStyles = {
  container: "bg-white border-2 rounded-lg shadow-md p-4 w-72",
  selectedBorder: "border-green-500",
  defaultBorder: "border-green-200",
  header: "text-sm font-bold text-gray-800 mb-2 flex items-center",
  description: "text-xs text-gray-600 mb-3",
  codeContainer: "bg-gray-50 p-2 rounded border border-gray-100 mb-3",
  codeLabel: "text-xs font-medium text-gray-700 mb-1",
  codeBlock: "text-xs font-mono bg-gray-100 p-1 rounded block overflow-x-auto whitespace-pre-wrap",
  buttonContainer: "flex mt-3 space-x-2",
  editButton: "text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded",
  deleteButton: "text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded",
  handle: {
    base: "w-3 h-3 transition-all",
    input: "bg-green-500 hover:bg-green-400 hover:w-4 hover:h-4",
    output: "bg-green-600 hover:bg-green-500 hover:w-4 hover:h-4"
  }
};

// Memoized result renderer component
const ResultDisplay = memo(({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
      <div className="text-xs font-medium text-gray-700 mb-2">Result:</div>
      <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap text-gray-800">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
});

ResultDisplay.displayName = 'ResultDisplay';

// Tool type definitions
export const ToolType = {
  LLM: 'llm',
  API: 'api',
  WEBHOOK: 'webhook',
  CUSTOM: 'custom'
};

// Use React.memo to prevent unnecessary re-renders
const ToolNode = memo(({ data, isConnectable, selected }) => {
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
        return { icon: '🔧', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Origin badge colors
  const originBadgeStyles = useMemo(() => ({
    make: { bg: "bg-indigo-100", text: "text-indigo-700", icon: "🧩", border: "border-indigo-200" },
    zapier: { bg: "bg-amber-100", text: "text-amber-700", icon: "⚡", border: "border-amber-200" },
    n8n: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔄", border: "border-purple-200" },
    marketplace: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "🛒", border: "border-emerald-200" },
    ai: { bg: "bg-blue-100", text: "text-blue-700", icon: "🤖", border: "border-blue-200" },
    default: { bg: "bg-gray-100", text: "text-gray-700", icon: "📦", border: "border-gray-200" }
  }), []);

  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [data.nodeId]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [data.nodeId]);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(prev => !prev);
  }, []);

  // Memoize origin badge content
  const originBadgeContent = useMemo(() => {
    const origin = data.origin || 'default';
    const style = originBadgeStyles[origin];
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
        <span className="mr-1">{style.icon}</span>
        {origin === 'make' ? 'Make' :
         origin === 'zapier' ? 'Zapier' :
         origin === 'n8n' ? 'n8n' :
         origin === 'marketplace' ? 'Marketplace' :
         origin === 'ai' ? 'AI-Suggested' :
         origin}
      </div>
    );
  }, [data.origin, originBadgeStyles]);

  // Get the display endpoint (frameworkConfig.url or apiEndpoint)
  const displayEndpoint = useMemo(() => {
    return data.frameworkConfig?.url || data.apiEndpoint || '';
  }, [data.frameworkConfig?.url, data.apiEndpoint]);

  // Get tool configuration summary
  const configSummary = useMemo(() => {
    const config = data.frameworkConfig || {};
    const parts = [];
    
    if (config.method) parts.push(`${config.method}`);
    if (config.model) parts.push(`Model: ${config.model}`);
    if (config.temperature !== undefined) parts.push(`T: ${config.temperature}`);
    if (config.max_tokens) parts.push(`Max: ${config.max_tokens}`);
    
    return parts.join(' • ');
  }, [data.frameworkConfig]);

  return (
    <div 
      className={`
        relative group w-80
        bg-gradient-to-br from-white via-green-50/30 to-green-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-green-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-green-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-green-400 shadow-green-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-green-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400 via-blue-400 to-green-400 opacity-75 animate-spin-slow -z-10" 
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
              className="text-green-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-green-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ top: -8 }}
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
                {data.label || 'Unnamed Tool'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {data.toolType || 'API'} Tool
                </span>
                {data.framework && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border">
                    {data.framework}
                  </span>
                )}
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

        {/* Origin badge */}
        {data.origin && (
          <div className="mb-3">
            {originBadgeContent}
          </div>
        )}
        
        {/* Key Information */}
        {data.description && (
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[60px]">Purpose:</span>
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
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500 ease-out"
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
      
      {/* Configuration summary */}
      {configSummary && (
        <div className="px-4 pb-3">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <span className="text-xs font-medium text-blue-700">Config:</span>
            <span className="text-xs text-blue-600 ml-1">{configSummary}</span>
          </div>
        </div>
      )}
      
      {/* API Endpoint */}
      {displayEndpoint && (
        <div className="px-4 pb-3">
          <button
            onClick={toggleApiVisibility}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
          >
            {hideApiEndpoint ? '👁️ Show Endpoint' : '🔒 Hide Endpoint'}
          </button>
          {!hideApiEndpoint && (
            <div className="mt-2 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/50">
              <div className="text-xs font-mono text-gray-800 break-all">
                {displayEndpoint}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expected Output */}
      {data.expectedOutput && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="text-xs font-medium text-gray-700 mb-1">Expected Output:</div>
            <div className="text-xs text-gray-600 italic">
              {data.expectedOutput}
            </div>
          </div>
        </div>
      )}

      {/* Condition */}
      {data.condition && (
        <div className="px-4 pb-3">
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="text-xs font-medium text-orange-700 mb-1">Condition:</div>
            <div className="text-xs text-orange-600">{data.condition}</div>
          </div>
        </div>
      )}

      {/* Result display */}
      {data.result && (
        <div className="px-4 pb-3">
          <ResultDisplay result={data.result} />
        </div>
      )}
      
      {/* Action buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            onClick={handleEditClick}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Edit
          </button>
          <button 
            onClick={handleDeleteClick}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-green-600 to-green-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-green-400/20 -z-10 blur-xl" />
      )}
    </div>
  );
});

ToolNode.displayName = 'ToolNode';

ToolNode.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string.isRequired,
    label: PropTypes.string,
    description: PropTypes.string,
    toolType: PropTypes.string,
    framework: PropTypes.string,
    frameworkConfig: PropTypes.object,
    apiEndpoint: PropTypes.string,
    expectedOutput: PropTypes.string,
    condition: PropTypes.string,
    async: PropTypes.bool,
    origin: PropTypes.string,
    result: PropTypes.any,
    nodeType: PropTypes.string,
    onChange: PropTypes.func,
    onDelete: PropTypes.func,
    executionState: PropTypes.object
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

export default ToolNode;