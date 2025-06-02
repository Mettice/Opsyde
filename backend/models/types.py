from enum import Enum, auto
from typing import Dict, Any, Union, Optional, List
from datetime import datetime
from pydantic import BaseModel

class OutputType(str, Enum):
    """Type of output"""
    EMAIL = "email"
    DISCORD = "discord"
    SHEETS = "sheets"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

class ToolType(str, Enum):
    """Type of tool"""
    LLM = "llm"
    API = "api"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

class LLMProvider(str, Enum):
    """LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OPENROUTER = "openrouter"
    HUGGINGFACE = "huggingface"
    PERPLEXITY = "perplexity"
    

class APIType(str, Enum):
    """API types"""
    REST = "rest"
    GRAPHQL = "graphql"
    GRPC = "grpc"
    SOAP = "soap"

class WebhookEventType(str, Enum):
    """Webhook event types"""
    DATA_CREATED = "data.created"
    DATA_UPDATED = "data.updated"
    DATA_DELETED = "data.deleted"
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"

class ToolConfig(BaseModel):
    """Base tool configuration"""
    tool_type: ToolType
    name: str
    description: Optional[str] = None
    version: str = "1.0.0"
    enabled: bool = True
    metadata: Dict[str, Any] = {}

class LLMConfig(ToolConfig):
    """LLM tool configuration"""
    provider: LLMProvider
    model: str
    temperature: float = 0.7
    max_tokens: int = 2000
    system_message: Optional[str] = None
    stop_sequences: List[str] = []
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None

class APIConfig(ToolConfig):
    """API tool configuration"""
    api_type: APIType
    base_url: str
    endpoint: str = ""
    method: str = "GET"
    headers: Dict[str, str] = {}
    timeout: int = 30
    retry_count: int = 3
    retry_delay: int = 1
    parameter_mapping: Dict[str, str] = {}
    static_parameters: Dict[str, Any] = {}

class WebhookConfig(ToolConfig):
    """Webhook tool configuration"""
    webhook_url: str
    method: str = "POST"
    headers: Dict[str, str] = {}
    payload_template: Dict[str, Any] = {}
    include_metadata: bool = True
    max_retries: int = 3
    retry_delay: int = 1
    timeout: int = 30

class CustomConfig(ToolConfig):
    """Custom tool configuration"""
    module_path: str
    class_name: str
    settings: Dict[str, Any] = {}

class ToolResult(BaseModel):
    """Tool execution result"""
    success: bool
    tool_type: ToolType
    tool_name: str
    timestamp: datetime
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}

class ToolError(Exception):
    """Base exception for tool errors"""
    def __init__(self, message: str, error_type: str = "tool_error", details: Dict[str, Any] = None):
        self.message = message
        self.error_type = error_type
        self.details = details or {}
        super().__init__(message)

class LLMError(ToolError):
    """LLM-specific error"""
    pass

class APIError(ToolError):
    """API-specific error"""
    pass

class WebhookError(ToolError):
    """Webhook-specific error"""
    pass

class CustomToolError(ToolError):
    """Custom tool error"""
    pass 