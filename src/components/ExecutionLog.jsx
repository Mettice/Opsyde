import React from 'react';
import ResultDisplayCard from './rich-content/renderers/ResultDisplayCard';

const ExecutionLog = ({ logs }) => {
  const renderLogContent = (log) => {
    // Check if this is a CV parser result
    if (log.result?.type === "cv_result" && log.result?.data) {
      return (
        <ResultDisplayCard
          content={log.result.data}
          title="CV Analysis Results"
          colorScheme="green"
          defaultExpanded={false}
          showMetrics={true}
          metadata={{
            resultType: 'cv_result',
            nodeType: log.type
          }}
        />
      );
    }

    // For error status
    if (log.status === 'error') {
      return (
        <ResultDisplayCard
          content={{ error: log.error || 'An error occurred' }}
          title="Execution Error"
          colorScheme="orange"
          defaultExpanded={true}
          showMetrics={false}
        />
      );
    }

    // For normal results
    return (
      <ResultDisplayCard
        content={log.result || log}
        title="Execution Result"
        colorScheme="blue"
        defaultExpanded={false}
        showMetrics={true}
        metadata={{
          nodeType: log.type,
          nodeName: log.nodeName || log.nodeId
        }}
      />
    );
  };

  return (
    <div className="space-y-4 p-4">
      {logs.map((log, index) => (
        <div 
          key={index}
          className={`border rounded-lg p-4 ${
            log.status === 'error' ? 'bg-red-50 border-red-200' :
            log.status === 'started' ? 'bg-blue-50 border-blue-200' :
            'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-medium">{log.nodeName || log.nodeId}</span>
              <span className="text-sm text-gray-500 ml-2">({log.type})</span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(log.timestamp).toLocaleTimeString()}
            </div>
          </div>
          
          <div className="mt-2">
            {renderLogContent(log)}
          </div>
        </div>
      ))}
      
      {logs.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No execution logs yet. Run your flow to see results here.
        </div>
      )}
    </div>
  );
};

export default ExecutionLog;
