# Enhanced LlamaIndex Runner
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from llama_index.core import VectorStoreIndex, Document, Settings, ServiceContext
    from llama_index.core.query_engine import RetrieverQueryEngine
    from llama_index.core.retrievers import VectorIndexRetriever
    from llama_index.embeddings.openai import OpenAIEmbedding
    from llama_index.llms.openai import OpenAI
    LLAMAINDEX_AVAILABLE = True
except ImportError:
    logger.warning("LlamaIndex not installed")
    LLAMAINDEX_AVAILABLE = False

async def run_llamaindex_tool(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced LlamaIndex runner with full RAG capabilities"""
    
    if not LLAMAINDEX_AVAILABLE:
        return await _llamaindex_fallback(config, inputs)
    
    try:
        # Extract configuration
        index_type = config.get("indexType", "vector")
        documents_source = config.get("documentsSource", "text")
        query_mode = config.get("queryMode", "default")
        similarity_top_k = config.get("similarityTopK", 3)
        chunk_size = config.get("chunkSize", 512)
        chunk_overlap = config.get("chunkOverlap", 20)
        
        # Get LLM configuration
        llm_config = config.get("llm", {})
        
        # Setup LLM
        llm = OpenAI(
            model=llm_config.get("model", "gpt-4"),
            temperature=llm_config.get("temperature", 0.7),
            max_tokens=llm_config.get("max_tokens", 1000)
        )
        
        # Setup embeddings
        embed_model = OpenAIEmbedding()
        
        # Configure settings
        Settings.llm = llm
        Settings.embed_model = embed_model
        Settings.chunk_size = chunk_size
        Settings.chunk_overlap = chunk_overlap
        
        # Create documents based on source
        if documents_source == "text":
            text = inputs.get("text", inputs.get("input", "Sample document"))
            documents = [Document(text=text)]
        elif documents_source == "upload":
            # Handle uploaded files
            file_content = inputs.get("file_content", "")
            documents = [Document(text=file_content)]
        else:
            # Default document
            documents = [Document(text="No documents provided")]
        
        # Create index based on type
        if index_type == "vector":
            index = VectorStoreIndex.from_documents(documents)
        else:
            # Fallback to vector index
            index = VectorStoreIndex.from_documents(documents)
        
        # Create query engine
        if query_mode == "embedding":
            retriever = VectorIndexRetriever(
                index=index,
                similarity_top_k=similarity_top_k
            )
            query_engine = RetrieverQueryEngine(retriever=retriever)
        else:
            query_engine = index.as_query_engine(
                similarity_top_k=similarity_top_k
            )
        
        # Execute query
        query = inputs.get("query", inputs.get("question", "What is this about?"))
        response = query_engine.query(query)
        
        return {
            "type": "llamaindex_result",
            "output": str(response),
            "framework": "llamaindex",
            "success": True,
            "metadata": {
                "index_type": index_type,
                "query_mode": query_mode,
                "documents_count": len(documents),
                "similarity_top_k": similarity_top_k,
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"LlamaIndex execution failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "llamaindex",
            "success": False
        }

async def _llamaindex_fallback(config: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback when LlamaIndex is not available"""
    from .openrouter_runner import run_openrouter_chat
    
    query = inputs.get("query", inputs.get("question", "What is this about?"))
    context = inputs.get("text", inputs.get("input", "No context provided"))
    
    llm_config = config.get("llm", {})
    
    prompt = f"""Based on the following context, answer the question:

Context: {context}

Question: {query}

Answer:"""
    
    messages = [{"role": "user", "content": prompt}]
    
    response = await run_openrouter_chat(
        messages=messages,
        model=llm_config.get("model", "gpt-4"),
        temperature=llm_config.get("temperature", 0.7)
    )
    
    return {
        "type": "llamaindex_fallback",
        "output": response,
        "framework": "llamaindex_fallback",
        "success": True,
        "note": "LlamaIndex not available - using fallback"
    }
