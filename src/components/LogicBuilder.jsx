import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const LogicBuilder = ({ initialCondition, onChange }) => {
  const [conditions, setConditions] = useState([{ field: '', operator: '>', value: '', type: 'string' }]);
  const [logicType, setLogicType] = useState('AND');
  
  // Parse the initial condition if provided
  useEffect(() => {
    if (initialCondition) {
      try {
        // This is a simplified parser - a real one would be more complex
        if (initialCondition.includes('&&')) {
          setLogicType('AND');
          const parts = initialCondition.split('&&').map(p => p.trim());
          parseConditionParts(parts);
        } else if (initialCondition.includes('||')) {
          setLogicType('OR');
          const parts = initialCondition.split('||').map(p => p.trim());
          parseConditionParts(parts);
        } else {
          // Single condition
          parseConditionParts([initialCondition]);
        }
      } catch (e) {
        console.warn('Could not parse condition:', e);
        // Keep default empty condition
      }
    }
  }, [initialCondition]);
  
  // Parse individual condition parts
  const parseConditionParts = (parts) => {
    const parsedConditions = parts.map(part => {
      // This is a very simplified parser
      if (part.includes('>')) {
        const [field, value] = part.split('>').map(p => p.trim());
        return { field, operator: '>', value, type: 'number' };
      } else if (part.includes('<')) {
        const [field, value] = part.split('<').map(p => p.trim());
        return { field, operator: '<', value, type: 'number' };
      } else if (part.includes('==')) {
        const [field, value] = part.split('==').map(p => p.trim());
        return { field, operator: '==', value, type: 'string' };
      } else if (part.includes('!=')) {
        const [field, value] = part.split('!=').map(p => p.trim());
        return { field, operator: '!=', value, type: 'string' };
      } else {
        return { field: part, operator: '>', value: '', type: 'string' };
      }
    });
    
    setConditions(parsedConditions);
  };
  
  // Build the condition string from the UI state
  const buildConditionString = () => {
    const conditionStrings = conditions.map(cond => {
      // Handle different value types
      let valueStr = cond.value;
      if (cond.type === 'string' && !valueStr.startsWith('"') && !valueStr.startsWith("'")) {
        valueStr = `"${valueStr}"`;
      }
      
      return `${cond.field} ${cond.operator} ${valueStr}`;
    });
    
    return conditionStrings.join(logicType === 'AND' ? ' && ' : ' || ');
  };
  
  // Update the parent component when conditions change
  useEffect(() => {
    const conditionString = buildConditionString();
    onChange(conditionString);
  }, [conditions, logicType]);
  
  // Add a new condition
  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: '>', value: '', type: 'string' }]);
  };
  
  // Remove a condition
  const removeCondition = (index) => {
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
  };
  
  // Update a condition
  const updateCondition = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };
  
  return (
    <div className="space-y-3">
      {conditions.map((condition, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="text"
            value={condition.field}
            onChange={(e) => updateCondition(index, 'field', e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="inputs.field"
          />
          
          <select
            value={condition.operator}
            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
            className="p-2 border rounded"
          >
            <option value=">">greater than (&gt;)</option>
            <option value="<">less than (&lt;)</option>
            <option value="==">equals (==)</option>
            <option value="!=">not equals (!=)</option>
            <option value="in">contains (in)</option>
          </select>
          
          <input
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="value"
          />
          
          <select
            value={condition.type}
            onChange={(e) => updateCondition(index, 'type', e.target.value)}
            className="p-2 border rounded"
          >
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
          
          {conditions.length > 1 && (
            <button
              type="button"
              onClick={() => removeCondition(index)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      
      {conditions.length > 1 && (
        <div className="flex justify-center my-2">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setLogicType('AND')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                logicType === 'AND' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => setLogicType('OR')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                logicType === 'OR' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              OR
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addCondition}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center"
        >
          <span className="mr-1">+</span> Add Condition
        </button>
      </div>
      
      <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
        <div className="text-xs text-gray-500 mb-1">Generated Condition:</div>
        <code className="text-sm font-mono">{buildConditionString()}</code>
      </div>
    </div>
  );
};

LogicBuilder.propTypes = {
  initialCondition: PropTypes.string,
  onChange: PropTypes.func.isRequired
};

export default LogicBuilder; 