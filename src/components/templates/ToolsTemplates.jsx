import React, { useState } from 'react';
import TemplateList from '../toolTemplates/TemplateList';
import FrameworkSelector from '../toolTemplates/FrameworkSelector';
import RegistryTools from '../toolTemplates/RegistryTools';
import CustomJsonImport from '../toolTemplates/CustomJsonImport';
import ToolTemplatesHeader from '../toolTemplates/ToolTemplatesHeader';
import ToolTemplatesFooter from '../toolTemplates/ToolTemplatesFooter';

const ToolTemplates = ({ onSelectTemplate, onClose, onAddCustom, showRegistry = false, onSelectToolFromRegistry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('Templates');
  const [jsonSchema, setJsonSchema] = useState('');
  const [registryTools, setRegistryTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('crew');
  const [selectedModel, setSelectedModel] = useState('');

  const handleSelectTool = (tool) => {
    const normalizedTool = {
      ...tool,
      label: tool.name,
      nodeType: 'tool',
      framework: selectedFramework,
      ...(selectedFramework === "openrouter" && { model: selectedModel })
    };
    onSelectTemplate(normalizedTool);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <ToolTemplatesHeader onClose={onClose} />
        
        {/* Tabs */}
        {showRegistry && (
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
        )}

        <FrameworkSelector
          selectedFramework={selectedFramework}
          setSelectedFramework={setSelectedFramework}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
        />

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

        {showRegistry && activeTab === 'Registry' && (
          <RegistryTools
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            registryTools={registryTools}
            setRegistryTools={setRegistryTools}
            onSelectToolFromRegistry={onSelectToolFromRegistry || handleSelectTool}
            onClose={onClose}
          />
        )}

        {showRegistry && activeTab === 'Custom' && (
          <CustomJsonImport
            jsonSchema={jsonSchema}
            setJsonSchema={setJsonSchema}
            registryTools={registryTools}
            setRegistryTools={setRegistryTools}
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