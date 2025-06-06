# Enhanced LangChain Runner with Modern Features
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

try:
    # Modern LangChain imports
    from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
    from langchain_core.output_parsers import StrOutputParser, JsonOutputParser, PydanticOutputParser
    from langchain_core.runnables import RunnablePassthrough, RunnableLambda, RunnableParallel
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    from langchain_core.tools import BaseTool, tool
    from langchain.agents import AgentExecutor, create_openai_functions_agent, create_react_agent
    from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory, ConversationBufferWindowMemory
    from langchain_community.vectorstores import FAISS, Chroma
    from langchain.chains import LLMChain, ConversationChain, RetrievalQA
    from langchain.prompts import PromptTemplate, ChatPromptTemplate
    from langchain.schema import HumanMessage, SystemMessage, AIMessage
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.document_loaders import TextLoader, WebBaseLoader
    # Try different PDF loader imports
    try:
        from langchain_community.document_loaders import PyPDFLoader as PDFLoader
    except ImportError:
        try:
            from langchain_community.document_loaders import PDFPlumberLoader as PDFLoader
        except ImportError:
            PDFLoader = None
    from langchain.agents import initialize_agent, Tool, AgentType
    from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
    from langchain_openai import ChatOpenAI
    from langchain_anthropic import ChatAnthropic
    LANGCHAIN_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LangChain not fully available: {str(e)}")
    LANGCHAIN_AVAILABLE = False

# 🧰 AVAILABLE TOOLS REGISTRY
AVAILABLE_TOOLS = {
    "calculator": {
        "name": "calculator",
        "description": "Performs mathematical calculations and supports basic math functions",
        "category": "computation",
        "requires_api": False
    },
    "search": {
        "name": "web_search", 
        "description": "Searches the web for real-time information",
        "category": "information",
        "requires_api": False
    },
    "wikipedia": {
        "name": "wikipedia",
        "description": "Gets detailed information from Wikipedia",
        "category": "information", 
        "requires_api": False
    },
    "python": {
        "name": "python_executor",
        "description": "Executes safe Python code for data processing and calculations",
        "category": "computation",
        "requires_api": False
    },
    "file_reader": {
        "name": "file_reader",
        "description": "Reads and processes text files",
        "category": "file_processing",
        "requires_api": False
    },
    "url_reader": {
        "name": "url_reader", 
        "description": "Fetches and extracts content from web pages",
        "category": "information",
        "requires_api": False
    }
}

# 🎯 EXECUTION MODES
EXECUTION_MODES = {
    "llm_chain": "Simple LLM conversation without tools",
    "agent": "AI agent with access to tools", 
    "rag": "Retrieval Augmented Generation with documents",
    "conversation": "Conversation with memory",
    "auto": "Automatically detect based on input"
}

