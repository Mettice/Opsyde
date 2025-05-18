# api/dependencies.py
from fastapi import Depends, Request
from typing import Callable, Optional, Dict, Any, AsyncGenerator
import uuid
from contextvars import ContextVar

from core.di import injector, ScopedDependencyInjector
from services.workflow_service import WorkflowService
from repositories.workflow_repository import FileWorkflowRepository
from core.engine import WorkflowEngine

# Register services
injector.register(FileWorkflowRepository, FileWorkflowRepository, singleton=True)
injector.register(WorkflowEngine, WorkflowEngine, singleton=True)
injector.register(WorkflowService, WorkflowService, singleton=False)

# FastAPI dependency
async def get_workflow_service() -> WorkflowService:
    """Get the workflow service"""
    return injector.get(WorkflowService)

async def get_scoped_injector() -> AsyncGenerator[ScopedDependencyInjector, None]:
    """Get a scoped dependency injector"""
    scoped = injector.create_scoped()
    try:
        yield scoped
    finally:
        scoped.dispose()

# Request-scoped service dependency
async def get_request_scoped_service(
    service_type: Any,
    scoped: ScopedDependencyInjector = Depends(get_scoped_injector)
) -> Any:
    """Get a request-scoped service"""
    return scoped.get(service_type)

request_id_context: ContextVar[str] = ContextVar('request_id', default='')

async def get_request_id(request: Request) -> str:
    """Generate or get request ID from headers"""
    request_id = request.headers.get('X-Request-ID')
    if not request_id:
        request_id = str(uuid.uuid4())
    request_id_context.set(request_id)
    return request_id




