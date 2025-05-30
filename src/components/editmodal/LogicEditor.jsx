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
  },
  // NEW: Trigger-specific templates
  {
    name: 'Trigger Activated',
    description: 'Check if trigger was successfully activated',
    conditions: [{ field: '', operator: '==', value: 'true', logicType: 'AND' }],
    category: 'trigger',
    icon: '🔄'
  },
  {
    name: 'New Data Available',
    description: 'Check if trigger detected new data changes',
    conditions: [
      { field: '', operator: '==', value: 'true', logicType: 'AND' }, // has_changes
      { field: '', operator: '>', value: '0', logicType: 'AND' } // new_records_count
    ],
    category: 'trigger',
    icon: '📊'
  },
  {
    name: 'API Data Threshold',
    description: 'Only proceed if enough new records were found',
    conditions: [{ field: '', operator: '>=', value: '5', logicType: 'AND' }], // new_records_count >= 5
    category: 'trigger',
    icon: '📈'
  },
  {
    name: 'Service Health Check',
    description: 'Verify API service is responding correctly',
    conditions: [
      { field: '', operator: '!=', value: 'error', logicType: 'AND' }, // service status
      { field: '', operator: 'contains', value: 'Retrieved', logicType: 'AND' } // data_summary contains "Retrieved"
    ],
    category: 'trigger',
    icon: '🏥'
  },
  {
    name: 'Crypto Price Alert',
    description: 'Trigger when crypto price exceeds threshold',
    conditions: [
      { field: '', operator: '>', value: '50000', logicType: 'AND' }, // price > $50k
      { field: '', operator: '>', value: '1000000', logicType: 'AND' } // volume > $1M
    ],
    category: 'crypto',
    icon: '💰'
  },
  {
    name: 'High Volume Trading',
    description: 'Detect high-volume trading activity',
    conditions: [
      { field: '', operator: '>', value: '500000', logicType: 'AND' }, // liquidity > $500k
      { field: '', operator: '>', value: '10', logicType: 'AND' } // new pairs > 10
    ],
    category: 'crypto',
    icon: '📊'
  },
  {
    name: 'Webhook Validation',
    description: 'Validate incoming webhook payload',
    conditions: [
      { field: '', operator: '!=', value: 'null', logicType: 'AND' }, // payload exists
      { field: '', operator: 'has_key', value: 'data', logicType: 'AND' } // has data key
    ],
    category: 'webhook',
    icon: '🔗'
  },
  {
    name: 'Error Detection',
    description: 'Detect and handle error conditions',
    conditions: [
      { field: '', operator: '==', value: 'error', logicType: 'OR' },
      { field: '', operator: 'contains', value: 'failed', logicType: 'OR' },
      { field: '', operator: '==', value: 'null', logicType: 'OR' }
    ],
    category: 'error',
    icon: '❌'
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
  const [conditions, setConditions] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [generatedCondition, setGeneratedCondition] = useState('');
  const [availableFields, setAvailableFields] = useState([]);
  const [showExamples, setShowExamples] = useState(false);
  const [showFieldGuide, setShowFieldGuide] = useState(false);

  // FIXED: Real field detection from connected nodes
  useEffect(() => {
    console.log('🔍 LogicEditor: Analyzing connected nodes:', connectedNodes);
    
    const detectRealFields = async () => {
      if (!connectedNodes || connectedNodes.length === 0) {
        console.log('🔍 No connected nodes found');
        setAvailableFields([]);
        return;
      }
      
      let detectedFields = [];
      
      for (const node of connectedNodes) {
        console.log('🔍 Processing connected node:', node);
        
        const nodeType = node.type;
        const nodeData = node.data || {};
        
        if (nodeType === 'trigger') {
          const triggerType = nodeData.triggerType;
          
          if (triggerType === 'universal_polling') {
            // REAL FIELD DETECTION: Use discovered fields if available
            if (nodeData.discoveredFields && nodeData.discoveredFields.length > 0) {
              console.log('🎯 Found discovered fields in trigger:', nodeData.discoveredFields);
              
              nodeData.discoveredFields.forEach(fieldPath => {
                detectedFields.push({
                  id: fieldPath,
                  type: 'dynamic',
                  description: `Discovered field from ${nodeData.serviceName || 'API'}`,
                  sample: 'detected_value',
                  source: 'discovered'
                });
              });
            }
            // FALLBACK: Try to get fields by calling the API
            else if (nodeData.apiEndpoint) {
              console.log('🔍 No discovered fields, attempting to fetch from API:', nodeData.apiEndpoint);
              
              try {
                const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling-simple', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    apiEndpoint: nodeData.apiEndpoint,
                    authType: nodeData.authType || 'none',
                    apiKey: nodeData.apiKey || '',
                    bearerToken: nodeData.bearerToken || '',
                    username: nodeData.username || '',
                    password: nodeData.password || '',
                    serviceName: nodeData.serviceName || 'Unknown API'
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.sample_data) {
                    console.log('🎯 Successfully fetched API data for field detection:', result.sample_data);
                    
                    // Extract fields from the actual API response
                    const extractedFields = extractFieldsFromApiData(result.sample_data, nodeData.serviceName);
                    console.log('🎯 Extracted fields from API:', extractedFields);
                    
                    extractedFields.forEach(field => {
                      detectedFields.push({
                        id: field,
                        type: 'dynamic',
                        description: `Field from ${nodeData.serviceName || 'API'} response`,
                        sample: 'api_value',
                        source: 'api_fetch'
                      });
                    });
                  }
                }
              } catch (error) {
                console.error('🔍 Failed to fetch API data for field detection:', error);
              }
            }
            
            // Add standard trigger fields
            detectedFields.push(
              {
                id: 'status',
                type: 'string',
                description: 'Trigger execution status',
                sample: 'success',
                source: 'standard'
              },
              {
                id: 'message',
                type: 'string',
                description: 'Trigger status message',
                sample: 'Data fetched successfully',
                source: 'standard'
              },
              {
                id: 'service_name',
                type: 'string',
                description: 'Name of the service',
                sample: nodeData.serviceName || 'API Service',
                source: 'standard'
              }
            );
          }
          else {
            // Other trigger types - basic fields
            detectedFields.push(
              {
                id: 'triggered',
                type: 'boolean',
                description: 'Whether trigger was activated',
                sample: true,
                source: 'standard'
              },
              {
                id: 'trigger_time',
                type: 'string',
                description: 'When trigger was activated',
                sample: '2024-01-01T12:00:00Z',
                source: 'standard'
              }
            );
          }
        }
        else if (nodeType === 'agent') {
          // Agent output fields
          detectedFields.push(
            {
              id: 'response',
              type: 'string',
              description: 'AI agent response text',
              sample: 'AI agent response',
              source: 'agent'
            },
            {
              id: 'status',
              type: 'string',
              description: 'Agent execution status',
              sample: 'completed',
              source: 'agent'
            }
          );
        }
        // Add other node types as needed
      }
      
      console.log('🎯 Final detected fields:', detectedFields);
      setAvailableFields(detectedFields);
    };
    
    detectRealFields();
  }, [connectedNodes]);
  
  // Helper function to extract fields from API data
  const extractFieldsFromApiData = (data, serviceName) => {
    const fields = [];
    
    try {
      // Handle CSV parsed data (Google Sheets)
      if (data.source === 'csv_parsed' && data.headers && data.records) {
        data.headers.forEach(header => {
          fields.push(`records[0].${header}`);
        });
        return fields;
      }
      
      // Handle Airtable format
      if (data.records && Array.isArray(data.records) && data.records.length > 0) {
        const firstRecord = data.records[0];
        if (firstRecord.fields) {
          Object.keys(firstRecord.fields).forEach(field => {
            fields.push(`records[0].fields.${field}`);
          });
        }
        return fields;
      }
      
      // Handle DexScreener format
      if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
        const extractNestedFields = (obj, prefix = '') => {
          if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
              const fieldPath = prefix ? `${prefix}.${key}` : key;
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                fields.push(fieldPath);
                extractNestedFields(value, fieldPath);
              } else {
                fields.push(fieldPath);
              }
            }
          }
        };
        extractNestedFields(data.pairs[0], 'pairs[0]');
        return fields;
      }
      
      // Handle direct array
      if (Array.isArray(data) && data.length > 0) {
        const extractNestedFields = (obj, prefix = '') => {
          if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
              const fieldPath = prefix ? `${prefix}.${key}` : key;
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                fields.push(fieldPath);
                extractNestedFields(value, fieldPath);
              } else {
                fields.push(fieldPath);
              }
            }
          }
        };
        extractNestedFields(data[0], '[0]');
        return fields;
      }
      
      // Handle generic object
      if (typeof data === 'object' && data !== null) {
        const extractNestedFields = (obj, prefix = '') => {
          if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
              const fieldPath = prefix ? `${prefix}.${key}` : key;
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                fields.push(fieldPath);
                extractNestedFields(value, fieldPath);
              } else {
                fields.push(fieldPath);
              }
            }
          }
        };
        extractNestedFields(data);
        return fields;
      }
      
    } catch (error) {
      console.error('🔍 Error extracting fields from API data:', error);
    }
    
    return fields;
  };

  // Universal logic examples for different use cases
  const logicExamples = {
    crypto: [
      {
        title: '🚀 Strong Buy Signal',
        condition: 'decision == "STRONG_BUY" && confidence > 0.8',
        description: 'Execute trade when AI is very confident about a strong buy signal',
        useCase: 'Crypto trading automation'
      },
      {
        title: '⚠️ Risk Management',
        condition: 'risk_score < 0.3 && red_flags.length == 0',
        description: 'Only proceed if risk is low and no red flags detected',
        useCase: 'Safe trading with risk controls'
      },
      {
        title: '📊 High Confidence Filter',
        condition: 'confidence > 0.75 && (decision == "BUY" || decision == "STRONG_BUY")',
        description: 'Filter for high-confidence buy decisions only',
        useCase: 'Quality over quantity trading'
      }
    ],
    business: [
      {
        title: '⭐ High-Quality Lead',
        condition: 'score > 80 && sentiment == "positive"',
        description: 'Route high-scoring leads with positive sentiment to sales team',
        useCase: 'Lead qualification and routing'
      },
      {
        title: '🔥 Urgent Response Needed',
        condition: 'priority == "high" && response_time < 24',
        description: 'Flag urgent items that need immediate attention',
        useCase: 'Customer support prioritization'
      },
      {
        title: '✅ Content Approval',
        condition: 'tone == "professional" && word_count > 100 && word_count < 500',
        description: 'Auto-approve content that meets quality standards',
        useCase: 'Content workflow automation'
      }
    ],
    general: [
      {
        title: '📈 Performance Threshold',
        condition: 'score >= 7 && status == "completed"',
        description: 'Route successful high-performing results',
        useCase: 'Quality control and filtering'
      },
      {
        title: '🎯 Multi-Condition Check',
        condition: 'confidence > 0.5 && execution_time < 10 && token_usage < 2000',
        description: 'Ensure good performance within resource limits',
        useCase: 'Efficiency and cost control'
      },
      {
        title: '🔍 Error Handling',
        condition: 'status == "completed" && response != ""',
        description: 'Only proceed if execution was successful with valid output',
        useCase: 'Robust error handling'
      }
    ]
  };

  // Field reference guide
  const fieldGuide = {
    'String Fields': {
      description: 'Text values that can be compared',
      examples: [
        'decision == "STRONG_BUY"',
        'status != "error"',
        'tone.includes("professional")',
        'response.startswith("Success")'
      ],
      operators: ['==', '!=', 'includes()', 'startswith()', 'endswith()']
    },
    'Number Fields': {
      description: 'Numeric values for mathematical comparisons',
      examples: [
        'confidence > 0.8',
        'score >= 75',
        'risk_score <= 0.3',
        'price < 100'
      ],
      operators: ['>', '>=', '<', '<=', '==', '!=']
    },
    'Array Fields': {
      description: 'Lists that can be checked for length or content',
      examples: [
        'red_flags.length == 0',
        'reasons.length > 2',
        'tags.includes("verified")',
        'categories != []'
      ],
      operators: ['.length', '.includes()', '== []', '!= []']
    },
    'Boolean Logic': {
      description: 'Combine multiple conditions',
      examples: [
        'condition1 && condition2',
        'condition1 || condition2',
        '!(condition)',
        '(condition1 || condition2) && condition3'
      ],
      operators: ['&&', '||', '!', '()', 'and', 'or', 'not']
    }
  };

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
    const validConditions = conditions.filter(c => c.field && c.operator && c.value !== '');
    
    if (validConditions.length === 0) return '';
    
    const conditionStrings = validConditions.map(condition => {
      const selectedField = availableFields.find(f => f.id === condition.field);
      const fieldPath = selectedField?.value || condition.fieldPath || `inputs.${condition.field}`;
      
      let value = condition.value;
      
      // Handle different value types
      if (condition.valueType === 'string' || selectedField?.type === 'string') {
        // For string comparisons, wrap in quotes unless it's already a variable reference
        if (!value.startsWith('inputs.') && !value.startsWith('"') && !value.startsWith("'")) {
          value = `"${value}"`;
        }
      } else if (selectedField?.type === 'number') {
        // Ensure numeric values are not quoted
        value = isNaN(Number(value)) ? value : Number(value);
      } else if (selectedField?.type === 'boolean') {
        // Handle boolean values
        value = value === 'true' || value === true ? 'true' : 'false';
      }
      
      // Generate condition based on operator
      switch (condition.operator) {
        case 'equals':
          return `${fieldPath} === ${value}`;
        case 'not_equals':
          return `${fieldPath} !== ${value}`;
        case 'greater_than':
          return `${fieldPath} > ${value}`;
        case 'less_than':
          return `${fieldPath} < ${value}`;
        case 'greater_equal':
          return `${fieldPath} >= ${value}`;
        case 'less_equal':
          return `${fieldPath} <= ${value}`;
        case 'contains':
          return `${fieldPath}.includes(${value})`;
        case 'not_contains':
          return `!${fieldPath}.includes(${value})`;
        case 'starts_with':
          return `${fieldPath}.startsWith(${value})`;
        case 'ends_with':
          return `${fieldPath}.endsWith(${value})`;
        case 'is_empty':
          return `!${fieldPath} || ${fieldPath} === ""`;
        case 'is_not_empty':
          return `${fieldPath} && ${fieldPath} !== ""`;
        default:
          return `${fieldPath} === ${value}`;
      }
    });
    
    // Join conditions with logical operators
    if (conditionStrings.length === 1) {
      return conditionStrings[0];
    }
    
    // Handle multiple conditions with AND/OR logic
    let result = conditionStrings[0];
    for (let i = 1; i < conditionStrings.length; i++) {
      const logicType = validConditions[i-1].logicType || 'AND';
      const operator = logicType === 'AND' ? '&&' : '||';
      result = `${result} ${operator} ${conditionStrings[i]}`;
    }
    
    return result;
  };

  const addCondition = () => {
    setConditions([...conditions, {
      id: Date.now(),
      field: '',
      operator: '',
      value: '',
      logicType: 'AND'
    }]);
  };

  const removeCondition = (id) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id, field, value) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const getOperatorsForField = (fieldId) => {
    const field = availableFields.find(f => f.id === fieldId);
    const baseOperators = [
      { value: 'equals', label: 'equals (==)' },
      { value: 'not_equals', label: 'not equals (!=)' }
    ];

    if (!field) return baseOperators;

    if (field.type === 'number') {
      return [
        ...baseOperators,
        { value: 'greater_than', label: 'greater than (>)' },
        { value: 'greater_equal', label: 'greater or equal (>=)' },
        { value: 'less_than', label: 'less than (<)' },
        { value: 'less_equal', label: 'less or equal (<=)' }
      ];
    }

    if (field.type === 'string') {
      return [
        ...baseOperators,
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'not contains' },
        { value: 'starts_with', label: 'starts with' },
        { value: 'ends_with', label: 'ends with' }
      ];
    }

    if (field.type === 'array') {
      return [
        { value: 'array_length_equals', label: 'array length equals' },
        { value: 'array_length_greater', label: 'array length greater' },
        { value: 'array_not_empty', label: 'array not empty' },
        { value: 'array_empty', label: 'array empty' },
        { value: 'contains', label: 'contains item' }
      ];
    }

    return baseOperators;
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

  const applyExample = (example) => {
    handleInputChange({
      target: { name: 'condition', value: example.condition }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Help */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">🧠 Logic Node - Universal Decision Making</h3>
        <p className="text-sm text-blue-700 mb-3">
          Create intelligent decision points in your workflow. Logic nodes evaluate conditions and route your workflow based on AI outputs, data values, or any other criteria.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
          >
            📚 View Examples
          </button>
          <button
            type="button"
            onClick={() => setShowFieldGuide(!showFieldGuide)}
            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded"
          >
            📖 Field Guide
          </button>
        </div>
      </div>

      {/* Examples Panel */}
      {showExamples && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">💡 Logic Examples by Use Case</h4>
          
          <div className="space-y-4">
            {Object.entries(logicExamples).map(([category, examples]) => (
              <div key={category} className="border rounded-lg p-3 bg-white">
                <h5 className="font-medium mb-2 capitalize">{category} Use Cases</h5>
                <div className="space-y-2">
                  {examples.map((example, idx) => (
                    <div key={idx} className="border-l-4 border-blue-300 pl-3 py-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h6 className="font-medium text-sm">{example.title}</h6>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded block my-1">
                            {example.condition}
                          </code>
                          <p className="text-xs text-gray-600">{example.description}</p>
                          <span className="text-xs text-blue-600 italic">{example.useCase}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyExample(example)}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded ml-2"
                        >
                          Use This
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Guide Panel */}
      {showFieldGuide && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">📖 Field Types & Operators Guide</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(fieldGuide).map(([type, info]) => (
              <div key={type} className="border rounded-lg p-3 bg-white">
                <h5 className="font-medium mb-2">{type}</h5>
                <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700">Examples:</span>
                  <div className="space-y-1 mt-1">
                    {info.examples.map((example, idx) => (
                      <code key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded block">
                        {example}
                      </code>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-xs font-medium text-gray-700">Operators:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {info.operators.map((op, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Logic Editor */}
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1 flex items-center font-medium">
            Logic Condition
            <HelpTooltip type="logic" field="condition" />
          </label>
          <textarea
            name="condition"
            value={formData.condition || ''}
            onChange={(e) => {
              console.log('🔍 Logic condition input changed:', e.target.value);
              handleInputChange(e);
            }}
            onFocus={() => console.log('🔍 Logic condition textarea focused')}
            onBlur={() => console.log('🔍 Logic condition textarea blurred')}
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows="4"
            placeholder="Enter your condition (e.g., records[0].Category == 'Hot' && records[0].Email.includes('@'))"
            style={{ zIndex: 1 }}
          />
          <div className="text-xs text-gray-500 mt-1">
            💡 Use field names from the detected fields above (e.g., records[0].Name, records[0].Category)
          </div>
        </div>

        {/* Visual Condition Builder */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">🎯 Visual Condition Builder</h4>
            <button
              type="button"
              onClick={addCondition}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
            >
              + Add Condition
            </button>
          </div>

          {conditions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Click "Add Condition" to build your logic visually, or write it directly above.
            </p>
          )}

          {conditions.map((condition, index) => (
            <div key={condition.id} className="flex items-center gap-2 mb-2 p-2 bg-white rounded border">
              {index > 0 && (
                <select
                  value={condition.logicType}
                  onChange={(e) => updateCondition(condition.id, 'logicType', e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
              
              <select
                value={condition.field}
                onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                className="flex-1 text-xs border rounded px-2 py-1"
              >
                <option value="">Select Field</option>
                {availableFields.map(field => (
                  <option key={field.id} value={field.id}>
                    {field.id} ({field.type}) - {field.description}
                  </option>
                ))}
              </select>
              
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="">Operator</option>
                {getOperatorsForField(condition.field).map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 text-xs border rounded px-2 py-1"
              />
              
              <button
                type="button"
                onClick={() => removeCondition(condition.id)}
                className="text-red-500 hover:text-red-700 text-xs px-2"
              >
                ✕
              </button>
            </div>
          ))}

          {conditions.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  const generated = generateConditionFromVisual();
                  handleInputChange({
                    target: { name: 'condition', value: generated }
                  });
                }}
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded"
              >
                📝 Generate Condition
              </button>
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                Preview: {generateConditionFromVisual() || 'Add conditions above'}
              </div>
            </div>
          )}
        </div>

        {/* Available Fields Display */}
        {availableFields.length > 0 && (
          <div className="border rounded-lg p-3 bg-blue-50">
            <h4 className="font-medium mb-2">🔍 Detected Fields from Connected Nodes</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableFields.map(field => (
                <div key={field.id} className="text-xs bg-white p-2 rounded border">
                  <div className="font-medium">{field.id}</div>
                  <div className="text-gray-600">{field.type}</div>
                  <div className="text-gray-500 italic">{field.description}</div>
                  <code className="text-blue-600">{JSON.stringify(field.sample)}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">💡 Quick Tips</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Use <code>&&</code> for AND logic, <code>||</code> for OR logic</li>
            <li>• String values need quotes: <code>decision == "STRONG_BUY"</code></li>
            <li>• Numbers don't need quotes: <code>confidence &gt; 0.8</code></li>
            <li>• Check arrays: <code>red_flags.length == 0</code></li>
            <li>• Combine conditions: <code>(condition1 || condition2) && condition3</code></li>
          </ul>
        </div>
      </div>

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