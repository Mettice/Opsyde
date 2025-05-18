import asyncio
from typing import Dict, Any, Optional, Type
from datetime import datetime
import logging

from .types import (
    NodeType, ExecutionStatus, ExecutionContext, 
    ExecutionResult, NodeConfig, NodeInputs
)
from utils.backpressure import BackpressureManager
from utils.logging import get_logger

logger = get_logger(__name__)

class Executor:
    """
    Handles execution of individual nodes with proper error handling,
    timeouts, and resource management.
    """
    
    def __init__(
        self,
        max_concurrency: int = 10,
        default_timeout: int = 300,
        enable_backpressure: bool = True
    ):
        self.max_concurrency = max_concurrency
        self.default_timeout = default_timeout
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.backpressure = BackpressureManager(max_concurrency) if enable_backpressure else None
        
    async def execute_node(
        self,
        node_id: str,
        node_type: NodeType,
        inputs: NodeInputs,
        config: Optional[NodeConfig] = None,
        timeout: Optional[int] = None,
        parent_context: Optional[ExecutionContext] = None
    ) -> ExecutionResult:
        """
        Execute a single node with proper error handling and resource management
        """
        # Create execution context
        context = ExecutionContext(
            node_id=node_id,
            node_type=node_type,
            inputs=inputs,
            config=config,
            parent_context=parent_context
        )
        
        try:
            # Apply backpressure if enabled
            if self.backpressure:
                await self.backpressure.wait_for_capacity()
            
            # Execute with concurrency control and timeout
            async with self.semaphore:
                context.start_time = datetime.now()
                context.status = ExecutionStatus.RUNNING
                
                try:
                    # Execute with timeout
                    timeout = timeout or self.default_timeout
                    async with asyncio.timeout(timeout):
                        result = await self._process_node(context)
                        
                    context.status = ExecutionStatus.COMPLETED
                    context.result = result
                    
                    # Update backpressure metrics
                    if self.backpressure:
                        execution_time = (datetime.now() - context.start_time).total_seconds()
                        await self.backpressure.record_execution(node_id, execution_time)
                    
                    return ExecutionResult(
                        success=True,
                        node_id=node_id,
                        result=result,
                        context=context
                    )
                    
                except asyncio.TimeoutError:
                    context.status = ExecutionStatus.TIMEOUT
                    context.error = f"Execution timed out after {timeout}s"
                    logger.error(f"Node {node_id} execution timed out")
                    return ExecutionResult(
                        success=False,
                        node_id=node_id,
                        error=context.error,
                        context=context
                    )
                    
        except Exception as e:
            context.status = ExecutionStatus.FAILED
            context.error = str(e)
            logger.error(f"Error executing node {node_id}: {str(e)}")
            return ExecutionResult(
                success=False,
                node_id=node_id,
                error=str(e),
                context=context
            )
            
        finally:
            context.end_time = datetime.now()
            
    async def _process_node(self, context: ExecutionContext) -> Any:
        """Process a node based on its type"""
        # Import node processors here to avoid circular imports
        from nodes.agent_node import process_agent_node
        from nodes.task_node import process_task_node
        from nodes.tool_node import process_tool_node
        from nodes.output_node import process_output_node
        from nodes.chat_node import process_chat_node
        from nodes.logic_node import process_logic_node
        from nodes.delay_node import process_delay_node
        from nodes.trigger_node import process_trigger_node
        
        # Map node types to their processors
        processors = {
            NodeType.AGENT: process_agent_node,
            NodeType.TASK: process_task_node,
            NodeType.TOOL: process_tool_node,
            NodeType.OUTPUT: process_output_node,
            NodeType.CHAT: process_chat_node,
            NodeType.LOGIC: process_logic_node,
            NodeType.DELAY: process_delay_node,
            NodeType.TRIGGER: process_trigger_node
        }
        
        processor = processors.get(context.node_type)
        if not processor:
            raise ValueError(f"Unsupported node type: {context.node_type}")
            
        return await processor(context.inputs, context.config)