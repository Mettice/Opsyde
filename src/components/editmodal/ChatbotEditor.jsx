import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DynamicSchemaForm from './shared/DynamicSchemaForm';
import { chatNodeSchema } from './shared/nodeSchemas';
import FieldMapper from './shared/FieldMapper';
import NodeOutputPreview from '../NodeOutputPreview';

const ChatbotEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  const [validationErrors, setValidationErrors] = useState({});

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

  const handleValidationError = (hasErrors) => {
    setValidationErrors(hasErrors);
  };

  const handleSave = () => {
    if (!validationErrors) {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Chat Configuration</h3>
        
        <DynamicSchemaForm
          schema={chatNodeSchema}
          nodeType="chat"
          formData={formData}
          handleInputChange={handleInputChange}
          onValidationError={handleValidationError}
        />

        {/* Field Mapper for explicit mapping */}
        <FieldMapper
          nodeId={nodeId || formData.id || formData.nodeId || ''}
          nodeType="chat"
          currentMappings={fieldMappings}
          onMappingChange={handleFieldMappingChange}
          connectedNodes={connectedNodes}
          previousNodeOutputs={previousNodeOutputs}
        />

        {/* Optionally show output preview for mapped fields */}
        {previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0 && (
          <NodeOutputPreview
            nodeId={nodeId || formData.id || formData.nodeId || ''}
            nodeType="chat"
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
            disabled={validationErrors}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              validationErrors
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

ChatbotEditor.propTypes = {
  formData: PropTypes.object,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default ChatbotEditor;