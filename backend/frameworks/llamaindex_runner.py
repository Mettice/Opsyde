# Enhanced LlamaIndex Runner with Advanced Features
import logging
import asyncio
import aiohttp
import os
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from models.schemas import NodeSchema, SchemaType, SchemaField

logger = logging.getLogger(__name__)

try:
    from llama_index.core import VectorStoreIndex, Document, Settings
    from llama_index.core.query_engine import RetrieverQueryEngine
    from llama_index.core.retrievers import VectorIndexRetriever
    from llama_index.embeddings.openai import OpenAIEmbedding
    from llama_index.llms.openai import OpenAI
    from llama_index.core.node_parser import SimpleNodeParser
    from llama_index.core.storage.storage_context import StorageContext
    LLAMAINDEX_CORE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LlamaIndex core not available: {str(e)}")
    LLAMAINDEX_CORE_AVAILABLE = False

# Optional imports - these are OK to fail
try:
    from llama_index.vector_stores.faiss import FaissVectorStore
    FAISS_AVAILABLE = True
except ImportError:
    logger.info("FAISS vector store not available - install with: pip install llama-index-vector-stores-faiss")
    FAISS_AVAILABLE = False

try:
    from llama_index.readers.web import SimpleWebPageReader
    WEB_READER_AVAILABLE = True
except ImportError:
    logger.info("Web reader not available - install with: pip install llama-index-readers-web")
    WEB_READER_AVAILABLE = False

try:
    from llama_index.readers.file import PyMuPDFReader
    PDF_READER_AVAILABLE = True
except ImportError:
    logger.info("PDF reader not available - install with: pip install llama-index-readers-file")
    PDF_READER_AVAILABLE = False

# Set overall availability based on core functionality
LLAMAINDEX_AVAILABLE = LLAMAINDEX_CORE_AVAILABLE

# 🎯 ADVANCED FEATURES
LLAMAINDEX_FEATURES = {
    "index_types": ["vector", "list", "tree", "keyword", "knowledge_graph"],
    "document_sources": ["text", "url", "file", "database", "api"],
    "query_modes": ["default", "embedding", "hybrid", "tree_select", "summarize"],
    "supported_providers": ["openai", "anthropic", "openrouter", "huggingface", "local"],
    "vector_stores": ["faiss", "chroma", "pinecone", "weaviate"],
    "streaming": True,
    "memory": True,
    "multi_modal": True
}

# LlamaIndex input/output schema definitions
LLAMAINDEX_INPUT_SCHEMA = NodeSchema(
    fields={
        'documentContent': SchemaField(
            type=SchemaType.STRING,
            description='Document content as text or base64 (for file uploads)'
        ),
        'query': SchemaField(
            type=SchemaType.STRING,
            description='Query to run against the index',
            optional=True
        ),
        'context': SchemaField(
            type=SchemaType.OBJECT,
            description='Additional context for the query',
            optional=True
        ),
        'documentsSource': SchemaField(
            type=SchemaType.STRING,
            description='Source of the document (text, file, url, etc.)',
            optional=True
        )
    },
    required_fields=['documentContent']
)

LLAMAINDEX_OUTPUT_SCHEMA = NodeSchema(
    fields={
        'output': SchemaField(
            type=SchemaType.STRING,
            description='LlamaIndex output/result'
        ),
        'metadata': SchemaField(
            type=SchemaType.OBJECT,
            description='Execution metadata',
            optional=True
        ),
        'error': SchemaField(
            type=SchemaType.STRING,
            description='Error message',
            optional=True
        )
    },
    required_fields=['output']
)

