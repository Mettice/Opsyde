import logging
from typing import Dict, Any
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Option 1: If you have CrewAI installed, uncomment these imports:
# try:
#     from crewai import Agent, Task, Crew
# except ImportError:
#     logger.warning("CrewAI library not installed. Using simulated implementation.")
#     Agent, Task, Crew = None, None, None

def run_crewai_workflow(agent_data: Dict[str, Any], task_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a CrewAI workflow with an agent performing a task.
    
    Args:
        agent_data: Dictionary containing agent configuration
        task_data: Dictionary containing task configuration
        inputs: Dictionary of inputs for the task
        
    Returns:
        Dictionary containing the result of the task execution
    """
    try:
        # 🛡️ Default fallbacks
        if not agent_data or not isinstance(agent_data, dict):
            logger.warning("Agent data is not valid")
            agent_data = {"role": "Assistant", "label": "Agent", "description": "Default agent"}

        if not task_data or not isinstance(task_data, dict):
            logger.warning("Task data is not valid")
            task_data = {"label": "Task", "description": "Default task"}

        if not inputs:
            inputs = {}
        elif isinstance(inputs, str):
            try:
                inputs = json.loads(inputs)
            except Exception:
                inputs = {"input": inputs}
        
        # Log execution details
        logger.info(f"Agent '{agent_data.get('label', 'Unknown')}' ({agent_data.get('role', 'Assistant')}) executing task '{task_data.get('label', 'Unknown')}'")
        logger.info(f"Task description: {task_data.get('description', 'No description')}")
        logger.info(f"Task inputs: {inputs}")
        
        # Simulated implementation (use this if CrewAI is not installed)
        agent_name = agent_data.get("label", "Unknown Agent")
        agent_role = agent_data.get("role", "Assistant")
        agent_goal = agent_data.get("goal", "Help with tasks")
        
        task_name = task_data.get("label", "Unknown Task")
        task_description = task_data.get("description", "Perform a task")
        expected_output = task_data.get("expectedOutput", "Task result")
        
        # Simulate task execution
        result_text = f"Agent '{agent_name}' ({agent_role}) completed task '{task_name}' with the following result:\n"
        result_text += f"Based on the goal '{agent_goal}', I've analyzed the task '{task_description}'.\n"
        
        # Process inputs
        if inputs:
            result_text += "Using the provided inputs:\n"
            for key, value in inputs.items():
                result_text += f"- {key}: {value}\n"
        
        # Generate a simulated output based on the expected output
        result_text += f"\nTask result: {expected_output}\n"
        
        # Return a dictionary instead of a string
        return {
            "output": result_text,
            "type": "task_result",
            "agent_name": agent_name,
            "agent_role": agent_role,
            "task_name": task_name
        }
        
    except Exception as e:
        logger.error(f"Error executing {task_data.get('label', 'task') if isinstance(task_data, dict) else 'task'}: {str(e)}")
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
