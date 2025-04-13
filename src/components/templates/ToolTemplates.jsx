import React, { useState } from 'react';

const toolTemplates = [
  {
    name: 'Web Search',
    description: 'Web search capability to find information',
    toolType: 'search',
    parameters: 'query\nnum_results',
    icon: '🔍',
    category: 'Information'
  },
  {
    name: 'Grammar Tool',
    description: 'Advanced grammar and style checking',
    toolType: 'custom',
    parameters: 'text\ncheck_style\ncheck_grammar',
    icon: '📝',
    category: 'Content'
  },
  {
    name: 'Calculator',
    description: 'Perform mathematical calculations',
    toolType: 'calculator',
    parameters: 'expression',
    icon: '🧮',
    category: 'Utility'
  },
  {
    name: 'Weather API',
    description: 'Get weather information for a location',
    toolType: 'api',
    apiEndpoint: 'https://api.weather.com/v1/forecast',
    parameters: 'location\ndate\nformat',
    icon: '🌤️',
    category: 'Data'
  },
  {
    name: 'Document Analyzer',
    description: 'Extract and analyze information from documents',
    toolType: 'custom',
    parameters: 'document_url\nanalysis_type',
    icon: '📄',
    category: 'Content'
  },
  {
    name: 'Translation Tool',
    description: 'Translate text between languages',
    toolType: 'api',
    apiEndpoint: 'https://api.translation.com/v1/translate',
    parameters: 'text\nsource_language\ntarget_language',
    icon: '🌐',
    category: 'Language'
  },
  {
    name: 'Image Generator',
    description: 'Generate images from text descriptions',
    toolType: 'api',
    apiEndpoint: 'https://api.images.com/v1/generate',
    parameters: 'prompt\nsize\nstyle',
    icon: '🖼️',
    category: 'Creative'
  },
  {
    name: 'Data Visualizer',
    description: 'Create charts and graphs from data',
    toolType: 'custom',
    parameters: 'data\nchart_type\ntitle',
    icon: '📊',
    category: 'Data'
  }
];

const ToolTemplates = ({ onSelectTemplate, onClose, onAddCustom }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Extract unique categories
  const categories = ['All', ...new Set(toolTemplates.map(tool => tool.category))];
  
  // Filter tools based on search and category
  const filteredTools = toolTemplates.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select a Tool Template</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tools..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {filteredTools.map((template, index) => (
            <div 
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{template.icon}</span>
                <h3 className="font-semibold text-lg">{template.name}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-2">{template.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {template.toolType}
                </span>
                {template.apiEndpoint && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    API
                  </span>
                )}
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <strong>Parameters:</strong> {template.parameters.split('\n').join(', ')}
              </div>
            </div>
          ))}
        </div>
        
        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No tools match your search criteria. Try a different search term or category.
          </div>
        )}
        
        <div className="flex justify-between">
          <button 
            onClick={onAddCustom || (() => {
              onSelectTemplate({
                name: 'Custom Tool',
                description: 'Custom tool definition',
                toolType: 'custom',
                parameters: '',
                icon: '🛠️',
                category: 'Custom'
              });
            })}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Create Custom Tool
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolTemplates; 