import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const CommonFields = ({ formData, handleInputChange, nodeType }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 mb-1 flex items-center">
        Name
        <HelpTooltip type={nodeType} field="label" />
      </label>
      <input
        type="text"
        name="label"
        value={formData.label || ''}
        onChange={handleInputChange}
        className="w-full p-2 border rounded"
        placeholder={`Enter a name for this ${nodeType}`}
      />
    </div>
  );
};

CommonFields.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  nodeType: PropTypes.string.isRequired
};

export default CommonFields;