import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../../../HelpTooltip';

const TriggerTypeSelector = ({ formData, handleInputChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 mb-1 flex items-center">
        Trigger Type
        <HelpTooltip type="trigger" field="triggerType" />
      </label>
      <select
        name="triggerType"
        value={formData.triggerType || 'manual'}
        onChange={handleInputChange}
        className="w-full p-2 border rounded"
      >
        <option value="manual">Manual</option>
        <option value="webhook">Webhook</option>
        <option value="schedule">Schedule</option>
        <option value="universal_polling">Universal API Polling</option>
        <option value="universal_webhook">Universal Webhook</option>
      </select>
    </div>
  );
};

TriggerTypeSelector.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default TriggerTypeSelector; 