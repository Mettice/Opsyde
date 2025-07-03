from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field, validator, root_validator
from .schemas import NodeSchema, SchemaType, SchemaField
import logging

logger = logging.getLogger(__name__)

class LLMConfig(BaseModel):
    """Common LLM configuration shared across nodes"""
    provider: str = Field(..., description="LLM provider (e.g., openai, anthropic, etc.)")
    model: str = Field(..., description="LLM model name")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(default=4000, gt=0, le=32000, description="Maximum tokens in response")
    framework: str = Field(..., description="LLM framework to use")
    stream: bool = Field(default=False, description="Enable streaming responses")
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0, description="Top-p sampling parameter")
    frequency_penalty: Optional[float] = Field(default=0.0, ge=-2.0, le=2.0, description="Frequency penalty")
    presence_penalty: Optional[float] = Field(default=0.0, ge=-2.0, le=2.0, description="Presence penalty")
    stop: Optional[List[str]] = Field(default=None, description="Stop sequences")
    timeout: Optional[int] = Field(default=30, gt=0, description="Request timeout in seconds")
    retries: Optional[int] = Field(default=3, ge=0, le=5, description="Number of retry attempts")

    @validator('provider')
    def validate_provider(cls, v):
        """Validate LLM provider name"""
        valid_providers = ['openai', 'anthropic', 'perplexity', 'openrouter', 'huggingface', 'gemini']
        if v.lower() not in valid_providers:
            raise ValueError(f"Invalid provider. Must be one of: {valid_providers}")
        return v.lower()

    @validator('model')
    def validate_model(cls, v, values):
        """Validate model name based on provider"""
        provider = values.get('provider', '').lower()
        
        # Model validation per provider
        model_validation = {
            'openai': ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
            'perplexity': ['sonar-pro', 'sonar', 'sonar-deep-research', 'sonar-reasoning-pro', 'sonar-reasoning', 'r1-1776'],
            'openrouter': ['*'],  # OpenRouter supports multiple models
            'huggingface': ['*'],  # HuggingFace supports multiple models
            'gemini': ['gemini-pro', 'gemini-pro-vision'],
            'mistral': ['*'],  # Mistral supports multiple models
            'cohere': ['*']  # Cohere supports multiple models
        }
        
        valid_models = model_validation.get(provider, ['*'])
        if valid_models != ['*'] and v not in valid_models:
            raise ValueError(f"Invalid model '{v}' for provider '{provider}'. Valid models: {valid_models}")
        
        return v

class BaseRunnerConfig(BaseModel):
    """Base configuration for all runners"""
    framework: str = Field(..., description="Framework name")
    provider: str = Field(..., description="Provider name")
    model: str = Field(..., description="Model name")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=500, gt=0)
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'input': SchemaField(
                type=SchemaType.ANY,
                description='Input data for the runner'
            ),
            'context': SchemaField(
                type=SchemaType.OBJECT,
                description='Additional context for execution',
                optional=True
            )
        },
        required_fields=['input']
    ))
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Execution result'
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                properties={
                    'framework': SchemaField(type=SchemaType.STRING, description='Framework used'),
                    'provider': SchemaField(type=SchemaType.STRING, description='LLM provider used'),
                    'model': SchemaField(type=SchemaType.STRING, description='Model used'),
                    'execution_time': SchemaField(type=SchemaType.NUMBER, description='Execution time in seconds'),
                    'tokens_used': SchemaField(type=SchemaType.NUMBER, description='Number of tokens used'),
                    'cost': SchemaField(type=SchemaType.NUMBER, description='Cost of execution')
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message if execution failed',
                optional=True
            )
        },
        required_fields=['result', 'metadata']
    ))

    @validator('framework')
    def validate_framework(cls, v):
        """Validate framework name"""
        valid_frameworks = [
            # AI Frameworks
            'crewai', 'langchain', 'autogen', 'llamaindex', 'huggingface', 'api',
            # Structural Nodes (used as frameworks)
            'task', 'logic', 'trigger', 'input', 'output', 'delay', 'chat',
            'output_webhook', 'output_email', 'output_file', 'output_database', 'output_cms'
        ]
        if v.lower() not in valid_frameworks:
            raise ValueError(f"Invalid framework. Must be one of: {valid_frameworks}")
        return v.lower()

