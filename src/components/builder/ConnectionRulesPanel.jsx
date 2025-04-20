import React from 'react';

const ConnectionRulesPanel = ({ onClose }) => {
  return (
    <div className="absolute top-16 right-4 bg-white p-3 rounded shadow-lg z-40 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Connection Rules</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded"
          aria-label="Close rules panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="text-xs mb-2">
        <p>Follow these rules when connecting nodes:</p>
      </div>
      
      <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
        <div className="p-1.5 bg-purple-50 rounded border border-purple-200">
          <div className="font-semibold text-purple-700">⚡ Trigger</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Any node</div>
            <div>• Cannot receive connections</div>
            <div className="text-red-600 font-medium">• Only one allowed per flow</div>
          </div>
        </div>
        
        <div className="p-1.5 bg-blue-50 rounded border border-blue-200">
          <div className="font-semibold text-blue-700">👤 Agent</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Task, Chat, Delay</div>
            <div>• Can receive from: Tool</div>
          </div>
        </div>
        
        <div className="p-1.5 bg-yellow-50 rounded border border-yellow-200">
          <div className="font-semibold text-yellow-700">📝 Task</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Task, Chat, Delay</div>
            <div>• Can receive from: Agent, Task</div>
          </div>
        </div>
        
        <div className="p-1.5 bg-green-50 rounded border border-green-200">
          <div className="font-semibold text-green-700">🔧 Tool</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Agent, Chat</div>
            <div>• Can receive from: None</div>
          </div>
        </div>
        
        <div className="p-1.5 bg-pink-50 rounded border border-pink-200">
          <div className="font-semibold text-pink-700">💬 Chat</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Any (except Trigger)</div>
            <div>• Can receive from: Any (except Trigger)</div>
          </div>
        </div>
        
        <div className="p-1.5 bg-amber-50 rounded border border-amber-200">
          <div className="font-semibold text-amber-700">⏱️ Delay</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Any (except Trigger)</div>
            <div>• Can receive from: Any</div>
          </div>
        </div>
        
        <div className="p-1.5 bg-yellow-50 rounded border border-yellow-200">
          <div className="font-semibold text-yellow-700">⚖️ Logic</div>
          <div className="ml-2 text-gray-700">
            <div>• Can connect to: Any (except Trigger)</div>
            <div>• Can receive from: Any (except Logic)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionRulesPanel; 