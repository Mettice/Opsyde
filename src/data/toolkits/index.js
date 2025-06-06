// Toolkit Registry - Import and export all available toolkits
import HuggingFaceToolKit from './HuggingFaceToolKit.json';

// Export all toolkits for the template registry
export const toolkits = {
  huggingface: HuggingFaceToolKit
};

// Export individual toolkits
export { HuggingFaceToolKit };

// Utility functions for toolkit management
export const getAvailableToolkits = () => {
  return Object.keys(toolkits);
};

export const getToolkitByProvider = (provider) => {
  return toolkits[provider] || null;
};

export const getAllTools = () => {
  const allTools = [];
  Object.values(toolkits).forEach(toolkit => {
    if (toolkit.tools) {
      allTools.push(...toolkit.tools);
    }
  });
  return allTools;
};

export const getToolsByCategory = (category) => {
  const allTools = getAllTools();
  return allTools.filter(tool => tool.category === category);
};

export const getVerifiedTools = () => {
  const allTools = getAllTools();
  return allTools.filter(tool => tool.verified === true);
};

// Export toolkit metadata
export const toolkitMetadata = {
  totalToolkits: Object.keys(toolkits).length,
  totalTools: getAllTools().length,
  verifiedTools: getVerifiedTools().length,
  categories: [...new Set(getAllTools().map(tool => tool.category))],
  providers: Object.keys(toolkits)
}; 