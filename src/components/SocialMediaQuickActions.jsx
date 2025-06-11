import React, { useState, useCallback } from 'react';
import { allSocialMediaTools, socialMediaCategories } from '../data/social_media_templates.js';
import { useToolTemplates } from '../hooks/useToolTemplates';

const SocialMediaQuickActions = ({ 
  nodes, 
  edges, 
  setNodes, 
  setEdges, 
  addToHistory,
  onClose 
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { handleToolFromRegistry } = useToolTemplates({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory,
    handleNodeEdit: () => {},
    handleNodeDelete: () => {}
  });

  const filteredTools = allSocialMediaTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           tool.category === selectedCategory ||
                           socialMediaCategories[selectedCategory]?.includes(tool.id);
    
    return matchesSearch && matchesCategory;
  });

  const handleAddTool = useCallback((tool) => {
    // Transform the social media template to registry format
    const registryTool = {
      name: tool.name,
      description: tool.description,
      type: tool.type,
      framework: tool.framework,
      frameworkConfig: tool.frameworkConfig,
      category: tool.category,
      parameters: tool.parameters,
      template_data: tool.template_data
    };
    
    handleToolFromRegistry(registryTool);
    
    // Show success feedback
    console.log(`✅ Added ${tool.name} to workflow`);
  }, [handleToolFromRegistry]);

  const categories = [
    { id: 'all', name: 'All Tools', icon: '📱' },
    { id: 'Social Media', name: 'Social Media', icon: '📢' },
    { id: 'Messaging', name: 'Messaging', icon: '💬' },
    { id: 'Professional', name: 'Professional', icon: '👔' },
    { id: 'Business', name: 'Business', icon: '🏢' }
  ];

  const platforms = [
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-500' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: 'bg-green-500' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'bg-blue-400' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Social Media Tools</h2>
          <p className="text-sm text-gray-600 mt-1">
            Quick access to social media integrations - leverages your Universal API system
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>
      </div>

      {/* Platform Overview */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Supported Platforms</h3>
        <div className="grid grid-cols-4 gap-3">
          {platforms.map(platform => (
            <div key={platform.id} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50">
              <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs ${platform.color}`}>
                {platform.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Category Filter */}
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAddTool(tool)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{tool.name}</h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {tool.category}
                    </span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Add +
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {tool.description}
              </p>
              
              {/* Quick preview of parameters */}
              <div className="text-xs text-gray-500">
                <strong>Parameters:</strong>{' '}
                {Object.keys(tool.parameters || {}).slice(0, 3).join(', ')}
                {Object.keys(tool.parameters || {}).length > 3 && '...'}
              </div>
            </div>
          ))}
        </div>
        
        {filteredTools.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🔍</div>
            <p className="text-gray-500">No tools found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">{filteredTools.length}</span> tools available
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Universal API powered
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
              BYOK integrated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaQuickActions; 