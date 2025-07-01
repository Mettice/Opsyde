// Enhanced ToolEditor.jsx - Modern Enterprise Design
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';
import { toast } from 'react-hot-toast';
import EnhancedFrameworkSelector from '../toolTemplates/EnhancedFrameworkSelector';
import { ApiKeyNavigator } from '../shared/ApiKeyNavigator';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import FieldMapper from './shared/FieldMapper';
import { toolNodeSchema } from './shared/nodeSchemas';
import { normalizeToolData } from '../EditModall';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useBuilderUI } from '../../contexts/BuilderUIContext';
import { useFlow } from '../../contexts/FlowContext';

const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ],
  perplexity: [
    { value: 'sonar-pro', label: 'Sonar Pro' },
    { value: 'sonar', label: 'Sonar' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning' },
    { value: 'r1-1776', label: 'R1-1776' }
  ],
  openrouter: [
    { value: 'openai/gpt-4', label: 'GPT-4 (via OpenRouter)' },
    { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus (via OpenRouter)' },
    { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B' }
  ],
  huggingface: [
    { value: 'microsoft/DialoGPT-medium', label: 'DialoGPT Medium' },
    { value: 'microsoft/phi-2', label: 'Phi-2' },
    { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B' }
  ]
};

const ToolEditor = ({ 
  formData, 
  handleInputChange, 
  handleFrameworkChange,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  savedTestInputs,
  saveTestInput,
  connectedNodes = []
}) => {
  const { showEditModal } = useBuilderUI();
  const { nodes, edges } = useFlow();
  const [configMode, setConfigMode] = useState('schema');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [clarificationNeeded, setClarificationNeeded] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [clarificationInput, setClarificationInput] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [authInfo, setAuthInfo] = useState({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyValidationLoading, setApiKeyValidationLoading] = useState(false);

  // Field Mapping State
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});
  const [previousNodeOutputs, setPreviousNodeOutputs] = useState({});
  
  // Get connected nodes and their outputs
  useEffect(() => {
    const getConnectedNodes = () => {
      const connected = [];
      edges.forEach(edge => {
        if (edge.target === formData.id) {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode) {
            connected.push(sourceNode);
          }
        }
      });
      return connected;
    };

    const connectedNodes = getConnectedNodes();
    
    // Simulate previous node outputs (in real app, this would come from workflow execution)
    const mockOutputs = {};
    connectedNodes.forEach(connectedNode => {
      if (connectedNode.type === 'agent') {
        mockOutputs[connectedNode.id] = {
          response: 'Sample agent response',
          confidence: 0.95,
          metadata: { model: 'gpt-4', tokens_used: 150 }
        };
      } else if (connectedNode.type === 'task') {
        mockOutputs[connectedNode.id] = {
          result: 'Sample task result',
          context: { input_data: 'Sample context' }
        };
      } else if (connectedNode.type === 'trigger') {
        mockOutputs[connectedNode.id] = {
          trigger_data: { event: 'webhook_received', timestamp: new Date().toISOString() },
          api_data: { records: [], total: 0 }
        };
      }
    });
    
    setPreviousNodeOutputs(mockOutputs);
  }, [formData.id, nodes, edges]);

  useEffect(() => {
    loadApiKeys();
  }, []);

  useEffect(() => {
    if (availableApiKeys.length > 0) {
      setSelectedProvider(availableApiKeys[0].provider);
      setSelectedModel(availableApiKeys[0].model || 'gpt-4');
    } else {
      setSelectedProvider('');
      setSelectedModel('');
    }
  }, [availableApiKeys]);

  useEffect(() => {
    if (generatedConfig?.endpoints?.length) {
      setSelectedEndpoint(generatedConfig.endpoints[0]);
    }
  }, [generatedConfig]);

  useEffect(() => {
    if (selectedEndpoint) {
      handleInputChange({
        target: {
          name: 'framework_config',
          value: {
            ...formData.framework_config,
            endpoint: selectedEndpoint.path || selectedEndpoint.url || '',
            method: selectedEndpoint.method || selectedEndpoint.http_method || 'GET',
            sample_input: selectedEndpoint.sample_payload || {},
            required_params: selectedEndpoint.required_params || [],
          }
        }
      });
    }
  }, [selectedEndpoint]);

  useEffect(() => {
    if (generatedConfig?.protocol || generatedConfig?.api_type) {
      let framework = 'api';
      const proto = (generatedConfig.protocol || generatedConfig.api_type || '').toLowerCase();
      if (proto.includes('graphql')) framework = 'graphql';
      else if (proto.includes('soap')) framework = 'soap';
      else if (proto.includes('rest')) framework = 'api';
      handleInputChange({ target: { name: 'framework', value: framework } });
    }
  }, [generatedConfig]);

  const loadApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.api_keys) {
          setAvailableApiKeys(result.data.api_keys.filter(key => key.validation_status === 'valid'));
        }
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const getToolTypeIcon = (toolType) => {
    const icons = {
      'api': '🔗',
      'webhook': '🌐',
      'llm': '🤖',
      'custom': '💻',
      'universal_api': '🔗'
    };
    return icons[toolType] || '⚙️';
  };

  const getToolTypeLabel = (toolType) => {
    const labels = {
      'api': 'API Integration',
      'webhook': 'Webhook',
      'llm': 'LLM Tool',
      'custom': 'Custom Code',
      'universal_api': 'Universal API'
    };
    return labels[toolType] || toolType;
  };

  const getAvailableToolTypes = () => [
    { value: 'api', label: 'API Integration', description: 'Connect to REST APIs' },
    { value: 'webhook', label: 'Webhook', description: 'Send HTTP requests' },
    { value: 'llm', label: 'LLM Tool', description: 'Use AI models directly' },
    { value: 'custom', label: 'Custom Code', description: 'Write custom functions' },
    { value: 'universal_api', label: 'Universal API', description: 'AI-powered API discovery' }
  ];

  const getFrameworksForToolType = (toolType) => {
    const frameworks = {
      'api': [
        { value: 'api', label: 'Generic API' },
        { value: 'rest', label: 'REST API' },
        { value: 'graphql', label: 'GraphQL' }
      ],
      'webhook': [
        { value: 'webhook', label: 'Webhook' },
        { value: 'http', label: 'HTTP Request' }
      ],
      'llm': [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'perplexity', label: 'Perplexity' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'huggingface', label: 'HuggingFace' }
      ],
      'custom': [
        { value: 'python', label: 'Python' },
        { value: 'javascript', label: 'JavaScript' }
      ],
      'universal_api': [
        { value: 'universal_api', label: 'Universal API' }
      ]
    };
    return frameworks[toolType] || [];
  };

  const handleConfigModeChange = (mode) => {
    setConfigMode(mode);
    if (mode === 'manual') {
      // Clear AI-generated config when switching to manual
      setGeneratedConfig(null);
      setAiPrompt('');
    }
  };

  const handleToolTypeChange = (e) => {
    const newToolType = e.target.value;
    handleInputChange({ target: { name: 'tool_type', value: newToolType } });
    
    // Reset framework when tool type changes
    handleInputChange({ target: { name: 'framework', value: '' } });
    
    // Reset framework config when tool type changes
    handleInputChange({ target: { name: 'framework_config', value: {} } });
  };

  const generateAIConfig = async (customPrompt) => {
    const promptToSend = customPrompt !== undefined ? customPrompt : aiPrompt;
    if (!promptToSend.trim() || !selectedProvider) return;
    setIsGenerating(true);
    setClarificationNeeded(false);
    setClarificationQuestion('');
    setClarificationInput('');
    try {
      // Extract a meaningful service name from the prompt
      const serviceName = promptToSend.toLowerCase().includes('api') ? 'custom_api' : 'custom_service';
      const words = promptToSend.split(' ').slice(0, 3).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '');
      const descriptiveServiceName = words || 'custom_integration';
      const response = await fetch('/api/tools/research-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: descriptiveServiceName,
          description: promptToSend,
          selected_llm: { provider: selectedProvider, model: selectedModel }
        })
      });
      const data = await response.json();
      if (data.clarification_needed) {
        setClarificationNeeded(true);
        setClarificationQuestion(data.clarification_question || 'Could you clarify your intent?');
        setClarificationInput('');
        setGeneratedConfig(null);
      } else if (data.success) {
        setGeneratedConfig(data);
        setClarificationNeeded(false);
        setClarificationQuestion('');
        setClarificationInput('');
        toast.success('AI configuration generated successfully!');
      } else {
        setClarificationNeeded(false);
        setClarificationQuestion('');
        setClarificationInput('');
        setGeneratedConfig(null);
        toast.error(`Failed to generate AI configuration: ${data.error || data.clarification_question || 'Unknown error'}`);
      }
    } catch (error) {
      setClarificationNeeded(false);
      setClarificationQuestion('');
      setClarificationInput('');
      setGeneratedConfig(null);
      toast.error('Failed to generate AI configuration');
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptGeneratedConfig = () => {
    if (!generatedConfig) return;

    // Only show OAuth2 modal for 'oauth2'
    if (generatedConfig.auth_type === 'oauth2') {
      setShowAuthModal(true);
      setShowApiKeyModal(false);
      return;
    }
    // Show API Key/Bearer modal for 'bearer' or 'api_key'
    if (
      generatedConfig.auth_type === 'bearer' ||
      generatedConfig.auth_type === 'api_key'
    ) {
      setShowApiKeyModal(true);
      setShowAuthModal(false);
      return;
    }

    // If no auth or unknown, just apply config
    setShowAuthModal(false);
    setShowApiKeyModal(false);
    applyGeneratedConfig();
  };

  // Save OAuth2 info with validation
  const handleSaveAuthInfo = () => {
    if (!authInfo.clientId || !authInfo.clientSecret || !authInfo.scopes) {
      toast.error('All OAuth2 fields are required.');
      return;
    }
    handleInputChange({ target: { name: 'auth', value: authInfo } });
    setShowAuthModal(false);
  };

  const applyGeneratedConfig = (apiKey = null) => {
    if (!generatedConfig) return;

    try {
      const newConfig = {
        ...formData,
        tool_type: generatedConfig.api_type || 'api',
        framework: generatedConfig.api_type || 'api',
        framework_config: {
          endpoint: generatedConfig.base_url || '',
          method: generatedConfig.primary_method || 'GET',
          headers: generatedConfig.default_headers || {},
          auth_type: generatedConfig.auth_type || 'none',
          // Add sample input if available
          sample_input: generatedConfig.sample_input || {},
          ...(apiKey ? { api_key: apiKey } : {}),
        },
        config_mode: 'ai',
        ai_prompt: aiPrompt,
      };

      Object.keys(newConfig).forEach((key) => {
        handleInputChange({ target: { name: key, value: newConfig[key] } });
      });

      setConfigMode('manual');
      setGeneratedConfig(null);
      setAiPrompt('');
      toast.success('AI configuration applied successfully!');
      console.log('Applied AI configuration:', newConfig);
    } catch (error) {
      console.error('Error applying AI configuration:', error);
      toast.error('Failed to apply AI configuration');
    }
  };

  // Save API Key/Bearer Token and apply config
  const handleSaveApiKey = async () => {
    setApiKeyValidationLoading(true);
    try {
      // Validate the API key using the backend endpoint
      const provider = generatedConfig?.service_name || generatedConfig?.provider || generatedConfig?.auth_provider || 'custom_api';
      const response = await fetch('/api/user-settings/api-keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKeyInput })
      });
      const result = await response.json();
      if (result.valid) {
        setShowApiKeyModal(false);
        applyGeneratedConfig(apiKeyInput);
        setApiKeyInput('');
        toast.success('API key validated and saved!');
      } else {
        toast.error(result.error || 'API key validation failed. Please check your key/token.');
      }
    } catch (error) {
      toast.error('Error validating API key: ' + (error.message || error));
    } finally {
      setApiKeyValidationLoading(false);
    }
  };

  const renderModeToggle = () => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configuration Mode
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          variant={configMode === 'manual' ? 'contained' : 'outlined'}
          onClick={() => handleConfigModeChange('manual')}
        >
          ⚙️ Manual Configuration
        </Button>
        <Button
          variant={configMode === 'ai' ? 'contained' : 'outlined'}
          onClick={() => handleConfigModeChange('ai')}
        >
          🤖 AI-Powered Setup
        </Button>
      </Box>
    </Box>
  );

  const renderAIMode = () => (
    <Box sx={{ mb: 3 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Describe the tool you want to create, and AI will help configure it for you.
      </Alert>
      {/* Clarification Loop UI */}
      {clarificationNeeded ? (
        <Card sx={{ mb: 2, p: 2, background: '#fffbe6' }}>
          <CardContent>
            <Typography variant="subtitle1" color="warning.main" gutterBottom>
              🤔 AI needs clarification
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {clarificationQuestion}
            </Typography>
            <TextField
              fullWidth
              label="Your clarification"
              value={clarificationInput}
              onChange={e => setClarificationInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && clarificationInput.trim()) {
                  generateAIConfig(clarificationInput);
                }
              }}
              sx={{ mb: 2 }}
              disabled={isGenerating}
            />
            <Button
              variant="contained"
              onClick={() => generateAIConfig(clarificationInput)}
              disabled={!clarificationInput.trim() || isGenerating}
            >
              Submit Clarification
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {/* Standard AI config UI (hidden if clarification needed) */}
      {!clarificationNeeded && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Choose AI Model for Research *</Typography>
            {availableApiKeys.length === 0 ? (
              <Alert severity="warning">
                No AI models available. Please add API keys in BYOK Manager. <ApiKeyNavigator variant="button">Add Keys</ApiKeyNavigator>
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl fullWidth>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={selectedProvider}
                    onChange={e => {
                      setSelectedProvider(e.target.value);
                      const key = availableApiKeys.find(k => k.provider === e.target.value);
                      setSelectedModel(key?.model || 'gpt-4');
                    }}
                    label="Provider"
                  >
                    {availableApiKeys.map(key => (
                      <MenuItem key={key.provider} value={key.provider}>{key.provider}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    label="Model"
                  >
                    {(PROVIDER_MODELS[selectedProvider] || [{ value: 'gpt-4', label: 'gpt-4' }]).map(model => (
                      <MenuItem key={model.value} value={model.value}>
                        {model.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe your tool"
            placeholder="e.g., I want to connect to the OpenWeatherMap API to get current weather data for any city"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            sx={{ mb: 2 }}
            disabled={availableApiKeys.length === 0}
          />
          <Button
            variant="contained"
            onClick={() => generateAIConfig()}
            disabled={!aiPrompt.trim() || isGenerating || availableApiKeys.length === 0}
            startIcon={isGenerating ? <CircularProgress size={20} /> : <span>🤖</span>}
            sx={{ mb: 2 }}
          >
            {isGenerating ? 'Generating...' : 'Generate Configuration'}
          </Button>
        </>
      )}
      {/* Generated config UI remains unchanged */}
      {generatedConfig && !clarificationNeeded && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Configuration
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={`Type: ${generatedConfig.api_type || 'API'}`} 
                color="primary" 
                sx={{ mr: 1 }} 
              />
              {generatedConfig.confidence && (
                <Chip 
                  label={`Confidence: ${Math.round(generatedConfig.confidence * 100)}%`} 
                  color="secondary" 
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Base URL:</strong> {generatedConfig.base_url}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Method:</strong> {generatedConfig.primary_method || 'GET'}
            </Typography>
            {generatedConfig.auth_type && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Auth:</strong> {generatedConfig.auth_type}
              </Typography>
            )}
            {generatedConfig.auth_docs_url && (
              <Box>
                <Typography>Authentication: {generatedConfig.auth_type}</Typography>
                <a href={generatedConfig.auth_docs_url} target="_blank" rel="noopener noreferrer">
                  View Auth Documentation
                </a>
              </Box>
            )}
            {generatedConfig.suggestions && generatedConfig.suggestions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Suggestions:</strong>
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {generatedConfig.suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <Typography variant="body2" color="text.secondary">
                        {suggestion}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
            {generatedConfig?.endpoints?.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Select Endpoint</InputLabel>
                  <Select
                    value={selectedEndpoint?.path || selectedEndpoint?.url || ''}
                    onChange={e => {
                      const endpoint = generatedConfig.endpoints.find(
                        ep => (ep.path || ep.url) === e.target.value
                      );
                      setSelectedEndpoint(endpoint);
                    }}
                    label="Select Endpoint"
                  >
                    {generatedConfig.endpoints.map((ep, idx) => (
                      <MenuItem key={idx} value={ep.path || ep.url}>
                        {(ep.method || ep.http_method || 'GET') + ' ' + (ep.path || ep.url)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {selectedEndpoint && (
              <Box>
                <Typography>Required Params: {selectedEndpoint.required_params?.join(', ')}</Typography>
                <Typography>Sample Payload:</Typography>
                <pre>{JSON.stringify(selectedEndpoint.sample_payload, null, 2)}</pre>
              </Box>
            )}
            {/* In the AI config preview, show detected service name and allow override */}
            {generatedConfig?.service_name && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Detected Service:</strong> {generatedConfig.service_name}
                </Typography>
                {/* Optionally, add an input to override the service name if needed */}
              </Box>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  acceptGeneratedConfig();
                  setShowAuthModal(true);
                }}
                sx={{ mr: 1 }}
              >
                Accept Configuration
              </Button>
              <Button
                variant="outlined"
                onClick={() => setGeneratedConfig(null)}
              >
                Regenerate
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderManualMode = () => (
    <Box>
      {/* Tool Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tool Type
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Select Tool Type</InputLabel>
          <Select
            value={formData.tool_type || ''}
            onChange={handleToolTypeChange}
            label="Select Tool Type"
          >
            {getAvailableToolTypes().map(type => (
              <MenuItem key={type.value} value={type.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{getToolTypeIcon(type.value)}</span>
                  <Box>
                    <Typography variant="body1">{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Framework Selection */}
      {formData.tool_type && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Framework
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Framework</InputLabel>
            <Select
              value={formData.framework || ''}
              onChange={handleFrameworkChange}
              label="Select Framework"
            >
              {getFrameworksForToolType(formData.tool_type).map(framework => (
                <MenuItem key={framework.value} value={framework.value}>
                  {framework.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Tool-Specific Configuration */}
      {formData.tool_type && formData.framework && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>
          {renderToolSpecificFields()}
        </Box>
      )}

      {/* Field Mapper for explicit mapping */}
      <FieldMapper
        nodeId={formData.id}
        nodeType="tool"
        currentMappings={fieldMappings}
        onMappingChange={setFieldMappings}
        connectedNodes={nodes.filter(n => 
          edges.some(edge => edge.source === n.id && edge.target === formData.id)
        )}
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
            {renderAdvancedFields()}
          </Box>
        )}
      </Box>
    </Box>
  );

  const renderToolSpecificFields = () => {
    const toolType = formData.tool_type;
    const framework = formData.framework;

    switch (toolType) {
      case 'api':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="API Endpoint"
              placeholder="https://api.example.com/endpoint"
              value={formData.framework_config?.endpoint || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, endpoint: e.target.value }
                }
              })}
            />
            <FormControl fullWidth>
              <InputLabel>HTTP Method</InputLabel>
              <Select
                value={formData.framework_config?.method || 'GET'}
                onChange={(e) => handleInputChange({
                  target: { 
                    name: 'framework_config', 
                    value: { ...formData.framework_config, method: e.target.value }
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
              value={JSON.stringify(formData.framework_config?.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  handleInputChange({
                    target: { 
                      name: 'framework_config', 
                      value: { ...formData.framework_config, headers }
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

      case 'llm':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>LLM Provider</InputLabel>
              <Select
                value={formData.framework_config?.provider || ''}
                onChange={(e) => handleInputChange({
                  target: { 
                    name: 'framework_config', 
                    value: { ...formData.framework_config, provider: e.target.value }
                  }
                })}
                label="LLM Provider"
              >
                {availableApiKeys.map(key => (
                  <MenuItem key={key.provider} value={key.provider}>
                    {key.provider}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Model"
              placeholder="gpt-4, claude-3-opus, etc."
              value={formData.framework_config?.model || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, model: e.target.value }
                }
              })}
            />
            <TextField
              fullWidth
              type="number"
              label="Temperature"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              value={formData.framework_config?.temperature || 0.7}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, temperature: parseFloat(e.target.value) }
                }
              })}
            />
            <TextField
              fullWidth
              type="number"
              label="Max Tokens"
              inputProps={{ min: 1, max: 32000 }}
              value={formData.framework_config?.max_tokens || 1000}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, max_tokens: parseInt(e.target.value) }
                }
              })}
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
              value={formData.framework_config?.url || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, url: e.target.value }
                }
              })}
            />
            <FormControl fullWidth>
              <InputLabel>HTTP Method</InputLabel>
              <Select
                value={formData.framework_config?.method || 'POST'}
                onChange={(e) => handleInputChange({
                  target: { 
                    name: 'framework_config', 
                    value: { ...formData.framework_config, method: e.target.value }
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
            <TextField
              fullWidth
              label="Headers (JSON)"
              placeholder='{"Content-Type": "application/json"}'
              value={JSON.stringify(formData.framework_config?.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  handleInputChange({
                    target: { 
                      name: 'framework_config', 
                      value: { ...formData.framework_config, headers }
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

      case 'custom':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Parameters (JSON)"
              placeholder='{"param1": "value1", "param2": "value2"}'
              value={JSON.stringify(formData.parameters || {}, null, 2)}
              onChange={(e) => {
                try {
                  const params = JSON.parse(e.target.value);
                  handleInputChange({
                    target: { 
                      name: 'parameters', 
                      value: params
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

      case 'universal_api':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Service Name"
              placeholder="OpenWeatherMap, GitHub, etc."
              value={formData.framework_config?.service_name || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, service_name: e.target.value }
                }
              })}
            />
            <TextField
              fullWidth
              label="Service Description"
              placeholder="What this API does"
              value={formData.framework_config?.description || ''}
              onChange={(e) => handleInputChange({
                target: { 
                  name: 'framework_config', 
                  value: { ...formData.framework_config, description: e.target.value }
                }
              })}
              multiline
              rows={3}
            />
          </Box>
        );

      default:
        return <Typography color="text.secondary">Select a tool type to configure</Typography>;
    }
  };

  const renderAdvancedFields = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={formData.is_async || false}
            onChange={(e) => handleInputChange({
              target: { name: 'is_async', value: e.target.checked }
            })}
          />
        }
        label="Execute asynchronously"
      />
      
      <TextField
        fullWidth
        type="number"
        label="Retry Count"
        inputProps={{ min: 0, max: 10 }}
        value={formData.retry_count || 3}
        onChange={(e) => handleInputChange({
          target: { name: 'retry_count', value: parseInt(e.target.value) }
        })}
      />
      
      <TextField
        fullWidth
        type="number"
        label="Timeout (seconds)"
        inputProps={{ min: 1, max: 300 }}
        value={formData.timeout || 30}
        onChange={(e) => handleInputChange({
          target: { name: 'timeout', value: parseInt(e.target.value) }
        })}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Tool Configuration
      </Typography>
      
      {renderModeToggle()}
      
      {configMode === 'ai' ? renderAIMode() : renderManualMode()}

      {showAuthModal && (
        <Dialog open={showAuthModal} onClose={() => setShowAuthModal(false)}>
          <DialogTitle>OAuth2 Authentication Required</DialogTitle>
          <DialogContent>
            <TextField
              label="Client ID"
              value={authInfo.clientId || ''}
              onChange={e => setAuthInfo({ ...authInfo, clientId: e.target.value })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Client Secret"
              value={authInfo.clientSecret || ''}
              onChange={e => setAuthInfo({ ...authInfo, clientSecret: e.target.value })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Scopes (comma separated)"
              value={authInfo.scopes || ''}
              onChange={e => setAuthInfo({ ...authInfo, scopes: e.target.value })}
              fullWidth
              margin="normal"
            />
            {/* Add more fields as needed */}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAuthModal(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAuthInfo}
              variant="contained"
              disabled={!(authInfo.clientId && authInfo.clientSecret && authInfo.scopes)}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {showApiKeyModal && (
        <Dialog open={showApiKeyModal} onClose={() => setShowApiKeyModal(false)}>
          <DialogTitle>
            {generatedConfig?.auth_type === 'bearer'
              ? 'Bearer Token Required'
              : 'API Key Required'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={
                generatedConfig?.auth_type === 'bearer'
                  ? 'Bearer Token'
                  : 'API Key'
              }
              type="text"
              fullWidth
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              disabled={apiKeyValidationLoading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowApiKeyModal(false)} disabled={apiKeyValidationLoading}>Cancel</Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput || apiKeyValidationLoading}
            >
              {apiKeyValidationLoading ? 'Validating...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

ToolEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired,
  testInput: PropTypes.string,
  setTestInput: PropTypes.func.isRequired,
  testResult: PropTypes.object,
  setTestResult: PropTypes.func.isRequired,
  savedTestInputs: PropTypes.array,
  saveTestInput: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array
};

export default ToolEditor;