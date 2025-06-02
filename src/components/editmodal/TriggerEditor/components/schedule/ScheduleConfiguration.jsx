import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../../../../HelpTooltip';

const ScheduleConfiguration = ({ formData, handleInputChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Schedule Type
        </label>
        <select
          name="scheduleType"
          value={formData.scheduleType || 'once'}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          <option value="once">Run Once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      
      {/* Date/Time picker for one-time schedules */}
      {formData.scheduleType === 'once' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 flex items-center">
            Run At
            <HelpTooltip type="trigger" field="runAt" />
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={formData.runDate || ''}
              onChange={(e) => {
                handleInputChange({ target: { name: 'runDate', value: e.target.value } });
                // Combine date and time into runAt
                const newDate = e.target.value;
                const currentTime = formData.runTime || '12:00';
                handleInputChange({ target: { name: 'runAt', value: `${newDate} ${currentTime}` } });
              }}
              className="flex-1 p-2 border rounded"
            />
            <input
              type="time"
              value={formData.runTime || ''}
              onChange={(e) => {
                handleInputChange({ target: { name: 'runTime', value: e.target.value } });
                // Combine date and time into runAt
                const currentDate = formData.runDate || new Date().toISOString().split('T')[0];
                const newTime = e.target.value;
                handleInputChange({ target: { name: 'runAt', value: `${currentDate} ${newTime}` } });
              }}
              className="flex-1 p-2 border rounded"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Select when this trigger should execute
          </div>
        </div>
      )}
      
      {/* Weekly schedule options */}
      {formData.scheduleType === 'weekly' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">
            Day of Week
          </label>
          <select
            name="scheduleWeekday"
            value={formData.scheduleWeekday || 'monday'}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
      )}
      
      {/* Monthly schedule options */}
      {formData.scheduleType === 'monthly' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">
            Day of Month
          </label>
          <select
            name="scheduleMonthDay"
            value={formData.scheduleMonthDay || 1}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          >
            {[...Array(31)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* Daily schedule options */}
      {formData.scheduleType === 'daily' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">
            Time Window
          </label>
          <div className="flex space-x-2 items-center">
            <input
              type="time"
              name="scheduleStartTime"
              value={formData.scheduleStartTime || '09:00'}
              onChange={handleInputChange}
              className="flex-1 p-2 border rounded"
            />
            <span>to</span>
            <input
              type="time"
              name="scheduleEndTime"
              value={formData.scheduleEndTime || '17:00'}
              onChange={handleInputChange}
              className="flex-1 p-2 border rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};

ScheduleConfiguration.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default ScheduleConfiguration; 