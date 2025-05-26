import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import CVResultsDisplay from '../CVResultsDisplay';

// Safe JSON stringify function to handle circular references and React elements
const safeStringify = (obj, indent = 2) => {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      // Skip React-specific properties but be more selective
      if (key.startsWith('__react') || key.startsWith('__webpack')) {
        return undefined;
      }
      
      // Skip specific problematic keys but keep more data
      if (['$$typeof', '_owner', '_store', 'ref', 'key'].includes(key)) {
        return undefined;
      }
      
      // Handle DOM elements
      if (value instanceof Element || value instanceof Node) {
        return `[DOM Element: ${value.tagName || value.nodeName}]`;
      }
      
      // Be more selective with React elements - only filter actual React components
      if (value && value.$$typeof && typeof value.$$typeof === 'symbol') {
        return '[React Component]';
      }
      
      // Handle functions
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      
      return value;
    }, indent);
  } catch (error) {
    console.warn('Error in safeStringify:', error);
    // Try a simpler approach if JSON.stringify fails
    if (typeof obj === 'string') {
      return obj;
    }
    if (typeof obj === 'object' && obj !== null) {
      try {
        return Object.prototype.toString.call(obj);
      } catch {
        return '[Object]';
      }
    }
    return String(obj);
  }
};

// Enhanced safe content renderer that prevents circular reference errors
const SafeRichContentRenderer = ({ content, maxHeight = '200px', type = 'auto' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const renderContent = useCallback(() => {
    try {
      if (!content && content !== 0 && content !== false) {
        return <span className="text-gray-500 italic">No content</span>;
      }
      
      // Handle primitive types first
      if (typeof content === 'string') {
        // If it's a short string, just display it
        if (content.length < 500) {
          return (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          );
        }
        
        // For longer strings, check if it's JSON
        try {
          const parsed = JSON.parse(content);
          return (
            <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-2 rounded">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          // Not JSON, render as text with proper line breaks
          return (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          );
        }
      }
      
      // Handle numbers, booleans, etc.
      if (typeof content === 'number' || typeof content === 'boolean') {
        return (
          <div className="text-sm font-mono">
            {String(content)}
          </div>
        );
      }
      
      // Handle arrays
      if (Array.isArray(content)) {
        if (content.length === 0) {
          return <span className="text-gray-500 italic">Empty array</span>;
        }
        
        // If it's a simple array of primitives, display nicely
        if (content.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
          return (
            <div className="text-sm">
              {content.map((item, index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-500 mr-2">{index + 1}.</span>
                  {String(item)}
                </div>
              ))}
            </div>
          );
        }
        
        // For complex arrays, use JSON
        return (
          <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-2 rounded overflow-auto">
            {safeStringify(content, 2)}
          </pre>
        );
      }
      
      // Handle objects
      if (typeof content === 'object' && content !== null) {
        // Check for common result patterns
        if (content.output && typeof content.output === 'string') {
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-700 mb-1">Output:</div>
              <div className="whitespace-pre-wrap bg-gray-50 p-2 rounded">
                {content.output}
              </div>
            </div>
          );
        }
        
        if (content.result && typeof content.result === 'string') {
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-700 mb-1">Result:</div>
              <div className="whitespace-pre-wrap bg-gray-50 p-2 rounded">
                {content.result}
              </div>
            </div>
          );
        }
        
        if (content.data) {
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-700 mb-1">Data:</div>
              <div className="whitespace-pre-wrap bg-gray-50 p-2 rounded">
                <SafeRichContentRenderer content={content.data} />
              </div>
            </div>
          );
        }
        
        // For other objects, try to display them nicely
        const safeContent = safeStringify(content, 2);
        return (
          <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-2 rounded overflow-auto">
            {safeContent}
          </pre>
        );
      }
      
      // Fallback for other types
      return (
        <div className="text-sm">
          {String(content)}
        </div>
      );
    } catch (error) {
      console.error('Error rendering content:', error);
      setHasError(true);
      return (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
          Error displaying content: {error.message}
          <details className="mt-2">
            <summary className="cursor-pointer">Raw content</summary>
            <pre className="text-xs mt-1">{String(content)}</pre>
          </details>
        </div>
      );
    }
  }, [content]);

  if (hasError) {
    return (
      <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
        <span className="font-medium">Rendering Error:</span> Unable to display content safely
        <details className="mt-2">
          <summary className="cursor-pointer">Raw content</summary>
          <pre className="text-xs mt-1">{String(content)}</pre>
        </details>
      </div>
    );
  }

  try {
    const renderedContent = renderContent();
    
    return (
      <div className="relative">
        <div 
          className={`overflow-hidden transition-all duration-200 ${
            isExpanded ? '' : 'max-h-48'
          }`}
          style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
        >
          {renderedContent}
        </div>
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute bottom-0 right-0 bg-gradient-to-t from-white to-transparent px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Show more...
          </button>
        )}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Show less
          </button>
        )}
      </div>
    );
  } catch (error) {
    console.error('Critical error in SafeRichContentRenderer:', error);
    return (
      <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
        Critical rendering error occurred
        <details className="mt-2">
          <summary className="cursor-pointer">Raw content</summary>
          <pre className="text-xs mt-1">{String(content)}</pre>
        </details>
      </div>
    );
  }
};

