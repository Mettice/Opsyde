import React, { useState, useEffect } from 'react';

const PreviewMode = ({ nodes, edges, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('slow');
  const [simulationState, setSimulationState] = useState('initializing');
  const [logs, setLogs] = useState([]);
  
  // Create a workflow sequence based on nodes and edges
  const createWorkflowSequence = () => {
    // Find all agent nodes
    const agents = nodes.filter(node => node.type === 'agent');
    
    // Find all task nodes
    const tasks = nodes.filter(node => node.type === 'task');
    
    // Find all tool nodes
    const tools = nodes.filter(node => node.type === 'tool');
    
    // Create a sequence of steps
    const sequence = [];
    
    // Add agent initialization steps
    agents.forEach(agent => {
      sequence.push({
        type: 'agent_init',
        agent: agent,
        message: `Initializing agent: ${agent.data.label} (${agent.data.role})`
      });
    });
    
    // Add tool connection steps
    tools.forEach(tool => {
      // Find connected agents
      const connectedAgents = edges
        .filter(edge => (edge.source === tool.id || edge.target === tool.id))
        .map(edge => {
          const agentId = edge.source === tool.id ? edge.target : edge.source;
          return agents.find(agent => agent.id === agentId);
        })
        .filter(agent => agent); // Filter out undefined
      
      connectedAgents.forEach(agent => {
        sequence.push({
          type: 'tool_connection',
          tool: tool,
          agent: agent,
          message: `Connecting tool ${tool.data.label} to agent ${agent.data.label}`
        });
      });
    });
    
    // Add task execution steps
    // First, create a dependency graph
    const taskDependencies = {};
    tasks.forEach(task => {
      taskDependencies[task.id] = {
        task: task,
        dependencies: edges
          .filter(edge => edge.target === task.id && 
                  nodes.find(n => n.id === edge.source)?.type === 'task')
          .map(edge => edge.source)
      };
    });
    
    // Find tasks with no dependencies
    const startTasks = tasks.filter(task => 
      !edges.some(edge => 
        edge.target === task.id && 
        nodes.find(n => n.id === edge.source)?.type === 'task'
      )
    );
    
    // Helper function to add tasks in order
    const addTasksInOrder = (taskList, visited = new Set()) => {
      taskList.forEach(task => {
        if (visited.has(task.id)) return;
        
        // Find the agent assigned to this task
        const assignedAgent = edges
          .filter(edge => edge.target === task.id)
          .map(edge => agents.find(agent => agent.id === edge.source))
          .filter(agent => agent)[0];
        
        if (assignedAgent) {
          sequence.push({
            type: 'task_execution',
            task: task,
            agent: assignedAgent,
            message: `Agent ${assignedAgent.data.label} executing task: ${task.data.label}`
          });
          
          sequence.push({
            type: 'task_completion',
            task: task,
            agent: assignedAgent,
            message: `Task completed: ${task.data.label}`,
            output: task.data.expectedOutput || 'Task output'
          });
        }
        
        visited.add(task.id);
        
        // Find tasks that depend on this one
        const dependentTasks = tasks.filter(t => 
          edges.some(edge => 
            edge.source === task.id && 
            edge.target === t.id
          )
        );
        
        addTasksInOrder(dependentTasks, visited);
      });
    };
    
    addTasksInOrder(startTasks);
    
    // Add workflow completion step
    sequence.push({
      type: 'workflow_completion',
      message: 'Workflow completed successfully'
    });
    
    return sequence;
  };
  
  const [sequence, setSequence] = useState([]);
  
  useEffect(() => {
    // Initialize the sequence
    const seq = createWorkflowSequence();
    setSequence(seq);
    
    // Add initial log
    setLogs([{
      type: 'info',
      message: 'Initializing simulation...'
    }]);
    
    // Force transition from initializing to ready state after a short delay
    const timer = setTimeout(() => {
      setSimulationState('ready');
      
      if (seq.length === 0) {
        setLogs(prev => [...prev, {
          type: 'warning',
          message: 'No workflow steps found. Add agents and connect them to tasks to see a simulation.'
        }]);
      } else {
        setLogs(prev => [...prev, {
          type: 'info',
          message: `Found ${seq.length} workflow steps. Press Play to start simulation.`
        }]);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    let timer;
    
    if (isPlaying && currentStep < sequence.length) {
      const speedMap = {
        slow: 2000,
        medium: 1000,
        fast: 500
      };
      
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        
        // Add log entry
        if (sequence[currentStep]) {
          setLogs(prev => [...prev, { 
            message: sequence[currentStep].message, 
            type: sequence[currentStep].type 
          }]);
        }
        
        if (currentStep + 1 >= sequence.length) {
          setIsPlaying(false);
          setSimulationState('completed');
        }
      }, speedMap[speed]);
    }
    
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, sequence, speed]);
  
  useEffect(() => {
    // Force the simulation to start after initialization
    if (simulationState === 'initializing') {
      const timer = setTimeout(() => {
        setSimulationState('ready');
        
        // Add a log entry
        setLogs([{
          type: 'info',
          message: 'Simulation ready. Press Play to begin.'
        }]);
        
        // Create the sequence
        const seq = createWorkflowSequence();
        setSequence(seq);
        
        if (seq.length === 0) {
          setLogs(prev => [...prev, {
            type: 'warning',
            message: 'No workflow steps found. Make sure you have agents connected to tasks.'
          }]);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [simulationState]);
  
  const handlePlayPause = () => {
    if (simulationState === 'ready' || simulationState === 'paused') {
      setIsPlaying(true);
      setSimulationState('playing');
    } else if (simulationState === 'playing') {
      setIsPlaying(false);
      setSimulationState('paused');
    } else if (simulationState === 'completed') {
      // Reset simulation
      setCurrentStep(0);
      setIsPlaying(true);
      setSimulationState('playing');
    }
  };
  
  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setSimulationState('ready');
    setLogs([{ message: 'Simulation reset', type: 'info' }]);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Workflow Preview</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex p-4 border-b items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePlayPause}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
            >
              {isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {simulationState === 'completed' ? 'Restart' : 'Play'}
                </>
              )}
            </button>
            
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
          
          <div className="flex items-center">
            <span className="mr-2">Speed:</span>
            <select 
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex">
          <div className="w-1/2 p-4 overflow-y-auto border-r">
            <h3 className="font-semibold text-lg mb-3">Simulation Progress</h3>
            
            {simulationState === 'initializing' ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p>Simulation will begin shortly...</p>
                </div>
              </div>
            ) : sequence.length === 0 ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-yellow-800">
                  No workflow steps found. Make sure you have agents connected to tasks in your workflow.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sequence.map((step, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      index < currentStep 
                        ? 'bg-green-50 border-green-200' 
                        : index === currentStep 
                          ? 'bg-blue-50 border-blue-200 animate-pulse' 
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                        index < currentStep 
                          ? 'bg-green-500 text-white' 
                          : index === currentStep 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                      }`}>
                        {index < currentStep ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <span className={index < currentStep ? 'text-green-800' : index === currentStep ? 'text-blue-800 font-medium' : 'text-gray-500'}>
                        {step.message}
                      </span>
                    </div>
                    
                    {step.output && index <= currentStep && (
                      <div className="mt-2 ml-8 p-2 bg-gray-100 rounded text-sm">
                        <span className="font-medium">Output:</span> {step.output}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-1/2 p-4 overflow-y-auto bg-gray-50">
            <h3 className="font-semibold text-lg mb-3">Simulation Logs</h3>
            
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-[500px] overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'task_execution' ? 'text-blue-400' :
                  log.type === 'task_completion' ? 'text-green-400' :
                  log.type === 'agent_init' ? 'text-purple-400' :
                  log.type === 'tool_connection' ? 'text-yellow-400' :
                  log.type === 'workflow_completion' ? 'text-green-400 font-bold' :
                  'text-gray-400'
                }`}>
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t p-4 flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">
              Step {currentStep} of {sequence.length}
            </span>
            <div className="w-64 bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${sequence.length ? (currentStep / sequence.length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewMode; 