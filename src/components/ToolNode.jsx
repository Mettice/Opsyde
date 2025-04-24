import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Use React.memo to prevent unnecessary re-renders
const ToolNode = memo(({ data, isConnectable, selected }) => {
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  
  // Create stable event handler wrappers with useCallback
  const handleEditClick = useCallback((e) => {
    // Ensure we have an event object
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Dispatch a custom event that Builder.jsx will listen for
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    // Ensure we have an event object
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Dispatch a custom event that Builder.jsx will listen for
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'tool'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(!hideApiEndpoint);
  }, [hideApiEndpoint]);

  // Format API endpoint for display
  const formatApiEndpoint = (endpoint) => {
    if (!endpoint) return '';
    return hideApiEndpoint ? 
      endpoint.replace(/^(https?:\/\/[^\/]+)(.*)$/, '$1/****') : 
      endpoint;
  };

  const toolType = data.toolType || 'unknown';
  const customTool = data.customTool;
  const result = data.result || {};

  const renderResults = () => {
    // Simple result preview
    return (
      <div className="mt-2 text-sm">
        {result.error ? (
          <div className="text-red-500">{result.error}</div>
        ) : (
          <div className="text-gray-600">
            {result.type === 'cv_result' ? (
              <div className="bg-blue-50 p-2 rounded">
                <p>CV Analysis Complete</p>
                <p className="text-xs">View results in execution panel</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">
                {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  };

  // Handle rendering with an error message if data is missing
  if (!data) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
        Error: ToolNode requires the 'data' prop
      </div>
    );
  }

  return (
    <div 
      className={`bg-white border-2 ${selected ? 'border-green-500' : 'border-green-200'} shadow-md rounded p-3 w-72`}
      data-nodeid={data.id} // Add data attribute for debugging
    >
      {/* Target handle at top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-4 h-4 bg-green-500 hover:bg-green-400 hover:w-5 hover:h-5 transition-all -top-2"
        id={`${data.id}-target`}
        title="Tools don't receive connections"
      />
      
      {/* Node content */}
      <div 
        className="font-semibold text-gray-800 mb-1"
        title={data.label || 'Unnamed Tool'}
      >
        {data.label || 'Unnamed Tool'}
      </div>
      
      {data.origin && (
        <div className="text-xs inline-flex items-center px-2 py-0.5 rounded-full mb-2 mt-1" 
             style={{
               backgroundColor: 
                 data.origin === 'make' ? 'rgba(79, 70, 229, 0.1)' : 
                 data.origin === 'zapier' ? 'rgba(245, 158, 11, 0.1)' : 
                 data.origin === 'n8n' ? 'rgba(168, 85, 247, 0.1)' :
                 data.origin === 'marketplace' ? 'rgba(16, 185, 129, 0.1)' :
                 data.origin === 'ai' ? 'rgba(59, 130, 246, 0.1)' :
                 'rgba(107, 114, 128, 0.1)',
               color:
                 data.origin === 'make' ? '#4f46e5' : 
                 data.origin === 'zapier' ? '#f59e0b' : 
                 data.origin === 'n8n' ? '#a855f7' :
                 data.origin === 'marketplace' ? '#10b981' :
                 data.origin === 'ai' ? '#3b82f6' :
                 '#6b7280'
             }}>
          {data.origin === 'make' && '🧩 From Make'}
          {data.origin === 'zapier' && '⚡ From Zapier'}
          {data.origin === 'n8n' && '🔄 From n8n'}
          {data.origin === 'marketplace' && '🛒 Marketplace'}
          {data.origin === 'ai' && '🤖 AI-Suggested'}
          {data.origin && !['make', 'zapier', 'n8n', 'marketplace', 'ai'].includes(data.origin) && `📦 From ${data.origin}`}
        </div>
      )}
      
      {data.description && (
        <div 
          className="text-sm text-gray-500 mb-1 truncate"
          title={data.description}
        >
          <span className="font-medium">Performs</span> {data.description}
        </div>
      )}
      
      {data.toolType && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Type:</span> {data.toolType}
        </div>
      )}
      
      {data.toolType === 'api' && data.apiEndpoint && (
        <div className="text-xs text-gray-600 mb-1 flex items-center">
          <span className="font-medium mr-1">API:</span> 
          <span className="truncate flex-1" title={data.apiEndpoint}>
            {formatApiEndpoint(data.apiEndpoint)}
          </span>
          <button 
            onClick={toggleApiVisibility}
            className="ml-1 text-gray-500 hover:text-gray-700 text-xs p-1"
            title={hideApiEndpoint ? "Show full API endpoint" : "Hide API endpoint"}
          >
            {hideApiEndpoint ? "👁️" : "🔒"}
          </button>
        </div>
      )}
      
      {data.toolType === 'webhook' && (
        <>
          <div className="text-xs text-gray-600 mb-1">
            <span className="font-medium">Webhook Type:</span> {data.webhookType || 'send-output'}
          </div>
          {data.webhookType === 'load-flow' && (
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-medium">Flow Mode:</span> {data.flowMode || 'replace'}
            </div>
          )}
          {data.webhook_url && (
            <div className="text-xs text-gray-600 mb-1 flex items-center">
              <span className="font-medium mr-1">URL:</span> 
              <span className="truncate flex-1" title={data.webhook_url}>
                {formatApiEndpoint(data.webhook_url)}
              </span>
              <button 
                onClick={toggleApiVisibility}
                className="ml-1 text-gray-500 hover:text-gray-700 text-xs p-1"
                title={hideApiEndpoint ? "Show full URL" : "Hide URL"}
              >
                {hideApiEndpoint ? "👁️" : "🔒"}
              </button>
            </div>
          )}
        </>
      )}
      
      {data.parameters && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Parameters:</span> 
          <span className="italic">
            {Array.isArray(data.parameters) 
              ? data.parameters.join(', ') 
              : data.parameters.split('\n').join(', ')}
          </span>
        </div>
      )}
      
      {renderResults()}
      
      {/* Display the rendered result */}
      {data.resultDisplay && (
        <div className="mt-4">
          {data.resultDisplay}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-2 space-x-2">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick(e);
          }}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          Edit
        </button>
        
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(e);
          }}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
        >
          Delete
        </button>
      </div>
      
      {/* Source handle at bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        className="w-4 h-4 bg-green-600 hover:bg-green-500 hover:w-5 hover:h-5 transition-all -bottom-2"
        id={`${data.id}-source`}
        title="Connect to: Agent"
      >
        <div className="absolute -bottom-5 text-xs text-gray-500 whitespace-nowrap">→ Agent</div>
      </Handle>
    </div>
  );
});

// Prop types for better type checking and documentation
ToolNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    description: PropTypes.string,
    toolType: PropTypes.string,
    apiEndpoint: PropTypes.string,
    parameters: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    nodeId: PropTypes.string,
    nodeType: PropTypes.string,
    resultDisplay: PropTypes.node
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

// Add a display name for better debugging
ToolNode.displayName = 'ToolNode';

export default ToolNode;