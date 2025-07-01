import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useBuilderUI } from '../../contexts/BuilderUIContext';
import { useFlow } from '../../contexts/FlowContext';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import FieldMapper from './shared/FieldMapper';
import { taskNodeSchema } from './shared/nodeSchemas';
import { toast } from 'react-toastify';
import { normalizeTaskData } from '../EditModall';
import { TextField, Select, MenuItem, Checkbox, FormControlLabel, FormHelperText, Box, Typography, Button, FormControl, InputLabel } from '@mui/material';

const TaskEditor = ({ node, onSave, onClose }) => {
  const { showEditModal } = useBuilderUI();
  const { nodes, edges } = useFlow();
  
  // BYOK State Management
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);
  
  // Field Mapping State
  const [fieldMappings, setFieldMappings] = useState(node.data.field_mappings || {});
  const [previousNodeOutputs, setPreviousNodeOutputs] = useState({});
  
  // Add null safety checks
  if (!node || !node.data) {
    console.error('TaskEditor: Invalid node data received', { node });
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Error: Invalid task node data</Typography>
        <Button
          onClick={onClose}
          variant="contained"
          color="error"
          sx={{ mt: 2 }}
        >
          Close
        </Button>
      </Box>
    );
  }
  
  const [taskData, setTaskData] = useState(normalizeTaskData(node.data));

  // Get connected nodes and their outputs
  useEffect(() => {
    const getConnectedNodes = () => {
      const connected = [];
      edges.forEach(edge => {
        if (edge.target === node.id) {
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
      } else if (connectedNode.type === 'tool') {
        mockOutputs[connectedNode.id] = {
          result: { data: 'Sample tool result', status: 'success' },
          metadata: { execution_time: 1.2 }
        };
      } else if (connectedNode.type === 'trigger') {
        mockOutputs[connectedNode.id] = {
          trigger_data: { event: 'webhook_received', timestamp: new Date().toISOString() },
          api_data: { records: [], total: 0 }
        };
      }
    });
    
    setPreviousNodeOutputs(mockOutputs);
  }, [node.id, nodes, edges]);

  // Load API Keys from BYOK Manager - FIXED
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        // Fix: Use correct endpoint like AgentEditor
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        if (response.ok) {
          const result = await response.json();
          // Fix: Handle the correct response structure like AgentEditor
          if (result.success && result.data.api_keys) {
            setAvailableApiKeys(result.data.api_keys.filter(key => key.validation_status === 'valid'));
            console.log('🔑 Loaded API keys:', result.data.api_keys);
          }
        } else {
          throw new Error('Failed to load API keys');
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

  // Auto-inject API key when provider is selected
  const handleProviderChange = (provider) => {
    const matchingKey = availableApiKeys.find(key => key.provider === provider);
    if (matchingKey) {
      toast.success(`🔑 Auto-injected ${matchingKey.provider_name} API key from BYOK Manager`);
    }
    
    setTaskData(prev => ({
      ...prev,
      framework_config: {
        ...prev.framework_config,
        provider: provider
      }
    }));
  };

  // Render BYOK Status Indicator
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            Loading API keys from BYOK Manager...
          </Typography>
        </Box>
      );
    }

    if (apiKeyError) {
      return (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            {apiKeyError}
          </Typography>
        </Box>
      );
    }

    if (availableApiKeys.length === 0) {
      return (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="body2" color="warning.dark">
            No API keys configured. Add API keys in the BYOK Manager to use LLM providers.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="body2" color="success.dark">
          🔑 BYOK Active: {availableApiKeys.length} provider(s) configured
        </Typography>
      </Box>
    );
  };

  const agentNodes = nodes.filter(n => n.type === 'agent');

  // Auto-select agent if only one is available
  useEffect(() => {
    if (agentNodes.length === 1 && !taskData.agent_ref) {
      setTaskData(prev => ({ ...prev, agent_ref: agentNodes[0].id }));
    }
  }, [agentNodes, taskData.agent_ref]);

  const handleSave = () => {
    onSave({
      ...node,
      data: {
        label: taskData.label,
        description: taskData.description,
        agent_ref: taskData.agent_ref,
        expected_output: taskData.expected_output,
        async_execution: !!taskData.async_execution,
        field_mappings: fieldMappings
      }
    });
  };

  useEffect(() => {
    setTaskData(normalizeTaskData(node.data));
  }, [node.data]);

  // Handler for field mapping changes
  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
  };

  // Get connected nodes for field mapping
  const getConnectedNodes = () => {
    const connected = [];
    edges.forEach(edge => {
      if (edge.target === node.id) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          connected.push(sourceNode);
        }
      }
    });
    return connected;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* BYOK Status */}
      {renderBYOKStatus()}

      {/* Core Task Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Task Configuration
        </Typography>
        
        <TextField
          fullWidth
          label="Task Name"
          value={taskData.label || ''}
          onChange={(e) => setTaskData(prev => ({ ...prev, label: e.target.value }))}
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          label="Description"
          placeholder="What should this task accomplish?"
          value={taskData.description || ''}
          onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
          multiline
          rows={3}
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          label="Expected Output"
          placeholder="What should this task produce?"
          value={taskData.expected_output || ''}
          onChange={(e) => setTaskData(prev => ({ ...prev, expected_output: e.target.value }))}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Agent Selection */}
      {agentNodes.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Agent Assignment
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Agent</InputLabel>
            <Select
              value={taskData.agent_ref || ''}
              onChange={(e) => setTaskData(prev => ({ ...prev, agent_ref: e.target.value }))}
              label="Select Agent"
            >
              {agentNodes.map(agent => (
                <MenuItem key={agent.id} value={agent.id}>
                  {agent.data.label || agent.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Field Mapper for explicit mapping */}
      <FieldMapper
        nodeId={node.id}
        nodeType="task"
        currentMappings={fieldMappings}
        onMappingChange={handleFieldMappingChange}
        connectedNodes={getConnectedNodes()}
        previousNodeOutputs={previousNodeOutputs}
      />

      {/* Advanced Options */}
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={taskData.async_execution || false}
              onChange={(e) => setTaskData(prev => ({ ...prev, async_execution: e.target.checked }))}
            />
          }
          label="Execute asynchronously"
        />
        <FormHelperText>
          Enable for long-running tasks that don't block the workflow
        </FormHelperText>
      </Box>

      {/* Save Button */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Task
        </Button>
      </Box>
    </Box>
  );
};

TaskEditor.propTypes = {
  node: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default TaskEditor;