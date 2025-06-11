import { useState, useCallback, useEffect } from 'react';

export const useContextMenu = ({ onAddNode, reactFlowInstance }) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [integrationStats, setIntegrationStats] = useState(null);

  // Load integration stats
  useEffect(() => {
    loadIntegrationStats();
  }, []);

  const loadIntegrationStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/integrations/stats');
      if (response.ok) {
        const data = await response.json();
        setIntegrationStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load integration stats:', error);
    }
  };

  const handleCanvasContextMenu = useCallback((event) => {
    event.preventDefault();
    
    // Get canvas position for node placement
    const canvasPosition = reactFlowInstance?.project({
      x: event.clientX,
      y: event.clientY,
    }) || { x: event.clientX, y: event.clientY };

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      canvasPosition,
    });
  }, [reactFlowInstance]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const addIntegrationNode = useCallback((platform, category) => {
    if (!contextMenu) return;

    const nodeData = {
      id: `integration-${platform}-${Date.now()}`,
      type: 'tool',
      position: contextMenu.canvasPosition,
      data: {
        label: `${getPlatformIcon(platform)} ${platform}`,
        description: `${category} integration`,
        framework: 'integration_manager',
        toolType: 'integration',
        category: category,
        platform: platform,
        config: {
          category: category,
          platform: platform,
          action: 'execute',
        },
        nodeId: `integration-${platform}-${Date.now()}`,
        nodeType: 'tool'
      }
    };

    if (onAddNode) {
      onAddNode(nodeData);
    }
    closeContextMenu();
  }, [contextMenu, onAddNode, closeContextMenu]);

  const getPlatformIcon = (platform) => {
    const icons = {
      slack: '💬', discord: '🎮', teams: '👥',
      notion: '📝', airtable: '📊', 'google-sheets': '📈',
      github: '🐙', gitlab: '🦊', webhook: '🔗',
      mailchimp: '📧', sendgrid: '✉️',
      hubspot: '🎯', salesforce: '☁️',
      shopify: '🛒', stripe: '💳',
      'google-drive': '💾', dropbox: '📦'
    };
    return icons[platform] || '🔧';
  };

  // Get popular integrations for quick access
  const getPopularIntegrations = () => {
    if (!integrationStats || !integrationStats.categories) return [];
    
    const popular = [];
    
    // Convert categories object to array and process
    Object.entries(integrationStats.categories).forEach(([categoryName, categoryData]) => {
      if (categoryData.platforms && Array.isArray(categoryData.platforms)) {
        categoryData.platforms.slice(0, 2).forEach(platform => {
          popular.push({
            platform: platform.name || platform,
            category: categoryName,
            display_name: platform.display_name || platform.name || platform,
            icon: platform.icon || getPlatformIcon(platform.name || platform)
          });
        });
      }
    });
    
    return popular.slice(0, 6); // Top 6 popular integrations
  };

  const ContextMenuComponent = () => {
    if (!contextMenu) return null;

    const popularIntegrations = getPopularIntegrations();

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />

        {/* Context Menu */}
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-64"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center">
              <span className="text-lg mr-2">🔧</span>
              <span className="font-medium text-gray-900">Add Integration</span>
            </div>
          </div>

          {/* Popular Integrations */}
          <div className="px-2 py-2">
            <div className="text-xs text-gray-500 px-2 py-1 font-medium">POPULAR</div>
            {popularIntegrations.map((integration) => (
              <button
                key={`${integration.category}-${integration.platform}`}
                onClick={() => addIntegrationNode(integration.platform, integration.category)}
                className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors"
              >
                <span className="text-lg mr-3">{integration.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {integration.display_name}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {integration.category}
                  </div>
                </div>
                <span className="text-gray-400">+</span>
              </button>
            ))}
          </div>

          {/* Browse All */}
          <div className="border-t border-gray-100 px-2 py-2">
            <button
              onClick={() => {
                // You can trigger the IntegrationSelector modal here
                closeContextMenu();
                // Trigger event to open integration selector
                window.dispatchEvent(new CustomEvent('openIntegrationSelector', {
                  detail: { position: contextMenu.canvasPosition }
                }));
              }}
              className="w-full flex items-center px-3 py-2 text-left hover:bg-purple-50 rounded-md transition-colors text-purple-600"
            >
              <span className="text-lg mr-3">🌟</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Browse All Integrations</div>
                <div className="text-xs">
                  {integrationStats?.total_platforms || 0} available
                </div>
              </div>
              <span className="text-purple-400">→</span>
            </button>
          </div>
        </div>
      </>
    );
  };

  return {
    contextMenu,
    handleCanvasContextMenu,
    closeContextMenu,
    ContextMenuComponent,
  };
}; 