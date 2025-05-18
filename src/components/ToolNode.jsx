import React, { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import EditModall from './EditModall';

// Base styles defined outside component
const baseStyles = {
  container: "bg-white border-2 rounded-lg shadow-md p-4 w-72",
  selectedBorder: "border-green-500",
  defaultBorder: "border-green-200",
  header: "text-sm font-bold text-gray-800 mb-2 flex items-center",
  description: "text-xs text-gray-600 mb-3",
  codeContainer: "bg-gray-50 p-2 rounded border border-gray-100 mb-3",
  codeLabel: "text-xs font-medium text-gray-700 mb-1",
  codeBlock: "text-xs font-mono bg-gray-100 p-1 rounded block overflow-x-auto whitespace-pre-wrap",
  buttonContainer: "flex mt-3 space-x-2",
  editButton: "text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded",
  deleteButton: "text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded",
  handle: {
    base: "w-3 h-3 transition-all",
    input: "bg-green-500 hover:bg-green-400 hover:w-4 hover:h-4",
    output: "bg-green-600 hover:bg-green-500 hover:w-4 hover:h-4"
  }
};

// Origin badge colors defined outside component
const originBadgeStyles = {
  make: { bg: "bg-indigo-100", text: "text-indigo-700", icon: "🧩" },
  zapier: { bg: "bg-amber-100", text: "text-amber-700", icon: "⚡" },
  n8n: { bg: "bg-purple-100", text: "text-purple-700", icon: "🔄" },
  marketplace: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "🛒" },
  ai: { bg: "bg-blue-100", text: "text-blue-700", icon: "🤖" },
  default: { bg: "bg-gray-100", text: "text-gray-700", icon: "📦" }
};

