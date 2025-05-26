from typing import Dict, Any, Optional, Union, List
from enum import Enum
from pydantic import BaseModel, Field
import base64
import json

class OutputType(str, Enum):
    """Supported output types for rich content rendering"""
    TEXT = "text"
    MARKDOWN = "markdown"
    HTML = "html"
    JSON = "json"
    IMAGE = "image"
    CHART = "chart"
    TABLE = "table"
    FILE = "file"
    CODE = "code"
    ERROR = "error"

class ChartType(str, Enum):
    """Supported chart types"""
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    AREA = "area"
    DONUT = "donut"

class FileType(str, Enum):
    """Supported file types"""
    PDF = "pdf"
    CSV = "csv"
    DOCX = "docx"
    XLSX = "xlsx"
    TXT = "txt"
    JSON = "json"

class RichOutputMetadata(BaseModel):
    """Metadata for rich output content"""
    title: Optional[str] = None
    description: Optional[str] = None
    chart_type: Optional[ChartType] = None
    file_type: Optional[FileType] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    language: Optional[str] = None  # For code blocks
    columns: Optional[List[str]] = None  # For tables
    image_format: Optional[str] = None  # png, jpg, svg
    encoding: Optional[str] = None  # base64, url, etc.

class RichOutput(BaseModel):
    """Standardized rich output format"""
    output_type: OutputType
    payload: Union[str, Dict[str, Any], List[Any]]
    metadata: Optional[RichOutputMetadata] = None
    raw_data: Optional[Any] = None  # Original data for fallback
    
    @classmethod
    def create_text(cls, content: str, title: str = None) -> 'RichOutput':
        """Create a text output"""
        return cls(
            output_type=OutputType.TEXT,
            payload=content,
            metadata=RichOutputMetadata(title=title) if title else None
        )
    
    @classmethod
    def create_markdown(cls, content: str, title: str = None) -> 'RichOutput':
        """Create a markdown output"""
        return cls(
            output_type=OutputType.MARKDOWN,
            payload=content,
            metadata=RichOutputMetadata(title=title) if title else None
        )
    
    @classmethod
    def create_html(cls, content: str, title: str = None) -> 'RichOutput':
        """Create an HTML output"""
        return cls(
            output_type=OutputType.HTML,
            payload=content,
            metadata=RichOutputMetadata(title=title) if title else None
        )
    
    @classmethod
    def create_json(cls, data: Dict[str, Any], title: str = None) -> 'RichOutput':
        """Create a JSON output"""
        return cls(
            output_type=OutputType.JSON,
            payload=data,
            metadata=RichOutputMetadata(title=title) if title else None
        )
    
    @classmethod
    def create_image(cls, image_data: str, image_format: str = "png", title: str = None, encoding: str = "base64") -> 'RichOutput':
        """Create an image output"""
        return cls(
            output_type=OutputType.IMAGE,
            payload=image_data,
            metadata=RichOutputMetadata(
                title=title,
                image_format=image_format,
                encoding=encoding
            )
        )
    
    @classmethod
    def create_chart(cls, chart_data: Dict[str, Any], chart_type: ChartType, title: str = None) -> 'RichOutput':
        """Create a chart output"""
        return cls(
            output_type=OutputType.CHART,
            payload=chart_data,
            metadata=RichOutputMetadata(
                title=title,
                chart_type=chart_type
            )
        )
    
    @classmethod
    def create_table(cls, data: List[Dict[str, Any]], columns: List[str] = None, title: str = None) -> 'RichOutput':
        """Create a table output"""
        if columns is None and data:
            columns = list(data[0].keys()) if data else []
        
        return cls(
            output_type=OutputType.TABLE,
            payload=data,
            metadata=RichOutputMetadata(
                title=title,
                columns=columns
            )
        )
    
    @classmethod
    def create_file(cls, file_data: str, file_name: str, file_type: FileType, title: str = None, encoding: str = "base64") -> 'RichOutput':
        """Create a file output"""
        return cls(
            output_type=OutputType.FILE,
            payload=file_data,
            metadata=RichOutputMetadata(
                title=title,
                file_name=file_name,
                file_type=file_type,
                encoding=encoding,
                file_size=len(file_data) if isinstance(file_data, str) else None
            )
        )
    
    @classmethod
    def create_code(cls, code: str, language: str = "python", title: str = None) -> 'RichOutput':
        """Create a code output"""
        return cls(
            output_type=OutputType.CODE,
            payload=code,
            metadata=RichOutputMetadata(
                title=title,
                language=language
            )
        )
    
    @classmethod
    def create_error(cls, error_message: str, title: str = "Error") -> 'RichOutput':
        """Create an error output"""
        return cls(
            output_type=OutputType.ERROR,
            payload=error_message,
            metadata=RichOutputMetadata(title=title)
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "output_type": self.output_type.value,
            "payload": self.payload
        }
        
        if self.metadata:
            result["metadata"] = self.metadata.dict(exclude_none=True)
        
        if self.raw_data is not None:
            result["raw_data"] = self.raw_data
            
        return result

def detect_output_type(content: Any) -> OutputType:
    """Auto-detect output type from content"""
    if isinstance(content, str):
        content_lower = content.lower().strip()
        
        # Check for HTML
        if content_lower.startswith('<') and ('</html>' in content_lower or '<div' in content_lower or '<p>' in content_lower):
            return OutputType.HTML
        
        # Check for Markdown
        if any(marker in content for marker in ['# ', '## ', '**', '*', '```', '[', '](', '|']):
            return OutputType.MARKDOWN
        
        # Check for base64 image
        if content.startswith('data:image/') or (len(content) > 100 and content.replace('+', '').replace('/', '').replace('=', '').isalnum()):
            return OutputType.IMAGE
        
        # Check for code patterns
        if any(keyword in content for keyword in ['def ', 'function ', 'class ', 'import ', 'from ', '<?php', '<script']):
            return OutputType.CODE
        
        # Default to text
        return OutputType.TEXT
    
    elif isinstance(content, (dict, list)):
        # Check if it's chart data
        if isinstance(content, dict) and any(key in content for key in ['labels', 'datasets', 'data', 'x', 'y']):
            return OutputType.CHART
        
        # Check if it's table data
        if isinstance(content, list) and content and isinstance(content[0], dict):
            return OutputType.TABLE
        
        # Default to JSON
        return OutputType.JSON
    
    else:
        return OutputType.TEXT

def smart_format_output(content: Any, title: str = None) -> RichOutput:
    """Automatically format content into appropriate rich output"""
    output_type = detect_output_type(content)
    
    if output_type == OutputType.TEXT:
        return RichOutput.create_text(str(content), title)
    elif output_type == OutputType.MARKDOWN:
        return RichOutput.create_markdown(content, title)
    elif output_type == OutputType.HTML:
        return RichOutput.create_html(content, title)
    elif output_type == OutputType.JSON:
        return RichOutput.create_json(content if isinstance(content, dict) else {"data": content}, title)
    elif output_type == OutputType.CHART:
        chart_type = ChartType.BAR  # Default, could be smarter
        return RichOutput.create_chart(content, chart_type, title)
    elif output_type == OutputType.TABLE:
        return RichOutput.create_table(content, title=title)
    elif output_type == OutputType.CODE:
        # Try to detect language
        language = "python"  # Default
        if "<?php" in content:
            language = "php"
        elif "<script" in content or "function(" in content:
            language = "javascript"
        elif "SELECT" in content.upper() or "FROM" in content.upper():
            language = "sql"
        
        return RichOutput.create_code(content, language, title)
    else:
        return RichOutput.create_text(str(content), title) 