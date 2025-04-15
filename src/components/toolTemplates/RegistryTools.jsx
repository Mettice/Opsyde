import React, { useEffect } from 'react';

export default function RegistryTools({
  loading, setLoading, error, setError, searchTerm, setSearchTerm, 
  registryTools, setRegistryTools, onSelectToolFromRegistry, onClose
}) {
  
  const fetchLangChainTools = async () => {
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
  };

  // Load registry tools when component mounts
  useEffect(() => {
    if (registryTools.length === 0) {
      fetchLangChainTools();
    }
  }, [registryTools.length]);

  return (
    <div>
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
    </div>
  );
}