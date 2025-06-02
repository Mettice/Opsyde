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

class EnhancedLangChainRunner:
    """Enhanced LangChain runner with modern LCEL and advanced features"""
    
    def __init__(self):
        self.chains_cache = {}
        self.vectorstores_cache = {}
        self.tools_cache = {}
    
    def get_llm(self, config: Dict[str, Any]):
        """Get LLM based on configuration"""
        provider = config.get('provider', 'openai')
        model = config.get('model', 'gpt-4')
        temperature = config.get('temperature', 0.7)
        max_tokens = config.get('max_tokens', 4000)
        api_key = config.get('api_key', '')
        
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
            # Perplexity uses OpenAI-compatible API
            return ChatOpenAI(
                model=model,
                base_url='https://api.perplexity.ai',
                api_key=api_key,
                **llm_config
            )
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
                logger.warning("Google Generative AI not available, falling back to OpenAI")
                return ChatOpenAI(model='gpt-3.5-turbo', **llm_config)
        else:
            # Fallback to OpenAI
            logger.warning(f"Unknown provider {provider}, falling back to OpenAI")
            return ChatOpenAI(model='gpt-4', temperature=temperature)
    
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
        """Create calculator tool"""
        def calculator(expression: str) -> str:
            """Calculate mathematical expressions safely"""
            try:
                # Simple safe evaluation
                import ast
                import operator
                
                # Supported operations
                ops = {
                    ast.Add: operator.add, ast.Sub: operator.sub,
                    ast.Mult: operator.mul, ast.Div: operator.truediv,
                    ast.Pow: operator.pow, ast.USub: operator.neg
                }
                
                def eval_expr(expr):
                    return eval_node(ast.parse(expr, mode='eval').body)
                
                def eval_node(node):
                    if isinstance(node, ast.Constant):
                        return node.value
                    elif isinstance(node, ast.BinOp):
                        return ops[type(node.op)](eval_node(node.left), eval_node(node.right))
                    elif isinstance(node, ast.UnaryOp):
                        return ops[type(node.op)](eval_node(node.operand))
                    else:
                        raise TypeError(node)
                
                result = eval_expr(expression)
                return f"Result: {result}"
            except Exception as e:
                return f"Error: {str(e)}"
        
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
        """Get or create vector store based on source type"""
        cache_key = f"{source_type}_{hash(str(config))}"
        
        if cache_key in self.vectorstores_cache:
            return self.vectorstores_cache[cache_key]
        
        if source_type == 'text':
            # Use provided text
            text = config.get('text', 'No text provided')
            docs = [{"page_content": text, "metadata": {}}]
        elif source_type == 'url':
            # Load from URL
            loader = WebBaseLoader(config.get('url', ''))
            docs = loader.load()
        else:
            # Default text
            docs = [{"page_content": "No documents available", "metadata": {}}]
        
        # Split documents
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.get('chunkSize', 1000),
            chunk_overlap=config.get('chunkOverlap', 200)
        )
        splits = text_splitter.split_documents(docs)
        
        # Create vector store
        vectorstore = FAISS.from_documents(splits, embeddings)
        
        # Cache it
        self.vectorstores_cache[cache_key] = vectorstore
        
        return vectorstore
    
    def _format_docs(self, docs):
        """Format documents for context"""
        return "\n\n".join([doc.page_content for doc in docs])

# Main execution function
async def run_langchain_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced LangChain tool execution with better provider support"""
    try:
        framework_config = config.get("frameworkConfig", {})
        provider = framework_config.get("provider", "openai").lower()
        model = framework_config.get("model", "gpt-3.5-turbo")
        api_key = framework_config.get("api_key") or config.get("api_key") or config.get("perplexity_api_key")
        
        logger.info(f"🔧 LangChain tool: provider={provider}, model={model}, api_key={'[FOUND]' if api_key else '[MISSING]'}")
        
        # Use the LLM tools for better provider support
        if provider == "perplexity":
            from tools.llm_tools import run_llm_tool
            return await run_llm_tool(config, inputs)
        
        # For other providers, use LangChain if available
        if not LANGCHAIN_AVAILABLE:
            return {
                "success": False,
                "error": "LangChain not available",
                "framework": "langchain"
            }
        
        runner = EnhancedLangChainRunner()
        chain_type = framework_config.get("chainType", "simple")
        
        if chain_type == "simple":
            return await runner.run_simple_chain(framework_config, inputs)
        elif chain_type == "conversation":
            return await runner.run_conversation_chain(framework_config, inputs)
        elif chain_type == "rag":
            return await runner.run_rag_chain(framework_config, inputs)
        else:
            return {
                "success": False,
                "error": f"Unsupported chain type: {chain_type}",
                "framework": "langchain"
            }
            
    except Exception as e:
        logger.error(f"LangChain tool execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "framework": "langchain"
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