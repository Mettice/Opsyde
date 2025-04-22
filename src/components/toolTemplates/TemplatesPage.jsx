import React from 'react';
import { flowTemplates } from '@/data/flowTemplates';
import { useNavigate } from 'react-router-dom';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [selectedFramework, setSelectedFramework] = useState("all");
  const filteredTemplates = selectedFramework === "all"
  ? allTemplates
  : allTemplates.filter(template =>
      template.nodes.some(node => node.data.framework === selectedFramework)
    );

  const handleLoad = (template) => {
    localStorage.setItem('loadedFlow', JSON.stringify(template));
    navigate('/builderpage');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-center">🚀 Flow Templates</h1>
      <p className="text-center text-gray-500 mb-8">Plug-and-play agent flows for HR, Sales, Support, Marketing, and more.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {flowTemplates.map((tpl, i) => (
          <div key={i} className="border p-4 rounded-xl shadow hover:shadow-lg transition bg-white">
            <img src={tpl.thumbnail} alt={tpl.name} className="rounded-lg mb-3 h-40 object-cover w-full" />
            <h2 className="text-xl font-semibold">{tpl.name}</h2>
            <p className="text-sm text-gray-600 mt-1 mb-2 line-clamp-2">{tpl.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {tpl.tags?.map((tag, idx) => (
                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            <button
              onClick={() => handleLoad(tpl)}
              className="w-full mt-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Load Flow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
