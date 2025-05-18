from typing import TypeVar, Generic, Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from backend.models.results import ExecutionStatus

class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    FRAMEWORK_ERROR = "FRAMEWORK_ERROR"
    CONFIG_ERROR = "CONFIG_ERROR"
    EXECUTION_ERROR = "EXECUTION_ERROR"
    NODE_ERROR = "NODE_ERROR"
    TOOL_ERROR = "TOOL_ERROR"
    DB_ERROR = "DB_ERROR"
    AUTH_ERROR = "AUTH_ERROR"
    NOT_FOUND = "NOT_FOUND"
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR"
    CONCURRENCY_ERROR = "CONCURRENCY_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"

class ErrorResponse(BaseModel):
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None

class Metadata(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = None
    version: str = "1.0"

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[ErrorResponse] = None
    metadata: Metadata = Field(default_factory=Metadata)

    @classmethod
    def success_response(cls, data: T) -> 'APIResponse[T]':
        return cls(
            success=True,
            data=data,
            metadata=Metadata()
        )

    @classmethod
    def error_response(
        cls,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> 'APIResponse[T]':
        return cls(
            success=False,
            error=ErrorResponse(
                code=code,
                message=message,
                details=details
            ),
            metadata=Metadata()
        )

class NodeExecutionResponse(BaseModel):
    node_id: str
    node_type: str
    status: ExecutionStatus
    result: Optional[Dict[str, Any]] = None
    execution_time: float
    timestamp: datetime = Field(default_factory=datetime.now)

class NodeValidationResponse(BaseModel):
    valid: bool
    errors: Optional[List[str]] = None

class NodeTypesResponse(BaseModel):
    types: Dict[str, Dict[str, Any]]
    total_count: int

class FrameworksResponse(BaseModel):
    frameworks: Dict[str, Any]
    supported_types: List[str]

class ToolInstance(BaseModel):
    instance_id: str
    tool_name: str
    config: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.now)

class ToolExecutionResponse(BaseModel):
    tool_name: str
    instance_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    execution_time: float
    timestamp: datetime = Field(default_factory=datetime.now)

class ToolListResponse(BaseModel):
    tools: List[Dict[str, Any]]
    total_count: int

class ToolFrameworksResponse(BaseModel):
    frameworks: Dict[str, List[Dict[str, Any]]]
    supported_types: List[str]

class PluginResponse(BaseModel):
    name: str
    file: str
    path: str

class PluginListResponse(BaseModel):
    plugins: List[PluginResponse]
    total_count: int

class PluginUploadResponse(BaseModel):
    filename: str
    status: str
    message: str

class ToolValidationResponse(BaseModel):
    valid: bool
    message: Optional[str] = None
    errors: Optional[List[str]] = None

class WorkflowBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    version: str = "1.0"
    owner_id: Optional[str] = None

class WorkflowCreateResponse(WorkflowBase):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class WorkflowUpdateResponse(BaseModel):
    workflow_id: str
    updated_fields: List[str]
    timestamp: datetime = Field(default_factory=datetime.now)

class WorkflowExecutionResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    inputs: Dict[str, Any]
    outputs: Optional[Dict[str, Any]] = None
    node_results: Dict[str, Any] = Field(default_factory=dict)

class WorkflowExecutionListResponse(BaseModel):
    executions: List[WorkflowExecutionResponse]
    total_count: int
    limit: int
    offset: int

class WorkflowValidationResponse(BaseModel):
    valid: bool
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None

class WorkflowExportResponse(BaseModel):
    workflow_id: str
    name: str
    version: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    metadata: Dict[str, Any]

class TriggerType(str, Enum):
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"
    MANUAL = "manual"
    EVENT = "event"

class TriggerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXECUTING = "executing"
    FAILED = "failed"

class TriggerBase(BaseModel):
    trigger_id: str
    type: TriggerType
    status: TriggerStatus
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    last_executed: Optional[datetime] = None
    execution_count: int = 0

class TriggerExecutionResponse(BaseModel):
    trigger_id: str
    execution_id: str
    status: str
    payload: Dict[str, Any]
    start_time: datetime
    end_time: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None

class TriggerListResponse(BaseModel):
    triggers: List[TriggerBase]
    total_count: int

class TriggerRegistrationResponse(BaseModel):
    trigger_id: str
    webhook_url: Optional[str] = None
    schedule: Optional[str] = None
    status: TriggerStatus

class TriggerScheduleResponse(BaseModel):
    trigger_id: str
    schedule_type: str
    next_run: datetime
    status: TriggerStatus
