import React, { useState } from 'react';
import { flowTemplates } from '../../data/flowTemplates';

const FlowTemplates = ({ onClose, onSelectTemplate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const tags = ['All', ...new Set(flowTemplates.flatMap(f => f.tags))];

  const filteredFlows = flowTemplates.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'All' || flow.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handlePreview = (template) => {
    setPreviewTemplate(template);
  };

  const handleApply = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search flows..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
        >
          {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {filteredFlows.map((flow, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
          >
            <div className="flex items-center mb-2">
              <img 
                src={flow.thumbnail || '/img/default-flow.png'} 
                alt="Flow Preview" 
                className="h-10 w-10 mr-2 rounded object-cover"
                onError={(e) => {
                  e.target.src = '/img/default-flow.png';
                }}
              />
              <h3 className="font-semibold text-lg">{flow.name}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-1">{flow.description}</p>
            <div className="text-xs text-gray-500 mb-2">
              <span>By {flow.author || 'Unknown'} • Version {flow.version || '1.0'}</span>
              {flow.created && <span> • Created {new Date(flow.created).toLocaleDateString()}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2 mb-3">
              {flow.tags.map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex justify-between mt-3">
              <button
                onClick={() => handlePreview(flow)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded"
              >
                Preview
              </button>
              <button
                onClick={() => handleApply(flow)}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
              >
                Apply Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredFlows.length === 0 && (
        <div className="text-center text-gray-500">No matching flows found.</div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[800px] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{previewTemplate.name}</h2>
              <button onClick={() => setPreviewTemplate(null)}>❌</button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">{previewTemplate.description}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {previewTemplate.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <p>By {previewTemplate.author || 'Unknown'} • Version {previewTemplate.version || '1.0'}</p>
                {previewTemplate.created && <p>Created {new Date(previewTemplate.created).toLocaleDateString()}</p>}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <h3 className="font-semibold mb-2">Template Structure</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Nodes ({previewTemplate.nodes.length})</h4>
                  <ul className="text-sm">
                    {previewTemplate.nodes.map((node, i) => (
                      <li key={i} className="mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          node.type === 'agent' ? 'bg-blue-500' : 
                          node.type === 'task' ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}></span>
                        {node.data.label} ({node.type})
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Connections ({previewTemplate.edges.length})</h4>
                  <ul className="text-sm">
                    {previewTemplate.edges.map((edge, i) => {
                      const sourceNode = previewTemplate.nodes.find(n => n.id === edge.source);
                      const targetNode = previewTemplate.nodes.find(n => n.id === edge.target);
                      return (
                        <li key={i} className="mb-1">
                          {sourceNode?.data.label} → {targetNode?.data.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close Preview
              </button>
              <button 
                onClick={() => {
                  handleApply(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Close
        </button>
      </div>
    </div>
  );
};

export default FlowTemplates;
