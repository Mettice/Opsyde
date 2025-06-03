import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const EndpointConfiguration = ({ formData, handleInputChange }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Enhanced API Templates with Categories
  const apiTemplates = [
    // 📊 Data & Productivity
    {
      name: 'Airtable',
      icon: '📊',
      category: 'data',
      serviceName: 'Airtable',
      endpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
      authType: 'api_key',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-blue-100 hover:bg-blue-200',
      textColor: 'text-blue-700',
      description: 'Monitor your Airtable bases for new records'
    },
    {
      name: 'Notion',
      icon: '📝',
      category: 'data',
      serviceName: 'Notion',
      endpoint: 'https://api.notion.com/v1/databases/YOUR_DATABASE_ID/query',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-purple-100 hover:bg-purple-200',
      textColor: 'text-purple-700',
      description: 'Monitor Notion databases for changes'
    },
    {
      name: 'Google Sheets (CSV)',
      icon: '📈',
      category: 'data',
      serviceName: 'Google Sheets',
      endpoint: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0&usp=sharing',
      authType: 'none',
      changeDetectionMethod: 'response_hash',
      bgColor: 'bg-green-100 hover:bg-green-200',
      textColor: 'text-green-700',
      description: 'Monitor Google Sheets via CSV export'
    },
    {
      name: 'Google Sheets API',
      icon: '📊',
      category: 'data',
      serviceName: 'Google Sheets API',
      endpoint: 'https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1?key=YOUR_API_KEY',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-green-100 hover:bg-green-200',
      textColor: 'text-green-700',
      description: 'Monitor Google Sheets via official API'
    },

    // 💰 Finance & Trading
    {
      name: 'DexScreener',
      icon: '🔥',
      category: 'finance',
      serviceName: 'DexScreener',
      endpoint: 'https://api.dexscreener.com/latest/dex/search?q=PEPE',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-orange-100 hover:bg-orange-200',
      textColor: 'text-orange-700',
      description: 'Monitor crypto tokens on DEX exchanges'
    },
    {
      name: 'CoinGecko',
      icon: '🪙',
      category: 'finance',
      serviceName: 'CoinGecko',
      endpoint: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      authType: 'none',
      changeDetectionMethod: 'response_hash',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200',
      textColor: 'text-yellow-700',
      description: 'Monitor cryptocurrency prices'
    },
    {
      name: 'Stripe',
      icon: '💳',
      category: 'finance',
      serviceName: 'Stripe',
      endpoint: 'https://api.stripe.com/v1/charges',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-indigo-100 hover:bg-indigo-200',
      textColor: 'text-indigo-700',
      description: 'Monitor Stripe payments and transactions'
    },

    // 📧 Communication
    {
      name: 'Slack',
      icon: '💬',
      category: 'communication',
      serviceName: 'Slack',
      endpoint: 'https://slack.com/api/conversations.history?channel=YOUR_CHANNEL_ID',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-orange-100 hover:bg-orange-200',
      textColor: 'text-orange-700',
      description: 'Monitor Slack channels for new messages'
    },
    {
      name: 'Gmail',
      icon: '📧',
      category: 'communication',
      serviceName: 'Gmail',
      endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-red-100 hover:bg-red-200',
      textColor: 'text-red-700',
      description: 'Monitor Gmail for new emails'
    },
    {
      name: 'Discord',
      icon: '💬',
      category: 'communication',
      serviceName: 'Discord',
      endpoint: 'https://discord.com/api/v10/channels/YOUR_CHANNEL_ID/messages',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-purple-100 hover:bg-purple-200',
      textColor: 'text-purple-700',
      description: 'Monitor Discord channels for new messages'
    },
    {
      name: 'Telegram',
      icon: '📱',
      category: 'communication',
      serviceName: 'Telegram',
      endpoint: 'https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-blue-100 hover:bg-blue-200',
      textColor: 'text-blue-700',
      description: 'Monitor Telegram bot for new messages'
    },

    // 🛒 E-commerce
    {
      name: 'Shopify',
      icon: '🛒',
      category: 'ecommerce',
      serviceName: 'Shopify',
      endpoint: 'https://YOUR_STORE.myshopify.com/admin/api/2023-10/orders.json',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-green-100 hover:bg-green-200',
      textColor: 'text-green-700',
      description: 'Monitor Shopify orders and products'
    },
    {
      name: 'WooCommerce',
      icon: '🛍️',
      category: 'ecommerce',
      serviceName: 'WooCommerce',
      endpoint: 'https://yoursite.com/wp-json/wc/v3/orders',
      authType: 'basic_auth',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-purple-100 hover:bg-purple-200',
      textColor: 'text-purple-700',
      description: 'Monitor WooCommerce orders'
    },

    // 🐙 Development
    {
      name: 'GitHub',
      icon: '🐙',
      category: 'development',
      serviceName: 'GitHub',
      endpoint: 'https://api.github.com/repos/OWNER/REPO/issues',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-gray-100 hover:bg-gray-200',
      textColor: 'text-gray-700',
      description: 'Monitor GitHub issues, PRs, and commits'
    },
    {
      name: 'GitLab',
      icon: '🦊',
      category: 'development',
      serviceName: 'GitLab',
      endpoint: 'https://gitlab.com/api/v4/projects/PROJECT_ID/issues',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-orange-100 hover:bg-orange-200',
      textColor: 'text-orange-700',
      description: 'Monitor GitLab issues and merge requests'
    },

    // 📈 Marketing
    {
      name: 'HubSpot',
      icon: '📈',
      category: 'marketing',
      serviceName: 'HubSpot',
      endpoint: 'https://api.hubapi.com/contacts/v1/lists/all/contacts/all',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-orange-100 hover:bg-orange-200',
      textColor: 'text-orange-700',
      description: 'Monitor HubSpot contacts and deals'
    },
    {
      name: 'Mailchimp',
      icon: '🐵',
      category: 'marketing',
      serviceName: 'Mailchimp',
      endpoint: 'https://us1.api.mailchimp.com/3.0/lists/LIST_ID/members',
      authType: 'bearer_token',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200',
      textColor: 'text-yellow-700',
      description: 'Monitor Mailchimp subscribers and campaigns'
    },

    // 🧪 Testing & Demo
    {
      name: 'Test API',
      icon: '🧪',
      category: 'test',
      serviceName: 'JSONPlaceholder',
      endpoint: 'https://jsonplaceholder.typicode.com/posts',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200',
      textColor: 'text-yellow-700',
      description: 'Test API for demos and learning'
    },
    {
      name: 'Countries API',
      icon: '🌍',
      category: 'test',
      serviceName: 'REST Countries',
      endpoint: 'https://restcountries.com/v3.1/all',
      authType: 'none',
      changeDetectionMethod: 'array_length',
      bgColor: 'bg-red-100 hover:bg-red-200',
      textColor: 'text-red-700',
      description: 'World countries data for testing'
    }
  ];

  // Category definitions
  const categories = [
    { id: 'all', name: 'All Services', icon: '🔍', count: apiTemplates.length },
    { id: 'data', name: 'Data & Productivity', icon: '📊', count: apiTemplates.filter(t => t.category === 'data').length },
    { id: 'finance', name: 'Finance & Trading', icon: '💰', count: apiTemplates.filter(t => t.category === 'finance').length },
    { id: 'communication', name: 'Communication', icon: '📧', count: apiTemplates.filter(t => t.category === 'communication').length },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒', count: apiTemplates.filter(t => t.category === 'ecommerce').length },
    { id: 'development', name: 'Development', icon: '🐙', count: apiTemplates.filter(t => t.category === 'development').length },
    { id: 'marketing', name: 'Marketing', icon: '📈', count: apiTemplates.filter(t => t.category === 'marketing').length },
    { id: 'test', name: 'Testing', icon: '🧪', count: apiTemplates.filter(t => t.category === 'test').length }
  ];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? apiTemplates 
    : apiTemplates.filter(template => template.category === selectedCategory);

  const handleTemplateClick = (template) => {
    handleInputChange({ target: { name: 'serviceName', value: template.serviceName } });
    handleInputChange({ target: { name: 'apiEndpoint', value: template.endpoint } });
    handleInputChange({ target: { name: 'authType', value: template.authType } });
    if (template.changeDetectionMethod) {
      handleInputChange({ target: { name: 'changeDetectionMethod', value: template.changeDetectionMethod } });
    }
    
    // Show success toast with template info
    toast.success(`🎯 ${template.name} template applied! Update placeholder values with your actual IDs.`, { 
      duration: 4000,
      icon: template.icon 
    });
  };

  const handleEndpointChange = (e) => {
    let url = e.target.value;
    
    // Auto-convert Airtable web URLs to API URLs
    if (url.includes('airtable.com/app') && !url.includes('api.airtable.com')) {
      const match = url.match(/airtable\.com\/(app[^\/]+)\/([^\/]+)/);
      if (match) {
        const baseId = match[1];
        const tableId = match[2];
        url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
        
        // Show a helpful toast
        setTimeout(() => {
          toast.success(`🔄 Auto-converted to API URL: ${url}`, { duration: 4000 });
        }, 100);
      }
    }
    
    handleInputChange({ target: { name: 'apiEndpoint', value: url } });
  };

  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          Service/API Name
        </label>
        <input
          type="text"
          name="serviceName"
          value={formData.serviceName || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="e.g., Airtable, Notion, Slack, Stripe, GitHub, Custom CRM, etc."
        />
        <div className="text-xs text-gray-500 mt-1">
          What service are you monitoring? (helps with auto-configuration)
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          API Endpoint URL
        </label>
        <input
          type="url"
          name="apiEndpoint"
          value={formData.apiEndpoint || ''}
          onChange={handleEndpointChange}
          className="w-full p-2 border rounded"
          placeholder="https://api.example.com/endpoint or any API URL"
        />
        <div className="text-xs text-gray-500 mt-1">
          The API endpoint to monitor for changes
        </div>
        
        {/* Enhanced Service Templates with Categories */}
        <div className="mt-3 space-y-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category.icon} {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Service Templates Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredTemplates.map((template, index) => (
              <button
                key={index}
                type="button"
                className={`text-xs ${template.bgColor} ${template.textColor} p-2 rounded-lg border border-opacity-30 transition-all hover:scale-105 hover:shadow-sm text-left`}
                onClick={() => handleTemplateClick(template)}
                title={template.description}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">{template.icon}</span>
                  <span className="font-medium truncate">{template.name}</span>
                </div>
                <div className="text-xs opacity-75 line-clamp-2">
                  {template.description}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <strong className="text-blue-800">Quick Setup Tips:</strong>
          </div>
          <div className="text-xs space-y-1 text-blue-700">
            <div>• <strong>Choose a template</strong> above to auto-fill configuration</div>
            <div>• <strong>Replace placeholder values</strong> (YOUR_API_KEY, etc.) with actual IDs</div>
            <div>• <strong>Test the connection</strong> using the Testing section below</div>
            <div>• <strong>Popular choice:</strong> DexScreener for crypto, Airtable for data, Gmail for emails</div>
          </div>
        </div>
        
        {/* Service-specific guidance */}
        {formData.serviceName && formData.serviceName.toLowerCase().includes('google') && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <strong className="text-green-800 flex items-center gap-1">
              <span>📊</span> Google Sheets Setup Guide:
            </strong>
            <div className="mt-2 space-y-1 text-xs text-green-700">
              <div>1. <strong>Make sheet public:</strong> Share → "Anyone with the link can view"</div>
              <div>2. <strong>Get Sheet ID:</strong> Copy from URL between /d/ and /edit</div>
              <div>3. <strong>Example Sheet ID:</strong> <code className="bg-white px-1 rounded">1idkMT0Jq_0RQQOVTL6J-wMdO0Mws6AR72-74o84d8e8</code></div>
              <div>4. <strong>Test URL:</strong> Replace YOUR_SHEET_ID with your actual ID</div>
            </div>
          </div>
        )}

        {formData.serviceName && formData.serviceName.toLowerCase().includes('dexscreener') && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <strong className="text-orange-800 flex items-center gap-1">
              <span>🔥</span> DexScreener Setup Guide:
            </strong>
            <div className="mt-2 space-y-1 text-xs text-orange-700">
              <div>1. <strong>No API key needed</strong> - DexScreener is free!</div>
              <div>2. <strong>Change token symbol:</strong> Replace "PEPE" with your token (e.g., BTC, ETH)</div>
              <div>3. <strong>Monitor multiple tokens:</strong> Use "PEPE,BTC,ETH" format</div>
              <div>4. <strong>Perfect for:</strong> Crypto price monitoring, new token alerts</div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          Polling Interval
        </label>
        <select
          name="pollingInterval"
          value={formData.pollingInterval || '300'}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          <option value="30">Every 30 seconds (High frequency)</option>
          <option value="60">Every 1 minute (Real-time)</option>
          <option value="300">Every 5 minutes (Recommended)</option>
          <option value="600">Every 10 minutes (Balanced)</option>
          <option value="1800">Every 30 minutes (Light monitoring)</option>
          <option value="3600">Every 1 hour (Background checks)</option>
        </select>
        <div className="text-xs text-gray-500 mt-1">
          How often to check for changes. More frequent = more responsive but higher costs.
        </div>
      </div>
    </>
  );
};

EndpointConfiguration.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default EndpointConfiguration; 