import React from 'react';
import { useFlow } from '../../context/FlowContext';

const RecommendationsWidget = () => {
  const {
    showRecommendations,
    setShowRecommendations,
    recommendations,
    handleApplyTemplate
  } = useFlow();

  if (!recommendations) return null;

  return (
    <div className="absolute top-16 left-4 z-40">
      {showRecommendations ? (
        <div className="bg-white p-3 rounded shadow-md text-sm max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Recommended Templates:</h3>
            <button 
              onClick={() => setShowRecommendations(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {recommendations.length > 0 ? (
              recommendations.map((template, idx) => (
                <div 
                  key={idx}
                  className="border border-gray-200 rounded p-2 hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{template.icon || (template.type === 'flow' ? '📋' : '📄')}</span>
                    <div>
                      <h4 className="font-medium text-sm truncate">{template.name}</h4>
                      <p className="text-xs text-gray-600 truncate">{template.description}</p>
                      {template.type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          template.type === 'agent' ? 'bg-blue-100 text-blue-800' : 
                          template.type === 'task' ? 'bg-yellow-100 text-yellow-800' :
                          template.type === 'tool' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-2">No recommendations available</div>
            )}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowRecommendations(true)}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Recommendations
        </button>
      )}
    </div>
  );
};

export default RecommendationsWidget; 