import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ResultDisplayCard from '../rich-content/renderers/ResultDisplayCard';

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

export default function UnifiedExecutionPanel({ 
  logs, 
  structuredLogs, 
  isMinimized, 
  onToggleMinimize, 
  onClose,
  executionMode = 'hybrid',
  pollingInterval = 10000,
  onPollingIntervalChange,
  nodes = []
}) {
  const [activeTab, setActiveTab] = useState('results');
  const [debugMode, setDebugMode] = useState(false);
  const scrollRef = useRef(null);

  // Handle polling interval changes
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
  }, [logs, structuredLogs, isMinimized]);

  // Process structured logs for results
  const processedResults = useMemo(() => {
    if (!structuredLogs || !Array.isArray(structuredLogs)) return [];
    
    return structuredLogs
      .filter(log => log && (log.result || log.data || log.output || log.error))
      .map((log, index) => ({
        id: `result-${index}`,
        ...log,
        timestamp: log.timestamp || log.metadata?.timestamp || Date.now()
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [structuredLogs]);

  // Calculate simple stats
  const stats = useMemo(() => {
    const total = processedResults.length;
    const successful = processedResults.filter(r => !r.error && r.status !== 'error').length;
    const errors = total - successful;
    
    return {
      total,
      successful,
      errors,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0
    };
  }, [processedResults]);

  // Parse text logs for raw view
  const parsedTextLogs = useMemo(() => {
    if (!logs) return [];
    
    try {
      if (Array.isArray(logs)) {
        return logs.map((line, idx) => ({
          id: idx,
          text: typeof line === 'string' ? line : safeStringify(line),
          timestamp: Date.now() + idx
        }));
      }
      
      if (typeof logs === 'string') {
        return logs.split('\n').filter(Boolean).map((line, idx) => ({
          id: idx,
          text: line,
          timestamp: Date.now() + idx
        }));
      }
      
      return [{
        id: 0,
        text: safeStringify(logs),
        timestamp: Date.now()
      }];
    } catch (error) {
      return [{
        id: 0,
        text: `Error parsing logs: ${error.message}`,
        timestamp: Date.now()
      }];
    }
  }, [logs]);

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-2xl shadow-xl cursor-pointer z-50 group hover:scale-105 transition-all duration-300"
        onClick={onToggleMinimize}
        title="Expand execution panel"
      >
        <div className="flex items-center gap-2">
        <span className="text-xl">📊</span>
          <div className="text-sm font-medium">
            <div>Execution Panel</div>
            {processedResults.length > 0 && (
              <div className="text-xs opacity-90">{processedResults.length} results</div>
            )}
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="absolute -top-1 -right-1 flex gap-1">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          {stats.errors > 0 && (
            <div className="w-3 h-3 bg-red-400 rounded-full" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-6 w-[500px] bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col h-[75vh]">
      {/* Clean Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">📊</span>
          </div>
          <div>
              <h2 className="font-bold text-lg">Execution Monitor</h2>
              <p className="text-sm opacity-90">Real-time workflow results</p>
          </div>
        </div>
        
          <div className="flex gap-2">
          <button 
            onClick={() => setDebugMode(!debugMode)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                debugMode ? 'bg-yellow-500/80' : 'bg-white/20 hover:bg-white/30'
              }`}
            title="Toggle debug mode"
          >
            🐛
          </button>
          <button 
            onClick={onToggleMinimize}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
              title="Minimize"
          >
              ➖
          </button>
          <button 
            onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
              title="Close"
          >
              ✕
          </button>
          </div>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="bg-gray-50 p-3 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">{stats.successful}</div>
            <div className="text-xs text-gray-600">Success</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">{stats.errors}</div>
            <div className="text-xs text-gray-600">Errors</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">{stats.successRate}%</div>
            <div className="text-xs text-gray-600">Rate</div>
        </div>
        </div>
      </div>

      {/* Simple Tab Navigation */}
      <div className="flex bg-white border-b border-gray-200">
        {[
          { id: 'results', label: 'Results', icon: '📋' },
          { id: 'logs', label: 'Raw Logs', icon: '📝' }
        ].map((tab) => (
          <button 
            key={tab.id}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        <div className="h-full overflow-y-auto p-4 space-y-3">
          {activeTab === 'results' ? (
            // Results Tab - Clean and organized
            <div className="space-y-3">
              {processedResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl opacity-50">📊</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No results yet</h3>
                  <p className="text-gray-500 text-sm">Run your workflow to see execution results</p>
                </div>
              ) : (
                processedResults.map((result) => (
                  <ResultDisplayCard 
                    key={result.id} 
                    content={result}
                    title={result.node_name || result.nodeId || 'Node Result'}
                    colorScheme={result.status === 'error' ? 'orange' : 'blue'}
                    defaultExpanded={false}
                    showMetrics={true}
                    metadata={{
                      nodeType: result.node_type || result.type,
                      timestamp: result.timestamp,
                      status: result.status
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            // Raw Logs Tab - Simplified
            <div className="space-y-2">
              {parsedTextLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl opacity-50">📝</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No logs yet</h3>
                  <p className="text-gray-500 text-sm">Execution logs will appear here</p>
                </div>
              ) : (
                parsedTextLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-sm text-gray-800 font-mono leading-relaxed">
                      {log.text}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
                </div>
              )}
                </div>
              </div>
              
      {/* Debug Panel */}
      {debugMode && (
        <div className="border-t border-gray-200 bg-yellow-50 p-3">
          <div className="text-xs text-yellow-800">
            <div className="font-medium mb-1">🐛 Debug Info</div>
            <div>Structured logs: {structuredLogs?.length || 0}</div>
            <div>Raw logs: {Array.isArray(logs) ? logs.length : typeof logs}</div>
            <div>Processed results: {processedResults.length}</div>
            </div>
        </div>
      )}
    </div>
  );
}