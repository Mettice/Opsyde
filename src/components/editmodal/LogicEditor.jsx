import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, ChevronDown, Code, Eye, Settings, Play, Save, BookOpen } from 'lucide-react';
import HelpTooltip from '../HelpTooltip';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import { logicNodeSchema } from './shared/nodeSchemas';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Button, FormControlLabel, Switch, Chip, Divider, Grid, Card, CardContent, IconButton, Tooltip } from '@mui/material';
import ResultDisplayCard from '../rich-content/renderers/ResultDisplayCard';

// Generic operators for all data types
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

// Generic condition templates
const conditionTemplates = [
  {
    name: 'Success Check',
    description: 'Check if operation was successful',
    conditions: [{ field: 'status', operator: '==', value: 'success' }]
  },
  {
    name: 'Threshold Check',
    description: 'Check if value exceeds threshold',
    conditions: [{ field: 'value', operator: '>', value: '100' }]
  },
  {
    name: 'Data Validation',
    description: 'Validate data exists and is not empty',
    conditions: [
      { field: 'data', operator: '!=', value: 'null' },
      { field: 'data', operator: 'not_empty', value: '' }
    ]
  },
  {
    name: 'Error Detection',
    description: 'Detect and handle error conditions',
    conditions: [
      { field: 'status', operator: '==', value: 'error' },
      { field: 'message', operator: 'contains', value: 'failed' }
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
  connectedNodes = [],
  previousNodeOutputs = {},
  nodeId,
  onSave,
  onClose,
  nodeType
}) => {
  const [buildMode, setBuildMode] = useState('visual');
  const [conditions, setConditions] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [availableFields, setAvailableFields] = useState([]);
  const [showExamples, setShowExamples] = useState(false);
  const [showFieldGuide, setShowFieldGuide] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);

  // State aligned with logicNodeSchema
  const [logicCoreConfig, setLogicCoreConfig] = useState({
    label: formData.label || '',
    description: formData.description || '',
    conditions: formData.conditions || [],
    operator: formData.operator || 'AND'
  });

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});

  // Sync local state with formData when formData changes (fix for re-editing)
  useEffect(() => {
    // Reset local state to match formData
    setBuildMode(formData.buildMode || 'visual');
    setConditions(formData.conditions || []);
    setShowTemplates(false);
    setShowExamples(false);
    setShowFieldGuide(false);
    setShowAdvanced(formData.showAdvanced || false);
    setValidationErrors({});
    
    // Sync core config
    setLogicCoreConfig({
      label: formData.label || '',
      description: formData.description || '',
      conditions: formData.conditions || [],
      operator: formData.operator || 'AND'
    });
    
    // Sync field mappings
    setFieldMappings(formData.field_mappings || {});
    
    console.log('LogicEditor: Synced with form data:', formData);
  }, [formData]);

  // Generic field detection from connected nodes
  useEffect(() => {
    const detectFields = () => {
      if (!connectedNodes || connectedNodes.length === 0) {
        setAvailableFields([]);
        return;
      }
      
      let detectedFields = [];
      
      for (const node of connectedNodes) {
        const nodeType = node.type;
        const nodeData = node.data || {};
        
        // Generic field detection based on node type
        if (nodeType === 'trigger') {
          detectedFields.push(
            {
              id: 'status',
              type: 'string',
              description: 'Trigger execution status',
              sample: 'success'
            },
            {
              id: 'data',
              type: 'object',
              description: 'Trigger output data',
              sample: {}
            },
            {
              id: 'message',
              type: 'string',
              description: 'Trigger status message',
              sample: 'Operation completed'
            }
          );
        }
        else if (nodeType === 'agent' || nodeType === 'task') {
          detectedFields.push(
            {
              id: 'response',
              type: 'string',
              description: 'AI response text',
              sample: 'AI generated response'
            },
            {
              id: 'status',
              type: 'string',
              description: 'Execution status',
              sample: 'completed'
            },
            {
              id: 'confidence',
              type: 'number',
              description: 'Confidence score',
              sample: 0.85
            }
          );
        }
        else if (nodeType === 'input') {
          detectedFields.push(
            {
              id: 'value',
              type: 'string',
              description: 'Input value',
              sample: 'user input'
            }
          );
        }
        
        // Add dynamic fields if available
        if (nodeData.outputFields && Array.isArray(nodeData.outputFields)) {
          nodeData.outputFields.forEach(field => {
            detectedFields.push({
              id: field.name || field,
              type: field.type || 'string',
              description: field.description || `Dynamic field from ${nodeType}`,
              sample: field.sample || 'dynamic_value'
            });
          });
        }
      }
      
      setAvailableFields(detectedFields);
    };
    
    detectFields();
  }, [connectedNodes]);

  // Handler for field mapping changes
  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
    handleInputChange({ target: { name: 'field_mappings', value: newMappings } });
  };
  
  const handleCoreConfigChange = (field, value) => {
  // Use the parent's handleInputChange directly
  if (handleInputChange) {
    handleInputChange(field, value);
  }
  };

  // Handle condition changes
  const handleConditionChange = (index, field, value) => {
    const updatedConditions = [...logicCoreConfig.conditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    handleCoreConfigChange('conditions', updatedConditions);
  };

  // Add new condition
  const addCondition = () => {
    const newCondition = {
      field: '',
      operator: '==',
      value: ''
    };
    const updatedConditions = [...logicCoreConfig.conditions, newCondition];
    handleCoreConfigChange('conditions', updatedConditions);
  };

  // Remove condition
  const removeCondition = (index) => {
    const updatedConditions = logicCoreConfig.conditions.filter((_, i) => i !== index);
    handleCoreConfigChange('conditions', updatedConditions);
  };

  // Apply template
  const applyTemplate = (template) => {
    handleCoreConfigChange('conditions', template.conditions);
    setShowTemplates(false);
  };

  // Test logic
  const testLogic = () => {
    try {
      const testData = JSON.parse(testInput || '{}');
      let result = true;
      
      if (logicCoreConfig.operator === 'OR') {
        result = logicCoreConfig.conditions.some(condition => {
          const fieldValue = testData[condition.field];
          return evaluateCondition(fieldValue, condition.operator, condition.value);
        });
      } else {
        result = logicCoreConfig.conditions.every(condition => {
          const fieldValue = testData[condition.field];
          return evaluateCondition(fieldValue, condition.operator, condition.value);
        });
      }
      
      setTestResult({
        success: true,
        result: result,
        message: `Logic evaluation: ${result ? 'TRUE' : 'FALSE'}`
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };

  // Evaluate individual condition
  const evaluateCondition = (fieldValue, operator, expectedValue) => {
    switch (operator) {
      case '==':
        return fieldValue == expectedValue;
      case '!=':
        return fieldValue != expectedValue;
      case '>':
        return Number(fieldValue) > Number(expectedValue);
      case '<':
        return Number(fieldValue) < Number(expectedValue);
      case '>=':
        return Number(fieldValue) >= Number(expectedValue);
      case '<=':
        return Number(fieldValue) <= Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(expectedValue);
      case 'starts_with':
        return String(fieldValue).startsWith(expectedValue);
      case 'ends_with':
        return String(fieldValue).endsWith(expectedValue);
      default:
        return false;
    }
  };

  const handleConditionTypeChange = (e) => {
    const newConditionType = e.target.value;
    handleInputChange({ target: { name: 'condition_type', value: newConditionType } });
    
    // Reset condition when type changes
    handleInputChange({ target: { name: 'condition', value: '' } });
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const nodePayload = {
        ...formData,
        type: nodeType || formData.type || 'logic',
        id: nodeId || formData.id || formData.nodeId || ''
      };
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_data: nodePayload, test_inputs: {} })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.result || data.output || data);
      } else {
        setTestError(data.error || 'Test failed');
      }
    } catch (err) {
      setTestError(err.message || 'Test failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Core Logic Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Logic Configuration
        </Typography>
        
        <TextField
          fullWidth
          label="Description"
          placeholder="What does this logic condition do?"
          value={formData.description || ''}
          onChange={(e) => handleInputChange({ target: { name: 'description', value: e.target.value } })}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Condition Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Condition Type
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Select Condition Type</InputLabel>
          <Select
            value={formData.condition_type || ''}
            onChange={handleConditionTypeChange}
            label="Select Condition Type"
          >
            <MenuItem value="if_else">If/Else</MenuItem>
            <MenuItem value="switch">Switch</MenuItem>
            <MenuItem value="loop">Loop</MenuItem>
            <MenuItem value="filter">Filter</MenuItem>
            <MenuItem value="custom">Custom Expression</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Condition Configuration */}
      {formData.condition_type && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Condition
          </Typography>
          {renderConditionFields(formData, handleInputChange)}
        </Box>
      )}

      {/* Field Mapper for explicit mapping */}
      <FieldMapper
        nodeId={nodeId || 'logic-node'}
        nodeType="logic"
        currentMappings={fieldMappings}
        onMappingChange={handleFieldMappingChange}
        connectedNodes={connectedNodes}
        previousNodeOutputs={previousNodeOutputs}
      />

      {/* Test Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Configuration
        </Typography>
        <TextField
          fullWidth
          label="Test Input (JSON)"
          placeholder='{"input_a": "value1", "input_b": "value2"}'
          value={testInput || ''}
          onChange={(e) => setTestInput(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={testLogic}
          disabled={!formData.condition}
          sx={{ mr: 1 }}
        >
          Test Logic
        </Button>
        <Button
          variant="outlined"
          onClick={saveTestInput}
          disabled={!testInput}
        >
          Save Test Input
        </Button>
      </Box>

      {/* Test Results */}
      {testResult && (
        <div className="mt-2">
          <ResultDisplayCard
            content={testResult}
            title="Test Result"
            colorScheme="blue"
            defaultExpanded={false}
            showMetrics={true}
            metadata={{
              nodeType: 'logic',
              testType: 'preview'
            }}
          />
        </div>
      )}

      {/* Advanced Options */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          onClick={() => setShowAdvanced(!showAdvanced)}
          startIcon={<span>{showAdvanced ? '▼' : '▶'}</span>}
        >
          Advanced Options
        </Button>
        {showAdvanced && (
          <Box sx={{ mt: 2, pl: 2 }}>
            <TextField
              fullWidth
              label="Timeout (seconds)"
              type="number"
              inputProps={{ min: 1, max: 300 }}
              value={formData.config?.timeout || 30}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, timeout: parseInt(e.target.value) }
                }
              })}
              sx={{ mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.config?.async_execution || false}
                  onChange={(e) => handleInputChange({
                    target: { 
                      name: 'config', 
                      value: { ...formData.config, async_execution: e.target.checked }
                    }
                  })}
                />
              }
              label="Execute asynchronously"
            />
          </Box>
        )}
      </Box>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Validation Errors:
          </Typography>
          {Object.entries(validationErrors).map(([field, error]) => (
            <Typography key={field} variant="body2" color="error">
              {field}: {error}
            </Typography>
          ))}
        </Box>
      )}

      <div className="mt-4">
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={testLoading}
        >
          {testLoading ? 'Testing...' : 'Test/Preview'}
        </button>
        {testError && (
          <div className="mt-2 text-red-600">{testError}</div>
        )}
      </div>
    </Box>
  );
};

