import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Get debug mode from URL or default to off
const isDebugMode = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true' || process.env.NODE_ENV === 'development';
  }
  return false;
};

// Clean, minimal result display component
const NodeResultDisplay = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Get result type and status
  const resultType = result.type || 'result';
  const status = result.status || (result.success === false ? 'error' : 'success');
  
  // Get appropriate icon and color scheme
  const getTypeConfig = (type, status) => {
    const configs = {
      'agent': { icon: '🧠', color: 'purple', label: 'Agent' },
      'task': { icon: '📋', color: 'blue', label: 'Task' },
      'task_result': { icon: '✅', color: 'green', label: 'Task Result' },
      'tool': { icon: '🔧', color: 'orange', label: 'Tool' },
      'input': { icon: '📥', color: 'gray', label: 'Input' },
      'output': { icon: '📤', color: 'indigo', label: 'Output' },
      'webhook_result': { icon: '🔗', color: 'blue', label: 'Webhook' },
      'email_result': { icon: '📧', color: 'green', label: 'Email' },
      'discord_result': { icon: '💬', color: 'purple', label: 'Discord' },
      'sheets_result': { icon: '📊', color: 'green', label: 'Sheets' },
      'cv_result': { icon: '👁️', color: 'blue', label: 'CV Analysis' },
      'error': { icon: '❌', color: 'red', label: 'Error' },
      'text': { icon: '📝', color: 'gray', label: 'Text' },
      'json': { icon: '{ }', color: 'blue', label: 'JSON' },
      'image': { icon: '🖼️', color: 'purple', label: 'Image' }
    };
    
    const config = configs[type] || { icon: '📦', color: 'gray', label: 'Result' };
    
    // Override color for error status
    if (status === 'error') {
      config.color = 'red';
    } else if (status === 'success' || status === 'completed') {
      config.color = 'green';
    }
    
    return config;
  };

  const typeConfig = getTypeConfig(resultType, status);

  // Get color classes
  const getColorClasses = (color, variant = 'primary') => {
    const colors = {
      red: {
        primary: 'bg-red-50 border-red-200 text-red-800',
        accent: 'bg-red-500',
        text: 'text-red-700'
      },
      green: {
        primary: 'bg-green-50 border-green-200 text-green-800',
        accent: 'bg-green-500',
        text: 'text-green-700'
      },
      blue: {
        primary: 'bg-blue-50 border-blue-200 text-blue-800',
        accent: 'bg-blue-500',
        text: 'text-blue-700'
      },
      purple: {
        primary: 'bg-purple-50 border-purple-200 text-purple-800',
        accent: 'bg-purple-500',
        text: 'text-purple-700'
      },
      orange: {
        primary: 'bg-orange-50 border-orange-200 text-orange-800',
        accent: 'bg-orange-500',
        text: 'text-orange-700'
      },
      indigo: {
        primary: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        accent: 'bg-indigo-500',
        text: 'text-indigo-700'
      },
      gray: {
        primary: 'bg-gray-50 border-gray-200 text-gray-800',
        accent: 'bg-gray-500',
        text: 'text-gray-700'
      }
    };
    
    return colors[color]?.[variant] || colors.gray[variant];
  };

  // Extract and format result content
  const getResultContent = () => {
    // Handle different result structures
    if (result.data?.result) return result.data.result;
    if (result.data) return result.data;
    if (result.result) return result.result;
    if (result.output) return result.output;
    if (result.message) return result.message;
    if (result.value) return result.value;
    
    return result;
  };

  const content = getResultContent();

  // Format content for display
  const formatContent = (content) => {
    if (!content) return 'No content';
    
    if (typeof content === 'string') {
      return content.length > 200 && !isExpanded 
        ? content.substring(0, 200) + '...' 
        : content;
    }
    
    if (typeof content === 'object') {
      const jsonStr = JSON.stringify(content, null, 2);
      return jsonStr.length > 200 && !isExpanded 
        ? jsonStr.substring(0, 200) + '...' 
        : jsonStr;
    }
    
    return String(content);
  };

  const formattedContent = formatContent(content);
  const hasMoreContent = (typeof content === 'string' && content.length > 200) || 
                        (typeof content === 'object' && JSON.stringify(content).length > 200);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };

  const timestamp = result.timestamp ? formatTimestamp(result.timestamp) : '';

  return (
    <div className={`
      node-result-display relative overflow-hidden
      rounded-xl border-2 transition-all duration-300
      hover:shadow-lg hover:-translate-y-0.5
      ${getColorClasses(typeConfig.color, 'primary')}
    `}>
      {/* Status indicator */}
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getColorClasses(typeConfig.color, 'accent')}`} />
      
      {/* Header */}
      <div className="p-3 border-b border-current border-opacity-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeConfig.icon}</span>
            <div>
              <div className="font-semibold text-sm">{typeConfig.label}</div>
              {timestamp && (
                <div className="text-xs opacity-75">{timestamp}</div>
              )}
            </div>
          </div>
          
          {hasMoreContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`
                px-2 py-1 rounded-md text-xs font-medium
                bg-white bg-opacity-60 hover:bg-opacity-80
                transition-all duration-200
                ${getColorClasses(typeConfig.color, 'text')}
              `}
            >
              {isExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        {resultType === 'image' ? (
          <img 
            src={content} 
            alt="Result" 
            className="max-w-full max-h-48 object-contain rounded-lg"
          />
        ) : (
          <div className={`
            text-sm leading-relaxed
            ${typeof content === 'object' ? 'font-mono' : ''}
            ${getColorClasses(typeConfig.color, 'text')}
          `}>
            <pre className="whitespace-pre-wrap break-words">
              {formattedContent}
            </pre>
          </div>
        )}
        
        {/* Error details */}
        {result.error && showDebugInfo && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-lg">
            <div className="text-xs font-medium text-red-800 mb-1">Error Details:</div>
            <div className="text-xs text-red-700 font-mono">
              {typeof result.error === 'object' 
                ? JSON.stringify(result.error, null, 2)
                : result.error
              }
            </div>
          </div>
        )}
        
        {/* Debug info */}
        {showDebugInfo && (
          <details className="mt-3">
            <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
              Debug Info
            </summary>
            <div className="mt-2 p-2 bg-black bg-opacity-5 rounded text-xs font-mono">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
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