class ToolConfig(BaseModel):
    """Configuration for tool nodes"""
    tool_type: str = Field(..., description="Type of tool (api, webhook, database, file, custom, llm, universal_api)")
    framework: str = Field(..., description="Framework to use")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tool-specific configuration")
    config_mode: str = Field(default="schema", description="Configuration mode (schema or ai)")
    ai_prompt: Optional[str] = Field(default=None, description="AI prompt for configuration")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tool parameters")
    retry_count: int = Field(default=3, ge=0, le=5, description="Number of retry attempts")
    timeout: int = Field(default=30, gt=0, description="Request timeout in seconds")
    is_async: bool = Field(default=False, description="Execute asynchronously")
    llm_config: Optional[LLMConfig] = Field(default=None, description="LLM configuration for LLM tools")

    @validator('tool_type')
    def validate_tool_type(cls, v):
        """Validate tool type"""
        valid_types = ['api', 'webhook', 'database', 'file', 'custom', 'llm', 'universal_api']
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid tool type. Must be one of: {valid_types}")
        return v.lower()

    @validator('config_mode')
    def validate_config_mode(cls, v):
        """Validate configuration mode"""
        valid_modes = ['schema', 'ai']
        if v.lower() not in valid_modes:
            raise ValueError(f"Invalid config mode. Must be one of: {valid_modes}")
        return v.lower()

class CrewAIRunnerConfig(BaseRunnerConfig):
    """Configuration for CrewAI runner"""
    role: str = Field(..., description="Agent role")
    goal: str = Field(..., description="Agent goal")
    backstory: Optional[str] = Field(default=None, description="Agent backstory")
    verbose: bool = Field(default=True, description="Enable verbose output")
    allow_delegation: bool = Field(default=False, description="Allow task delegation")
    enable_memory: bool = Field(default=False, description="Enable memory for the agent")
    
    # Enhanced memory configuration
    memory_config: Dict[str, Any] = Field(default_factory=lambda: {
        "enabled": False,
        "type": "none",  # none, short_term, long_term, shared
        "max_tokens": 2000,
        "return_messages": True,
        "memory_key": "chat_history"
    })
    
    # Enhanced crew configuration
    crew_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "synchronous",  # synchronous, asynchronous
        "max_workers": 4,
        "timeout": 300,
        "retry_attempts": 3
    })
    
    # Enhanced execution strategy
    execution_strategy: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "sequential",  # sequential, parallel, hierarchical
        "max_concurrent_tasks": 1,
        "task_priority": "fifo",  # fifo, priority
        "error_handling": "stop_on_error"  # stop_on_error, continue_on_error
    })
    
    max_iterations: int = Field(default=3, gt=0)
    tools: Optional[List[Dict[str, Any]]] = None
    llm_config: Optional[LLMConfig] = None

    @validator('memory_config')
    def validate_memory_config(cls, v):
        """Validate memory configuration"""
        valid_types = ['none', 'short_term', 'long_term', 'shared']
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid memory type. Must be one of: {valid_types}")
        return v

    @validator('crew_config')
    def validate_crew_config(cls, v):
        """Validate crew configuration"""
        valid_types = ['synchronous', 'asynchronous']
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid crew type. Must be one of: {valid_types}")
        return v

    @validator('execution_strategy')
    def validate_execution_strategy(cls, v):
        """Validate execution strategy"""
        valid_types = ['sequential', 'parallel', 'hierarchical']
        valid_priorities = ['fifo', 'priority']
        valid_error_handling = ['stop_on_error', 'continue_on_error']
        
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid execution type. Must be one of: {valid_types}")
        if v.get('task_priority') not in valid_priorities:
            raise ValueError(f"Invalid task priority. Must be one of: {valid_priorities}")
        if v.get('error_handling') not in valid_error_handling:
            raise ValueError(f"Invalid error handling. Must be one of: {valid_error_handling}")
        
        return v

