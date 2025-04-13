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
      verbose: 'When enabled, the agent provides detailed logs of its thinking process.'
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
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const content = field 
    ? helpContent[type]?.fields?.[field]
    : helpContent[type]?.content;
  
  const title = helpContent[type]?.title || type;

  // Update tooltip position when it becomes visible
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      // Position the tooltip below the button
      const top = buttonRect.bottom + window.scrollY + 5; // 5px gap
      
      // Center horizontally, but ensure it stays within viewport
      let left = buttonRect.left + (buttonRect.width / 2) + window.scrollX - 128; // 128 = half of tooltip width
      
      // Adjust if too close to left edge
      if (left < 10) left = 10;
      
      // Adjust if too close to right edge (assuming tooltip width is 256px)
      if (left + 256 > window.innerWidth - 10) {
        left = window.innerWidth - 266; // 10px from right edge
      }
      
      setTooltipPosition({ top, left });
    }
  }, [isVisible]);

  if (!content) return null;

  return (
    <span className="inline-block">
      <button
        ref={buttonRef}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold ml-1"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label={`Help for ${field || type}`}
      >
        ?
      </button>
      
      {isVisible && (
        <div 
          className="fixed z-50 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-left"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="font-semibold mb-1">{field ? `${title}: ${field}` : title}</div>
          <p className="text-gray-600">{content}</p>
        </div>
      )}
    </span>
  );
};

export default HelpTooltip; 