import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const LogicNode = React.memo(({ data, isConnectable, selected }) => {
  const editButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const [previewResult, setPreviewResult] = useState(null);
  
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

  // Add event listeners to the buttons
  useEffect(() => {
    const editBtn = editButtonRef.current;
    const deleteBtn = deleteButtonRef.current;
    
    if (editBtn) {
      editBtn.addEventListener('click', handleEditClick);
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDeleteClick);
    }
    
    return () => {
      if (editBtn) {
        editBtn.removeEventListener('click', handleEditClick);
      }
      
      if (deleteBtn) {
        deleteBtn.removeEventListener('click', handleDeleteClick);
      }
    };
  }, [handleEditClick, handleDeleteClick]);

  // Add this function to test the condition with sample inputs
  const testCondition = useCallback(() => {
    if (!data.condition) return;
    
    try {
      // Use a default test input if none is provided
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

  return (
    <div className={`bg-white border-2 ${selected ? 'border-yellow-500' : 'border-yellow-200'} rounded-lg shadow-md p-4 w-64`}>
      <div className="text-sm font-bold text-yellow-800 mb-2 flex items-center">
        <span className="mr-2">⚖️</span>
        {data.label || "Logic Node"}
      </div>
      
      <div className="text-xs text-gray-600 mb-3">
        {data.description || "Evaluates a condition and routes flow"}
      </div>
      
      <div className="bg-yellow-50 p-2 rounded border border-yellow-100 mb-3">
        <div className="text-xs font-medium text-yellow-700 mb-1">Condition:</div>
        <code className="text-xs font-mono bg-yellow-100 p-1 rounded block overflow-x-auto whitespace-pre-wrap">
          {data.condition || "inputs.value > 0"}
        </code>
      </div>
      
      {previewResult && (
        <div className={`text-xs mt-2 p-1.5 rounded ${
          previewResult.success 
            ? previewResult.result 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}>
          {previewResult.success 
            ? <>
                Preview: <span className="font-bold">{previewResult.result ? '✅ True' : '❌ False'}</span>
              </>
            : <>Error: {previewResult.error}</>
          }
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex mt-3 space-x-2">
        <button 
          ref={editButtonRef}
          type="button"
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded edit-button"
          aria-label="Edit logic node"
          data-no-drag="true"
        >
          Edit
        </button>
        
        <button 
          ref={deleteButtonRef}
          type="button"
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded delete-button"
          aria-label="Delete logic node"
          data-no-drag="true"
        >
          Delete
        </button>
      </div>
      
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400 hover:bg-gray-300 hover:w-4 hover:h-4 transition-all -left-1.5"
        id="input"
      />
      
      {/* True output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500 hover:bg-green-400 hover:w-4 hover:h-4 transition-all -right-1.5 top-1/3"
        id="true"
        style={{ top: '35%' }}
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
        className="w-3 h-3 bg-red-500 hover:bg-red-400 hover:w-4 hover:h-4 transition-all -right-1.5 bottom-1/3"
        id="false"
        style={{ top: '65%' }}
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
