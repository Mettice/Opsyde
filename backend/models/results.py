from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class ResultType(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class NodeResult(BaseModel):
    node_id: str
    node_type: str
    status: ExecutionStatus
    result_type: ResultType
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def duration(self) -> Optional[float]:
        """Return duration in seconds if execution is complete"""
        if self.end_time and self.start_time:
            return (self.end_time - self.start_time).total_seconds()
        return None

class WorkflowResult(BaseModel):
    workflow_id: str
    execution_id: str
    status: ExecutionStatus
    node_results: Dict[str, NodeResult] = Field(default_factory=dict)
    global_outputs: Dict[str, Any] = Field(default_factory=dict)
    start_time: datetime
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def add_node_result(self, result: NodeResult):
        self.node_results[result.node_id] = result
        
    def get_failed_nodes(self) -> List[NodeResult]:
        return [r for r in self.node_results.values() if r.status == ExecutionStatus.FAILED]
    
    def get_completed_nodes(self) -> List[NodeResult]:
        return [r for r in self.node_results.values() if r.status == ExecutionStatus.COMPLETED]
    
    def duration(self) -> Optional[float]:
        """Return total workflow duration in seconds if complete"""
        if self.end_time and self.start_time:
            return (self.end_time - self.start_time).total_seconds()
        return None

class ErrorResult(BaseModel):
    error_type: str
    message: str
    node_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)

class StreamResult(BaseModel):
    event_type: str
    data: Dict[str, Any]
    node_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