const renderConditionFields = (formData, handleInputChange) => {
  const conditionType = formData.condition_type;

  switch (conditionType) {
    case 'if_else':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Condition Expression"
            placeholder="input_a > 10 && input_b === 'active'"
            value={formData.condition || ''}
            onChange={(e) => handleInputChange({ target: { name: 'condition', value: e.target.value } })}
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="True Output"
            placeholder="'success'"
            value={formData.config?.true_output || ''}
            onChange={(e) => handleInputChange({
              target: { 
                name: 'config', 
                value: { ...formData.config, true_output: e.target.value }
              }
            })}
          />
          <TextField
            fullWidth
            label="False Output"
            placeholder="'failure'"
            value={formData.config?.false_output || ''}
            onChange={(e) => handleInputChange({
              target: { 
                name: 'config', 
                value: { ...formData.config, false_output: e.target.value }
              }
            })}
          />
        </Box>
      );

    case 'switch':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Switch Expression"
            placeholder="input_a"
            value={formData.condition || ''}
            onChange={(e) => handleInputChange({ target: { name: 'condition', value: e.target.value } })}
          />
          <TextField
            fullWidth
            label="Cases (JSON)"
            placeholder='{"case1": "output1", "case2": "output2", "default": "default_output"}'
            value={JSON.stringify(formData.config?.cases || {}, null, 2)}
            onChange={(e) => {
              try {
                const cases = JSON.parse(e.target.value);
                handleInputChange({
                  target: { 
                    name: 'config', 
                    value: { ...formData.config, cases }
                  }
                });
              } catch (error) {
                // Allow invalid JSON during typing
              }
            }}
            multiline
            rows={4}
          />
        </Box>
      );

    case 'loop':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Loop Condition"
            placeholder="i < input_a.length"
            value={formData.condition || ''}
            onChange={(e) => handleInputChange({ target: { name: 'condition', value: e.target.value } })}
          />
          <TextField
            fullWidth
            label="Loop Body"
            placeholder="input_a[i] * 2"
            value={formData.config?.loop_body || ''}
            onChange={(e) => handleInputChange({
              target: { 
                name: 'config', 
                value: { ...formData.config, loop_body: e.target.value }
              }
            })}
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Max Iterations"
            type="number"
            inputProps={{ min: 1, max: 1000 }}
            value={formData.config?.max_iterations || 100}
            onChange={(e) => handleInputChange({
              target: { 
                name: 'config', 
                value: { ...formData.config, max_iterations: parseInt(e.target.value) }
              }
            })}
          />
        </Box>
      );

    case 'filter':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Filter Condition"
            placeholder="item.status === 'active'"
            value={formData.condition || ''}
            onChange={(e) => handleInputChange({ target: { name: 'condition', value: e.target.value } })}
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Input Array Path"
            placeholder="input_a"
            value={formData.config?.input_path || ''}
            onChange={(e) => handleInputChange({
              target: { 
                name: 'config', 
                value: { ...formData.config, input_path: e.target.value }
              }
            })}
          />
        </Box>
      );

    case 'custom':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Custom Expression"
            placeholder="Custom JavaScript expression"
            value={formData.condition || ''}
            onChange={(e) => handleInputChange({ target: { name: 'condition', value: e.target.value } })}
            multiline
            rows={4}
          />
          <Typography variant="body2" color="text.secondary">
            Use JavaScript expressions. Available variables: input_a, input_b, and any mapped fields.
          </Typography>
        </Box>
      );

    default:
      return <Typography color="text.secondary">Select a condition type to configure</Typography>;
  }
};

LogicEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  testInput: PropTypes.string,
  setTestInput: PropTypes.func,
  testResult: PropTypes.object,
  setTestResult: PropTypes.func,
  savedTestInputs: PropTypes.array,
  saveTestInput: PropTypes.func,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  nodeType: PropTypes.string
};

export default LogicEditor;