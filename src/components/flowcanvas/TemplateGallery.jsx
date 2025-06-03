import React from 'react';
import PropTypes from 'prop-types';
import { useFlow } from '../../contexts/FlowContext';
import { useBuilderUI } from '../../contexts/BuilderUIContext';
import { flowTemplates } from '../../data/flowTemplates';
import { toast } from 'react-hot-toast';

const TemplateGallery = () => {
  const { applyTemplate } = useFlow();
  const { toggleTemplateGallery } = useBuilderUI();

  // Get featured flow templates (limit to 6 for quick access)
  const featuredTemplates = React.useMemo(() => {
    return flowTemplates.slice(0, 6);
  }, []);

  const handleApplyTemplate = (template) => {
    try {
      // Apply template with auto-fit and completion callback
      applyTemplate(template, {
        fitView: true,
        onComplete: (newNodes, newEdges) => {
          // Show success message
          toast.success(`✅ Applied "${template.name}" with ${newNodes.length} nodes and ${newEdges.length} connections!`);
          
          // Auto-close template gallery
          toggleTemplateGallery(false);
          
          // Additional fitView with delay to ensure nodes are rendered
          setTimeout(() => {
            if (window.flowInstance?.current?.fitView) {
              window.flowInstance.current.fitView({ 
                padding: 0.1, 
                duration: 800,
                maxZoom: 1.2 
              });
            }
          }, 200);
        }
      });
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error(`❌ Failed to apply template: ${error.message}`);
    }
  };

  // Helper function to render the icon based on template
  const renderTemplateIcon = (template) => {
    // Use template metadata or default icons
    const iconClasses = `w-8 h-8 mr-2 rounded flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white`;
    
    // Template-specific icons
    if (template.name.includes('Enterprise') || template.name.includes('Business Intelligence')) {
      return <div className={iconClasses}>🏢</div>;
    } else if (template.name.includes('Market Analysis')) {
      return <div className={iconClasses}>📊</div>;
    } else if (template.name.includes('Support')) {
      return <div className={iconClasses}>🎧</div>;
    } else if (template.name.includes('Lead')) {
      return <div className={iconClasses}>🎯</div>;
    } else if (template.name.includes('RAG') || template.name.includes('Research')) {
      return <div className={iconClasses}>🔍</div>;
    } else if (template.name.includes('Email')) {
      return <div className={iconClasses}>📧</div>;
    } else if (template.name.includes('Crypto')) {
      return <div className={iconClasses}>🔥</div>;
    } else {
      return <div className={iconClasses}>🚀</div>;
    }
  };
  
  return (
    <div className="absolute bottom-16 left-2 right-2 bg-white rounded-lg shadow-lg z-10 p-4 max-h-[400px] overflow-y-auto border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">🔥 Flow Templates</h3>
          <p className="text-xs text-gray-600">Ready-to-use AI workflows with animated connections</p>
        </div>
        <button 
          onClick={() => toggleTemplateGallery(false)}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {featuredTemplates.map((template, idx) => (
          <div 
            key={idx}
            className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md group"
            onClick={() => handleApplyTemplate(template)}
          >
            <div className="flex items-start mb-2">
              {renderTemplateIcon(template)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-800 truncate group-hover:text-blue-700">
                  {template.name}
                </h4>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">{template.description}</p>
              </div>
            </div>
            
            {/* Template metadata */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-wrap gap-1">
                {template.tags && template.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                {template.nodes ? `${template.nodes.length} nodes` : 'Template'}
              </div>
            </div>
            
            {/* Complexity and features indicator */}
            {template.complexity && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500">Complexity: </span>
                  <span className={`font-medium ${
                    template.complexity === 'Simple' ? 'text-green-600' :
                    template.complexity === 'Medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {template.complexity}
                  </span>
                </div>
                {template.metadata?.agentCount && (
                  <div className="text-gray-500">
                    🤖 {template.metadata.agentCount} agents
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* View all templates button */}
      <div className="mt-4 text-center">
        <button 
          onClick={() => {
            // This would open the full template modal
            toggleTemplateGallery(false);
            // You could dispatch an event or call a function to open the full template browser
          }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
        >
          View All Templates →
        </button>
      </div>
    </div>
  );
};

export default TemplateGallery;