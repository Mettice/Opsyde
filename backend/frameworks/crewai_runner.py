import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

try:
    from crewai import Agent, Task, Crew, Process
    from crewai.tools import BaseTool
    from langchain.tools import Tool
    CREWAI_AVAILABLE = True
except ImportError:
    logger.warning("CrewAI not installed - using fallback implementation")
    CREWAI_AVAILABLE = False
    # Define fallback BaseTool when CrewAI is not available
    class BaseTool:
        """Fallback BaseTool class when CrewAI is not available"""
        pass

class EnhancedCrewAIRunner:
    """Enhanced CrewAI runner with full framework features"""
    
    def __init__(self):
        self.agents_cache = {}
        self.tools_cache = {}
    
    def get_llm_for_framework(self, framework_config: Dict[str, Any]):
        """Get appropriate LLM based on configuration"""
        provider = framework_config.get('provider', 'openai')
        model = framework_config.get('model', 'gpt-4')
        
        if provider == 'openai':
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model,
                temperature=framework_config.get('temperature', 0.7),
                max_tokens=framework_config.get('max_tokens', 4000)
            )
        elif provider == 'anthropic':
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model=model,
                temperature=framework_config.get('temperature', 0.7),
                max_tokens=framework_config.get('max_tokens', 4000)
            )
        # Add other providers as needed
        
    def create_crewai_tools(self, tool_configs: List[Dict[str, Any]]) -> List[BaseTool]:
        """Create CrewAI-compatible tools"""
        tools = []
        
        for tool_config in tool_configs:
            tool_type = tool_config.get('type', 'api')
            
            if tool_type == 'search':
                tools.append(self._create_search_tool(tool_config))
            elif tool_type == 'api':
                tools.append(self._create_api_tool(tool_config))
            elif tool_type == 'file':
                tools.append(self._create_file_tool(tool_config))
                
        return tools
    
    def _create_search_tool(self, config: Dict[str, Any]) -> BaseTool:
        """Create search tool for CrewAI"""
        from crewai.tools import tool
        
        @tool("search_tool")
        def search(query: str) -> str:
            """Search for information on the internet"""
            # Implement search logic here
            return f"Search results for: {query}"
            
        return search
    
    def _create_api_tool(self, config: Dict[str, Any]) -> BaseTool:
        """Create API tool for CrewAI"""
        from crewai.tools import tool
        
        @tool("api_tool")
        def api_call(data: str) -> str:
            """Make API calls to external services"""
            # Implement API logic here
            return f"API response for: {data}"
            
        return api_call
    
    async def run_crewai_agent(self, agent_config: Dict[str, Any], 
                             task_config: Dict[str, Any],
                             tools: List[Dict[str, Any]] = None,
                             inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run CrewAI agent with full framework support"""
        
        if not CREWAI_AVAILABLE:
            return await self._fallback_execution(agent_config, task_config, inputs)
        
        try:
            # Create LLM
            llm = self.get_llm_for_framework(agent_config.get('frameworkConfig', {}))
            
            # Create tools
            crewai_tools = []
            if tools:
                crewai_tools = self.create_crewai_tools(tools)
            
            # Create Agent
            agent = Agent(
                role=agent_config.get('role', 'Assistant'),
                goal=agent_config.get('goal', 'Help the user'),
                backstory=agent_config.get('backstory', ''),
                verbose=agent_config.get('verbose', True),
                allow_delegation=agent_config.get('allowDelegation', False),
                tools=crewai_tools,
                llm=llm,
                max_iter=agent_config.get('max_iterations', 3),
                memory=agent_config.get('enableMemory', False)
            )
            
            # Create Task
            task_description = task_config.get('description', '')
            if inputs:
                # Inject inputs into task description
                input_lines = '\n'.join([f'{k}: {v}' for k, v in inputs.items()])
                task_description = f"{task_description}\n\nInput Data:\n{input_lines}"
            
            task = Task(
                description=task_description,
                expected_output=task_config.get('expectedOutput', 'Detailed response'),
                agent=agent,
                output_file=task_config.get('output_file'),
                tools=crewai_tools
            )
            
            # Create and run Crew
            crew = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True,
                memory=agent_config.get('enableMemory', False)
            )
            
            # Execute crew
            result = crew.kickoff()
            
            return {
                "type": "crewai_result",
                "output": str(result),
                "framework": "crewai",
                "agent_role": agent_config.get('role'),
                "task_description": task_config.get('description'),
                "success": True,
                "metadata": {
                    "tools_used": len(crewai_tools),
                    "memory_enabled": agent_config.get('enableMemory', False),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"CrewAI execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "crewai",
                "success": False
            }
    
    async def run_multi_agent_crew(self, agents: List[Dict[str, Any]], 
                                 tasks: List[Dict[str, Any]],
                                 process_type: str = "sequential",
                                 inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run multi-agent CrewAI workflow"""
        
        if not CREWAI_AVAILABLE:
            return {"error": "CrewAI not available", "success": False}
        
        try:
            # Create agents
            crew_agents = []
            for agent_config in agents:
                llm = self.get_llm_for_framework(agent_config.get('frameworkConfig', {}))
                
                agent = Agent(
                    role=agent_config.get('role'),
                    goal=agent_config.get('goal'),
                    backstory=agent_config.get('backstory'),
                    verbose=agent_config.get('verbose', True),
                    allow_delegation=agent_config.get('allowDelegation', False),
                    llm=llm
                )
                crew_agents.append(agent)
            
            # Create tasks
            crew_tasks = []
            for i, task_config in enumerate(tasks):
                # Assign agent to task (round-robin if more tasks than agents)
                assigned_agent = crew_agents[i % len(crew_agents)]
                
                task_description = task_config.get('description', '')
                if inputs:
                    input_lines = '\n'.join([f'{k}: {v}' for k, v in inputs.items()])
                    task_description = f"{task_description}\n\nInput Data:\n{input_lines}"
                
                task = Task(
                    description=task_description,
                    expected_output=task_config.get('expectedOutput', 'Detailed response'),
                    agent=assigned_agent
                )
                crew_tasks.append(task)
            
            # Set process type
            process = Process.sequential if process_type == "sequential" else Process.hierarchical
            
            # Create and run crew
            crew = Crew(
                agents=crew_agents,
                tasks=crew_tasks,
                process=process,
                verbose=True
            )
            
            result = crew.kickoff()
            
            return {
                "type": "crew_result",
                "output": str(result),
                "framework": "crewai",
                "agents_count": len(crew_agents),
                "tasks_count": len(crew_tasks),
                "process_type": process_type,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Multi-agent CrewAI execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "crewai",
                "success": False
            }
    
    async def _fallback_execution(self, agent_config: Dict[str, Any], 
                                task_config: Dict[str, Any],
                                inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Fallback when CrewAI is not available"""
        from .openrouter_runner import run_openrouter_chat
        
        # Simulate CrewAI behavior using direct LLM calls
        role = agent_config.get('role', 'Assistant')
        goal = agent_config.get('goal', 'Help the user')
        backstory = agent_config.get('backstory', '')
        task_description = task_config.get('description', '')
        
        prompt = f"""You are a {role}.
Goal: {goal}
Backstory: {backstory}

Task: {task_description}

"""
        
        if inputs:
            input_lines = '\n'.join([f'{k}: {v}' for k, v in inputs.items()])
            prompt += f"Input Data:\n{input_lines}\n\n"
        
        prompt += "Please complete this task based on your role and the provided information."
        
        messages = [{"role": "user", "content": prompt}]
        
        response = await run_openrouter_chat(
            messages=messages,
            model=agent_config.get('frameworkConfig', {}).get('model', 'gpt-4'),
            temperature=agent_config.get('frameworkConfig', {}).get('temperature', 0.7)
        )
        
        return {
            "type": "crewai_fallback",
            "output": response,
            "framework": "crewai_fallback",
            "success": True,
            "note": "CrewAI not available - using fallback implementation"
        }

# Main entry points for compatibility
async def run_crewai_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Main entry point for CrewAI tool execution"""
    runner = EnhancedCrewAIRunner()
    
    # Extract agent and task config from the unified config
    agent_config = {
        'role': config.get('role', 'Assistant'),
        'goal': config.get('goal', 'Help the user'),
        'backstory': config.get('backstory', ''),
        'verbose': config.get('verbose', True),
        'allowDelegation': config.get('allowDelegation', False),
        'enableMemory': config.get('enableMemory', False),
        'frameworkConfig': config.get('frameworkConfig', {})
    }
    
    task_config = {
        'description': config.get('prompt', config.get('description', 'Complete the requested task')),
        'expectedOutput': config.get('expectedOutput', 'Detailed response')
    }
    
    return await runner.run_crewai_agent(agent_config, task_config, inputs=inputs)

def run_agents(agents: List[Dict[str, Any]], tasks: List[Dict[str, Any]], 
               tools: List[Dict[str, Any]] = None, memory: Dict[str, Any] = None, 
               inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """Run multi-agent CrewAI workflow"""
    runner = EnhancedCrewAIRunner()
    
    # Run async function in sync context
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            runner.run_multi_agent_crew(agents, tasks, inputs=inputs)
        )
    finally:
        loop.close()