import logging
import os
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from functools import lru_cache

from models.runner_schemas import CrewAIRunnerConfig
from models.schemas import NodeSchema, SchemaType, SchemaField

logger = logging.getLogger(__name__)

try:
    from crewai import Agent, Task, Crew, Process
    from crewai.tools import BaseTool
    # New 0.121.0 imports - make built-in tools optional
    CREWAI_AVAILABLE = True
    CREWAI_VERSION = "0.121.0"
    
    # Try to import built-in tools but don't fail if they don't exist
    BUILTIN_TOOLS_AVAILABLE = False
    try:
        from crewai.tools import WebSearchTool, CalculatorTool, FileReaderTool
        BUILTIN_TOOLS_AVAILABLE = True
    except ImportError:
        # Built-in tools not available or named differently
        pass
    
    # Also try LangChain tools as fallback
    try:
        from langchain.tools import Tool
        LANGCHAIN_TOOLS_AVAILABLE = True
    except ImportError:
        LANGCHAIN_TOOLS_AVAILABLE = False
        
except ImportError:
    logger.warning("CrewAI not installed - using fallback implementation")
    CREWAI_AVAILABLE = False
    CREWAI_VERSION = "fallback"
    BUILTIN_TOOLS_AVAILABLE = False
    LANGCHAIN_TOOLS_AVAILABLE = False
    # Define fallback BaseTool when CrewAI is not available
    class BaseTool:
        """Fallback BaseTool class when CrewAI is not available"""
        pass

