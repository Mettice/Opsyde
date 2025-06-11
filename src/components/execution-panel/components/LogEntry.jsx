// components/execution-panel/components/LogEntry.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import RichContentRenderer from '../../rich-content/RichContentRenderer';
import ResultDisplayCard from '../../rich-content/renderers/ResultDisplayCard';
import { extractNodeContent } from '../../../utils/flowExecutionEngine';

const LogEntry = ({ 
  log, 
  index, 
  viewMode, 
  getCardStyle, 
  getStatusIcon, 
  getLogStyle, 
  debugMode,
  processStandardizedResult  // 🚀 NEW: Enhanced result processor
}) => {
  const [showMetadata, setShowMetadata] = useState(false);

  // 🔧 NEW: Process the log through our enhanced standardized result handler
  const processedLog = React.useMemo(() => {
    if (processStandardizedResult && typeof processStandardizedResult === 'function') {
      return processStandardizedResult(log);
    }
    return log;
  }, [log, processStandardizedResult]);

  // 🔧 NEW: Extract enhanced content using our utility
  const extractedContent = React.useMemo(() => {
    if (processedLog.result) {
      return extractNodeContent(processedLog.result, processedLog.node_type || processedLog.nodeType || 'unknown');
    }
    return null;
  }, [processedLog.result, processedLog.node_type, processedLog.nodeType]);

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

  const colorScheme = getColorScheme(processedLog);

  if (viewMode === 'structured') {
    try {
      const nodeId = processedLog.node_id || processedLog.nodeId || 'unknown';
      const nodeName = processedLog.node_name || processedLog.nodeName || 'Unknown Node';
      const logType = processedLog.type || 'info';
      const status = processedLog.status || (processedLog.metadata?.has_error ? 'error' : 'completed');
      
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
                    {/* 🚀 NEW: Show framework and execution time if available */}
                    {processedLog.metadata?.framework && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                        {processedLog.metadata.framework}
                      </span>
                    )}
                    {processedLog.metadata?.execution_time && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">
                        {Math.round(processedLog.metadata.execution_time * 1000)}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Enhanced Status Badge */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {/* Success Indicator */}
                {processedLog.success !== undefined && (
                  <div className={`w-3 h-3 rounded-full ${processedLog.success ? 'bg-green-400' : 'bg-red-400'} shadow-sm`} 
                       title={processedLog.success ? 'Success' : 'Failed'} />
                )}
                
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

            {/* 🚀 ENHANCED: Beautiful Result Display with processed data */}
            {(processedLog.processedResult || processedLog.result) && (
              <div className="mt-4">
                <ResultDisplayCard
                  content={processedLog.processedResult || processedLog.result}
                  title="Execution Result"
                  colorScheme={colorScheme}
                  defaultExpanded={false}
                  showMetrics={true}
                  className="mb-3"
                  metadata={{
                    nodeType: processedLog.node_type || processedLog.nodeType,
                    framework: processedLog.metadata?.framework,
                    extractedContent
                  }}
                />
              </div>
            )}

            {/* 🚀 ENHANCED: Error Details with better formatting */}
            {processedLog.error && (
              <div className="mt-3">
                <ResultDisplayCard
                  content={{
                    error: processedLog.error,
                    errorType: processedLog.metadata?.error_type,
                    framework: processedLog.metadata?.framework,
                    nodeType: processedLog.metadata?.node_type || processedLog.nodeType
                  }}
                  title="Error Details"
                  colorScheme="orange"
                  defaultExpanded={true}
                  showMetrics={false}
                  className="mb-3"
                />
              </div>
            )}

            {/* Message */}
            {processedLog.message && (
              <div className="mt-3">
                <ResultDisplayCard
                  content={processedLog.message}
                  title="Message"
                  colorScheme="blue"
                  defaultExpanded={false}
                  showMetrics={false}
                  className="mb-3"
                />
              </div>
            )}

            {/* 🚀 ENHANCED: Metadata Toggle with richer information */}
            {processedLog.metadata && Object.keys(processedLog.metadata).length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <span className={`transform transition-transform duration-200 ${showMetadata ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span>Execution Metadata ({Object.keys(processedLog.metadata).length} items)</span>
                  {processedLog.metadata.execution_time && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {Math.round(processedLog.metadata.execution_time * 1000)}ms
                    </span>
                  )}
                </button>
                
                {showMetadata && (
                  <div className="mt-2">
                    <ResultDisplayCard
                      content={processedLog.metadata}
                      title="Execution Metadata"
                      colorScheme="purple"
                      defaultExpanded={false}
                      showMetrics={false}
                      className="mb-3"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 🚀 NEW: Data Flow Debug Information */}
            {debugMode && extractedContent && (
              <details className="mt-3">
                <summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-700">
                  🔧 Data Flow: Extracted content preview
                </summary>
                <div className="mt-2">
                  <ResultDisplayCard
                    content={extractedContent}
                    title="Extracted Content"
                    colorScheme="blue"
                    defaultExpanded={false}
                    showMetrics={true}
                    className="mb-3"
                  />
                </div>
              </details>
            )}

            {/* Debug Information */}
            {debugMode && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  🐛 Debug: Raw log data
                </summary>
                <div className="mt-2">
                  <ResultDisplayCard
                    content={processedLog}
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
            {(processedLog.timestamp || processedLog.metadata?.timestamp) && (
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <span>🕒</span>
                <span>{new Date(processedLog.timestamp || processedLog.metadata.timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering log entry:', error, processedLog);
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
                {JSON.stringify(processedLog, null, 2)}
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
  debugMode: PropTypes.bool,
  processStandardizedResult: PropTypes.func
};

export default LogEntry;