// Memoized result renderer component
const ResultDisplay = memo(({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
      <div className="text-xs font-medium text-gray-700 mb-1">Result:</div>
      <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
});

ResultDisplay.displayName = 'ResultDisplay';

// Tool type definitions
export const ToolType = {
  LLM: 'llm',
  API: 'api',
  WEBHOOK: 'webhook',
  CUSTOM: 'custom'
};

// Framework definitions
export const LLMFrameworks = {
  OPENAI: 'openai',
  OPENROUTER: 'openrouter',
  HUGGINGFACE: 'huggingface'
};

export const APIFrameworks = {
  WEBHOOK: 'webhook',
  API: 'api',
  CUSTOM: 'custom'
};

// Use React.memo to prevent unnecessary re-renders
const ToolNode = memo(({ data, isConnectable, selected }) => {
  const [hideApiEndpoint, setHideApiEndpoint] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Remove local state that duplicates props - use data directly
  // This was likely causing the display issue
  
  // Sync local state with props when they change
  useEffect(() => {
    // Only keep API endpoint visibility as local state since it's UI-only
    // toolType and framework should come directly from data prop
  }, [data.toolType, data.framework]);

  // Memoize container style
  const containerStyle = useMemo(() => (
    `${baseStyles.container} ${selected ? baseStyles.selectedBorder : baseStyles.defaultBorder}`
  ), [selected]);

  // Memoize handle styles
  const handleStyles = useMemo(() => ({
    input: {
      className: `${baseStyles.handle.base} ${baseStyles.handle.input}`,
      style: { top: '-0.5rem' }
    },
    output: {
      className: `${baseStyles.handle.base} ${baseStyles.handle.output}`,
      style: { bottom: '-0.5rem' }
    }
  }), []);

  // Memoize origin badge style
  const originBadgeStyle = useMemo(() => {
    const origin = data.origin || 'default';
    const style = originBadgeStyles[origin] || originBadgeStyles.default;
    return `inline-flex items-center px-2 py-0.5 rounded-full ${style.bg} ${style.text} text-xs mb-2 mt-1`;
  }, [data.origin]);

  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (window.confirm('Are you sure you want to delete this node?')) {
      data.onDelete?.();
    }
  }, [data]);

  // Toggle API endpoint visibility
  const toggleApiVisibility = useCallback((e) => {
    e.stopPropagation();
    setHideApiEndpoint(prev => !prev);
  }, []);

  // Memoize origin badge content
  const originBadgeContent = useMemo(() => {
    const origin = data.origin || 'default';
    const style = originBadgeStyles[origin];
    return (
      <div className={originBadgeStyle}>
        <span className="mr-1">{style.icon}</span>
        {origin === 'make' ? 'From Make' :
         origin === 'zapier' ? 'From Zapier' :
         origin === 'n8n' ? 'From n8n' :
         origin === 'marketplace' ? 'Marketplace' :
         origin === 'ai' ? 'AI-Suggested' :
         `From ${origin}`}
      </div>
    );
  }, [data.origin, originBadgeStyle]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback((newData) => {
    // Make sure to call onChange with the complete updated data
    if (data.onChange) {
      data.onChange({
        ...data,
        ...newData
      });
    }
    setIsModalOpen(false);
  }, [data]);

  // Get available frameworks based on tool type - now using data.toolType
  const getAvailableFrameworks = useCallback(() => {
    switch (data.toolType) {
      case ToolType.LLM:
        return Object.values(LLMFrameworks);
      case ToolType.API:
      case ToolType.WEBHOOK:
      case ToolType.CUSTOM:
        return Object.values(APIFrameworks);
      default:
        return [];
    }
  }, [data.toolType]);

  return (
    <div 
      className={containerStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        {...handleStyles.input}
      />
      
      {/* Header */}
      <div className={baseStyles.header}>
        <span className="mr-2">🔧</span>
        {data.label || 'Unnamed Tool'}
      </div>
      
      {/* Origin badge */}
      {data.origin && originBadgeContent}
      
      {/* Description */}
      {data.description && (
        <div className={baseStyles.description}>
          <span className="font-medium">Performs:</span> {data.description}
        </div>
      )}
      
      {/* Tool type and framework - now using data directly */}
      <div className="text-xs text-gray-600 mb-2">
        <div><span className="font-medium">Type:</span> {data.toolType || 'API'}</div>
        {data.framework && (
          <div><span className="font-medium">Framework:</span> {data.framework}</div>
        )}
      </div>
      
      {/* API Endpoint */}
      {data.apiEndpoint && (
        <div className="mb-3">
          <button
            onClick={toggleApiVisibility}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center"
          >
            {hideApiEndpoint ? '👁️ Show Endpoint' : '🔒 Hide Endpoint'}
          </button>
          {!hideApiEndpoint && (
            <div className="mt-2 text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">
              {data.apiEndpoint}
            </div>
          )}
        </div>
      )}

      {/* Result display */}
      <ResultDisplay result={data.result} />
      
      {/* Action buttons */}
      <div className={baseStyles.buttonContainer}>
        <button 
          onClick={handleEditClick}
          className={baseStyles.editButton}
        >
          Edit
        </button>
        <button 
          onClick={handleDeleteClick}
          className={baseStyles.deleteButton}
        >
          Delete
        </button>
      </div>

      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        {...handleStyles.output}
      />

      {/* EditModal with all necessary props */}
      {isModalOpen && (
        <EditModall
          isOpen={true}
          onClose={handleCloseModal}
          onSave={handleSave}
          nodeData={data}
          nodeType="tool"
          availableFrameworks={getAvailableFrameworks()}
        />
      )}
    </div>
  );
});

ToolNode.displayName = 'ToolNode';

ToolNode.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string.isRequired,
    label: PropTypes.string,
    description: PropTypes.string,
    toolType: PropTypes.string,
    framework: PropTypes.string,
    apiEndpoint: PropTypes.string,
    origin: PropTypes.string,
    result: PropTypes.any,
    nodeType: PropTypes.string,
    onChange: PropTypes.func,
    onDelete: PropTypes.func
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

export default ToolNode;