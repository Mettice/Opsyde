import React from 'react';

const WebhookFlowModal = ({ isOpen, onClose, onReplace, onMerge, flowData }) => {
  if (!isOpen) return null;
  
  const nodeCount = flowData?.nodes?.length || 0;
  const edgeCount = flowData?.edges?.length || 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Incoming Workflow</h2>
        
        <p className="mb-4">
          A webhook is trying to load a new workflow with {nodeCount} nodes and {edgeCount} edges.
        </p>
        
        <div className="bg-gray-100 p-3 rounded mb-4">
          <h3 className="font-semibold mb-2">How would you like to proceed?</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Replace:</strong> Remove your current workflow and load this one</li>
            <li><strong>Merge:</strong> Add these nodes to your existing workflow</li>
            <li><strong>Cancel:</strong> Ignore this workflow</li>
          </ul>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onMerge}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
          >
            Merge
          </button>
          <button
            onClick={onReplace}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebhookFlowModal; 