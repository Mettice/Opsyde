import React, { useCallback, memo, useRef, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Safe accessor helper function
const safeAccess = (obj, path, defaultValue = null) => {
  if (!obj) return defaultValue;
  
  const parts = path.split('.');
  let result = obj;
  
  for (const part of parts) {
    if (result === null || result === undefined) return defaultValue;
    result = result[part];
  }
  
  return result !== undefined ? result : defaultValue;
};

const OutputNode = memo(({ data, isConnectable, selected }) => {
  // State for hiding API endpoint/details
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  
  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'output'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'output'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(prev => !prev);
  }, []);

  const outputType = data.outputType || 'webhook';
  
  // NEW: Get appropriate icon and label for output type
  const getOutputTypeDisplay = (type) => {
    switch (type) {
      case 'smart_email':
        return { icon: '🤖📧', label: 'Smart Email', description: 'AI-powered email formatting' };
      case 'smart_api':
        return { icon: '🤖🔗', label: 'AI Integration', description: 'AI-powered API integration' };
      case 'webhook':
        return { icon: '🔗', label: 'Webhook', description: 'HTTP webhook' };
      case 'email':
        return { icon: '📧', label: 'Email', description: 'Direct email' };
      case 'discord':
        return { icon: '💬', label: 'Discord', description: 'Discord webhook' };
      case 'sheets':
        return { icon: '📊', label: 'Google Sheets', description: 'Spreadsheet integration' };
      default:
        return { icon: '📤', label: 'Output', description: type };
    }
  };

  const typeDisplay = getOutputTypeDisplay(outputType);
  
  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-4 min-w-[240px] shadow-md`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          top: -5,
          width: 16,
          height: 16,
          background: '#3B82F6',
          border: '3px solid white',
          borderRadius: '50%'
        }}
        isConnectable={isConnectable}
      />
      
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <span className="text-xl mr-2">{typeDisplay.icon}</span>
          <div>
            <h3 className="font-medium text-gray-800">{data.label || 'Output'}</h3>
            <div className="text-sm text-gray-500 mt-1">{typeDisplay.label}</div>
            <div className="text-xs text-gray-400">{typeDisplay.description}</div>
          </div>
        </div>
        {/* NEW: AI-Powered badge for smart outputs */}
        {outputType.startsWith('smart_') && (
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
            AI-Powered
          </span>
        )}
      </div>
      
      {/* Configuration section */}
      {/* NEW: Smart output configuration display */}
      {outputType.startsWith('smart_') && (
        <div className="mt-3 bg-purple-50 p-2 rounded text-xs">
          <div className="text-purple-800 font-medium mb-1">AI Configuration:</div>
          {data.ai_description && (
            <div className="text-purple-700 mb-1">
              <strong>Task:</strong> {data.ai_description.substring(0, 50)}...
            </div>
          )}
          {data.service_type && (
            <div className="text-purple-700 mb-1">
              <strong>Type:</strong> {data.service_type}
            </div>
          )}
          {outputType === 'smart_email' && data.recipient_email && (
            <div className="text-purple-700">
              <strong>Recipient:</strong> {data.recipient_email}
            </div>
          )}
        </div>
      )}
      
      {/* Traditional configuration displays */}
      {outputType === 'webhook' && data.webhook && (
        <div className="mt-3 text-sm">
          <button
            onClick={toggleApiVisibility}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex items-center"
          >
            {hideApiEndpoint ? '👁️ Show Webhook URL' : '🔒 Hide Webhook URL'}
          </button>
          
          {!hideApiEndpoint && (
            <div className="mt-2 text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">
              {data.webhook}
            </div>
          )}
        </div>
      )}
      
      {outputType === 'email' && (
        <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
          <div className="text-gray-600">Email: {data.email || 'Not set'}</div>
        </div>
      )}
      
      {outputType === 'discord' && (
        <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
          <div className="text-gray-600">Webhook configured: {data.webhook ? 'Yes' : 'No'}</div>
        </div>
      )}
      
      {outputType === 'sheets' && (
        <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
          <div className="text-gray-600">Sheet ID: {data.sheetId || 'Not set'}</div>
        </div>
      )}
      
      {/* Don't render results here - they should only appear in the execution panel */}
      
      {/* Action buttons */}
      <div className="flex mt-3 pt-2 border-t border-gray-100 space-x-2">
        <button 
          type="button"
          onClick={handleEditClick}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          Edit
        </button>
        
        <button 
          type="button"
          onClick={handleDeleteClick}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

OutputNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

OutputNode.displayName = 'OutputNode';

export default OutputNode; 