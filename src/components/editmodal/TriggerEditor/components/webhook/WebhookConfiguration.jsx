import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import HelpTooltip from '../../../../HelpTooltip';

const WebhookConfiguration = ({ formData, handleInputChange }) => {
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
      const response = await fetch('http://localhost:8000/api/triggers/register', {
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
              const response = await fetch(`http://localhost:8000/api/triggers/${formData.nodeId}`, {
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
  );
};

WebhookConfiguration.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default WebhookConfiguration; 