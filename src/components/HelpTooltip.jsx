import React, { useState, useRef, useEffect } from 'react';

const helpContent = {
  agent: {
    title: 'Agents',
    content: 'Agents are AI team members with specific roles and capabilities. Each agent can be assigned tasks and tools.',
    fields: {
      role: 'The specific job or function of the agent within the crew. Examples: Researcher, Writer, Analyst.',
      goal: 'What the agent is trying to achieve. A clear goal helps the agent make better decisions.',
      backstory: 'Background information that shapes the agent\'s perspective and approach.',
      llmModel: 'The large language model that powers the agent. Different models have different capabilities and costs.',
      allowDelegation: 'When enabled, the agent can delegate subtasks to other agents in the crew.',
      verbose: 'When enabled, the agent provides detailed logs of its thinking process.',
      temperature: 'Controls randomness in the agent\'s responses. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more focused and deterministic.',
      max_tokens: 'Maximum number of tokens the agent can generate in a single response. Higher values allow for longer responses but may increase costs.',
      enableMemory: 'When enabled, the agent can remember previous interactions and use that context in future tasks.',
      prompt: 'Optional custom prompt to override the default agent behavior. This will be prepended to the task description.'
    }
  },
  task: {
    title: 'Tasks',
    content: 'Tasks are specific jobs assigned to agents. They define what needs to be done and what output is expected.',
    fields: {
      description: 'Detailed explanation of what the task involves. Be specific to get better results.',
      expectedOutput: 'The format and content of what the task should produce.',
      async: 'When enabled, the task can run in parallel with other tasks rather than sequentially.',
      dependencies: 'Other tasks that must complete before this task can start. Dependencies can be data-based or execution-based.'
    }
  },
  tool: {
    title: 'Tools',
    content: 'Tools extend agent capabilities by providing access to external services, APIs, or specialized functions.',
    fields: {
      toolType: 'The category of tool (API, Search, Calculator, etc.).',
      description: 'What the tool does and how it helps agents.',
      apiEndpoint: 'For API tools, the URL endpoint that the tool will call.',
      parameters: 'Inputs that the tool accepts, listed one per line.'
    }
  },
  workflow: {
    title: 'Workflow',
    content: 'A workflow connects agents, tasks, and tools to solve complex problems collaboratively.',
    fields: {
      connections: 'Connect agents to tasks they should perform, and tools to agents that should use them.',
      taskSequence: 'Connect tasks to each other to establish a sequence or dependency relationship.',
      validation: 'The system validates that all components are properly connected before export.'
    }
  },
  export: {
    title: 'Export Options',
    content: 'Export your workflow as code or configuration files to use with CrewAI.',
    fields: {
      yaml: 'Exports a YAML configuration file that can be loaded by CrewAI.',
      python: 'Generates a complete Python script with all agents, tasks, and tools defined.'
    }
  },
  preview: {
    title: 'Preview Mode',
    content: 'Simulates how your workflow will execute, showing agent interactions and task sequences.',
    fields: {
      simulation: 'Step through the workflow to see how agents and tasks interact.',
      speed: 'Adjust simulation speed to focus on specific parts of the workflow.',
      logs: 'View detailed logs of agent actions, tool usage, and task outputs.'
    }
  }
};

const HelpTooltip = ({ type, field }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);
  
  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get tooltip content based on type
  const getTooltipContent = () => {
    switch (type) {
      case 'agent':
        return "An AI agent with a specific role, goals, and capabilities. Agents can use tools and perform tasks.";
      case 'task':
        return "A specific job or assignment that an agent can perform. Tasks have expected inputs and outputs.";
      case 'tool':
        return "A capability that extends what agents can do, such as API calls, web searches, or calculations.";
      case 'export':
        if (field === 'yaml') {
          return "Export your workflow as a YAML configuration file for CrewAI.";
        } else if (field === 'python') {
          return "Generate a complete Python script with all agents, tasks, and tools defined.";
        }
        return "Export your workflow to use it in other systems.";
      case 'preview':
        return "Preview and simulate how your workflow will execute step by step.";
      default:
        return "Click for more information";
    }
  };
  
  return (
    <span ref={tooltipRef} className="relative ml-1">
      {/* Use a span instead of a button */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        className="inline-flex items-center justify-center w-4 h-4 bg-gray-200 text-gray-700 rounded-full text-xs cursor-pointer hover:bg-gray-300"
      >
        ?
      </span>
      
      {showTooltip && (
        <div className="absolute z-50 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -right-2 top-6">
          <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-800 transform rotate-45"></div>
          {getTooltipContent()}
        </div>
      )}
    </span>
  );
};

export default HelpTooltip; 