import React, { useState, useCallback, useMemo } from 'react';
import { 
  allIntegrationTools, 
  integrationCategories, 
  searchTools, 
  getToolsByCategory,
  getPopularTools 
} from '../data/integration-templates/index.js';
import { useToolTemplates } from '../hooks/useToolTemplates';

const IntegrationToolbox = ({ 
  nodes, 
  edges, 
  setNodes, 
  setEdges, 
  addToHistory,
  onClose 
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  const { handleToolFromRegistry } = useToolTemplates({
    nodes,
    edges,
    setNodes,
    setEdges,
    addToHistory,
    handleNodeEdit: () => {},
    handleNodeDelete: () => {}
  });

  // Filter tools based on current selections
  const filteredTools = useMemo(() => {
    let tools = [];
    
    if (showPopularOnly) {
      tools = selectedCategory === 'all' ? 
        getPopularTools() : 
        getPopularTools(selectedCategory);
    } else {
      tools = selectedCategory === 'all' ? 
        allIntegrationTools : 
        getToolsByCategory(selectedCategory);
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      tools = tools.filter(tool => 
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower) ||
        tool.frameworkConfig?.service_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return tools;
  }, [selectedCategory, searchTerm, showPopularOnly]);

  // Category statistics
  const categoryStats = useMemo(() => {
    const stats = {};
    Object.keys(integrationCategories).forEach(category => {
      const tools = getToolsByCategory(category);
      stats[category] = tools.length;
    });
    return stats;
  }, []);

  const handleToolSelect = useCallback((tool) => {
    try {
      // Convert integration template to tool registry format
      const toolConfig = {
        name: tool.name,
        description: tool.description,
        framework: tool.framework || 'integration_manager',
        type: tool.type || 'universal_api',
        category: tool.category,
        icon: tool.icon,
        defaultParameters: tool.defaultParameters || {},
        frameworkConfig: tool.frameworkConfig || {},
        authSetup: tool.authSetup || {}
      };
      
      handleToolFromRegistry(toolConfig);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error adding integration tool:', error);
    }
  }, [handleToolFromRegistry, onClose]);

  const CategoryButton = ({ category, categoryKey }) => (
    <button
      key={categoryKey}
      onClick={() => setSelectedCategory(categoryKey)}
      className={`flex items-center px-4 py-2 rounded-lg border transition-all ${
        selectedCategory === categoryKey
          ? 'bg-blue-500 text-white border-blue-500'
          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <span className="text-xl mr-2">{category.icon}</span>
      <div className="text-left">
        <div className="font-medium">{category.name}</div>
        <div className="text-xs opacity-75">
          {categoryStats[categoryKey] || 0} tools
        </div>
      </div>
    </button>
  );

  const ToolCard = ({ tool }) => (
    <div
      key={tool.id}
      onClick={() => handleToolSelect(tool)}
      className={`
        bg-white rounded-lg border border-gray-200 p-4 cursor-pointer transition-all
        hover:border-blue-300 hover:shadow-md
        ${viewMode === 'list' ? 'flex items-center space-x-4' : ''}
      `}
    >
      <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'text-center mb-3'}`}>
        <div className="text-2xl">{tool.icon}</div>
      </div>
      
      <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
        <h3 className="font-semibold text-gray-900 mb-1">{tool.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
        
        <div className="flex items-center justify-between">
          <span 
            className="px-2 py-1 text-xs rounded-full"
            style={{ 
              backgroundColor: integrationCategories[tool.category.toLowerCase()]?.color + '20' || '#E5E7EB',
              color: integrationCategories[tool.category.toLowerCase()]?.color || '#6B7280'
            }}
          >
            {tool.category}
          </span>
          
          <div className="text-xs text-gray-500">
            {tool.frameworkConfig?.service_name || 'Integration'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90%] max-w-6xl h-[90%] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Integration Toolbox</h2>
            <p className="text-gray-600">
              Choose from {allIntegrationTools.length} pre-built integrations across {Object.keys(integrationCategories).length} categories
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'
                }`}
              >
                List
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              All Categories ({allIntegrationTools.length})
            </button>
            
            {Object.entries(integrationCategories).map(([categoryKey, category]) => (
              <CategoryButton key={categoryKey} category={category} categoryKey={categoryKey} />
            ))}
          </div>

          {/* Additional Filters */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showPopularOnly}
                onChange={(e) => setShowPopularOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Popular tools only</span>
            </label>
            
            <div className="text-sm text-gray-500">
              Showing {filteredTools.length} tools
            </div>
          </div>
        </div>

        {/* Tools Grid/List */}
        <div className="flex-1 overflow-auto p-6">
          {filteredTools.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tools found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or category filters
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }>
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{allIntegrationTools.length}</div>
              <div className="text-sm text-gray-600">Total Tools</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{Object.keys(integrationCategories).length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(integrationCategories).reduce((sum, cat) => sum + cat.platforms.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Platforms</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{getPopularTools().length}</div>
              <div className="text-sm text-gray-600">Popular Tools</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationToolbox; 