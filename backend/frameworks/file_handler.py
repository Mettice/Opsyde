import base64
import logging
from typing import Dict, Optional, Union
import json

logger = logging.getLogger(__name__)

class FileData:
    """Standardized file data structure for the entire system"""
    def __init__(self, content: str = None, filename: str = None, file_type: str = None):
        self.content = content
        self.filename = filename
        self.file_type = file_type

    def to_dict(self) -> Dict:
        return {
            "file_upload": {
                "content": self.content,
                "filename": self.filename,
                "type": self.file_type
            }
        }

    @classmethod
    def from_input(cls, data: Union[Dict, str, None]) -> Optional['FileData']:
        """Extract file data from any input structure"""
        try:
            if not data:
                return None

            # Case 1: Direct file_upload dict
            if isinstance(data, dict):
                if "file_upload" in data:
                    file_data = data["file_upload"]
                    return cls(
                        content=file_data.get("content"),
                        filename=file_data.get("filename"),
                        file_type=file_data.get("type")
                    )
                
                # Case 2: Nested in inputs
                if "inputs" in data:
                    inputs = data["inputs"]
                    if isinstance(inputs, dict):
                        if "file_upload" in inputs:
                            file_data = inputs["file_upload"]
                            return cls(
                                content=file_data.get("content"),
                                filename=file_data.get("filename"),
                                file_type=file_data.get("type")
                            )
                        # Case 3: In value
                        if "value" in inputs and isinstance(inputs["value"], dict):
                            value = inputs["value"]
                            if "file_upload" in value:
                                file_data = value["file_upload"]
                                return cls(
                                    content=file_data.get("content"),
                                    filename=file_data.get("filename"),
                                    file_type=file_data.get("type")
                                )

            logger.debug("No file data found in input structure")
            return None

        except Exception as e:
            logger.error(f"Error extracting file data: {str(e)}")
            return None

    def is_valid(self) -> bool:
        """Check if file data is valid"""
        return bool(self.content and self.filename)

    def is_pdf(self) -> bool:
        """Check if file is a PDF"""
        if not self.filename:
            return False
        return (
            self.filename.lower().endswith('.pdf') or
            (self.file_type and 'pdf' in self.file_type.lower())
        )

    def get_content_bytes(self) -> Optional[bytes]:
        """Get content as bytes, handling base64 if needed"""
        try:
            if not self.content:
                return None
                
            if isinstance(self.content, str):
                if "base64," in self.content:
                    self.content = self.content.split("base64,")[1]
                return base64.b64decode(self.content)
            
            return None
        except Exception as e:
            logger.error(f"Error decoding content: {str(e)}")
            return None 