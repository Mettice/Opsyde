from typing import Dict, Any, Optional, List, Union
import logging
from datetime import datetime
import asyncio
import json
import os
from pydantic import BaseModel, Field

from models.nodes import Node, NodeType
from models.workflow import ExecutionContext
from models.results import NodeResult, ExecutionStatus
from models.data import NodeData
from core.llm_runner import llm_runner
from nodes.base_node import BaseNode, NodeConfig
from models.schemas import NodeSchema, SchemaField, SchemaType

logger = logging.getLogger(__name__)

class TaskNodeConfig(NodeConfig):
    """Configuration for Task nodes"""
    label: str
    description: str
    prompt: str
    goal: Optional[str] = None
    constraints: List[str] = Field(default_factory=list)
    examples: List[Dict[str, Any]] = Field(default_factory=list)
    expected_output: Optional[str] = None
    async_execution: bool = False
    dependencies: List[str] = Field(default_factory=list)
    agent_ref: Optional[str] = Field(None, description="Reference to associated agent")
    llmConfig: Optional[Dict[str, Any]] = Field(default_factory=lambda: {
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 4000,
        "framework": "openai"
    })
    
    # Enhanced input schema for tasks
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'task_input': SchemaField(
                type=SchemaType.ANY,
                description='Input data for the task',
                optional=False
            ),
            'agent_output': SchemaField(
                type=SchemaType.ANY,
                description='Output from associated agent',
                optional=True
            ),
            'instructions': SchemaField(
                type=SchemaType.STRING,
                description='Task instructions or description',
                optional=True
            ),
            'context': SchemaField(
                type=SchemaType.OBJECT,
                description='Context for task execution',
                optional=True
            ),
            'data': SchemaField(
                type=SchemaType.ANY,
                description='Any data required for task completion',
                optional=True
            ),
            'agent': SchemaField(
                type=SchemaType.OBJECT,
                description='Connected agent configuration',
                optional=True,
                properties={
                    'role': SchemaField(type=SchemaType.STRING, description='Agent role'),
                    'goal': SchemaField(type=SchemaType.STRING, description='Agent goal'),
                    'backstory': SchemaField(type=SchemaType.STRING, description='Agent backstory'),
                    'framework': SchemaField(type=SchemaType.STRING, description='Agent framework'),
                    'llmModel': SchemaField(type=SchemaType.STRING, description='LLM model'),
                    'llmProvider': SchemaField(type=SchemaType.STRING, description='LLM provider'),
                    'temperature': SchemaField(type=SchemaType.NUMBER, description='Temperature'),
                    'max_tokens': SchemaField(type=SchemaType.NUMBER, description='Max tokens'),
                    'allowDelegation': SchemaField(type=SchemaType.BOOLEAN, description='Allow delegation')
                }
            )
        },
        required_fields=['task_input']
    ))
    
    # Enhanced output schema for tasks
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Task execution result',
                optional=False
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                optional=False,
                properties={
                    'execution_time': SchemaField(type=SchemaType.NUMBER, description='Execution time in seconds'),
                    'status': SchemaField(type=SchemaType.STRING, description='Execution status'),
                    'cost': SchemaField(type=SchemaType.NUMBER, description='Execution cost', optional=True),
                    'tokens_used': SchemaField(type=SchemaType.NUMBER, description='Tokens used', optional=True),
                    'node_id': SchemaField(type=SchemaType.STRING, description='Node ID'),
                    'node_type': SchemaField(type=SchemaType.STRING, description='Type of node'),
                    'timestamp': SchemaField(type=SchemaType.STRING, description='Timestamp of execution'),
                    'connected_agents': SchemaField(
                        type=SchemaType.ARRAY,
                        description='Agents connected to this task',
                        optional=True
                    )
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message if task failed',
                optional=True
            ),
            'task_name': SchemaField(
                type=SchemaType.STRING,
                description='Name of the task',
                optional=True
            ),
            'description': SchemaField(
                type=SchemaType.STRING,
                description='Task description',
                optional=True
            )
        },
        required_fields=['result', 'metadata']
    ))

