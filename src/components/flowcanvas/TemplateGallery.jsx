import React from 'react';
import PropTypes from 'prop-types';
import { useFlow } from '../../contexts/FlowContext';
import { useBuilderUI } from '../../contexts/BuilderUIContext';
import { 
  optimizedTemplates,
  flowTemplates,
  templateMetrics,
  templateCategories
} from '../../data/index';
import { toast } from 'react-hot-toast';

const TemplateGallery = () => {
  const { applyTemplate } = useFlow();
  const { toggleTemplateGallery } = useBuilderUI();
  
  // Enhanced template mode state: 'optimized', 'flow', or 'all'
  const [templateMode, setTemplateMode] = React.useState('optimized');

  // Get templates based on current mode
  const displayedTemplates = React.useMemo(() => {
    switch (templateMode) {
      case 'optimized':
        return optimizedTemplates;
      case 'flow':
        return flowTemplates;
      case 'all':
        return [...optimizedTemplates, ...flowTemplates];
      default:
        return optimizedTemplates;
    }
  }, [templateMode]);

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 TemplateGallery Debug:');
    console.log('  Template mode:', templateMode);
    console.log('  Optimized templates:', optimizedTemplates?.length || 0);
    console.log('  Original flow templates:', flowTemplates?.length || 0);
    console.log('  Displayed templates:', displayedTemplates?.length || 0);
    console.log('  Template metrics:', templateMetrics);
  }, [templateMode, displayedTemplates]);

  const handleApplyTemplate = (template) => {
    try {
      console.log('🚀 Applying template:', template.name);
      
      applyTemplate(template, {
        fitView: true,
        onComplete: (newNodes, newEdges) => {
          toast.success(`✅ Applied "${template.name}" with ${newNodes.length} nodes and ${newEdges.length} connections!`);
          toggleTemplateGallery(false);
          
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

  // Helper function to get template source badge
  const getTemplateBadge = (template) => {
    const isOptimized = optimizedTemplates.some(opt => opt.id === template.id || opt.name === template.name);
    const isOriginal = flowTemplates.some(flow => flow.id === template.id || flow.name === template.name);
    
    if (isOptimized) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          ⚡ Optimized
        </span>
      );
    }
    
    if (isOriginal) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          🏭 Original
        </span>
      );
    }
    
    return null;
  };

  // Helper function to get template performance metrics
  const getTemplateMetrics = (template) => {
    const nodeCount = template.nodeCount || template.nodes?.length || 0;
    const agentCount = template.agentCount || template.nodes?.filter(n => n.type === 'agent').length || 0;
    const estimatedTime = template.estimatedTime || 'Unknown';

    return { nodeCount, agentCount, estimatedTime };
  };

  // Helper function to render the icon based on template
  const renderTemplateIcon = (template) => {
    const iconClasses = `w-8 h-8 mr-2 rounded flex items-center justify-center bg-gradient-to-r text-white text-sm`;
    
    // Optimized templates get special treatment
    const isOptimized = optimizedTemplates.some(opt => opt.id === template.id || opt.name === template.name);
    if (isOptimized) {
      return <div className={`${iconClasses} from-green-500 to-green-700`}>⚡</div>;
    }
    
    // Original templates get different styling
    const isOriginal = flowTemplates.some(flow => flow.id === template.id || flow.name === template.name);
    if (isOriginal) {
      return <div className={`${iconClasses} from-blue-500 to-blue-700`}>🏭</div>;
    }
    
    // LinkedIn-specific icons
    if (template.name?.toLowerCase().includes('linkedin')) {
      return <div className={`${iconClasses} from-blue-600 to-blue-800`}>💼</div>;
    }
    // Template-specific icons
    else if (template.name?.includes('Enterprise') || template.name?.includes('Research')) {
      return <div className={`${iconClasses} from-blue-500 to-purple-600`}>🏢</div>;
    } else if (template.name?.includes('Market Analysis') || template.name?.includes('Lead Generation')) {
      return <div className={`${iconClasses} from-green-500 to-blue-600`}>📊</div>;
    } else if (template.name?.includes('Support')) {
      return <div className={`${iconClasses} from-orange-500 to-red-600`}>🎧</div>;
    } else if (template.name?.includes('Lead')) {
      return <div className={`${iconClasses} from-purple-500 to-pink-600`}>🎯</div>;
    } else if (template.name?.includes('RAG') || template.name?.includes('Research')) {
      return <div className={`${iconClasses} from-indigo-500 to-purple-600`}>🔍</div>;
    } else if (template.name?.includes('Email')) {
      return <div className={`${iconClasses} from-teal-500 to-cyan-600`}>📧</div>;
    } else if (template.name?.includes('Crypto') || template.name?.includes('Monitor')) {
      return <div className={`${iconClasses} from-yellow-500 to-orange-600`}>🔥</div>;
    } else if (template.name?.includes('API') || template.name?.includes('Test')) {
      return <div className={`${iconClasses} from-gray-500 to-gray-700`}>🔑</div>;
    } else {
      return <div className={`${iconClasses} from-blue-500 to-purple-600`}>🚀</div>;
    }
  };

  // Enhanced template mode toggle buttons
  const renderModeToggle = () => (
    <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
      <button
        onClick={() => setTemplateMode('optimized')}
        className={`px-3 py-1 rounded text-xs transition-colors ${
          templateMode === 'optimized' 
            ? 'bg-white text-gray-800 shadow-sm font-medium' 
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        ⚡ Optimized ({templateMetrics.optimized})
      </button>
      <button
        onClick={() => setTemplateMode('flow')}
        className={`px-3 py-1 rounded text-xs transition-colors ${
          templateMode === 'flow' 
            ? 'bg-white text-gray-800 shadow-sm font-medium' 
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        🏭 Original ({templateMetrics.flow})
      </button>
      <button
        onClick={() => setTemplateMode('all')}
        className={`px-3 py-1 rounded text-xs transition-colors ${
          templateMode === 'all' 
            ? 'bg-white text-gray-800 shadow-sm font-medium' 
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        📊 All ({templateMetrics.total})
      </button>
    </div>
  );

  // Add template mode description
  const getModeDescription = () => {
    switch (templateMode) {
      case 'optimized':
        return 'High-performance templates with ≤6 nodes, ≤2 agents, optimized for speed and efficiency';
      case 'flow':
        return 'Original comprehensive templates with full feature sets and detailed workflows';
      case 'all':
        return 'Combined view of all available templates - optimized and original';
      default:
        return '';
    }
  };
  
  return (
    <div className="absolute bottom-16 left-2 right-2 bg-white rounded-lg shadow-lg z-10 p-4 max-h-[500px] overflow-y-auto border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-800">🚀 Flow Templates</h3>
          <p className="text-xs text-gray-600 mb-3">Choose between optimized and full workflow templates</p>
          {renderModeToggle()}
        </div>
        <button 
          onClick={() => toggleTemplateGallery(false)}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors ml-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedTemplates?.map((template, idx) => {
          const metrics = getTemplateMetrics(template);
          
          return (
            <div 
              key={template.id || idx}
              className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md group"
              onClick={() => handleApplyTemplate(template)}
            >
              <div className="flex items-start mb-2">
                {renderTemplateIcon(template)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm text-gray-800 truncate group-hover:text-blue-700">
                      {template.name}
                    </h4>
                    <div className="flex gap-1">
                      {getTemplateBadge(template)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">{template.description}</p>
                </div>
              </div>
              
              {/* Template metadata */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-500">
                  <span>🤖 {metrics.agentCount} agents</span>
                  <span>⏱️ {metrics.estimatedTime}</span>
                  <span>🔗 {metrics.nodeCount} nodes</span>
                </div>
                <div>
                  {template.complexity && (
                    <span className={`font-medium ${
                      template.complexity === 'Simple' ? 'text-green-600' :
                      template.complexity === 'Medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {template.complexity}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Template info */}
      <div className="mt-4 text-center">
        <div className="text-xs text-gray-500 mb-2">
          Mode: <span className="font-medium">{getModeDescription()}</span> | 
          Showing: <span className="font-medium">{displayedTemplates?.length || 0}</span> templates
        </div>
      </div>
    </div>
  );
};

TemplateGallery.propTypes = {
  // No props needed for this component
};

export default TemplateGallery;