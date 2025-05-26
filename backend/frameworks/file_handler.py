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

class FileHandler:
    """Handler for file processing operations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def process_file(self, file_data: FileData) -> Dict:
        """Process file and extract content"""
        try:
            if not file_data or not file_data.is_valid():
                return {"error": "Invalid file data"}
            
            result = {
                "filename": file_data.filename,
                "file_type": file_data.file_type,
                "content": file_data.content
            }
            
            # Extract text content based on file type
            if file_data.is_pdf():
                result["extracted_text"] = await self._extract_pdf_text(file_data)
            elif file_data.file_type == "text/plain":
                result["extracted_text"] = await self._extract_text_content(file_data)
            else:
                result["extracted_text"] = await self._extract_text_content(file_data)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error processing file: {str(e)}")
            return {"error": f"File processing failed: {str(e)}"}
    
    async def _extract_pdf_text(self, file_data: FileData) -> str:
        """Extract text from PDF file"""
        try:
            content_bytes = file_data.get_content_bytes()
            if not content_bytes:
                return "No content available"
            
            try:
                import PyPDF2
                import io
                
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
            except ImportError:
                return f"PDF file ({len(content_bytes)} bytes) - Install PyPDF2 for text extraction"
            except Exception as e:
                return f"PDF file ({len(content_bytes)} bytes) - Error extracting text: {str(e)}"
                
        except Exception as e:
            self.logger.error(f"Error extracting PDF text: {str(e)}")
            return f"Error extracting PDF text: {str(e)}"
    
    async def _extract_text_content(self, file_data: FileData) -> str:
        """Extract text content from file"""
        try:
            content_bytes = file_data.get_content_bytes()
            if not content_bytes:
                return "No content available"
            
            try:
                return content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                return f"Binary file content ({len(content_bytes)} bytes)"
                
        except Exception as e:
            self.logger.error(f"Error extracting text content: {str(e)}")
            return f"Error extracting text content: {str(e)}" 