class LangChainRunnerConfig(BaseRunnerConfig):
    """Configuration for LangChain runner"""
    chain_type: str = Field(..., description="Type of chain to use")
    
    # Enhanced memory configuration
    memory_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "none",  # none, buffer, summary, window
        "max_tokens": 2000,
        "return_messages": True,
        "memory_key": "chat_history",
        "window_size": 5
    })
    
    # Enhanced retriever configuration
    retriever_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "none",  # none, vectorstore, document
        "vectorstore_type": "chroma",  # chroma, faiss, etc.
        "embedding_model": "text-embedding-ada-002",
        "search_type": "similarity",  # similarity, mmr
        "k": 4
    })
    
    # Enhanced output parser
    output_parser: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "default",  # default, structured, custom
        "format": "text",  # text, json, structured
        "schema": None
    })
    
    # Enhanced streaming support
    streaming: bool = False
    streaming_config: Dict[str, Any] = Field(default_factory=lambda: {
        "enabled": False,
        "chunk_size": 100,
        "callback_handlers": []
    })
    
    tools: Optional[List[Dict[str, Any]]] = None
    llm_config: Optional[LLMConfig] = None

    @validator('chain_type')
    def validate_chain_type(cls, v):
        """Validate chain type"""
        valid_types = ['llm', 'conversation', 'qa', 'summarize', 'stuff', 'map_reduce', 'refine']
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid chain type. Must be one of: {valid_types}")
        return v.lower()

    @validator('memory_config')
    def validate_memory_config(cls, v):
        """Validate memory configuration"""
        valid_types = ['none', 'buffer', 'summary', 'window']
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid memory type. Must be one of: {valid_types}")
        return v

    @validator('retriever_config')
    def validate_retriever_config(cls, v):
        """Validate retriever configuration"""
        valid_types = ['none', 'vectorstore', 'document']
        valid_vectorstores = ['chroma', 'faiss', 'pinecone', 'weaviate']
        valid_search_types = ['similarity', 'mmr']
        
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid retriever type. Must be one of: {valid_types}")
        if v.get('type') == 'vectorstore' and v.get('vectorstore_type') not in valid_vectorstores:
            raise ValueError(f"Invalid vectorstore type. Must be one of: {valid_vectorstores}")
        if v.get('search_type') not in valid_search_types:
            raise ValueError(f"Invalid search type. Must be one of: {valid_search_types}")
        
        return v

class HuggingFaceRunnerConfig(BaseRunnerConfig):
    """Configuration for HuggingFace runner"""
    task_type: str = Field(..., description="Type of task to perform")
    model_name: str = Field(..., description="Name of the model to use")
    
    # Enhanced pipeline configuration
    pipeline_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "default",  # default, feature_extraction, zero_shot
        "device": "cpu",  # cpu, cuda, mps
        "batch_size": 1,
        "num_workers": 0
    })
    
    # Enhanced post-processing configuration
    postprocess_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "text",  # text, image, video, audio
        "format": "raw",  # raw, json, structured
        "max_length": 512,
        "truncation": True
    })
    
    # Enhanced token streaming
    streaming: bool = False
    streaming_config: Dict[str, Any] = Field(default_factory=lambda: {
        "enabled": False,
        "chunk_size": 100,
        "callback_handlers": []
    })
    llm_config: Optional[LLMConfig] = None

    @validator('task_type')
    def validate_task_type(cls, v):
        """Validate task type"""
        valid_tasks = ['text-generation', 'text-classification', 'translation', 'summarization', 'question-answering']
        if v.lower() not in valid_tasks:
            raise ValueError(f"Invalid task type. Must be one of: {valid_tasks}")
        return v.lower()

    @validator('pipeline_config')
    def validate_pipeline_config(cls, v):
        """Validate pipeline configuration"""
        valid_types = ['default', 'feature_extraction', 'zero_shot']
        valid_devices = ['cpu', 'cuda', 'mps']
        
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid pipeline type. Must be one of: {valid_types}")
        if v.get('device') not in valid_devices:
            raise ValueError(f"Invalid device. Must be one of: {valid_devices}")
        
        return v

class AutoGenRunnerConfig(BaseRunnerConfig):
    """Configuration for AutoGen runner"""
    agent_type: str = Field(..., description="Type of agent")
    system_message: Optional[str] = Field(default=None, description="System message for the agent")
    max_messages: int = Field(default=10, gt=0, description="Maximum number of messages")
    
    # Enhanced tool configuration
    tool_config: Dict[str, Any] = Field(default_factory=lambda: {
        "enabled": False,
        "function_calling": False,
        "tool_selection": "auto"  # auto, manual
    })
    
    # Enhanced message passing
    message_config: Dict[str, Any] = Field(default_factory=lambda: {
        "strategy": "sequential",  # sequential, parallel, broadcast
        "timeout": 30,
        "retry_attempts": 3,
        "message_format": "text"  # text, json, structured
    })
    
    # Enhanced termination conditions
    termination_config: Dict[str, Any] = Field(default_factory=lambda: {
        "condition": "default",  # default, custom, max_turns
        "max_turns": 10,
        "success_criteria": None,
        "failure_criteria": None
    })
    
    # Enhanced reply strategy
    reply_config: Dict[str, Any] = Field(default_factory=lambda: {
        "strategy": "sequential",  # sequential, parallel, hierarchical
        "timeout": 30,
        "retry_attempts": 3,
        "error_handling": "stop_on_error"  # stop_on_error, continue_on_error
    })
    
    tools: Optional[List[Dict[str, Any]]] = None
    llm_config: Optional[LLMConfig] = None

    @validator('agent_type')
    def validate_agent_type(cls, v):
        """Validate agent type"""
        valid_types = ['assistant', 'user_proxy', 'group_chat', 'conversable_agent']
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid agent type. Must be one of: {valid_types}")
        return v.lower()

    @validator('tool_config')
    def validate_tool_config(cls, v):
        """Validate tool configuration"""
        valid_selections = ['auto', 'manual']
        if v.get('tool_selection') not in valid_selections:
            raise ValueError(f"Invalid tool selection. Must be one of: {valid_selections}")
        return v

    @validator('message_config')
    def validate_message_config(cls, v):
        """Validate message configuration"""
        valid_strategies = ['sequential', 'parallel', 'broadcast']
        valid_formats = ['text', 'json', 'structured']
        
        if v.get('strategy') not in valid_strategies:
            raise ValueError(f"Invalid message strategy. Must be one of: {valid_strategies}")
        if v.get('message_format') not in valid_formats:
            raise ValueError(f"Invalid message format. Must be one of: {valid_formats}")
        
        return v

