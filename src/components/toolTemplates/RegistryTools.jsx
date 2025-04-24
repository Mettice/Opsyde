import React, { useState } from 'react';
import registry from '../../data/tool_registry.json';

const RegistryTools = ({ onToolSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Get unique categories from tools
  const categories = [...new Set(registry.tools.map(tool => tool.category))];

  const filteredTools = registry.tools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFramework = !selectedFramework || tool.framework === selectedFramework;
    const matchesCategory = !selectedCategory || tool.category === selectedCategory;

    return matchesSearch && matchesFramework && matchesCategory;
  });

  const handleToolClick = (tool) => {
    if (onToolSelect) {
      const framework = tool.framework;
      onToolSelect({
        name: tool.name,
        description: tool.description,
        type: tool.type || 'api',
        framework: framework,
        parameters: tool.parameters,
        category: tool.category,
        config: registry.frameworks[framework]?.config || {}
      });
    }
  };

  return (
    <div className="p-4">
      {/* Search and Filter Bar */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <button
          onClick={() => {
            setSelectedFramework('');
            setSelectedCategory('');
          }}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Clear filters"
        >
          🔄
        </button>
      </div>

      {/* Framework Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(registry.frameworks).map(([key, framework]) => (
          <button
            key={key}
            onClick={() => setSelectedFramework(selectedFramework === key ? '' : key)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 transition-colors
              ${selectedFramework === key 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <span>{framework.icon}</span>
            {framework.name}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors
              ${selectedCategory === category 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const framework = registry.frameworks[tool.framework];
          return (
            <div
              key={tool.name}
              onClick={() => handleToolClick(tool)}
              className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transform hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{framework.icon}</span>
                  <h3 className="font-semibold text-lg">{tool.name}</h3>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {tool.type}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-3">
                {tool.description}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {framework.name}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {tool.category}
                </span>
                {framework.config && Object.keys(framework.config).length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Configurable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No tools found matching your criteria
        </div>
      )}
    </div>
  );
};

export default RegistryTools;