export default function UnifiedExecutionPanel({ 
  logs, 
  structuredLogs, 
  isMinimized, 
  onToggleMinimize, 
  onClose,
  executionMode = 'hybrid',
  pollingInterval = 10000,
  onPollingIntervalChange,
  nodes = [] // Add nodes as prop with default empty array
}) {
  const [activeTab, setActiveTab] = useState('logs');
  const [viewMode, setViewMode] = useState('structured');
  const [debugMode, setDebugMode] = useState(false);
  const scrollRef = useRef(null);

  // Handle polling interval changes
  const handlePollingIntervalChange = (e) => {
    const newInterval = Number(e.target.value);
    if (onPollingIntervalChange) {
      onPollingIntervalChange(newInterval);
    }
  };

  // Helper functions for log type detection
  const getLogType = (line) => {
    if (!line || typeof line !== 'string') return 'info';
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('error') || lowerLine.includes('failed')) return 'error';
    if (lowerLine.includes('warning') || lowerLine.includes('warn')) return 'warning';
    if (lowerLine.includes('executing') || lowerLine.includes('started')) return 'executing';
    if (lowerLine.includes('completed') || lowerLine.includes('success')) return 'completed';
    if (lowerLine.includes('agent')) return 'agent';
    if (lowerLine.includes('task')) return 'task';
    if (lowerLine.includes('tool')) return 'tool';
    return 'info';
  };

  const getLogEmoji = (line) => {
    if (!line || typeof line !== 'string') return '📄';
    const type = getLogType(line);
    
    const emojiMap = {
      'error': '❌',
      'warning': '⚠️',
      'executing': '⚙️',
      'completed': '✅',
      'agent': '🧠',
      'task': '📋',
      'tool': '🔧',
      'info': '💬'
    };
    
    return emojiMap[type] || '📄';
  };

  // Enhanced text log parser with better error handling
  const parseTextLogs = useCallback((logText) => {
    if (!logText) return [];
    
    try {
      // Handle array of logs
      if (Array.isArray(logText)) {
        return logText.map((line, idx) => {
          if (typeof line !== 'string') {
            return {
              type: 'info',
              emoji: '📄',
              text: safeStringify(line),
              id: `${idx}-obj`
            };
          }

          const isIndented = line.startsWith('   ↳') || line.startsWith('  ');
          return {
            type: isIndented ? 'detail' : getLogType(line),
            emoji: isIndented ? '' : getLogEmoji(line),
            text: line,
            id: `${idx}-line`
          };
        });
      }
      
      // Handle object logs
      if (typeof logText === 'object') {
        return [{
          type: 'info',
          emoji: '📄',
          text: safeStringify(logText),
          id: 0
        }];
      }
      
      // Handle string logs
      if (typeof logText === 'string') {
        const lines = logText.split('\n').filter(Boolean);
        return lines.map((line, idx) => ({
          type: getLogType(line),
          emoji: getLogEmoji(line),
          text: line,
          id: idx
        }));
      }
      
      // Fallback for other types
      return [{
        type: 'info',
        emoji: '📄',
        text: String(logText),
        id: 0
      }];
    } catch (error) {
      console.error('Error parsing text logs:', error);
      return [{
        type: 'error',
        emoji: '❌',
        text: `Error parsing logs: ${error.message}`,
        id: 0
      }];
    }
  }, [getLogType, getLogEmoji]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, structuredLogs, isMinimized, viewMode]);

  // Parse text logs and prepare display logs
  const parsedTextLogs = useMemo(() => parseTextLogs(logs), [logs, parseTextLogs]);
  const displayLogs = useMemo(() => {
    return viewMode === 'structured' ? structuredLogs : parsedTextLogs;
  }, [viewMode, structuredLogs, parsedTextLogs]);

  // Debug logging to understand what's happening
  useEffect(() => {
    if (debugMode) {
      console.log('UnifiedExecutionPanel Debug:', {
        logs: logs,
        logsLength: logs?.length || 0,
        logsType: typeof logs,
        structuredLogs: structuredLogs,
        structuredLogsLength: structuredLogs?.length || 0,
        structuredLogsType: typeof structuredLogs,
        viewMode,
        displayLogsLength: displayLogs?.length || 0,
        parsedTextLogsLength: parsedTextLogs?.length || 0
      });
    }
  }, [logs, structuredLogs, viewMode, displayLogs, parsedTextLogs, debugMode]);

  // Enhanced node name extraction with proper error handling
  const extractNodeName = useCallback((log) => {
    try {
      // Try multiple sources for node name
      const possibleNames = [
        log?.node_name,
        log?.nodeName,
        log?.node_label,
        log?.nodeLabel,
        log?.label,
        log?.metadata?.node_name,
        log?.metadata?.nodeName,
        log?.data?.label,
        log?.name,
        log?.title
      ];
      
      for (const name of possibleNames) {
        if (name && typeof name === 'string' && name.trim()) {
          return name.trim();
        }
      }
      
      // Try to find node by ID if nodes array is provided
      const nodeId = log?.node_id || log?.nodeId || log?.metadata?.node_id;
      if (nodeId && nodes && Array.isArray(nodes)) {
        const foundNode = nodes.find(n => n?.id === nodeId);
        if (foundNode?.data?.label) {
          return foundNode.data.label;
        }
        if (foundNode?.label) {
          return foundNode.label;
        }
      }
      
      // Fallback based on node type and ID
      const nodeType = log?.node_type || log?.nodeType || log?.type || 'Node';
      const displayNodeId = nodeId || log?.id || 'unknown';
      
      return `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${displayNodeId}`;
    } catch (error) {
      console.warn('Error extracting node name:', error);
      return 'Unknown Node';
    }
  }, [nodes]);

  // Enhanced node ID extraction
  const extractNodeId = useCallback((log) => {
    try {
      return log?.node_id || log?.nodeId || log?.metadata?.node_id || log?.id || 'unknown';
    } catch (error) {
      console.warn('Error extracting node ID:', error);
      return 'unknown';
    }
  }, []);

  // Enhanced result formatting with error handling
  const formatResult = useCallback((result) => {
    try {
      if (!result && result !== 0 && result !== false) return null;
      
      // Handle string results directly
      if (typeof result === 'string') {
        return result;
      }
      
      // Handle primitive types
      if (typeof result === 'number' || typeof result === 'boolean') {
        return String(result);
      }
      
      // Handle arrays
      if (Array.isArray(result)) {
        if (result.length === 0) return 'Empty array';
        if (result.length === 1 && typeof result[0] === 'string') {
          return result[0];
        }
        return `Array with ${result.length} items`;
      }
      
      // Handle objects - look for common patterns
      if (typeof result === 'object' && result !== null) {
        // Check for direct output/result properties
        if (result.output && typeof result.output === 'string') {
          return result.output;
        }
        
        if (result.result && typeof result.result === 'string') {
          return result.result;
        }
        
        if (result.content && typeof result.content === 'string') {
          return result.content;
        }
        
        if (result.text && typeof result.text === 'string') {
          return result.text;
        }
        
        if (result.message && typeof result.message === 'string') {
          return result.message;
        }
        
        if (result.data && typeof result.data === 'string') {
          return result.data;
        }
        
        // Check for task-specific patterns
        if (result.task_name && result.result) {
          return `Task "${result.task_name}": ${typeof result.result === 'string' ? result.result : 'Completed'}`;
        }
        
        if (result.input_type && result.value !== undefined) {
          return `${result.label || result.input_type}: ${typeof result.value === 'string' ? result.value : String(result.value)}`;
        }
        
        // Try to extract meaningful content from the object
        const keys = Object.keys(result);
        if (keys.length === 1) {
          const value = result[keys[0]];
          if (typeof value === 'string') {
            return value;
          }
        }
        
        // Look for any string values in the object
        for (const key of keys) {
          if (typeof result[key] === 'string' && result[key].length > 0) {
            return result[key];
          }
        }
        
        // Fallback to object description
        return `Object with ${keys.length} properties`;
      }
      
      return String(result);
    } catch (error) {
      console.error('Error formatting result:', error);
      return 'Error formatting result';
    }
  }, []);

  // Node statistics calculation with error handling
  const calculateNodeStats = useCallback(() => {
    try {
      const stats = {
        totalNodes: 0,
        successCount: 0,
        errorCount: 0,
        nodeTypes: {}
      };
      
      if (structuredLogs && structuredLogs.length > 0) {
        const processedNodes = new Set();
        
        structuredLogs.forEach(log => {
          try {
            const nodeId = extractNodeId(log);
            const nodeType = log?.node_type || log?.nodeType || log?.type || 'unknown';
            const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
            
            if (nodeId && nodeId !== 'unknown') {
              processedNodes.add(nodeId);
              
              // Count node types
              if (nodeType && nodeType !== 'unknown') {
                stats.nodeTypes[nodeType] = (stats.nodeTypes[nodeType] || 0) + 1;
              }
              
              // Count success/error statuses
              if (status === 'error' || log?.error) {
                stats.errorCount++;
              } else if (status === 'completed' || status === 'success') {
                stats.successCount++;
              }
            }
          } catch (logError) {
            console.warn('Error processing log for stats:', logError);
          }
        });
        
        stats.totalNodes = processedNodes.size;
      }
      
      // Fallback to text logs if no structured logs
      if (stats.totalNodes === 0 && parsedTextLogs && parsedTextLogs.length > 0) {
        let nodeExecutionCount = 0;
        let errorCount = 0;
        
        parsedTextLogs.forEach(log => {
          if (!log.text || log.text.startsWith('   ')) return;
          
          if (log.text.includes('processed') || log.text.includes('completed execution')) {
            nodeExecutionCount++;
          }
          
          if (log.text.startsWith('❌') || log.type === 'error') {
            errorCount++;
          }
        });
        
        stats.totalNodes = nodeExecutionCount;
        stats.successCount = nodeExecutionCount - errorCount;
        stats.errorCount = errorCount;
      }
      
      // Calculate success rate
      const successRate = stats.totalNodes > 0
        ? Math.round((stats.successCount / stats.totalNodes) * 100)
        : 0;
      
      return { ...stats, successRate };
    } catch (error) {
      console.error('Error calculating node stats:', error);
      return {
        totalNodes: 0,
        successCount: 0,
        errorCount: 0,
        nodeTypes: {},
        successRate: 0
      };
    }
  }, [structuredLogs, parsedTextLogs, extractNodeId]);
  
  const nodeStats = useMemo(() => calculateNodeStats(), [calculateNodeStats]);

  // Enhanced log styling
  const getLogStyle = (text) => {
    if (!text) return { bg: 'bg-gray-50', border: 'border-gray-200', emoji: '📄', textColor: 'text-gray-600' };
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('executing') || lowerText.includes('started')) {
      return {
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        emoji: '⚡',
        textColor: 'text-blue-700'
      };
    } else if (lowerText.includes('completed') || lowerText.includes('success')) {
      return {
        bg: 'bg-green-50/80',
        border: 'border-green-200',
        emoji: '✅',
        textColor: 'text-green-700'
      };
    } else if (lowerText.includes('error') || lowerText.includes('failed')) {
      return {
        bg: 'bg-red-50/80',
        border: 'border-red-200',
        emoji: '❌',
        textColor: 'text-red-700'
      };
    } else if (lowerText.includes('agent')) {
      return {
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        emoji: '🤖',
        textColor: 'text-purple-700'
      };
    }
    
    return {
      bg: 'bg-gray-50/80',
      border: 'border-gray-200',
      emoji: '📄',
      textColor: 'text-gray-600'
    };
  };

  // Enhanced card styling with error handling
  const getCardStyle = (status, type) => {
    try {
      const baseStyle = "relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1";
      
      switch (status) {
        case 'started':
          return `${baseStyle} bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-blue-100/50`;
        case 'completed':
          return `${baseStyle} bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-green-100/50`;
        case 'error':
          return `${baseStyle} bg-gradient-to-br from-red-50 to-rose-100 border-red-200 shadow-red-100/50`;
        case 'warning':
          return `${baseStyle} bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 shadow-yellow-100/50`;
        default:
          return `${baseStyle} bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200 shadow-gray-100/50`;
      }
    } catch (error) {
      console.error('Error getting card style:', error);
      return "p-4 bg-white border border-gray-200 rounded-lg";
    }
  };

  // Status icon helper
  const getStatusIcon = (status) => {
    const iconMap = {
      'started': '🚀',
      'completed': '✅',
      'error': '❌',
      'warning': '⚠️',
      'running': '⏳'
    };
    return iconMap[status] || '📦';
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
    <div className="fixed top-20 right-6 w-[480px] bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-0 z-50 flex flex-col h-[75vh] overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-4 flex justify-between items-center rounded-t-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Flow Execution</h2>
            <p className="text-blue-100 text-sm">Real-time workflow monitoring</p>
          </div>
        </div>
        
        <div className="relative z-10 flex space-x-2">
          <button 
            onClick={() => setDebugMode(!debugMode)}
            className={`w-8 h-8 ${debugMode ? 'bg-yellow-500/80 text-white' : 'bg-white/20 hover:bg-white/30 text-white'} rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30`}
            title="Toggle debug mode"
          >
            🐛
          </button>
          <button 
            onClick={onToggleMinimize}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
            title="Minimize panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
            title="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Polling Configuration */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Live Updates</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Refresh:</span>
          <select
            value={pollingInterval}
            onChange={handlePollingIntervalChange}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        {['logs', 'stats', 'export'].map((tab) => (
          <button 
            key={tab}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === tab 
                ? 'text-blue-600 bg-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="relative z-10 capitalize">{tab}</span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            )}
          </button>
        ))}
      </div>
      
      {/* View Mode Toggle */}
      {activeTab === 'logs' && (
        <div className="flex justify-center p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="inline-flex rounded-xl shadow-sm bg-white border border-gray-200 p-1" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                viewMode === 'structured' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('structured')}
            >
              <span className="flex items-center space-x-1">
                <span>📋</span>
                <span>Structured</span>
              </span>
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                viewMode === 'text' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('text')}
            >
              <span className="flex items-center space-x-1">
                <span>📝</span>
                <span>Raw Logs</span>
              </span>
            </button>
          </div>
        </div>
      )}
      
      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 bg-gradient-to-b from-gray-50/50 to-white" ref={scrollRef}>
        {activeTab === 'logs' ? (
          <div className="space-y-4">
            {/* Debug Information - Always show when DEV_MODE is enabled */}
            {debugMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-yellow-800 mb-2">🐛 Debug Information</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <div><strong>Raw logs:</strong> {logs ? (Array.isArray(logs) ? logs.length : typeof logs) : 'null'}</div>
                  <div><strong>Structured logs:</strong> {structuredLogs ? structuredLogs.length : 'null'}</div>
                  <div><strong>View mode:</strong> {viewMode}</div>
                  <div><strong>Display logs length:</strong> {displayLogs.length}</div>
                  <div><strong>Parsed text logs length:</strong> {parsedTextLogs.length}</div>
                  {logs && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-yellow-600">Show raw logs sample</summary>
                      <pre className="text-xs bg-yellow-100 p-2 rounded mt-1 overflow-auto max-h-32">
                        {safeStringify(Array.isArray(logs) ? logs.slice(0, 3) : logs)}
                      </pre>
                    </details>
                  )}
                  {structuredLogs && structuredLogs.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-yellow-600">Show structured logs sample</summary>
                      <pre className="text-xs bg-yellow-100 p-2 rounded mt-1 overflow-auto max-h-32">
                        {safeStringify(structuredLogs.slice(0, 3))}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}
            
            {displayLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl opacity-50">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No execution logs yet</h3>
                <p className="text-gray-500 text-sm">Run your workflow to see real-time execution logs here</p>
                {/* Additional debug info for empty state */}
                {debugMode && (
                  <div className="mt-4 text-xs text-gray-400">
                    <div>Raw logs: {logs ? 'present' : 'null'}</div>
                    <div>Structured logs: {structuredLogs ? 'present' : 'null'}</div>
                    <div>View mode: {viewMode}</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {viewMode === 'structured' ? (
                  // Structured logs view with enhanced error handling
                  <div className="space-y-3">
                    {displayLogs.map((log, index) => {
                      try {
                        const nodeId = extractNodeId(log);
                        const nodeName = extractNodeName(log);
                        const logType = log?.type || 'info';
                        const status = log?.status || (log?.metadata?.has_error ? 'error' : 'completed');
                        
                        return (
                          <div key={`log-${index}-${nodeId}`} className={getCardStyle(status, logType)}>
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

                              {/* Content */}
                              {log.result && (
                                <div className="mt-3 p-3 bg-white/60 rounded-lg">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Result:</h4>
                                  <div className="text-sm text-gray-600">
                                    <SafeRichContentRenderer content={log.result} />
                                  </div>
                                  {debugMode && (
                                    <details className="mt-2">
                                      <summary className="text-xs text-gray-500 cursor-pointer">Debug: Raw result data</summary>
                                      <pre className="text-xs text-gray-400 mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                        {safeStringify(log.result)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              )}

                              {/* Error Details */}
                              {log.error && (
                                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                  <h4 className="text-sm font-medium text-red-700 mb-2">Error:</h4>
                                  <div className="text-sm text-red-600">
                                    <SafeRichContentRenderer content={log.error} />
                                  </div>
                                </div>
                              )}

                              {/* Message */}
                              {log.message && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                  <h4 className="text-sm font-medium text-blue-700 mb-2">Message:</h4>
                                  <div className="text-sm text-blue-600">
                                    <SafeRichContentRenderer content={log.message} />
                                  </div>
                                </div>
                              )}

                              {/* Metadata */}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="mt-3 p-3 bg-white/40 rounded-lg">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Metadata:</h4>
                                  <div className="text-xs text-gray-600 font-mono">
                                    <SafeRichContentRenderer content={log.metadata} />
                                  </div>
                                </div>
                              )}

                              {/* Timestamp */}
                              {(log.timestamp || log.metadata?.timestamp) && (
                                <div className="mt-3 text-xs text-gray-500">
                                  🕒 {new Date(log.timestamp || log.metadata.timestamp).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error rendering log entry:', error, log);
                        return (
                          <div key={`error-log-${index}`} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-red-700 font-medium">Error rendering log entry #{index}</div>
                            <div className="text-red-600 text-sm mt-1">
                              {error.message}
                            </div>
                            <details className="mt-2">
                              <summary className="text-red-600 text-sm cursor-pointer">Raw log data</summary>
                              <pre className="text-xs text-red-500 mt-1 overflow-auto max-h-32">
                                {safeStringify(log)}
                              </pre>
                            </details>
                          </div>
                        );
                      }
                    })}
                  </div>
                ) : (
                  // Text logs view with enhanced styling
                  <div className="space-y-2">
                    {displayLogs.map((log, index) => {
                      try {
                        const isDetailLog = log.text && log.text.startsWith('  ');
                        const logStyle = getLogStyle(log.text || '');
                        
                        return (
                          <div 
                            key={`text-log-${index}`} 
                            className={`group p-3 rounded-xl border transition-all duration-200 hover:shadow-md ${
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
                                  <SafeRichContentRenderer content={log.text || log.message || safeStringify(log)} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error rendering text log:', error, log);
                        return (
                          <div key={`text-error-${index}`} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-red-700 text-sm">Error rendering text log #{index}</div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'stats' ? (
          // Stats tab
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-lg mr-2">📊</span>
                Execution Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Total Nodes</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {nodeStats.totalNodes}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Success Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {nodeStats.successRate}%
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Completed</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {nodeStats.successCount}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Errors</div>
                  <div className="text-2xl font-bold text-red-600">
                    {nodeStats.errorCount}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Duration Calculation */}
            {viewMode === 'structured' && structuredLogs && structuredLogs.length >= 2 && (
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-lg mr-2">⏱️</span>
                  Timing Information
                </h3>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Total Duration</div>
                  <div className="text-xl font-semibold text-purple-600">
                    {(() => {
                      try {
                        const startTime = new Date(structuredLogs[0].timestamp || structuredLogs[0].metadata?.timestamp);
                        const endTime = new Date(structuredLogs[structuredLogs.length - 1].timestamp || structuredLogs[structuredLogs.length - 1].metadata?.timestamp);
                        const duration = (endTime - startTime) / 1000;
                        return isNaN(duration) ? '0.0s' : `${duration.toFixed(1)}s`;
                      } catch (error) {
                        return '—';
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            {/* Node Type Breakdown */}
            {Object.keys(nodeStats.nodeTypes).length > 0 && (
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-lg mr-2">📈</span>
                  Node Type Breakdown
                </h3>
                <div className="space-y-3">
                  {Object.entries(nodeStats.nodeTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center bg-white p-3 rounded-lg border border-gray-100">
                      <div className="w-20 text-sm font-medium text-gray-700 capitalize">{type}</div>
                      <div className="flex-1 mx-3">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${nodeStats.totalNodes > 0 ? (count / nodeStats.totalNodes) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-8 text-right text-sm font-semibold text-gray-800">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'export' ? (
          // Export tab
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-lg mr-2">📤</span>
                Export Options
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    try {
                      const dataStr = safeStringify(structuredLogs);
                      const dataBlob = new Blob([dataStr], {type: 'application/json'});
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `execution-logs-${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error exporting JSON:', error);
                      alert('Error exporting logs as JSON');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-4 py-3 rounded-lg hover:from-blue-200 hover:to-blue-100 transition-all duration-200 flex items-center shadow-sm border border-blue-200"
                >
                  <span className="mr-3 text-lg">📄</span>
                  <div className="text-left">
                    <div className="font-medium">Download Logs as JSON</div>
                    <div className="text-xs opacity-80">Structured data with full metadata</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    try {
                      const textData = parsedTextLogs.map(log => `[${log.type}] ${log.text}`).join('\n');
                      const dataBlob = new Blob([textData], {type: 'text/plain'});
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `execution-logs-${new Date().toISOString().split('T')[0]}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error exporting text:', error);
                      alert('Error exporting logs as text');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 px-4 py-3 rounded-lg hover:from-gray-200 hover:to-gray-100 transition-all duration-200 flex items-center shadow-sm border border-gray-200"
                >
                  <span className="mr-3 text-lg">📝</span>
                  <div className="text-left">
                    <div className="font-medium">Download Logs as Text</div>
                    <div className="text-xs opacity-80">Human-readable format for sharing</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    try {
                      const statsData = {
                        summary: nodeStats,
                        execution_time: viewMode === 'structured' && structuredLogs && structuredLogs.length >= 2 
                          ? (() => {
                              try {
                                const startTime = new Date(structuredLogs[0].timestamp || structuredLogs[0].metadata?.timestamp);
                                const endTime = new Date(structuredLogs[structuredLogs.length - 1].timestamp || structuredLogs[structuredLogs.length - 1].metadata?.timestamp);
                                const duration = (endTime - startTime) / 1000;
                                return isNaN(duration) ? 'N/A' : `${duration.toFixed(1)}s`;
                              } catch {
                                return 'N/A';
                              }
                            })()
                          : 'N/A',
                        logs_count: displayLogs.length,
                        export_timestamp: new Date().toISOString()
                      };
                      const dataStr = safeStringify(statsData);
                      const dataBlob = new Blob([dataStr], {type: 'application/json'});
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `execution-stats-${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Error exporting stats:', error);
                      alert('Error exporting statistics');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-100 to-green-50 text-green-800 px-4 py-3 rounded-lg hover:from-green-200 hover:to-green-100 transition-all duration-200 flex items-center shadow-sm border border-green-200"
                >
                  <span className="mr-3 text-lg">📊</span>
                  <div className="text-left">
                    <div className="font-medium">Download Statistics</div>
                    <div className="text-xs opacity-80">Performance metrics and summary data</div>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                Export Tips
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• JSON format preserves all metadata and structure</li>
                <li>• Text format is human-readable and great for sharing</li>
                <li>• Statistics include execution metrics and performance data</li>
                <li>• All exports are safe and handle circular references</li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}