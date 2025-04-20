import React from 'react';
import CVResultsDisplay from './CVResultsDisplay';

export default function ExecutionLog({ logs }) {
  // Parse the logs to extract node results
  const parseResults = () => {
    try {
      // Find the results section in the logs
      const resultsMatch = logs.match(/Results summary:\s*\n\s*{([^}]*)}/s);
      if (resultsMatch) {
        const resultsText = `{${resultsMatch[1]}}`;
        return JSON.parse(resultsText);
      }
      return null;
    } catch (e) {
      console.error("Error parsing results:", e);
      return null;
    }
  };

  const formatLogEntry = (entry) => {
    try {
      const data = typeof entry === 'string' ? JSON.parse(entry) : entry;
      
      // Check if this is a CV parsing result
      if (data.type === 'huggingface_result' && data.skills) {
        return <CVResultsDisplay results={data} />;
      }
      
      // Check if this is a logic node result
      if (data.type === 'logic' || (data.path && (data.path === 'true' || data.path === 'false'))) {
        return (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-100 rounded">
            <div className="font-medium text-yellow-800">Logic Node: {data.label || 'Condition'}</div>
            <div className="text-sm font-mono bg-yellow-100 p-1 rounded my-1">{data.condition}</div>
            <div className={`text-sm ${data.path === 'true' ? 'text-green-600' : 'text-red-600'}`}>
              Result: <span className="font-bold">{data.path === 'true' ? '✅ True' : '❌ False'}</span>
              <span className="text-gray-600 ml-2">→ Following {data.path} path</span>
            </div>
          </div>
        );
      }
      
      // Rest of the existing formatLogEntry function...
    } catch (e) {
      // Existing error handling...
    }
  };

  // Find CV results in the parsed logs
  const results = parseResults();
  const cvResults = results ? Object.values(results).find(r => r.type === 'huggingface_result' && r.skills) : null;

  return (
    <div className="execution-log">
      {/* Display CV Results if available */}
      {cvResults && (
        <div className="cv-results-container mb-4">
          <CVResultsDisplay results={cvResults} />
        </div>
      )}
      
      {/* Regular log output */}
      <div className="fixed bottom-0 left-0 w-full max-h-60 bg-black text-white overflow-y-auto p-4 text-sm font-mono shadow-inner z-50">
        <pre>{logs}</pre>
      </div>
    </div>
  );
}
