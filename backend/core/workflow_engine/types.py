from enum import Enum, auto
from typing import Dict, Any, List, Optional, Union

class NodeType(str, Enum):
    """Types of nodes in the workflow"""
    AGENT = "agent"
    TASK = "task"
    TOOL = "tool"
    TRIGGER = "trigger"
    LOGIC = "logic"
    INPUT = "input"
    OUTPUT = "output"
    CHAT = "chat"
    DELAY = "delay"

class ExecutionMode(str, Enum):
    """Execution modes for workflow nodes"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    HYBRID = "hybrid"

class ExecutionStatus(str, Enum):
    """Status of node execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    TIMEOUT = "timeout"

class FrameworkType(str, Enum):
    """Types of frameworks"""
    LLM = "llm"
    API = "api"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

# Type aliases
NodeConfig = Dict[str, Any]
NodeResult = Dict[str, Any]
NodeInputs = Dict[str, Any]
EdgeList = List[Dict[str, str]]
NodeList = List[Dict[str, Any]]

# Complex types
class ExecutionContext:
    """Context for node execution"""
    def __init__(
        self,
        node_id: str,
        node_type: NodeType,
        inputs: NodeInputs,
        config: Optional[NodeConfig] = None,
        parent_context: Optional['ExecutionContext'] = None
    ):
        self.node_id = node_id
        self.node_type = node_type
        self.inputs = inputs
        self.config = config or {}
        self.parent_context = parent_context
        self.start_time = None
        self.end_time = None
        self.status = ExecutionStatus.PENDING
        self.result = None
        self.error = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary"""
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "status": self.status,
            "inputs": self.inputs,
            "config": self.config,
            "result": self.result,
            "error": self.error,
            "start_time": self.start_time,
            "end_time": self.end_time
        }

class ExecutionResult:
    """Result of node execution"""
    def __init__(
        self,
        success: bool,
        node_id: str,
        result: Optional[Any] = None,
        error: Optional[str] = None,
        context: Optional[ExecutionContext] = None
    ):
        self.success = success
        self.node_id = node_id
        self.result = result
        self.error = error
        self.context = context

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            "success": self.success,
            "node_id": self.node_id,
            "result": self.result,
            "error": self.error,
            "context": self.context.to_dict() if self.context else None
        } 