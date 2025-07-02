import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import SmartOutputEditor from './SmartOutputEditor'; 
import { LLMConfigSection } from './shared/LLMConfigSection';
import { toast } from 'react-hot-toast';
import { AVAILABLE_LLM_PROVIDERS, LLM_MODELS, normalizeOutputData } from '../EditModall';
import { ApiKeyNavigator } from '../shared/ApiKeyNavigator';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import { outputNodeSchema } from './shared/nodeSchemas';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Button, FormControlLabel, Switch } from '@mui/material';

const OutputEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // ===== STATE MANAGEMENT =====
  const [isTestingIntegration, setIsTestingIntegration] = useState(false);
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // State for schema-driven core output config
  const [outputCoreConfig, setOutputCoreConfig] = useState({
    label: formData.label || '',
    description: formData.description || '',
    outputType: formData.outputType || 'text',
    defaultValue: formData.defaultValue || '',
    required: formData.required || false
  });

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});

  // ===== CONFIGURATION =====
  const outputTypes = [
    { value: 'webhook', label: '🔗 Webhook', description: 'Send to any webhook URL' },
    { value: 'discord', label: '💬 Discord', description: 'Post to Discord channel' },
    { value: 'sheets', label: '📊 Google Sheets', description: 'Append to spreadsheet' },
    { value: 'email', label: '📧 Email', description: 'Send via email' },
    { value: 'smart_api', label: '🤖 AI-Powered Integration', description: 'Let AI figure out the integration' },
    { value: 'smart_email', label: '🤖 Smart Email', description: 'AI-enhanced email formatting' },
  ];

  const services = {
    'slack': 'Slack', 'discord': 'Discord', 'email': 'Email', 'gmail': 'Gmail',
    'webhook': 'Webhook', 'api': 'API', 'database': 'Database', 'airtable': 'Airtable',
    'notion': 'Notion', 'sheets': 'Google Sheets', 'excel': 'Excel', 'csv': 'CSV', 'json': 'JSON'
  };

  // ===== COMPUTED VALUES =====
  const isSmartOutput = formData.outputType?.startsWith('smart_');
  const isTraditionalOutput = formData.outputType && !formData.outputType.startsWith('smart_');

  // ===== UTILITY FUNCTIONS =====
  const extractServiceName = (description) => {
    if (!description) return '';
    const lowerDesc = description.toLowerCase();
    
    for (const [key, value] of Object.entries(services)) {
      if (lowerDesc.includes(key)) return value;
    }
    return 'Custom Service';
  };

  const getAvailableLLMs = () => {
    const providersWithKeys = availableApiKeys
      .filter(key => key.validation_status === 'valid')
      .map(key => key.provider);
    
    return AVAILABLE_LLM_PROVIDERS.filter(llm => 
      providersWithKeys.includes(llm.value)
    );
  };

  // ===== EVENT HANDLERS =====
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested config updates
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const updatedConfig = {
        ...formData[parent],
        [child]: value
      };
      
      handleInputChange({
        target: { name: parent, value: updatedConfig }
      });
      return;
    }

    // Handle direct field updates and config structure
    const config = formData.config || {};
    const configMappings = {
      email: 'email',
      webhookUrl: 'url',
      sheetId: 'sheet_id',
      ai_description: 'ai_description',
      service_type: 'service_type',
      output_format: 'output_format'
    };
    
    if (configMappings[name]) {
      config[configMappings[name]] = value;
      handleInputChange({
        target: { name: 'config', value: config }
      });
    }
    
    // Forward the original input change
    handleInputChange(e);
  };

  const handleTestSmartIntegration = async () => {
    if (!formData.outputType) {
      toast.error('Please select an output type first');
      return;
    }

    if (!formData.aiProvider) {
      toast.error('Please select an AI provider first');
      return;
    }

    try {
      setIsTestingIntegration(true);
      toast.loading('🤖 Testing smart integration...', { id: 'test-integration' });

      const testData = {
        sample: "test data",
        timestamp: new Date().toISOString(),
        source: "test"
      };
      
      const response = await fetch('http://localhost:8000/api/smart-output/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_type: formData.outputType,
          ai_config: {
            provider: formData.aiProvider,
            model: formData.aiModel,
            description: formData.description || 'Test integration'
          },
          data: testData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ Integration test successful! ${result.message || ''}`, {
          id: 'test-integration',
          duration: 4000
        });
      } else {
        const error = await response.text();
        toast.error(`❌ Test failed: ${error}`, {
          id: 'test-integration',
          duration: 4000
        });
      }
    } catch (error) {
      toast.error(`❌ Test error: ${error.message}`, {
        id: 'test-integration',
        duration: 4000
      });
    } finally {
      setIsTestingIntegration(false);
    }
  };

  // Handler for schema form changes
  const handleCoreConfigChange = (newConfig) => {
    setOutputCoreConfig(newConfig);
  };

  // Handler for schema validation
  const handleValidationError = (hasErrors) => {
    setValidationErrors(hasErrors);
  };

  // Handler for save
  const handleSave = () => {
    if (validationErrors) {
      alert('Please fix validation errors before saving.');
      return;
    }
    onSave({
      ...formData,
      ...outputCoreConfig
    });
  };

  // Handler for field mapping changes
  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
    handleInputChange({ target: { name: 'field_mappings', value: newMappings } });
  };

  const handleOutputTypeChange = (e) => {
    const newOutputType = e.target.value;
    handleInputChange({ target: { name: 'output_type', value: newOutputType } });
    
    // Reset config when output type changes
    handleInputChange({ target: { name: 'config', value: {} } });
  };

  // ===== EFFECTS =====
  // Load API Keys from BYOK Manager
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        const result = await response.json();
        
        if (result.success && result.data?.api_keys) {
          setAvailableApiKeys(result.data.api_keys);
          setApiKeyError(null);
        } else {
          setApiKeyError('Failed to load API keys');
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Failed to load API keys from BYOK Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []);

  // Clean up form data when output type changes
  useEffect(() => {
    if (formData.outputType) {
      const updatedFormData = { ...formData };
      
      // Clear fields not related to selected output type
      const fieldsToDelete = {
        webhook: ['email', 'sheetId'],
        email: ['webhookUrl', 'sheetId'],
        discord: ['email', 'sheetId'],
        sheets: ['email', 'webhookUrl'],
        smart_: ['email', 'webhookUrl', 'sheetId'] // For any smart_ type
      };

      const outputType = formData.outputType;
      let fieldsToRemove = [];

      if (outputType.startsWith('smart_')) {
        fieldsToRemove = fieldsToDelete.smart_;
      } else {
        fieldsToRemove = fieldsToDelete[outputType] || [];
      }

      fieldsToRemove.forEach(field => delete updatedFormData[field]);
      
      // Ensure config object exists
      if (!updatedFormData.config) {
        updatedFormData.config = {};
      }
      
      handleInputChange({
        target: { name: 'formData', value: updatedFormData }
      });
    }
  }, [formData.outputType]);

  // Auto-inject API key when provider is selected
  useEffect(() => {
    const selectedProvider = formData.aiProvider;
    if (selectedProvider && availableApiKeys.length > 0) {
      const apiKey = availableApiKeys.find(key => 
        key.provider === selectedProvider && key.validation_status === 'valid'
      );
      if (apiKey) {
        console.log(`Auto-injected API key for ${selectedProvider}`);
      }
    }
  }, [formData.aiProvider, availableApiKeys]);

  // Keep fieldMappings in sync with formData
  useEffect(() => {
    setFieldMappings(formData.field_mappings || {});
  }, [formData.field_mappings]);

  // Sync local state with formData when formData changes (fix for re-editing)
  useEffect(() => {
    // Reset local state to match formData
    setShowAdvanced(formData.showAdvanced || false);
    setValidationErrors(formData.validationErrors || {});
    
    // Sync field mappings
    setFieldMappings(formData.field_mappings || {});
    
    // Update output core config
    setOutputCoreConfig({
      label: formData.label || '',
      description: formData.description || '',
      outputType: formData.outputType || 'text',
      defaultValue: formData.defaultValue || '',
      required: formData.required || false
    });
    
    console.log('OutputEditor: Synced with form data:', formData);
  }, [formData]);

  // ===== RENDER FUNCTIONS =====
  const renderBYOKStatus = () => {
    if (!isSmartOutput) return null;

    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700">Loading your API keys for AI integration...</span>
          </div>
        </div>
      );
    }

    if (apiKeyError) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-sm text-red-700">{apiKeyError}</span>
          </div>
        </div>
      );
    }

    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    
    if (validKeys.length === 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-700 text-sm">
              ⚠️ No API keys configured
            </span>
            <ApiKeyNavigator 
              variant="button"
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Add API Key
            </ApiKeyNavigator>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">🔑</span>
            <span className="text-sm text-green-700">
              AI integration ready with {validKeys.length} API key{validKeys.length > 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded text-sm"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  };

  const renderTraditionalOutputConfig = () => {
    if (!isTraditionalOutput) return null;

    const configs = {
      webhook: (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Webhook URL</label>
            <input
              type="text"
              name="webhookUrl"
              value={formData.webhookUrl || ''}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
              placeholder="https://api.telegram.org/bot{TOKEN}/sendMessage"
            />
            <p className="text-xs text-gray-500 mt-1">
              The URL where output data will be sent via a POST request.
            </p>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">HTTP Method</label>
            <select
              name="webhookMethod"
              value={formData.webhookMethod || 'POST'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Headers (JSON)</label>
            <textarea
              name="webhookHeaders"
              value={formData.webhookHeaders || '{\n  "Content-Type": "application/json"\n}'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={3}
              placeholder='{"Content-Type": "application/json"}'
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Payload (JSON)</label>
            <textarea
              name="webhookPayload"
              value={formData.webhookPayload || '{\n  "chat_id": "YOUR_CHAT_ID",\n  "text": "{{message}}",\n  "parse_mode": "Markdown"\n}'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={6}
              placeholder='{"message": "{{output}}", "timestamp": "{{timestamp}}"}'
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2">🤖 Telegram Bot Quick Setup</h4>
            <p className="text-sm text-blue-700 mb-2">For Telegram bots, use this configuration:</p>
            <div className="space-y-2 text-xs">
              <div><strong>URL:</strong> <code className="bg-white px-1 rounded">https://api.telegram.org/bot{'{TOKEN}'}/sendMessage</code></div>
              <div className="text-blue-600">Replace <code>YOUR_CHAT_ID</code> with your actual Telegram chat ID.</div>
            </div>
          </div>
        </div>
      ),

      discord: (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Discord Webhook URL</label>
          <input
            type="text"
            name="webhookUrl"
            value={formData.webhookUrl || ''}
            onChange={handleFormChange}
            className="w-full p-2 border rounded"
            placeholder="Discord webhook URL"
          />
          <p className="text-xs text-gray-500 mt-1">
            Discord webhook URL to send notifications to a Discord channel.
          </p>
        </div>
      ),

      sheets: (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Sheet ID</label>
          <input
            type="text"
            name="sheetId"
            value={formData.sheetId || ''}
            onChange={handleFormChange}
            className="w-full p-2 border rounded"
            placeholder="Google Sheet ID"
          />
          <p className="text-xs text-gray-500 mt-1">
            The ID of your Google Sheet where data should be appended.
          </p>
        </div>
      ),

      email: (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
              placeholder="recipient@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address where output will be sent.
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Subject (Optional)</label>
            <input
              type="text"
              name="subject"
              value={formData.subject || 'Workflow Results'}
              onChange={handleFormChange}
              className="w-full p-2 border rounded"
              placeholder="Email Subject"
            />
          </div>
        </div>
      )
    };

    return configs[formData.outputType] || null;
  };

  const renderSmartModePromotion = () => {
    if (!isTraditionalOutput) return null;

    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-blue-800 mb-1">💡 Want AI to help?</h4>
            <p className="text-sm text-blue-700">
              Switch to <strong>🤖 AI-Powered Integration</strong> to describe what you want in plain English
              instead of configuring URLs and settings manually.
            </p>
          </div>
          <button
            onClick={() => handleInputChange({
              target: { name: 'outputType', value: 'smart_api' }
            })}
            className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Try AI Mode
          </button>
        </div>
      </div>
    );
  };

  const renderOutputSpecificFields = () => {
    const outputType = formData.output_type;

    switch (outputType) {
      case 'api':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="API Endpoint"
              placeholder="https://api.example.com/endpoint"
              value={formData.config?.endpoint || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, endpoint: e.target.value }
                }
              })}
            />
            <FormControl fullWidth>
              <InputLabel>HTTP Method</InputLabel>
              <Select
                value={formData.config?.method || 'POST'}
                onChange={(e) => handleInputChange({
                  target: { 
                    name: 'config', 
                    value: { ...formData.config, method: e.target.value }
                  }
                })}
                label="HTTP Method"
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
                <MenuItem value="PATCH">PATCH</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Headers (JSON)"
              placeholder='{"Content-Type": "application/json"}'
              value={JSON.stringify(formData.config?.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  handleInputChange({
                    target: { 
                      name: 'config', 
                      value: { ...formData.config, headers }
                    }
                  });
                } catch (error) {
                  // Allow invalid JSON during typing
                }
              }}
              multiline
              rows={3}
            />
          </Box>
        );

      case 'webhook':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Webhook URL"
              placeholder="https://webhook.site/your-unique-id"
              value={formData.config?.url || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, url: e.target.value }
                }
              })}
            />
            <FormControl fullWidth>
              <InputLabel>HTTP Method</InputLabel>
              <Select
                value={formData.config?.method || 'POST'}
                onChange={(e) => handleInputChange({
                  target: { 
                    name: 'config', 
                    value: { ...formData.config, method: e.target.value }
                  }
                })}
                label="HTTP Method"
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 'email':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="To Email"
              placeholder="recipient@example.com"
              value={formData.config?.to_email || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, to_email: e.target.value }
                }
              })}
            />
            <TextField
              fullWidth
              label="Subject"
              placeholder="Email subject"
              value={formData.config?.subject || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, subject: e.target.value }
                }
              })}
            />
            <TextField
              fullWidth
              label="Email Template"
              placeholder="Email body template"
              value={formData.config?.template || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, template: e.target.value }
                }
              })}
              multiline
              rows={4}
            />
          </Box>
        );

      case 'file':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="File Path"
              placeholder="/path/to/output/file.json"
              value={formData.config?.file_path || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, file_path: e.target.value }
                }
              })}
            />
            <FormControl fullWidth>
              <InputLabel>File Format</InputLabel>
              <Select
                value={formData.config?.format || 'json'}
                onChange={(e) => handleInputChange({
                  target: { 
                    name: 'config', 
                    value: { ...formData.config, format: e.target.value }
                  }
                })}
                label="File Format"
              >
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="txt">Text</MenuItem>
                <MenuItem value="xml">XML</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 'database':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Database URL"
              placeholder="postgresql://user:pass@localhost/db"
              value={formData.config?.database_url || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, database_url: e.target.value }
                }
              })}
            />
            <TextField
              fullWidth
              label="Table Name"
              placeholder="output_table"
              value={formData.config?.table_name || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, table_name: e.target.value }
                }
              })}
            />
          </Box>
        );

      case 'notification':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Notification Title"
              placeholder="Workflow completed"
              value={formData.config?.title || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, title: e.target.value }
                }
              })}
            />
            <TextField
              fullWidth
              label="Notification Message"
              placeholder="Your workflow has completed successfully"
              value={formData.config?.message || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, message: e.target.value }
                }
              })}
              multiline
              rows={3}
            />
          </Box>
        );

      case 'custom':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Custom Configuration (JSON)"
              placeholder='{"custom_field": "value"}'
              value={JSON.stringify(formData.config || {}, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  handleInputChange({
                    target: { 
                      name: 'config', 
                      value: config
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

      default:
        return <Typography color="text.secondary">Select an output type to configure</Typography>;
    }
  };

  // ===== MAIN RENDER =====
  return (
    <Box sx={{ p: 3 }}>
      {/* Core Output Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Output Configuration
        </Typography>
        
        <TextField
          fullWidth
          label="Output Name"
          value={formData.label || ''}
          onChange={(e) => handleInputChange({ target: { name: 'label', value: e.target.value } })}
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          label="Description"
          placeholder="What does this output do?"
          value={formData.description || ''}
          onChange={(e) => handleInputChange({ target: { name: 'description', value: e.target.value } })}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Output Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Output Type
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Select Output Type</InputLabel>
          <Select
            value={formData.output_type || ''}
            onChange={handleOutputTypeChange}
            label="Select Output Type"
          >
            <MenuItem value="api">API Call</MenuItem>
            <MenuItem value="webhook">Webhook</MenuItem>
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="database">Database</MenuItem>
            <MenuItem value="notification">Notification</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Output-Specific Configuration */}
      {formData.output_type && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>
          {renderOutputSpecificFields()}
        </Box>
      )}

      {/* Field Mapper for explicit mapping */}
      <FieldMapper
        nodeId={nodeId}
        nodeType="output"
        currentMappings={fieldMappings}
        onMappingChange={handleFieldMappingChange}
        connectedNodes={connectedNodes}
        previousNodeOutputs={previousNodeOutputs}
      />

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
              label="Retry Count"
              type="number"
              inputProps={{ min: 0, max: 10 }}
              value={formData.config?.retry_count || 3}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'config', 
                  value: { ...formData.config, retry_count: parseInt(e.target.value) }
                }
              })}
              sx={{ mb: 2 }}
            />
            
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

      {/* Save Button */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Output
        </Button>
      </Box>
    </Box>
  );
};

OutputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default OutputEditor;