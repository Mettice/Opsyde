import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, ChevronDown, Code, Eye, Settings, Play, Save, BookOpen } from 'lucide-react';
import HelpTooltip from '../HelpTooltip';

// Enhanced operators with better categorization
const operatorsByType = {
  string: [
    { value: '==', label: 'equals', symbol: '==', description: 'Exact match' },
    { value: '!=', label: 'not equals', symbol: '!=', description: 'Does not match' },
    { value: 'contains', label: 'contains', symbol: 'in', description: 'Contains text' },
    { value: 'starts_with', label: 'starts with', symbol: 'startswith', description: 'Begins with text' },
    { value: 'ends_with', label: 'ends with', symbol: 'endswith', description: 'Ends with text' },
    { value: 'regex', label: 'matches pattern', symbol: 'match', description: 'Regular expression match' }
  ],
  number: [
    { value: '>', label: 'greater than', symbol: '>', description: 'Larger than value' },
    { value: '<', label: 'less than', symbol: '<', description: 'Smaller than value' },
    { value: '>=', label: 'greater or equal', symbol: '>=', description: 'At least this value' },
    { value: '<=', label: 'less or equal', symbol: '<=', description: 'At most this value' },
    { value: '==', label: 'equals', symbol: '==', description: 'Exactly this value' },
    { value: '!=', label: 'not equals', symbol: '!=', description: 'Not this value' },
    { value: 'between', label: 'between', symbol: 'between', description: 'Within range' }
  ],
  boolean: [
    { value: '==', label: 'is', symbol: '==', description: 'Boolean state' },
    { value: '!=', label: 'is not', symbol: '!=', description: 'Opposite boolean state' }
  ],
  array: [
    { value: 'length_gt', label: 'has more than', symbol: 'len() >', description: 'Array length greater' },
    { value: 'length_lt', label: 'has less than', symbol: 'len() <', description: 'Array length smaller' },
    { value: 'length_eq', label: 'has exactly', symbol: 'len() ==', description: 'Exact array length' },
    { value: 'contains', label: 'includes item', symbol: 'in', description: 'Contains specific item' },
    { value: 'empty', label: 'is empty', symbol: 'len() == 0', description: 'No items in array' },
    { value: 'not_empty', label: 'has items', symbol: 'len() > 0', description: 'Has at least one item' }
  ],
  object: [
    { value: 'has_key', label: 'has property', symbol: 'in', description: 'Object has key' },
    { value: '!=', label: 'is not null', symbol: '!= None', description: 'Object exists' },
    { value: '==', label: 'is null', symbol: '== None', description: 'Object is null/empty' }
  ]
};

// Condition templates for quick setup
const conditionTemplates = [
  {
    name: 'Success Check',
    description: 'Check if operation was successful',
    conditions: [{ field: '', operator: '==', value: 'success', logicType: 'AND' }]
  },
  {
    name: 'Threshold Check',
    description: 'Check if value exceeds threshold',
    conditions: [{ field: '', operator: '>', value: '100', logicType: 'AND' }]
  },
  {
    name: 'Status Validation',
    description: 'Validate status and check for errors',
    conditions: [
      { field: '', operator: '==', value: 'completed', logicType: 'AND' },
      { field: '', operator: '!=', value: 'error', logicType: 'AND' }
    ]
  },
  {
    name: 'Data Presence',
    description: 'Check if data exists and is not empty',
    conditions: [
      { field: '', operator: '!=', value: 'null', logicType: 'AND' },
      { field: '', operator: 'not_empty', value: '', logicType: 'AND' }
    ]
  }
];

