import React from 'react';
import PropTypes from 'prop-types';

const DebugPanel = ({ nodes, edges, isConnecting, connectionInfo }) => {
  return (
    <div className="absolute bottom-20 left-4 bg-white p-2 rounded shadow-md z-40 text-xs max-w-xs debug-panel">
      <h3 className="font-bold mb-1">Debug Info:</h3>
      <div className="debug-stats">
        <div>Nodes: {nodes.length}</div>
        <div>Edges: {edges.length}</div>
        <div>Connecting: {isConnecting ? 'Yes' : 'No'}</div>
        <div>Source Type: {connectionInfo.sourceType || 'None'}</div>
        <div>Target Type: {connectionInfo.targetType || 'None'}</div>
      </div>
      
      <div className="debug-actions mt-2">
        <button 
          onClick={() => console.log({nodes, edges})}
          className="debug-button bg-gray-200 px-2 py-1 rounded"
        >
          Log Data
        </button>
        <button 
          onClick={() => console.log(nodes.map(n => ({ id: n.id, type: n.type, data: n.data })))}
          className="debug-button bg-gray-200 px-2 py-1 rounded ml-1"
        >
          Log Nodes
        </button>
      </div>
      
      <div className="mt-2 text-gray-500">
        <strong>Node Types:</strong>
        <div className="flex flex-wrap gap-1 mt-1">
          {Array.from(new Set(nodes.map(n => n.type))).map(type => (
            <span key={type} className="px-1 py-0.5 bg-gray-100 rounded text-xxs">
              {type}: {nodes.filter(n => n.type === type).length}
            </span>
          ))}
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
  }).isRequired
};

export default DebugPanel;