// components/execution-panel/components/LogEntry.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import RichContentRenderer from '../../rich-content/RichContentRenderer';
import { safeStringify } from '../../rich-content/utils/safeStringify';

const LogEntry = ({ 
  log, 
  index, 
  viewMode, 
  getCardStyle, 
  getStatusIcon, 
  getLogStyle, 
  debugMode 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (viewMode === 'structured') {
    // Structured log rendering
    try {
      const nodeId = log.nodeId || log.id || 'unknown';
      const nodeName = log.nodeName || nodeId;
      const logType = log.type || 'info';
      const status = log.status || 'completed';
      
      return (
        <div className={`${getCardStyle(status, logType)} flex-shrink-0`}>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {/* Node Icon */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                    <span className="text-lg">
                      {getStatusIcon(status)}
                    </span>
                  </div>
                </div>
                
                {/* Node Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {nodeName}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-white/60 rounded-md font-mono text-xs">
                      {nodeId}
                    </span>
                    <span className="px-2 py-1 bg-white/60 rounded-md text-xs capitalize">
                      {logType}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'started' ? 'bg-blue-100 text-blue-800' :
                  status === 'completed' ? 'bg-green-100 text-green-800' :
                  status === 'error' ? 'bg-red-100 text-red-800' :
                  status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                
                {/* Expand button */}
                {(log.result || log.error || log.message || log.metadata) && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isExpanded ? '📄' : '📋'}
                  </button>
                )}
              </div>
            </div>

            {/* Content - Always show main content */}
            <>
              {/* Result Content */}
              {log.result && (
                <div className="mt-3 p-3 bg-white/60 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Result:</h4>
                  <div className="text-sm text-gray-600">
                    <RichContentRenderer 
                      content={log.result} 
                      maxHeight="250px" 
                      displayMode="immersive"
                      showAIInsights={false}
                    />
                  </div>
                </div>
              )}

              {/* Error Details */}
              {log.error && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="text-sm font-medium text-red-700 mb-2">Error:</h4>
                  <div className="text-sm text-red-600">
                    <RichContentRenderer 
                      content={log.error} 
                      maxHeight="150px" 
                      displayMode="immersive"
                      showAIInsights={false}
                    />
                  </div>
                </div>
              )}

              {/* Message */}
              {log.message && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Message:</h4>
                  <div className="text-sm text-blue-600">
                    <RichContentRenderer 
                      content={log.message} 
                      maxHeight="150px" 
                      displayMode="immersive"
                      showAIInsights={false}
                    />
                  </div>
                </div>
              )}

              {/* Metadata - Only show when expanded */}
              {log.metadata && Object.keys(log.metadata).length > 0 && isExpanded && (
                <div className="mt-3 p-3 bg-white/40 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Metadata:</h4>
                  <div className="text-xs text-gray-600 font-mono">
                    <RichContentRenderer 
                      content={log.metadata} 
                      maxHeight="120px" 
                      displayMode="minimal"
                      showAIInsights={false}
                    />
                  </div>
                </div>
              )}
            </>

            {/* Timestamp */}
            {log.timestamp && (
              <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                <span>🕒 {new Date(log.timestamp).toLocaleString()}</span>
                {debugMode && (
                  <span className="font-mono">ID: {log.id}</span>
                )}
              </div>
            )}

            {/* Debug Data */}
            {debugMode && isExpanded && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer">Debug: Raw log data</summary>
                <div className="max-h-32 overflow-auto bg-gray-100 p-2 rounded mt-1">
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                    {safeStringify(log)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering structured log entry:', error, log);
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
          <div className="text-red-700 font-medium">Error rendering log entry #{index}</div>
          <div className="text-red-600 text-sm mt-1">
            {error.message}
          </div>
          {debugMode && (
            <details className="mt-2">
              <summary className="text-red-600 text-sm cursor-pointer">Raw log data</summary>
              <div className="max-h-32 overflow-auto mt-1">
                <pre className="text-xs text-red-500 whitespace-pre-wrap">
                  {safeStringify(log)}
                </pre>
              </div>
            </details>
          )}
        </div>
      );
    }
  } else {
    // Text log rendering
    try {
      const isDetailLog = log.text && log.text.startsWith('  ');
      const logStyle = getLogStyle(log.text || '');
      
      return (
        <div 
          className={`group p-3 rounded-xl border transition-all duration-200 hover:shadow-md flex-shrink-0 ${
            isDetailLog 
              ? 'ml-6 bg-gray-50/50 border-gray-200/50' 
              : `${logStyle.bg} ${logStyle.border}`
          }`}
        >
          <div className="flex items-start space-x-3">
            {!isDetailLog && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center">
                <span className="text-sm">{logStyle.emoji}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${logStyle.textColor}`}>
                  {log.type || 'info'}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Now'}
                  </span>
                  {(log.text && log.text.length > 200) && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                <RichContentRenderer 
                  content={isExpanded ? (log.text || log.message || safeStringify(log)) : 
                    (log.text?.length > 200 ? log.text.substring(0, 200) + '...' : (log.text || log.message || safeStringify(log)))}
                  maxHeight="150px" 
                  displayMode="immersive"
                  showAIInsights={false}
                />
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering text log:', error, log);
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
          <div className="text-red-700 text-sm">Error rendering text log #{index}</div>
        </div>
      );
    }
  }
};

LogEntry.propTypes = {
  log: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  viewMode: PropTypes.string.isRequired,
  getCardStyle: PropTypes.func.isRequired,
  getStatusIcon: PropTypes.func.isRequired,
  getLogStyle: PropTypes.func.isRequired,
  debugMode: PropTypes.bool
};

export default LogEntry;