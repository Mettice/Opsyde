import React from 'react';
import PropTypes from 'prop-types';
import MultimodalFileUpload from '../MultimodalFileUpload';

const InputEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // Only render the MultimodalFileUpload section
  const handleFileProcessed = (fileData) => {
    handleInputChange({
      target: {
        name: 'multimodal_data',
        value: fileData
      }
    });
  };

  return (
    <div className="space-y-6 p-6">
      <MultimodalFileUpload
        onFileProcessed={handleFileProcessed}
        acceptedTypes="image/*,audio/*,.pdf,.docx,.txt,.md,.csv,.xlsx,.json,.zip"
        maxSizeMB={25}
        multiple={false}
      />
    </div>
  );
};

InputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default InputEditor;