import React, { useState } from 'react';
import TemplateList from '../toolTemplates/TemplateList';
import RegistryTools from '../toolTemplates/RegistryTools';
import CustomJsonImport from '../toolTemplates/CustomJsonImport';
import ToolTemplatesHeader from '../toolTemplates/ToolTemplatesHeader';
import ToolTemplatesFooter from '../toolTemplates/ToolTemplatesFooter';

const ToolTemplates = ({ onSelectTemplate, onClose, onAddCustom, showRegistry = false, onSelectToolFromRegistry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState(showRegistry ? 'Registry' : 'Templates');
  const [jsonSchema, setJsonSchema] = useState('');
  const [error, setError] = useState('');

  const handleSelectTool = (tool) => {
    const normalizedTool = {
      ...tool,
      label: tool.name,
      nodeType: 'tool'
    };
    
    if (onSelectToolFromRegistry) {
      onSelectToolFromRegistry(normalizedTool);
    } else {
      onSelectTemplate(normalizedTool);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <ToolTemplatesHeader onClose={onClose} />
        
        {/* Tabs */}
        <div className="mb-4">
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${activeTab === 'Templates' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('Templates')}
            >
              Tool Templates
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === 'Registry' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('Registry')}
            >
              Tool Registry
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === 'Custom' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('Custom')}
            >
              Custom JSON
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'Templates' && (
          <TemplateList
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            setSearchTerm={setSearchTerm}
            setSelectedCategory={setSelectedCategory}
            onSelect={handleSelectTool}
          />
        )}

        {activeTab === 'Registry' && (
          <RegistryTools
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onToolSelect={handleSelectTool}
            onClose={onClose}
          />
        )}

        {activeTab === 'Custom' && (
          <CustomJsonImport
            jsonSchema={jsonSchema}
            setJsonSchema={setJsonSchema}
            error={error}
            setError={setError}
            onSelectTemplate={onSelectTemplate}
            onClose={onClose}
          />
        )}

        {/* Footer */}
        <ToolTemplatesFooter 
          onAddCustom={() => {
            if (onAddCustom) {
              onAddCustom();
            } else {
              handleSelectTool({
                name: 'Custom Tool',
                description: 'Custom tool definition',
                toolType: 'custom',
                parameters: '',
                icon: '🛠️',
                category: 'Custom'
              });
            }
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default ToolTemplates;