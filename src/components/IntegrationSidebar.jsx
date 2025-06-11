import React, { useState, useEffect } from 'react';
import IntegrationSelector from './IntegrationSelector';

const IntegrationSidebar = ({ isOpen, onToggle, onAddNode, reactFlowInstance }) => {
  const [integrationStats, setIntegrationStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (isOpen) {
      loadIntegrationStats();
    }
  }, [isOpen]);

  const loadIntegrationStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/integrations/stats');
      if (response.ok) {
        const data = await response.json();
        setIntegrationStats(data.data);
      } else {
        console.warn('Integration API not available - using fallback data');
        // Set fallback data structure
        setIntegrationStats({
          total_platforms: 0,
          total_categories: 0,
          categories: {}
        });
      }
    } catch (error) {
      console.error('Failed to load integration stats:', error);
      // Set fallback data structure
      setIntegrationStats({
        total_platforms: 0,
        total_categories: 0,
        categories: {}
      });
    }
  };

  const handleAddIntegration = (nodeData) => {
    // Position new nodes in the center of the current viewport
    const position = reactFlowInstance ? 
      reactFlowInstance.project({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) :
      { x: 250, y: 250 };

    const newNode = {
      ...nodeData,
      position,
    };

    if (onAddNode) {
      onAddNode(newNode);
    }
  };

  // Convert categories object to array format
  const categoriesData = integrationStats?.categories || {};
  const categories = Object.keys(categoriesData).map(categoryKey => {
    const categoryInfo = categoriesData[categoryKey];
    return {
      name: categoryKey,
      display_name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).replace('_', ' '),
      platform_count: categoryInfo.platform_count || categoryInfo.platforms?.length || 0,
      platforms: categoryInfo.platforms?.map(platformName => ({
        name: platformName,
        display_name: platformName.charAt(0).toUpperCase() + platformName.slice(1),
        description: `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} integration`,
        icon: getIntegrationIcon(categoryKey, platformName)
      })) || [],
      icon: getCategoryIcon(categoryKey)
    };
  });

  const filteredCategories = selectedCategory === 'all' 
    ? categories 
    : categories.filter(cat => cat.name === selectedCategory);

  // Helper function to get category icons
  function getCategoryIcon(category) {
    const icons = {
      communication: '💬',
      productivity: '📊', 
      developer: '⚡',
      marketing: '📧',
      crm: '👥',
      ecommerce: '🛒',
      storage: '💾'
    };
    return icons[category] || '🔧';
  }

  // Helper function to get platform icons
  function getIntegrationIcon(category, platform) {
    const icons = {
      // Communication
      slack: '📱',
      discord: '🎮',
      teams: '💼',
      
      // Productivity
      notion: '📝',
      airtable: '📋',
      'google-sheets': '📊',
      
      // Developer
      github: '🐙',
      gitlab: '🦊',
      webhooks: '🔗',
      
      // Marketing
      mailchimp: '🐵',
      sendgrid: '📮',
      
      // CRM
      hubspot: '🧡',
      salesforce: '☁️',
      
      // E-commerce
      shopify: '🛍️',
      stripe: '💳',
      
      // Storage
      'google-drive': '💿',
      dropbox: '📦'
    };
    return icons[platform] || getCategoryIcon(category);
  }

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-4 left-4 z-50 bg-white shadow-lg rounded-lg p-3 border border-gray-200 transition-all duration-300 hover:shadow-xl ${
          isOpen ? 'text-purple-600' : 'text-gray-600'
        }`}
        title="Toggle Integration Panel"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">🔧</span>
          <span className="text-sm font-medium">Integrations</span>
          {integrationStats && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              {integrationStats.total_platforms}
            </span>
          )}
        </div>
      </button>

      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-40 transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ width: '380px' }}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Integration Hub</h2>
              <p className="text-sm text-gray-600 mt-1">
                {integrationStats?.total_platforms || 0} integrations available
              </p>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.display_name} ({category.platform_count})
              </button>
            ))}
          </div>
        </div>

        {/* Content - Now properly scrollable */}
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {filteredCategories.map((category) => (
            <div key={category.name} className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">{category.icon}</span>
                {category.display_name}
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {category.platform_count}
                </span>
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {category.platforms?.map((platform) => (
                  <button
                    key={platform.name}
                    onClick={() => {
                      const nodeData = {
                        id: `integration-${platform.name}-${Date.now()}`,
                        type: 'tool',
                        data: {
                          label: `${platform.icon} ${platform.display_name}`,
                          description: platform.description,
                          framework: 'integration_manager',
                          toolType: 'integration',
                          category: category.name,
                          platform: platform.name,
                          config: {
                            category: category.name,
                            platform: platform.name,
                            action: 'execute',
                          },
                          nodeId: `integration-${platform.name}-${Date.now()}`,
                          nodeType: 'tool'
                        }
                      };
                      handleAddIntegration(nodeData);
                    }}
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left border border-gray-200 hover:border-gray-300"
                  >
                    <span className="text-2xl mr-3">{platform.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{platform.display_name}</div>
                      <div className="text-xs text-gray-500">{platform.description}</div>
                    </div>
                    <span className="text-gray-400 text-lg">+</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-2">🔍</span>
              No integrations found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-500 text-center">
            Powered by Universal API • {integrationStats?.total_platforms} integrations
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default IntegrationSidebar; 