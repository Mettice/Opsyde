import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import yaml from 'js-yaml';

/**
 * Exports the project as a structured zip file with proper directory organization
 * 
 * File structure:
 * ├── src/
 * │   └── crew/
 * │       ├── config/
 * │       │   ├── agents.yaml
 * │       │   ├── tasks.yaml
 * │       │   └── tools.yaml
 * │       └── crew.py
 * └── main.py
 */
export const exportProjectWithStructure = async (nodes, edges, projectName = 'crewai-project') => {
  try {
    // Create a new zip file
    const zip = new JSZip();
    
    // Create directory structure
    const srcFolder = zip.folder('src');
    const crewFolder = srcFolder.folder('crew');
    const configFolder = crewFolder.folder('config');
    
    // Separate nodes by type
    const agents = nodes.filter(node => node.type === 'agent');
    const tasks = nodes.filter(node => node.type === 'task');
    const tools = nodes.filter(node => node.type === 'tool');
    
    // Create YAML files for each component type
    const agentsYaml = yaml.dump(
      agents.map(agent => ({
        id: agent.id,
        name: agent.data.label,
        role: agent.data.role,
        goal: agent.data.goal,
        backstory: agent.data.backstory,
        llm_model: agent.data.llmModel,
        allow_delegation: agent.data.allowDelegation,
        verbose: agent.data.verbose
      }))
    );
    
    const tasksYaml = yaml.dump(
      tasks.map(task => ({
        id: task.id,
        name: task.data.label,
        description: task.data.description,
        expected_output: task.data.expectedOutput,
        async: task.data.async,
        dependencies: task.data.dependencies
      }))
    );
    
    const toolsYaml = yaml.dump(
      tools.map(tool => ({
        id: tool.id,
        name: tool.data.label,
        description: tool.data.description,
        tool_type: tool.data.toolType,
        api_endpoint: tool.data.apiEndpoint,
        parameters: tool.data.parameters
      }))
    );
    
    // Add YAML files to config folder
    configFolder.file('agents.yaml', agentsYaml);
    configFolder.file('tasks.yaml', tasksYaml);
    configFolder.file('tools.yaml', toolsYaml);
    
    // Create crew.py file
    const crewPyContent = generateCrewPyFile(nodes, edges);
    crewFolder.file('crew.py', crewPyContent);
    
    // Create main.py file
    const mainPyContent = generateMainPyFile(projectName);
    zip.file('main.py', mainPyContent);
    
    // Add README.md
    const readmeContent = generateReadme(projectName, nodes, edges);
    zip.file('README.md', readmeContent);
    
    // Add project.json for easy reloading
    const projectJson = {
      name: projectName,
      nodes: nodes.map(node => {
        // Clean node data for JSON export
        const { data, ...rest } = node;
        const cleanData = { ...data };
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        return { ...rest, data: cleanData };
      }),
      edges: edges,
      lastModified: new Date().toISOString()
    };
    zip.file('project.json', JSON.stringify(projectJson, null, 2));
    
    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Save the zip file
    saveAs(content, `${projectName}.zip`);
    
    return true;
  } catch (error) {
    console.error('Error exporting project:', error);
    return false;
  }
};

/**
 * Generates the crew.py file content
 */
