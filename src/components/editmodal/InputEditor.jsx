import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const InputEditor = ({ formData, handleInputChange }) => {
  // Create dedicated handler for input type change
  const handleInputTypeChange = (e) => {
    const newInputType = e.target.value;
    console.log("Changing input type to:", newInputType);
    
    // Use the standard handler with the new event
    handleInputChange({
      target: {
        name: 'inputType',
        value: newInputType,
        type: 'select-one'
      }
    });
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Input Type
          <HelpTooltip type="input" field="inputType" />
        </label>
        <select
          name="inputType"
          value={formData.inputType || 'text'}
          onChange={handleInputTypeChange}
          className="w-full p-2 border rounded"
        >
          <option value="text">Text Input</option>
          <option value="file">File Upload</option>
          <option value="url">URL Input</option>
        </select>
        <div className="text-xs text-gray-500 mt-1">
          Current input type: {formData.inputType || 'text'}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Variable Name
          <HelpTooltip type="input" field="variableName" />
        </label>
        <input
          type="text"
          name="variableName"
          value={formData.variableName || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="e.g., user_input"
        />
      </div>

      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="isRequired"
          name="isRequired"
          checked={formData.isRequired || false}
          onChange={handleInputChange}
          className="mr-2"
        />
        <label htmlFor="isRequired" className="text-gray-700">Required Input</label>
      </div>

      {formData.inputType === 'text' && (
        <div className="mb-4">
          <div className="text-sm text-gray-700 mb-1">
            Text Input Configuration
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">
              Text inputs allow users to enter text data that will be passed to downstream nodes.
            </p>
          </div>
        </div>
      )}

      {formData.inputType === 'file' && (
        <div className="mb-4">
          <div className="text-sm text-gray-700 mb-1">
            File Upload Configuration
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">
              File uploads allow users to submit files (like PDFs or documents) for processing.
            </p>
          </div>
        </div>
      )}

      {formData.inputType === 'url' && (
        <div className="mb-4">
          <div className="text-sm text-gray-700 mb-1">
            URL Input Configuration
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">
              URL inputs allow users to specify web URLs that can be processed by downstream nodes.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

InputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default InputEditor;