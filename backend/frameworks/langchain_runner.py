import logging
from typing import Dict, Any, List, Optional
from langchain.chains import LLMChain, ConversationChain, RetrievalQA
from langchain.agents import AgentExecutor, Tool, initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.prompts import PromptTemplate
from langchain.chat_models import ChatOpenAI, ChatAnthropic
from langchain.embeddings import OpenAIEmbeddings, HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_llm_for_provider(provider: str, config: Dict[str, Any]):
    """Get LLM instance based on provider configuration"""
    temperature = float(config.get("temperature", 0.7))
    model = config.get("model", "gpt-4")
    
    if provider == "openai":
        return ChatOpenAI(
            model=model,
            temperature=temperature
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model,
            temperature=temperature
        )
    elif provider == "huggingface":
        from langchain.llms import HuggingFaceHub
        return HuggingFaceHub(
            repo_id=model,
            task="text-generation"
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

def get_memory_instance(memory_type: str) -> Optional[Any]:
    """Get memory instance based on type"""
    if memory_type == "buffer":
        return ConversationBufferMemory()
    elif memory_type == "summary":
        return ConversationSummaryMemory(llm=ChatOpenAI())
    elif memory_type == "none":
        return None
    else:
        raise ValueError(f"Unsupported memory type: {memory_type}")

def get_tools_for_agent(tool_names: List[str]) -> List[Tool]:
    """Get list of tools based on names"""
    available_tools = {
        "search": Tool(
            name="search",
            func=lambda x: "Search result for: " + x,
            description="Useful for searching information"
        ),
        "calculator": Tool(
            name="calculator",
            func=lambda x: eval(x),
            description="Useful for doing math calculations"
        )
    }
    
    return [available_tools[name] for name in tool_names if name in available_tools]

async def run_langchain_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run a LangChain tool with the given configuration and inputs
    
    Args:
        config: Tool configuration including chain type, memory type, etc.
        inputs: Input data for the chain/agent
        
    Returns:
        Dictionary containing the result and metadata
    """
    try:
        # Extract configuration
        chain_type = config.get("chain_type", "llm")
        llm_provider = config.get("llm_provider", "openai")
        memory_type = config.get("memory_type", "none")
        prompt_template = config.get("prompt_template", "")
        
        # Initialize components
        llm = get_llm_for_provider(llm_provider, config)
        memory = get_memory_instance(memory_type)
        
        # Handle different chain types
        if chain_type == "llm":
            # Simple LLM chain
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=list(inputs.keys())
            )
            chain = LLMChain(llm=llm, prompt=prompt, memory=memory)
            result = await chain.arun(**inputs)
            
        elif chain_type == "conversation":
            # Conversation chain
            chain = ConversationChain(
                llm=llm,
                memory=memory or ConversationBufferMemory()
            )
            result = await chain.arun(inputs.get("input", ""))
            
        elif chain_type == "retrieval_qa":
            # Retrieval QA chain
            embeddings = OpenAIEmbeddings()
            docs = inputs.get("documents", [])
            vectorstore = FAISS.from_texts(docs, embeddings)
            chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=vectorstore.as_retriever()
            )
            result = await chain.arun(inputs.get("query", ""))
            
        elif chain_type == "agent":
            # Agent with tools
            tools = get_tools_for_agent(config.get("tools", []))
            agent = initialize_agent(
                tools,
                llm,
                agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                memory=memory
            )
            result = await agent.arun(inputs.get("input", ""))
            
        else:
            raise ValueError(f"Unsupported chain type: {chain_type}")

        return {
            "type": "langchain_result",
            "output": result,
            "metadata": {
                "chain_type": chain_type,
                "llm_provider": llm_provider,
                "memory_type": memory_type,
                "timestamp": datetime.now().isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error in LangChain tool: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "chain_type": config.get("chain_type"),
                "llm_provider": config.get("llm_provider"),
                "timestamp": datetime.now().isoformat()
            }
        }

def run_agents(agents: List[Dict[str, Any]], tasks: List[Dict[str, Any]], 
               tools: List[Dict[str, Any]] = None, memory: Dict[str, Any] = None, 
               inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Run a workflow with multiple agents and tasks using LangChain
    
    Args:
        agents: List of agent configurations
        tasks: List of task configurations
        tools: Optional list of tool configurations
        memory: Optional memory configuration
        inputs: Optional input data
        
    Returns:
        Dictionary containing the workflow results
    """
    try:
        if inputs is None:
            inputs = {}
            
        results = []
        
        # Process each agent-task pair
        for agent, task in zip(agents, tasks):
            # Configure agent
            agent_config = {
                "llm_provider": agent.get("llmProvider", "openai"),
                "model": agent.get("llmModel", "gpt-4"),
                "temperature": float(agent.get("temperature", 0.7)),
                "chain_type": "agent",
                "tools": agent.get("tools", []),
                "memory_type": "buffer" if agent.get("enableMemory") else "none"
            }
            
            # Add task-specific inputs
            task_inputs = {
                "input": task.get("description", ""),
                **inputs
            }
            
            # Run the agent
            result = run_langchain_tool(agent_config, task_inputs)
            results.append({
                "agent_id": agent.get("nodeId"),
                "task_id": task.get("nodeId"),
                "result": result
            })
        
        return {
            "type": "workflow_result",
            "results": results,
            "metadata": {
                "agent_count": len(agents),
                "task_count": len(tasks),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error in LangChain workflow: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat()
            }
        } 