import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../../../HelpTooltip';

const TriggerTypeSelector = ({ formData, handleInputChange }) => {
  const triggerTypeDescriptions = {
    manual: 'Start workflow manually',
    webhook: 'Trigger via HTTP webhook',
    schedule: 'Run on a schedule',
    universal_polling: 'Monitor API for changes',
    universal_webhook: 'Universal webhook support'
  };

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
        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="manual">Manual</option>
        <option value="webhook">Webhook</option>
        <option value="schedule">Schedule</option>
        <option value="universal_polling">Universal API Polling</option>
        <option value="universal_webhook">Universal Webhook</option>
      </select>
      {formData.triggerType && (
        <p className="text-sm text-gray-600 mt-1">
          {triggerTypeDescriptions[formData.triggerType]}
        </p>
      )}
    </div>
  );
};

TriggerTypeSelector.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default TriggerTypeSelector; 