import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';

const AgentCard = React.memo(({ data, selected, isConnectable }) => {
  // Get framework ID if an object is passed, otherwise use the string value
  const frameworkId = typeof data.framework === 'object' ? data.framework.id || 'openrouter' : data.framework || 'openrouter';
  
  const handleEditClick = useCallback((e) => {
    // Stop event propagation
    e?.stopPropagation();
    e?.preventDefault();
    
    // Create and dispatch custom event without passing the original event
    document.dispatchEvent(new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent',
        data: {
          ...data,
          framework: frameworkId
        }
      } 
    }));
  }, [data, frameworkId]);

  const handleDeleteClick = useCallback((e) => {
    // Stop event propagation
    e?.stopPropagation();
    e?.preventDefault();
    
    // Create and dispatch custom event without passing the original event
    document.dispatchEvent(new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'agent'
      } 
    }));
  }, [data?.nodeId, data?.nodeType]);

  // Ensure data is properly structured before rendering
  const safeData = {
    ...data,
    label: data.label || 'Agent',
    role: data.role || '',
    goal: data.goal || '',
    backstory: data.backstory || '',
    llmModel: data.llmModel || 'gpt-4',
    temperature: data.temperature || 0.7,
    max_tokens: data.max_tokens || 4000,
    enableMemory: data.enableMemory || false,
    prompt: data.prompt || ''
  };

  return (
    <div 
      className={`bg-blue-50 border-2 ${selected ? 'border-blue-500' : 'border-blue-200'} shadow-md rounded p-3 w-72`}
      onClick={(e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{
          top: -5,
          width: 16,
          height: 16,
          background: '#60A5FA',
          border: '3px solid white',
          borderRadius: '50%'
        }}
        isConnectable={isConnectable}
      />

      {/* Agent Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-semibold text-lg">{safeData.label}</h3>
            <div className="text-xs text-gray-500">{frameworkId}</div>
          </div>
        </div>
      </div>

      {/* Agent Details */}
      <div className="space-y-2 text-sm">
        {safeData.role && (
          <div>
            <span className="font-medium">Role:</span> {safeData.role}
          </div>
        )}
        {safeData.goal && (
          <div>
            <span className="font-medium">Goal:</span> {safeData.goal}
          </div>
        )}
        {safeData.backstory && (
          <div>
            <span className="font-medium">Backstory:</span> {safeData.backstory}
          </div>
        )}
      </div>

      {/* Agent Settings */}
      <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-white p-2 rounded border border-blue-100">
        <div>
          <span className="font-medium">Model:</span> {safeData.llmModel}
        </div>
        <div>
          <span className="font-medium">Temperature:</span> {safeData.temperature}
        </div>
        <div>
          <span className="font-medium">Max Tokens:</span> {safeData.max_tokens}
        </div>
        <div>
          <span className="font-medium">Memory:</span> {safeData.enableMemory ? 'Enabled' : 'Disabled'}
        </div>
        {safeData.prompt && (
          <div>
            <span className="font-medium">Custom Prompt:</span>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{safeData.prompt}</div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex mt-3 space-x-2">
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

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{
          bottom: -5,
          width: 16,
          height: 16,
          background: '#3B82F6',
          border: '3px solid white',
          borderRadius: '50%'
        }}
        isConnectable={isConnectable}
      />
    </div>
  );
});

AgentCard.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string.isRequired,
    label: PropTypes.string,
    framework: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    nodeType: PropTypes.string,
    role: PropTypes.string,
    goal: PropTypes.string,
    backstory: PropTypes.string,
    llmModel: PropTypes.string,
    temperature: PropTypes.number,
    max_tokens: PropTypes.number,
    enableMemory: PropTypes.bool,
    prompt: PropTypes.string
  }).isRequired,
  selected: PropTypes.bool,
  isConnectable: PropTypes.bool
};

AgentCard.displayName = 'AgentCard';

export default AgentCard;