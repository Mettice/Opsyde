// components/Builder/TemplateModal.js
import React from 'react';

const TemplateModal = ({ templates, onClose, onSelectTemplate }) => {
  const getOptimizationBadge = (template) => {
    // Check if it's an optimized template (has "Optimized" in name or specific properties)
    const isOptimized = template.name.includes('Optimized') || 
                       template.complexity === 'Simple' || 
                       template.nodeCount <= 6;
    
    if (isOptimized) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 ml-2">
          ⚡ Optimized
        </span>
      );
    }
    return null;
  };

  const getTemplateBadge = (template) => {
    // Check if it's a LinkedIn template
    const isLinkedIn = template.category || 
                      template.name.toLowerCase().includes('linkedin') ||
                      template.tags?.includes('LinkedIn');
    
    if (isLinkedIn) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 ml-2">
          💼 LinkedIn
        </span>
      );
    }
    
    return getOptimizationBadge(template);
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'Simple': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Advanced': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  // Separate templates into categories for better organization
  const optimizedTemplates = templates.filter(t => 
    t.name.includes('Optimized') || t.complexity === 'Simple' || t.nodeCount <= 6
  );
  
  const linkedinTemplates = templates.filter(t => 
    t.category || t.name.toLowerCase().includes('linkedin') || t.tags?.includes('LinkedIn')
  );
  
  const otherTemplates = templates.filter(t => 
    !optimizedTemplates.includes(t) && !linkedinTemplates.includes(t)
  );

  const renderTemplateSection = (sectionTemplates, title, description, bgColor = "bg-gray-50") => {
    if (sectionTemplates.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className={`${bgColor} border border-gray-200 rounded-lg p-3 mb-4`}>
          <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionTemplates.map((template, index) => (
            <div 
              key={index}
              className="border rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition duration-200 group"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-gray-800 group-hover:text-blue-700">{template.name}</h4>
                {getTemplateBadge(template)}
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
              
              {/* Template Metrics */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  🔗 {template.nodeCount || template.nodes?.length || 0} nodes
                </span>
                <span className="flex items-center gap-1">
                  🤖 {template.agentCount || template.nodes?.filter(n => n.type === 'agent').length || 0} agents
                </span>
                <span className="flex items-center gap-1">
                  ⏱️ {template.estimatedTime || 'Unknown'}
                </span>
              </div>

              {/* Tags and Category */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {/* Show category for LinkedIn templates */}
                  {template.category && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {template.category}
                    </span>
                  )}
                  {/* Show tags for other templates */}
                  {template.tags && template.tags.slice(0, template.category ? 2 : 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                
                {template.complexity && (
                  <span className={`text-xs font-medium ${getComplexityColor(template.complexity)}`}>
                    {template.complexity}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">🚀 Select a Template</h2>
            <p className="text-sm text-gray-600 mt-1">Choose from optimized workflows and specialized LinkedIn automation</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Benefits Banner */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="text-green-800 font-semibold">⚡ Optimized</div>
              <div className="text-green-600 text-xs">Fast & Efficient</div>
            </div>
            <div>
              <div className="text-blue-800 font-semibold">💼 LinkedIn</div>
              <div className="text-blue-600 text-xs">Social Automation</div>
            </div>
            <div>
              <div className="text-purple-800 font-semibold">🎯 Ready-to-Use</div>
              <div className="text-purple-600 text-xs">No Setup Required</div>
            </div>
            <div>
              <div className="text-orange-800 font-semibold">✅ Tested</div>
              <div className="text-orange-600 text-xs">Production Ready</div>
            </div>
          </div>
        </div>

        {/* Template Sections */}
        {renderTemplateSection(
          optimizedTemplates, 
          "⚡ Optimized Templates", 
          "Streamlined, cost-effective workflows with 70% faster execution and 75% cost savings",
          "bg-green-50"
        )}
        
        {renderTemplateSection(
          linkedinTemplates, 
          "💼 LinkedIn Automation", 
          "Specialized templates for LinkedIn lead generation, content marketing, and recruitment",
          "bg-blue-50"
        )}
        
        {renderTemplateSection(
          otherTemplates, 
          "📋 Additional Templates", 
          "Other available workflow templates"
        )}
        
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {templates.length} templates available • {optimizedTemplates.length} optimized • {linkedinTemplates.length} LinkedIn
          </div>
          <button 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TemplateModal);