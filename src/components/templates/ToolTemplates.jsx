import React, { useState, useCallback } from 'react';

const toolTemplates = [
  {
    name: 'Web Search',
    description: 'Web search capability to find information',
    toolType: 'search',
    parameters: 'query\nnum_results',
    icon: '🔍',
    category: 'Information'
  },
  {
    name: 'Grammar Tool',
    description: 'Advanced grammar and style checking',
    toolType: 'custom',
    parameters: 'text\ncheck_style\ncheck_grammar',
    icon: '📝',
    category: 'Content'
  },
  {
    name: 'Calculator',
    description: 'Perform mathematical calculations',
    toolType: 'calculator',
    parameters: 'expression',
    icon: '🧮',
    category: 'Utility'
  },
  {
    name: 'Weather API',
    description: 'Get weather information for a location',
    toolType: 'api',
    apiEndpoint: 'https://api.weather.com/v1/forecast',
    parameters: 'location\ndate\nformat',
    icon: '🌤️',
    category: 'Data'
  },
  {
    name: 'Document Analyzer',
    description: 'Extract and analyze information from documents',
    toolType: 'custom',
    parameters: 'document_url\nanalysis_type',
    icon: '📄',
    category: 'Content'
  },
  {
    name: 'Translation Tool',
    description: 'Translate text between languages',
    toolType: 'api',
    apiEndpoint: 'https://api.translation.com/v1/translate',
    parameters: 'text\nsource_language\ntarget_language',
    icon: '🌐',
    category: 'Language'
  },
  {
    name: 'Image Generator',
    description: 'Generate images from text descriptions',
    toolType: 'api',
    apiEndpoint: 'https://api.images.com/v1/generate',
    parameters: 'prompt\nsize\nstyle',
    icon: '🖼️',
    category: 'Creative'
  },
  {
    name: 'Data Visualizer',
    description: 'Create charts and graphs from data',
    toolType: 'custom',
    parameters: 'data\nchart_type\ntitle',
    icon: '📊',
    category: 'Data'
  }
];

const ToolTemplates = ({ onSelectTemplate, onClose, onAddCustom, showRegistry = false, onSelectToolFromRegistry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('Templates');
  const [jsonSchema, setJsonSchema] = useState('');
  const [registryTools, setRegistryTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Extract unique categories
  const categories = ['All', ...new Set(toolTemplates.map(tool => tool.category))];
  
  // Filter tools based on search and category
  const filteredTools = toolTemplates.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Fetch tools from LangChain (mock data for now)
  const fetchLangChainTools = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // This would be a real API call in production
      // For demo, we'll use mock data
      const mockLangChainTools = [
        {
          name: "Serper Search",
          description: "A tool that searches the web using the Serper API",
          type: "api",
          parameters: ["query", "num_results"],
          category: "Search"
        },
        {
          name: "Tavily Research",
          description: "Research tool powered by Tavily API",
          type: "api",
          parameters: ["query", "search_depth", "include_domains", "exclude_domains"],
          category: "Research"
        },
        {
          name: "DALL-E Image Generator",
          description: "Generates images from text descriptions using DALL-E",
          type: "api",
          parameters: ["prompt", "size", "quality", "style"],
          category: "Creative"
        },
        {
          name: "Zapier NLA",
          description: "Natural Language Actions with Zapier",
          type: "api",
          parameters: ["action", "parameters"],
          category: "Automation"
        }
      ];
      
      // Simulate API delay
      setTimeout(() => {
        setRegistryTools(mockLangChainTools);
        setLoading(false);
      }, 500);
      
    } catch (err) {
      console.error("Error fetching LangChain tools:", err);
      setError("Failed to fetch tools from LangChain");
      setLoading(false);
    }
  }, []);
  
  // Parse JSON schema
  const parseJsonSchema = useCallback(() => {
    setLoading(true);
    setError('');
    
    try {
      const parsedTools = JSON.parse(jsonSchema);
      
      if (!Array.isArray(parsedTools)) {
        throw new Error("JSON schema must be an array of tool objects");
      }
      
      // Validate each tool has required fields
      const validTools = parsedTools.filter(tool => {
        return tool.name && tool.description;
      });
      
      if (validTools.length === 0) {
        throw new Error("No valid tools found in JSON schema");
      }
      
      setRegistryTools(validTools);
      setLoading(false);
      
    } catch (err) {
      console.error("Error parsing JSON schema:", err);
      setError(err.message || "Invalid JSON schema");
      setLoading(false);
    }
  }, [jsonSchema]);
  
  // Load registry tools when tab changes
  React.useEffect(() => {
    if (activeTab === 'Registry' && registryTools.length === 0) {
      fetchLangChainTools();
    }
  }, [activeTab, fetchLangChainTools, registryTools.length]);

  const handleSelectTool = (tool) => {
    // Make sure the tool has a label property for consistency
    const normalizedTool = {
      ...tool,
      label: tool.name, // Ensure the label property is set from the name
      nodeType: 'tool'  // Ensure the nodeType is set
    };
    
    onSelectTemplate(normalizedTool);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Tool</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Add tabs if registry is enabled */}
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
        
        {/* Templates Tab Content */}
        {(!showRegistry || activeTab === 'Templates') && (
          <>
            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search tools..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {filteredTools.map((template, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                  onClick={() => handleSelectTool(template)}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{template.icon}</span>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {template.toolType}
                    </span>
                    {template.apiEndpoint && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        API
                      </span>
                    )}
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      {template.category}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <strong>Parameters:</strong> {template.parameters.split('\n').join(', ')}
                  </div>
                </div>
              ))}
            </div>
            
            {filteredTools.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tools match your search criteria. Try a different search term or category.
              </div>
            )}
          </>
        )}
        
        {/* Registry Tab Content */}
        {showRegistry && activeTab === 'Registry' && (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search registry tools..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2">Loading tools...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {registryTools
                  .filter(tool => 
                    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((tool, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                    onClick={() => {
                      if (onSelectToolFromRegistry) {
                        onSelectToolFromRegistry(tool);
                        onClose();
                      } else {
                        onSelectTemplate(tool);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center mb-1">
                      <span className="text-lg mr-2">🔧</span>
                      <h4 className="font-medium">{tool.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{tool.description}</p>
                    {tool.category && (
                      <span className="inline-block text-xs bg-gray-100 px-2 py-1 rounded">
                        {tool.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Custom JSON Tab Content */}
        {showRegistry && activeTab === 'Custom' && (
          <div className="mb-4">
            <textarea
              className="w-full h-40 p-2 border border-gray-300 rounded"
              placeholder="Paste your JSON tool schema here..."
              value={jsonSchema}
              onChange={(e) => setJsonSchema(e.target.value)}
            ></textarea>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
              onClick={parseJsonSchema}
            >
              Parse JSON
            </button>
            
            {error && (
              <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {registryTools.length > 0 && activeTab === 'Custom' && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Parsed Tools:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {registryTools.map((tool, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                      onClick={() => {
                        onSelectTemplate(tool);
                        onClose();
                      }}
                    >
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-gray-600">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between">
          <button 
            onClick={onAddCustom || (() => {
              onSelectTemplate({
                name: 'Custom Tool',
                description: 'Custom tool definition',
                toolType: 'custom',
                parameters: '',
                icon: '🛠️',
                category: 'Custom'
              });
            })}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Create Custom Tool
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolTemplates; 