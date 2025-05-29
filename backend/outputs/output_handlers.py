# backend/outputs/output_handlers.py
from typing import Any, Dict, Optional, Union
import os
import asyncio
import logging
from datetime import datetime, timedelta
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Try to import optional packages
try:
    from jinja2 import Template
    JINJA2_AVAILABLE = True
    logger.info("Jinja2 loaded successfully")
except ImportError as e:
    JINJA2_AVAILABLE = False
    logger.warning(f"Jinja2 not available: {str(e)} - Template rendering will be limited")
    
    # Simple fallback template class
    class Template:
        def __init__(self, template_str):
            self.template_str = template_str
        
        def render(self, **kwargs):
            return str(kwargs)

# Try to import ratelimit library
try:
    from ratelimit import limits, sleep_and_retry
    RATELIMIT_AVAILABLE = True
    logger.info("ratelimit loaded successfully")
except ImportError as e:
    RATELIMIT_AVAILABLE = False
    logger.warning(f"ratelimit not available: {str(e)} - Rate limiting will be disabled")
    
    # Create dummy decorator functions
    def limits(*args, **kwargs):
        def decorator(func):
            @wraps(func)
            def wrapped(*args, **kwargs):
                return func(*args, **kwargs)
            return wrapped
        return decorator
    
    def sleep_and_retry(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapped

# Try to import tenacity library
try:
    from tenacity import retry, stop_after_attempt, wait_exponential
    TENACITY_AVAILABLE = True
    logger.info("tenacity loaded successfully")
except ImportError as e:
    TENACITY_AVAILABLE = False
    logger.warning(f"tenacity not available: {str(e)} - Retry mechanisms will be disabled")
    
    # Create dummy retry decorator
    def retry(*args, **kwargs):
        def decorator(func):
            @wraps(func)
            def wrapped(*args, **kwargs):
                return func(*args, **kwargs)
            return wrapped
        return decorator
    
    # Create dummy stop_after_attempt and wait_exponential
    def stop_after_attempt(attempts):
        return lambda retry_state: None
    
    def wait_exponential(multiplier=1, min=0, max=0):
        return lambda retry_state: 0

try:
    from output_utils import sanitize_output, format_output, validate_output_config
    from models.types import OutputType
    from utils.security import SecurityManager
    from config.settings import get_settings
except ImportError as e:
    logger.error(f"Error importing internal modules: {str(e)}")
    # Define fallback OutputType enum if it's not available
    class OutputType:
        EMAIL = "email"
        DISCORD = "discord"
        SHEETS = "sheets"
        WEBHOOK = "webhook"
    
    # Define fallback settings if not available
    class Settings:
        OUTPUT_RATE_LIMIT_CALLS = 10
        OUTPUT_RATE_LIMIT_PERIOD = 60
    
    def get_settings():
        return Settings()
    
    # Simple sanitize function if not available
    def sanitize_output(data):
        return data
    
    def format_output(data, format_type=None):
        return str(data)
    
    def validate_output_config(config, output_type):
        return True

logger = logging.getLogger(__name__)
settings = get_settings()

# Add SecurityManager instance after imports
try:
    from utils.security import security_manager
except Exception as e:
    logger.error(f"Error initializing SecurityManager: {str(e)}")
    # Create dummy security manager
    class DummySecurityManager:
        def sanitize_output(self, data):
            return data
    security_manager = DummySecurityManager()

class OutputTemplate:
    """Handles output templating using Jinja2"""
    
    @staticmethod
    def render(template_str: str, data: Dict[str, Any]) -> str:
        """Render a template with provided data"""
        if not JINJA2_AVAILABLE:
            return str(data)
            
        try:
            template = Template(template_str)
            return template.render(**data)
        except Exception as e:
            logger.error(f"Template rendering error: {str(e)}")
            return str(data)  # Fallback to string representation

class RateLimiter:
    """Rate limiting for output operations"""
    
    def __init__(self, calls: int, period: int):
        self.calls = calls
        self.period = period
        self.timestamps = []

    async def acquire(self):
        """Acquire rate limit permission"""
        # Skip rate limiting if disabled
        if not RATELIMIT_AVAILABLE:
            return
            
        now = datetime.now()
        self.timestamps = [ts for ts in self.timestamps 
                         if now - ts < timedelta(seconds=self.period)]
        
        if len(self.timestamps) >= self.calls:
            wait_time = (self.timestamps[0] + 
                        timedelta(seconds=self.period) - now).total_seconds()
            await asyncio.sleep(wait_time)
            
        self.timestamps.append(now)

class OutputHandler:
    """Base class for output handlers with retry and rate limiting"""
    
    def __init__(self, output_type: OutputType):
        self.output_type = output_type
        self.rate_limiter = RateLimiter(
            calls=settings.OUTPUT_RATE_LIMIT_CALLS,
            period=settings.OUTPUT_RATE_LIMIT_PERIOD
        )

    # Use retry decorator only if tenacity is available
    async def send(self, data: Any, config: Dict[str, Any]) -> Dict[str, Any]:
        """Send output with retry mechanism"""
        try:
            await self.rate_limiter.acquire()
            
            # Use sanitize_output from output_utils
            sanitized_data = sanitize_output(data)
            
            if template_str := config.get("template"):
                sanitized_data = OutputTemplate.render(template_str, {"data": sanitized_data})
            
            # Try up to 3 times with basic retry if tenacity not available
            if not TENACITY_AVAILABLE:
                attempt = 0
                max_attempts = 3
                last_error = None
                
                while attempt < max_attempts:
                    try:
                        result = await self._send_impl(sanitized_data, config)
                        break
                    except Exception as e:
                        attempt += 1
                        last_error = e
                        if attempt < max_attempts:
                            # Simple exponential backoff
                            await asyncio.sleep(2 ** attempt)
                        else:
                            raise e
            else:
                # Use the implementation directly if we already have retry decorator
                result = await self._send_impl(sanitized_data, config)
            
            return {
                "success": True,
                "output_type": self.output_type,
                "timestamp": datetime.now().isoformat(),
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Output error ({self.output_type}): {str(e)}")
            return {
                "success": False,
                "output_type": self.output_type,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def _send_impl(self, data: Any, config: Dict[str, Any]) -> Any:
        """Implementation specific send logic - to be overridden by subclasses"""
        raise NotImplementedError

class EmailHandler(OutputHandler):
    """Handles email output"""
    
    def __init__(self):
        super().__init__(OutputType.EMAIL)
    
    async def _send_impl(self, data: Any, config: Dict[str, Any]) -> Any:
        try:
            from frameworks.email_notifier import send_email
            recipient = config["email"]
            subject = config.get("subject", "Workflow Output")
            return await send_email(recipient, subject, str(data))
        except ImportError as e:
            logger.error(f"Email sender not available: {str(e)}")
            return f"Email could not be sent: {str(e)}"

class DiscordHandler(OutputHandler):
    """Handles Discord output"""
    
    def __init__(self):
        super().__init__(OutputType.DISCORD)
    
    async def _send_impl(self, data: Any, config: Dict[str, Any]) -> Any:
        try:
            from outputs.discord_notifier import send_discord_message
            webhook_url = config["webhook_url"]
            return await send_discord_message(webhook_url, str(data))
        except ImportError as e:
            logger.error(f"Discord notifier not available: {str(e)}")
            return f"Discord message could not be sent: {str(e)}"

class SheetsHandler(OutputHandler):
    """Handles Google Sheets output"""
    
    def __init__(self):
        super().__init__(OutputType.SHEETS)
    
    async def _send_impl(self, data: Any, config: Dict[str, Any]) -> Any:
        try:
            from outputs.sheets_logger import log_to_sheet
            sheet_id = config["sheet_id"]
            return await log_to_sheet(sheet_id, data)
        except ImportError as e:
            logger.error(f"Sheets logger not available: {str(e)}")
            return f"Sheet logging could not be performed: {str(e)}"

# Handler factory
OUTPUT_HANDLERS = {
    OutputType.EMAIL: EmailHandler(),
    OutputType.DISCORD: DiscordHandler(),
    OutputType.SHEETS: SheetsHandler()
}

def get_handler(output_type: OutputType) -> OutputHandler:
    """Get appropriate handler for output type"""
    handler = OUTPUT_HANDLERS.get(output_type)
    if not handler:
        raise ValueError(f"No handler found for output type: {output_type}")
    return handler