import React from 'react';
import PropTypes from 'prop-types';

const NodeErrorDisplay = ({ nodeId, errors, onClose }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="node-error-display bg-red-50 border border-red-200 rounded p-3 mb-3">
      <div className="flex justify-between items-start">
        <h4 className="text-red-700 font-medium mb-2">Node Errors</h4>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        )}
      </div>
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div key={index} className="error-item">
            <div className="text-sm text-red-600">
              <span className="font-medium">{error.type}:</span> {error.message}
            </div>
            {error.details && (
              <pre className="text-xs text-red-500 mt-1 bg-red-100 p-2 rounded">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            )}
            <div className="text-xs text-red-400 mt-1">
              {new Date(error.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

NodeErrorDisplay.propTypes = {
  nodeId: PropTypes.string.isRequired,
  errors: PropTypes.arrayOf(PropTypes.shape({
    timestamp: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    details: PropTypes.object
  })),
  onClose: PropTypes.func
};

export default NodeErrorDisplay; 