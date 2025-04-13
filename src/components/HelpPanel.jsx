import React, { useState } from 'react';

const HelpPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('getting-started');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">CrewBuilder Documentation</h2>
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
              </ul>
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'getting-started' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Getting Started with CrewBuilder</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-blue-800">
                    CrewBuilder is a visual interface for designing AI agent workflows using the CrewAI framework. 
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
                  CrewBuilder supports both paradigms, allowing you to choose the best approach for your use case.
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
                  CrewBuilder allows you to export your workflow in different formats that can be used with the 
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
                    You can save your project in CrewBuilder's native format (.json) to continue editing it later, 
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