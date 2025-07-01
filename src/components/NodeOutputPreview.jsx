import React, { useState } from 'react';
import PropTypes from 'prop-types';

const NodeOutputPreview = ({ nodeId, nodeType, output, isVisible = false, onToggle }) => {
  const [expanded, setExpanded] = useState(false);

  if (!output || Object.keys(output).length === 0) {
    return null;
  }

  const formatOutput = (data, depth = 0) => {
    if (depth > 3) return '...'; // Prevent infinite recursion
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return `[${data.length} items]`;
      } else {
        const keys = Object.keys(data);
        if (keys.length === 0) return '{}';
        
        if (expanded || depth === 0) {
          return (
            <div className="ml-2">
              {keys.slice(0, expanded ? keys.length : 5).map((key, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-blue-600 font-mono text-xs">{key}:</span>
                  <span className="ml-2 text-xs">
                    {formatOutput(data[key], depth + 1)}
                  </span>
                </div>
              ))}
              {!expanded && keys.length > 5 && (
                <div className="text-gray-500 text-xs">
                  ... and {keys.length - 5} more fields
                </div>
              )}
            </div>
          );
        } else {
          return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
        }
      }
    } else if (typeof data === 'string') {
      return data.length > 50 ? `${data.substring(0, 50)}...` : data;
    } else {
      return String(data);
    }
  };

  const getNodeTypeColor = (type) => {
    const colors = {
      'agent': 'bg-purple-100 text-purple-800',
      'task': 'bg-blue-100 text-blue-800',
      'tool': 'bg-green-100 text-green-800',
      'output': 'bg-orange-100 text-orange-800',
      'input': 'bg-gray-100 text-gray-800',
      'trigger': 'bg-red-100 text-red-800',
      'logic': 'bg-yellow-100 text-yellow-800',
      'chat': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`node-output-preview ${isVisible ? 'block' : 'hidden'}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNodeTypeColor(nodeType)}`}>
              {nodeType}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {nodeId}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
            {onToggle && (
              <button
                onClick={onToggle}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            )}
          </div>
        </div>
        
        <div className="p-3">
          <div className="text-xs text-gray-600 mb-2">
            Output Preview:
          </div>
          <div className="bg-gray-50 p-2 rounded text-xs font-mono">
            {formatOutput(output)}
          </div>
        </div>
      </div>
    </div>
  );
};

NodeOutputPreview.propTypes = {
  nodeId: PropTypes.string.isRequired,
  nodeType: PropTypes.string.isRequired,
  output: PropTypes.any,
  isVisible: PropTypes.bool,
  onToggle: PropTypes.func
};

export default NodeOutputPreview; 