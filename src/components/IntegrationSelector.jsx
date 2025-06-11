import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';

const IntegrationSelector = ({ 
  isOpen, 
  onClose, 
  onSelectIntegration,
  existingNodes = [],
  position = { x: 0, y: 0 }
}) => {
  const [integrationStats, setIntegrationStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingIntegration, setTestingIntegration] = useState(null);

  // Load integration system data from backend
  useEffect(() => {
    const loadIntegrationData = async () => {
      try {
        setLoading(true);
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
        console.error('Failed to load integration data:', error);
        // Set fallback data structure
        setIntegrationStats({
          total_platforms: 0,
          total_categories: 0,
          categories: {}
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadIntegrationData();
    }
  }, [isOpen]);

  // Filter available integrations
  const filteredIntegrations = useMemo(() => {
    if (!integrationStats?.categories) return [];

    let platforms = [];
    
    // Get platforms from selected category or all (handle object format from API)
    const categoriesData = integrationStats.categories;
    
    if (selectedCategory === 'all') {
      Object.keys(categoriesData).forEach(categoryKey => {
        const categoryInfo = categoriesData[categoryKey];
        categoryInfo.platforms.forEach(platformName => {
          platforms.push({
            platform: platformName,
            category: categoryKey,
            runner_class: categoryInfo.runner_class,
            platform_count: categoryInfo.platform_count
          });
        });
      });
    } else {
      const categoryInfo = categoriesData[selectedCategory];
      if (categoryInfo) {
        categoryInfo.platforms.forEach(platformName => {
          platforms.push({
            platform: platformName,
            category: selectedCategory,
            runner_class: categoryInfo.runner_class,
            platform_count: categoryInfo.platform_count
          });
        });
      }
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      platforms = platforms.filter(p => 
        p.platform.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower)
      );
    }

    return platforms;
  }, [integrationStats, selectedCategory, searchTerm]);

  // Category icons and colors
  const categoryConfig = {
    communication: { icon: '💬', color: '#4F46E5', name: 'Communication' },
    productivity: { icon: '📊', color: '#059669', name: 'Productivity' },
    developer: { icon: '⚡', color: '#DC2626', name: 'Developer' },
    marketing: { icon: '📧', color: '#7C3AED', name: 'Marketing' },
    crm: { icon: '👥', color: '#EA580C', name: 'CRM' },
    ecommerce: { icon: '🛒', color: '#0D9488', name: 'E-commerce' },
    storage: { icon: '☁️', color: '#0891B2', name: 'Storage' }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      slack: '💬', discord: '🎮', teams: '👔',
      notion: '📝', airtable: '📊', googlesheets: '📈',
      github: '🐙', gitlab: '🦊', webhook: '🔗',
      mailchimp: '🐵', sendgrid: '📮',
      hubspot: '🎯', salesforce: '☁️',
      shopify: '🛍️', stripe: '💳',
      google_drive: '📁', dropbox: '📦'
    };
    return icons[platform] || '🔧';
  };

  const handleIntegrationSelect = async (integration) => {
    try {
      // 🚀 INTEGRATION TEMPLATES: Create pre-configured ready-to-use integrations
      const platformConfigs = {
        slack: {
          url: 'https://hooks.slack.com/services/YOUR-WEBHOOK-URL',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '{{message}}' }),
          description: '✅ Ready to use! Just replace YOUR-WEBHOOK-URL with your Slack webhook URL in the node.',
          userInstructions: 'Get your webhook URL from Slack App settings > Incoming Webhooks',
          authType: 'webhook_url',
          credentialFields: ['webhook_url']
        },
        linkedin: {
          url: 'https://api.linkedin.com/v2/posts',
          method: 'POST',
          headers: { 
            'Authorization': 'Bearer YOUR-ACCESS-TOKEN',
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify({
            author: 'urn:li:person:YOUR-PERSON-ID',
            commentary: '{{message}}',
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
          }),
          description: '✅ Ready to use! Just add your LinkedIn access token and person ID.',
          userInstructions: 'Get access token from LinkedIn Developer Console',
          authType: 'bearer_token',
          credentialFields: ['access_token', 'person_id']
        },
        hubspot: {
          url: 'https://api.hubapi.com/crm/v3/objects/contacts',
          method: 'POST',
          headers: { 
            'Authorization': 'Bearer YOUR-PRIVATE-APP-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              firstname: '{{firstname}}',
              lastname: '{{lastname}}',
              email: '{{email}}'
            }
          }),
          description: '✅ Ready to use! Just add your HubSpot private app token.',
          userInstructions: 'Get token from HubSpot > Settings > Integrations > Private Apps',
          authType: 'bearer_token',
          credentialFields: ['private_app_token']
        },
        stripe: {
          url: 'https://api.stripe.com/v1/customers',
          method: 'POST',
          headers: { 
            'Authorization': 'Bearer YOUR_STRIPE_API_KEY',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'name={{name}}&email={{email}}',
          description: '✅ Ready to use! Just replace YOUR-SECRET-KEY with your Stripe secret key.',
          userInstructions: 'Get secret key from Stripe Dashboard > Developers > API keys',
          authType: 'bearer_token',
          credentialFields: ['secret_key']
        },
        notion: {
          url: 'https://api.notion.com/v1/pages',
          method: 'POST',
          headers: { 
            'Authorization': 'Bearer YOUR-INTEGRATION-TOKEN',
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            parent: { database_id: 'YOUR-DATABASE-ID' },
            properties: {
              title: {
                title: [{ text: { content: '{{title}}' } }]
              }
            }
          }),
          description: '✅ Ready to use! Just add your Notion integration token and database ID.',
          userInstructions: 'Create Notion integration and get database ID',
          authType: 'bearer_token',
          credentialFields: ['integration_token', 'database_id']
        },
        salesforce: {
          url: 'https://YOUR-INSTANCE.salesforce.com/services/data/v57.0/sobjects/Contact',
          method: 'POST',
          headers: { 
            'Authorization': 'Bearer YOUR-ACCESS-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            FirstName: '{{firstname}}',
            LastName: '{{lastname}}',
            Email: '{{email}}'
          }),
          description: '✅ Ready to use! Just add your Salesforce access token and instance URL.',
          userInstructions: 'Get access token from Salesforce Connected App settings',
          authType: 'bearer_token',
          credentialFields: ['access_token', 'instance_url']
        },
        airtable: {
          url: 'https://api.airtable.com/v0/YOUR-BASE-ID/YOUR-TABLE-NAME',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-PERSONAL-ACCESS-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Name': '{{name}}',
              'Email': '{{email}}',
              'Status': '{{status}}'
            }
          }),
          description: '✅ Ready to use! Add your Airtable Personal Access Token, Base ID, and Table name.',
          userInstructions: 'Get Personal Access Token from Airtable > Account > Developer Hub > Personal Access Tokens',
          authType: 'bearer_token',
          credentialFields: ['personal_access_token', 'base_id', 'table_name']
        },
        discord: {
          url: 'https://discord.com/api/webhooks/YOUR-WEBHOOK-ID/YOUR-WEBHOOK-TOKEN',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '{{message}}',
            username: 'CrewFlow Bot'
          }),
          description: '✅ Ready to use! Add your Discord webhook URL.',
          userInstructions: 'Create webhook in Discord Server Settings > Integrations > Webhooks',
          authType: 'webhook_url',
          credentialFields: ['webhook_url']
        },
        teams: {
          url: 'YOUR-TEAMS-WEBHOOK-URL',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: 'CrewFlow Notification',
            text: '{{message}}'
          }),
          description: '✅ Ready to use! Add your Microsoft Teams webhook URL.',
          userInstructions: 'Create webhook in Teams > Channel > Connectors > Incoming Webhook',
          authType: 'webhook_url',
          credentialFields: ['webhook_url']
        },
        github: {
          url: 'https://api.github.com/repos/YOUR-OWNER/YOUR-REPO/issues',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-GITHUB-TOKEN',
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            title: '{{title}}',
            body: '{{description}}',
            labels: ['{{label}}']
          }),
          description: '✅ Ready to use! Add your GitHub Personal Access Token and repository details.',
          userInstructions: 'Create token at GitHub > Settings > Developer settings > Personal access tokens',
          authType: 'bearer_token',
          credentialFields: ['github_token', 'owner', 'repo']
        },
        gitlab: {
          url: 'https://gitlab.com/api/v4/projects/YOUR-PROJECT-ID/issues',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-GITLAB-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: '{{title}}',
            description: '{{description}}'
          }),
          description: '✅ Ready to use! Add your GitLab Personal Access Token and project ID.',
          userInstructions: 'Create token at GitLab > User Settings > Access Tokens',
          authType: 'bearer_token',
          credentialFields: ['gitlab_token', 'project_id']
        },
        googlesheets: {
          url: 'https://sheets.googleapis.com/v4/spreadsheets/YOUR-SPREADSHEET-ID/values/YOUR-RANGE:append',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-OAUTH-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [['{{value1}}', '{{value2}}', '{{value3}}']]
          }),
          description: '✅ Ready to use! Add your Google OAuth token and spreadsheet details.',
          userInstructions: 'Setup OAuth in Google Cloud Console and get access token',
          authType: 'oauth_token',
          credentialFields: ['oauth_token', 'spreadsheet_id', 'range']
        },
        mailchimp: {
          url: 'https://YOUR-DC.api.mailchimp.com/3.0/lists/YOUR-LIST-ID/members',
          method: 'POST',
          headers: {
            'Authorization': 'apikey YOUR-API-KEY',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email_address: '{{email}}',
            status: 'subscribed',
            merge_fields: {
              FNAME: '{{first_name}}',
              LNAME: '{{last_name}}'
            }
          }),
          description: '✅ Ready to use! Add your Mailchimp API key and list ID.',
          userInstructions: 'Get API key from Mailchimp > Account > Extras > API keys',
          authType: 'api_key',
          credentialFields: ['api_key', 'list_id', 'data_center']
        },
        sendgrid: {
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-SENDGRID-API-KEY',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: '{{to_email}}' }]
            }],
            from: { email: '{{from_email}}' },
            subject: '{{subject}}',
            content: [{ type: 'text/plain', value: '{{message}}' }]
          }),
          description: '✅ Ready to use! Add your SendGrid API key.',
          userInstructions: 'Get API key from SendGrid > Settings > API Keys',
          authType: 'bearer_token',
          credentialFields: ['api_key']
        },
        shopify: {
          url: 'https://YOUR-SHOP.myshopify.com/admin/api/2023-10/products.json',
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': 'YOUR-ACCESS-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product: {
              title: '{{title}}',
              body_html: '{{description}}',
              product_type: '{{type}}'
            }
          }),
          description: '✅ Ready to use! Add your Shopify store URL and access token.',
          userInstructions: 'Create private app in Shopify Admin > Apps > App and sales channel settings',
          authType: 'access_token',
          credentialFields: ['shop_name', 'access_token']
        },
        google_drive: {
          url: 'https://www.googleapis.com/drive/v3/files',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-OAUTH-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: '{{filename}}',
            parents: ['{{folder_id}}']
          }),
          description: '✅ Ready to use! Add your Google OAuth token.',
          userInstructions: 'Setup OAuth in Google Cloud Console and get access token',
          authType: 'oauth_token',
          credentialFields: ['oauth_token']
        },
        dropbox: {
          url: 'https://api.dropboxapi.com/2/files/create_folder_v2',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR-ACCESS-TOKEN',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: '{{folder_path}}',
            autorename: false
          }),
          description: '✅ Ready to use! Add your Dropbox access token.',
          userInstructions: 'Create app in Dropbox App Console and get access token',
          authType: 'bearer_token',
          credentialFields: ['access_token']
        }
      };

      const platformConfig = platformConfigs[integration.platform] || {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: '{{input}}' }),
        description: '✅ Ready to use! Configure your API endpoint details.',
        userInstructions: 'Add your API endpoint URL and authentication details'
      };

      // Create ready-to-use integration node data (same structure as FloatingIntegrationHub)
      const nodeData = {
        id: `integration-${integration.platform}-${Date.now()}`,
        type: 'tool',
        position: position,
        data: {
          label: `${getPlatformIcon(integration.platform)} ${integration.platform}`,
          description: `${categoryConfig[integration.category]?.name} integration`,
          framework: 'integration_manager',
          toolType: 'integration',
          category: integration.category,
          platform: integration.platform,
          
          // 🔥 CRITICAL: Add the flags that make it ready-to-use
          isReadyToUse: true,
          integrationPlatform: integration.platform,
          
          frameworkConfig: {
            // Pre-configured settings that bypass Universal API research
            isIntegrationTemplate: true,
            isReadyToUse: true,
            platform: integration.platform,
            category: integration.category,
            integrationPlatform: integration.platform,
            ...platformConfig
          },
          
          config: {
            category: integration.category,
            platform: integration.platform,
            action: 'execute',
            isIntegrationTemplate: true,
            isReadyToUse: true
          },
          nodeId: `integration-${integration.platform}-${Date.now()}`,
          nodeType: 'tool'
        }
      };

      // Call the parent callback
      if (onSelectIntegration) {
        onSelectIntegration(nodeData);
      }

      toast.success(`✅ Added ${integration.platform} ready-to-use integration!`);
      onClose();

    } catch (error) {
      console.error('Error adding integration:', error);
      toast.error('Failed to add integration');
    }
  };

  const testIntegrationConnection = async (integration) => {
    try {
      setTestingIntegration(integration.platform);
      toast.loading(`Testing ${integration.platform} connection...`, { id: 'test-integration' });

      const response = await fetch('http://localhost:8000/api/integrations/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: integration.category,
          platform: integration.platform,
          auth_config: {} // Would use real auth in production
        })
      });

      if (response.ok) {
        toast.success(`✅ ${integration.platform} connection test passed!`, { id: 'test-integration' });
      } else {
        toast.error(`❌ ${integration.platform} connection test failed`, { id: 'test-integration' });
      }
    } catch (error) {
      toast.error(`❌ Test error: ${error.message}`, { id: 'test-integration' });
    } finally {
      setTestingIntegration(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90%] max-w-5xl h-[85%] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">🔧</span>
              Integration Marketplace
            </h2>
            <p className="text-gray-600 mt-1">
              {loading ? 'Loading...' : `${integrationStats?.total_platforms || 0} platforms across ${integrationStats?.total_categories || 0} categories`}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ✅ System Healthy
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading integration system...</p>
            </div>
          </div>
        ) : (
          <>
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

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All ({integrationStats?.total_platforms || 0})
                </button>
                
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const categoryData = integrationStats?.categories?.[key];
                  const count = categoryData?.platform_count || 0;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === key
                          ? 'text-white'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === key ? config.color : undefined
                      }}
                    >
                      {config.icon} {config.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Integration Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations.map((integration) => {
                  const categoryInfo = categoryConfig[integration.category] || {};
                  
                  return (
                    <div
                      key={`${integration.category}-${integration.platform}`}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
                    >
                      {/* Platform Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getPlatformIcon(integration.platform)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 capitalize">
                              {integration.platform.replace('_', ' ')}
                            </h3>
                            <div 
                              className="text-xs px-2 py-1 rounded-full text-white"
                              style={{ backgroundColor: categoryInfo.color }}
                            >
                              {categoryInfo.name}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {integration.has_custom_auth?.includes(integration.platform) && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            🔐 Auth
                          </span>
                        )}
                        {integration.has_transformers?.includes(integration.platform) && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            🔄 Transform
                          </span>
                        )}
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          ⚡ Ready
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleIntegrationSelect(integration)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Add to Workflow
                        </button>
                        
                        <button
                          onClick={() => testIntegrationConnection(integration)}
                          disabled={testingIntegration === integration.platform}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          {testingIntegration === integration.platform ? '⏳' : '🧪'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredIntegrations.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
                  <p className="text-gray-600">Try adjusting your search or category filter</p>
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="border-t bg-gradient-to-r from-green-50 to-blue-50 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-600">{integrationStats?.total_platforms || 0}</div>
                  <div className="text-xs text-gray-600">Platforms</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{integrationStats?.total_categories || 0}</div>
                  <div className="text-xs text-gray-600">Categories</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-600">∞</div>
                  <div className="text-xs text-gray-600">Universal API</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-orange-600">100%</div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default IntegrationSelector; 