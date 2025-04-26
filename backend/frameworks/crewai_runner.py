import logging
from typing import Dict, Any, List
from frameworks.openrouter_runner import run_openrouter_chat
from crewai import Agent, Task, Crew, Process

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Option 1: If you have CrewAI installed, uncomment these imports:
# try:
#     from crewai import Agent, Task, Crew
# except ImportError:
#     logger.warning("CrewAI library not installed. Using simulated implementation.")
#     Agent, Task, Crew = None, None, None

def run_agent_chat(data: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    """
    Run an agent chat interaction
    """
    prompt = data.get("prompt", "You are a helpful AI assistant.")
    model = data.get("llmModel", "gpt-4")
    temperature = data.get("temperature", 0.7)
    max_tokens = data.get("max_tokens", 500)
    role = data.get("role", "Assistant")
    goal = data.get("goal", "")
    backstory = data.get("backstory", "")
    
    # Construct system message
    system_message = f"""Role: {role}
Goal: {goal}
Backstory: {backstory}

{prompt}"""

    # Format input message
    input_message = ""
    for key, val in inputs.items():
        input_message += f"{key}: {val}\n"
    
    if not input_message:
        input_message = "Hello, how can I help you?"

    # Create messages array
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": input_message}
    ]

    try:
        # Run the chat model
        result = run_openrouter_chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return result
    except Exception as e:
        logger.error(f"Agent chat error: {str(e)}")
        return f"I apologize, but I encountered an error: {str(e)}"

def run_task_chat(data: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    """
    Run a task chat interaction
    """
    prompt = data.get("prompt", "")
    model = data.get("llmModel", "gpt-4")
    temperature = data.get("temperature", 0.7)
    max_tokens = data.get("max_tokens", 500)
    description = data.get("description", "")
    expected_output = data.get("expectedOutput", "")
    
    # Construct system message
    system_message = f"""Task Description: {description}
Expected Output: {expected_output}

{prompt}

Please complete this task based on the provided input."""

    # Format input message
    input_message = ""
    for key, val in inputs.items():
        input_message += f"{key}: {val}\n"
    
    if not input_message:
        input_message = "Please proceed with the task."

    # Create messages array
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": input_message}
    ]

    try:
        # Run the chat model
        result = run_openrouter_chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return result
    except Exception as e:
        logger.error(f"Task chat error: {str(e)}")
        return f"I apologize, but I encountered an error: {str(e)}"

def run_crewai_workflow(crew_config: Dict[str, Any], framework: str = "crewai") -> Dict[str, Any]:
    """
    Run a CrewAI workflow with the specified configuration
    """
    try:
        agents = crew_config.get("agents", [])
        tasks = crew_config.get("tasks", [])
        inputs = crew_config.get("inputs", {})
        
        results = []
        
        # Process agents
        for agent in agents:
            agent_result = run_agent_chat(agent, inputs)
            results.append({
                "type": "agent_result",
                "agent_id": agent.get("nodeId"),
                "output": agent_result
            })
        
        # Process tasks
        for task in tasks:
            task_result = run_task_chat(task, inputs)
            results.append({
                "type": "task_result",
                "task_id": task.get("nodeId"),
                "output": task_result
            })
        
        return {
            "output": "Workflow completed successfully",
            "type": "workflow_result",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"CrewAI workflow error: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }

def run_agents(agents, tasks, tools=None, memory=None, inputs=None):
    """
    Run a workflow with agents, tasks, and tools using the CrewAI framework.
    
    Args:
        agents (list): List of agent configurations
        tasks (list): List of task configurations
        tools (list, optional): List of tool configurations
        memory (dict, optional): Memory configuration
        inputs (dict, optional): Input data for the workflow
        
    Returns:
        dict: The result of the workflow execution
    """
    try:
        # Ensure inputs is a dictionary
        if inputs is None:
            inputs = {}
        elif isinstance(inputs, str):
            try:
                inputs = json.loads(inputs)
            except Exception:
                inputs = {"input": inputs}
        
        # For backward compatibility, if there's only one agent and one task
        if len(agents) == 1 and len(tasks) == 1:
            return run_crewai_workflow(
                agent_data=agents[0],
                task_data=tasks[0],
                inputs=inputs
            )
        
        # Process multiple agents and tasks
        agent_instances = []
        task_instances = []
        
        # Create agent instances
        for agent_data in agents:
            agent_name = agent_data.get("label", "Unknown Agent")
            agent_role = agent_data.get("role", "Assistant")
            agent_goal = agent_data.get("goal", "Help with tasks")
            agent_backstory = agent_data.get("description", "I am an AI assistant")
            
            logger.info(f"Creating agent '{agent_name}' with role '{agent_role}'")
            
            # Here you would create actual CrewAI Agent instances if the library is available
            agent_instances.append({
                "name": agent_name,
                "role": agent_role,
                "goal": agent_goal,
                "backstory": agent_backstory
            })
        
        # Create task instances
        for task_data in tasks:
            task_name = task_data.get("label", "Unknown Task")
            task_description = task_data.get("description", "Perform a task")
            expected_output = task_data.get("expectedOutput", "Task result")
            
            logger.info(f"Creating task '{task_name}': {task_description}")
            
            # Here you would create actual CrewAI Task instances if the library is available
            task_instances.append({
                "name": task_name,
                "description": task_description,
                "expected_output": expected_output
            })
        
        # Simulate execution
        result_text = "CrewAI workflow executed with:\n"
        result_text += f"- {len(agent_instances)} agents\n"
        result_text += f"- {len(task_instances)} tasks\n"
        
        if inputs:
            result_text += "Using the provided inputs:\n"
            for key, value in inputs.items():
                result_text += f"- {key}: {value}\n"
        
        # Return a dictionary result
        return {
            "output": result_text,
            "type": "crew_result",
            "agents": [a["name"] for a in agent_instances],
            "tasks": [t["name"] for t in task_instances]
        }
        
    except Exception as e:
        logger.error(f"Error in CrewAI runner: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }

async def run_crewai_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Extract configuration
        agent_role = config.get("agent_role", "researcher")
        llm_provider = config.get("llm_provider", "openai")
        goal = config.get("goal", "")
        backstory = config.get("backstory", "")
        allow_delegation = config.get("allow_delegation", False)

        # Create agent
        agent = Agent(
            role=agent_role,
            goal=goal,
            backstory=backstory,
            allow_delegation=allow_delegation,
            llm=get_llm_for_provider(llm_provider, config)
        )

        # Create and execute task
        task = Task(
            description=inputs.get("task", ""),
            agent=agent
        )

        # Create crew with single agent
        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential
        )

        result = await crew.kickoff()

        return {
            "type": "crewai_result",
            "output": result,
            "metadata": {
                "agent_role": agent_role,
                "llm_provider": llm_provider
            }
        }
    except Exception as e:
        logger.error(f"Error in CrewAI tool: {str(e)}")
        return {
            "type": "error",
            "error": str(e)
        }