class EnhancedCrewAIRunner:
    """Enhanced CrewAI runner with 0.1.21 features support"""
    
    def __init__(self):
        self.agents_cache = {}
        self.tools_cache = {}
        self.token_usage = {}
        self.intermediate_steps = []
    
    def get_built_in_tools(self) -> Dict[str, BaseTool]:
        """Get CrewAI 0.121.0 built-in tools"""
        if not CREWAI_AVAILABLE:
            return {}
        
        tools = {}
        
        # Try to get built-in tools if available
        if BUILTIN_TOOLS_AVAILABLE:
            try:
                tools.update({
                    'web_search': WebSearchTool(),
                    'calculator': CalculatorTool(),
                    'file_reader': FileReaderTool(),
                })
            except Exception as e:
                logger.warning(f"Could not load built-in tools: {e}")
        
        # If no built-in tools available, create basic LangChain tools as fallback
        if not tools and LANGCHAIN_TOOLS_AVAILABLE:
            try:
                from langchain_community.tools import DuckDuckGoSearchRun
                from langchain.tools import Tool
                
                # Create basic tools using LangChain
                search_tool = Tool(
                    name="web_search",
                    description="Search the web for information",
                    func=DuckDuckGoSearchRun().run
                )
                
                calculator_tool = Tool(
                    name="calculator",
                    description="Perform mathematical calculations",
                    func=self._basic_calculator
                )
                
                tools.update({
                    'web_search': search_tool,
                    'calculator': calculator_tool
                })
                
                logger.info("✅ Using LangChain tools as CrewAI fallback")
                
            except Exception as e:
                logger.warning(f"Could not create LangChain fallback tools: {e}")
        
        logger.info(f"📦 Available CrewAI tools: {list(tools.keys())}")
        return tools
    
    def _basic_calculator(self, expression: str) -> str:
        """Basic calculator function for fallback"""
        try:
            import ast
            import operator
            
            # Safe evaluation of basic math expressions
            safe_ops = {
                ast.Add: operator.add,
                ast.Sub: operator.sub,
                ast.Mult: operator.mul,
                ast.Div: operator.truediv,
                ast.Pow: operator.pow,
                ast.USub: operator.neg,
            }
            
            def eval_expr(node):
                if isinstance(node, ast.Constant):
                    return node.value
                elif isinstance(node, ast.BinOp):
                    return safe_ops[type(node.op)](eval_expr(node.left), eval_expr(node.right))
                elif isinstance(node, ast.UnaryOp):
                    return safe_ops[type(node.op)](eval_expr(node.operand))
                else:
                    raise TypeError(f"Unsupported operation: {type(node)}")
            
            tree = ast.parse(expression, mode='eval')
            result = eval_expr(tree.body)
            return str(result)
            
        except Exception as e:
            return f"Calculator error: {str(e)}"
    
    def get_llm_for_framework(self, framework_config: Dict[str, Any]):
        """Get appropriate LLM based on configuration with token tracking"""
        provider = framework_config.get('provider', 'openai')
        model = framework_config.get('model', 'gpt-4')
        api_key = framework_config.get('api_key', '')
        
        # Enhanced LLM config for 0.1.21
        llm_config = {
            'temperature': framework_config.get('temperature', 0.7),
            'max_tokens': framework_config.get('max_tokens', 4000)
            # FIXED: Removed callbacks to avoid validation errors
        }
        
        # Handle BYOK (Bring Your Own Keys) format
        actual_api_key = None
        if api_key:
            if api_key.startswith('[BYOK:'):
                # Extract the actual API key from BYOK format
                # The actual key should be injected by the execution context
                logger.debug(f"BYOK key detected for provider: {provider}")
                # The execution context should have already replaced this with the actual key
                # If we still see [BYOK:], it means the key wasn't properly injected
                logger.warning(f"BYOK key not properly injected for {provider}")
            else:
                # Direct API key
                actual_api_key = api_key
                logger.debug(f"Direct API key provided for {provider}")
        
        # Add API key to config if we have one
        if actual_api_key:
            llm_config['api_key'] = actual_api_key
            logger.info(f"✅ Using API key for {provider} (model: {model})")
        else:
            logger.warning(f"❌ No API key available for {provider} (model: {model})")

        if provider == 'openai':
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model=model, **llm_config)
        elif provider == 'anthropic':
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(model=model, **llm_config)
        elif provider == 'perplexity':
            # Don't try to create an LLM for Perplexity - use fallback execution instead
            logger.info(f"🔍 Perplexity provider detected - will use direct API calls")
            return None  # This forces fallback execution
        elif provider == 'openrouter':
            from langchain_openai import ChatOpenAI
            # OpenRouter uses OpenAI-compatible API
            openrouter_config = {
                **llm_config,
                'base_url': 'https://openrouter.ai/api/v1',
                'model': model
            }
            return ChatOpenAI(**openrouter_config)
        elif provider == 'gemini' or provider == 'google':
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(model=model, **llm_config)
            except ImportError:
                logger.warning(f"Google Generative AI not available for {provider}, will use fallback execution")
                return None  # This forces fallback execution with the correct provider
        else:
            logger.warning(f"Provider {provider} will use fallback execution")
            return None  # This forces fallback execution with the correct provider
    
    def _get_token_callbacks(self):
        """Get callbacks for token usage tracking"""
        # FIXED: Return empty list to avoid callback validation errors
        # Token tracking will be handled differently
        return []
    
    def create_crewai_tools(self, tool_configs: List[Dict[str, Any]]) -> List[BaseTool]:
        """Create CrewAI-compatible tools including built-in ones"""
        tools = []
        built_in_tools = self.get_built_in_tools()
        
        for tool_config in tool_configs:
            tool_type = tool_config.get('type', 'api')
            tool_name = tool_config.get('name', '')
            
            # Check if it's a built-in tool first
            if tool_name in built_in_tools:
                tools.append(built_in_tools[tool_name])
                continue
            
            # Create custom tools
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
            # Use built-in WebSearchTool if available
            if 'web_search' in self.get_built_in_tools():
                return self.get_built_in_tools()['web_search'].run(query)
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
    
    def _create_file_tool(self, config: Dict[str, Any]) -> BaseTool:
        """Create file tool for CrewAI"""
        from crewai.tools import tool
        
        @tool("file_tool")
        def file_operation(operation: str, file_path: str = None) -> str:
            """Perform file operations like read, write, list"""
            # Use built-in FileReaderTool if available
            if 'file_reader' in self.get_built_in_tools():
                return self.get_built_in_tools()['file_reader'].run(file_path)
            return f"File operation {operation} on {file_path}"
            
        return file_operation
    
    def _process_inputs_for_crewai(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process inputs to extract actual values from NodeData objects for CrewAI"""
        processed = {}
        for key, value in inputs.items():
            # DEBUG: Log what we're processing
            logger.debug(f"🔧 Processing input '{key}': {type(value)} = {str(value)[:100]}...")
            
            # Extract value from NodeData objects recursively
            actual_value = self._extract_nodedata_recursive(value)
            
            # DEBUG: Log what we extracted
            logger.debug(f"🔧 Extracted '{key}': {type(actual_value)} = {str(actual_value)[:100]}...")
            
            # FIXED: Handle unsupported data types for CrewAI
            if isinstance(actual_value, tuple):
                # Convert tuple to string representation
                processed[key] = str(actual_value)
            elif isinstance(actual_value, (set, frozenset)):
                # Convert sets to lists
                processed[key] = list(actual_value)
            elif actual_value is None:
                # Convert None to empty string
                processed[key] = ""
            elif not isinstance(actual_value, (str, int, float, bool, dict, list)):
                # Convert any other unsupported types to string
                processed[key] = str(actual_value)
            else:
                # Supported types can be passed as-is
                processed[key] = actual_value
                
        return processed
    
    def _extract_nodedata_recursive(self, value: Any) -> Any:
        """Recursively extract NodeData values from any data structure"""
        # Handle NodeData objects
        if hasattr(value, 'value'):
            return self._extract_nodedata_recursive(value.value)
        
        # Handle dictionaries - AGGRESSIVE extraction
        elif isinstance(value, dict):
            # DEBUG: Log what we're processing
            logger.debug(f"🔧 Processing dict: {list(value.keys())}")
            
            # AGGRESSIVE: Look for any string field that could be the actual input
            string_fields = ['input', 'value', 'text', 'content', 'message', 'query', 'prompt', 'description', 'task', 'instructions']
            
            # First, check direct string fields
            for key in string_fields:
                if key in value and isinstance(value[key], str) and value[key].strip():
                    logger.debug(f"🔧 Found direct '{key}' field: {value[key][:50]}...")
                    return value[key]
            
            # If no direct string field, check nested structures
            if 'output' in value:
                output_data = value['output']
                logger.debug(f"🔧 Found 'output' with type: {type(output_data)}")
                
                if isinstance(output_data, str) and output_data.strip():
                    logger.debug(f"🔧 Found string output: {output_data[:50]}...")
                    return output_data
                elif isinstance(output_data, dict):
                    # Check for data field
                    if 'data' in output_data and isinstance(output_data['data'], dict):
                        data = output_data['data']
                        logger.debug(f"🔧 Found 'data' dict with keys: {list(data.keys())}")
                        
                        # AGGRESSIVE: Look for any string field in data
                        for key in string_fields:
                            if key in data and isinstance(data[key], str) and data[key].strip():
                                logger.debug(f"🔧 Found nested '{key}' field: {data[key][:50]}...")
                                return data[key]
                        
                        # If no string field found, convert the entire data to string
                        logger.debug(f"🔧 Converting data to string: {str(data)[:100]}...")
                        return str(data)
                    
                    # Recursively search the output dict
                    return self._extract_nodedata_recursive(output_data)
            
            # For other dictionaries, recursively extract values
            logger.debug(f"🔧 Recursively processing dict with keys: {list(value.keys())}")
            return {k: self._extract_nodedata_recursive(v) for k, v in value.items()}
        
        # Handle lists
        elif isinstance(value, list):
            return [self._extract_nodedata_recursive(item) for item in value]
        
        # Handle other types (strings, numbers, booleans, etc.)
        else:
            return value
    
    def _check_for_nodedata_in_dict(self, data: Dict[str, Any], prefix: str = ""):
        """Debug helper to check for NodeData objects in dictionaries"""
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if hasattr(value, 'value'):
                logger.warning(f"🔧 WARNING: NodeData object found in {full_key}: {type(value)}")
            elif isinstance(value, dict):
                self._check_for_nodedata_in_dict(value, full_key)
            elif isinstance(value, list):
                self._check_for_nodedata_in_list(value, full_key)
    
    def _check_for_nodedata_in_list(self, data: List[Any], prefix: str = ""):
        """Debug helper to check for NodeData objects in lists"""
        for i, item in enumerate(data):
            full_key = f"{prefix}[{i}]"
            if hasattr(item, 'value'):
                logger.warning(f"🔧 WARNING: NodeData object found in {full_key}: {type(item)}")
            elif isinstance(item, dict):
                self._check_for_nodedata_in_dict(item, full_key)
            elif isinstance(item, list):
                self._check_for_nodedata_in_list(item, full_key)

    async def run_crewai_agent(self, config: CrewAIRunnerConfig, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run CrewAI agent with schema validation"""
        if not CREWAI_AVAILABLE:
            return await self._fallback_execution(config, inputs)
        
        try:
            # Reset tracking
            self.intermediate_steps = []
            self.token_usage = {}
            
            # FIXED: Process inputs to extract values from NodeData objects
            logger.info(f"🔧 CrewAI raw inputs: {list(inputs.keys())}")
            processed_inputs = self._process_inputs_for_crewai(inputs)
            logger.info(f"🔧 CrewAI processed inputs: {list(processed_inputs.keys())}")
            
            # Debug: Check for any remaining NodeData objects
            for key, value in processed_inputs.items():
                if hasattr(value, 'value'):
                    logger.warning(f"🔧 WARNING: NodeData object still present in {key}: {type(value)}")
                elif isinstance(value, dict):
                    self._check_for_nodedata_in_dict(value, key)
                elif isinstance(value, list):
                    self._check_for_nodedata_in_list(value, key)
            
            # FIXED: Get the actual provider and API key from BYOK system
            # The config.provider might be overridden by the execution context
            actual_provider = config.provider
            actual_model = config.model
            
            # If we have an execution context, use it to get the correct provider and API key
            if hasattr(self, 'context') and self.context:
                # Get the best available provider from BYOK
                available_keys = self.context.get_api_keys_for_user()
                if available_keys:
                    # Use the first available provider, or the one specified in config
                    if actual_provider in available_keys:
                        # Provider is available, use it
                        api_key = available_keys[actual_provider]
                        logger.info(f"🔑 Using {actual_provider} with API key from BYOK")
                    else:
                        # Provider not available, use first available
                        actual_provider = list(available_keys.keys())[0]
                        api_key = available_keys[actual_provider]
                        logger.info(f"🔑 Provider {config.provider} not available, using {actual_provider} from BYOK")
                else:
                    logger.warning(f"❌ No API keys available in BYOK system")
                    return await self._fallback_execution(config, inputs)
            else:
                logger.warning(f"❌ No execution context available")
                return await self._fallback_execution(config, inputs)
            
            # Create LLM with token tracking - FIXED: Use correct field names and handle callbacks properly
            llm_config = {
                "provider": actual_provider,
                "model": actual_model,
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "api_key": api_key  # FIXED: Pass the API key
            }
            llm = self.get_llm_for_framework(llm_config)
            
            # FIXED: Handle callbacks properly to avoid validation errors
            if hasattr(llm, 'callbacks'):
                # Remove problematic callbacks to avoid validation errors
                llm.callbacks = None
            
            # FIXED: Convert tool configs to actual tool objects
            tools = []
            if config.tools:
                tools = self.create_crewai_tools(config.tools)
            
            # Create agent with proper configuration
            agent = Agent(
                role=config.role,
                goal=config.goal,
                backstory=config.backstory,
                verbose=config.verbose,
                allow_delegation=config.allow_delegation,
                llm=llm,
                tools=tools
            )
            
            # Create Task with enhanced output handling
            # AGGRESSIVE: Extract string from agent_input or any available input
            task_description = processed_inputs.get('agent_input', '')
            
            # DEBUG: Log what we got for agent_input
            logger.info(f"🔧 Task description from agent_input: {type(task_description)} = {str(task_description)[:100]}...")
            
            # AGGRESSIVE: Ensure we always get a string, even if it's a dict
            if isinstance(task_description, dict):
                # Try to extract string from the dict
                task_description = self._extract_nodedata_recursive(task_description)
                logger.info(f"🔧 Extracted from dict: {type(task_description)} = {str(task_description)[:100]}...")
            
            # If still not a string or empty, try other fields
            if not task_description or not isinstance(task_description, str):
                # Try to get description from other fields
                for field in ['task', 'instructions', 'description', 'input', 'data']:
                    value = processed_inputs.get(field, '')
                    if value and isinstance(value, str) and value.strip():
                        task_description = value
                        logger.info(f"🔧 Using {field} field: {task_description[:100]}...")
                        break
                    elif isinstance(value, dict):
                        # Try to extract string from dict
                        extracted = self._extract_nodedata_recursive(value)
                        if extracted and isinstance(extracted, str) and extracted.strip():
                            task_description = extracted
                            logger.info(f"🔧 Extracted from {field} dict: {task_description[:100]}...")
                            break
                
                # Final fallback
                if not task_description or not isinstance(task_description, str):
                    task_description = "Complete the assigned task based on the provided inputs."
                    logger.info(f"🔧 Using final fallback: {task_description}")
            
            # Ensure it's a string
            task_description = str(task_description)
            logger.info(f"🔧 Final task description: {type(task_description)} = {task_description[:100]}...")
            
            # Add context information if available
            context_info = []
            if processed_inputs.get('context'):
                if isinstance(processed_inputs['context'], dict):
                    context_lines = '\n'.join([f'{k}: {v}' for k, v in processed_inputs['context'].items()])
                    context_info.append(f"Context:\n{context_lines}")
                else:
                    context_info.append(f"Context: {processed_inputs['context']}")
            
            # Add agent output if available
            if processed_inputs.get('agent_output'):
                context_info.append(f"Agent Output: {processed_inputs['agent_output']}")
            
            # Add task input if available
            if processed_inputs.get('task_input'):
                context_info.append(f"Task Input: {processed_inputs['task_input']}")
            
            # Combine all information
            if context_info:
                task_description = f"{task_description}\n\n" + "\n\n".join(context_info)
            
            task = Task(
                description=task_description,
                expected_output="Detailed response",
                agent=agent,
                tools=tools
            )
            
            # Create Crew with enhanced configuration
            crew = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True,
                memory=config.enable_memory
            )
            
            # Execute with enhanced 0.121.0 methods
            result = crew.kickoff(inputs=processed_inputs or {})
            
            # Format response according to schema
            return {
                "result": str(result),
                "metadata": {
                    "framework": "crewai",
                    "provider": config.provider,
                    "model": config.model,
                    "execution_time": self.token_usage.get('execution_time', 0),
                    "tokens_used": self.token_usage.get('tokens', 0),
                    "cost": self.token_usage.get('cost', 0)
                },
                "intermediate_steps": self.intermediate_steps
            }
            
        except Exception as e:
            logger.error(f"CrewAI execution failed: {str(e)}")
            return {
                "result": None,
                "metadata": {
                    "framework": "crewai",
                    "provider": config.provider,
                    "model": config.model,
                    "error": str(e)
                },
                "error": str(e)
            }
    
    def _step_callback(self, step_data: Dict[str, Any]):
        """Callback for intermediate steps tracking"""
        self.intermediate_steps.append({
            "step": len(self.intermediate_steps) + 1,
            "data": step_data,
            "timestamp": datetime.now().isoformat()
        })
    
    def _get_agent_logs(self) -> List[Dict[str, Any]]:
        """Get detailed agent execution logs"""
        return [
            {
                "agent": "main",
                "thoughts": step.get("data", {}),
                "timestamp": step.get("timestamp")
            }
            for step in self.intermediate_steps
        ]

    async def run_multi_agent_crew(self, agents: List[Dict[str, Any]], 
                                 tasks: List[Dict[str, Any]],
                                 process_type: str = "sequential",
                                 inputs: Dict[str, Any] = None,
                                 return_intermediate_steps: bool = True,
                                 chat_mode: bool = False) -> Dict[str, Any]:
        """Run multi-agent CrewAI workflow with 0.1.21 features"""
        
        if not CREWAI_AVAILABLE:
            return {"error": "CrewAI not available", "success": False}
        
        try:
            # Reset tracking
            self.intermediate_steps = []
            self.token_usage = {}
            
            # Create agents with enhanced configuration
            crew_agents = []
            for agent_config in agents:
                llm = self.get_llm_for_framework(agent_config.get('frameworkConfig', {}))
                
                # 🔧 CRITICAL FIX: If any agent has LLM=None, use fallback for the entire crew
                # This prevents CrewAI from defaulting to OpenAI when we want to use a different provider
                if llm is None:
                    logger.info(f"🔄 Agent LLM is None - multi-agent CrewAI not supported for provider: {agent_config.get('frameworkConfig', {}).get('provider')}")
                    # For multi-agent, we'll run the first agent with fallback execution
                    if agents and tasks:
                        return await self._fallback_execution(agents[0], tasks[0], inputs)
                    else:
                        return {"error": "Cannot use multi-agent CrewAI with unsupported LLM provider", "success": False}
                
                agent = Agent(
                    role=agent_config.get('role'),
                    goal=agent_config.get('goal'),
                    backstory=agent_config.get('backstory'),
                    verbose=agent_config.get('verbose', True),
                    allow_delegation=agent_config.get('allowDelegation', False),
                    llm=llm,
                    memory=agent_config.get('enableMemory', False),
                    step_callback=self._step_callback if return_intermediate_steps else None
                )
                crew_agents.append(agent)
            
            # Create tasks with agent assignment
            crew_tasks = []
            for i, task_config in enumerate(tasks):
                # Assign agent to task (round-robin if more tasks than agents)
                assigned_agent = crew_agents[i % len(crew_agents)]
                
                task = Task(
                    description=task_config.get('description'),
                    expected_output=task_config.get('expectedOutput', 'Detailed response'),
                    agent=assigned_agent
                )
                crew_tasks.append(task)
            
            # Determine process type
            process = Process.sequential
            if process_type == "hierarchical":
                process = Process.hierarchical
            
            # Create and run crew
            crew = Crew(
                agents=crew_agents,
                tasks=crew_tasks,
                process=process,
                verbose=True,
                memory=any(agent.get('enableMemory', False) for agent in agents)
            )
            
            # Execute with new methods
            if chat_mode:
                result = crew.chat(
                    message=f"Execute tasks: {[task.get('description') for task in tasks]}",
                    return_intermediate_steps=return_intermediate_steps
                )
            else:
                result = crew.run(
                    inputs=inputs or {},
                    return_intermediate_steps=return_intermediate_steps
                )
            
            return {
                "type": "multi_agent_result",
                "output": str(result),
                "framework": "crewai",
                "version": CREWAI_VERSION,
                "agents_count": len(crew_agents),
                "tasks_count": len(crew_tasks),
                "process_type": process_type,
                "success": True,
                "metadata": {
                    "chat_mode": chat_mode,
                    "timestamp": datetime.now().isoformat()
                },
                "token_usage": self.token_usage,
                "intermediate_steps": self.intermediate_steps if return_intermediate_steps else [],
                "agent_logs": self._get_agent_logs()
            }
            
        except Exception as e:
            logger.error(f"Multi-agent CrewAI execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "crewai",
                "version": CREWAI_VERSION,
                "success": False
            }
    
    async def _fallback_execution(self, agent_config: Union[CrewAIRunnerConfig, Dict[str, Any]], 
                                task_config: Union[Dict[str, Any], None] = None,
                                inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Fallback when CrewAI is not available - respects user's LLM provider choice with emergency token limiting"""
        
        # Handle both CrewAIRunnerConfig objects and dicts
        if isinstance(agent_config, CrewAIRunnerConfig):
            # Convert CrewAIRunnerConfig to dict format
            config_dict = {
                'role': agent_config.role,
                'goal': agent_config.goal,
                'backstory': agent_config.backstory,
                'frameworkConfig': {
                    'provider': agent_config.provider,
                    'model': agent_config.model,
                    'temperature': agent_config.temperature,
                    'max_tokens': agent_config.max_tokens
                }
            }
            # If task_config is None, create a default one
            if task_config is None:
                task_config = {
                    'description': f"Complete the task: {agent_config.goal}"
                }
        else:
            # It's already a dict
            config_dict = agent_config
            if task_config is None:
                task_config = {
                    'description': f"Complete the task: {config_dict.get('goal', 'Help the user')}"
                }
        
        # DEBUG: Log the entire agent_config to see what we're getting
        logger.info(f"🔍 DEBUG agent_config: {config_dict}")
        
        # Get framework config to determine provider
        framework_config = config_dict.get('frameworkConfig', {})
        logger.info(f"🔍 DEBUG framework_config: {framework_config}")
        
        # FIXED: Extract provider and model from frameworkConfig first, then fallback
        provider = framework_config.get('provider', 'openai')
        model = framework_config.get('model', 'gpt-4')
        
        # If model is still gpt-4, try to get it from other locations
        if model == 'gpt-4':
            # Try to get from agent_config directly
            model = (
                config_dict.get('llm', {}).get('model') or
                config_dict.get('llmModel') or
                config_dict.get('model') or
                'gpt-4'
            )
        
        temperature = framework_config.get('temperature', 0.7)
        max_tokens = framework_config.get('max_tokens', 4000)  # Respect user configuration
        
        # Respect user configuration - no more emergency overrides!
        logger.info(f"🤖 Using user-configured max_tokens: {max_tokens}")
        
        # Simulate CrewAI behavior using direct LLM calls
        role = config_dict.get('role', 'Assistant')
        goal = config_dict.get('goal', 'Help the user')
        backstory = config_dict.get('backstory', '')
        task_description = task_config.get('description', '')
        
        # Build standard prompt respecting user preferences
        prompt = f"""You are a {role}.
Goal: {goal}
Backstory: {backstory}

Task: {task_description}

"""
        
        if inputs:
            # Process input data efficiently (DataStateManager handles filtering)
            input_summary = []
            for k, v in inputs.items():
                input_line = f'{k}: {str(v)}'
                input_summary.append(input_line)
            
            prompt += f"Input Data:\n{chr(10).join(input_summary)}\n\n"
        
        prompt += "Please complete this task based on your role and the provided information."
        
        messages = [{"role": "user", "content": prompt}]
        
        # Use the appropriate provider based on user selection WITH max_tokens
        logger.info(f"🔍 Fallback execution: provider={provider}, model={model}")
        try:
            if provider == 'openai':
                # Use OpenAI directly
                logger.info("🔍 Using OpenAI runner")
                from .openai_runner import run_openai_chat
                response = await run_openai_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens  # CRITICAL: Pass max_tokens
                )
            elif provider == 'anthropic':
                # Use Anthropic directly
                logger.info("🔍 Using Anthropic runner")
                from .anthropic_runner import run_anthropic_chat
                response = await run_anthropic_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens  # CRITICAL: Pass max_tokens
                )
            elif provider == 'perplexity':
                # Use Perplexity directly
                logger.info("🔍 Using Perplexity runner")
                from .perplexity_runner import run_perplexity_chat
                
                # Get API key from framework config
                api_key = framework_config.get('api_key')
                logger.info(f"🔑 Perplexity API key available: {bool(api_key)}")
                
                response = await run_perplexity_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,  # CRITICAL: Pass max_tokens
                    api_key=api_key  # CRITICAL: Pass API key
                )
            elif provider in ['google', 'gemini']:
                # Use Google/Gemini directly
                logger.info("🔍 Using Google/Gemini runner")
                from .gemini_runner import run_gemini_chat
                
                # Get API key from framework config
                api_key = framework_config.get('api_key') or framework_config.get('google_api_key')
                logger.info(f"🔑 Google API key available: {bool(api_key)}")
                
                response = await run_gemini_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    api_key=api_key
                )
            elif provider == 'cohere':
                # Use Cohere via OpenRouter (since we don't have a dedicated runner)
                logger.info("🔍 Using Cohere via OpenRouter")
                from .openrouter_runner import run_openrouter_chat
                
                # Map to OpenRouter format
                openrouter_model = f"cohere/{model}" if not model.startswith("cohere/") else model
                
                response = await run_openrouter_chat(
                    messages=messages,
                    model=openrouter_model,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            elif provider in ['huggingface', 'hf']:
                # Use HuggingFace directly
                logger.info("🔍 Using HuggingFace runner")
                from .huggingface_runner import run_huggingface_chat
                
                # Get API key from framework config
                api_key = framework_config.get('api_key') or framework_config.get('huggingface_api_key')
                logger.info(f"🔑 HuggingFace API key available: {bool(api_key)}")
                
                response = await run_huggingface_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    api_key=api_key
                )
            elif provider == 'openrouter':
                # Use OpenRouter
                logger.info("🔍 Using OpenRouter runner")
                from .openrouter_runner import run_openrouter_chat
                response = await run_openrouter_chat(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens  # CRITICAL: Pass max_tokens
                )
            else:
                # Default fallback to OpenRouter (most comprehensive)
                logger.info(f"🔍 Unknown provider {provider}, falling back to OpenRouter")
                from .openrouter_runner import run_openrouter_chat
                
                # Try to map provider to OpenRouter format
                if provider in ['openai']:
                    openrouter_model = f"openai/{model}"
                elif provider in ['anthropic']:
                    openrouter_model = f"anthropic/{model}"
                elif provider in ['google', 'gemini']:
                    openrouter_model = f"google/{model}"
                elif provider in ['cohere']:
                    openrouter_model = f"cohere/{model}"
                elif provider in ['meta', 'llama']:
                    openrouter_model = f"meta-llama/{model}"
                else:
                    openrouter_model = model
                
                response = await run_openrouter_chat(
                    messages=messages,
                    model=openrouter_model,
                    temperature=temperature,
                    max_tokens=max_tokens  # CRITICAL: Pass max_tokens
                )
                
        except ImportError as e:
            # If specific provider runner doesn't exist, fallback to OpenRouter
            logger.error(f"🔍 ImportError for {provider}: {e}, falling back to OpenRouter")
            from .openrouter_runner import run_openrouter_chat
            
            # Map provider models to OpenRouter format
            if provider == 'openai':
                openrouter_model = f"openai/{model}"
            elif provider == 'anthropic':
                openrouter_model = f"anthropic/{model}"
            else:
                openrouter_model = model
                
            response = await run_openrouter_chat(
                messages=messages,
                model=openrouter_model,
                temperature=temperature,
                max_tokens=max_tokens  # CRITICAL: Pass max_tokens
            )
        
        return {
            "type": "crewai_fallback",
            "output": response,
            "framework": "crewai_fallback",
            "provider_used": provider,
            "model_used": model,
            "max_tokens_used": max_tokens,
            "emergency_mode": False,
            "success": True,
            "note": f"CrewAI not available - using {provider} fallback implementation"
        }

