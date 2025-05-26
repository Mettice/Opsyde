import React from 'react';
import PropTypes from 'prop-types';

const DebugPanel = ({ 
  nodes, 
  edges, 
  isConnecting, 
  connectionInfo,
  nodeStates = new Map(),
  connectionStates = new Map(),
  isExecuting = false
}) => {
  // Calculate execution statistics
  const executionStats = {
    idle: 0,
    processing: 0,
    success: 0,
    error: 0
  };

  nodes.forEach(node => {
    const state = nodeStates.get(node.id);
    const status = state?.status || 'idle';
    if (executionStats.hasOwnProperty(status)) {
      executionStats[status]++;
    } else {
      executionStats.idle++;
    }
  });

  // Calculate connection statistics
  const connectionStats = {
    idle: 0,
    active: 0,
    success: 0,
    error: 0
  };

  edges.forEach(edge => {
    const state = connectionStates.get(edge.id);
    const status = state?.state || 'idle';
    if (connectionStats.hasOwnProperty(status)) {
      connectionStats[status]++;
    } else {
      connectionStats.idle++;
    }
  });

  return (
    <div className="absolute bottom-20 left-4 bg-white p-3 rounded-lg shadow-lg z-40 text-xs max-w-sm debug-panel border">
      <h3 className="font-bold mb-2 text-gray-800">Debug Info</h3>
      
      {/* Basic Stats */}
      <div className="debug-stats mb-3 space-y-1">
        <div className="flex justify-between">
          <span>Nodes:</span>
          <span className="font-medium">{nodes.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Edges:</span>
          <span className="font-medium">{edges.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Connecting:</span>
          <span className={`font-medium ${isConnecting ? 'text-blue-600' : 'text-gray-500'}`}>
            {isConnecting ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Executing:</span>
          <span className={`font-medium ${isExecuting ? 'text-green-600' : 'text-gray-500'}`}>
            {isExecuting ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Connection Info */}
      {isConnecting && (
        <div className="mb-3 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
          <div className="font-medium text-blue-800 mb-1">Connection Info:</div>
          <div className="text-blue-700">
            <div>Source: {connectionInfo.sourceType || 'None'}</div>
            <div>Target: {connectionInfo.targetType || 'None'}</div>
          </div>
        </div>
      )}

      {/* Execution States */}
      {(isExecuting || nodeStates.size > 0) && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="font-medium text-gray-800 mb-1">Node States:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex justify-between">
              <span>Idle:</span>
              <span className="text-gray-500">{executionStats.idle}</span>
            </div>
            <div className="flex justify-between">
              <span>Processing:</span>
              <span className="text-blue-600">{executionStats.processing}</span>
            </div>
            <div className="flex justify-between">
              <span>Success:</span>
              <span className="text-green-600">{executionStats.success}</span>
            </div>
            <div className="flex justify-between">
              <span>Error:</span>
              <span className="text-red-600">{executionStats.error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Connection States */}
      {connectionStates.size > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="font-medium text-gray-800 mb-1">Connection States:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex justify-between">
              <span>Idle:</span>
              <span className="text-gray-500">{connectionStats.idle}</span>
            </div>
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="text-blue-600">{connectionStats.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Success:</span>
              <span className="text-green-600">{connectionStats.success}</span>
            </div>
            <div className="flex justify-between">
              <span>Error:</span>
              <span className="text-red-600">{connectionStats.error}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Actions */}
      <div className="debug-actions mb-3 flex flex-wrap gap-1">
        <button 
          onClick={() => console.log('Flow Data:', {nodes, edges})}
          className="debug-button bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs"
        >
          Log Flow
        </button>
        <button 
          onClick={() => console.log('Node States:', Object.fromEntries(nodeStates))}
          className="debug-button bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded text-xs"
        >
          Log States
        </button>
        <button 
          onClick={() => console.log('Connection States:', Object.fromEntries(connectionStates))}
          className="debug-button bg-green-200 hover:bg-green-300 px-2 py-1 rounded text-xs"
        >
          Log Connections
        </button>
      </div>
      
      {/* Node Types */}
      <div className="text-gray-600">
        <strong>Node Types:</strong>
        <div className="flex flex-wrap gap-1 mt-1">
          {Array.from(new Set(nodes.map(n => n.type))).map(type => {
            const count = nodes.filter(n => n.type === type).length;
            const processingCount = nodes.filter(n => n.type === type && nodeStates.get(n.id)?.status === 'processing').length;
            return (
              <span key={type} className={`px-1 py-0.5 rounded text-xs ${
                processingCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              }`}>
                {type}: {count}
                {processingCount > 0 && <span className="text-blue-600"> ({processingCount})</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

DebugPanel.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  isConnecting: PropTypes.bool.isRequired,
  connectionInfo: PropTypes.shape({
    sourceType: PropTypes.string,
    targetType: PropTypes.string
  }).isRequired,
  nodeStates: PropTypes.instanceOf(Map),
  connectionStates: PropTypes.instanceOf(Map),
  isExecuting: PropTypes.bool
};

export default DebugPanel;