class LlamaIndexRunnerConfig(BaseRunnerConfig):
    """Configuration for LlamaIndex runner"""
    index_type: str = Field(..., description="Type of index to use (vector, list, tree, keyword)")
    chunk_size: int = Field(default=512, gt=0, description="Size of text chunks")
    chunk_overlap: int = Field(default=50, ge=0, description="Overlap between chunks")
    
    # Enhanced index configuration
    index_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "vector",  # vector, list, tree, keyword
        "similarity_top_k": 3,
        "response_mode": "compact",  # compact, tree_summarize, refine
        "streaming": False
    })
    
    # Enhanced document loading
    document_config: Dict[str, Any] = Field(default_factory=lambda: {
        "source_type": "text",  # text, url, file, api
        "parser_config": {
            "chunk_size": 512,
            "chunk_overlap": 50,
            "include_metadata": True
        }
    })
    
    # Enhanced query configuration
    query_config: Dict[str, Any] = Field(default_factory=lambda: {
        "mode": "default",  # default, embedding, hybrid
        "similarity_top_k": 3,
        "response_mode": "compact",
        "streaming": False
    })
    
    # Enhanced vector store configuration
    vector_store_config: Dict[str, Any] = Field(default_factory=lambda: {
        "type": "faiss",  # faiss, chroma, pinecone, weaviate
        "dimension": 1536,  # Default for OpenAI embeddings
        "metric": "cosine"  # cosine, euclidean, dot
    })
    
    # Enhanced embedding configuration
    embedding_config: Dict[str, Any] = Field(default_factory=lambda: {
        "provider": "openai",  # openai, huggingface, local
        "model": "text-embedding-ada-002",
        "dimension": 1536
    })
    
    # Enhanced LLM configuration
    llm_config: Dict[str, Any] = Field(default_factory=lambda: {
        "provider": "openai",  # openai, anthropic, openrouter
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 4000
    })
    llm_config_obj: Optional[LLMConfig] = None

    @validator('index_type')
    def validate_index_type(cls, v):
        """Validate index type"""
        valid_types = ['vector', 'list', 'tree', 'keyword']
        if v.lower() not in valid_types:
            raise ValueError(f"Invalid index type. Must be one of: {valid_types}")
        return v.lower()

    @validator('index_config')
    def validate_index_config(cls, v):
        """Validate index configuration"""
        valid_types = ['vector', 'list', 'tree', 'keyword']
        valid_response_modes = ['compact', 'tree_summarize', 'refine']
        
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid index type. Must be one of: {valid_types}")
        if v.get('response_mode') not in valid_response_modes:
            raise ValueError(f"Invalid response mode. Must be one of: {valid_response_modes}")
        
        return v

    @validator('vector_store_config')
    def validate_vector_store_config(cls, v):
        """Validate vector store configuration"""
        valid_types = ['faiss', 'chroma', 'pinecone', 'weaviate']
        valid_metrics = ['cosine', 'euclidean', 'dot']
        
        if v.get('type') not in valid_types:
            raise ValueError(f"Invalid vector store type. Must be one of: {valid_types}")
        if v.get('metric') not in valid_metrics:
            raise ValueError(f"Invalid metric. Must be one of: {valid_metrics}")
        
        return v

# Export all schemas
__all__ = [
    'BaseRunnerConfig',
    'CrewAIRunnerConfig',
    'LangChainRunnerConfig',
    'HuggingFaceRunnerConfig',
    'AutoGenRunnerConfig',
    'LlamaIndexRunnerConfig',
    'LLMConfig',
    'ToolConfig'
] 