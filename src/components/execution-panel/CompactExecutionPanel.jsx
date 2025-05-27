import React, { useState } from 'react';
import { 
  XMarkIcon, 
  MinusIcon, 
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const CompactExecutionPanel = ({ 
  isVisible = false,
  isMinimized = false,
  onClose,
  onToggleMinimize,
  executionData = {},
  logs = [],
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('progress');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  if (!isVisible) return null;

  const toggleNodeExpansion = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      case 'running':
        return <PlayIcon className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${className}`}>
        <div className="flex items-center gap-3 p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">Execution Running</span>
          </div>
          <button
            onClick={onToggleMinimize}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed right-4 top-20 bottom-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-900">Execution Monitor</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Minimize"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'progress'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Progress
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Logs
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'progress' && (
          <div className="space-y-3">
            {Object.entries(executionData).map(([nodeId, nodeData]) => (
              <div key={nodeId} className={`rounded-lg border p-3 ${getStatusColor(nodeData.status)}`}>
                <button
                  onClick={() => toggleNodeExpansion(nodeId)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(nodeData.status)}
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {nodeData.label || nodeId}
                      </div>
                      <div className="text-xs text-gray-600">
                        {nodeData.type || 'Unknown'}
                      </div>
                    </div>
                  </div>
                  {expandedNodes.has(nodeId) ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {expandedNodes.has(nodeId) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {nodeData.result && (
                      <div className="text-xs">
                        <div className="font-medium text-gray-700 mb-1">Result:</div>
                        <div className="bg-white rounded p-2 text-gray-600 max-h-32 overflow-y-auto">
                          {typeof nodeData.result === 'string' 
                            ? nodeData.result 
                            : JSON.stringify(nodeData.result, null, 2)
                          }
                        </div>
                      </div>
                    )}
                    {nodeData.error && (
                      <div className="text-xs mt-2">
                        <div className="font-medium text-red-700 mb-1">Error:</div>
                        <div className="bg-red-50 rounded p-2 text-red-600 text-xs">
                          {nodeData.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(executionData).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No execution data yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 rounded border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-700">
                    {log.nodeId || 'System'}
                  </span>
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-600">
                  {log.message || log.status || 'No message'}
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No logs yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {Object.keys(executionData).length} nodes processed
          </span>
          <span>
            {logs.length} log entries
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompactExecutionPanel; 