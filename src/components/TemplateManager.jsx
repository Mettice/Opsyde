import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { loadTemplates, deleteTemplate, applyTemplate } from '../utils/flowUtils';

const TemplateManager = ({ 
  isOpen, 
  onClose, 
  onApplyTemplate, 
  currentPosition = { x: 100, y: 100 } 
}) => {
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (isOpen) {
      loadTemplateList();
    }
  }, [isOpen]);

  const loadTemplateList = () => {
    const loadedTemplates = loadTemplates();
    setTemplates(loadedTemplates);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const success = deleteTemplate(templateId);
      if (success) {
        loadTemplateList();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
      }
    }
  };

  const handleApplyTemplate = (template) => {
    const { nodes, edges } = applyTemplate(template, currentPosition);
    onApplyTemplate(nodes, edges);
    onClose();
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.metadata.nodeTypes.some(type => 
      type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Template Manager</h2>
            <p className="text-gray-600 mt-1">
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📊 Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📋 List
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates by name, description, or node type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg 
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Template List */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No templates found' : 'No templates yet'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Create your first template by selecting nodes and choosing "Save as Template"'
                  }
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`
                      bg-white border-2 rounded-xl p-4 cursor-pointer transition-all duration-200
                      hover:shadow-lg hover:-translate-y-1
                      ${selectedTemplate?.id === template.id 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 truncate flex-1">
                        {template.name}
                      </h3>
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTemplate(template);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Apply template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {template.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>{template.metadata.nodeCount} nodes</span>
                      <span>{formatDate(template.createdAt)}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.metadata.nodeTypes.map((nodeType) => (
                        <span
                          key={nodeType}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                        >
                          <span className="mr-1">{getNodeTypeIcon(nodeType)}</span>
                          {nodeType}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`
                      bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200
                      hover:shadow-md
                      ${selectedTemplate?.id === template.id 
                        ? 'border-blue-500 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-800">{template.name}</h3>
                          <div className="flex space-x-1">
                            {template.metadata.nodeTypes.map((nodeType) => (
                              <span key={nodeType} className="text-sm">
                                {getNodeTypeIcon(nodeType)}
                              </span>
                            ))}
                          </div>
                        </div>
                        {template.description && (
                          <p className="text-gray-600 text-sm mt-1">{template.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <span>{template.metadata.nodeCount} nodes</span>
                          <span>{formatDate(template.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTemplate(template);
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                        >
                          Apply
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="w-80 border-l border-gray-200 p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-4">Template Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-gray-800">{selectedTemplate.name}</p>
                </div>
                
                {selectedTemplate.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-800">{selectedTemplate.description}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-gray-800">{formatDate(selectedTemplate.createdAt)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Nodes</label>
                  <p className="text-gray-800">{selectedTemplate.metadata.nodeCount} nodes</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Node Types</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTemplate.metadata.nodeTypes.map((nodeType) => (
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
                
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleApplyTemplate(selectedTemplate)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Template
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

TemplateManager.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onApplyTemplate: PropTypes.func.isRequired,
  currentPosition: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number
  })
};

export default TemplateManager; 