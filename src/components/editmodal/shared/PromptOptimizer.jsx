import React, { useState } from 'react';
import PropTypes from 'prop-types';

export const PromptOptimizer = ({ prompt, onOptimize }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationType, setOptimizationType] = useState('clarity');
  const [optimizationResult, setOptimizationResult] = useState(null);

  const optimizationTypes = [
    {
      id: 'clarity',
      name: 'Clarity',
      description: 'Improve prompt clarity and readability'
    },
    {
      id: 'conciseness',
      name: 'Conciseness',
      description: 'Make the prompt more concise and focused'
    },
    {
      id: 'context',
      name: 'Context',
      description: 'Add relevant context and examples'
    }
  ];

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptimizationResult(null);

    try {
      // Simulate API call to optimize prompt
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const optimizedPrompt = await optimizePrompt(prompt, optimizationType);
      setOptimizationResult({
        original: prompt,
        optimized: optimizedPrompt,
        type: optimizationType
      });
      
      onOptimize(optimizedPrompt);
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const optimizePrompt = async (prompt, type) => {
    // This would be replaced with actual API call
    const optimizations = {
      clarity: (p) => `Please provide a clear and detailed response to the following: ${p}`,
      conciseness: (p) => `Briefly answer: ${p}`,
      context: (p) => `Consider the following context and examples when answering: ${p}`
    };

    return optimizations[type](prompt);
  };

  return (
    <div className="space-y-4">
      {/* Optimization Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Optimization Type</label>
        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {optimizationTypes.map((type) => (
            <div
              key={type.id}
              className={`relative flex items-center p-4 border rounded-lg cursor-pointer ${
                optimizationType === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
              onClick={() => setOptimizationType(type.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{type.name}</p>
                  {optimizationType === type.id && (
                    <span className="text-blue-600">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{type.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimize Button */}
      <div>
        <button
          onClick={handleOptimize}
          disabled={isOptimizing || !prompt}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isOptimizing || !prompt
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isOptimizing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Optimizing...
            </>
          ) : (
            'Optimize Prompt'
          )}
        </button>
      </div>

      {/* Optimization Result */}
      {optimizationResult && (
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700">Original Prompt</h4>
            <p className="mt-1 text-sm text-gray-500">{optimizationResult.original}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-700">Optimized Prompt</h4>
            <p className="mt-1 text-sm text-blue-600">{optimizationResult.optimized}</p>
          </div>
        </div>
      )}
    </div>
  );
};

PromptOptimizer.propTypes = {
  prompt: PropTypes.string.isRequired,
  onOptimize: PropTypes.func.isRequired
}; 