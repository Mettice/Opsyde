import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../../../HelpTooltip';

const BasicInfoSection = ({ formData, handleInputChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 mb-1 flex items-center">
        Description
        <HelpTooltip type="trigger" field="description" />
      </label>
      <input
        type="text"
        name="description"
        value={formData.description || ''}
        onChange={handleInputChange}
        className="w-full p-2 border rounded"
        placeholder="Brief description of this trigger's purpose"
      />
    </div>
  );
};

BasicInfoSection.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default BasicInfoSection; 