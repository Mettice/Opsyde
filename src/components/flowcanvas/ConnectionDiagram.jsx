import React from 'react';
import PropTypes from 'prop-types';

const ConnectionDiagram = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 connection-diagram-modal">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Nodai Connection Flow</h2>
        
        <div className="flex items-center justify-center mb-6 flow-diagram">
          <div className="flex flex-col items-center mx-4 node-box tool">
            <div className="w-24 h-16 bg-green-100 border border-green-300 rounded flex items-center justify-center">
              Tool
            </div>
            <div className="text-xs mt-1">Provides capabilities</div>
          </div>
          
          <div className="text-2xl mx-2 flow-arrow">→</div>
          
          <div className="flex flex-col items-center mx-4 node-box agent">
            <div className="w-24 h-16 bg-blue-100 border border-blue-300 rounded flex items-center justify-center">
              Agent
            </div>
            <div className="text-xs mt-1">Performs work</div>
          </div>
          
          <div className="text-2xl mx-2 flow-arrow">→</div>
          
          <div className="flex flex-col items-center mx-4 node-box task">
            <div className="w-24 h-16 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center">
              Task
            </div>
            <div className="text-xs mt-1">Defines work</div>
          </div>
        </div>
        
        <p className="text-sm mb-4 flow-description">
          In CrewAI, connections follow a specific flow:
        </p>
        
        <ul className="list-disc pl-6 mb-4 text-sm connection-rules">
          <li><strong>Tools connect to Agents</strong>: Tools are resources that agents can use</li>
          <li><strong>Agents connect to Tasks</strong>: Agents perform specific tasks</li>
          <li><strong>Tasks can connect to other Tasks</strong>: Creating dependencies and workflows</li>
          <li><strong>Triggers connect to any node</strong>: Initiating the workflow execution</li>
          <li><strong>Input nodes can connect to any node</strong>: Providing data to the workflow</li>
        </ul>
        
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 close-button"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

ConnectionDiagram.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default ConnectionDiagram;