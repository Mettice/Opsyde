import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { toast } from 'react-hot-toast';

const TriggerEditor = ({ formData, handleInputChange }) => {
  const registerTrigger = async () => {
    if (!formData.nodeId) {
      toast.error('Node ID is missing. Please save the node first.');
      return;
    }
    
    try {
      // This is a stub for the real implementation which would find connected nodes
      // In a real implementation, these functions would be passed as props or imported
      const connectedNodes = []; // findConnectedNodes(formData.nodeId);
      const connectedEdges = []; // findConnectedEdges(formData.nodeId);
      
      // Create a flow object with just the connected components
      const flow = {
        nodes: connectedNodes,
        edges: connectedEdges,
        trigger_id: formData.nodeId,
        trigger_type: formData.triggerType
      };
      
      // Register the trigger with the backend
      const response = await fetch('/register-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_id: formData.nodeId,
          flow: flow,
          owner: 'current_user' // Replace with actual user ID if available
        })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        toast.success(`Trigger registered: ${result.webhook_url}`);
      } else {
        toast.error('Failed to register trigger: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Error registering trigger: ' + error.message);
      console.error('Error registering trigger:', error);
    }
  };

  return (
    <>
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
        </select>
      </div>

      {formData.triggerType === 'schedule' && (
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
      )}

      {formData.triggerType === 'webhook' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 flex items-center">
            Webhook URL
            <HelpTooltip type="trigger" field="webhook" />
          </label>
          <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
            {`${window.location.origin}/trigger/${formData.nodeId || 'id'}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Send a POST request to this URL to trigger the workflow
          </div>
          <div className="mt-2">
            <button
              type="button"
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/trigger/${formData.nodeId || 'id'}`);
                toast.success('Webhook URL copied to clipboard');
              }}
            >
              Copy URL
            </button>
            <button
              type="button"
              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded ml-2"
              onClick={registerTrigger}
            >
              Register Webhook
            </button>
            <button
              type="button"
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded ml-2"
              onClick={async () => {
                try {
                  const response = await fetch(`/trigger/${formData.nodeId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
                  });
                  const result = await response.json();
                  toast.success('Webhook test triggered successfully');
                } catch (error) {
                  toast.error('Failed to test webhook');
                  console.error(error);
                }
              }}
            >
              Test Webhook
            </button>
          </div>
        </div>
      )}
    </>
  );
};

TriggerEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default TriggerEditor;