class EnhancedLlamaIndexRunner:
    """Enhanced LlamaIndex runner with modern features matching LangChain quality"""
    
    def __init__(self, max_cache_size: int = 50):
        self.indexes_cache = {}
        self.vector_stores_cache = {}
        self.documents_cache = {}
        self.max_cache_size = max_cache_size
        self._cache_access_times = {}
    
    def cleanup_resources(self):
        """Cleanup all cached resources"""
        self.indexes_cache.clear()
        self.vector_stores_cache.clear()
        self.documents_cache.clear()
        self._cache_access_times.clear()
        logger.info("🧹 All LlamaIndex runner resources cleaned up")
    
    async def get_api_key(self, provider: str, context: Optional[Any] = None) -> Optional[str]:
        """Get API key with BYOK support"""
        try:
            # Try to get from context first (BYOK)
            if context and hasattr(context, 'get_api_key_for_framework'):
                api_key = context.get_api_key_for_framework(provider)
                if api_key:
                    logger.debug(f"🔑 Using API key from execution context for {provider}")
                    return api_key
            
            # Fallback to environment variable
            env_key_map = {
                'openai': 'OPENAI_API_KEY',
                'anthropic': 'ANTHROPIC_API_KEY',
                'openrouter': 'OPENROUTER_API_KEY',
                'huggingface': 'HUGGINGFACE_API_KEY'
            }
            
            env_key = env_key_map.get(provider)
            if env_key:
                api_key = os.getenv(env_key)
                if api_key:
                    logger.debug(f"🔑 Using API key from environment for {provider}")
                    return api_key
            
            logger.warning(f"⚠️ No API key found for provider: {provider}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting API key for {provider}: {str(e)}")
            return None
    
    def get_llm(self, config: Dict[str, Any], context: Optional[Any] = None):
        """Get LLM with multi-provider support and BYOK"""
        provider = config.get('provider', 'openai')
        model = config.get('model', 'gpt-4')
        temperature = config.get('temperature', 0.7)
        max_tokens = config.get('max_tokens', 4000)
        
        # Get API key
        api_key = self.get_api_key(provider, context)
        if not api_key:
            logger.warning(f"No API key available for {provider}")
            return None
        
        # LLM configuration
        llm_config = {
            'temperature': temperature,
            'max_tokens': max_tokens,
            'api_key': api_key
        }
        
        try:
            if provider == 'openai':
                return OpenAI(model=model, **llm_config)
            elif provider == 'anthropic':
                from llama_index.llms.anthropic import Anthropic
                return Anthropic(model=model, **llm_config)
            elif provider == 'openrouter':
                # OpenRouter uses OpenAI-compatible API
                return OpenAI(
                    model=model,
                    api_base='https://openrouter.ai/api/v1',
                    **llm_config
                )
            elif provider == 'huggingface':
                from llama_index.llms.huggingface import HuggingFaceLLM
                return HuggingFaceLLM(model_name=model, **llm_config)
            else:
                logger.warning(f"Provider {provider} not supported, using OpenAI fallback")
                return OpenAI(model='gpt-3.5-turbo', **llm_config)
                
        except Exception as e:
            logger.error(f"Failed to create LLM for {provider}: {str(e)}")
            return None
    
    def get_embeddings(self, config: Dict[str, Any], context: Optional[Any] = None):
        """Get embeddings with multi-provider support"""
        provider = config.get('embedding_provider', config.get('provider', 'openai'))
        
        api_key = self.get_api_key(provider, context)
        if not api_key:
            logger.warning(f"No API key for embeddings provider {provider}")
            return None
        
        try:
            if provider == 'openai':
                return OpenAIEmbedding(api_key=api_key)
            elif provider == 'huggingface':
                from llama_index.embeddings.huggingface import HuggingFaceEmbedding
                model_name = config.get('embedding_model', 'sentence-transformers/all-MiniLM-L6-v2')
                return HuggingFaceEmbedding(model_name=model_name)
            else:
                # Fallback to OpenAI
                return OpenAIEmbedding(api_key=api_key)
                
        except Exception as e:
            logger.error(f"Failed to create embeddings for {provider}: {str(e)}")
            return None
    
    async def load_documents(self, source_type: str, config: Dict[str, Any], inputs: Dict[str, Any]) -> List[Document]:
        """Load documents from various sources with caching"""
        cache_key = f"{source_type}_{hash(str(sorted(config.items())))}"
        
        # Check cache
        if cache_key in self.documents_cache:
            logger.info(f"📄 Using cached documents for {source_type}")
            return self.documents_cache[cache_key]
        
        documents = []
        
        try:
            if source_type == "text":
                text = inputs.get("text", inputs.get("input", config.get("text", "No text provided")))
                documents = [Document(text=text, metadata={"source": "user_text"})]
                
            elif source_type == "url":
                url = config.get("url", inputs.get("url", ""))
                if not url.startswith(('http://', 'https://')):
                    raise ValueError(f"Invalid URL: {url}")
                
                reader = SimpleWebPageReader()
                documents = reader.load_data([url])
                
            elif source_type == "file":
                file_path = config.get("file_path", inputs.get("file_path", ""))
                if not file_path:
                    raise ValueError("No file path provided")
                
                if file_path.endswith('.pdf'):
                    reader = PyMuPDFReader()
                    documents = reader.load_data(file_path)
                else:
                    # Generic file reading
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    documents = [Document(text=content, metadata={"source": file_path})]
                    
            elif source_type == "api":
                # Handle API-based document loading
                api_url = config.get("api_url", "")
                api_key = config.get("api_key", "")
                
                async with aiohttp.ClientSession() as session:
                    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
                    async with session.get(api_url, headers=headers) as response:
                        if response.status == 200:
                            content = await response.text()
                            documents = [Document(text=content, metadata={"source": api_url})]
                        else:
                            raise ValueError(f"API request failed: {response.status}")
                            
            else:
                # Fallback
                documents = [Document(text="No documents could be loaded", metadata={"source": "fallback"})]
            
            # Validate documents
            if not documents or all(not doc.text.strip() for doc in documents):
                documents = [Document(text="No valid content found", metadata={"source": "empty"})]
            
            # Cache documents
            self.documents_cache[cache_key] = documents
            logger.info(f"📄 Loaded and cached {len(documents)} documents from {source_type}")
            
            return documents
            
        except Exception as e:
            logger.error(f"Failed to load documents from {source_type}: {str(e)}")
            return [Document(text=f"Error loading documents: {str(e)}", metadata={"source": "error"})]
    
    async def create_index(self, documents: List[Document], config: Dict[str, Any], context: Optional[Any] = None):
        """Create index with advanced features and caching"""
        index_type = config.get("indexType", "vector")
        chunk_size = config.get("chunkSize", 512)
        chunk_overlap = config.get("chunkOverlap", 50)
        
        # Setup services
        llm = self.get_llm(config, context)
        embeddings = self.get_embeddings(config, context)
        
        if not llm or not embeddings:
            raise ValueError("Failed to initialize LLM or embeddings")
        
        # Configure settings
        Settings.llm = llm
        Settings.embed_model = embeddings
        Settings.chunk_size = chunk_size
        Settings.chunk_overlap = chunk_overlap
        
        # Setup node parser
        node_parser = SimpleNodeParser.from_defaults(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        try:
            if index_type == "vector":
                # Create vector store index
                index = VectorStoreIndex.from_documents(
                    documents,
                    service_context=Settings,
                    node_parser=node_parser
                )
            elif index_type == "list":
                from llama_index.core import ListIndex
                index = ListIndex.from_documents(documents, service_context=Settings)
            elif index_type == "tree":
                from llama_index.core import TreeIndex
                index = TreeIndex.from_documents(documents, service_context=Settings)
            elif index_type == "keyword":
                from llama_index.core import KeywordTableIndex
                index = KeywordTableIndex.from_documents(documents, service_context=Settings)
            else:
                # Fallback to vector
                index = VectorStoreIndex.from_documents(
                    documents,
                    service_context=Settings,
                    node_parser=node_parser
                )
            
            logger.info(f"✅ Created {index_type} index with {len(documents)} documents")
            return index
            
        except Exception as e:
            logger.error(f"Failed to create {index_type} index: {str(e)}")
            # Fallback to simple vector index
            index = VectorStoreIndex.from_documents(documents, service_context=Settings)
            return index

async def run_llamaindex_tool(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Enhanced LlamaIndex tool execution with modern features"""
    
    if not LLAMAINDEX_AVAILABLE:
        return await _llamaindex_fallback(config, inputs, context)
    
    start_time = datetime.now()
    
    try:
        # Initialize enhanced runner
        runner = EnhancedLlamaIndexRunner()
        
        # Extract configuration
        index_type = config.get("indexType", "vector")
        documents_source = config.get("documentsSource", "text")
        query_mode = config.get("queryMode", "default")
        similarity_top_k = config.get("similarityTopK", 3)
        streaming = config.get("streaming", False)
        
        logger.info(f"🚀 LlamaIndex execution: index={index_type}, source={documents_source}, mode={query_mode}")
        
        # Load documents
        documents = await runner.load_documents(documents_source, config, inputs)
        
        # Create index
        index = await runner.create_index(documents, config, context)
        
        # Create query engine based on mode
        if query_mode == "embedding":
            retriever = VectorIndexRetriever(
                index=index,
                similarity_top_k=similarity_top_k
            )
            query_engine = RetrieverQueryEngine(retriever=retriever)
        elif query_mode == "hybrid":
            # Advanced hybrid search
            query_engine = index.as_query_engine(
                similarity_top_k=similarity_top_k,
                response_mode="tree_summarize",
                streaming=streaming
            )
        else:
            # Default query engine
            query_engine = index.as_query_engine(
                similarity_top_k=similarity_top_k,
                streaming=streaming
            )
        
        # Execute query
        query = inputs.get("query", inputs.get("question", inputs.get("input", "What is this about?")))
        
        if streaming:
            # Handle streaming response
            response = query_engine.query(query)
            output = str(response)
        else:
            # Standard response
            response = query_engine.query(query)
            output = str(response)
        
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        return {
            "type": "llamaindex_result",
            "output": output,
            "framework": "llamaindex",
            "success": True,
            "metadata": {
                "index_type": index_type,
                "query_mode": query_mode,
                "documents_count": len(documents),
                "documents_source": documents_source,
                "similarity_top_k": similarity_top_k,
                "execution_time": execution_time,
                "input_length": len(query),
                "output_length": len(output),
                "streaming": streaming,
                "provider": config.get('provider', 'openai'),
                "model": config.get('model', 'gpt-4'),
                "timestamp": end_time.isoformat()
            }
        }
        
    except Exception as e:
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        logger.error(f"❌ LlamaIndex execution failed: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "framework": "llamaindex",
            "success": False,
            "metadata": {
                "execution_time": execution_time,
                "timestamp": end_time.isoformat()
            }
        }

async def _llamaindex_fallback(config: Dict[str, Any], inputs: Dict[str, Any], context: Optional[Any] = None) -> Dict[str, Any]:
    """Enhanced fallback when LlamaIndex is not available"""
    try:
        # Use the same pattern as LangChain for fallback
        query = inputs.get("query", inputs.get("question", inputs.get("input", "What is this about?")))
        context_text = inputs.get("text", inputs.get("context", "No context provided"))
        
        # Get LLM configuration
        llm_config = config.get("llm", config)
        provider = llm_config.get('provider', 'openai')
        model = llm_config.get('model', 'gpt-3.5-turbo')
        
        # Create RAG-style prompt
        prompt = f"""Based on the following context, answer the question comprehensively:

Context: {context_text}

Question: {query}

Please provide a detailed answer based on the context above. If the context doesn't contain enough information, say so clearly.

Answer:"""
        
        # Use universal API runner for fallback
        from .universal_api_runner import UniversalAPIRunner
        
        runner = UniversalAPIRunner()
        
        # Create universal API config for the selected provider
        api_config = {
            "provider": provider,
            "model": model,
            "temperature": llm_config.get('temperature', 0.7),
            "max_tokens": llm_config.get('max_tokens', 1000)
        }
        
        fallback_inputs = {
            "input": prompt,
            "message": prompt
        }
        
        # Execute with universal runner
        response = await runner.run_universal_api_tool(api_config, fallback_inputs)
        
        if response.get("success"):
            return {
                "type": "llamaindex_fallback",
                "output": response.get("output", "No response"),
                "framework": "llamaindex_fallback",
                "success": True,
                "metadata": {
                    "provider": provider,
                    "model": model,
                    "fallback_reason": "LlamaIndex not available",
                    "timestamp": datetime.now().isoformat()
                }
            }
        else:
            return {
                "type": "error",
                "error": f"Fallback execution failed: {response.get('error', 'Unknown error')}",
                "framework": "llamaindex_fallback",
                "success": False
            }
        
    except Exception as e:
        logger.error(f"LlamaIndex fallback failed: {str(e)}")
        return {
            "type": "error", 
            "error": f"LlamaIndex fallback failed: {str(e)}",
            "framework": "llamaindex_fallback",
            "success": False
        }

# 🔌 FRONTEND INTEGRATION UTILITIES
def get_llamaindex_capabilities() -> Dict[str, Any]:
    """Get complete LlamaIndex capabilities for frontend configuration"""
    
    # Build available features based on what's actually imported
    available_features = {
        "index_types": ["vector", "list"] if LLAMAINDEX_CORE_AVAILABLE else [],
        "document_sources": [],
        "query_modes": ["default", "embedding"] if LLAMAINDEX_CORE_AVAILABLE else [],
        "supported_providers": ["openai", "anthropic", "openrouter"] if LLAMAINDEX_CORE_AVAILABLE else [],
        "vector_stores": [],
        "streaming": LLAMAINDEX_CORE_AVAILABLE,
        "memory": LLAMAINDEX_CORE_AVAILABLE,
        "multi_modal": False
    }
    
    # Add document sources based on availability
    if LLAMAINDEX_CORE_AVAILABLE:
        available_features["document_sources"].append("text")
    if WEB_READER_AVAILABLE:
        available_features["document_sources"].append("url")
    if PDF_READER_AVAILABLE:
        available_features["document_sources"].append("file")
    
    # Add vector stores based on availability
    if FAISS_AVAILABLE:
        available_features["vector_stores"].append("faiss")
        available_features["index_types"].extend(["tree", "keyword"])
    
    # Add advanced features if core is available
    if LLAMAINDEX_CORE_AVAILABLE:
        available_features["query_modes"].extend(["hybrid", "tree_select"])
    
    return {
        "available": LLAMAINDEX_AVAILABLE,
        "features": available_features,
        "supported_providers": available_features["supported_providers"],
        "index_types": available_features["index_types"],
        "document_sources": available_features["document_sources"],
        "query_modes": available_features["query_modes"],
        "vector_stores": available_features["vector_stores"],
        "optional_dependencies": {
            "faiss_available": FAISS_AVAILABLE,
            "web_reader_available": WEB_READER_AVAILABLE,
            "pdf_reader_available": PDF_READER_AVAILABLE
        },
        "installation_help": {
            "faiss": "pip install llama-index-vector-stores-faiss",
            "web_reader": "pip install llama-index-readers-web", 
            "pdf_reader": "pip install llama-index-readers-file"
        }
    }

# Attach schemas to runner for validation and documentation
EnhancedLlamaIndexRunner.input_schema = LLAMAINDEX_INPUT_SCHEMA
EnhancedLlamaIndexRunner.output_schema = LLAMAINDEX_OUTPUT_SCHEMA

# Export main functions
__all__ = [
    "run_llamaindex_tool",
    "get_llamaindex_capabilities",
    "EnhancedLlamaIndexRunner",
    "LLAMAINDEX_FEATURES"
]
