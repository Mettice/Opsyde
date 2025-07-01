import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DynamicSchemaForm from "../shared/DynamicSchemaForm";
import { triggerNodeSchema } from '../shared/nodeSchemas';
import FieldMapper from '../shared/FieldMapper';
import NodeOutputPreview from '../../NodeOutputPreview';
// Sub-components
import BasicInfoSection from './components/BasicInfoSection';
import TriggerTypeSelector from './components/TriggerTypeSelector';
import ScheduleConfiguration from './components/schedule/ScheduleConfiguration';
import WebhookConfiguration from './components/webhook/WebhookConfiguration';
import UniversalPollingConfiguration from './components/polling/UniversalPollingConfiguration';
import { toast } from 'react-hot-toast';

const TriggerEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // State for schema-driven core trigger config
  const [coreConfig, setCoreConfig] = useState({
    label: formData.label || '',
    description: formData.description || '',
    trigger_type: formData.trigger_type || formData.triggerType || 'manual',
  });
  const [validationErrors, setValidationErrors] = useState(false);
  const [configErrors, setConfigErrors] = useState([]);

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});

  // Keep fieldMappings in sync with formData
  useEffect(() => {
    setFieldMappings(formData.field_mappings || {});
  }, [formData.field_mappings]);

  // Handler for field mapping changes
  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
    handleInputChange({ target: { name: 'field_mappings', value: newMappings } });
  };

  // Simple validation function
  const validateTriggerConfig = (config) => {
    const errors = [];
    
    if (!config.label?.trim()) {
      errors.push("Please give your trigger a name");
    }
    
    if (config.trigger_type === 'universal_polling') {
      if (!config.api_endpoint?.trim()) {
        errors.push("API endpoint is required");
      }
      if (!config.service_name?.trim()) {
        errors.push("Service name is required");
      }
      if (config.polling_interval && config.polling_interval < 1) {
        errors.push("Polling interval must be at least 1 minute");
      }
    }
    
    if (config.trigger_type === 'schedule') {
      if (config.schedule_type === 'once' && !config.run_at) {
        errors.push("Please set when to run the schedule");
      }
      if (config.schedule_type === 'daily' && !config.run_time) {
        errors.push("Please set the time to run daily");
      }
    }
    
    return errors;
  };

  // Handler for schema form changes
  const handleCoreConfigChange = (newConfig) => {
    setCoreConfig(newConfig);
    // Optionally update parent formData for live preview
    handleInputChange({ target: { name: 'label', value: newConfig.label } });
    handleInputChange({ target: { name: 'description', value: newConfig.description } });
    handleInputChange({ target: { name: 'trigger_type', value: newConfig.trigger_type } });
    
    // Validate on change
    const errors = validateTriggerConfig({ ...formData, ...newConfig });
    setConfigErrors(errors);
  };

  // Handler for schema validation
  const handleValidationError = (hasErrors) => {
    setValidationErrors(hasErrors);
  };

  // Handler for save (optional, if you want a Save button)
  const handleSave = () => {
    const errors = validateTriggerConfig(formData);
    if (errors.length > 0) {
      setConfigErrors(errors);
      toast.error(errors[0]); // Show first error
      return;
    }
    
    if (validationErrors) {
      toast.error('Please fix validation errors before saving.');
      return;
    }
    
    onSave({
      ...formData,
      ...coreConfig
    });
  };

  return (
    <>
      {/* Schema-driven core fields */}
      <div className="mb-4">
        <DynamicSchemaForm
          schema={triggerNodeSchema}
          nodeType="trigger"
          formData={coreConfig}
          handleInputChange={handleCoreConfigChange}
          onValidationError={handleValidationError}
        />
      </div>
      
      {/* Field Mapper for explicit mapping */}
      <FieldMapper
        nodeId={nodeId || formData.id || formData.nodeId || ''}
        nodeType="trigger"
        currentMappings={fieldMappings}
        onMappingChange={handleFieldMappingChange}
        connectedNodes={connectedNodes}
        previousNodeOutputs={previousNodeOutputs}
      />

      {/* Optionally show output preview for mapped fields */}
      {previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0 && (
        <NodeOutputPreview
          nodeId={nodeId || formData.id || formData.nodeId || ''}
          nodeType="trigger"
          output={previousNodeOutputs}
          isVisible={false}
        />
      )}
      
      {/* Show validation errors */}
      {configErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-red-700 font-medium">Configuration Issues:</span>
          </div>
          <ul className="mt-2 ml-6 text-red-600 text-sm">
            {configErrors.map((error, index) => (
              <li key={index} className="list-disc">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Modular subcomponents for type-specific config */}
      <BasicInfoSection 
        formData={formData} 
        handleInputChange={handleInputChange} 
      />
      <TriggerTypeSelector 
        formData={formData} 
        handleInputChange={handleInputChange} 
      />
      {formData.trigger_type === 'schedule' && (
        <ScheduleConfiguration 
          formData={formData} 
          handleInputChange={handleInputChange} 
        />
      )}
      {formData.trigger_type === 'webhook' && (
        <WebhookConfiguration 
          formData={formData} 
          handleInputChange={handleInputChange} 
        />
      )}
      {formData.trigger_type === 'universal_polling' && (
        <UniversalPollingConfiguration 
          formData={formData} 
          handleInputChange={handleInputChange} 
        />
      )}
      {/* Optional: Save/Cancel buttons if you want to enforce schema validation on save */}
      {onSave && onClose && (
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={configErrors.length > 0 || validationErrors}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              configErrors.length > 0 || validationErrors
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Save Changes
          </button>
        </div>
      )}
    </>
  );
};

TriggerEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default TriggerEditor; 