"""Core exceptions for the CrewFlow platform"""

class CrewFlowError(Exception):
    """Base exception for all CrewFlow errors"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)

class ValidationError(CrewFlowError):
    """Raised when validation fails"""
    pass

class FrameworkError(CrewFlowError):
    """Raised when framework-specific operations fail"""
    pass

class ConfigurationError(CrewFlowError):
    """Raised when configuration is invalid or missing"""
    pass

class ExecutionError(CrewFlowError):
    """Raised when workflow execution fails"""
    pass

class WorkflowError(CrewFlowError):
    """Raised when workflow-specific operations fail"""
    pass

class NodeError(CrewFlowError):
    """Raised when node processing fails"""
    pass

class ToolError(CrewFlowError):
    """Raised when tool execution fails"""
    pass

class DatabaseError(CrewFlowError):
    """Raised when database operations fail"""
    pass

class AuthenticationError(CrewFlowError):
    """Raised when authentication fails"""
    pass

class AuthorizationError(CrewFlowError):
    """Raised when authorization fails"""
    pass

class ResourceNotFoundError(CrewFlowError):
    """Raised when a requested resource is not found"""
    pass

class DependencyError(CrewFlowError):
    """Raised when a required dependency is missing or invalid"""
    pass

class ConcurrencyError(CrewFlowError):
    """Raised when concurrent operations conflict"""
    pass

class RateLimitError(CrewFlowError):
    """Raised when rate limits are exceeded"""
    pass

class TimeoutError(CrewFlowError):
    """Raised when operations timeout"""
    pass 