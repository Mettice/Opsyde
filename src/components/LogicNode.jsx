import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Move static styles outside component
const baseStyles = {
  container: "bg-white border-2 rounded-lg shadow-md p-4 w-64",
  selectedBorder: "border-yellow-500",
  defaultBorder: "border-yellow-200",
  header: "text-sm font-bold text-yellow-800 mb-2 flex items-center",
  description: "text-xs text-gray-600 mb-3",
  codeContainer: "bg-yellow-50 p-2 rounded border border-yellow-100 mb-3",
  codeLabel: "text-xs font-medium text-yellow-700 mb-1",
  codeBlock: "text-xs font-mono bg-yellow-100 p-1 rounded block overflow-x-auto whitespace-pre-wrap",
  buttonContainer: "flex mt-3 space-x-2",
  editButton: "text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded",
  deleteButton: "text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
};

// Define origin badge colors outside component
const originBadgeColors = {
  true: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200"
  },
  false: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200"
  },
  error: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200"
  }
};

const LogicNode = React.memo(({ data, isConnectable, selected }) => {
  const [previewResult, setPreviewResult] = useState(null);
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
        return { icon: '⚖️', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'logic'
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
        nodeType: data.nodeType || 'logic'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Memoize test condition function
  const testCondition = useCallback(() => {
    if (!data.condition) return;
    
    try {
      const testInput = data.testInput ? JSON.parse(data.testInput) : { value: 10 };
      const result = new Function('inputs', `return ${data.condition}`)(testInput);
      setPreviewResult({
        success: true,
        result: result,
        path: result ? 'true' : 'false'
      });
    } catch (error) {
      setPreviewResult({
        success: false,
        error: error.message
      });
    }
  }, [data.condition, data.testInput]);

  // Call testCondition when the component mounts or when condition changes
  useEffect(() => {
    testCondition();
  }, [testCondition]);

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
      onClick={(e) => e.stopPropagation()}
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
                {data.label || "Logic Node"}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                Conditional Logic
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

        <div className="mb-3">
          <div className="flex items-start gap-2">
            <span className="font-medium text-gray-600 min-w-[70px]">Purpose:</span>
            <span className="text-gray-800 flex-1 text-sm">
              {data.description || "Evaluates a condition and routes flow"}
            </span>
          </div>
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
          {previewResult && previewResult.success && (
            <span className={`flex items-center gap-1 ${previewResult.result ? 'text-green-600' : 'text-red-600'}`}>
              {previewResult.result ? '✅ True' : '❌ False'}
            </span>
          )}
        </div>
      </div>
      
      {/* Condition Display */}
      <div className="px-4 pb-3">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Condition:</div>
          <code className="text-sm font-mono bg-yellow-100 p-2 rounded block overflow-x-auto whitespace-pre-wrap text-gray-800">
            {data.condition || "inputs.value > 0"}
          </code>
        </div>
      </div>
      
      {/* Preview Result */}
      {previewResult && (
        <div className="px-4 pb-3">
          <div className={`
            p-3 rounded-xl border
            ${previewResult.success 
              ? previewResult.result 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
            }
          `}>
            <div className="text-xs font-medium mb-1">
              {previewResult.success ? 'Preview Result:' : 'Error:'}
            </div>
            <div className={`text-sm ${
              previewResult.success 
                ? previewResult.result 
                  ? 'text-green-700' 
                  : 'text-red-700'
                : 'text-gray-700'
            }`}>
              {previewResult.success 
                ? `Condition evaluates to: ${previewResult.result ? 'True' : 'False'}`
                : previewResult.error
              }
            </div>
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleEditClick}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
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
      
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ left: -8 }}
        id="input"
      />
      
      {/* True output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ right: -8, top: '35%' }}
        id="true"
      >
        <div className="absolute -right-16 -top-1 text-xs text-green-600 whitespace-nowrap font-medium">
          True →
        </div>
      </Handle>
      
      {/* False output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ right: -8, top: '65%' }}
        id="false"
      >
        <div className="absolute -right-16 -top-1 text-xs text-red-600 whitespace-nowrap font-medium">
          False →
        </div>
      </Handle>

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-yellow-400/20 -z-10 blur-xl" />
      )}
    </div>
  );
});

LogicNode.displayName = 'LogicNode';

LogicNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

export default LogicNode;
