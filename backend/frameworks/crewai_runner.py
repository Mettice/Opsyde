import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import asyncio
import json

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
                logger.warning(f"Google Generative AI not available for {provider}, will use fallback execution")
                return None  # This forces fallback execution with the correct provider
        else:
            logger.warning(f"Provider {provider} will use fallback execution")
            return None  # This forces fallback execution with the correct provider
    
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
    
    async def run_crewai_agent(self, config: CrewAIRunnerConfig, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run CrewAI agent with schema validation"""
        if not CREWAI_AVAILABLE:
            return await self._fallback_execution(config, inputs)
        
        try:
            # Reset tracking
            self.intermediate_steps = []
            self.token_usage = {}
            
            # Create LLM with token tracking
            llm = self.get_llm_for_framework(config.framework_config)
            
            # 🔧 CRITICAL FIX: If LLM is None (e.g., for Perplexity), use fallback execution immediately
            if llm is None:
                logger.info(f"🔄 LLM is None - using fallback execution for provider: {config.provider}")
                return await self._fallback_execution(config, inputs)
            
            # Create tools (including built-in ones)
            crewai_tools = []
            if config.tools:
                crewai_tools = self.create_crewai_tools(config.tools)
            
            # Create Agent with enhanced config
            agent = Agent(
                role=config.role,
                goal=config.goal,
                backstory=config.backstory,
                verbose=True,
                allow_delegation=config.allow_delegation,
                tools=crewai_tools,
                llm=llm,
                max_iter=config.max_iterations,
                memory=config.enable_memory,
                step_callback=self._step_callback
            )
            
            # Create Task with enhanced output handling
            task_description = inputs.get('task', '')
            if inputs.get('context'):
                # Inject context into task description
                context_lines = '\n'.join([f'{k}: {v}' for k, v in inputs['context'].items()])
                task_description = f"{task_description}\n\nContext:\n{context_lines}"
            
            task = Task(
                description=task_description,
                expected_output="Detailed response",
                agent=agent,
                tools=crewai_tools
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
            result = crew.kickoff(inputs=inputs or {})
            
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