from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

class LLMModel(str, Enum):
    GPT4 = "gpt-4"
    GPT35 = "gpt-3.5-turbo"
    CLAUDE = "claude-v1"

class AgentNodeConfig(BaseModel):
    """Configuration for Agent nodes"""
    framework: str = Field(..., description="AI framework to use")
    model: LLMModel = Field(default=LLMModel.GPT35)
    temperature: float = Field(default=0.7, ge=0, le=1)
    max_tokens: int = Field(default=2000, gt=0)
    system_prompt: Optional[str] = None
    allow_delegation: bool = Field(default=False)
    memory_enabled: bool = Field(default=False)

class ToolNodeConfig(BaseModel):
    """Configuration for Tool nodes"""
    tool_type: str = Field(..., description="Type of tool")
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    retry_count: int = Field(default=3, ge=0)
    timeout: int = Field(default=30, gt=0)

class OutputNodeConfig(BaseModel):
    """Configuration for Output nodes"""
    output_type: str = Field(..., description="Type of output")
    config: Dict[str, Any] = Field(..., description="Output-specific configuration")
    
    @validator("config")
    def validate_output_config(cls, v, values):
        output_type = values.get("output_type")
        if output_type == "email":
            assert "email" in v, "Email address required"
        elif output_type == "webhook":
            assert "url" in v, "Webhook URL required"
        return v 