function generateCrewPyFile(nodes, edges) {
  const agents = nodes.filter(node => node.type === 'agent');
  const tasks = nodes.filter(node => node.type === 'task');
  const tools = nodes.filter(node => node.type === 'tool');
  
  // Map tool connections to agents
  const agentTools = {};
  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    
    if (source && target) {
      if (source.type === 'tool' && target.type === 'agent') {
        if (!agentTools[target.id]) {
          agentTools[target.id] = [];
        }
        agentTools[target.id].push(source.id);
      }
    }
  });
  
  // Map task assignments to agents
  const agentTasks = {};
  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    
    if (source && target) {
      if (source.type === 'agent' && target.type === 'task') {
        if (!agentTasks[source.id]) {
          agentTasks[source.id] = [];
        }
        agentTasks[source.id].push(target.id);
      }
    }
  });
  
  return `
from crewai import Agent, Task, Crew, Process
import yaml
import os
from langchain.chat_models import ChatOpenAI
from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field

def load_config(file_path):
    """Load YAML configuration file"""
    with open(file_path, 'r') as file:
        return yaml.safe_load(file)

def create_crew():
    """Create and configure the crew with agents, tasks, and tools"""
    # Load configurations
    config_dir = os.path.join(os.path.dirname(__file__), 'config')
    agents_config = load_config(os.path.join(config_dir, 'agents.yaml'))
    tasks_config = load_config(os.path.join(config_dir, 'tasks.yaml'))
    tools_config = load_config(os.path.join(config_dir, 'tools.yaml'))
    
    # Create tools
    tools = {}
    for tool_config in tools_config:
        # Tool creation logic will depend on the tool type
        if tool_config['tool_type'] == 'api':
            # Example for API tool
            from langchain.tools import APITool
            tools[tool_config['id']] = APITool(
                name=tool_config['name'],
                description=tool_config['description'],
                api_endpoint=tool_config['api_endpoint']
            )
        elif tool_config['tool_type'] == 'search':
            # Example for search tool
            from langchain.tools import DuckDuckGoSearchTool
            tools[tool_config['id']] = DuckDuckGoSearchTool()
        else:
            # Default custom tool
            class CustomTool(BaseTool):
                name = tool_config['name']
                description = tool_config['description']
                
                def _run(self, query: str) -> str:
                    """Use the tool."""
                    return f"Custom tool {self.name} executed with input: {query}"
                
                async def _arun(self, query: str) -> str:
                    """Use the tool asynchronously."""
                    return self._run(query)
                    
            tools[tool_config['id']] = CustomTool()
    
    # Create agents
    agents = {}
    for agent_config in agents_config:
        # Get tools for this agent
        agent_tools = []
        # Logic to assign tools to agents based on your graph connections
        # This would be based on your edge connections in the actual implementation
        
        # Create LLM model
        llm = ChatOpenAI(model=agent_config.get('llm_model', 'gpt-4'))
        
        agents[agent_config['id']] = Agent(
            role=agent_config['role'],
            goal=agent_config['goal'],
            backstory=agent_config['backstory'],
            verbose=agent_config.get('verbose', True),
            allow_delegation=agent_config.get('allow_delegation', False),
            tools=agent_tools,
            llm=llm
        )
    
    # Create tasks
    tasks = {}
    for task_config in tasks_config:
        # Get the assigned agent for this task
        # This would be based on your edge connections
        assigned_agent = None
        
        # Get task dependencies
        dependencies = []
        if task_config.get('dependencies'):
            dependencies = [tasks[dep_id] for dep_id in task_config['dependencies'] if dep_id in tasks]
        
        tasks[task_config['id']] = Task(
            description=task_config['description'],
            expected_output=task_config.get('expected_output', ''),
            agent=assigned_agent,
            async_execution=task_config.get('async', False),
            dependencies=dependencies
        )
    
    # Create the crew
    crew = Crew(
        agents=list(agents.values()),
        tasks=list(tasks.values()),
        verbose=True,
        process=Process.sequential  # or Process.hierarchical based on your graph
    )
    
    return crew

# Export the crew creation function
__all__ = ['create_crew']
`;
}

/**
 * Generates the main.py file content
 */
function generateMainPyFile(projectName) {
  return `
from src.crew.crew import create_crew

def main():
    """Main entry point for the ${projectName} application"""
    print("Creating crew...")
    crew = create_crew()
    
    print("Starting crew execution...")
    result = crew.kickoff()
    
    print("Crew execution completed!")
    print("Result:", result)
    
    return result

if __name__ == "__main__":
    main()
`;
}

/**
 * Generates a README.md file for the project
 */
function generateReadme(projectName, nodes, edges) {
  const agentCount = nodes.filter(node => node.type === 'agent').length;
  const taskCount = nodes.filter(node => node.type === 'task').length;
  const toolCount = nodes.filter(node => node.type === 'tool').length;
  
  return `# ${projectName}

This project was generated using OpsFlow Builder, a visual workflow designer for AI agents.

## Project Overview

This AI workflow project contains:
- ${agentCount} Agents
- ${taskCount} Tasks
- ${toolCount} Tools

## Getting Started

1. Install the required dependencies:
   \`\`\`
   pip install crewai langchain pyyaml
   \`\`\`

2. Run the project:
   \`\`\`
   python main.py
   \`\`\`

## Project Structure

\`\`\`
├── src/
│   └── crew/
│       ├── config/
│       │   ├── agents.yaml
│       │   ├── tasks.yaml
│       │   └── tools.yaml
│       └── crew.py
└── main.py
\`\`\`

## Configuration

You can modify the YAML files in the \`src/crew/config/\` directory to adjust the behavior of agents, tasks, and tools.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
`;
}

export { generateMainPyFile };