import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import CVResultsDisplay from '../CVResultsDisplay'; // Fixed import path

// Get debug mode from URL or default to off
const isDebugMode = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true' || process.env.NODE_ENV === 'development';
  }
  return false;
};

// Helper function to format complex objects
const formatComplexObject = (obj, maxDepth = 2, currentDepth = 0) => {
  if (currentDepth > maxDepth) {
    return typeof obj === 'object' ? '[Complex Object]' : String(obj);
  }
  
  if (!obj) return 'null';
  
  // Handle primitive values
  if (typeof obj !== 'object') return String(obj);
  
  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    if (currentDepth === maxDepth) return `[Array(${obj.length})]`;
    
    return (
      <div className="pl-2">
        {obj.slice(0, 5).map((item, i) => (
          <div key={i} className="text-xs">
            <span className="opacity-70">[{i}]:</span>{' '}
            {formatComplexObject(item, maxDepth, currentDepth + 1)}
            {i === 4 && obj.length > 5 && <div className="opacity-70">{`... ${obj.length - 5} more items`}</div>}
          </div>
        ))}
      </div>
    );
  }
  
  // Handle objects
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  if (currentDepth === maxDepth) return `{Object with ${entries.length} properties}`;
  
  return (
    <div className="pl-2">
      {entries.slice(0, 5).map(([key, value], i) => (
        <div key={key} className="text-xs">
          <span className="font-medium">{key}:</span>{' '}
          {formatComplexObject(value, maxDepth, currentDepth + 1)}
          {i === 4 && entries.length > 5 && <div className="opacity-70">{`... ${entries.length - 5} more properties`}</div>}
        </div>
      ))}
    </div>
  );
};

