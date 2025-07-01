import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const FieldMapper = ({ 
  nodeId, 
  nodeType, 
  availableFields = [], 
  currentMappings = {}, 
  onMappingChange,
  previousNodeOutputs = {},
  connectedNodes = []
}) => {
  const [mappings, setMappings] = useState(currentMappings);
  const [showMapper, setShowMapper] = useState(false);
  const [selectedSourceNode, setSelectedSourceNode] = useState('');

  // Get available fields from previous nodes
  const getAvailableFields = () => {
    const fields = [];
    
    // Add fields from previous node outputs
    Object.entries(previousNodeOutputs).forEach(([nodeId, output]) => {
      if (output && typeof output === 'object') {
        // Extract fields from the output
        const extractFields = (obj, prefix = '', sourceNode = nodeId) => {
          Object.entries(obj).forEach(([key, value]) => {
            const fieldPath = prefix ? `${prefix}.${key}` : key;
            const fieldType = Array.isArray(value) ? 'array' : typeof value;
            
            fields.push({
              path: fieldPath,
              type: fieldType,
              sourceNode: sourceNode,
              value: value,
              displayName: `${sourceNode}.${fieldPath} (${fieldType})`
            });
            
            // Recursively extract nested fields (max 2 levels deep)
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && prefix.split('.').length < 2) {
              extractFields(value, fieldPath, sourceNode);
            }
          });
        };
        
        extractFields(output, '', nodeId);
      }
    });
    
    return fields;
  };

  const availableFieldsList = getAvailableFields();

  // Get target fields based on node type
  const getTargetFields = () => {
    const targetFields = {
      task: ['query', 'context', 'agent_output', 'parameters'],
      agent: ['input', 'context', 'parameters', 'memory'],
      tool: ['input_data', 'parameters', 'query', 'context'],
      output: ['data', 'format', 'destination'],
      logic: ['condition', 'input_a', 'input_b'],
      chat: ['message', 'context', 'history'],
      delay: ['duration', 'unit'],
      trigger: ['trigger_data', 'api_data', 'webhook_data'],
      input: ['value', 'default_value', 'placeholder', 'validation']
    };
    
    return targetFields[nodeType] || ['input', 'data', 'parameters'];
  };

  const targetFields = getTargetFields();

  const handleMappingChange = (targetField, sourceField) => {
    const newMappings = {
      ...mappings,
      [targetField]: sourceField
    };
    
    setMappings(newMappings);
    onMappingChange(newMappings);
  };

  const removeMapping = (targetField) => {
    const newMappings = { ...mappings };
    delete newMappings[targetField];
    setMappings(newMappings);
    onMappingChange(newMappings);
  };

  const clearAllMappings = () => {
    setMappings({});
    onMappingChange({});
  };

  const autoMapFields = () => {
    const autoMappings = {};
    
    targetFields.forEach(targetField => {
      // Try to find a matching field by name similarity
      const matchingField = availableFieldsList.find(field => 
        field.path.toLowerCase().includes(targetField.toLowerCase()) ||
        targetField.toLowerCase().includes(field.path.toLowerCase())
      );
      
      if (matchingField) {
        autoMappings[targetField] = matchingField.path;
      }
    });
    
    setMappings(autoMappings);
    onMappingChange(autoMappings);
  };

  return (
    <div className="field-mapper-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Field Mappings</h3>
          <p className="text-sm text-gray-600">
            Map fields from previous nodes to this {nodeType} node's inputs
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowMapper(!showMapper)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showMapper ? 'Hide' : 'Show'} Mapper
          </button>
          {showMapper && (
            <>
              <button
                onClick={autoMapFields}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                title="Auto-map fields based on name similarity"
              >
                Auto Map
              </button>
              <button
                onClick={clearAllMappings}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                title="Clear all mappings"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Summary */}
      {Object.keys(mappings).length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm font-medium text-blue-800 mb-2">Current Mappings:</div>
          <div className="space-y-1">
            {Object.entries(mappings).map(([target, source]) => (
              <div key={target} className="text-sm text-blue-700">
                <span className="font-medium">{target}</span> ← <span className="font-mono">{source}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Mapper Interface */}
      {showMapper && (
        <div className="space-y-4">
          {/* Available Fields */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Available Fields from Previous Nodes</h4>
            {availableFieldsList.length > 0 ? (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {availableFieldsList.map((field, index) => (
                  <div key={index} className="text-sm text-gray-600 py-1 border-b border-gray-100 last:border-b-0">
                    <span className="font-mono">{field.displayName}</span>
                    {field.type === 'array' && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                        array ({field.value?.length || 0} items)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No fields available from previous nodes
              </div>
            )}
          </div>

          {/* Mapping Interface */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Map to {nodeType} Inputs</h4>
            <div className="space-y-3">
              {targetFields.map(targetField => (
                <div key={targetField} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {targetField}
                    </label>
                    <select
                      value={mappings[targetField] || ''}
                      onChange={(e) => handleMappingChange(targetField, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select field --</option>
                      {availableFieldsList.map((field, index) => (
                        <option key={index} value={field.path}>
                          {field.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {mappings[targetField] && (
                    <button
                      onClick={() => removeMapping(targetField)}
                      className="px-2 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <strong>How it works:</strong> Select fields from previous nodes to map to this node's inputs. 
            The system will automatically pass the selected data to the corresponding input fields.
            Use "Auto Map" to automatically match fields by name similarity.
          </div>
        </div>
      )}
    </div>
  );
};

FieldMapper.propTypes = {
  nodeId: PropTypes.string.isRequired,
  nodeType: PropTypes.string.isRequired,
  availableFields: PropTypes.array,
  currentMappings: PropTypes.object,
  onMappingChange: PropTypes.func.isRequired,
  previousNodeOutputs: PropTypes.object,
  connectedNodes: PropTypes.array
};

export default FieldMapper; 