// frontend/src/components/editmodal/shared/InheritanceSelector.jsx - NEW FILE
import React from 'react';
import PropTypes from 'prop-types';

const InheritanceSelector = ({ 
  formData, 
  handleInputChange, 
  availableNodes, 
  nodeType 
}) => {
  // Filter nodes that this node type can inherit from
  const inheritableNodes = availableNodes.filter(node => {
    const validParents = {
      'tool': ['agent'],
      'task': ['agent'], 
      'chat': ['agent'],
      'chatbot': ['agent']
    };
    return validParents[nodeType]?.includes(node.type);
  });

  if (inheritableNodes.length === 0) {
    return null; // Don't show if no inheritance options
  }

  const selectedParent = inheritableNodes.find(node => node.id === formData.inherits_from);

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      <div className="flex items-center mb-3">
        <span className="text-xl mr-2">🔗</span>
        <h4 className="text-sm font-medium text-purple-800">
          Configuration Inheritance
        </h4>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Inherit LLM configuration from:
          </label>
          
          <select
            name="inherits_from"
            value={formData.inherits_from || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">❌ No inheritance (configure manually)</option>
            {inheritableNodes.map(node => (
              <option key={node.id} value={node.id}>
                🤖 {node.data?.label || node.id} ({node.type})
              </option>
            ))}
          </select>
        </div>
        
        {formData.inherits_from && selectedParent && (
          <div className="bg-white p-3 rounded-md border border-purple-200">
            <div className="text-xs text-purple-700 mb-2">
              <strong>✨ This {nodeType} will inherit:</strong>
            </div>
            <ul className="text-xs text-purple-600 space-y-1">
              <li>🤖 LLM Framework: {selectedParent.data?.framework || 'Not set'}</li>
              <li>🧠 Model: {selectedParent.data?.frameworkConfig?.model || 'Not set'}</li>
              <li>🌡️ Temperature: {selectedParent.data?.frameworkConfig?.temperature || 0.7}</li>
              <li>📏 Max Tokens: {selectedParent.data?.frameworkConfig?.max_tokens || 2000}</li>
              <li>🔐 API Key: {selectedParent.data?.frameworkConfig?.api_key ? 'Configured' : 'Not set'}</li>
            </ul>
            <div className="text-xs text-purple-600 mt-2 bg-purple-50 p-2 rounded">
              💡 You can still override specific values below if needed
            </div>
          </div>
        )}
        
        {!formData.inherits_from && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            💡 <strong>Tip:</strong> Inheriting configuration from an agent saves time and ensures consistency across your workflow
          </div>
        )}
      </div>
    </div>
  );
};

InheritanceSelector.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  availableNodes: PropTypes.array.isRequired,
  nodeType: PropTypes.string.isRequired
};

export default InheritanceSelector;