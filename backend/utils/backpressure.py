# utils/backpressure.py
import asyncio
from typing import AsyncGenerator, Any, Callable, TypeVar
import logging

logger = logging.getLogger(__name__)
T = TypeVar('T')

class BackpressureHandler:
    """Handles backpressure in async streams"""
    
    def __init__(self, max_queue_size: int = 100, processing_delay: float = 0.01):
        self.max_queue_size = max_queue_size
        self.processing_delay = processing_delay
        self.queue = asyncio.Queue(maxsize=max_queue_size)
        
    async def produce(self, item: Any) -> None:
        """
        Add an item to the queue with backpressure handling.
        
        If the queue is full, this method will block until space is available.
        """
        # If queue is approaching capacity, add delay for backpressure
        if self.queue.qsize() > self.max_queue_size * 0.8:
            logger.debug(f"Backpressure: delaying producer (queue size: {self.queue.qsize()})")
            await asyncio.sleep(self.processing_delay)
            
        await self.queue.put(item)
        
    async def consume_stream(self) -> AsyncGenerator[Any, None]:
        """
        Consume items from the queue.
        
        Yields:
            Items from the queue as they become available
        """
        while True:
            try:
                item = await self.queue.get()
                
                # Check for end marker
                if item is None:
                    break
                    
                yield item
                
                # Mark task as done
                self.queue.task_done()
                
            except asyncio.CancelledError:
                # Handle cancellation
                logger.debug("Consumer task was cancelled")
                break
                
    async def transform_with_backpressure(
        source_stream: AsyncGenerator[T, None],
        transform_fn: Callable[[T], Any],
        max_queue_size: int = 100
    ) -> AsyncGenerator[Any, None]:
        """
        Transform a stream with backpressure handling.
        
        Args:
            source_stream: Source async generator
            transform_fn: Function to transform each item
            max_queue_size: Maximum queue size for backpressure
            
        Yields:
            Transformed items
        """
        handler = BackpressureHandler(max_queue_size=max_queue_size)
        
        # Start consumer task
        consumer_task = asyncio.create_task(
            handler.consume_stream().__aiter__().__anext__()
        )
        
        try:
            async for item in source_stream:
                # Transform the item
                transformed = transform_fn(item)
                
                # Add to queue with backpressure
                await handler.produce(transformed)
                
                # Yield items from consumer
                while True:
                    try:
                        result = await asyncio.wait_for(
                            handler.consume_stream().__aiter__().__anext__(),
                            timeout=0
                        )
                        yield result
                    except asyncio.TimeoutError:
                        # No items ready yet
                        break
                        
            # Signal end of stream
            await handler.produce(None)
            
            # Yield remaining items
            async for item in handler.consume_stream():
                yield item
                
        finally:
            # Clean up
            if not consumer_task.done():
                consumer_task.cancel()
                try:
                    await consumer_task
                except (asyncio.CancelledError, StopAsyncIteration):
                    pass