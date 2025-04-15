// components/Builder/TemplateModal.js
import React from 'react';

const TemplateModal = ({ templates, onClose, onSelectTemplate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Select a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template, index) => (
            <div 
              key={index}
              className="border rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition duration-200"
              onClick={() => onSelectTemplate(template)}
            >
              <h3 className="font-bold">{template.name}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
              
              {/* Show template metadata if available */}
              {template.metadata && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.metadata.tags && template.metadata.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {template.metadata.complexity && (
                    <div className="mt-1 text-xs text-gray-500">
                      Complexity: 
                      <span className={`ml-1 ${
                        template.metadata.complexity === 'Simple' ? 'text-green-600' :
                        template.metadata.complexity === 'Medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {template.metadata.complexity}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
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