import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';

const DelayEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // State for schema-driven core delay config
  const [delayCoreConfig, setDelayCoreConfig] = useState({
    label: formData.label || '',
    description: formData.description || '',
    duration: formData.duration || 5
  });
  const [validationErrors, setValidationErrors] = useState(false);

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

  // Handler for schema form changes
  const handleCoreConfigChange = (newConfig) => {
    setDelayCoreConfig(newConfig);
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
      ...delayCoreConfig
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Delay Configuration</h3>
        <DynamicSchemaForm
          schema={delayNodeSchema}
          formData={delayCoreConfig}
          onChange={handleCoreConfigChange}
          onValidationError={handleValidationError}
        />
        {/* Field Mapper for explicit mapping */}
        <FieldMapper
          nodeId={nodeId || formData.id || formData.nodeId || ''}
          nodeType="delay"
          currentMappings={fieldMappings}
          onMappingChange={handleFieldMappingChange}
          connectedNodes={connectedNodes}
          previousNodeOutputs={previousNodeOutputs}
        />
        {/* Optionally show output preview for mapped fields */}
        {previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0 && (
          <NodeOutputPreview
            nodeId={nodeId || formData.id || formData.nodeId || ''}
            nodeType="delay"
            output={previousNodeOutputs}
            isVisible={false}
          />
        )}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

DelayEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default DelayEditor;