const NodeResultDisplay = ({ result }) => {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Initialize debug mode
  useEffect(() => {
    setShowDebugInfo(isDebugMode());
  }, []);
  
  // Skip output display for errors when not in debug mode
  if (!result) return null;
  
  // Don't display error results unless in debug mode
  const shouldHideError = !showDebugInfo && 
                         (result.error || 
                          result.success === false || 
                          result.status === 'error');
  
  if (shouldHideError && !result.type?.includes('_result')) {
    return null; // Hide pure error results in non-debug mode
  }

  // Format timestamp if present
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  const timestamp = result.timestamp ? formatTimestamp(result.timestamp) : '';
  
  // Handle different result statuses
  const getStatusColor = (status) => {
    switch(status) {
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'success':
      case 'completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'started': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  // Determine appropriate icon
  const getIcon = (type) => {
    switch(type) {
      case 'agent': return '🧠';
      case 'task': 
      case 'task_result': return '📋';
      case 'tool': return '🔧';
      case 'input': return '📥';
      case 'output': return '📤';
      case 'webhook_result': return '🔗';
      case 'email_result': return '📧';
      case 'discord_result': return '💬';
      case 'sheets_result': return '📊';
      case 'logic': return '🔀';
      case 'trigger': return '⚡';
      case 'delay': return '⏱️';
      case 'chat': 
      case 'chatbot': return '💬';
      case 'error': return '❌';
      case 'cv_result': return '👁️';
      case 'image': return '🖼️';
      case 'json': return '{ }';
      case 'text': return '📝';
      default: return '📦';
    }
  };

  // Extract the actual result data based on nested structure
  const extractResultData = (resultObj) => {
    if (!resultObj) return null;
    
    // Check for common nested structures
    if (resultObj.data?.result) return resultObj.data.result;
    if (resultObj.data) return resultObj.data;
    if (resultObj.value?.data) return resultObj.value.data;
    if (resultObj.value) return resultObj.value;
    if (resultObj.result) return resultObj.result;
    
    return resultObj;
  };

  // Handle CV results
  if (result.type === "cv_result" && result.data) {
    return <CVResultsDisplay results={result.data} />;
  }

  // Handle output node results (email, webhook, discord, sheets)
  if (result.type?.endsWith('_result') && ['email_result', 'webhook_result', 'discord_result', 'sheets_result'].includes(result.type)) {
    const resultStatus = result.success ? "success" : "error";
    const status = resultStatus === "success" ? "Success" : "Failed";
    
    // If this is an error and we're not in debug mode, conditionally show limited info
    if (resultStatus === "error" && !showDebugInfo) {
      // Only show basic notification for errors when not in debug mode
      return (
        <div className="bg-orange-50 border border-orange-200 rounded p-2 my-1">
          <div className="font-medium text-orange-700 flex items-center">
            <span className="mr-1">{getIcon(result.type)}</span>
            Output is processing
          </div>
          <div className="text-xs text-orange-600">
            Waiting for result...
          </div>
        </div>
      );
    }
    
    // Show detailed debug info for troubleshooting
    const debugInfo = showDebugInfo && (
      <div className="text-xs mt-2 p-1 bg-gray-100 rounded overflow-auto max-h-20">
        <div className="font-mono text-gray-600">
          {JSON.stringify(result, null, 2)}
        </div>
      </div>
    );
    
    const data = result.data || {};
    
    // Handle different response structures
    const recipient = data.recipient || 
                    (data.data && data.data.recipient) || 
                    (typeof data === 'string' ? 'Recipient not available' : '');
                    
    const emailSubject = data.subject || 
                      (data.data && data.data.subject) || 
                      'Subject not available';
    
    // Create the email details display
    const details = (
      <div className="text-xs mt-1">
        {recipient && <div><strong>To:</strong> {recipient}</div>}
        {emailSubject && <div><strong>Subject:</strong> {emailSubject}</div>}
        {data.message && <div className="mt-1">{data.message}</div>}
        {showDebugInfo && debugInfo}
      </div>
    );
    
    return (
      <div className={`node-output output-result p-2 rounded border ${getStatusColor(resultStatus)}`}>
        <div className="flex justify-between items-center mb-1">
          <div className="font-medium flex items-center">
            <span className="mr-1">{getIcon(result.type)}</span>
            {result.output_type ? `${result.output_type.charAt(0).toUpperCase()}${result.output_type.slice(1)} Output` : 'Output Result'}
          </div>
          {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              resultStatus === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {status}
            </span>
            {showDebugInfo && (
              <button 
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="text-xs px-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
              </button>
            )}
          </div>
          {result.summary && <div className="text-sm mb-1">{result.summary}</div>}
          {details}
          {(showDebugInfo && result.error) && (
            <div className="text-red-600 text-sm bg-red-50 p-1 rounded mt-1">
              {result.error}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Handle different result types
  switch (result.type) {
    case 'text':
      return (
        <div className={`node-output text-result p-2 rounded border ${getStatusColor(result.status)}`}>
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium flex items-center">
              <span className="mr-1">{getIcon(result.type)}</span>
              Text Result
            </div>
            {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
          </div>
          <div className="text-sm overflow-auto max-h-60 whitespace-pre-wrap">
            {result.data}
          </div>
        </div>
      );
    
    case 'json':
      const jsonData = extractResultData(result);
      
      return (
        <div className={`node-output json-result p-2 rounded border ${getStatusColor(result.status)}`}>
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium flex items-center">
              <span className="mr-1">{getIcon(result.type)}</span>
              JSON Result
            </div>
            {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
          </div>
          <div className="text-xs bg-white bg-opacity-50 p-1 rounded overflow-auto max-h-60">
            {formatComplexObject(jsonData)}
          </div>
        </div>
      );
    
    case 'error':
      // Don't show errors in production mode unless debug is enabled
      if (!showDebugInfo) return null;
      
      return (
        <div className="node-output error-result bg-red-50 border border-red-300 rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium text-red-700 flex items-center">
              <span className="mr-1">❌</span>
              Error
            </div>
            {timestamp && <div className="text-xs text-red-600 opacity-75">{timestamp}</div>}
          </div>
          <div className="text-sm text-red-600 whitespace-pre-wrap">
            {result.message || result.error || (typeof result.data === 'object' ? formatComplexObject(result.data) : result.data)}
          </div>
        </div>
      );
    
    case 'image':
      return (
        <div className={`node-output image-result p-2 rounded border ${getStatusColor(result.status)}`}>
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium flex items-center">
              <span className="mr-1">{getIcon('image')}</span>
              Image Result
            </div>
            {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
          </div>
          <img 
            src={result.data} 
            alt={result.alt || "Result image"} 
            className="max-w-full max-h-60 object-contain rounded"
          />
        </div>
      );
      
    case 'agent':
    case 'agent_status':
      return (
        <div className={`node-output agent-result p-2 rounded border ${getStatusColor(result.status)}`}>
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium flex items-center">
              <span className="mr-1">{getIcon('agent')}</span>
              Agent Status
            </div>
            {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
          </div>
          <div className="text-xs">
            <div><strong>Status:</strong> {result.status || 'ready'}</div>
            {result.data?.role && <div><strong>Role:</strong> {result.data.role}</div>}
            {result.data?.llm_model && <div><strong>Model:</strong> {result.data.llm_model}</div>}
            {result.data?.provider && <div><strong>Provider:</strong> {result.data.provider}</div>}
            {result.data?.framework && <div><strong>Framework:</strong> {result.data.framework}</div>}
          </div>
        </div>
      );
      
    case 'task':
    case 'task_result':
      const taskData = extractResultData(result);
      const taskResult = result.data?.result || (taskData && typeof taskData === 'object' ? taskData.result : null);
      
      return (
        <div className={`node-output task-result p-2 rounded border ${getStatusColor(result.status)}`}>
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium flex items-center">
              <span className="mr-1">{getIcon('task')}</span>
              Task Result
            </div>
            {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
          </div>
          {taskResult ? (
            <div className="text-sm whitespace-pre-wrap overflow-auto max-h-60">
              {typeof taskResult === 'object' 
                ? formatComplexObject(taskResult)
                : taskResult
              }
            </div>
          ) : typeof taskData === 'object' ? (
            <div className="text-xs bg-white bg-opacity-50 p-1 rounded overflow-auto max-h-60">
              {formatComplexObject(taskData)}
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap">{result.data || taskData}</div>
          )}
        </div>
      );
    
    // Default fallback
    default:
      // Check if this is a generic status result
      if (result.status) {
        return (
          <div className={`node-output status-result p-2 rounded border ${getStatusColor(result.status)}`}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-medium flex items-center">
                <span className="mr-1">{getIcon(result.type)}</span>
                {result.type ? `${result.type.charAt(0).toUpperCase()}${result.type.slice(1).replace('_', ' ')}` : 'Result'}
              </div>
              {timestamp && <div className="text-xs opacity-75">{timestamp}</div>}
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                result.status === 'error' ? 'bg-red-100 text-red-800' :
                result.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {result.status}
              </span>
              {result.data && (
                <div className="text-sm overflow-ellipsis overflow-hidden max-w-full">
                  {typeof result.data === 'object' 
                    ? formatComplexObject(result.data)
                    : result.data
                  }
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Completely generic result
      return (
        <div className="node-output default-result p-2 border border-gray-200 rounded bg-white">
          <div className="text-xs font-medium text-gray-500 mb-1">Result</div>
          <div className="text-xs overflow-auto max-h-60 whitespace-pre-wrap">
            {typeof result === 'object' 
              ? formatComplexObject(result)
              : String(result)
            }
          </div>
        </div>
      );
  }
};

NodeResultDisplay.propTypes = {
  result: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool
  ])
};

export default NodeResultDisplay;