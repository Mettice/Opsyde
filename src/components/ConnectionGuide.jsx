import React from 'react';

const ConnectionGuide = ({ isVisible, sourceType, onClose }) => {
  if (!isVisible) return null;
  
  // Define connection rules for each node type
  const connectionRules = {
    agent: {
      title: "Agent Connection Rules",
      description: "Agents perform tasks and can interact with chat nodes",
      canConnectTo: ["Task", "Chat"],
      cannotConnectTo: ["Tool", "Agent"],
      examples: [
        { from: "Agent", to: "Task", description: "Agent performs a task" },
        { from: "Agent", to: "Chat", description: "Agent interacts with a chat interface" }
      ]
    },
    task: {
      title: "Task Connection Rules",
      description: "Tasks can depend on other tasks and interact with chat nodes",
      canConnectTo: ["Task", "Chat"],
      cannotConnectTo: ["Agent", "Tool"],
      examples: [
        { from: "Task", to: "Task", description: "Task depends on another task" },
        { from: "Task", to: "Chat", description: "Task outputs to a chat interface" }
      ]
    },
    tool: {
      title: "Tool Connection Rules",
      description: "Tools provide capabilities to agents and can interact with chat nodes",
      canConnectTo: ["Agent", "Chat"],
      cannotConnectTo: ["Task", "Tool"],
      examples: [
        { from: "Tool", to: "Agent", description: "Tool provides capability to an agent" },
        { from: "Tool", to: "Chat", description: "Tool outputs to a chat interface" }
      ]
    },
    trigger: {
      title: "Trigger Connection Rules",
      description: "Triggers can start any node type in the workflow",
      canConnectTo: ["Agent", "Task", "Tool", "Chat", "Logic", "Delay"],
      cannotConnectTo: [],
      examples: [
        { from: "Trigger", to: "Agent", description: "Trigger starts an agent" },
        { from: "Trigger", to: "Task", description: "Trigger starts a task" }
      ]
    },
    logic: {
      title: "Logic Node Rules",
      description: "Logic nodes evaluate conditions and route flow based on the result",
      canConnectTo: ["Agent", "Task", "Tool", "Chat", "Logic", "Delay"],
      cannotConnectTo: [],
      examples: [
        { from: "Logic", to: "Task", description: "Route to task based on condition" },
        { from: "Logic", to: "Agent", description: "Choose agent based on condition" }
      ]
    },
    chatbot: {
      title: "Chat Node Rules",
      description: "Chat nodes can interact with agents, tasks, and tools",
      canConnectTo: ["Agent", "Task"],
      cannotConnectTo: [],
      examples: [
        { from: "Chat", to: "Agent", description: "Chat provides input to an agent" },
        { from: "Chat", to: "Task", description: "Chat triggers a task" }
      ]
    },
    delay: {
      title: "Delay Node Rules",
      description: "Delay nodes pause execution before continuing to the next node",
      canConnectTo: ["Agent", "Task", "Tool", "Chat", "Logic"],
      cannotConnectTo: [],
      examples: [
        { from: "Delay", to: "Task", description: "Wait before executing a task" },
        { from: "Delay", to: "Agent", description: "Wait before activating an agent" }
      ]
    }
  };
  
  // Get rules for the current source type or show general rules
  const rules = sourceType ? connectionRules[sourceType] : {
    title: "Connection Rules",
    description: "Click and drag from a node to create a connection",
    canConnectTo: [],
    cannotConnectTo: [],
    examples: []
  };
  
  // Node type to color mapping
  const nodeColors = {
    Agent: 'bg-blue-100 text-blue-800 border-blue-300',
    Task: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Tool: 'bg-green-100 text-green-800 border-green-300',
    Chat: 'bg-pink-100 text-pink-800 border-pink-300',
    Logic: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Trigger: 'bg-purple-100 text-purple-800 border-purple-300',
    Delay: 'bg-orange-100 text-orange-800 border-orange-300'
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{rules.title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-700 mb-4">{rules.description}</p>
        
        {/* Can connect to section */}
        {rules.canConnectTo.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-green-700 mb-2">Can Connect To:</h3>
            <div className="flex flex-wrap gap-2">
              {rules.canConnectTo.map((target, i) => (
                <span 
                  key={i} 
                  className={`px-3 py-1 rounded-full border ${nodeColors[target] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
                >
                  {target}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Cannot connect to section */}
        {rules.cannotConnectTo.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-red-700 mb-2">Cannot Connect To:</h3>
            <div className="flex flex-wrap gap-2">
              {rules.cannotConnectTo.map((target, i) => (
                <span 
                  key={i} 
                  className={`px-3 py-1 rounded-full border ${nodeColors[target] || 'bg-gray-100 text-gray-800 border-gray-300'}`}
                >
                  {target}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Examples section */}
        {rules.examples.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Examples:</h3>
            <div className="space-y-2">
              {rules.examples.map((example, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded-full border ${nodeColors[example.from] || 'bg-gray-100'}`}>
                      {example.from}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className={`px-2 py-0.5 rounded-full border ${nodeColors[example.to] || 'bg-gray-100'}`}>
                      {example.to}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{example.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* General connection rules */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
          <h3 className="font-semibold text-blue-800 mb-2">General Connection Rules</h3>
          <ul className="space-y-1 text-blue-800">
            <li>• Connections define the flow of data and control in your workflow</li>
            <li>• Each node type has specific connection rules based on its purpose</li>
            <li>• Logic nodes have special "True" and "False" output paths</li>
            <li>• Trigger nodes can only have outgoing connections</li>
            <li>• Invalid connections will be highlighted in red</li>
          </ul>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionGuide; 