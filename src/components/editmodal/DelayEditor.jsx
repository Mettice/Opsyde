import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const DelayEditor = ({ formData, handleInputChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="delay" field="description" />
        </label>
        <input
          type="text"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="Brief description of this delay's purpose"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Duration
          <HelpTooltip type="delay" field="duration" />
        </label>
        <input
          type="text"
          name="duration"
          value={formData.duration || '5s'}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="e.g. 5s, 2m, 1h"
        />
        <div className="text-xs text-gray-500 mt-1">
          Format: 5s (seconds), 2m (minutes), 1h (hours)
        </div>
      </div>
    </>
  );
};

DelayEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default DelayEditor;