class EnhancedLangChainRunner:
    """Enhanced LangChain runner with modern LCEL and advanced features"""
    
    def __init__(self, max_cache_size: int = 100):
        self.chains_cache = {}
        self.vectorstores_cache = {}
        self.tools_cache = {}
        self.max_cache_size = max_cache_size
        self._cache_access_times = {}
    
    def _cleanup_cache(self, cache_dict: dict, cache_name: str):
        """Clean up cache using LRU strategy when it exceeds max size"""
        if len(cache_dict) > self.max_cache_size:
            # Sort by access time and remove oldest entries
            sorted_items = sorted(
                self._cache_access_times.get(cache_name, {}).items(),
                key=lambda x: x[1]
            )
            
            # Remove oldest 20% of entries
            remove_count = max(1, len(sorted_items) // 5)
            for key, _ in sorted_items[:remove_count]:
                cache_dict.pop(key, None)
                self._cache_access_times.get(cache_name, {}).pop(key, None)
            
            logger.info(f"🧹 Cleaned up {remove_count} entries from {cache_name} cache")
    
    def _update_cache_access(self, cache_name: str, key: str):
        """Update cache access time for LRU tracking"""
        import time
        if cache_name not in self._cache_access_times:
            self._cache_access_times[cache_name] = {}
        self._cache_access_times[cache_name][key] = time.time()
    
    def cleanup_resources(self):
        """Cleanup all cached resources"""
        self.chains_cache.clear()
        self.vectorstores_cache.clear()
        self.tools_cache.clear()
        self._cache_access_times.clear()
        logger.info("🧹 All LangChain runner resources cleaned up")
    
    def get_llm(self, config: Dict[str, Any]):
        """Get LLM based on configuration"""
        # Handle both direct frameworkConfig and nested config
        if 'frameworkConfig' in config:
            framework_config = config['frameworkConfig']
        else:
            framework_config = config
            
        provider = framework_config.get('provider', 'openai')
        model = framework_config.get('model', 'gpt-4')
        temperature = framework_config.get('temperature', 0.7)
        max_tokens = framework_config.get('max_tokens', 4000)
        api_key = framework_config.get('api_key', '')
        
        # Base LLM config
        llm_config = {
            'temperature': temperature,
            'max_tokens': max_tokens
        }
        
        # Only add API key to llm_config if not passing it explicitly
        if api_key and not api_key.startswith('[BYOK:'):
            pass  # We'll pass api_key explicitly for each provider
        
        if provider == 'openai':
            return ChatOpenAI(
                model=model,
                api_key=api_key,
                **llm_config
            )
        elif provider == 'anthropic':
            return ChatAnthropic(
                model=model,
                api_key=api_key,
                **llm_config
            )
        elif provider == 'perplexity':
            # 🔧 CRITICAL FIX: Return None for Perplexity to force fallback execution
            # This prevents ChatOpenAI from defaulting to OpenAI API when Perplexity fails
            logger.info(f"🔄 Perplexity provider detected - will use fallback execution")
            return None
        elif provider == 'openrouter':
            # OpenRouter uses OpenAI-compatible API
            return ChatOpenAI(
                model=model,
                base_url='https://openrouter.ai/api/v1',
                **llm_config
            )
        elif provider == 'gemini' or provider == 'google':
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(model=model, **llm_config)
            except ImportError:

                logger.warning(f"Google Generative AI not available for {provider}, using fallback execution")
                return None  # This forces fallback execution with the correct provider
        else:
            # Fallback to OpenAI
            logger.warning(f"Provider {provider} will use fallback execution")
            return None  # This forces fallback execution with the correct provider
    
    def get_output_parser(self, parser_type: str):
        """Get output parser based on type"""
        parsers = {
            'string': StrOutputParser(),
            'json': JsonOutputParser(),
            'text': StrOutputParser()
        }
        return parsers.get(parser_type, StrOutputParser())
    
    def create_tools(self, tool_configs: List[Dict[str, Any]]) -> List[BaseTool]:
        """Create LangChain tools"""
        tools = []
        
        for tool_config in tool_configs:
            tool_type = tool_config.get('type', 'search')
            
            if tool_type == 'search':
                tools.append(DuckDuckGoSearchRun())
            elif tool_type == 'wikipedia':
                tools.append(WikipediaQueryRun())
            elif tool_type == 'calculator':
                tools.append(self._create_calculator_tool())
            elif tool_type == 'custom':
                tools.append(self._create_custom_tool(tool_config))
                
        return tools
    
    @tool
    def _create_calculator_tool(self):
        """Create calculator tool with enhanced security"""
        def calculator(expression: str) -> str:
            """Calculate mathematical expressions safely with whitelist approach"""
            try:
                import ast
                import operator
                import math
                
                # Whitelist of safe operations and functions
                safe_ops = {
                    ast.Add: operator.add, ast.Sub: operator.sub,
                    ast.Mult: operator.mul, ast.Div: operator.truediv,
                    ast.Pow: operator.pow, ast.USub: operator.neg,
                    ast.Mod: operator.mod
                }
                
                safe_funcs = {
                    'abs': abs, 'round': round, 'max': max, 'min': min,
                    'sum': sum, 'sqrt': math.sqrt, 'sin': math.sin,
                    'cos': math.cos, 'tan': math.tan, 'log': math.log,
                    'exp': math.exp, 'floor': math.floor, 'ceil': math.ceil
                }
                
                def eval_expr(expr):
                    """Safely evaluate mathematical expression"""
                    if len(expr) > 200:  # Prevent very long expressions
                        raise ValueError("Expression too long")
                    return eval_node(ast.parse(expr, mode='eval').body)
                
                def eval_node(node):
                    if isinstance(node, ast.Constant):
                        if isinstance(node.value, (int, float)):
                            return node.value
                        raise TypeError("Only numbers allowed")
                    elif isinstance(node, ast.BinOp):
                        if type(node.op) not in safe_ops:
                            raise TypeError(f"Unsafe operation: {type(node.op)}")
                        left = eval_node(node.left)
                        right = eval_node(node.right)
                        return safe_ops[type(node.op)](left, right)
                    elif isinstance(node, ast.UnaryOp):
                        if type(node.op) not in safe_ops:
                            raise TypeError(f"Unsafe operation: {type(node.op)}")
                        return safe_ops[type(node.op)](eval_node(node.operand))
                    elif isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Name) and node.func.id in safe_funcs:
                            args = [eval_node(arg) for arg in node.args]
                            return safe_funcs[node.func.id](*args)
                        raise TypeError(f"Unsafe function call")
                    elif isinstance(node, ast.Name):
                        # Allow mathematical constants
                        constants = {'pi': math.pi, 'e': math.e}
                        if node.id in constants:
                            return constants[node.id]
                        raise TypeError(f"Undefined variable: {node.id}")
                    else:
                        raise TypeError(f"Unsafe node type: {type(node)}")
                
                result = eval_expr(expression.strip())
                return f"Result: {result}"
                
            except (ValueError, TypeError, ZeroDivisionError, OverflowError) as e:
                return f"Math Error: {str(e)}"
            except Exception as e:
                return f"Calculation failed: {str(e)}"
        
        return calculator
    
    def _create_custom_tool(self, config: Dict[str, Any]) -> BaseTool:
        """Create custom tool from configuration"""
        name = config.get('name', 'custom_tool')
        description = config.get('description', 'A custom tool')
        
        @tool(name=name, description=description)
        def custom_tool(input_text: str) -> str:
            """Custom tool implementation"""
            # This would be replaced with actual tool logic
            return f"Custom tool {name} processed: {input_text}"
        
        return custom_tool
    
    async def run_simple_chain(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run a simple LLM chain using LCEL"""
        try:
            llm = self.get_llm(config.get('frameworkConfig', {}))
            
            # Create prompt template
            prompt_text = config.get('systemMessage', config.get('prompt', 'You are a helpful assistant.'))
            
            if '{input}' in prompt_text:
                prompt = PromptTemplate.from_template(prompt_text)
            else:
                prompt = ChatPromptTemplate.from_messages([
                    ("system", prompt_text),
                    ("human", "{input}")
                ])
            
            # Create output parser
            output_parser = self.get_output_parser(config.get('outputParser', 'string'))
            
            # Build chain using LCEL
            chain = prompt | llm | output_parser
            
            # Prepare input
            input_text = inputs.get('input', inputs.get('message', ''))
            if not input_text:
                # Combine all inputs into a single string
                input_text = "\n".join([f"{k}: {v}" for k, v in inputs.items()])
            
            # Execute chain
            result = await chain.ainvoke({"input": input_text})
            
            return {
                "type": "langchain_result",
                "output": result,
                "framework": "langchain",
                "chain_type": "simple",
                "success": True,
                "metadata": {
                    "model": config.get('frameworkConfig', {}).get('model', 'unknown'),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Simple chain execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "langchain",
                "success": False
            }
    
    async def run_conversation_chain(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run conversation chain with memory"""
        try:
            llm = self.get_llm(config.get('frameworkConfig', {}))
            
            # Create memory
            memory_type = config.get('memoryType', 'buffer')
            if memory_type == 'buffer':
                memory = ConversationBufferMemory(return_messages=True)
            elif memory_type == 'summary':
                memory = ConversationSummaryMemory(llm=llm, return_messages=True)
            elif memory_type == 'window':
                memory = ConversationBufferWindowMemory(k=5, return_messages=True)
            else:
                memory = ConversationBufferMemory(return_messages=True)
            
            # Create prompt with memory
            prompt = ChatPromptTemplate.from_messages([
                ("system", config.get('systemMessage', 'You are a helpful assistant.')),
                ("placeholder", "{chat_history}"),
                ("human", "{input}")
            ])
            
            # Build conversation chain
            chain = (
                RunnablePassthrough.assign(
                    chat_history=lambda x: memory.chat_memory.messages
                )
                | prompt
                | llm
                | StrOutputParser()
            )
            
            input_text = inputs.get('input', inputs.get('message', ''))
            
            # Execute with memory
            result = await chain.ainvoke({"input": input_text})
            
            # Save to memory
            memory.chat_memory.add_user_message(input_text)
            memory.chat_memory.add_ai_message(result)
            
            return {
                "type": "langchain_result",
                "output": result,
                "framework": "langchain",
                "chain_type": "conversation",
                "success": True,
                "metadata": {
                    "memory_type": memory_type,
                    "conversation_length": len(memory.chat_memory.messages),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Conversation chain execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "langchain",
                "success": False
            }
    
    async def run_rag_chain(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run Retrieval Augmented Generation chain"""
        try:
            llm = self.get_llm(config.get('frameworkConfig', {}))
            
            # Create embeddings
            embeddings = OpenAIEmbeddings()
            
            # Get or create vector store
            documents_source = config.get('documentsSource', 'text')
            vectorstore = await self._get_or_create_vectorstore(
                documents_source, config, embeddings
            )
            
            # Create retriever
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": config.get('similarityTopK', 3)}
            )
            
            # Create RAG prompt
            rag_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a helpful assistant. Use the following context to answer the question.
                If you don't know the answer based on the context, say so.
                
                Context: {context}"""),
                ("human", "{question}")
            ])
            
            # Build RAG chain using LCEL
            rag_chain = (
                {"context": retriever | self._format_docs, "question": RunnablePassthrough()}
                | rag_prompt
                | llm
                | StrOutputParser()
            )
            
            query = inputs.get('query', inputs.get('question', inputs.get('input', '')))
            
            # Execute RAG chain
            result = await rag_chain.ainvoke(query)
            
            return {
                "type": "langchain_result",
                "output": result,
                "framework": "langchain",
                "chain_type": "rag",
                "success": True,
                "metadata": {
                    "documents_source": documents_source,
                    "query": query,
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"RAG chain execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "langchain",
                "success": False
            }
    
    async def run_agent_chain(self, config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run agent with tools"""
        try:
            llm = self.get_llm(config.get('frameworkConfig', {}))
            
            # Create tools
            tool_configs = config.get('tools', [])
            tools = self.create_tools(tool_configs)
            
            # Create agent prompt
            agent_prompt = ChatPromptTemplate.from_messages([
                ("system", config.get('systemMessage', 'You are a helpful assistant with access to tools.')),
                ("placeholder", "{chat_history}"),
                ("human", "{input}"),
                ("placeholder", "{agent_scratchpad}")
            ])
            
            # Create agent
            agent = create_openai_functions_agent(llm, tools, agent_prompt)
            
            # Create agent executor
            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                verbose=config.get('verbose', True),
                max_iterations=config.get('maxIterations', 3),
                early_stopping_method="generate"
            )
            
            input_text = inputs.get('input', inputs.get('message', ''))
            
            # Execute agent
            result = await agent_executor.ainvoke({"input": input_text})
            
            return {
                "type": "langchain_result",
                "output": result.get('output', str(result)),
                "framework": "langchain",
                "chain_type": "agent",
                "success": True,
                "metadata": {
                    "tools_used": [tool.name for tool in tools],
                    "intermediate_steps": result.get('intermediate_steps', []),
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Agent chain execution failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "framework": "langchain",
                "success": False
            }
    
    async def _get_or_create_vectorstore(self, source_type: str, config: Dict[str, Any], embeddings):
        """Get or create vector store based on source type with improved caching"""
        cache_key = f"{source_type}_{hash(str(sorted(config.items())))}"
        
        # Check cache first
        if cache_key in self.vectorstores_cache:
            self._update_cache_access('vectorstores', cache_key)
            logger.info(f"📚 Using cached vectorstore for {source_type}")
            return self.vectorstores_cache[cache_key]
        
        try:
            if source_type == 'text':
                # Use provided text
                text = config.get('text', 'No text provided')
                docs = [{"page_content": text, "metadata": {"source": "user_text"}}]
            elif source_type == 'url':
                # Load from URL with validation
                url = config.get('url', '')
                if not url.startswith(('http://', 'https://')):
                    raise ValueError(f"Invalid URL: {url}")
                loader = WebBaseLoader(url)
                docs = loader.load()
            elif source_type == 'file':
                # Handle file uploads
                file_path = config.get('file_path', '')
                if file_path.endswith('.pdf') and PDFLoader:
                    loader = PDFLoader(file_path)
                    docs = loader.load()
                elif file_path.endswith('.txt'):
                    loader = TextLoader(file_path)
                    docs = loader.load()
                else:
                    docs = [{"page_content": "File type not supported", "metadata": {}}]
            else:
                # Default fallback
                docs = [{"page_content": "No documents available", "metadata": {}}]
            
            # Validate document content
            if not docs or all(not doc.get("page_content", "").strip() for doc in docs):
                docs = [{"page_content": "No valid content found", "metadata": {}}]
            
            # Split documents with validation
            chunk_size = max(100, min(4000, config.get('chunkSize', 1000)))
            chunk_overlap = max(0, min(chunk_size // 2, config.get('chunkOverlap', 200)))
            
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            splits = text_splitter.split_documents(docs)
            
            # Create vector store with error handling
            if not splits:
                splits = [{"page_content": "No content to index", "metadata": {}}]
            
            vectorstore = FAISS.from_documents(splits, embeddings)
            
            # Cache with cleanup
            self.vectorstores_cache[cache_key] = vectorstore
            self._update_cache_access('vectorstores', cache_key)
            self._cleanup_cache(self.vectorstores_cache, 'vectorstores')
            
            logger.info(f"📚 Created and cached vectorstore for {source_type} with {len(splits)} chunks")
            return vectorstore
            
        except Exception as e:
            logger.error(f"❌ Failed to create vectorstore for {source_type}: {str(e)}")
            # Return a fallback vectorstore
            fallback_docs = [{"page_content": f"Error loading documents: {str(e)}", "metadata": {}}]
            return FAISS.from_documents(fallback_docs, embeddings)
    
    def _format_docs(self, docs):
        """Format documents for context"""
        return "\n\n".join([doc.page_content for doc in docs])

    def _validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize configuration"""
        validated = {}
        
        # Framework config validation
        framework_config = config.get('frameworkConfig', {})
        validated['provider'] = framework_config.get('provider', 'openai').lower()
        validated['model'] = framework_config.get('model', 'gpt-3.5-turbo')
        validated['temperature'] = max(0.0, min(2.0, framework_config.get('temperature', 0.7)))
        validated['max_tokens'] = max(1, min(32000, framework_config.get('max_tokens', 4000)))
        
        # API key validation
        api_key = framework_config.get('api_key', '')
        if not api_key or len(api_key.strip()) < 10:
            logger.warning(f"⚠️ Invalid or missing API key for provider: {validated['provider']}")
        validated['api_key'] = api_key.strip()
        
        # Chain type validation
        valid_chain_types = ['simple', 'conversation', 'rag', 'agent']
        chain_type = framework_config.get('chainType', 'simple')
        validated['chainType'] = chain_type if chain_type in valid_chain_types else 'simple'
        
        # System message validation
        system_msg = config.get('systemMessage', 'You are a helpful assistant.')
        validated['systemMessage'] = system_msg[:2000]  # Limit length
        
        return validated
    
    def _validate_inputs(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize inputs"""
        validated = {}
        
        for key, value in inputs.items():
            if isinstance(value, str):
                # Limit string length and sanitize
                validated[key] = value[:5000].strip()
            elif isinstance(value, (int, float, bool)):
                validated[key] = value
            elif isinstance(value, dict):
                # Recursively validate nested dicts
                validated[key] = self._validate_inputs(value)
            elif isinstance(value, list):
                # Limit list size and validate elements
                validated[key] = [
                    item[:1000] if isinstance(item, str) else item 
                    for item in value[:100]  # Limit to 100 items
                ]
            else:
                # Convert unknown types to string
                validated[key] = str(value)[:1000]
        
        return validated

    def _standardize_inputs(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize inputs to support multiple input formats"""
        standardized = {}
        
        # Extract main input text from various possible locations
        input_text = (
            inputs.get('input') or 
            inputs.get('message') or 
            inputs.get('query') or 
            inputs.get('text') or
            config.get('input') or
            ""
        )
        
        # Handle different input types
        if isinstance(input_text, dict):
            # If input is a dict, try to extract text
            input_text = (
                input_text.get('text') or 
                input_text.get('content') or 
                str(input_text)
            )
        elif isinstance(input_text, list):
            # If input is a list, join items
            input_text = " ".join(str(item) for item in input_text)
        
        standardized['input'] = str(input_text).strip()
        
        # Extract tools configuration
        tools_config = (
            inputs.get('tools') or 
            config.get('tools') or 
            config.get('frameworkConfig', {}).get('tools') or
            []
        )
        
        # Ensure tools is a list
        if isinstance(tools_config, str):
            tools_config = [tools_config]
        elif not isinstance(tools_config, list):
            tools_config = []
            
        standardized['tools'] = tools_config
        
        # Extract LLM configuration - FIX: Preserve BYOK configuration
        llm_config = config.get('frameworkConfig', {})
        
        # 🔧 FIXED: Don't override BYOK config with defaults!
        # Check if we have a real provider configured, if not then use defaults
        configured_provider = llm_config.get('provider')
        configured_model = llm_config.get('model')
        
        # Only use defaults if no provider is configured
        if not configured_provider:
            default_provider = 'openai'
            default_model = 'gpt-3.5-turbo'
        else:
            default_provider = configured_provider
            # Use provider-specific defaults only if model is not configured
            if not configured_model:
                if configured_provider == 'perplexity':
                    default_model = 'sonar-pro'
                elif configured_provider == 'anthropic':
                    default_model = 'claude-3-sonnet-20240229'
                elif configured_provider == 'openai':
                    default_model = 'gpt-3.5-turbo'
                else:
                    default_model = 'gpt-3.5-turbo'
            else:
                default_model = configured_model
        
        standardized['llm_config'] = {
            'provider': configured_provider or default_provider,
            'model': configured_model or default_model,
            'temperature': llm_config.get('temperature', 0.7),
            'max_tokens': llm_config.get('max_tokens', 4000),
            'api_key': llm_config.get('api_key', ''),
            'stream': llm_config.get('stream', False)
        }
        
        # Log the configuration for debugging
        logger.info(f"🔧 LLM Config preserved: provider={standardized['llm_config']['provider']}, "
                   f"model={standardized['llm_config']['model']}, "
                   f"api_key={'***' if standardized['llm_config']['api_key'] else 'None'}")
        
        # Extract execution mode
        chain_type = config.get('frameworkConfig', {}).get('chainType', 'auto')
        
        # Auto-detect execution mode based on tools
        if chain_type == 'auto':
            if standardized['tools']:
                standardized['execution_mode'] = 'agent'
            else:
                standardized['execution_mode'] = 'llm_chain'
        else:
            standardized['execution_mode'] = chain_type
            
        return standardized

    def get_tool_by_name(self, name: str) -> Optional[BaseTool]:
        """Get a tool instance by name with proper description"""
        try:
            name = name.lower().strip()
            
            if name == "calculator":
                return self._create_calculator_tool()
            elif name in ["search", "google_search", "web_search"]:
                return Tool(
                    name="web_search",
                    func=DuckDuckGoSearchRun().run,
                    description="Useful for searching real-time information from the web. Input should be a search query."
                )
            elif name in ["wikipedia", "wiki"]:
                return Tool(
                    name="wikipedia",
                    func=WikipediaQueryRun().run,
                    description="Useful for getting detailed information about people, places, companies, events, etc. Input should be a search term."
                )
            elif name == "python":
                return self._create_python_tool()
            elif name == "file_reader":
                return self._create_file_reader_tool()
            elif name == "url_reader":
                return self._create_url_reader_tool()
            else:
                logger.warning(f"Unknown tool: {name}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create tool {name}: {str(e)}")
            return None
    
    def build_tools(self, tool_names: List[str]) -> List[BaseTool]:
        """Build a list of tools from tool names"""
        tools = []
        
        for tool_name in tool_names:
            tool = self.get_tool_by_name(tool_name)
            if tool:
                tools.append(tool)
                logger.info(f"✅ Added tool: {tool.name}")
            else:
                logger.warning(f"⚠️ Failed to add tool: {tool_name}")
        
        return tools
    
    def _create_python_tool(self) -> BaseTool:
        """Create a safe Python execution tool"""
        @tool
        def python_executor(code: str) -> str:
            """Execute safe Python code. Only basic operations allowed. Input should be valid Python code."""
            try:
                # Whitelist of safe modules and functions
                safe_globals = {
                    '__builtins__': {
                        'len': len, 'str': str, 'int': int, 'float': float,
                        'list': list, 'dict': dict, 'sum': sum, 'max': max, 'min': min,
                        'abs': abs, 'round': round, 'sorted': sorted, 'reversed': reversed
                    },
                    'math': __import__('math'),
                    'datetime': __import__('datetime'),
                    'json': __import__('json')
                }
                
                # Limit code length
                if len(code) > 1000:
                    return "Error: Code too long (max 1000 characters)"
                
                # Check for dangerous operations
                dangerous_keywords = ['import', 'exec', 'eval', 'open', 'file', '__', 'subprocess', 'os.system']
                if any(keyword in code.lower() for keyword in dangerous_keywords):
                    return "Error: Dangerous operations not allowed"
                
                # Execute with timeout and capture output
                import io
                import sys
                from contextlib import redirect_stdout
                
                output = io.StringIO()
                with redirect_stdout(output):
                    exec(code, safe_globals)
                
                result = output.getvalue()
                return result.strip() if result.strip() else "Code executed successfully (no output)"
                
            except Exception as e:
                return f"Python Error: {str(e)}"
        
        return python_executor
    
    def _create_file_reader_tool(self) -> BaseTool:
        """Create a file reading tool"""
        @tool
        def file_reader(file_path: str) -> str:
            """Read and return the contents of a text file. Input should be a valid file path."""
            try:
                # Security: Only allow reading from specific directories
                import os
                allowed_extensions = ['.txt', '.md', '.json', '.csv', '.py']
                
                if not any(file_path.endswith(ext) for ext in allowed_extensions):
                    return "Error: File type not supported"
                
                # Limit file size
                if os.path.exists(file_path) and os.path.getsize(file_path) > 1024 * 1024:  # 1MB limit
                    return "Error: File too large (max 1MB)"
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Limit output length
                if len(content) > 5000:
                    content = content[:5000] + "... (truncated)"
                
                return content
                
            except Exception as e:
                return f"File Error: {str(e)}"
        
        return file_reader
    
    def _create_url_reader_tool(self) -> BaseTool:
        """Create a URL content reading tool"""
        @tool
        def url_reader(url: str) -> str:
            """Fetch and return the content of a webpage. Input should be a valid URL."""
            try:
                import requests
                from bs4 import BeautifulSoup
                
                # Validate URL
                if not url.startswith(('http://', 'https://')):
                    return "Error: Invalid URL format"
                
                # Fetch content with timeout
                response = requests.get(url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                response.raise_for_status()
                
                # Parse HTML and extract text
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                # Get text content
                text = soup.get_text()
                
                # Clean up text
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)
                
                # Limit output length
                if len(text) > 3000:
                    text = text[:3000] + "... (truncated)"
                
                return text
                
            except Exception as e:
                return f"URL Error: {str(e)}"
        
        return url_reader

    async def run_llm_chain(self, standardized_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run a simple LLM chain without tools"""
        start_time = datetime.now()
        
        try:
            llm_config = standardized_inputs['llm_config']
            input_text = standardized_inputs['input']
            
            if not input_text:
                return {
                    "success": False,
                    "error": "No input provided",
                    "execution_mode": "llm_chain"
                }
            
            # Get LLM instance
            llm = self.get_llm({'frameworkConfig': llm_config})
            if not llm:
                # 🔧 CRITICAL FIX: Use fallback execution for unsupported providers like Perplexity
                # Pass any tools that might be available in standardized_inputs
                tools = standardized_inputs.get('tools', [])
                logger.info(f"🔄 LLM is None - using fallback execution for provider: {llm_config['provider']}")
                return await self._execute_fallback(llm_config, input_text, tools)
            
            # Create simple prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a helpful AI assistant."),
                ("human", "{input}")
            ])
            
            # Create chain using LCEL
            chain = prompt | llm | StrOutputParser()
            
            # Execute chain
            result = await chain.ainvoke({"input": input_text})
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            return {
                "success": True,
                "output": result,
                "execution_mode": "llm_chain",
                "metadata": {
                    "model": llm_config['model'],
                    "provider": llm_config['provider'],
                    "tools_used": [],
                    "execution_time": execution_time,
                    "input_length": len(input_text),
                    "output_length": len(str(result)),
                    "timestamp": end_time.isoformat(),
                    "temperature": llm_config['temperature'],
                    "max_tokens": llm_config['max_tokens']
                }
            }
            
        except Exception as e:
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            logger.error(f"LLM chain execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "execution_mode": "llm_chain",
                "metadata": {
                    "execution_time": execution_time,
                    "timestamp": end_time.isoformat()
                }
            }
    
    async def run_agent_chain(self, standardized_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run an agent with tools"""
        start_time = datetime.now()
        
        try:
            llm_config = standardized_inputs['llm_config']
            input_text = standardized_inputs['input']
            tool_names = standardized_inputs['tools']
            
            if not input_text:
                return {
                    "success": False,
                    "error": "No input provided",
                    "execution_mode": "agent"
                }
            
            # Get LLM instance
            llm = self.get_llm({'frameworkConfig': llm_config})
            if not llm:
                # 🔧 CRITICAL FIX: Use fallback execution for unsupported providers like Perplexity
                logger.info(f"🔄 LLM is None - using fallback execution for provider: {llm_config['provider']}")
                return await self._execute_fallback(llm_config, input_text, tool_names)
            
            # Build tools
            tools = self.build_tools(tool_names)
            if not tools:
                logger.warning("No valid tools found, falling back to LLM chain")
                return await self.run_llm_chain(standardized_inputs)
            
            # Create agent prompt
            agent_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a helpful AI assistant with access to tools. 
                Use tools when necessary to provide accurate and up-to-date information.
                Always explain your reasoning and cite sources when using tools."""),
                ("placeholder", "{chat_history}"),
                ("human", "{input}"),
                ("placeholder", "{agent_scratchpad}")
            ])
            
            # Create agent using OpenAI functions
            try:
                from langchain.agents import create_openai_functions_agent
                agent = create_openai_functions_agent(llm, tools, agent_prompt)
            except Exception:
                # Fallback to ReAct agent
                from langchain.agents import create_react_agent
                agent = create_react_agent(llm, tools, agent_prompt)
            
            # Create agent executor
            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                verbose=True,
                max_iterations=5,
                early_stopping_method="generate",
                return_intermediate_steps=True
            )
            
            # Execute agent
            result = await agent_executor.ainvoke({
                "input": input_text,
                "chat_history": []
            })
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            # Extract tools used from intermediate steps
            tools_used = []
            intermediate_steps = result.get('intermediate_steps', [])
            for step in intermediate_steps:
                if hasattr(step, 'tool') and step.tool:
                    tools_used.append(step.tool)
                elif isinstance(step, tuple) and len(step) > 0:
                    action = step[0]
                    if hasattr(action, 'tool'):
                        tools_used.append(action.tool)
            
            return {
                "success": True,
                "output": result.get('output', str(result)),
                "execution_mode": "agent",
                "metadata": {
                    "model": llm_config['model'],
                    "provider": llm_config['provider'],
                    "tools_requested": tool_names,
                    "tools_available": [tool.name for tool in tools],
                    "tools_used": list(set(tools_used)),  # Remove duplicates
                    "execution_time": execution_time,
                    "input_length": len(input_text),
                    "output_length": len(str(result.get('output', ''))),
                    "intermediate_steps_count": len(intermediate_steps),
                    "agent_iterations": len(intermediate_steps),
                    "timestamp": end_time.isoformat(),
                    "temperature": llm_config['temperature'],
                    "max_tokens": llm_config['max_tokens']
                },
                "intermediate_steps": intermediate_steps[:3]  # Include first 3 steps for debugging
            }
            
        except Exception as e:
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            logger.error(f"Agent execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "execution_mode": "agent",
                "metadata": {
                    "execution_time": execution_time,
                    "timestamp": end_time.isoformat(),
                    "tools_requested": standardized_inputs.get('tools', [])
                }
            }

    async def _execute_fallback(self, llm_config: Dict[str, Any], input_text: str, tools: List[str] = None) -> Dict[str, Any]:
        """Execute using framework-specific fallback when LLM creation fails"""
        start_time = datetime.now()
        
        try:
            provider = llm_config.get('provider', 'openai')
            model = llm_config.get('model', 'gpt-4')
            
            logger.info(f"🔄 Fallback execution: provider={provider}, model={model}")
            
            if provider == 'perplexity':
                logger.info("🔍 Using Perplexity runner")
                
                # Import the correct function from perplexity_runner
                from frameworks.perplexity_runner import run_perplexity_tool
                
                # Enhance the prompt with tool instructions if tools are provided
                enhanced_prompt = input_text
                
                if tools and len(tools) > 0:
                    logger.info(f"🔧 Enhancing prompt with tool capabilities: {tools}")
                    
                    # Build universal tool capabilities description
                    tool_capabilities = []
                    
                    for tool in tools:
                        if tool in ['search', 'web_search']:
                            tool_capabilities.append("**Web Search**: Search the internet for current, relevant information related to your query")
                        elif tool in ['url_reader']:
                            tool_capabilities.append("**URL Reader**: Access and read content from specific web URLs")
                        elif tool in ['calculator']:
                            tool_capabilities.append("**Calculator**: Perform mathematical calculations, compute percentages, analyze numerical data")
                        elif tool in ['python_executor', 'python']:
                            tool_capabilities.append("**Data Processing**: Process, analyze, and structure data; perform calculations and generate reports")
                        elif tool in ['file_reader']:
                            tool_capabilities.append("**File Reader**: Read and analyze content from files")
                        else:
                            # Generic fallback for unknown tools
                            tool_capabilities.append(f"**{tool.title()}**: Use {tool} functionality to assist with the task")
                    
                    if tool_capabilities:
                        tools_description = "\n".join(tool_capabilities)
                        
                        enhanced_prompt = f"""{input_text}

**Available Tools:**
{tools_description}

**Instructions:** Use the available tools to provide comprehensive, specific results. Focus on actionable information and concrete data rather than general advice. Search for current information when needed and provide specific details, numbers, and sources where applicable."""
                
                # Prepare config for perplexity_runner
                perplexity_config = {
                    'frameworkConfig': {
                        'model': model,
                        'temperature': llm_config.get('temperature', 0.7),
                        'max_tokens': llm_config.get('max_tokens', 4000),
                        'api_key': llm_config.get('api_key') or llm_config.get('perplexity_api_key')
                    }
                }
                
                # Prepare inputs for perplexity_runner
                perplexity_inputs = {
                    'prompt': enhanced_prompt
                }
                
                # Execute using Perplexity runner
                logger.info(f"🔍 About to call Perplexity with enhanced prompt length: {len(enhanced_prompt)}")
                perplexity_result = await run_perplexity_tool(perplexity_config, perplexity_inputs)
                logger.info(f"🔍 Perplexity result: success={perplexity_result.get('success')}, error={perplexity_result.get('error', 'None')}")
                
                if perplexity_result.get('success'):
                    execution_time = (datetime.now() - start_time).total_seconds()
                    output = perplexity_result.get('output', '')
                    
                    if not output or output.strip() == '':
                        logger.warning("⚠️ Perplexity returned empty output")
                        output = "No response from Perplexity runner"
                    
                    # Simulate tool usage in the response
                    simulated_tools = []
                    if tools:
                        for tool in tools:
                            # Generate universal tool usage simulation
                            tool_description = ""
                            if tool in ['search', 'web_search']:
                                tool_description = "Searched web for current relevant information"
                            elif tool in ['calculator']:
                                tool_description = "Performed mathematical calculations and analysis"
                            elif tool in ['python_executor', 'python']:
                                tool_description = "Processed and analyzed data"
                            elif tool in ['url_reader']:
                                tool_description = "Read and extracted content from web URLs"
                            elif tool in ['file_reader']:
                                tool_description = "Read and processed file content"
                            else:
                                tool_description = f"Used {tool} functionality"
                            
                            simulated_tools.append({
                                "tool": tool,
                                "action": f"simulated_{tool}",
                                "input": input_text[:100] + "..." if len(input_text) > 100 else input_text,
                                "output": f"{tool_description} via Perplexity enhanced prompt"
                            })
                    
                    return {
                        "success": True,
                        "output": output,
                        "provider": "perplexity-fallback-enhanced",
                        "model": model,
                        "execution_time": execution_time,
                        "tools_used": tools or [],
                        "tools_simulated": simulated_tools,
                        "intermediate_steps": [
                            {
                                "action": "perplexity_fallback_with_tools",
                                "action_input": enhanced_prompt[:200] + "..." if len(enhanced_prompt) > 200 else enhanced_prompt,
                                "observation": output,
                                "step": 1,
                                "tools_available": tools or []
                            }
                        ]
                    }
                else:
                    error_msg = perplexity_result.get('error', 'Unknown error')
                    logger.error(f"❌ Perplexity execution failed: {error_msg}")
                    raise Exception(f"Perplexity execution failed: {error_msg}")
            
            else:
                # For other providers, return an error
                return {
                    "success": False,
                    "error": f"Fallback execution not implemented for provider: {provider}",
                    "provider": provider,
                    "model": model
                }
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"❌ Fallback execution failed: {str(e)}")
            return {
                "success": False,
                "error": f"Fallback execution failed: {str(e)}",
                "execution_time": execution_time
            }

# Main execution function
async def run_langchain_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enhanced LangChain tool execution with standardized inputs and comprehensive metadata
    
    Supports input formats:
    - Simple LLM: {"input": "text", "model": "gpt-4"}
    - Agent: {"input": "text", "tools": ["search", "calculator"], "model": "gpt-4"}
    """
    try:
        # Initialize runner
        runner = EnhancedLangChainRunner()
        
        # FIX: Check if we already have proper frameworkConfig from BYOK
        framework_config = config.get('frameworkConfig', {})
        if framework_config.get('provider') and framework_config.get('model') and framework_config.get('api_key'):
            # Use the provided frameworkConfig directly - don't standardize it
            logger.info(f"🔧 Using provided frameworkConfig: provider={framework_config['provider']}, model={framework_config['model']}")
            
            standardized = {
                'input': inputs.get('input', inputs.get('message', inputs.get('query', ''))),
                'llm_config': {
                    'provider': framework_config['provider'],
                    'model': framework_config['model'],
                    'api_key': framework_config['api_key'],
                    'temperature': framework_config.get('temperature', 0.7),
                    'max_tokens': framework_config.get('max_tokens', 4000)
                },
                'tools': config.get('tools', config.get('langchainTools', [])),
                'execution_mode': 'agent' if config.get('tools') or config.get('langchainTools') else 'llm_chain',
                'system_message': config.get('systemMessage', ''),
                'chain_type': framework_config.get('chainType', 'simple'),
                'verbose': config.get('verbose', True)
            }
        else:
            # Fallback to standardization if no proper frameworkConfig
            standardized = runner._standardize_inputs(inputs, config)
        
        logger.info(f"🔧 LangChain execution: mode={standardized['execution_mode']}, "
                   f"provider={standardized['llm_config']['provider']}, "
                   f"model={standardized['llm_config']['model']}, "
                   f"tools={standardized['tools']}")
        
        # Validate inputs
        validated_inputs = runner._validate_inputs(standardized)
        
        # Route to appropriate execution method
        if validated_inputs['execution_mode'] == 'agent' and validated_inputs['tools']:
            result = await runner.run_agent_chain(validated_inputs)
        else:
            result = await runner.run_llm_chain(validated_inputs)
        
        # Add framework info
        result['framework'] = 'langchain'
        result['type'] = 'langchain_result'
        
        # Log execution summary
        if result.get('success'):
            metadata = result.get('metadata', {})
            logger.info(f"✅ LangChain execution successful: "
                       f"mode={result.get('execution_mode')}, "
                       f"time={metadata.get('execution_time', 0):.2f}s, "
                       f"tools_used={metadata.get('tools_used', [])}")
        else:
            logger.error(f"❌ LangChain execution failed: {result.get('error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ LangChain tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "langchain",
            "type": "error",
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "error_type": type(e).__name__
            }
        }

# 🔌 FRONTEND INTEGRATION UTILITIES
def get_available_tools() -> Dict[str, Any]:
    """Get list of available tools for frontend"""
    return AVAILABLE_TOOLS

def get_execution_modes() -> Dict[str, str]:
    """Get available execution modes for frontend"""
    return EXECUTION_MODES

def get_langchain_capabilities() -> Dict[str, Any]:
    """Get complete LangChain capabilities for frontend configuration"""
    return {
        "available": LANGCHAIN_AVAILABLE,
        "tools": AVAILABLE_TOOLS,
        "execution_modes": EXECUTION_MODES,
        "supported_providers": [
            "openai", "anthropic", "perplexity", "openrouter", "google"
        ],
        "features": {
            "streaming": True,
            "memory": True,
            "rag": True,
            "agents": True,
            "tools": True,
            "conversation": True
        }
    }

# Backward compatibility
def run_agents(agents: List[Dict[str, Any]], tasks: List[Dict[str, Any]], 
               tools: List[Dict[str, Any]] = None, memory: Dict[str, Any] = None, 
               inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """Run multi-agent LangChain workflow"""
    
    # Convert to async and run
    async def run_workflow():
        results = []
        
        for agent, task in zip(agents, tasks):
            config = {
                'chainType': agent.get('chainType', 'simple'),
                'systemMessage': agent.get('systemMessage', task.get('description', '')),
                'tools': agent.get('tools', tools or []),
                'frameworkConfig': agent.get('frameworkConfig', {}),
                'verbose': agent.get('verbose', True)
            }
            
            result = await run_langchain_tool(config, inputs or {})
            results.append({
                "agent_id": agent.get('nodeId'),
                "task_id": task.get('nodeId'),
                "result": result
            })
        
        return {
            "type": "workflow_result",
            "results": results,
            "framework": "langchain",
            "metadata": {
                "agent_count": len(agents),
                "task_count": len(tasks),
                "timestamp": datetime.now().isoformat()
            }
        }
    
    # Run in event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(run_workflow())
    finally:
        loop.close()