import React, { useState } from 'react';
import PropTypes from 'prop-types';

const SaveTemplateModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedNodes = [],
  selectedEdges = []
}) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(selectedNodes, selectedEdges, templateName.trim(), templateDescription.trim());
      
      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTemplateName('');
      setTemplateDescription('');
      setError('');
      onClose();
    }
  };

  const getNodeTypeIcon = (nodeType) => {
    const icons = {
      agent: '🤖',
      task: '📋',
      tool: '🔧',
      input: '📝',
      output: '📤',
      logic: '⚖️',
      delay: '⏱️',
      trigger: '⚡',
      chatbot: '💬'
    };
    return icons[nodeType] || '📦';
  };

  const nodeTypes = [...new Set(selectedNodes.map(node => node.type))];
  const connectedEdges = selectedEdges.filter(edge => 
    selectedNodes.some(node => node.id === edge.source) && 
    selectedNodes.some(node => node.id === edge.target)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Save as Template</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Template Preview */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-3">Template Preview</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Nodes:</span>
                <span className="ml-2 font-medium">{selectedNodes.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Connections:</span>
                <span className="ml-2 font-medium">{connectedEdges.length}</span>
              </div>
            </div>
            
            {nodeTypes.length > 0 && (
              <div className="mt-3">
                <span className="text-gray-600 text-sm">Node Types:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {nodeTypes.map((nodeType) => (
                    <span
                      key={nodeType}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white border border-gray-200"
                    >
                      <span className="mr-1">{getNodeTypeIcon(nodeType)}</span>
                      {nodeType}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                id="templateName"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="templateDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template does..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={isLoading}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {templateDescription.length}/500 characters
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !templateName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

SaveTemplateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  selectedNodes: PropTypes.array,
  selectedEdges: PropTypes.array
};

export default SaveTemplateModal; 