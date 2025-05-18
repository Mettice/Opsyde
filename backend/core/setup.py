# core/setup.py
from typing import Dict, Any, List
import logging

from core.di import injector
from core.engine import WorkflowEngine
from repositories.workflow_repository import FileWorkflowRepository, WorkflowRepository
from services.workflow_service import WorkflowService
from services.node_service import NodeService
from utils.memory import MemoryManager
from utils.task_manager import TaskManager
from config.provider import ConfigProvider

logger = logging.getLogger(__name__)

def setup_services():
    """Register all services with the dependency injector"""
    logger.info("Registering services...")
    
    # Register core components
    injector.register_instance(MemoryManager, MemoryManager(
        max_cache_size=ConfigProvider.get_typed("workflow.MAX_RESULTS_SIZE", 100),
        cleanup_threshold=ConfigProvider.get_typed("workflow.CLEANUP_THRESHOLD", 0.8)
    ))
    
    injector.register_instance(TaskManager, TaskManager(
        max_tasks=ConfigProvider.get_typed("workflow.MAX_CONCURRENT_TASKS", 50)
    ))
    
    # Register repositories
    injector.register(WorkflowRepository, FileWorkflowRepository)
    
    # Register services
    injector.register(WorkflowEngine, WorkflowEngine)
    injector.register(WorkflowService, WorkflowService)
    injector.register(NodeService, NodeService)
    
    # Register framework connectors
    register_framework_connectors()
    
    logger.info("Services registered successfully")

def register_framework_connectors():
    """Register framework-specific runners"""
    
    # Import framework runners
    from backend.frameworks.email_notifier import send_email
    from backend.frameworks.sheets_logger import log_to_sheet
    from backend.frameworks.discord_notifier import run_discord_notifier
    from backend.frameworks.webhook_loader import handle_webhook_flow
    from backend.frameworks.cv_parser_runner import run_cv_parser_tool
    from backend.frameworks.webhook_runner import post_to_webhook
    
    # Register runners
    injector.register_instance("email_notifier", send_email)
    injector.register_instance("sheets_logger", log_to_sheet)
    injector.register_instance("discord_notifier", run_discord_notifier)
    injector.register_instance("webhook_loader", handle_webhook_flow)
    injector.register_instance("cv_parser", run_cv_parser_tool)
    injector.register_instance("webhook_runner", post_to_webhook)

   