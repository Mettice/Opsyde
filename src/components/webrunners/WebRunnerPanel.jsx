import React, { useEffect, useRef, useState } from 'react';

export default function WebRunnerPanel({ logs, onClose, isMinimized, onToggleMinimize }) {
  const scrollRef = useRef(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  // Parse logs into structured format
  const parseLogs = (logText) => {
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
  
  const parsedLogs = parseLogs(logs);
  
  // Filter logs based on selected filter
  const filteredLogs = filter === 'all' 
    ? parsedLogs 
    : parsedLogs.filter(log => log.type === filter);

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer z-50"
        onClick={onToggleMinimize}
        title="Expand logs panel"
      >
        <span className="text-xl">📋</span>
        {parsedLogs.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {parsedLogs.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-[450px] h-[60vh] bg-white border-l border-t shadow-lg z-50 flex flex-col">
      <div className="p-3 border-b flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-bold">🧠 Execution Logs</h2>
        <div className="flex gap-2">
          <button 
            onClick={onToggleMinimize}
            className="text-gray-500 hover:text-gray-700"
            title="Minimize panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-3 border-b bg-gray-50">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button 
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('agent')}
            className={`px-2 py-1 text-xs rounded ${filter === 'agent' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            🧠 Agents
          </button>
          <button 
            onClick={() => setFilter('task')}
            className={`px-2 py-1 text-xs rounded ${filter === 'task' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            📋 Tasks
          </button>
          <button 
            onClick={() => setFilter('tool')}
            className={`px-2 py-1 text-xs rounded ${filter === 'tool' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            🔧 Tools
          </button>
          <button 
            onClick={() => setFilter('error')}
            className={`px-2 py-1 text-xs rounded ${filter === 'error' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            ❌ Errors
          </button>
          <button 
            onClick={() => setFilter('summary')}
            className={`px-2 py-1 text-xs rounded ${filter === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            📊 Summary
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
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
        ) : (
          <div className="text-center text-gray-500 mt-10">
            {logs ? 'No logs match the selected filter' : 'Execution logs will appear here'}
          </div>
        )}
      </div>
    </div>
  );
}