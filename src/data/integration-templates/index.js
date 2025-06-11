// Unified Integration Templates Index
// Combines all modular integration categories

import communicationTemplates, { allCommunicationTools } from './communication.js';
import productivityTemplates, { allProductivityTools } from './productivity.js';
import developerTemplates, { allDeveloperTools } from './developer.js';
import marketingTemplates, { allMarketingTools } from './marketing.js';
import crmTemplates, { allCrmTools } from './crm.js';
import ecommerceTemplates, { allEcommerceTools } from './ecommerce.js';
import storageTemplates, { allStorageTools } from './storage.js';

// Export all templates by category
export {
  communicationTemplates,
  productivityTemplates,
  developerTemplates,
  marketingTemplates,
  crmTemplates,
  ecommerceTemplates,
  storageTemplates
};

// Export individual category arrays
export {
  allCommunicationTools,
  allProductivityTools,
  allDeveloperTools,
  allMarketingTools,
  allCrmTools,
  allEcommerceTools,
  allStorageTools
};

// Combined integration templates by category
export const integrationTemplates = {
  communication: communicationTemplates,
  productivity: productivityTemplates,
  developer: developerTemplates,
  marketing: marketingTemplates,
  crm: crmTemplates,
  ecommerce: ecommerceTemplates,
  storage: storageTemplates
};

// All tools combined into a single flat array
export const allIntegrationTools = [
  ...allCommunicationTools,
  ...allProductivityTools,
  ...allDeveloperTools,
  ...allMarketingTools,
  ...allCrmTools,
  ...allEcommerceTools,
  ...allStorageTools
];

// Category metadata for UI organization
export const integrationCategories = {
  communication: {
    name: 'Communication',
    icon: '💬',
    description: 'Team communication and messaging platforms',
    platforms: ['Slack', 'Discord', 'Teams'],
    color: '#4F46E5'
  },
  productivity: {
    name: 'Productivity',
    icon: '📊',
    description: 'Productivity and organization tools',
    platforms: ['Notion', 'Airtable', 'Google Sheets'],
    color: '#059669'
  },
  developer: {
    name: 'Developer',
    icon: '⚡',
    description: 'Development and automation tools',
    platforms: ['GitHub', 'GitLab', 'Webhooks'],
    color: '#DC2626'
  },
  marketing: {
    name: 'Marketing',
    icon: '📧',
    description: 'Email marketing and campaign tools',
    platforms: ['Mailchimp', 'SendGrid'],
    color: '#7C3AED'
  },
  crm: {
    name: 'CRM',
    icon: '👥',
    description: 'Customer relationship management',
    platforms: ['HubSpot', 'Salesforce'],
    color: '#EA580C'
  },
  ecommerce: {
    name: 'E-commerce',
    icon: '🛒',
    description: 'Online store and payment processing',
    platforms: ['Shopify', 'Stripe'],
    color: '#0D9488'
  },
  storage: {
    name: 'Storage',
    icon: '☁️',
    description: 'Cloud storage and file management',
    platforms: ['Google Drive', 'Dropbox'],
    color: '#0891B2'
  }
};

// Tool search and filtering utilities
export const searchTools = (query, category = null) => {
  let tools = category ? 
    integrationTemplates[category] ? Object.values(integrationTemplates[category]).flat() : [] :
    allIntegrationTools;
    
  if (!query) return tools;
  
  const searchLower = query.toLowerCase();
  return tools.filter(tool => 
    tool.name.toLowerCase().includes(searchLower) ||
    tool.description.toLowerCase().includes(searchLower) ||
    tool.category.toLowerCase().includes(searchLower) ||
    tool.frameworkConfig?.service_name?.toLowerCase().includes(searchLower)
  );
};

export const getToolsByCategory = (category) => {
  if (!integrationTemplates[category]) return [];
  return Object.values(integrationTemplates[category]).flat();
};

export const getToolById = (toolId) => {
  return allIntegrationTools.find(tool => tool.id === toolId);
};

export const getToolsByPlatform = (platform) => {
  const platformLower = platform.toLowerCase();
  return allIntegrationTools.filter(tool => 
    tool.frameworkConfig?.service_name?.toLowerCase().includes(platformLower) ||
    tool.name.toLowerCase().includes(platformLower)
  );
};

// Statistics
export const getIntegrationStats = () => {
  const stats = {
    totalTools: allIntegrationTools.length,
    totalCategories: Object.keys(integrationCategories).length,
    totalPlatforms: Object.values(integrationCategories).reduce((sum, cat) => sum + cat.platforms.length, 0),
    categoriesBreakdown: {}
  };
  
  Object.keys(integrationCategories).forEach(category => {
    const tools = getToolsByCategory(category);
    stats.categoriesBreakdown[category] = {
      toolCount: tools.length,
      platforms: integrationCategories[category].platforms
    };
  });
  
  return stats;
};

// Quick access to popular tools
export const popularTools = {
  communication: [
    'slack-message',
    'discord-message',
    'teams-message'
  ],
  productivity: [
    'notion-create-page',
    'sheets-append-row',
    'airtable-create-record'
  ],
  developer: [
    'github-create-issue',
    'custom-webhook',
    'slack-webhook'
  ],
  marketing: [
    'sendgrid-send-email',
    'mailchimp-add-subscriber'
  ],
  crm: [
    'hubspot-create-contact',
    'salesforce-create-lead'
  ],
  ecommerce: [
    'shopify-create-product',
    'stripe-create-customer'
  ],
  storage: [
    'drive-upload-file',
    'dropbox-upload-file'
  ]
};

export const getPopularTools = (category = null) => {
  if (category && popularTools[category]) {
    return popularTools[category].map(toolId => getToolById(toolId)).filter(Boolean);
  }
  
  return Object.values(popularTools).flat().map(toolId => getToolById(toolId)).filter(Boolean);
};

// Default export
export default {
  templates: integrationTemplates,
  tools: allIntegrationTools,
  categories: integrationCategories,
  search: searchTools,
  getToolsByCategory,
  getToolById,
  getToolsByPlatform,
  getStats: getIntegrationStats,
  getPopular: getPopularTools
}; 