const LogicEditor = ({ 
  formData, 
  handleInputChange, 
  testInput, 
  setTestInput, 
  testResult, 
  setTestResult, 
  savedTestInputs, 
  saveTestInput,
  connectedNodes = [] // New prop for connected node data
}) => {
  const [buildMode, setBuildMode] = useState('visual'); // 'visual' or 'code'
  const [conditions, setConditions] = useState([
    { id: 1, field: '', operator: '', value: '', valueType: 'single', logicType: 'AND' }
  ]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [generatedCondition, setGeneratedCondition] = useState('');

  // Get all available fields from connected nodes (only use real data)
  const availableFields = connectedNodes.flatMap(node => {
    // Only process nodes that have actual output data
    if (!node.outputs || typeof node.outputs !== 'object') {
      return [];
    }
    
    return Object.entries(node.outputs).map(([fieldName, fieldInfo]) => ({
      id: `${node.id}.${fieldName}`,
      label: `${node.type || node.label || 'Node'}: ${fieldName}`,
      value: `inputs.${fieldName}`,
      type: fieldInfo.type || 'string',
      sample: fieldInfo.sample || '',
      nodeType: node.type || 'unknown'
    }));
  });

  // Parse existing condition into visual builder format
  useEffect(() => {
    if (formData.condition && buildMode === 'visual') {
      parseConditionToVisual(formData.condition);
    }
  }, [formData.condition, buildMode]);

  // Generate condition string from visual builder
  useEffect(() => {
    if (buildMode === 'visual') {
      const conditionStr = generateConditionFromVisual();
      setGeneratedCondition(conditionStr);
      // Update parent form data
      if (conditionStr !== formData.condition) {
        handleInputChange({
          target: { name: 'condition', value: conditionStr }
        });
      }
    }
  }, [conditions, buildMode]);

  const parseConditionToVisual = (conditionStr) => {
    // Simple parser - in production, use a proper AST parser
    if (!conditionStr) return;
    
    try {
      // Handle simple cases for demo
      if (conditionStr.includes(' && ')) {
        const parts = conditionStr.split(' && ');
        const parsedConditions = parts.map((part, index) => ({
          id: index + 1,
          ...parseConditionPart(part.trim()),
          logicType: 'AND'
        }));
        setConditions(parsedConditions);
      } else if (conditionStr.includes(' || ')) {
        const parts = conditionStr.split(' || ');
        const parsedConditions = parts.map((part, index) => ({
          id: index + 1,
          ...parseConditionPart(part.trim()),
          logicType: 'OR'
        }));
        setConditions(parsedConditions);
      } else {
        setConditions([{
          id: 1,
          ...parseConditionPart(conditionStr),
          logicType: 'AND'
        }]);
      }
    } catch (error) {
      console.warn('Could not parse condition:', error);
    }
  };

  const parseConditionPart = (part) => {
    // Basic parsing logic - extend as needed
    const operators = ['>=', '<=', '==', '!=', '>', '<'];
    
    for (const op of operators) {
      if (part.includes(op)) {
        const [fieldPart, valuePart] = part.split(op).map(s => s.trim());
        const field = availableFields.find(f => f.value === fieldPart)?.id || '';
        const value = valuePart.replace(/['"]/g, '');
        return { field, operator: op, value, valueType: 'single' };
      }
    }
    
    return { field: '', operator: '', value: '', valueType: 'single' };
  };

  const generateConditionFromVisual = () => {
    const conditionParts = conditions
      .filter(c => c.field && c.operator && (c.value !== '' || ['empty', 'not_empty'].includes(c.operator)))
      .map((condition, index) => {
        const field = availableFields.find(f => f.id === condition.field);
        if (!field) return '';

        let conditionStr = '';
        const fieldValue = field.value;
        
        // Handle different operators and field types
        switch (condition.operator) {
          case 'contains':
            conditionStr = `"${condition.value}" in ${fieldValue}`;
            break;
          case 'starts_with':
            conditionStr = `${fieldValue}.startswith("${condition.value}")`;
            break;
          case 'ends_with':
            conditionStr = `${fieldValue}.endswith("${condition.value}")`;
            break;
          case 'regex':
            conditionStr = `re.match("${condition.value}", ${fieldValue})`;
            break;
          case 'length_gt':
            conditionStr = `len(${fieldValue}) > ${condition.value}`;
            break;
          case 'length_lt':
            conditionStr = `len(${fieldValue}) < ${condition.value}`;
            break;
          case 'length_eq':
            conditionStr = `len(${fieldValue}) == ${condition.value}`;
            break;
          case 'empty':
            conditionStr = `len(${fieldValue}) == 0`;
            break;
          case 'not_empty':
            conditionStr = `len(${fieldValue}) > 0`;
            break;
          case 'has_key':
            conditionStr = `"${condition.value}" in ${fieldValue}`;
            break;
          case 'between':
            const [min, max] = condition.value.split(',').map(v => v.trim());
            conditionStr = `${min} <= ${fieldValue} <= ${max}`;
            break;
          default:
            // Standard operators (>, <, ==, !=, etc.)
            const valueStr = field.type === 'string' && !['true', 'false', 'null'].includes(condition.value.toLowerCase())
              ? `"${condition.value}"`
              : condition.value;
            conditionStr = `${fieldValue} ${condition.operator} ${valueStr}`;
        }

        return index > 0 ? ` ${condition.logicType.toLowerCase()} ${conditionStr}` : conditionStr;
      });

    return conditionParts.join('');
  };

  const addCondition = () => {
    const newId = Math.max(...conditions.map(c => c.id)) + 1;
    setConditions([...conditions, {
      id: newId,
      field: '',
      operator: '',
      value: '',
      valueType: 'single',
      logicType: 'AND'
    }]);
  };

  const removeCondition = (id) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id));
    }
  };

  const updateCondition = (id, field, value) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const getOperatorsForField = (fieldId) => {
    const field = availableFields.find(f => f.id === fieldId);
    return field ? operatorsByType[field.type] || [] : [];
  };

  const getSelectedField = (fieldId) => {
    return availableFields.find(f => f.id === fieldId);
  };

  const applyTemplate = (template) => {
    const newConditions = template.conditions.map((cond, index) => ({
      ...cond,
      id: index + 1
    }));
    setConditions(newConditions);
    setShowTemplates(false);
  };

  const runTest = () => {
    try {
      const inputs = JSON.parse(testInput);
      const condition = buildMode === 'visual' ? generatedCondition : formData.condition;
      const result = new Function('inputs', `return ${condition}`)(inputs);
      setTestResult({
        success: true,
        result: result,
        path: result ? 'true' : 'false'
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="logic" field="description" />
        </label>
        <input
          type="text"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe what this logic node does..."
        />
      </div>

      {/* Build Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Condition Setup</h3>
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setBuildMode('visual')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                buildMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Visual Builder
            </button>
            <button
              type="button"
              onClick={() => setBuildMode('code')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                buildMode === 'code'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Code className="w-4 h-4 mr-1.5" />
              Code Editor
            </button>
          </div>
        </div>
      </div>

      {/* Visual Builder */}
      {buildMode === 'visual' && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          {connectedNodes.length === 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> Connect other nodes to this logic node to see their output fields here. You can use the code editor below to write conditions manually, or connect nodes first to use the visual builder.
              </div>
            </div>
          )}

          {/* Templates */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Quick Templates</span>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showTemplates ? 'Hide' : 'Show'} Templates
              </button>
            </div>
            
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2">
                {conditionTemplates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="p-3 text-left border border-gray-200 rounded-md hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="font-medium text-sm text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Condition Builder */}
          <div className="space-y-3">
            {conditions.map((condition, index) => {
              const selectedField = getSelectedField(condition.field);
              const availableOperators = getOperatorsForField(condition.field);
              const selectedOperator = availableOperators.find(op => op.value === condition.operator);

              return (
                <div key={condition.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  {index > 0 && (
                    <div className="flex justify-center mb-3">
                      <div className="inline-flex rounded-md shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateCondition(condition.id, 'logicType', 'AND')}
                          className={`px-3 py-1 text-sm font-medium rounded-l-md border ${
                            condition.logicType === 'AND'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          AND
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCondition(condition.id, 'logicType', 'OR')}
                          className={`px-3 py-1 text-sm font-medium rounded-r-md border-l-0 border ${
                            condition.logicType === 'OR'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          OR
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-3 items-start">
                    {/* Field Selector */}
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Field from Previous Nodes
                      </label>
                      <div className="relative">
                        <select
                          value={condition.field}
                          onChange={(e) => {
                            updateCondition(condition.id, 'field', e.target.value);
                            updateCondition(condition.id, 'operator', ''); // Reset operator
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm appearance-none pr-8"
                        >
                          <option value="">Select a field...</option>
                          {connectedNodes.length > 0 ? (
                            connectedNodes.map(node => (
                              <optgroup key={node.id} label={`📡 ${node.type || node.label || 'Node'}`}>
                                {node.outputs && Object.entries(node.outputs).map(([fieldName, fieldInfo]) => (
                                  <option key={`${node.id}.${fieldName}`} value={`${node.id}.${fieldName}`}>
                                    {fieldName} ({fieldInfo.type || 'unknown'})
                                  </option>
                                ))}
                              </optgroup>
                            ))
                          ) : (
                            <option value="" disabled>
                              No connected nodes available. Connect other nodes to this logic node first.
                            </option>
                          )}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      {selectedField && (
                        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                          <div className="font-medium">Sample: {selectedField.sample}</div>
                          <div className="text-blue-500 mt-1">Type: {selectedField.type}</div>
                        </div>
                      )}
                    </div>

                    {/* Operator Selector */}
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Condition
                      </label>
                      <div className="relative">
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm appearance-none pr-8"
                          disabled={!condition.field}
                        >
                          <option value="">Choose condition...</option>
                          {availableOperators.map(op => (
                            <option key={op.value} value={op.value} title={op.description}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      {selectedOperator && (
                        <div className="mt-1 text-xs text-gray-500">
                          {selectedOperator.description}
                        </div>
                      )}
                    </div>

                    {/* Value Input */}
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {condition.operator === 'between' ? 'Range (min, max)' : 'Value'}
                      </label>
                      {selectedField?.type === 'boolean' ? (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : ['empty', 'not_empty'].includes(condition.operator) ? (
                        <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500 italic">
                          No value needed
                        </div>
                      ) : (
                        <input
                          type={selectedField?.type === 'number' ? 'number' : 'text'}
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          placeholder={
                            condition.operator === 'between' 
                              ? '10, 100' 
                              : selectedField?.type === 'number' 
                                ? '0' 
                                : 'Enter value...'
                          }
                          disabled={!condition.operator}
                        />
                      )}
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-end">
                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCondition(condition.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove condition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Condition Button */}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={addCondition}
              className="inline-flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Condition
            </button>
          </div>

          {/* Generated Condition Preview */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Code:</h4>
            <div className="bg-gray-900 p-3 rounded-md">
              <code className="text-green-400 text-sm font-mono block overflow-x-auto">
                {generatedCondition || '# Configure conditions above to see the generated code...'}
              </code>
            </div>
            
            {generatedCondition && conditions.filter(c => c.field && c.operator).length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Plain English:</div>
                  <div className="italic">
                    {conditions
                      .filter(c => c.field && c.operator)
                      .map((condition, index) => {
                        const field = getSelectedField(condition.field);
                        const operator = getOperatorsForField(condition.field).find(op => op.value === condition.operator);
                        
                        if (!field || !operator) return '';
                        
                        const prefix = index > 0 ? ` ${condition.logicType.toLowerCase()} ` : '';
                        const fieldName = field.label.split(': ')[1];
                        const valueText = ['empty', 'not_empty'].includes(condition.operator) ? '' : ` "${condition.value}"`;
                        
                        return `${prefix}${fieldName} ${operator.label}${valueText}`;
                      })
                      .join('')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Code Editor */}
      {buildMode === 'code' && (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1 flex items-center">
              Condition Code
              <HelpTooltip type="logic" field="condition" />
              <span className="ml-2 text-xs text-gray-500">Advanced users only</span>
            </label>
            <textarea
              name="condition"
              value={formData.condition || ''}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="inputs.value > 10"
              rows={4}
            />
            <div className="text-xs text-gray-500 mt-1">
              Use Python-like syntax. Available: inputs.*, context.*, env.*
            </div>
          </div>

          {/* Code Examples */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-3 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Code Examples:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-medium text-yellow-700 mb-1">Simple Comparisons:</div>
                <div className="space-y-1 text-yellow-600 font-mono">
                  <div>inputs.temperature &gt; 70</div>
                  <div>inputs.status == "approved"</div>
                  <div>"error" in inputs.message</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-yellow-700 mb-1">Complex Logic:</div>
                <div className="space-y-1 text-yellow-600 font-mono">
                  <div>len(inputs.items) &gt; 0</div>
                  <div>inputs.score &gt; 80 and inputs.verified</div>
                  <div>inputs.country == "FR" or inputs.vip</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Your Condition</h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={runTest}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Run Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Test Input */}
          <div>
            <label className="block text-gray-700 mb-1">
              Test Input (JSON)
            </label>
            <textarea
              value={testInput || ''}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={8}
              placeholder={JSON.stringify({
                temperature: 75,
                status: "success",
                items: ["item1", "item2"],
                verified: true
              }, null, 2)}
            />
            <div className="text-xs text-gray-500 mt-1">
              Provide JSON data that matches the structure expected by your condition
            </div>
          </div>

          {/* Test Result */}
          <div>
            <label className="block text-gray-700 mb-1">Test Result</label>
            <div className="h-48 p-3 border border-gray-300 rounded-lg bg-gray-50">
              {testResult ? (
                <div className={`p-3 rounded-md ${
                  testResult.success 
                    ? testResult.result 
                      ? 'bg-green-100 border border-green-200 text-green-800' 
                      : 'bg-red-100 border border-red-200 text-red-800'
                    : 'bg-gray-100 border border-gray-200 text-gray-800'
                }`}>
                  {testResult.success ? (
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="font-bold text-lg">
                          {testResult.result ? '✅ TRUE' : '❌ FALSE'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div className="mb-1">
                          <span className="font-medium">Flow Path:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                            testResult.result 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {testResult.path.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          The workflow will continue through the <strong>{testResult.path}</strong> output handle.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-red-700 mb-2">❌ Error</div>
                      <div className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded">
                        {testResult.error}
                      </div>
                      <div className="text-xs text-red-500 mt-2">
                        Check your condition syntax and test input format.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm">Run a test to see results</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Test Inputs */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Saved Test Inputs</h4>
            <div className="flex items-center space-x-2">
              <select
                className="text-sm border border-gray-300 rounded-md p-2"
                onChange={(e) => {
                  if (e.target.value) {
                    const selected = savedTestInputs.find(item => item.name === e.target.value);
                    if (selected) {
                      setTestInput(selected.input);
                    }
                  }
                }}
                value=""
              >
                <option value="">Load saved input...</option>
                {savedTestInputs.map((item, index) => (
                  <option key={index} value={item.name}>{item.name}</option>
                ))}
              </select>
              
              <button
                type="button"
                onClick={saveTestInput}
                className="inline-flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Input
              </button>
            </div>
          </div>

          {savedTestInputs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {savedTestInputs.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setTestInput(item.input)}
                  className="p-2 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp || Date.now()).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Tips for Testing
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Test with various input scenarios to ensure your logic works correctly</li>
            <li>• Use realistic data that matches what previous nodes will actually output</li>
            <li>• Test both TRUE and FALSE cases to verify both paths work as expected</li>
            <li>• Save frequently used test inputs for quick access during development</li>
            <li>• Consider edge cases like empty arrays, null values, or missing properties</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

LogicEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  testInput: PropTypes.string,
  setTestInput: PropTypes.func.isRequired,
  testResult: PropTypes.object,
  setTestResult: PropTypes.func.isRequired,
  savedTestInputs: PropTypes.array.isRequired,
  saveTestInput: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array
};

export default LogicEditor;