// components/execution-panel/components/LogEntry.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import RichContentRenderer from '../../rich-content/RichContentRenderer';
import ResultDisplayCard from '../../rich-content/renderers/ResultDisplayCard';

const LogEntry = ({ 
  log, 
  index, 
  viewMode, 
  getCardStyle, 
  getStatusIcon, 
  getLogStyle, 
  debugMode 
}) => {
  const [showMetadata, setShowMetadata] = useState(false);

  // Determine color scheme based on log status/type
  const getColorScheme = (log) => {
    if (log.status === 'error' || log.error) return 'orange';
    if (log.status === 'completed' || log.status === 'success') return 'green';
    if (log.status === 'processing' || log.status === 'running') return 'blue';
    if (log.node_type === 'agent') return 'purple';
    if (log.node_type === 'task') return 'blue';
    if (log.node_type === 'tool') return 'green';
    return 'blue';
  };

  const colorScheme = getColorScheme(log);

  if (viewMode === 'structured') {
    try {
      const nodeId = log.node_id || log.nodeId || 'unknown';
      const nodeName = log.node_name || log.nodeName || 'Unknown Node';
      const logType = log.type || 'info';
      const status = log.status || (log.metadata?.has_error ? 'error' : 'completed');
      
      return (
        <div key={`log-${index}-${nodeId}`} className={`${getCardStyle(status, logType)} flex-shrink-0`}>
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
              <div className="flex-shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'started' ? 'bg-blue-100 text-blue-800' :
                  status === 'completed' ? 'bg-green-100 text-green-800' :
                  status === 'error' ? 'bg-red-100 text-red-800' :
                  status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>

            {/* Beautiful Result Display */}
            {log.result && (
              <div className="mt-4">
                <ResultDisplayCard
                  content={log.result}
                  title="Execution Result"
                  colorScheme={colorScheme}
                  defaultExpanded={false}
                  showMetrics={true}
                  className="mb-3"
                />
              </div>
            )}

            {/* Error Details */}
            {log.error && (
              <div className="mt-3">
                <ResultDisplayCard
                  content={log.error}
                  title="Error Details"
                  colorScheme="orange"
                  defaultExpanded={true}
                  showMetrics={false}
                  className="mb-3"
                />
              </div>
            )}

            {/* Message */}
            {log.message && (
              <div className="mt-3">
                <ResultDisplayCard
                  content={log.message}
                  title="Message"
                  colorScheme="blue"
                  defaultExpanded={false}
                  showMetrics={false}
                  className="mb-3"
                />
              </div>
            )}

            {/* Metadata Toggle */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <span className={`transform transition-transform duration-200 ${showMetadata ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span>Metadata ({Object.keys(log.metadata).length} items)</span>
                </button>
                
                {showMetadata && (
                  <div className="mt-2">
                    <ResultDisplayCard
                      content={log.metadata}
                      title="Metadata"
                      colorScheme="purple"
                      defaultExpanded={false}
                      showMetrics={false}
                      className="mb-3"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Debug Information */}
            {debugMode && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  🐛 Debug: Raw log data
                </summary>
                <div className="mt-2">
                  <ResultDisplayCard
                    content={log}
                    title="Raw Log Data"
                    colorScheme="orange"
                    defaultExpanded={false}
                    showMetrics={true}
                    className="mb-3"
                  />
                </div>
              </details>
            )}

            {/* Timestamp */}
            {(log.timestamp || log.metadata?.timestamp) && (
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <span>🕒</span>
                <span>{new Date(log.timestamp || log.metadata.timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering log entry:', error, log);
      return (
        <div key={`error-log-${index}`} className="p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
          <div className="text-red-700 font-medium">Error rendering log entry #{index}</div>
          <div className="text-red-600 text-sm mt-1">
            {error.message}
          </div>
          <details className="mt-2">
            <summary className="text-red-600 text-sm cursor-pointer">Raw log data</summary>
            <div className="max-h-32 overflow-auto mt-1">
              <pre className="text-xs text-red-500 whitespace-pre-wrap">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      );
    }
  } else {
    // Text logs view with enhanced styling
    try {
      const isDetailLog = log.text && log.text.startsWith('  ');
      const logStyle = getLogStyle(log.text || '');
      
      return (
        <div 
          key={`text-log-${index}`} 
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
                <span className="text-xs text-gray-500">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Now'}
                </span>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                <RichContentRenderer 
                  content={log.text || log.message || JSON.stringify(log)} 
                  maxHeight="400px" 
                  displayMode="minimal"
                />
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering text log:', error, log);
      return (
        <div key={`text-error-${index}`} className="p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
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