import React from 'react';

const ConnectionGuide = ({ isVisible, sourceType }) => {
  if (!isVisible || !sourceType) return null;
  
  let guideText = '';
  let validTargets = [];
  let directionHint = '';
  
  switch (sourceType) {
    case 'agent':
      guideText = 'Agents can connect to Tasks';
      validTargets = ['Task'];
      directionHint = 'Agents perform tasks';
      break;
    case 'task':
      guideText = 'Tasks can connect to other Tasks';
      validTargets = ['Task'];
      directionHint = 'Tasks can depend on other tasks';
      break;
    case 'tool':
      guideText = 'Tools can connect to Agents';
      validTargets = ['Agent'];
      directionHint = 'Tools are resources that agents can use';
      break;
    default:
      guideText = 'Click and drag from a node to create a connection';
      validTargets = [];
  }
  
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded shadow-lg z-50 text-sm max-w-md border-2 border-blue-500">
      <div className="font-bold text-center mb-2 text-lg">{guideText}</div>
      <div className="text-sm text-gray-700 mb-3 text-center">{directionHint}</div>
      {validTargets.length > 0 && (
        <div className="flex justify-center items-center">
          <span className="mr-2 font-medium">Valid targets:</span>
          {validTargets.map((target, i) => (
            <span 
              key={i} 
              className={`ml-2 px-3 py-1 rounded-full ${
                target === 'Agent' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 
                target === 'Task' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                target === 'Tool' ? 'bg-green-100 text-green-800 border border-green-300' : ''
              }`}
            >
              {target}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConnectionGuide; 