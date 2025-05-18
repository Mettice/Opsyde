import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const OutputEditor = ({ formData, handleInputChange }) => {
  // When output type changes, ensure config is properly set
  useEffect(() => {
    // When output type changes, make sure we clear other output type fields
    // to prevent configuration conflicts
    if (formData.outputType) {
      const updatedFormData = { ...formData };
      
      // Clear any fields not related to the selected output type
      if (formData.outputType === 'webhook') {
        delete updatedFormData.email;
        delete updatedFormData.sheetId;
      } else if (formData.outputType === 'email') {
        delete updatedFormData.webhookUrl;
        delete updatedFormData.sheetId;
      } else if (formData.outputType === 'discord') {
        delete updatedFormData.email;
        delete updatedFormData.sheetId;
      } else if (formData.outputType === 'sheets') {
        delete updatedFormData.email;
        delete updatedFormData.webhookUrl;
      }
      
      // Create a config object if needed
      if (!updatedFormData.config) {
        updatedFormData.config = {};
      }
      
      // Ensure the form data gets updated with proper structure
      // The following dummy event will be caught by the handleInputChange function
      // to update the parent component's state
      handleInputChange({
        target: {
          name: 'formData',
          value: updatedFormData
        }
      });
    }
  }, [formData.outputType]);

  // Custom input handler to organize config properly
  const handleOutputConfigChange = (e) => {
    const { name, value } = e.target;
    
    // Create a proper event to send to the parent's handler
    const newEvent = {
      target: {
        name,
        value
      }
    };
    
    // Also update config structure to ensure backend compatibility
    const config = formData.config || {};
    
    if (name === 'email') {
      config.email = value;
    } else if (name === 'webhookUrl') {
      config.url = value;
    } else if (name === 'sheetId') {
      config.sheet_id = value;
    }
    
    // Update the config object in the form data
    handleInputChange({
      target: {
        name: 'config',
        value: config
      }
    });
    
    // Forward the original input change
    handleInputChange(newEvent);
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Output Type
          <HelpTooltip type="output" field="outputType" />
        </label>
        <select
          name="outputType"
          value={formData.outputType || 'webhook'}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          <option value="webhook">Webhook</option>
          <option value="discord">Discord</option>
          <option value="sheets">Google Sheets</option>
          <option value="email">Email</option>
        </select>
      </div>

      {formData.outputType === 'webhook' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Webhook URL</label>
          <input
            type="text"
            name="webhookUrl"
            value={formData.webhookUrl || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="https://example.com/webhook"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL where output data will be sent via a POST request.
          </p>
        </div>
      )}

      {formData.outputType === 'discord' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Discord Webhook URL</label>
          <input
            type="text"
            name="webhookUrl"
            value={formData.webhookUrl || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="Discord webhook URL"
          />
          <p className="text-xs text-gray-500 mt-1">
            Discord webhook URL to send notifications to a Discord channel.
          </p>
        </div>
      )}

      {formData.outputType === 'sheets' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Sheet ID</label>
          <input
            type="text"
            name="sheetId"
            value={formData.sheetId || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="Google Sheet ID"
          />
          <p className="text-xs text-gray-500 mt-1">
            The ID of your Google Sheet where data should be appended.
          </p>
        </div>
      )}

      {formData.outputType === 'email' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleOutputConfigChange}
            className="w-full p-2 border rounded"
            placeholder="recipient@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email address where output will be sent.
          </p>
          
          <div className="mt-3">
            <label className="block text-gray-700 mb-1">Subject (Optional)</label>
            <input
              type="text"
              name="subject"
              value={formData.subject || 'Workflow Results'}
              onChange={handleOutputConfigChange}
              className="w-full p-2 border rounded"
              placeholder="Email Subject"
            />
          </div>
        </div>
      )}
      
      {/* Debug information - uncomment if needed for testing */}
      {/* <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </div> */}
    </>
  );
};

OutputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default OutputEditor;