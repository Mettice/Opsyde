import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import { delayNodeSchema } from './shared/nodeSchemas';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';

const DelayEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // Only manage duration in the schema-driven form
  const [duration, setDuration] = useState(formData.duration || 5);
  const [validationErrors, setValidationErrors] = useState(false);
  const [fieldMappings, setFieldMappings] = useState(formData.field_mappings || {});

  useEffect(() => {
    setFieldMappings(formData.field_mappings || {});
    setDuration(formData.duration || 5);
  }, [formData]);

  const handleFieldMappingChange = (newMappings) => {
    setFieldMappings(newMappings);
    handleInputChange({ target: { name: 'field_mappings', value: newMappings } });
  };

  // Only update duration
  const handleSchemaChange = (newData) => {
    setDuration(newData.duration);
    handleInputChange({ target: { name: 'duration', value: newData.duration } });
  };

  const handleValidationError = (hasErrors) => {
    setValidationErrors(hasErrors);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Delay Configuration</h3>
        <DynamicSchemaForm
          schema={{ fields: { duration: delayNodeSchema.fields.duration } }}
          formData={{ duration }}
          onChange={handleSchemaChange}
          onValidationError={handleValidationError}
        />
        <FieldMapper
          nodeId={nodeId || formData.id || formData.nodeId || ''}
          nodeType="delay"
          currentMappings={fieldMappings}
          onMappingChange={handleFieldMappingChange}
          connectedNodes={connectedNodes}
          previousNodeOutputs={previousNodeOutputs}
        />
        {previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0 && (
          <NodeOutputPreview
            nodeId={nodeId || formData.id || formData.nodeId || ''}
            nodeType="delay"
            output={previousNodeOutputs}
            isVisible={false}
          />
        )}
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