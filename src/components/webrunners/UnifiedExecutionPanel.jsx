import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import CVResultsDisplay from '../CVResultsDisplay';

export default function UnifiedExecutionPanel({ 
  logs, 
  structuredLogs, 
  isMinimized, 
  onToggleMinimize, 
  onClose,
  executionMode = 'hybrid', // 'local', 'backend', or 'hybrid'
  pollingInterval = 10000,
  onPollingIntervalChange
}) {
  const [activeTab, setActiveTab] = useState('logs');
  const [viewMode, setViewMode] = useState(executionMode === 'backend' ? 'text' : 'structured');
  const scrollRef = useRef(null);

  // Use the polling interval from props
  const handlePollingIntervalChange = (e) => {
    const newInterval = Number(e.target.value);
    if (onPollingIntervalChange) {
      onPollingIntervalChange(newInterval);
    }
  };

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, structuredLogs, isMinimized, viewMode]);

  // Parse text logs into structured format (for backend execution)
  const parseTextLogs = useCallback((logText) => {
    if (!logText) return [];
    
    // Check if logText is an array
    if (Array.isArray(logText)) {
      return logText.map((line, idx) => {
        // For array items, process each line
        const isIndented = typeof line === 'string' && line.startsWith('   ↳');
        
        // Determine log type and emoji
        let type = 'info';
        let emoji = isIndented ? '' : '💬';
        
        if (isIndented) {
          return { type: 'detail', emoji: '', text: line, id: `${idx}-detail` };
        } else if (line.toLowerCase().includes('executing')) {
          type = 'executing';
          emoji = '⚙️';
        } else if (line.toLowerCase().includes('completed')) {
          type = 'completed';
          emoji = '✅';
        } else if (line.toLowerCase().includes('agent')) {
          type = 'agent';
          emoji = '🧠';
        } else if (line.toLowerCase().includes('task')) {
          type = 'task';
          emoji = '📋';
        } else if (line.toLowerCase().includes('tool')) {
          type = 'tool';
          emoji = '🔧';
        } else if (line.toLowerCase().includes('error')) {
          type = 'error';
          emoji = '❌';
        } else if (line.toLowerCase().includes('summary')) {
          type = 'summary';
          emoji = '📊';
        } else if (line.toLowerCase().includes('complete')) {
          type = 'complete';
          emoji = '🏁';
        }
        
        return { type, emoji, text: line, id: `${idx}-line` };
      });
    }
    
    // Check if logText is a string, if not convert it to a string or handle it appropriately
    if (typeof logText !== 'string') {
      // If it's an object or array, try to stringify it
      if (typeof logText === 'object') {
        try {
          return [{
            type: 'info',
            emoji: '📄',
            text: JSON.stringify(logText, null, 2),
            id: 0
          }];
        } catch (e) {
          console.error('Failed to stringify log object:', e);
          return [{
            type: 'error',
            emoji: '❌',
            text: 'Error parsing log data',
            id: 0
          }];
        }
      }
      // If it's a number or boolean or other primitive, convert to string
      return [{
        type: 'info',
        emoji: '📄',
        text: String(logText),
        id: 0
      }];
    }
    
    const lines = logText.split('\n').filter(Boolean);
    return lines.map((line, idx) => {
      const isIndented = line.startsWith('   ↳');
      
      // Determine log type and emoji
      let type = isIndented ? 'detail' : 'info';
      let emoji = isIndented ? '' : '💬';
      
      if (!isIndented) {
        if (line.toLowerCase().includes('executing')) {
          type = 'executing';
          emoji = '⚙️';
        } else if (line.toLowerCase().includes('completed')) {
          type = 'completed';
          emoji = '✅';
        } else if (line.toLowerCase().includes('agent')) {
          type = 'agent';
          emoji = '🧠';
        } else if (line.toLowerCase().includes('task')) {
          type = 'task';
          emoji = '📋';
        } else if (line.toLowerCase().includes('tool')) {
          type = 'tool';
          emoji = '🔧';
        } else if (line.toLowerCase().includes('error')) {
          type = 'error';
          emoji = '❌';
        } else if (line.toLowerCase().includes('summary')) {
          type = 'summary';
          emoji = '📊';
        } else if (line.toLowerCase().includes('complete')) {
          type = 'complete';
          emoji = '🏁';
        }
      }
      
      return { type, emoji, text: line, id: idx };
    });
  }, []); // Empty dependency array since this is a pure function

  // Memoize the parsed logs to avoid reprocessing on every render
  const parsedTextLogs = useMemo(() => parseTextLogs(logs), [logs, parseTextLogs]);
  
  // Memoize display logs to avoid recalculation on every render
  const displayLogs = useMemo(() => 
    viewMode === 'structured' ? structuredLogs : parsedTextLogs,
  [viewMode, structuredLogs, parsedTextLogs]);

  // Modify the function that renders log content in the structured view for clearer display
  const formatNestedJson = (data, indent = 0) => {
    // Helper function to format nested JSON objects for display
    if (!data) return 'No data';
    
    // Handle primitive values
    if (typeof data !== 'object') return String(data);
    
    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length === 0) return '[]';
      return data.map((item, i) => (
        <div key={i} className="pl-4">
          {typeof item === 'object' ? (
            <div>
              <span className="text-gray-500">[{i}]:</span> {formatNestedJson(item, indent + 1)}
            </div>
          ) : (
            <div>
              <span className="text-gray-500">[{i}]:</span> {String(item)}
            </div>
          )}
        </div>
      ));
    }
    
    // Handle objects
    return (
      <div className={indent > 0 ? "pl-4" : ""}>
        {Object.entries(data).map(([key, value], i) => (
          <div key={key} className={i > 0 ? "mt-1" : ""}>
            <span className="text-gray-600 font-medium">{key}:</span>{' '}
            {typeof value === 'object' ? (
              formatNestedJson(value, indent + 1)
            ) : (
              <span className="text-gray-800">{String(value)}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Enhanced log content rendering
  const renderLogContent = (log) => {
    // Handle CV parser results
    if (log.result?.type === "cv_result" && log.result?.data) {
      return (
        <div className="mt-2 bg-white rounded-lg p-4">
          <div className="mb-2 text-sm text-gray-500">
            {log.agent ? `Processed by agent: ${log.agent}` : ''}
          </div>
          <CVResultsDisplay results={log.result.data} />
        </div>
      );
    }

    // Handle task results
    if (log.type === 'task_result' || log.result?.type === 'task_result') {
      return (
        <div className="mt-2">
          <div className="text-sm text-gray-600 mb-2">
            {log.agent ? `Executed by agent: ${log.agent}` : ''}
          </div>
          {log.agent_settings && (
            <div className="text-xs text-gray-500 mb-2">
              <div>Model: {log.agent_settings.llm_model}</div>
              <div>Temperature: {log.agent_settings.temperature}</div>
              <div>Max Tokens: {log.agent_settings.max_tokens}</div>
              <div>Memory: {log.agent_settings.memory_enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
          )}
          {typeof log.result === 'object' ? (
            <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded overflow-auto max-h-60">
              {formatNestedJson(log.result)}
            </div>
          ) : (
            <span className="text-gray-800">{log.result || log.output}</span>
          )}
        </div>
      );
    }

    // Handle output node results
    if (log.type?.endsWith('_result') && ['webhook_result', 'email_result', 'discord_result', 'sheets_result'].includes(log.type)) {
      const resultStatus = log.success ? "success" : "error";
      const statusBg = resultStatus === "success" ? "bg-green-100" : "bg-red-100";
      const statusText = resultStatus === "success" ? "text-green-800" : "text-red-800";
      
      return (
        <div className="mt-2">
          <div className={`px-2 py-1 ${statusBg} ${statusText} text-sm rounded inline-block mb-2`}>
            {resultStatus === "success" ? "Success" : "Failed"}
          </div>
          {log.summary && <div className="text-sm mb-1">{log.summary}</div>}
          {log.error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {log.error}
            </div>
          )}
          {log.data && (
            <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
              {formatNestedJson(log.data)}
            </div>
          )}
        </div>
      );
    }

    // Handle errors
    if (log.status === 'error' || log.type === 'error') {
      return (
        <div className="mt-2 text-red-600 bg-red-50 p-3 rounded">
          <span className="font-medium">Error: </span>
          {log.error || log.message || 'An error occurred'}
        </div>
      );
    }

    // Handle started status
    if (log.status === 'started') {
      return (
        <div className="mt-2 text-blue-600">
          Started execution
          {log.agent ? ` with agent ${log.agent}` : ''}
        </div>
      );
    }

    // Handle normal results
    if (log.result) {
      if (typeof log.result === 'object') {
        return (
          <div className="mt-2 text-sm bg-gray-50 p-3 rounded overflow-auto max-h-60">
            {formatNestedJson(log.result)}
          </div>
        );
      }
      return <span className="mt-2 text-gray-800">{log.result}</span>;
    }

    // Handle node_result logs with data property
    if (log.type === 'node_result' && log.data) {
      return (
        <div className="mt-2">
          <div className="text-sm font-medium text-gray-700 mb-1">Node Result:</div>
          <div className="text-sm bg-gray-50 p-3 rounded overflow-auto max-h-60">
            {formatNestedJson(log.data)}
          </div>
        </div>
      );
    }

    return <span className="mt-2 text-green-600">Completed successfully</span>;
  };

  // Update the polling interval UI
  const renderPollingConfig = () => (
    <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
      <span className="text-sm text-gray-600">Polling Interval:</span>
      <select
        value={pollingInterval}
        onChange={handlePollingIntervalChange}
        className="text-sm border rounded p-1"
      >
        <option value={5000}>5 seconds</option>
        <option value={10000}>10 seconds</option>
        <option value={30000}>30 seconds</option>
        <option value={60000}>1 minute</option>
      </select>
    </div>
  );

  // Create refs for the node stats cache outside the function
  const prevCacheKey = useRef('');
  const prevNodeStats = useRef(null);

  // Optimize node stats calculation by using a dependency on structuredLogs and parsedTextLogs
  // directly rather than regenerating it in every render cycle
  const calculateNodeStats = useCallback(() => {
    // Add cache key to prevent unnecessary recalculations
    const cacheKey = viewMode === 'structured' 
      ? `structured-${structuredLogs.length}`
      : `text-${parsedTextLogs.length}`;
    
    // Return cached result if available
    if (prevCacheKey.current === cacheKey && prevNodeStats.current) {
      return prevNodeStats.current;
    }
    
    const stats = {
      totalNodes: 0,
      successCount: 0,
      errorCount: 0,
      nodeTypes: {}
    };
    
    // Count from structured logs first if available
    if (structuredLogs && structuredLogs.length > 0) {
      // Get total nodes from flow_started event if available
      const flowStartLog = structuredLogs.find(log => log.type === 'flow_started');
      if (flowStartLog && flowStartLog.nodeCount) {
        stats.totalNodes = flowStartLog.nodeCount;
      }
      
      // Get node type counts
      structuredLogs.forEach(log => {
        // Count node types from node_found logs
        if (log.type === 'node_found' && log.nodeType) {
          const nodeType = log.nodeType;
          stats.nodeTypes[nodeType] = (stats.nodeTypes[nodeType] || 0) + 1;
        }
        
        // Count success/error statuses from node_result logs
        if (log.type === 'node_result') {
          if (log.status === 'error' || log.error) {
            stats.errorCount++;
          } else if (log.status === 'completed' || log.status === 'success') {
            stats.successCount++;
          }
        }
      });
      
      // If we don't have node types yet, try to derive from node_result logs
      if (Object.keys(stats.nodeTypes).length === 0) {
        structuredLogs.forEach(log => {
          if (log.type === 'node_result' && log.nodeType) {
            const nodeType = log.nodeType;
            stats.nodeTypes[nodeType] = (stats.nodeTypes[nodeType] || 0) + 1;
          }
        });
      }
      
      // If no total nodes count found, use the sum of node types
      if (stats.totalNodes === 0) {
        stats.totalNodes = Object.values(stats.nodeTypes).reduce((a, b) => a + b, 0);
      }
      
      // If we still don't have a total, count unique nodeIds
      if (stats.totalNodes === 0) {
        const uniqueNodeIds = new Set();
        structuredLogs.forEach(log => {
          if (log.nodeId) {
            uniqueNodeIds.add(log.nodeId);
          }
        });
        stats.totalNodes = uniqueNodeIds.size;
      }
    }
    
    // Fallback to text logs if needed
    if (stats.totalNodes === 0 && parsedTextLogs && parsedTextLogs.length > 0) {
      // Count node executions from text logs
      let nodeExecutionCount = 0;
      let errorCount = 0;
      
      parsedTextLogs.forEach(log => {
        // Skip indented logs (they are details)
        if (log.text.startsWith('   ')) return;
        
        // Count nodes that were processed
        if (log.text.includes('processed') || log.text.includes('completed execution')) {
          nodeExecutionCount++;
        }
        
        // Count errors
        if (log.text.startsWith('❌')) {
          errorCount++;
        }
      });
      
      stats.totalNodes = nodeExecutionCount;
      stats.successCount = nodeExecutionCount - errorCount;
      stats.errorCount = errorCount;
    }
    
    // Calculate success rate (avoid division by zero)
    const successRate = stats.totalNodes > 0
      ? Math.round((stats.successCount / stats.totalNodes) * 100)
      : 0;
    
    // Update cache before returning
    prevCacheKey.current = cacheKey;
    prevNodeStats.current = { ...stats, successRate };
    
    return { ...stats, successRate };
  }, [viewMode, structuredLogs, parsedTextLogs]);
  
  // Use calculated stats
  const nodeStats = useMemo(() => calculateNodeStats(), [calculateNodeStats]);

  const formatLogs = (logs) => {
    return logs.map(log => {
      // Check if log is an execution result
      if (log.value && (log.value.type === 'agent_result' || log.value.type === 'task_result')) {
        // Return a simplified version
        return {
          nodeId: log.metadata?.node_id || 'unknown',
          nodeType: log.metadata?.node_type || 'unknown',
          status: log.value.data?.status || 'unknown',
          timestamp: log.metadata?.timestamp,
          result: log.value.data?.result || log.value.data?.error || 'No result',
          // Skip all the nested metadata, inputs, and detailed structures
        };
      }
      return log;
    });
  };

  // Use the formatted logs in your rendering
  const formattedLogs = formatLogs(structuredLogs);

  const renderResults = () => {
    // Find output node results specifically
    const outputResults = structuredLogs.filter(
      log => log.metadata?.node_type === 'output'
    );
    
    if (outputResults.length > 0) {
      return (
        <div className="output-results-section">
          <h3>Output Results</h3>
          {outputResults.map((result, index) => (
            <div key={index} className="output-result">
              {/* Format the output result clearly */}
              <pre>{JSON.stringify(result.value, null, 2)}</pre>
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer z-50"
        onClick={onToggleMinimize}
        title="Expand execution panel"
      >
        <span className="text-xl">📊</span>
        {displayLogs.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {displayLogs.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-6 w-[450px] bg-white border shadow-lg rounded-lg p-0 z-50 flex flex-col h-[70vh]">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 flex justify-between items-center rounded-t-lg">
        <h2 className="text-lg font-bold text-white">📊 Flow Execution</h2>
        <div className="flex space-x-2">
          <button 
            onClick={onToggleMinimize}
            className="text-white hover:text-gray-200"
            title="Minimize panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
            title="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Add polling configuration */}
      {renderPollingConfig()}

      <div className="flex border-b">
        <button 
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'logs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('logs')}
        >
          Execution Logs
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'export' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>
      
      {/* View mode toggle for all execution modes */}
      <div className="flex justify-center p-2 bg-gray-50 border-b">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-1 text-xs font-medium rounded-l-lg ${
              viewMode === 'structured' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setViewMode('structured')}
          >
            Structured View
          </button>
          <button
            type="button"
            className={`px-4 py-1 text-xs font-medium rounded-r-lg ${
              viewMode === 'text' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setViewMode('text')}
          >
            Raw Logs
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        {activeTab === 'logs' ? (
          <div className="space-y-3">
            {displayLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No execution logs yet. Run the flow to see logs here.
              </div>
            ) : viewMode === 'structured' ? (
              // Structured logs view
              formattedLogs.map((log, index) => {
                // Determine background color based on log type
                let bgColor = 'bg-gray-50';
                let textColor = 'text-gray-800';
                
                if (log.status === 'error' || log.type === 'error' || log.error) {
                  bgColor = 'bg-red-50';
                  textColor = 'text-red-800';
                } else if (log.type === 'flow_completed' || log.status === 'completed') {
                  bgColor = 'bg-green-50';
                  textColor = 'text-green-800';
                } else if (log.type === 'flow_started') {
                  bgColor = 'bg-blue-50';
                  textColor = 'text-blue-800';
                } else if (log.status === 'started' || log.type === 'node_found') {
                  bgColor = 'bg-blue-50'; 
                  textColor = 'text-blue-800';
                }
                
                // Get appropriate icon for node type
                const nodeIcon = {
                  'agent': '🧠',
                  'task': '📋',
                  'tool': '🔧',
                  'input': '📥',
                  'output': '📤',
                  'logic': '🔀',
                  'trigger': '⚡',
                  'delay': '⏱️',
                  'chatbot': '💬',
                  'flow_started': '🚀',
                  'flow_completed': '✅',
                  'error': '❌',
                  'log_message': '📝'
                };
                
                const icon = nodeIcon[log.nodeType || log.type] || '📦';
                const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
                
                return (
                  <div 
                    key={index}
                    className={`p-3 mb-2 rounded-md ${bgColor} ${textColor} shadow-sm relative`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <span className="text-lg mr-2">{icon}</span>
                        <div>
                          {/* Node name or message */}
                          <div className="font-medium">
                            {log.nodeName || log.message || (log.nodeId ? `Node ${log.nodeId}` : 'Log Entry')}
                          </div>
                          
                          {/* Node type and ID information */}
                          {(log.nodeType || log.nodeId) && (
                            <div className="text-xs opacity-70 mt-1">
                              {log.nodeType && <span className="mr-2">Type: {log.nodeType}</span>}
                              {log.nodeId && <span>ID: {log.nodeId}</span>}
                            </div>
                          )}
                          
                          {/* Connections info */}
                          {log.connections && log.connections.length > 0 && (
                            <div className="text-xs opacity-70 mt-1">
                              Connections: {log.connections.length} outgoing
                            </div>
                          )}
                          
                          {/* Result or output information */}
                          {(log.result || log.output || log.details) && (
                            <div className="mt-2 text-sm">
                              <div className="font-medium mb-1">Result:</div>
                              <pre className="bg-white bg-opacity-50 p-2 rounded text-xs overflow-auto max-h-32">
                                {typeof log.result === 'object' 
                                  ? JSON.stringify(log.result, null, 2)
                                  : log.output || log.details || String(log.result || '')}
                              </pre>
                            </div>
                          )}
                          
                          {/* Error details */}
                          {log.error && (
                            <div className="mt-2 text-sm">
                              <div className="font-medium mb-1 text-red-600">Error:</div>
                              <pre className="bg-red-100 bg-opacity-50 p-2 rounded text-xs overflow-auto max-h-32">
                                {typeof log.error === 'object' 
                                  ? JSON.stringify(log.error, null, 2)
                                  : String(log.error)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      <div className="flex items-center">
                        {log.status && (
                          <span className={`text-xs px-2 py-1 rounded-full mr-2 ${
                            log.status === 'error' ? 'bg-red-200 text-red-800' :
                            log.status === 'completed' ? 'bg-green-200 text-green-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {log.status}
                          </span>
                        )}
                        <span className="text-xs opacity-60">{timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              // Text logs view
              parsedTextLogs.map((log, index) => {
                // Determine if the log content contains JSON data
                let jsonContent = null;
                let plainText = log.text;
                
                // Try to extract JSON from text (often enclosed in { } or starts with "{")
                if (log.text.includes('{') && log.text.includes('}')) {
                  try {
                    // Find JSON portion of the text (usually after a colon or at the beginning)
                    const jsonStart = log.text.indexOf('{');
                    const jsonEnd = log.text.lastIndexOf('}') + 1;
                    
                    if (jsonStart >= 0 && jsonEnd > jsonStart) {
                      const jsonString = log.text.substring(jsonStart, jsonEnd);
                      const parsedJson = JSON.parse(jsonString);
                      jsonContent = parsedJson;
                      
                      // Split the text into parts before and after JSON
                      if (jsonStart > 0) {
                        plainText = log.text.substring(0, jsonStart);
                      } else {
                        plainText = null; // Pure JSON log
                      }
                    }
                  } catch (e) {
                    // Not valid JSON or couldn't extract properly, keep original text
                  }
                }
                
                // Determine if this is an indented log (detail)
                const isDetail = log.text.startsWith('   ');
                const indentClass = isDetail ? 'pl-8' : '';
                
                // Determine log icon and styling
                let logIcon = '';
                let textClass = 'text-gray-800';
                
                if (log.text.startsWith('✅')) {
                  logIcon = '✅';
                  textClass = 'text-green-700 font-medium';
                } else if (log.text.startsWith('❌')) {
                  logIcon = '❌';
                  textClass = 'text-red-700 font-medium';
                } else if (log.text.startsWith('📊')) {
                  logIcon = '📊';
                  textClass = 'text-blue-700 font-medium';
                } else if (log.text.includes('Node:')) {
                  logIcon = '🔍';
                  textClass = 'text-blue-700';
                } else if (log.text.startsWith('🧠') || log.text.startsWith('📋') || 
                           log.text.startsWith('🔧') || log.text.startsWith('📥') ||
                           log.text.startsWith('📤') || log.text.startsWith('🔀') ||
                           log.text.startsWith('⚡') || log.text.startsWith('⏱️') ||
                           log.text.startsWith('💬')) {
                  logIcon = log.text.charAt(0);
                  textClass = 'text-blue-700 font-medium';
                }
                
                return (
                  <div key={index} className={`mb-1 ${indentClass}`}>
                    {plainText && (
                      <div className={`${textClass}`}>
                        {logIcon ? (
                          <span>
                            <span className="mr-2">{logIcon}</span>
                            {plainText.substring(logIcon.length).trim()}
                          </span>
                        ) : (
                          plainText
                        )}
                      </div>
                    )}
                    
                    {jsonContent && (
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto mt-1 mb-2 max-h-48">
                        {JSON.stringify(jsonContent, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'stats' ? (
          // Stats tab
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Execution Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Total Nodes</div>
                  <div className="text-xl font-semibold">
                    {nodeStats.totalNodes}
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Success Rate</div>
                  <div className="text-xl font-semibold">
                    {`${nodeStats.successRate}%`}
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Errors</div>
                  <div className="text-xl font-semibold text-red-600">
                    {nodeStats.errorCount}
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="text-xl font-semibold">
                    {viewMode === 'structured'
                      ? (() => {
                          if (structuredLogs.length < 2) return '0.0s';
                          const startTime = new Date(structuredLogs[0].timestamp);
                          const endTime = new Date(structuredLogs[structuredLogs.length - 1].timestamp);
                          const duration = (endTime - startTime) / 1000;
                          return isNaN(duration) ? '0.0s' : `${duration.toFixed(1)}s`;
                        })()
                      : '—'
                    }
                  </div>
                </div>
              </div>
            </div>
            
            {viewMode === 'structured' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Node Type Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(nodeStats.nodeTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center">
                      <div className="w-24 text-sm">{type}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(count / nodeStats.totalNodes) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-8 text-right text-sm">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'export' ? (
          // Export tab
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">📤 Export Options</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(structuredLogs, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `execution-logs-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                  }}
                  className="w-full bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition flex items-center"
                >
                  <span className="mr-2">📄</span> Download Logs as JSON
                </button>
                
                <button
                  onClick={() => {
                    const textData = parsedTextLogs.map(log => log.text).join('\n');
                    const dataBlob = new Blob([textData], {type: 'text/plain'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `execution-logs-${new Date().toISOString().split('T')[0]}.txt`;
                    link.click();
                  }}
                  className="w-full bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition flex items-center"
                >
                  <span className="mr-2">📝</span> Download Logs as Text
                </button>
                
                <button
                  onClick={() => {
                    const statsData = {
                      summary: nodeStats,
                      execution_time: viewMode === 'structured' && structuredLogs.length >= 2 
                        ? `${((new Date(structuredLogs[structuredLogs.length - 1].timestamp) - new Date(structuredLogs[0].timestamp)) / 1000).toFixed(1)}s`
                        : 'N/A',
                      logs_count: displayLogs.length,
                      export_timestamp: new Date().toISOString()
                    };
                    const dataStr = JSON.stringify(statsData, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `execution-stats-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                  }}
                  className="w-full bg-green-100 text-green-800 px-4 py-2 rounded hover:bg-green-200 transition flex items-center"
                >
                  <span className="mr-2">📊</span> Download Statistics
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">💡 Export Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• JSON format preserves all metadata and structure</li>
                <li>• Text format is human-readable and great for sharing</li>
                <li>• Statistics include execution metrics and performance data</li>
              </ul>
            </div>
          </div>
        ) : null
        }
      </div>
    </div>
  );
} 