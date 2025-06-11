// Simple template system - exactly what you asked for
import { flowTemplates } from './flowTemplates';
import { optimizedTemplates } from './optimizedTemplates';
import { linkedinTemplates as linkedinTemplatesFromFile } from './linkedinTemplates';
import { linkedinEcosystemDemo } from '../../demo_linkedin_ecosystem.js';

// Export the two template sets for the toggle
export { 
  flowTemplates,           // Original flow templates for builder  
  optimizedTemplates       // Optimized templates for builder
};

// LinkedIn templates (from dedicated file + demo + any from flow templates)
const linkedinFromFlow = flowTemplates.filter(t => 
  t.name?.toLowerCase().includes('linkedin')
);

// Create combined LinkedIn templates for internal use
const combinedLinkedInTemplates = [
  linkedinEcosystemDemo,           // The main LinkedIn demo
  ...linkedinTemplatesFromFile,    // Other LinkedIn templates
  ...linkedinFromFlow              // Any from flow templates
];

// Template categories for easy organization
export const templateCategories = {
  optimized: {
    name: '⚡ Optimized',
    description: 'High-performance, streamlined workflows',
    templates: optimizedTemplates,
    priority: 'high'
  },
  flow: {
    name: '🏭 Flow Templates', 
    description: 'Original comprehensive flow templates',
    templates: flowTemplates,
    priority: 'medium'
  },
  linkedin: {
    name: '💼 LinkedIn',
    description: 'LinkedIn-focused workflows',
    templates: combinedLinkedInTemplates,
    priority: 'medium'
  }
};

// Simple metrics
export const templateMetrics = {
  optimized: optimizedTemplates.length,
  flow: flowTemplates.length,
  linkedin: combinedLinkedInTemplates.length,
  total: optimizedTemplates.length + flowTemplates.length + combinedLinkedInTemplates.length
};

// Combined templates for "All" view
export const allTemplates = [...optimizedTemplates, ...flowTemplates, ...combinedLinkedInTemplates];

// Backward compatibility exports
export const coreFlowTemplates = flowTemplates;  // Alias for original flow templates
export const linkedinTemplates = combinedLinkedInTemplates;

// Export additional data files (using correct named exports)
export { default as socialMediaTemplates, allSocialMediaTools, socialMediaCategories } from './social_media_templates.js';
export { default as toolRegistry } from './tool_registry.json';
export { agentTemplates } from './agentTemplates.js';
export { taskTemplates } from './taskTemplates.js';
export { demoTemplates } from './demoTemplates.js';
export { FRAMEWORK_MODELS, getAvailableModels, isModelNativelySupported, getFrameworkProviders, getProviderSupport } from './frameworkModels.js'; 