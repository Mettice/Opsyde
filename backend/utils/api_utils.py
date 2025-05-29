from typing import Type, TypeVar, Dict, Any
from core.exceptions import (
    CrewFlowError, ValidationError, FrameworkError, ConfigurationError,
    ExecutionError, NodeError, ToolError, DatabaseError, AuthenticationError,
    AuthorizationError, ResourceNotFoundError, DependencyError,
    ConcurrencyError, RateLimitError, TimeoutError
)
from models.api_models import APIResponse, ErrorCode

T = TypeVar('T')

ERROR_MAP: Dict[Type[Exception], ErrorCode] = {
    ValidationError: ErrorCode.VALIDATION_ERROR,
    FrameworkError: ErrorCode.FRAMEWORK_ERROR,
    ConfigurationError: ErrorCode.CONFIG_ERROR,
    ExecutionError: ErrorCode.EXECUTION_ERROR,
    NodeError: ErrorCode.NODE_ERROR,
    ToolError: ErrorCode.TOOL_ERROR,
    DatabaseError: ErrorCode.DB_ERROR,
    AuthenticationError: ErrorCode.AUTH_ERROR,
    AuthorizationError: ErrorCode.AUTH_ERROR,
    ResourceNotFoundError: ErrorCode.NOT_FOUND,
    DependencyError: ErrorCode.DEPENDENCY_ERROR,
    ConcurrencyError: ErrorCode.CONCURRENCY_ERROR,
    RateLimitError: ErrorCode.RATE_LIMIT_ERROR,
    TimeoutError: ErrorCode.TIMEOUT_ERROR,
}

def handle_exception(exc: Exception) -> APIResponse:
    """Convert an exception to an API response"""
    if isinstance(exc, CrewFlowError):
        error_code = ERROR_MAP.get(type(exc), ErrorCode.INTERNAL_ERROR)
        return APIResponse.error_response(
            code=error_code,
            message=exc.message,
            details=exc.details
        )
    
    # Handle unexpected exceptions
    return APIResponse.error_response(
        code=ErrorCode.INTERNAL_ERROR,
        message=str(exc),
        details={"type": exc.__class__.__name__}
    )
