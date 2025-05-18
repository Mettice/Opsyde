import React from 'react';
import PropTypes from 'prop-types';
import { useFlow } from '../../contexts/FlowContext';
import { useBuilderUI } from '../../contexts/BuilderUIContext';
import { nodeTypes } from '../../utils/nodeTypes';

const TemplateGallery = () => {
  const { applyTemplate } = useFlow();
  const { toggleTemplateGallery } = useBuilderUI();

  // Create an array of node templates from the nodeTypes object
  const nodeTemplates = React.useMemo(() => {
    return Object.entries(nodeTypes).map(([type, component]) => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      description: `Add a ${type} node to your workflow`,
      component
    }));
  }, []);

  const handleApplyTemplate = (template) => {
    applyTemplate(template);
    toggleTemplateGallery(false);
  };

  // Helper function to render the icon based on template type
  const renderTemplateIcon = (template) => {
    const iconClasses = `w-6 h-6 mr-2 rounded flex items-center justify-center 
      ${template.type === 'agent' ? 'bg-blue-100 text-blue-600' : 
        template.type === 'task' ? 'bg-yellow-100 text-yellow-600' : 
        template.type === 'tool' ? 'bg-green-100 text-green-600' : 
        'bg-purple-100 text-purple-600'}`;
    
    if (template.type === 'agent') {
      return (
        <div className={iconClasses}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      );
    }
    
    if (template.type === 'task') {
      return (
        <div className={iconClasses}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      );
    }
    
    if (template.type === 'tool') {
      return (
        <div className={iconClasses}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      );
    }
    
    // Default icon for flow templates
    return (
      <div className={iconClasses}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2M7 7h10" />
        </svg>
      </div>
    );
  };
  
  return (
    <div className="absolute bottom-16 left-2 right-2 bg-white rounded shadow-md z-10 p-2 max-h-[300px] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Quick Templates</h3>
        <button 
          onClick={() => toggleTemplateGallery(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {nodeTemplates.map((template, idx) => (
          <div 
            key={idx}
            className="flex-shrink-0 border border-gray-200 rounded p-2 hover:bg-blue-50 cursor-pointer w-[200px]"
            onClick={() => handleApplyTemplate(template)}
          >
            <div className="flex items-center mb-1">
              {renderTemplateIcon(template)}
              <h4 className="font-medium text-sm truncate">{template.name}</h4>
            </div>
            <p className="text-xs text-gray-600 truncate">{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateGallery;