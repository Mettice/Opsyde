from typing import Dict, Any, Optional, List
from enum import Enum
from pydantic import BaseModel, Field

class NodeType(str, Enum):
    AGENT = "agent"
    TASK = "task"
    TOOL = "tool"
    TRIGGER = "trigger"
    LOGIC = "logic"
    INPUT = "input"
    OUTPUT = "output"
    CHAT = "chat"
    DELAY = "delay"

class ToolType(str, Enum):
    LLM = "llm"
    API = "api"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

class BaseNodeConfig(BaseModel):
    label: str
    description: Optional[str] = None
    condition: Optional[str] = None

class AgentConfig(BaseNodeConfig):
    role: str
    goal: str
    backstory: Optional[str] = None
    llm_model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 4000
    allow_delegation: bool = False
    enable_memory: bool = False
    framework: str
    framework_config: Dict[str, Any] = Field(default_factory=dict)

class TaskConfig(BaseNodeConfig):
    description: str
    expected_output: Optional[str] = None
    async_execution: bool = False
    dependencies: List[str] = Field(default_factory=list)

class ToolConfig(BaseNodeConfig):
    tool_type: ToolType
    framework: str
    framework_config: Dict[str, Any] = Field(default_factory=dict)
    parameters: Dict[str, Any] = Field(default_factory=dict)

class OutputConfig(BaseNodeConfig):
    output_type: str
    config: Dict[str, Any] = Field(default_factory=dict)

class Node(BaseModel):
    id: str
    type: NodeType
    data: Dict[str, Any]
    position: Dict[str, int]
    
    def get_config(self) -> BaseNodeConfig:
        if self.type == NodeType.AGENT:
            return AgentConfig(**self.data)
        elif self.type == NodeType.TASK:
            return TaskConfig(**self.data)
        elif self.type == NodeType.TOOL:
            return ToolConfig(**self.data)
        elif self.type == NodeType.OUTPUT:
            return OutputConfig(**self.data)
        return BaseNodeConfig(**self.data)
