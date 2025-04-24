import React, { useState } from 'react';
import ExecutionLog from '../ExecutionLog';

export default function FlowExecutionPanel({ logs, isMinimized, onToggleMinimize, onClose }) {
  const [activeTab, setActiveTab] = useState('logs');
  
  const renderLogContent = (log) => {
    // Check if this is a CV parser result
    if (log.result?.type === "cv_result" && log.result?.data) {
      return (
        <div className="mt-2 bg-white rounded-lg shadow">
          <CVResultsDisplay results={log.result.data} />
        </div>
      );
    }

    // Handle other types of results
    if (log.status === 'error') {
      return <span className="text-red-600">{log.error}</span>;
    }
    
    if (log.status === 'started') {
      return <span className="text-blue-600">Started execution</span>;
    }

    // For completed status with output
    if (log.result?.output) {
      return <span className="text-green-600">{log.result.output}</span>;
    }

    // Default case
    return <span className="text-green-600">Completed successfully</span>;
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer z-50"
        onClick={onToggleMinimize}
        title="Expand execution panel"
      >
        <span className="text-xl">📊</span>
      </div>
    );
  }
  
  return (
    <div className="fixed top-20 right-6 w-[600px] bg-white border shadow-lg rounded-lg p-0 z-50 flex flex-col h-[70vh]">
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
      
      <div className="flex-1 overflow-auto">
        {activeTab === 'logs' ? (
          <ExecutionLog logs={logs} />
        ) : (
          <div className="p-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Execution Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Total Nodes</div>
                  <div className="text-xl font-semibold">{logs.filter(log => log.status === 'completed' || log.status === 'error').length}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Success Rate</div>
                  <div className="text-xl font-semibold">
                    {logs.length === 0 ? '0%' : 
                      `${Math.round((logs.filter(log => log.status === 'completed').length / 
                      logs.filter(log => log.status === 'completed' || log.status === 'error').length) * 100)}%`}
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Errors</div>
                  <div className="text-xl font-semibold text-red-600">{logs.filter(log => log.status === 'error').length}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="text-xl font-semibold">
                    {logs.length === 0 ? '0s' : 
                      `${((new Date(logs[logs.length - 1].timestamp) - new Date(logs[0].timestamp)) / 1000).toFixed(1)}s`}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Node Type Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(
                  logs.reduce((acc, log) => {
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
                        style={{ width: `${(count / logs.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="w-8 text-right text-sm">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 