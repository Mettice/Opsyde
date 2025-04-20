import React from 'react';
import CVResultsDisplay from './CVResultsDisplay';

const ResultsPanel = ({ results }) => {
  // Filter for CV results
  const cvResults = Object.values(results || {}).find(r => 
    r.type === 'huggingface_result' && r.skills
  );
  
  // Filter for agent results
  const agentResults = Object.values(results || {}).filter(r => 
    r.type === 'agent_status' || r.type === 'openrouter_result'
  );
  
  // Filter for task results
  const taskResults = Object.values(results || {}).filter(r => 
    r.type === 'task_result'
  );

  return (
    <div className="results-panel bg-white rounded-lg shadow p-4 my-4">
      <h2 className="text-2xl font-bold mb-4">Workflow Results</h2>
      
      {/* CV Results Section */}
      {cvResults && (
        <div className="mb-6">
          <CVResultsDisplay results={cvResults} />
        </div>
      )}
      
      {/* Agent Results Section */}
      {agentResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Agent Results</h3>
          {agentResults.map((result, index) => (
            <div key={index} className="bg-blue-50 p-3 rounded mb-2">
              <div className="font-medium">{result.agent_name || 'Agent'}</div>
              <div className="text-sm mt-1">{result.output}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Task Results Section */}
      {taskResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Task Results</h3>
          {taskResults.map((result, index) => (
            <div key={index} className="bg-green-50 p-3 rounded mb-2">
              <div className="font-medium">{result.task_name || 'Task'}</div>
              <div className="text-sm mt-1">{result.output}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* No Results Message */}
      {!cvResults && agentResults.length === 0 && taskResults.length === 0 && (
        <div className="text-gray-500 italic">No results available</div>
      )}
    </div>
  );
};

export default ResultsPanel; 