class TaskNode(BaseNode):
    """Handles execution of task nodes"""

    def get_config_model(self) -> type[BaseModel]:
        return TaskNodeConfig

    def get_input_schema(self) -> NodeSchema:
        """Get the input schema for task nodes"""
        return TaskNodeConfig().input_schema

    def get_output_schema(self) -> NodeSchema:
        """Get the output schema for task nodes"""
        return TaskNodeConfig().output_schema

    async def _execute(self, config: BaseModel, inputs: Dict[str, NodeData], context: Dict[str, Any]) -> Any:
        """Execute task node logic"""
        try:
            # Extract task configuration
            task_config = config
            task_name = task_config.label or "Unnamed Task"
            description = task_config.description or ""
            expected_output = task_config.expected_output or ""
            is_async = task_config.async_execution
            dependencies = task_config.dependencies

            # Format input data
            formatted_inputs = {}
            if inputs:
                for key, value in inputs.items():
                    if isinstance(value.value, dict):
                        formatted_inputs[key] = value.value
                    else:
                        formatted_inputs[key] = value.value

            # Process the task
            result = await self._process_data_task(
                task_name=task_name,
                description=description,
                inputs=formatted_inputs,
                expected_output=expected_output
            )

            return {
                "result": result,
                "metadata": {
                    "task_name": task_name,
                    "description": description,
                    "execution_time": 0,  # TODO: Add actual execution time
                    "status": "completed",
                    "node_id": context.get("node_id", "unknown"),
                    "node_type": "task",
                    "timestamp": datetime.now().isoformat()
                }
            }

        except Exception as e:
            logger.error(f"Error executing task node: {str(e)}")
            raise

    async def process(self, node: Union[Node, Dict[str, Any]], inputs: Dict[str, Any], context: ExecutionContext) -> Dict[str, Any]:
        """Process a task node"""
        try:
            # Extract task configuration - handle both Node objects and dictionaries
            if isinstance(node, dict):
                # Handle dictionary format
                config = node.get("data", {})
                node_id = node.get("id", "unknown")
                task_name = config.get("label", "Unnamed Task")
                description = config.get("description", "")
                expected_output = config.get("expectedOutput", "")
                is_async = config.get("async", False) or config.get("isAsync", False)
                dependencies = config.get("dependencies", [])
                # CRITICAL: Get enhanced frameworkConfig from workflow context
                enhanced_framework_config = config.get("frameworkConfig", {})
                logger.info(f"🔧 TaskNode enhanced frameworkConfig from context: {enhanced_framework_config}")
            else:
                # Handle Node object format
                config = node.get_config()
                node_id = node.id
                task_name = config.label
                description = config.description
                expected_output = config.expected_output
                is_async = config.async_execution
                dependencies = config.dependencies
                # CRITICAL: Get enhanced frameworkConfig from workflow context
                enhanced_framework_config = getattr(config, 'frameworkConfig', {}) or {}
                logger.info(f"🔧 TaskNode enhanced frameworkConfig from Node object: {enhanced_framework_config}")

            # Format input data - SIMPLIFIED since graph processor now provides clean data
            formatted_inputs = {}
            if inputs:
                for key, value in inputs.items():
                    # 🚀 SIMPLIFIED INPUT PROCESSING - Graph processor provides clean data
                    if isinstance(value, dict):
                        # Check if this needs further extraction
                        if 'output' in value:
                            formatted_inputs[key] = value['output']
                        elif 'value' in value:
                            formatted_inputs[key] = value['value']
                        elif 'result' in value:
                            formatted_inputs[key] = value['result']
                        else:
                            formatted_inputs[key] = value
                    else:
                        formatted_inputs[key] = value

            # DEBUG: Log what inputs we're receiving
            logger.info(f"Task {task_name} received inputs: {list(inputs.keys())}")
            for key, value in inputs.items():
                logger.info(f"Input '{key}': type={type(value)}, value={value}")
            logger.info(f"Formatted inputs: {formatted_inputs}")

            # Check for connected agents - look in actual inputs from connected nodes
            connected_agents = []
            
            # ENHANCED AGENT DETECTION: Check multiple possible locations for agent data
            
            # 1. Look for direct 'agent' key in inputs (common case)
            if 'agent' in formatted_inputs:
                agent_value = formatted_inputs['agent']
                if isinstance(agent_value, dict):
                    agent_info = {
                        "role": agent_value.get("role", "Assistant"),
                        "goal": agent_value.get("goal", "Help the user"),
                        "backstory": agent_value.get("backstory", ""),
                        "framework": agent_value.get("framework", "openai"),
                        "llmModel": agent_value.get("llmModel", "gpt-4"),
                        "llmProvider": agent_value.get("llmProvider", "openai"),
                        "temperature": agent_value.get("temperature", 0.7),
                        "max_tokens": agent_value.get("max_tokens", 4000),
                        "allowDelegation": agent_value.get("allowDelegation", False)
                    }
                    connected_agents.append(agent_info)
                    logger.info(f"Found direct agent in inputs: {agent_info['role']} (framework: {agent_info['framework']})")
            
            # 2. Look for agent results in the inputs
            if not connected_agents:
                for key, value in formatted_inputs.items():
                    if isinstance(value, dict):
                        # Check if this is an agent result
                        if (value.get('type') == 'agent_result' or 
                            'agent_name' in value or 
                            'role' in value or
                            key.startswith('agent-') or
                            key.startswith('input_from_agent-')):
                            
                            # Extract agent info from the result or metadata
                            metadata = value.get('metadata', {})
                            data = value.get('data', {})
                            
                            agent_info = {
                                "role": (data.get("role") or metadata.get("role") or value.get("role") or "Assistant"),
                                "goal": (data.get("goal") or metadata.get("goal") or value.get("goal") or "Help the user"),
                                "backstory": (data.get("backstory") or metadata.get("backstory") or value.get("backstory") or ""),
                                "framework": (metadata.get("framework") or data.get("framework") or value.get("framework") or "openai"),
                                "llmModel": (
                                    data.get("llm", {}).get("model") or           # New frontend format
                                    data.get("llmModel") or                       # Legacy format
                                    data.get("llm_model") or                      # Alternative format
                                    metadata.get("llm", {}).get("model") or      # Metadata new format
                                    metadata.get("llmModel") or                   # Metadata legacy format
                                    metadata.get("llm_model") or                  # Metadata alternative format
                                    value.get("llm", {}).get("model") or         # Direct value check
                                    value.get("llmModel") or                      # Direct value legacy
                                    "gpt-4"                                       # Default model
                                ),
                                "llmProvider": (
                                    data.get("llm", {}).get("provider") or        # New frontend format
                                    data.get("llmProvider") or                     # Legacy format
                                    data.get("llm_provider") or                    # Alternative format
                                    metadata.get("llm", {}).get("provider") or    # Metadata new format
                                    metadata.get("llmProvider") or                 # Metadata legacy format
                                    metadata.get("llm_provider") or                # Metadata alternative format
                                    value.get("llm", {}).get("provider") or       # Direct value check
                                    value.get("llmProvider") or                    # Direct value legacy
                                    "openai"                                       # Default provider
                                ),
                                "temperature": (data.get("temperature") or metadata.get("temperature") or value.get("temperature") or 0.7),
                                "max_tokens": (data.get("max_tokens") or metadata.get("max_tokens") or value.get("max_tokens") or 4000),
                                "allowDelegation": (data.get("allow_delegation") or metadata.get("allow_delegation") or value.get("allowDelegation") or False)
                            }
                            connected_agents.append(agent_info)
                            logger.info(f"Found connected agent: {agent_info['role']} (framework: {agent_info['framework']})")
                            break  # Found one, that's enough
            
            # 3. If no agents found in formatted inputs, check the original inputs
            if not connected_agents:
                for key, value in inputs.items():
                    if hasattr(value, 'value') and isinstance(value.value, dict):
                        agent_data = value.value
                        if (agent_data.get('type') == 'agent_result' or 
                            'agent_name' in agent_data or 
                            'role' in agent_data):
                            
                            agent_info = {
                                "role": agent_data.get("role", "Assistant"),
                                "goal": agent_data.get("goal", "Help the user"),
                                "backstory": agent_data.get("backstory", ""),
                                "framework": agent_data.get("framework", "openai"),
                                "llmModel": (
                                    agent_data.get("llm", {}).get("model") or     # New frontend format
                                    agent_data.get("llmModel") or                 # Legacy format
                                    agent_data.get("llm_model") or                # Alternative format
                                    "gpt-4"                                       # Default model
                                ),
                                "llmProvider": (
                                    agent_data.get("llm", {}).get("provider") or  # New frontend format
                                    agent_data.get("llmProvider") or              # Legacy format
                                    agent_data.get("llm_provider") or             # Alternative format
                                    "openai"                                      # Default provider
                                ),
                                "temperature": agent_data.get("temperature", 0.7),
                                "max_tokens": agent_data.get("max_tokens", 4000),
                                "allowDelegation": agent_data.get("allow_delegation", False)
                            }
                            connected_agents.append(agent_info)
                            logger.info(f"Found connected agent in NodeData: {agent_info['role']}")
                            break  # Found one, that's enough
            
            # Handle the case based on whether we found agents or not
            if not connected_agents:
                logger.warning(f"No agents connected to task: {task_name}")
                # Check if this is a data processing task that doesn't need an agent
                # OR if we have any meaningful input data to process
                has_meaningful_inputs = False
                
                # Check for any meaningful input data
                for key, value in formatted_inputs.items():
                    if isinstance(value, dict):
                        # Check for various types of meaningful data
                        if (value.get('type') in ['text', 'file', 'url', 'tool_result', 'agent_result'] or
                            'value' in value or 'data' in value or 'result' in value):
                            has_meaningful_inputs = True
                            break
                    elif isinstance(value, str) and value.strip():
                        has_meaningful_inputs = True
                        break
                    elif value is not None:
                        has_meaningful_inputs = True
                        break
                
                if has_meaningful_inputs:
                    logger.info(f"Task {task_name} will process data without agent")
                    # Process the task as a data transformation/processing task
                    agent_response = await self._process_data_task(task_name, description, formatted_inputs, expected_output)
                    
                    # Create task result for data processing
                    result = {
                        "type": "task_result",
                        "task_name": task_name,
                        "description": description,
                        "expected_output": expected_output,
                        "is_async": is_async,
                        "inputs": formatted_inputs,
                        "status": "completed",
                        "timestamp": datetime.now().isoformat(),
                        "result": agent_response,
                        "query": description or "Data processing task"
                    }
                    
                    logger.info(f"✅ Task {task_name} completed data processing successfully")
                    return result
                else:
                    # Only return error if we have no agents AND no meaningful input data
                    logger.error(f"Task {task_name} has no connected agents and no meaningful input data")
                    return {
                        "success": False,
                        "type": "error",
                        "error": "Task requires at least one connected agent or meaningful input data to process"
                    }
            else:
                # We have connected agents - proceed with agent-based processing
                # Extract the primary agent (first in the list)
                primary_agent = connected_agents[0]
                agent_role = primary_agent.get("role", "Assistant")
                agent_goal = primary_agent.get("goal", "Help the user")
            
            # Initialize enhanced framework config
            enhanced_framework_config = {
                "provider": primary_agent.get("llmProvider", "openai"),
                "model": primary_agent.get("llmModel", "gpt-4"),
                "temperature": primary_agent.get("temperature", 0.7),
                "max_tokens": primary_agent.get("max_tokens", 4000)
            }
            
            # Find the user query and check for files in the inputs
            user_query = None
            file_data = None
            
            # First look for structured inputs with type and value
            for key, value in formatted_inputs.items():
                # Look for file inputs first
                if isinstance(value, dict) and value.get('type') == 'file' and 'value' in value:
                    file_data = value.get('value')
                    logger.info(f"Found file input: {file_data.get('filename', 'unknown file')}")
                    break
                
                # Look for structured text inputs
                elif isinstance(value, dict) and value.get('type') == 'text' and 'value' in value:
                    user_query = value.get('value')
                    logger.info(f"Found structured text input: {user_query}")
                    break
                    
                # Look for structured URL inputs
                elif isinstance(value, dict) and value.get('type') == 'url' and 'value' in value:
                    user_query = f"Please analyze this URL: {value.get('value')}"
                    logger.info(f"Found URL input: {value.get('value')}")
                    break
            
            # If no structured inputs found, look for other formats
            if not user_query and not file_data:
                for key, value in formatted_inputs.items():
                    # Simple dict with value key
                    if isinstance(value, dict) and 'value' in value and isinstance(value['value'], str):
                        user_query = value['value']
                        logger.info(f"Found value in dict: {user_query}")
                        break
                    # Nested data structure
                    elif isinstance(value, dict) and 'data' in value and isinstance(value['data'], dict):
                        for k, v in value['data'].items():
                            if isinstance(v, dict) and 'value' in v:
                                user_query = v.get('value')
                                logger.info(f"Found nested value in data: {user_query}")
                                break
                    # Direct string value
                    elif isinstance(value, str):
                        user_query = value
                        logger.info(f"Found direct string input: {user_query}")
                        break
            
            # Log the extracted data
            logger.debug(f"Extracted user query: {user_query}")
            if file_data:
                logger.debug(f"Extracted file: {file_data.get('filename', 'unknown file')}")
            
            # Use defaults if nothing was found
            if not user_query and not file_data:
                user_query = description or "Please provide information on this topic."
                logger.info(f"Using default query: {user_query}")
            
            # If we have a file but no query, create a prompt about the file
            if file_data and not user_query:
                filename = file_data.get('filename', 'this file')
                user_query = f"Please analyze {filename} and provide insights."
                logger.info(f"Created file analysis query: {user_query}")
            
            # Get the agent framework from configuration
            agent_framework = primary_agent.get("framework", "").lower()
            
            # Try to use the appropriate framework runner
            agent_response = "No response generated"
            try:
                if agent_framework == "crewai":
                    # Try to use the crewai runner
                    try:
                        from frameworks.crewai_runner import EnhancedCrewAIRunner
                        logger.info("Using CrewAI framework for agent task")
                        
                        # Create CrewAI runner instance
                        crewai_runner = EnhancedCrewAIRunner()
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "perplexity"                                      # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        agent_data = {
                            "role": agent_role,
                            "goal": agent_goal,
                            "backstory": primary_agent.get("backstory", ""),
                            "frameworkConfig": enhanced_framework_config if enhanced_framework_config else {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "allowDelegation": primary_agent.get("allowDelegation", False),
                            "enableMemory": False,
                            "verbose": True
                        }
                        
                        # Check if context has the get_api_key_for_framework method
                        if hasattr(context, 'get_api_key_for_framework'):
                            # Get API key from execution context
                            api_key = context.get_api_key_for_framework('perplexity')
                            if api_key:
                                enhanced_framework_config['api_key'] = api_key
                                enhanced_framework_config['perplexity_api_key'] = api_key
                                agent_data["frameworkConfig"]["api_key"] = api_key
                                agent_data["frameworkConfig"]["perplexity_api_key"] = api_key
                                logger.info(f"🔑 TaskNode: Got API key from execution context for perplexity")
                            else:
                                logger.warning(f"⚠️ TaskNode: No API key found in execution context for perplexity")
                        else:
                            logger.warning(f"⚠️ TaskNode: Context does not have get_api_key_for_framework method. Context type: {type(context)}")
                            
                            # FALLBACK: Try to get API key from the connected agent's frameworkConfig
                            if formatted_inputs:
                                for input_key, input_value in formatted_inputs.items():
                                    if isinstance(input_value, dict) and 'metadata' in input_value:
                                        agent_metadata = input_value.get('metadata', {})
                                        if 'agent_result' in agent_metadata:
                                            agent_result = agent_metadata['agent_result']
                                            # Check if the agent has frameworkConfig with API key
                                            if isinstance(agent_result, dict):
                                                # Try to extract API key from various possible locations
                                                api_key = None
                                                
                                                # Check if there's frameworkConfig in the agent result
                                                if 'frameworkConfig' in agent_result:
                                                    fc = agent_result['frameworkConfig']
                                                    api_key = fc.get('api_key') or fc.get('perplexity_api_key')
                                                
                                                # Check top-level keys
                                                if not api_key:
                                                    api_key = agent_result.get('api_key') or agent_result.get('perplexity_api_key')
                                                
                                                if api_key:
                                                    enhanced_framework_config['api_key'] = api_key
                                                    enhanced_framework_config['perplexity_api_key'] = api_key
                                                    agent_data["frameworkConfig"]["api_key"] = api_key
                                                    agent_data["frameworkConfig"]["perplexity_api_key"] = api_key
                                                    logger.info(f"🔑 TaskNode: Got API key from connected agent's result")
                                                    break
                        
                        # FINAL FALLBACK: Check if we can get it from the original context object
                        if 'api_key' not in enhanced_framework_config and hasattr(context, 'user_api_keys'):
                            perplexity_key = context.user_api_keys.get('perplexity')
                            if perplexity_key:
                                enhanced_framework_config['api_key'] = perplexity_key
                                enhanced_framework_config['perplexity_api_key'] = perplexity_key
                                agent_data["frameworkConfig"]["api_key"] = perplexity_key
                                agent_data["frameworkConfig"]["perplexity_api_key"] = perplexity_key
                                logger.info(f"🔑 TaskNode: Got API key from context.user_api_keys")
                        
                        # CRITICAL FIX: Ensure the API key is in the agent_data frameworkConfig
                        if 'api_key' in enhanced_framework_config:
                            agent_data["frameworkConfig"]["api_key"] = enhanced_framework_config["api_key"]
                        if 'perplexity_api_key' in enhanced_framework_config:
                            agent_data["frameworkConfig"]["perplexity_api_key"] = enhanced_framework_config["perplexity_api_key"]
                        
                        logger.info(f"🔧 TaskNode FINAL agent_data frameworkConfig: {agent_data['frameworkConfig']}")
                        
                        task_data = {
                            "description": user_query,
                            "expectedOutput": expected_output or "Detailed response to the query"
                        }
                        
                        # Run the agent
                        result = await crewai_runner.run_crewai_agent(
                            agent_config=agent_data, 
                            task_config=task_data,
                            inputs=formatted_inputs
                        )
                        agent_response = result.get("output", "No response from CrewAI agent")
                    except ImportError as e:
                        logger.error(f"CrewAI runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"CrewAI execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "langchain":
                    # Try to use the langchain runner
                    try:
                        from frameworks.langchain_runner import run_langchain_tool
                        logger.info("Using LangChain framework for agent task")
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "perplexity"                                      # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        # 🔧 CRITICAL FIX: Ensure enhanced_framework_config has the API key for LangChain
                        # This is the same API key injection logic used for CrewAI
                        
                        # Check if context has the get_api_key_for_framework method
                        if hasattr(context, 'get_api_key_for_framework'):
                            # Get API key from execution context
                            api_key = context.get_api_key_for_framework('perplexity')
                            if api_key:
                                enhanced_framework_config['api_key'] = api_key
                                enhanced_framework_config['perplexity_api_key'] = api_key
                                logger.info(f"🔑 TaskNode LangChain: Got API key from execution context for perplexity")
                            else:
                                logger.warning(f"⚠️ TaskNode LangChain: No API key found in execution context for perplexity")
                        else:
                            logger.warning(f"⚠️ TaskNode LangChain: Context does not have get_api_key_for_framework method. Context type: {type(context)}")
                            
                            # FALLBACK: Try to get API key from the connected agent's frameworkConfig
                            if formatted_inputs:
                                for input_key, input_value in formatted_inputs.items():
                                    if isinstance(input_value, dict) and 'metadata' in input_value:
                                        agent_metadata = input_value.get('metadata', {})
                                        if 'agent_result' in agent_metadata:
                                            agent_result = agent_metadata['agent_result']
                                            # Check if the agent has frameworkConfig with API key
                                            if isinstance(agent_result, dict):
                                                # Try to extract API key from various possible locations
                                                api_key = None
                                                
                                                # Check if there's frameworkConfig in the agent result
                                                if 'frameworkConfig' in agent_result:
                                                    fc = agent_result['frameworkConfig']
                                                    api_key = fc.get('api_key') or fc.get('perplexity_api_key')
                                                
                                                # Check top-level keys
                                                if not api_key:
                                                    api_key = agent_result.get('api_key') or agent_result.get('perplexity_api_key')
                                                
                                                if api_key:
                                                    enhanced_framework_config['api_key'] = api_key
                                                    enhanced_framework_config['perplexity_api_key'] = api_key
                                                    logger.info(f"🔑 TaskNode LangChain: Got API key from connected agent's result")
                                                    break
                        
                        # FINAL FALLBACK: Check if we can get it from the original context object
                        if 'api_key' not in enhanced_framework_config and hasattr(context, 'user_api_keys'):
                            perplexity_key = context.user_api_keys.get('perplexity')
                            if perplexity_key:
                                enhanced_framework_config['api_key'] = perplexity_key
                                enhanced_framework_config['perplexity_api_key'] = perplexity_key
                                logger.info(f"🔑 TaskNode LangChain: Got API key from context.user_api_keys")
                        
                        config = {
                            "frameworkConfig": enhanced_framework_config,  # Now contains the BYOK API key!
                            "systemMessage": f"You are {agent_role}. Your goal: {agent_goal}. Backstory: {primary_agent.get('backstory', '')}",
                            "chainType": "simple",
                            "verbose": True,
                            "tools": primary_agent.get("tools", [])
                        }
                        
                        inputs_data = {
                            "input": user_query,
                            "message": user_query,
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        logger.info(f"🔧 TaskNode LangChain config frameworkConfig: {config['frameworkConfig']}")
                        
                        # Run the LangChain agent
                        result = await run_langchain_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from LangChain agent")
                    except ImportError as e:
                        logger.error(f"LangChain runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"LangChain execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "autogen":
                    # Try to use the autogen runner
                    try:
                        from frameworks.autogen_runner import run_autogen_tool
                        logger.info("Using AutoGen framework for agent task")
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "perplexity"                                      # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        # Prepare config for AutoGen
                        config = {
                            "llm": {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the AutoGen agent
                        result = await run_autogen_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from AutoGen agent")
                    except ImportError as e:
                        logger.error(f"AutoGen runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"AutoGen execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "llamaindex":
                    # Try to use the llamaindex runner
                    try:
                        from frameworks.llamaindex_runner import run_llamaindex_tool
                        logger.info("Using LlamaIndex framework for agent task")
                        
                        # Extract LLM provider from multiple possible locations
                        llm_provider = (
                            primary_agent.get("llm", {}).get("provider") or  # New frontend format
                            primary_agent.get("llmProvider") or              # Legacy format
                            primary_agent.get("llm_provider") or             # Alternative format
                            "perplexity"                                      # Default fallback
                        )
                        
                        # Extract LLM model from multiple possible locations
                        llm_model = (
                            primary_agent.get("llm", {}).get("model") or     # New frontend format
                            primary_agent.get("llmModel") or                 # Legacy format
                            primary_agent.get("llm_model") or                # Alternative format
                            "llama-3.1-sonar-small-128k-online"              # Default to Perplexity model instead of gpt-4
                        )
                        
                        # Prepare config for LlamaIndex
                        config = {
                            "llm": {
                                "provider": llm_provider,
                                "model": llm_model,
                                "temperature": primary_agent.get("temperature", 0.7),
                                "max_tokens": primary_agent.get("max_tokens", 4000)
                            },
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the LlamaIndex agent
                        result = await run_llamaindex_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from LlamaIndex agent")
                    except ImportError as e:
                        logger.error(f"LlamaIndex runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"LlamaIndex execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "huggingface":
                    # Try to use the huggingface runner
                    try:
                        from frameworks.huggingface_runner import run_huggingface_tool
                        logger.info("Using HuggingFace framework for agent task")
                        
                        # Prepare config for HuggingFace
                        config = {
                            "model": primary_agent.get("llmModel", "microsoft/DialoGPT-medium"),
                            "temperature": primary_agent.get("temperature", 0.7),
                            "max_tokens": primary_agent.get("max_tokens", 4000),
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the HuggingFace agent
                        result = await run_huggingface_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from HuggingFace agent")
                    except ImportError as e:
                        logger.error(f"HuggingFace runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"HuggingFace execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                
                elif agent_framework == "webhook":
                    # Try to use the webhook runner
                    try:
                        from frameworks.webhook_runner import run_webhook_tool
                        logger.info("Using Webhook framework for agent task")
                        
                        # Prepare config for Webhook
                        config = {
                            "webhook_url": primary_agent.get("webhookUrl", ""),
                            "method": primary_agent.get("method", "POST"),
                            "headers": primary_agent.get("headers", {}),
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the Webhook agent
                        result = await run_webhook_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from Webhook agent")
                    except ImportError as e:
                        logger.error(f"Webhook runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"Webhook execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    
                elif agent_framework == "openrouter":
                    # Try to use the openrouter runner
                    try:
                        from frameworks.openrouter_runner import run_openrouter_tool
                        logger.info("Using OpenRouter framework for agent task")
                        
                        # Prepare config for OpenRouter
                        config = {
                            "model": primary_agent.get("llmModel", "openai/gpt-4"),
                            "temperature": primary_agent.get("temperature", 0.7),
                            "max_tokens": primary_agent.get("max_tokens", 4000),
                            "agent": {
                                "role": agent_role,
                                "goal": agent_goal,
                                "backstory": primary_agent.get("backstory", "")
                            }
                        }
                        
                        inputs_data = {
                            "query": user_query,
                            "context": formatted_inputs
                        }
                        
                        # Run the OpenRouter agent
                        result = await run_openrouter_tool(config, inputs_data)
                        agent_response = result.get("output", "No response from OpenRouter agent")
                    except ImportError as e:
                        logger.error(f"OpenRouter runner import error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    except Exception as e:
                        logger.error(f"OpenRouter execution error: {str(e)}")
                        agent_response = await self._execute_agent_query(primary_agent, user_query)
                    
                elif agent_framework == "openai":
                    # Try to use direct OpenAI API
                    agent_response = await self._execute_openai_query(primary_agent, user_query)
                    
                elif agent_framework == "anthropic":
                    # Try to use direct Anthropic API
                    agent_response = await self._execute_anthropic_query(primary_agent, user_query)
                    
                else:
                    # Use a generic approach for other frameworks
                    logger.info(f"Using generic approach for framework: {agent_framework}")
                    agent_response = await self._execute_agent_query(primary_agent, user_query)
                    
            except Exception as e:
                logger.error(f"Error executing agent with framework {agent_framework}: {str(e)}")
                agent_response = f"Error executing agent with framework {agent_framework}: {str(e)}"

            # Create task result
            result = {
                "type": "task_result",
                "task_name": task_name,
                "description": description,
                "expected_output": expected_output,
                "is_async": is_async,
                "inputs": formatted_inputs,
                "status": "completed",  # Now marked as completed
                "timestamp": datetime.now().isoformat(),
                "result": agent_response,  # Add the agent response here
                "query": user_query  # Include the query that was processed
            }

            # Add connected agents info
            if connected_agents:
                result["agents"] = connected_agents

            # CRITICAL FIX: Handle both dict and WorkflowExecutionContext objects
            if hasattr(context, 'execution_id'):
                execution_id = context.execution_id
            elif hasattr(context, 'get') and callable(getattr(context, 'get')):
                execution_id = context.get('execution_id', 'unknown')
            elif isinstance(context, dict):
                execution_id = context.get('execution_id', 'unknown')
            else:
                execution_id = 'unknown'

            # Add task metadata
            result["metadata"] = {
                "node_id": node_id,
                "execution_id": execution_id,
                "dependencies": dependencies
            }

            return {
                "success": True,
                "type": "task_result",
                "data": result
            }

        except Exception as e:
            logger.error(f"Error in task node: {str(e)}")
            # Get task name safely
            task_name = "Unnamed Task"
            try:
                if isinstance(node, dict) and 'data' in node:
                    task_name = node['data'].get('label', "Unnamed Task")
            except:
                pass
                
            return {
                "success": False,
                "type": "error",
                "error": str(e),
                "task_name": task_name,
                "timestamp": datetime.now().isoformat()
            }
            
    async def _execute_agent_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using the specified agent configuration"""
        try:
            # Detect which LLM framework to use based on agent config
            framework = agent_config.get("framework", "openai").lower()
            
            if framework == "openai":
                return await self._execute_openai_query(agent_config, query)
            elif framework == "anthropic":
                return await self._execute_anthropic_query(agent_config, query)
            elif framework == "openrouter":
                return await self._execute_openrouter_query(agent_config, query)
            else:
                return f"Agent framework '{framework}' not supported. Query was: {query}"
                
        except Exception as e:
            logger.error(f"Error in agent execution: {str(e)}")
            return f"Error executing agent query: {str(e)}"
    
    async def _execute_openai_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using OpenAI"""
        try:
            import openai
            import os
            
            # Use environment variable or default to a demo key
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("No OpenAI API key found - returning simulated response")
                return f"[Simulated {agent_config.get('role')} response to: {query}]"
                
            # Configure client
            client = openai.Client(api_key=api_key)
            
            # Extract parameters from agent config
            model = agent_config.get("llmModel", "gpt-4")
            temperature = agent_config.get("temperature", 0.7)
            max_tokens = agent_config.get("max_tokens", 1000)
            
            # Create system message from role, goal, and backstory
            system_message = f"You are a {agent_config.get('role', 'Assistant')}. "
            system_message += f"Your goal is to {agent_config.get('goal', 'help the user')}. "
            
            if 'backstory' in agent_config:
                system_message += f"Backstory: {agent_config.get('backstory')}"
                
            # Create the completion - Note: No await here as it's not an async call in new OpenAI library
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": query}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract and return the response text
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            return f"Error with OpenAI: {str(e)}"
    
    async def _execute_anthropic_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using Anthropic"""
        try:
            import anthropic
            import os
            
            # Use environment variable or default to a demo key
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                logger.warning("No Anthropic API key found - returning simulated response")
                return f"[Simulated {agent_config.get('role')} response to: {query}]"
                
            # Configure client
            client = anthropic.Anthropic(api_key=api_key)
            
            # Extract parameters from agent config
            model = agent_config.get("llmModel", "claude-3-opus-20240229") 
            temperature = agent_config.get("temperature", 0.7)
            max_tokens = agent_config.get("max_tokens", 1000)
            
            # Create system message from role, goal, and backstory
            system_message = f"You are a {agent_config.get('role', 'Assistant')}. "
            system_message += f"Your goal is to {agent_config.get('goal', 'help the user')}. "
            
            if 'backstory' in agent_config:
                system_message += f"Backstory: {agent_config.get('backstory')}"
                
            # Create the completion
            response = client.messages.create(
                model=model,
                system=system_message,
                messages=[{"role": "user", "content": query}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract and return the response text
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Anthropic error: {str(e)}")
            return f"Error with Anthropic: {str(e)}"

    async def _execute_openrouter_query(self, agent_config: Dict[str, Any], query: str) -> str:
        """Execute a query using OpenRouter"""
        try:
            from frameworks.openrouter_runner import run_openrouter_tool
            
            # Prepare config for OpenRouter
            config = {
                "model": agent_config.get("llmModel", "openai/gpt-4"),
                "temperature": agent_config.get("temperature", 0.7),
                "max_tokens": agent_config.get("max_tokens", 4000),
                "agent": {
                    "role": agent_config.get("role", "Assistant"),
                    "goal": agent_config.get("goal", "Help the user"),
                    "backstory": agent_config.get("backstory", "")
                }
            }
            
            inputs_data = {
                "query": query,
                "context": {}
            }
            
            # Run the OpenRouter agent
            result = await run_openrouter_tool(config, inputs_data)
            return result.get("output", "No response from OpenRouter agent")
            
        except Exception as e:
            logger.error(f"OpenRouter error: {str(e)}")
            return f"Error with OpenRouter: {str(e)}"

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate task configuration"""
        required_fields = ['description']
        return all(field in config and config[field] for field in required_fields)

    def get_dependencies(self, node: Node) -> List[str]:
        """Get task dependencies"""
        config = node.get_config()
        return config.dependencies if config else []

    def is_async(self, node: Node) -> bool:
        """Check if task should be executed asynchronously"""
        config = node.get_config()
        return config.async_execution

    async def _process_data_task(self, task_name: str, description: str, inputs: Dict[str, Any], expected_output: str) -> str:
        """Process a data transformation/processing task without requiring an agent"""
        try:
            logger.info(f"Processing data task: {task_name}")
            
            # Extract meaningful data from inputs
            processed_data = []
            
            for key, value in inputs.items():
                if isinstance(value, dict):
                    # Handle different types of input data
                    if value.get('type') == 'tool_result':
                        result = value.get('result', {})
                        if result.get('success'):
                            processed_data.append(f"Tool result: {result.get('data', result)}")
                        else:
                            processed_data.append(f"Tool error: {result.get('error', 'Unknown error')}")
                    
                    elif value.get('type') == 'agent_result':
                        data = value.get('data', {})
                        processed_data.append(f"Agent output: {data}")
                    
                    elif 'result' in value:
                        processed_data.append(f"Result: {value['result']}")
                    
                    elif 'output' in value:
                        processed_data.append(f"Output: {value['output']}")
                    
                    elif 'data' in value:
                        processed_data.append(f"Data: {value['data']}")
                    
                    else:
                        processed_data.append(f"{key}: {value}")
                
                elif isinstance(value, str):
                    processed_data.append(f"{key}: {value}")
                
                else:
                    processed_data.append(f"{key}: {str(value)}")
            
            # Create a meaningful response based on the task description and inputs
            if description and "score" in description.lower():
                # This looks like a scoring task
                response = f"Scoring analysis for {task_name}:\n"
                response += f"Based on the provided data: {'; '.join(processed_data)}\n"
                response += f"Expected output: {expected_output or 'Score calculation completed'}"
            
            elif description and any(word in description.lower() for word in ["calculate", "compute", "analyze"]):
                # This looks like a calculation/analysis task
                response = f"Analysis results for {task_name}:\n"
                response += f"Processed data: {'; '.join(processed_data)}\n"
                response += f"Analysis complete: {expected_output or 'Data processed successfully'}"
            
            elif description and any(word in description.lower() for word in ["format", "transform", "convert"]):
                # This looks like a data transformation task
                response = f"Data transformation for {task_name}:\n"
                response += f"Transformed data: {'; '.join(processed_data)}\n"
                response += f"Format: {expected_output or 'Data formatted successfully'}"
            
            else:
                # Generic data processing
                response = f"Data processing results for {task_name}:\n"
                response += f"Processed inputs: {'; '.join(processed_data)}\n"
                response += f"Output: {expected_output or 'Task completed successfully'}"
            
            logger.info(f"Data task {task_name} processed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error processing data task {task_name}: {str(e)}")
            return f"Error processing data task {task_name}: {str(e)}"


# Standalone function for node processor compatibility
async def process_task_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, NodeData], 
    context: Dict[str, Any] = None
) -> NodeData:
    """
    Process task node with LLM-centric processing support
    """
    try:
        from models.data import NodeData
        
        # 🚀 CHECK FOR LLM-CENTRIC MODE
        llm_mode_enabled = node_data.get('llm_mode_enabled', False)
        
        # If LLM-centric mode is enabled, use LLM Runner for intelligent task processing
        if llm_mode_enabled:
            logger.info(f"🤖 Using LLM-centric processing for task node")
            
            # Extract task configuration
            task_description = node_data.get('description', node_data.get('data', {}).get('description', ''))
            expected_output = node_data.get('expectedOutput', node_data.get('data', {}).get('expectedOutput', ''))
            
            # Prepare input data for LLM task execution
            llm_input_data = {
                'node_id': node_data.get('nodeId', node_data.get('id', 'unknown')),
                'node_type': 'task',
                'node_config': node_data,
                'description': task_description,
                'expected_output': expected_output,
                'input_data': {key: value.value if isinstance(value, NodeData) else value for key, value in inputs.items()}
            }
            
            # Get user ID from context
            user_id = None
            if context and isinstance(context, dict):
                user_id = context.get('user_id')
            
            # Execute LLM task for task execution
            llm_result = await llm_runner.execute_llm_task(
                task_type='task_execution',
                input_data=llm_input_data,
                context=context or {},
                user_id=user_id,
                stream=False
            )
            
            if llm_result.get('success'):
                # LLM processing successful - return standardized result
                llm_output = llm_result.get('output', {})
                
                standardized_result = {
                    "success": True,
                    "data": {
                        "type": "task_result",
                        "task_name": node_data.get('label', 'LLM Task'),
                        "description": task_description,
                        "expected_output": expected_output,
                        "result": llm_output.get('result', llm_output.get('output', 'Task completed')),
                        "status": "completed" if llm_output.get('task_completed', True) else "partial",
                        "summary": llm_output.get('summary', 'Task processed by LLM'),
                        "llm_processed": True,
                        "reasoning": llm_output.get('reasoning', ''),
                        "confidence": llm_output.get('confidence', 0.8)
                    },
                    "error": None,
                    "metadata": {
                        "node_type": "task",
                        "processing_mode": "llm_centric",
                        "llm_metadata": llm_result.get('metadata', {}),
                        "timestamp": datetime.now().isoformat()
                    }
                }
                
                logger.info(f"✅ LLM-centric task processing successful")
                return NodeData.from_value(standardized_result)
            else:
                # LLM processing failed, fall back to traditional processing
                logger.warning(f"LLM-centric task processing failed, falling back to traditional processing: {llm_result.get('error')}")
        
        # 🚀 TRADITIONAL PROCESSING (existing code)
        # Create TaskNode instance
        task_node = TaskNode()
        
        # Create a Node object from node_data
        from models.nodes import Node, NodeType
        
        # Extract the actual node data/configuration
        node_config = node_data.get('data', node_data.copy())
        
        # Ensure required fields exist for TaskConfig validation
        if 'label' not in node_config or not node_config['label']:
            node_config['label'] = f"Task {node_data.get('nodeId', node_data.get('id', 'unknown'))}"
            
        if 'description' not in node_config or not node_config['description']:
            node_config['description'] = f"Processing task for {node_data.get('nodeId', node_data.get('id', 'unknown'))}"
        
        node = Node(
            id=node_data.get('nodeId', node_data.get('id', 'unknown')),
            type=NodeType.TASK,
            data=node_config,  # Use extracted config, not entire node_data
            position=node_data.get('position', {'x': 0, 'y': 0})
        )
        
        # CRITICAL FIX: Check if context is a dict and extract the actual WorkflowExecutionContext
        actual_context = context
        if isinstance(context, dict):
            # Look for the actual WorkflowExecutionContext in the dict
            if 'execution_context' in context:
                actual_context = context['execution_context']
                logger.info(f"🔧 TaskNode: Found execution_context in dict")
            elif 'workflow_execution_context' in context:
                actual_context = context['workflow_execution_context']
                logger.info(f"🔧 TaskNode: Found workflow_execution_context in dict")
            elif 'context' in context:
                actual_context = context['context']
                logger.info(f"🔧 TaskNode: Found context in dict")
            else:
                # If we can't find the WorkflowExecutionContext, we'll work with what we have
                logger.warning(f"⚠️ TaskNode: Could not find WorkflowExecutionContext in dict, using dict directly")
                actual_context = context
        
        logger.info(f"🔧 TaskNode: Final context type: {type(actual_context)}")
        
        # Process the node with the actual context
        result = await task_node.process(node, inputs, actual_context)
        
        # Ensure result is wrapped in NodeData
        if isinstance(result, NodeData):
            return result
        else:
            return NodeData(
                value=result,
                metadata={
                    'node_id': node.id,
                    'node_type': 'task',
                    'timestamp': datetime.now().isoformat()
                }
            )
            
    except Exception as e:
        logger.error(f"Error in process_task_node: {str(e)}")
        return NodeData(
            value={
                "success": False,
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            metadata={
                'node_id': node_data.get('nodeId', 'unknown'),
                'node_type': 'task',
                'error': True
            }
        ) 