// Example: How to import and use LinkedIn templates in your components

// ============================================
// BASIC IMPORT
// ============================================
import { linkedinTemplates } from '../data/linkedinTemplates';

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Get all LinkedIn templates
export const getAllLinkedInTemplates = () => {
  return linkedinTemplates;
};

// Example 2: Filter templates by category
export const getLinkedInTemplatesByCategory = (category) => {
  return linkedinTemplates.filter(template => template.category === category);
};

// Example 3: Get specific template by ID
export const getLinkedInTemplateById = (templateId) => {
  return linkedinTemplates.find(template => template.id === templateId);
};

// Example 4: Search templates by keyword
export const searchLinkedInTemplates = (keyword) => {
  const searchTerm = keyword.toLowerCase();
  return linkedinTemplates.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

// ============================================
// REACT COMPONENT EXAMPLES
// ============================================

// Example 5: LinkedIn Template Selector Component
export const LinkedInTemplateSelector = ({ onSelectTemplate }) => {
  const categories = ['Lead Generation', 'Content Marketing', 'Recruitment', 'Event Marketing', 'Competitive Intelligence'];
  
  return (
    <div className="linkedin-template-selector">
      <h3>💼 LinkedIn Automation Templates</h3>
      
      {categories.map(category => {
        const templates = getLinkedInTemplatesByCategory(category);
        return (
          <div key={category} className="category-section">
            <h4>{category} ({templates.length})</h4>
            <div className="templates-grid">
              {templates.map(template => (
                <div 
                  key={template.id}
                  className="template-card"
                  onClick={() => onSelectTemplate(template)}
                >
                  <h5>{template.name}</h5>
                  <p>{template.description}</p>
                  <div className="template-meta">
                    <span className="difficulty">{template.difficulty}</span>
                    <span className="time">{template.estimatedTime}</span>
                    <span className="nodes">{template.nodes.length} nodes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Example 6: Quick Access LinkedIn Templates
export const QuickLinkedInTemplates = ({ onApplyTemplate }) => {
  // Get most popular templates (first 3)
  const popularTemplates = linkedinTemplates.slice(0, 3);
  
  return (
    <div className="quick-linkedin-templates">
      <h4>🚀 Popular LinkedIn Templates</h4>
      {popularTemplates.map(template => (
        <button 
          key={template.id}
          className="quick-template-btn"
          onClick={() => onApplyTemplate(template)}
        >
          {template.name}
        </button>
      ))}
    </div>
  );
};

// ============================================
// INTEGRATION WITH EXISTING TEMPLATES
// ============================================

// Example 7: Combine with existing flow templates
import { flowTemplates } from '../data/flowTemplates';

export const getAllTemplates = () => {
  return {
    flowTemplates,
    linkedinTemplates,
    allTemplates: [...flowTemplates, ...linkedinTemplates]
  };
};

// Example 8: Template statistics
export const getTemplateStats = () => {
  return {
    total: linkedinTemplates.length,
    byCategory: {
      'Lead Generation': getLinkedInTemplatesByCategory('Lead Generation').length,
      'Content Marketing': getLinkedInTemplatesByCategory('Content Marketing').length,
      'Recruitment': getLinkedInTemplatesByCategory('Recruitment').length,
      'Event Marketing': getLinkedInTemplatesByCategory('Event Marketing').length,
      'Competitive Intelligence': getLinkedInTemplatesByCategory('Competitive Intelligence').length,
    },
    byDifficulty: {
      'Beginner': linkedinTemplates.filter(t => t.difficulty === 'Beginner').length,
      'Intermediate': linkedinTemplates.filter(t => t.difficulty === 'Intermediate').length,
      'Advanced': linkedinTemplates.filter(t => t.difficulty === 'Advanced').length,
    }
  };
};

// ============================================
// TEMPLATE VALIDATION
// ============================================

// Example 9: Validate template structure
export const validateLinkedInTemplate = (template) => {
  const required = ['id', 'name', 'description', 'category', 'difficulty', 'nodes', 'edges'];
  const missing = required.filter(field => !template[field]);
  
  return {
    isValid: missing.length === 0,
    missingFields: missing,
    nodeCount: template.nodes?.length || 0,
    edgeCount: template.edges?.length || 0
  };
};

// Example 10: Template preview data
export const getTemplatePreview = (templateId) => {
  const template = getLinkedInTemplateById(templateId);
  if (!template) return null;
  
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    difficulty: template.difficulty,
    estimatedTime: template.estimatedTime,
    nodeCount: template.nodes.length,
    edgeCount: template.edges.length,
    tags: template.tags,
    benefits: template.metadata?.benefits || [],
    useCases: template.metadata?.useCases || []
  };
};

// ============================================
// USAGE IN DIFFERENT CONTEXTS
// ============================================

/*
// In TemplateGallery.jsx:
import { linkedinTemplates } from '../data/linkedinTemplates';
const allTemplates = [...flowTemplates, ...linkedinTemplates];

// In TemplateModal.jsx:
import { linkedinTemplates } from '../data/linkedinTemplates';
// Add LinkedIn tab and include in search

// In FlowBuilder.jsx:
import { getAllTemplates } from '../examples/linkedinTemplateUsage';
const { allTemplates } = getAllTemplates();

// In Search functionality:
import { searchLinkedInTemplates } from '../examples/linkedinTemplateUsage';
const results = searchLinkedInTemplates('lead generation');

*/

export default {
  getAllLinkedInTemplates,
  getLinkedInTemplatesByCategory,
  getLinkedInTemplateById,
  searchLinkedInTemplates,
  getAllTemplates,
  getTemplateStats,
  validateLinkedInTemplate,
  getTemplatePreview
}; 