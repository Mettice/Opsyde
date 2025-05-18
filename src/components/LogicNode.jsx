import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

// Move static styles outside component
const baseStyles = {
  container: "bg-white border-2 rounded-lg shadow-md p-4 w-64",
  selectedBorder: "border-yellow-500",
  defaultBorder: "border-yellow-200",
  header: "text-sm font-bold text-yellow-800 mb-2 flex items-center",
  description: "text-xs text-gray-600 mb-3",
  codeContainer: "bg-yellow-50 p-2 rounded border border-yellow-100 mb-3",
  codeLabel: "text-xs font-medium text-yellow-700 mb-1",
  codeBlock: "text-xs font-mono bg-yellow-100 p-1 rounded block overflow-x-auto whitespace-pre-wrap",
  buttonContainer: "flex mt-3 space-x-2",
  editButton: "text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded",
  deleteButton: "text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
};

// Define origin badge colors outside component
const originBadgeColors = {
  true: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200"
  },
  false: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200"
  },
  error: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200"
  }
};

const LogicNode = React.memo(({ data, isConnectable, selected }) => {
  const [previewResult, setPreviewResult] = useState(null);
  
  // Memoize container style
  const containerStyle = useMemo(() => {
    return `${baseStyles.container} ${selected ? baseStyles.selectedBorder : baseStyles.defaultBorder}`;
  }, [selected]);

  // Memoize handle styles
  const handleStyles = useMemo(() => ({
    input: {
      className: "w-3 h-3 bg-gray-400 hover:bg-gray-300 hover:w-4 hover:h-4 transition-all -left-1.5"
    },
    trueOutput: {
      className: "w-3 h-3 bg-green-500 hover:bg-green-400 hover:w-4 hover:h-4 transition-all -right-1.5 top-1/3",
      style: { top: '35%' }
    },
    falseOutput: {
      className: "w-3 h-3 bg-red-500 hover:bg-red-400 hover:w-4 hover:h-4 transition-all -right-1.5 bottom-1/3",
      style: { top: '65%' }
    }
  }), []);

  // Create stable event handlers with useCallback
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'logic'
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
        nodeType: data.nodeType || 'logic'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  // Memoize test condition function
  const testCondition = useCallback(() => {
    if (!data.condition) return;
    
    try {
      const testInput = data.testInput ? JSON.parse(data.testInput) : { value: 10 };
      const result = new Function('inputs', `return ${data.condition}`)(testInput);
      setPreviewResult({
        success: true,
        result: result,
        path: result ? 'true' : 'false'
      });
    } catch (error) {
      setPreviewResult({
        success: false,
        error: error.message
      });
    }
  }, [data.condition, data.testInput]);

  // Call testCondition when the component mounts or when condition changes
  useEffect(() => {
    testCondition();
  }, [testCondition]);

  // Memoize preview result styles
  const previewResultStyle = useMemo(() => {
    if (!previewResult) return '';
    
    const baseStyle = 'text-xs mt-2 p-1.5 rounded';
    if (!previewResult.success) return `${baseStyle} bg-gray-100 text-gray-800 border border-gray-200`;
    return `${baseStyle} ${previewResult.result ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`;
  }, [previewResult]);

  return (
    <div className={containerStyle} onClick={(e) => e.stopPropagation()}>
      <div className={baseStyles.header}>
        <span className="mr-2">⚖️</span>
        {data.label || "Logic Node"}
      </div>
      
      <div className={baseStyles.description}>
        {data.description || "Evaluates a condition and routes flow"}
      </div>
      
      <div className={baseStyles.codeContainer}>
        <div className={baseStyles.codeLabel}>Condition:</div>
        <code className={baseStyles.codeBlock}>
          {data.condition || "inputs.value > 0"}
        </code>
      </div>
      
      {previewResult && (
        <div className={previewResultStyle}>
          {previewResult.success 
            ? <>
                Preview: <span className="font-bold">{previewResult.result ? '✅ True' : '❌ False'}</span>
              </>
            : <>Error: {previewResult.error}</>
          }
        </div>
      )}
      
      {/* Action buttons */}
      <div className={baseStyles.buttonContainer}>
        <button 
          type="button"
          onClick={handleEditClick}
          className={baseStyles.editButton}
        >
          Edit
        </button>
        
        <button 
          type="button"
          onClick={handleDeleteClick}
          className={baseStyles.deleteButton}
        >
          Delete
        </button>
      </div>
      
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        {...handleStyles.input}
        id="input"
      />
      
      {/* True output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        {...handleStyles.trueOutput}
        id="true"
      >
        <div className="absolute -right-16 -top-1 text-xs text-green-600 whitespace-nowrap font-medium">
          True →
        </div>
      </Handle>
      
      {/* False output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        {...handleStyles.falseOutput}
        id="false"
      >
        <div className="absolute -right-16 -top-1 text-xs text-red-600 whitespace-nowrap font-medium">
          False →
        </div>
      </Handle>
    </div>
  );
});

LogicNode.displayName = 'LogicNode';

LogicNode.propTypes = {
  data: PropTypes.object.isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool
};

export default LogicNode;
