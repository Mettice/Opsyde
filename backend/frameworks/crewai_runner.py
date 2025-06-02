import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import asyncio
import json

logger = logging.getLogger(__name__)

try:
    from crewai import Agent, Task, Crew, Process
    from crewai.tools import BaseTool
    # New 0.1.21 imports
    from crewai.tools import WebSearchTool, CalculatorTool, FileReaderTool
    from langchain.tools import Tool
    CREWAI_AVAILABLE = True
    CREWAI_VERSION = "0.1.21"
except ImportError:
    logger.warning("CrewAI not installed - using fallback implementation")
    CREWAI_AVAILABLE = False
    CREWAI_VERSION = "fallback"
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
        """Get CrewAI 0.1.21 built-in tools"""
        if not CREWAI_AVAILABLE:
            return {}
        
        try:
            return {
                'web_search': WebSearchTool(),
                'calculator': CalculatorTool(),
                'file_reader': FileReaderTool(),
            }
        except Exception as e:
            logger.warning(f"Could not load built-in tools: {e}")
            return {}
    
    def get_llm_for_framework(self, framework_config: Dict[str, Any]):
        """Get appropriate LLM based on configuration with token tracking"""
        provider = framework_config.get('provider', 'openai')
        model = framework_config.get('model', 'gpt-4')
        api_key = framework_config.get('api_key', '')
        
        # Enhanced LLM config for 0.1.21
        llm_config = {
            'temperature': framework_config.get('temperature', 0.7),
            'max_tokens': framework_config.get('max_tokens', 4000),
            'callbacks': self._get_token_callbacks()  # For token tracking
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
                logger.warning("Google Generative AI not available, falling back to OpenAI")
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(model='gpt-3.5-turbo', **llm_config)
        else:
            logger.warning(f"Unknown provider {provider}, falling back to OpenAI")
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model='gpt-3.5-turbo', **llm_config)
    
    def _get_token_callbacks(self):
        """Get callbacks for token usage tracking"""
        from langchain.callbacks import get_openai_callback
        
        def token_callback(tokens_used, cost):
            self.token_usage = {
                'tokens': tokens_used,
                'cost': cost,
                'timestamp': datetime.now().isoformat()
            }
        
        return [token_callback]
    
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
    
    async def run_crewai_agent(self, agent_config: Dict[str, Any], 
                             task_config: Dict[str, Any],
                             tools: List[Dict[str, Any]] = None,
                             inputs: Dict[str, Any] = None,
                             return_intermediate_steps: bool = True,
                             chat_mode: bool = False) -> Dict[str, Any]:
        """Run CrewAI agent with 0.1.21 features support"""
        
        if not CREWAI_AVAILABLE:
            return await self._fallback_execution(agent_config, task_config, inputs)
        
        try:
            # Reset tracking
            self.intermediate_steps = []
            self.token_usage = {}
            
            # Create LLM with token tracking
            llm = self.get_llm_for_framework(agent_config.get('frameworkConfig', {}))
            
            # Create tools (including built-in ones)
            crewai_tools = []
            if tools:
                crewai_tools = self.create_crewai_tools(tools)
            
            # Create Agent with enhanced config
            agent = Agent(
                role=agent_config.get('role', 'Assistant'),
                goal=agent_config.get('goal', 'Help the user'),
                backstory=agent_config.get('backstory', ''),
                verbose=agent_config.get('verbose', True),
                allow_delegation=agent_config.get('allowDelegation', False),
                tools=crewai_tools,
                llm=llm,
                max_iter=agent_config.get('max_iterations', 3),
                memory=agent_config.get('enableMemory', False),
                # New 0.1.21 features
                step_callback=self._step_callback if return_intermediate_steps else None
            )
            
            # Create Task with enhanced output handling
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
            
            # Create Crew with enhanced configuration
            crew = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True,
                memory=agent_config.get('enableMemory', False)
            )
            
            # Execute crew with new 0.1.21 methods
            if chat_mode:
                # Use new chat mode
                result = crew.chat(
                    message=task_description,
                    return_intermediate_steps=return_intermediate_steps
                )
            else:
                # Use enhanced run method
                result = crew.run(
                    inputs=inputs or {},
                    return_intermediate_steps=return_intermediate_steps
                )
            
            # Enhanced result with 0.1.21 features
            return {
                "type": "crewai_result",
                "output": str(result),
                "framework": "crewai",
                "version": CREWAI_VERSION,
                "agent_role": agent_config.get('role'),
                "task_description": task_config.get('description'),
                "success": True,
                "metadata": {
                    "tools_used": len(crewai_tools),
                    "memory_enabled": agent_config.get('enableMemory', False),
                    "chat_mode": chat_mode,
                    "timestamp": datetime.now().isoformat()
                },
                "token_usage": self.token_usage,
                "intermediate_steps": self.intermediate_steps if return_intermediate_steps else [],
                "agent_logs": self._get_agent_logs()
            }
            
        except Exception as e:
            logger.error(f"CrewAI execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "crewai",
                "version": CREWAI_VERSION,
                "success": False
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
    
    async def _fallback_execution(self, agent_config: Dict[str, Any], 
                                task_config: Dict[str, Any],
                                inputs: Dict[str, Any] = None) -> Dict[str, Any]:
        """Fallback when CrewAI is not available - respects user's LLM provider choice with emergency token limiting"""
        
        # DEBUG: Log the entire agent_config to see what we're getting
        logger.info(f"🔍 DEBUG agent_config: {agent_config}")
        
        # Get framework config to determine provider
        framework_config = agent_config.get('frameworkConfig', {})
        logger.info(f"🔍 DEBUG framework_config: {framework_config}")
        
        # FIXED: Extract provider and model from frameworkConfig first, then fallback
        provider = framework_config.get('provider', 'openai')
        model = framework_config.get('model', 'gpt-4')
        
        # If model is still gpt-4, try to get it from other locations
        if model == 'gpt-4':
            # Try to get from agent_config directly
            model = (
                agent_config.get('llm', {}).get('model') or
                agent_config.get('llmModel') or
                agent_config.get('model') or
                'gpt-4'
            )
        
        temperature = framework_config.get('temperature', 0.7)
        max_tokens = framework_config.get('max_tokens', 4000)  # Respect user configuration
        
        # Respect user configuration - no more emergency overrides!
        logger.info(f"🤖 Using user-configured max_tokens: {max_tokens}")
        
        # Simulate CrewAI behavior using direct LLM calls
        role = agent_config.get('role', 'Assistant')
        goal = agent_config.get('goal', 'Help the user')
        backstory = agent_config.get('backstory', '')
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
async def run_crewai_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Main entry point for CrewAI tool execution"""
    
    # Check if this is a tool configuration (has tool_name) or agent configuration
    if config.get('tool_name') or config.get('frameworkConfig', {}).get('tool_name'):
        # This is a tool execution request
        return await run_crewai_individual_tool(config, inputs)
    else:
        # This is an agent execution request (legacy behavior)
        return await run_crewai_agent_legacy(config, inputs)

async def run_crewai_individual_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
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

async def run_crewai_agent_legacy(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Legacy agent execution for backward compatibility"""
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