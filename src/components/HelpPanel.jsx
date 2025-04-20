import React, { useState } from 'react';

const HelpPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('getting-started');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">NodAi Documentation</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r overflow-y-auto p-4">
            <nav>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setActiveTab('getting-started')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'getting-started' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Getting Started
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('agents')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'agents' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Agents
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'tasks' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Tasks
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('tools')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'tools' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Tools
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('connections')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'connections' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Connections
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('crews-vs-flows')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'crews-vs-flows' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Crews vs Flows
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('export')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'export' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Export Options
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('resources')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'resources' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Resources
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('frameworks')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'frameworks' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Frameworks
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('triggers-logic')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'triggers-logic' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Triggers & Logic
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('realtime-output')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'realtime-output' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Realtime & Output
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('developer-mode')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activeTab === 'developer-mode' 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Developer Mode
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'getting-started' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Getting Started with NodAi</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-blue-800">
                    NodAi is a visual interface for designing AI agent workflows using the CrewAI framework. 
                    This tool allows you to create, configure, and connect agents, tasks, and tools without writing code.
                  </p>
                </div>
                
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Basic Workflow</h4>
                <ol className="space-y-2 mb-6">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                    <div>
                      <strong>Add Agents</strong> - Create AI team members with specific roles and capabilities
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-yellow-100 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                    <div>
                      <strong>Add Tasks</strong> - Define jobs that need to be done and assign them to agents
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                    <div>
                      <strong>Add Tools</strong> - Extend agent capabilities with external services or functions
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">4</span>
                    <div>
                      <strong>Connect Components</strong> - Draw connections between agents, tasks, and tools
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">5</span>
                    <div>
                      <strong>Export</strong> - Generate YAML or Python code to use with CrewAI
                    </div>
                  </li>
                </ol>
                
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Quick Tips</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Use the canvas to arrange your components visually</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Connect components by dragging from the output handle to the input handle</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save your project regularly to avoid losing work</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
            
            {activeTab === 'agents' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Agents</h3>
                <p className="mb-4">
                  Agents are AI team members powered by large language models. Each agent has a specific role, 
                  goal, and backstory that shapes how it approaches tasks. Agents can use tools to extend their 
                  capabilities and can optionally delegate subtasks to other agents.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Agent Properties</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs mr-2">Role</span>
                        <span>The specific job or function of the agent</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs mr-2">Goal</span>
                        <span>What the agent is trying to achieve</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs mr-2">Backstory</span>
                        <span>Background that shapes the agent's perspective</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Agent Settings</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs mr-2">LLM Model</span>
                        <span>The AI model powering the agent</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs mr-2">Allow Delegation</span>
                        <span>Enable the agent to delegate tasks</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs mr-2">Verbose</span>
                        <span>Show detailed agent thinking process</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                  <h4 className="font-semibold text-yellow-800 mb-1">Pro Tip</h4>
                  <p className="text-yellow-800">
                    Give your agents clear, specific goals and detailed backstories to improve their performance. 
                    The more context they have, the better decisions they'll make.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'tasks' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Tasks</h3>
                <p className="mb-4">
                  Tasks represent specific jobs that need to be done. Each task is assigned to an agent and 
                  includes a description of what needs to be done and what output is expected. Tasks can depend 
                  on other tasks, creating a workflow sequence.
                </p>
                
                {/* Add more task-specific content here */}
              </div>
            )}
            
            {activeTab === 'tools' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Tools</h3>
                <p className="mb-4">
                  Tools extend agent capabilities by providing access to external services, APIs, or specialized 
                  functions. Tools can be assigned to agents, allowing them to perform actions beyond what the 
                  language model can do alone.
                </p>
                
                {/* Add more tool-specific content here */}
              </div>
            )}
            
            {activeTab === 'connections' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Connections</h3>
                <p className="mb-4">
                  Connections define the relationships between agents, tasks, and tools in your workflow. 
                  They determine which agent performs which task, which tools are available to which agents, 
                  and the sequence in which tasks are executed.
                </p>
                
                <div className="grid grid-cols-1 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Connection Types</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs mr-2 mt-1">Agent → Task</span>
                        <div>
                          <p>Assigns a task to an agent. The agent will be responsible for completing the task.</p>
                          <p className="text-sm text-gray-600 mt-1">Example: Connect the "Researcher" agent to the "Gather Data" task.</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs mr-2 mt-1">Tool → Agent</span>
                        <div>
                          <p>Gives an agent access to a tool. The agent can use the tool to complete tasks.</p>
                          <p className="text-sm text-gray-600 mt-1">Example: Connect the "Web Search" tool to the "Researcher" agent.</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs mr-2 mt-1">Task → Task</span>
                        <div>
                          <p>Creates a dependency between tasks. The second task will only start after the first task is complete.</p>
                          <p className="text-sm text-gray-600 mt-1">Example: Connect "Gather Data" to "Analyze Data" to ensure analysis happens after data collection.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Creating Connections</h4>
                    <ol className="space-y-2">
                      <li className="flex items-start">
                        <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                        <span>Hover over the source node (agent, task, or tool) to reveal connection points</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                        <span>Click and drag from the output handle of the source node</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                        <span>Drop onto the input handle of the target node</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">4</span>
                        <span>The connection will be created and displayed as an arrow</span>
                      </li>
                    </ol>
                  </div>
                </div>
                
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
                  <h4 className="font-semibold text-indigo-800 mb-1">Pro Tip</h4>
                  <p className="text-indigo-800">
                    Design your workflow carefully by thinking about task dependencies. A well-structured workflow 
                    with clear dependencies will make your AI crew more efficient and produce better results.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'crews-vs-flows' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Crews vs Flows</h3>
                <p className="mb-4">
                  CrewAI offers two complementary approaches to building AI workflows: Crews and Flows. 
                  NodAi supports both paradigms, allowing you to choose the best approach for your use case.
                </p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Crews</h4>
                    <p className="mb-3">Autonomous agents that collaborate with minimal supervision.</p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Agents have autonomy to solve problems their own way</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Good for complex, creative tasks with unclear paths</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Agents can delegate tasks and collaborate</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Flows</h4>
                    <p className="mb-3">Sequential processes with precise control over execution order.</p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Predictable, step-by-step execution</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Good for workflows with clear, defined steps</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Easier to debug and understand execution path</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">When to Use Each Approach</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Use Crews When:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• You need creative problem-solving</li>
                        <li>• The task has multiple possible approaches</li>
                        <li>• Agents need to collaborate and share information</li>
                        <li>• You want emergent behavior and solutions</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Use Flows When:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• You need predictable, consistent results</li>
                        <li>• The workflow has clear, defined steps</li>
                        <li>• You need precise control over execution</li>
                        <li>• Debugging and monitoring are priorities</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                  <h4 className="font-semibold text-purple-800 mb-1">Pro Tip</h4>
                  <p className="text-purple-800">
                    You can combine Crews and Flows in the same project! Use Flows for structured processes 
                    and Crews for parts that need more autonomy and creativity.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'export' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Export Options</h3>
                <p className="mb-4">
                  NodAi allows you to export your workflow in different formats that can be used with the 
                  CrewAI framework. You can choose the format that best fits your development workflow.
                </p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Export as Python</h4>
                    <p className="mb-3">Generates a complete Python script with all agents, tasks, and tools defined.</p>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      <pre className="whitespace-pre-wrap">
{`from crewai import Agent, Task, Crew
from langchain.chat_models import ChatOpenAI

# Agents
researcher = Agent(
    role="Researcher",
    goal="Find accurate information",
    backstory="Experienced researcher...",
    verbose=True
)

# Tasks
research_task = Task(
    description="Research the topic",
    expected_output="Comprehensive report",
    agent=researcher
)

# Create the crew
crew = Crew(
    agents=[researcher],
    tasks=[research_task],
    verbose=True
)

result = crew.kickoff()`}
                      </pre>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Best for:</strong> Developers who want to integrate the workflow into a larger Python application.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Export as YAML</h4>
                    <p className="mb-3">Creates a YAML configuration file that can be loaded by CrewAI.</p>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      <pre className="whitespace-pre-wrap">
{`agents:
  - role: "Researcher"
    goal: "Find accurate information"
    backstory: "Experienced researcher..."
    verbose: true

tasks:
  - description: "Research the topic"
    expected_output: "Comprehensive report"
    agent: "Researcher"

config:
  verbose: true`}
                      </pre>
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Best for:</strong> Configuration-driven workflows and easier version control of workflow changes.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Export as Flow</h4>
                    <p className="mb-3">Generates a Python script using CrewAI's Flow API for sequential execution.</p>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      <pre className="whitespace-pre-wrap">
{`from crewai import Agent, Task, Flow
from langchain.chat_models import ChatOpenAI

# Agents
researcher = Agent(
    role="Researcher",
    goal="Find accurate information",
    backstory="Experienced researcher...",
    verbose=True
)

# Tasks
research_task = Task(
    description="Research the topic",
    expected_output="Comprehensive report",
    agent=researcher
)

# Create the flow
flow = Flow(
    name="Research Flow",
    description="A sequential research workflow"
)

# Add steps to the flow
flow.add_step(
    research_task,
    next_steps=[]  # No next steps in this simple example
)

# Execute the flow
result = flow.execute()
`}
                      </pre>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Using Exported Code</h4>
                  <ol className="space-y-2">
                    <li className="flex items-start">
                      <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                      <div>
                        <strong>Install CrewAI:</strong>
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono mt-1">pip install crewai langchain</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                      <div>
                        <strong>Set up your OpenAI API key:</strong>
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono mt-1">export OPENAI_API_KEY=your_api_key_here</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                      <div>
                        <strong>Run your exported Python file:</strong>
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono mt-1">python your_exported_file.py</div>
                      </div>
                    </li>
                  </ol>
                </div>
                
                <div className="bg-green-50 border-l-4 border-green-500 p-4">
                  <h4 className="font-semibold text-green-800 mb-1">Pro Tip</h4>
                  <p className="text-green-800">
                    You can save your project in NodAi's native format (.json) to continue editing it later, 
                    and export to Python or YAML when you're ready to deploy your workflow.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'resources' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Resources</h3>
                <p className="mb-6">
                  Learn more about CrewAI and how to get the most out of your AI agent workflows with these resources.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">CrewAI Documentation</h4>
                    <p className="mb-3">Official documentation for the CrewAI framework.</p>
                    <a 
                      href="https://github.com/crewAIInc/crewAI" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit CrewAI GitHub Repository
                    </a>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Learning Portal</h4>
                    <p className="mb-3">Comprehensive guides and tutorials for CrewAI.</p>
                    <a 
                      href="https://learn.crewai.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Visit CrewAI Learning Portal
                    </a>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Tutorials & Examples</h4>
                  <ul className="space-y-3">
                    <li>
                      <a 
                        href="https://github.com/crewAIInc/crewAI/tree/main/examples" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        CrewAI Example Projects
                      </a>
                      <p className="text-sm text-gray-600 mt-1">
                        Browse example projects that demonstrate different use cases for CrewAI.
                      </p>
                    </li>
                    <li>
                      <a 
                        href="https://www.youtube.com/watch?v=tnejrr-0a94" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        CrewAI Introduction Video
                      </a>
                      <p className="text-sm text-gray-600 mt-1">
                        Watch an introduction to CrewAI and how it works.
                      </p>
                    </li>
                    <li>
                      <a 
                        href="https://medium.com/@joaomdmoura/crewai-an-open-source-framework-for-orchestrating-role-playing-ai-agents-e978d1b9e9cf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        CrewAI: An Introduction Article
                      </a>
                      <p className="text-sm text-gray-600 mt-1">
                        Read about the philosophy and design principles behind CrewAI.
                      </p>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                  <h4 className="font-semibold text-purple-800 mb-1">Coming Soon</h4>
                  <p className="text-purple-800">
                    We're working on more tutorials, templates, and integration guides. Check back soon for updates!
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'frameworks' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">AI Frameworks</h3>
                <p className="mb-4">
                  NodAi supports multiple AI frameworks, each with different strengths and use cases.
                  Choose the right framework for your specific needs.
                </p>
                
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium mr-2">CrewAI</span>
                      <span className="text-sm text-gray-500">Team-based execution with autonomous delegation</span>
                    </div>
                    <p className="text-sm mb-2">
                      Best for complex workflows requiring multiple agents to collaborate with minimal supervision.
                      Supports agent autonomy, delegation, and emergent problem-solving.
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <strong>Use when:</strong> You need a team of specialized agents working together on complex tasks
                      with delegation and autonomous decision-making.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium mr-2">LangChain</span>
                      <span className="text-sm text-gray-500">Tools, chaining, memory</span>
                    </div>
                    <p className="text-sm mb-2">
                      Excellent for creating chains of operations, integrating tools, and managing memory.
                      Provides flexible components for building complex LLM applications.
                    </p>
                    <div className="bg-green-50 p-2 rounded text-xs">
                      <strong>Use when:</strong> You need to chain multiple operations together, integrate various tools,
                      or implement sophisticated memory systems.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-sm font-medium mr-2">Autogen</span>
                      <span className="text-sm text-gray-500">Multi-agent conversations / collaboration</span>
                    </div>
                    <p className="text-sm mb-2">
                      Specialized in multi-agent conversations and collaborative problem-solving.
                      Great for scenarios where agents need to discuss and iterate on solutions.
                    </p>
                    <div className="bg-purple-50 p-2 rounded text-xs">
                      <strong>Use when:</strong> You need agents to have back-and-forth conversations to solve problems
                      or when you want to simulate expert discussions.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-sm font-medium mr-2">LlamaIndex</span>
                      <span className="text-sm text-gray-500">Data indexing and retrieval</span>
                    </div>
                    <p className="text-sm mb-2">
                      Specialized in connecting LLMs with external data sources. Excellent for RAG (Retrieval Augmented Generation)
                      and building knowledge-intensive applications.
                    </p>
                    <div className="bg-yellow-50 p-2 rounded text-xs">
                      <strong>Use when:</strong> You need to work with large datasets, create knowledge bases,
                      or implement sophisticated retrieval systems.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="bg-red-100 text-red-800 rounded-full px-3 py-1 text-sm font-medium mr-2">HuggingFace</span>
                      <span className="text-sm text-gray-500">Open-source models and specialized tasks</span>
                    </div>
                    <p className="text-sm mb-2">
                      Access to thousands of open-source models for various specialized tasks like
                      classification, summarization, translation, and more.
                    </p>
                    <div className="bg-red-50 p-2 rounded text-xs">
                      <strong>Use when:</strong> You need specialized models for specific tasks or
                      want to use open-source alternatives to commercial LLMs.
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-100 text-indigo-800 rounded-full px-3 py-1 text-sm font-medium mr-2">OpenRouter</span>
                      <span className="text-sm text-gray-500">Model flexibility (Claude, Mistral, etc.)</span>
                    </div>
                    <p className="text-sm mb-2">
                      Provides access to multiple LLM providers through a single API. Great for
                      experimenting with different models or fallback strategies.
                    </p>
                    <div className="bg-indigo-50 p-2 rounded text-xs">
                      <strong>Use when:</strong> You want to use models from different providers or
                      need flexibility to switch between models like Claude, Mistral, etc.
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-semibold text-blue-800 mb-1">Pro Tip</h4>
                  <p className="text-blue-800">
                    You can mix and match frameworks in the same workflow! For example, use LlamaIndex for data retrieval,
                    then pass the results to a CrewAI agent for analysis and decision-making.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'triggers-logic' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Triggers & Logic Nodes</h3>
                <p className="mb-4">
                  Triggers and Logic nodes allow you to control when and how your workflow executes,
                  creating dynamic, conditional flows based on inputs and results.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Trigger Nodes</h4>
                    <p className="mb-3">Trigger nodes determine when your workflow starts execution.</p>
                    
                    <div className="space-y-3">
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                        <h5 className="font-medium text-yellow-800 mb-1">Manual Trigger</h5>
                        <p className="text-sm">
                          Start the workflow manually by clicking the "Run" button. Best for on-demand execution
                          or testing your workflow.
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded border border-green-100">
                        <h5 className="font-medium text-green-800 mb-1">Webhook Trigger</h5>
                        <p className="text-sm">
                          Start the workflow when an HTTP request is received. Great for integrating with
                          external systems or event-driven architectures.
                        </p>
                        <div className="text-xs mt-1 font-mono bg-green-100 p-1 rounded">
                          POST https://your-domain.com/trigger/your-trigger-id
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <h5 className="font-medium text-blue-800 mb-1">Schedule Trigger</h5>
                        <p className="text-sm">
                          Start the workflow on a schedule (hourly, daily, weekly, etc.). Perfect for
                          recurring tasks like reports, data processing, or monitoring.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Logic Nodes</h4>
                    <p className="mb-3">Logic nodes create conditional branches in your workflow based on data.</p>
                    
                    <div className="bg-gray-50 p-3 rounded mb-3">
                      <h5 className="font-medium text-gray-800 mb-1">How Logic Nodes Work</h5>
                      <p className="text-sm">
                        Logic nodes evaluate a condition and route the flow to either the "True" or "False" path.
                        This allows your workflow to make decisions based on data.
                      </p>
                      <div className="mt-2 flex justify-center">
                        <div className="relative">
                          <div className="bg-yellow-100 p-2 rounded text-center text-sm font-medium">Logic Node</div>
                          <div className="mt-2 flex justify-between">
                            <div className="bg-green-100 p-1 rounded text-xs w-20 text-center">True Path</div>
                            <div className="bg-red-100 p-1 rounded text-xs w-20 text-center">False Path</div>
                          </div>
                          <div className="absolute left-1/2 top-8 -ml-0.5 h-4 w-0.5 bg-gray-400"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-800">Condition Examples:</h5>
                      <div className="bg-gray-50 p-2 rounded font-mono text-sm">
                        <div className="mb-1">inputs.score {'>'} 80</div>
                        <div className="mb-1">inputs.status == "approved"</div>
                        <div className="mb-1">"error" in inputs.message</div>
                        <div className="mb-1">len(inputs.items) {'>'} 0</div>
                        <div className="mb-1">inputs.score {'>'} 80 and inputs.status == "approved"</div>
                        <div>inputs.country == "France" or inputs.score {'>'} 90</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Building Conditional Workflows</h4>
                  <p className="mb-3">
                    Combine triggers and logic nodes to create sophisticated workflows that respond
                    to different conditions and scenarios.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Common Patterns:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Input Validation:</strong> Check if inputs meet criteria before processing</li>
                        <li>• <strong>Error Handling:</strong> Route to different paths based on success/failure</li>
                        <li>• <strong>Data Routing:</strong> Send data to different destinations based on content</li>
                        <li>• <strong>Conditional Processing:</strong> Apply different processing based on data type</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Tips for Logic Nodes:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• Use the test feature to validate your conditions</li>
                        <li>• Keep conditions simple and focused on one decision</li>
                        <li>• Chain multiple logic nodes for complex decisions</li>
                        <li>• Use descriptive labels to document the decision logic</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                  <h4 className="font-semibold text-purple-800 mb-1">Pro Tip</h4>
                  <p className="text-purple-800">
                    You can use environment variables in your logic conditions with the <code>env</code> object.
                    For example: <code>env.API_KEY != None</code> to check if an API key is available.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'realtime-output' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Realtime Execution & Output Routing</h3>
                <p className="mb-4">
                  Monitor your workflow execution in real-time and route outputs to various destinations
                  for integration with other systems and processes.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Execution Monitoring</h4>
                    <p className="mb-3">
                      NodAi provides real-time visibility into your workflow execution,
                      allowing you to monitor progress and troubleshoot issues.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <h5 className="font-medium text-blue-800 mb-1">Execution Log</h5>
                        <p className="text-sm">
                          View detailed logs of each step in your workflow execution, including
                          inputs, outputs, and any errors that occur.
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded border border-green-100">
                        <h5 className="font-medium text-green-800 mb-1">Live Updates</h5>
                        <p className="text-sm">
                          See results as they happen with streaming updates from LLMs and other
                          components, without waiting for the entire workflow to complete.
                        </p>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                        <h5 className="font-medium text-yellow-800 mb-1">Debug Mode</h5>
                        <p className="text-sm">
                          Enable detailed logging and step-by-step execution to troubleshoot
                          complex workflows and identify issues.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Output Routing</h4>
                    <p className="mb-3">
                      Send workflow results to various destinations to integrate with other
                      systems and processes in your organization.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-green-50 p-3 rounded border border-green-100">
                        <h5 className="font-medium text-green-800 mb-1">Google Sheets</h5>
                        <p className="text-sm">
                          Log results to Google Sheets for easy viewing, sharing, and analysis.
                          Great for creating dashboards and reports.
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <h5 className="font-medium text-blue-800 mb-1">Email Notifications</h5>
                        <p className="text-sm">
                          Send results via email to stakeholders or team members. Configure
                          recipients, subject lines, and message formats.
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded border border-purple-100">
                        <h5 className="font-medium text-purple-800 mb-1">Discord Integration</h5>
                        <p className="text-sm">
                          Post results to Discord channels for team collaboration and notifications.
                          Supports rich formatting and attachments.
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded border border-gray-100">
                        <h5 className="font-medium text-gray-800 mb-1">Webhook Forwarding</h5>
                        <p className="text-sm">
                          Send results to any system that accepts webhooks, including custom
                          applications, Zapier, Make.com, and more.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Output Panel</h4>
                  <p className="mb-3">
                    The Output Panel provides a centralized view of your workflow results and allows
                    you to export, save, and share them in various formats.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Features:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Result Viewing:</strong> See formatted results from all nodes</li>
                        <li>• <strong>Export Options:</strong> Save as JSON, CSV, or text files</li>
                        <li>• <strong>History:</strong> Access previous run results</li>
                        <li>• <strong>Filtering:</strong> Focus on specific node outputs</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Output Configuration:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• Configure global output destinations</li>
                        <li>• Set up conditional routing based on results</li>
                        <li>• Schedule regular exports of results</li>
                        <li>• Format outputs for specific destinations</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
                  <h4 className="font-semibold text-indigo-800 mb-1">Pro Tip</h4>
                  <p className="text-indigo-800">
                    Use the Output Panel's "Pin" feature to keep important results visible while you continue
                    working on your workflow. This is especially useful for long-running processes.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'developer-mode' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Developer Mode</h3>
                <p className="mb-4">
                  Advanced features and customization options for developers who want to extend
                  NodAi's capabilities or integrate it with custom systems.
                </p>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                  <h4 className="font-semibold text-yellow-800 mb-1">Advanced Users Only</h4>
                  <p className="text-yellow-800">
                    The features described in this section are intended for developers and advanced users.
                    They may require programming knowledge and access to server configurations.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Debugging Tools</h4>
                    <p className="mb-3">
                      Tools and techniques for troubleshooting and debugging your workflows.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">Console Logging</h5>
                        <p className="text-sm mb-2">
                          Add console.log statements to track execution flow and inspect data.
                        </p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          console.log("Node execution:", node.id, "with data:", JSON.stringify(inputs));
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">Debug Mode Toggle</h5>
                        <p className="text-sm mb-2">
                          Enable debug mode in the UI to see detailed information about nodes and edges.
                        </p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          // Look for the "Debug" button in the bottom-left corner of the canvas
                          // or press Ctrl+Shift+D to toggle debug mode
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">Backend Logging</h5>
                        <p className="text-sm mb-2">
                          Modify logging levels in crew_runner.py to get more detailed backend logs.
                        </p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          # In crew_runner.py
                          logging.basicConfig(level=logging.DEBUG)  # Change from INFO to DEBUG
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Extending NodAi</h4>
                    <p className="mb-3">
                      Add custom functionality and integrate with external systems.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">Custom Tool Development</h5>
                        <p className="text-sm mb-2">
                          Create your own tools by adding new functions to the backend.
                        </p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          # In crew_runner.py
                          
                          def run_custom_tool(tool_data, inputs):
                              """
                              Custom tool implementation
                              """
                              # Your custom logic here
                              return {{"result": "Custom tool output"}}
                              
                          # Then in the run_crew function, add a case for your tool:
                          elif node_data.get("toolType") == "custom_tool":
                              result = run_custom_tool(node_data, node_inputs)
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">Custom Node Types</h5>
                        <p className="text-sm mb-2">
                          Add new node types to the UI by creating React components.
                        </p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          // 1. Create a new component in src/components/
                          // 2. Register it in src/utils/nodeTypes.js
                          // 3. Add handling in crew_runner.py
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">API Integration</h5>
                        <p className="text-sm mb-2">
                          Extend the backend API to integrate with external systems.
                        </p>
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                          # In main.py or a new route file
                          
                          @app.route("/custom-integration", methods=["POST"])
                          def custom_integration():
                              data = request.json
                              # Your integration logic here
                              return jsonify({{"status": "success"}})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Advanced Configuration</h4>
                  <p className="mb-3">
                    Configure NodAi for specific environments and use cases.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Environment Variables:</h5>
                      <ul className="space-y-1 text-sm font-mono">
                        <li>• <strong>OPENAI_API_KEY</strong> - OpenAI API key</li>
                        <li>• <strong>ANTHROPIC_API_KEY</strong> - Anthropic API key</li>
                        <li>• <strong>GOOGLE_API_KEY</strong> - Google API key</li>
                        <li>• <strong>DEBUG_MODE</strong> - Enable debug logging</li>
                        <li>• <strong>MAX_TOKENS</strong> - Default max tokens</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Configuration Files:</h5>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>config.json</strong> - Main configuration</li>
                        <li>• <strong>.env</strong> - Environment variables</li>
                        <li>• <strong>templates/</strong> - Custom templates</li>
                        <li>• <strong>plugins/</strong> - Custom plugins</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-semibold text-blue-800 mb-1">Contributing</h4>
                  <p className="text-blue-800 mb-2">
                    We welcome contributions to Nodai! If you've developed a useful extension or improvement,
                    please consider sharing it with the community.
                  </p>
                  <a 
                    href="https://github.com/your-repo/crewbuilder" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit our GitHub Repository
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel; 