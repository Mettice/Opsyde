import React, { useState } from 'react';
import ToolTemplates from './ToolTemplates';
import AgentTemplates from './AgentTemplates';
import TaskTemplates from './TaskTemplates';
import FlowTemplates from './FlowTemplates';
import { agentTemplates } from '../../data/agentTemplates';
import { taskTemplates } from '../../data/taskTemplates';
import { flowTemplates } from '../../data/flowTemplates';

const TemplateModal = ({ onClose, onSelectTemplate }) => {
  const [activeTab, setActiveTab] = useState('Tools');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const tabs = ['Tools', 'Agents', 'Tasks', 'Flows', 'All'];

  const handleSearch = (term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setShowSearchResults(false);
      return;
    }
    
    const termLower = term.toLowerCase();
    
    // Search across all template types
    const agentResults = agentTemplates
      .filter(t => t.name.toLowerCase().includes(termLower) || 
                  t.description.toLowerCase().includes(termLower))
      .map(t => ({ ...t, type: 'agent' }));
      
    const taskResults = taskTemplates
      .filter(t => t.name.toLowerCase().includes(termLower) || 
                  t.description.toLowerCase().includes(termLower))
      .map(t => ({ ...t, type: 'task' }));
      
    const flowResults = flowTemplates
      .filter(t => t.name.toLowerCase().includes(termLower) || 
                  t.description.toLowerCase().includes(termLower))
      .map(t => ({ ...t, type: 'flow' }));
    
    // Combine and sort by relevance (name matches first)
    const allResults = [...agentResults, ...taskResults, ...flowResults]
      .sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(termLower);
        const bNameMatch = b.name.toLowerCase().includes(termLower);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return 0;
      });
    
    setSearchResults(allResults);
    setShowSearchResults(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[850px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select a Template</h2>
          <button onClick={onClose}>❌</button>
        </div>

        {/* Global Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search all templates..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Search Results ({searchResults.length})</h3>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                    onClick={() => onSelectTemplate(result)}
                  >
                    <div className="flex items-center mb-1">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        result.type === 'agent' ? 'bg-blue-500' : 
                        result.type === 'task' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}></span>
                      <h4 className="font-medium">{result.name}</h4>
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{result.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No templates match your search.
              </div>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSearchResults(false);
              }}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        {!showSearchResults && (
          <>
            <div className="mb-4 flex gap-4">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'Tools' && <ToolTemplates onClose={onClose} onSelectTemplate={onSelectTemplate} />}
            {activeTab === 'Agents' && <AgentTemplates onClose={onClose} onSelectTemplate={onSelectTemplate} />}
            {activeTab === 'Tasks' && <TaskTemplates onClose={onClose} onSelectTemplate={onSelectTemplate} />}
            {activeTab === 'Flows' && <FlowTemplates onClose={onClose} onSelectTemplate={onSelectTemplate} />}
            {activeTab === 'All' && (
              <div>
                <h3 className="font-semibold mb-2">Recent Templates</h3>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[...agentTemplates.slice(0, 2), ...taskTemplates.slice(0, 2), ...flowTemplates.slice(0, 2)].map((template, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-xl mr-2">{template.icon || '📄'}</span>
                        <h4 className="font-medium truncate">{template.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TemplateModal;