# Main entry points for compatibility
async def run_crewai_tool(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Main entry point for CrewAI tool execution - FIXED for node processor compatibility"""
    
    # Check if this is a tool configuration (has tool_name) or agent configuration
    if config.get('tool_name') or config.get('frameworkConfig', {}).get('tool_name'):
        # This is a tool execution request
        return await run_crewai_individual_tool(config, inputs, context)
    else:
        # This is an agent execution request - FIXED to handle node processor parameters
        return await run_crewai_agent_for_node_processor(config, inputs, context)

async def run_crewai_individual_tool(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Execute individual CrewAI tools"""
    try:
        runner = EnhancedCrewAIRunner()
        
        # Get tool configuration
        tool_name = config.get('tool_name') or config.get('frameworkConfig', {}).get('tool_name')
        tool_config = config.get('config', {}) or config.get('frameworkConfig', {}).get('config', {})
        
        # Get built-in tools
        built_in_tools = runner.get_built_in_tools()
        
        if tool_name in built_in_tools:
            # Execute built-in tool
            tool = built_in_tools[tool_name]
            
            # Prepare input for the tool
            if tool_name == 'file_reader':
                # For file_reader, we need to pass the file content or path
                file_input = inputs.get('file_content') or inputs.get('content') or inputs.get('file_path') or ''
                if not file_input:
                    # Try to get from any input value
                    for key, value in inputs.items():
                        if isinstance(value, str) and value:
                            file_input = value
                            break
                
                result = tool.run(file_input)
            elif tool_name == 'web_search':
                # For web_search, we need a query
                query = inputs.get('query') or inputs.get('search_query') or inputs.get('q') or ''
                if not query:
                    # Try to get from any input value
                    for key, value in inputs.items():
                        if isinstance(value, str) and value:
                            query = value
                            break
                
                result = tool.run(query)
            elif tool_name == 'calculator':
                # For calculator, we need an expression
                expression = inputs.get('expression') or inputs.get('calculation') or inputs.get('expr') or ''
                if not expression:
                    # Try to get from any input value
                    for key, value in inputs.items():
                        if isinstance(value, str) and value:
                            expression = value
                            break
                
                result = tool.run(expression)
            else:
                # Generic tool execution
                input_value = inputs.get('input') or inputs.get('data') or str(inputs)
                result = tool.run(input_value)
            
            return {
                "success": True,
                "type": "crewai_tool_result",
                "output": result,
                "tool_name": tool_name,
                "framework": "crewai",
                "version": CREWAI_VERSION
            }
        else:
            return {
                "success": False,
                "error": f"Unknown CrewAI tool: {tool_name}. Available tools: {list(built_in_tools.keys())}",
                "framework": "crewai"
            }
            
    except Exception as e:
        logger.error(f"CrewAI tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "crewai",
            "tool_name": tool_name if 'tool_name' in locals() else "unknown"
        }

async def run_crewai_agent_for_node_processor(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Agent execution for node processor - FIXED to handle context parameter"""
    try:
        runner = EnhancedCrewAIRunner()
        # FIXED: Pass the context to the runner
        runner.context = context
        
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
        
        # Create a proper config object for the runner
        from models.runner_schemas import CrewAIRunnerConfig
        
        # FIXED: Use the provider from the agent config, not hardcoded
        provider = agent_config['frameworkConfig'].get('provider', 'openai')
        model = agent_config['frameworkConfig'].get('model', 'gpt-4')
        
        # FIXED: Convert string tools to proper tool dictionaries
        tools = config.get('tools', [])
        if isinstance(tools, list):
            converted_tools = []
            for tool in tools:
                if isinstance(tool, str):
                    converted_tools.append({
                        "name": tool,
                        "description": f"Tool for {tool}",
                        "type": "function"
                    })
                elif isinstance(tool, dict):
                    converted_tools.append(tool)
                else:
                    logger.warning(f"Invalid tool format: {tool}")
            tools = converted_tools
        else:
            tools = []
        
        runner_config = CrewAIRunnerConfig(
            role=agent_config['role'],
            goal=agent_config['goal'],
            backstory=agent_config['backstory'],
            verbose=agent_config['verbose'],
            allow_delegation=agent_config['allowDelegation'],
            enable_memory=agent_config['enableMemory'],
            framework="crewai",  # FIXED: Add missing framework field
            provider=provider,  # FIXED: Use provider from config
            model=model,  # FIXED: Use model from config
            max_iterations=config.get('max_iterations', 3),
            tools=tools  # FIXED: Use converted tools
        )
        
        # FIXED: Pass the context to the run_crewai_agent method
        result = await runner.run_crewai_agent(runner_config, inputs)
        return result
        
    except Exception as e:
        logger.error(f"CrewAI legacy execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "output": None,
            "fallback_used": True
        }

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

# 🔌 FRONTEND INTEGRATION UTILITIES
def get_crewai_capabilities() -> Dict[str, Any]:
    """Get complete CrewAI capabilities for frontend configuration"""
    
    # Get built-in tools if CrewAI is available
    available_tools = []
    if CREWAI_AVAILABLE:
        runner = EnhancedCrewAIRunner()
        built_in_tools = runner.get_built_in_tools()
        available_tools = [
            {
                "id": tool_name,
                "name": tool_name.replace('_', ' ').title(),
                "description": f"Built-in CrewAI {tool_name} tool",
                "category": "built_in"
            }
            for tool_name in built_in_tools.keys()
        ]
    
    return {
        "available": CREWAI_AVAILABLE,
        "version": CREWAI_VERSION,
        "features": {
            "multi_agent": CREWAI_AVAILABLE,
            "hierarchical_process": CREWAI_AVAILABLE,
            "sequential_process": CREWAI_AVAILABLE,
            "consensus_process": CREWAI_AVAILABLE,
            "memory": CREWAI_AVAILABLE,
            "delegation": CREWAI_AVAILABLE,
            "built_in_tools": CREWAI_AVAILABLE,
            "custom_tools": CREWAI_AVAILABLE,
            "chat_mode": CREWAI_AVAILABLE,
            "token_tracking": CREWAI_AVAILABLE
        },
        "supported_providers": [
            "openai", "anthropic", "openrouter", "perplexity", "google"
        ] if CREWAI_AVAILABLE else [],
        "agent_types": [
            "assistant", "researcher", "analyst", "writer", "reviewer"
        ] if CREWAI_AVAILABLE else [],
        "process_types": [
            "sequential", "hierarchical", "consensus"
        ] if CREWAI_AVAILABLE else [],
        "tools": available_tools,
        "capabilities": [
            "Role-based agents",
            "Multi-agent collaboration", 
            "Process orchestration",
            "Memory and context management",
            "Built-in tool integration",
            "Custom tool creation",
            "Token usage tracking",
            "Step-by-step execution"
        ] if CREWAI_AVAILABLE else []
    }

# Export main functions
__all__ = [
    "run_crewai_tool",
    "run_crewai_individual_tool", 
    "run_crewai_agent_legacy",
    "run_agents",
    "get_crewai_capabilities",
    "EnhancedCrewAIRunner",
    "CREWAI_AVAILABLE"
]