import React, { useState, useRef, useEffect } from 'react';

export default function UnifiedExecutionPanel({ 
  logs, 
  structuredLogs, 
  isMinimized, 
  onToggleMinimize, 
  onClose,
  executionMode = 'hybrid' // 'local', 'backend', or 'hybrid'
}) {
  const [activeTab, setActiveTab] = useState('logs');
  const [viewMode, setViewMode] = useState(executionMode === 'backend' ? 'text' : 'structured');
  const scrollRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, structuredLogs, isMinimized, viewMode]);

  // Parse text logs into structured format (for backend execution)
  const parseTextLogs = (logText) => {
    if (!logText) return [];
    
    const lines = logText.split('\n').filter(Boolean);
    return lines.map((line, idx) => {
      // Determine log type and emoji
      let type = 'info';
      let emoji = '💬';
      
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
      
      return { type, emoji, text: line, id: idx };
    });
  };
  
  const parsedTextLogs = parseTextLogs(logs);
  const displayLogs = viewMode === 'structured' ? structuredLogs : parsedTextLogs;

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
      </div>
      
      {/* View mode toggle for hybrid execution */}
      {executionMode === 'hybrid' && (
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
      )}
      
      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        {activeTab === 'logs' ? (
          <div className="space-y-3">
            {displayLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No execution logs yet. Run the flow to see logs here.
              </div>
            ) : viewMode === 'structured' ? (
              // Structured logs view
              structuredLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    log.status === 'error' ? 'bg-red-50 border-red-200' : 
                    log.status === 'started' ? 'bg-blue-50 border-blue-200' : 
                    'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium">
                      {log.nodeName || log.nodeId}
                      <span className="ml-2 text-xs text-gray-500">
                        {log.typeDescription || log.type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="text-sm mt-1">
                    {log.status === 'error' ? (
                      <span className="text-red-600">{log.error}</span>
                    ) : log.status === 'started' ? (
                      <span className="text-blue-600">Started execution</span>
                    ) : (
                      <span className="text-green-600">
                        {log.result?.output || 'Completed successfully'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Text logs view
              parsedTextLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`flex items-start gap-2 mb-3 p-2 rounded ${
                    log.type === 'error' 
                      ? 'bg-red-50' 
                      : log.type === 'summary' || log.type === 'complete' 
                        ? 'bg-blue-50' 
                        : log.type === 'completed' 
                          ? 'bg-green-50' 
                          : ''
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{log.emoji}</span>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.text}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          // Stats tab
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Execution Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Total Nodes</div>
                  <div className="text-xl font-semibold">
                    {viewMode === 'structured' 
                      ? structuredLogs.filter(log => log.status === 'completed' || log.status === 'error').length
                      : parsedTextLogs.length
                    }
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Success Rate</div>
                  <div className="text-xl font-semibold">
                    {viewMode === 'structured' 
                      ? (structuredLogs.length === 0 ? '0%' : 
                        `${Math.round((structuredLogs.filter(log => log.status === 'completed').length / 
                        structuredLogs.filter(log => log.status === 'completed' || log.status === 'error').length) * 100)}%`)
                      : (parsedTextLogs.length === 0 ? '0%' :
                        `${Math.round((parsedTextLogs.filter(log => log.type === 'completed' || log.type === 'complete').length / 
                        parsedTextLogs.length) * 100)}%`)
                    }
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Errors</div>
                  <div className="text-xl font-semibold text-red-600">
                    {viewMode === 'structured'
                      ? structuredLogs.filter(log => log.status === 'error').length
                      : parsedTextLogs.filter(log => log.type === 'error').length
                    }
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="text-xl font-semibold">
                    {viewMode === 'structured'
                      ? (structuredLogs.length === 0 ? '0s' : 
                        `${((new Date(structuredLogs[structuredLogs.length - 1].timestamp) - 
                          new Date(structuredLogs[0].timestamp)) / 1000).toFixed(1)}s`)
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
                  {Object.entries(
                    structuredLogs.reduce((acc, log) => {
                      if (log.type) {
                        acc[log.type] = (acc[log.type] || 0) + 1;
                      }
                      return acc;
                    }, {})
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center">
                      <div className="w-24 text-sm">{type}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(count / structuredLogs.length) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-8 text-right text-sm">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 