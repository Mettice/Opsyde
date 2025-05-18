import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path

# Configure default logging format
DEFAULT_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
JSON_FORMAT = {
    'timestamp': '%(asctime)s',
    'level': '%(levelname)s',
    'name': '%(name)s',
    'message': '%(message)s'
}

class JSONFormatter(logging.Formatter):
    """Custom formatter for JSON-structured logs"""
    
    def __init__(self, fmt_dict: Dict[str, str] = None):
        super().__init__()
        self.fmt_dict = fmt_dict if fmt_dict is not None else JSON_FORMAT
        
    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as JSON"""
        log_dict = {}
        
        # Apply format dictionary
        for key, fmt in self.fmt_dict.items():
            log_dict[key] = self._format_value(record, fmt)
            
        # Add extra fields from record
        if hasattr(record, 'extra_fields'):
            log_dict.update(record.extra_fields)
            
        # Add exception info if present
        if record.exc_info:
            log_dict['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_dict)
        
    def _format_value(self, record: logging.LogRecord, fmt: str) -> str:
        """Format a single value using the record"""
        try:
            return fmt % record.__dict__
        except:
            return fmt

class StructuredLogger:
    """Logger class with structured logging capabilities"""
    
    def __init__(self, name: str, level: str = 'INFO'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        self.setup_handlers()
        
    def setup_handlers(self):
        """Setup console and file handlers"""
        # Console handler with standard formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter(DEFAULT_FORMAT))
        self.logger.addHandler(console_handler)
        
        # JSON file handler
        log_dir = Path('logs')
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(
            log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.json"
        )
        file_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(file_handler)
        
    def _log(self, level: str, message: str, extra: Optional[Dict[str, Any]] = None):
        """Internal logging method with extra fields support"""
        if extra:
            extra_record = {'extra_fields': extra}
        else:
            extra_record = None
            
        getattr(self.logger, level.lower())(message, extra=extra_record)
        
    def info(self, message: str, **kwargs):
        """Log info message with optional extra fields"""
        self._log('INFO', message, kwargs)
        
    def error(self, message: str, **kwargs):
        """Log error message with optional extra fields"""
        self._log('ERROR', message, kwargs)
        
    def warning(self, message: str, **kwargs):
        """Log warning message with optional extra fields"""
        self._log('WARNING', message, kwargs)
        
    def debug(self, message: str, **kwargs):
        """Log debug message with optional extra fields"""
        self._log('DEBUG', message, kwargs)
        
    def critical(self, message: str, **kwargs):
        """Log critical message with optional extra fields"""
        self._log('CRITICAL', message, kwargs)

def get_logger(name: str) -> StructuredLogger:
    """Get or create a structured logger instance"""
    return StructuredLogger(name)

def setup_logging(level: str = 'INFO') -> logging.Logger:
    """Setup and return the root logger with standard configuration"""
    logger = logging.getLogger('backend')
    logger.setLevel(getattr(logging, level.upper()))
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(DEFAULT_FORMAT))
    logger.addHandler(console_handler)
    
    # Create file handler for JSON logs
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    file_handler = logging.FileHandler(
        log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.json"
    )
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)
    
    return logger

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format=DEFAULT_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Example usage:
# logger = get_logger(__name__)
# logger.info("Processing task", task_id="123", status="started")
# logger.error("Task failed", task_id="123", error="Connection timeout")
