import logging
import base64
from typing import Dict, Any
from models.data import NodeData
from frameworks.file_handler import FileHandler

logger = logging.getLogger(__name__)

class InputNode:
    """Input node for collecting user inputs and data"""
    
    def __init__(self):
        self.file_handler = FileHandler()

    async def process(
        self, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process input node - returns the configured input value or processes file uploads"""
        try:
            # Get the input configuration
            input_type = node_data.get("inputType", "text")
            input_value = node_data.get("value", "")
            input_label = node_data.get("label", "Input")
            
            # Check if this is a file upload
            if input_type == "file" and input_value:
                # Try to extract file content
                file_content = await self._process_file_upload(input_value)
                if file_content:
                    result = {
                        "type": "file_input_result",
                        "input_type": input_type,
                        "label": input_label,
                        "file_content": file_content["content"],
                        "filename": file_content["filename"],
                        "file_type": file_content["type"],
                        "extracted_text": file_content.get("extracted_text", ""),
                        "timestamp": context.get("execution_timestamp")
                    }
                    
                    logger.info(f"File input processed: {input_label} - {file_content['filename']}")
                    return NodeData.from_value(result)
            
            # For text inputs or when file processing fails
            result = {
                "type": "input_result",
                "input_type": input_type,
                "label": input_label,
                "value": input_value,
                "timestamp": context.get("execution_timestamp")
            }
            
            logger.info(f"Input node processed: {input_label} = {str(input_value)[:100]}...")
            
            return NodeData.from_value(result)
            
        except Exception as e:
            logger.error(f"Error in input node: {str(e)}")
            return NodeData.from_error(f"Input processing failed: {str(e)}")

    async def _process_file_upload(self, input_value: Any) -> Dict[str, Any]:
        """Process file upload and extract content"""
        try:
            # Handle different input value structures
            file_data = None
            
            if isinstance(input_value, dict):
                # Check for file_upload in value
                if "value" in input_value and "file_upload" in input_value["value"]:
                    file_data = input_value["value"]["file_upload"]
                elif "file_upload" in input_value:
                    file_data = input_value["file_upload"]
            
            if not file_data:
                logger.warning("No file data found in input value")
                return None
            
            # Extract file information
            filename = file_data.get("filename", "unknown")
            content = file_data.get("content", "")
            file_type = file_data.get("type", "")
            
            if not content:
                logger.warning("No file content found")
                return None
            
            # Decode base64 content if needed
            try:
                if content.startswith("data:"):
                    # Remove data URL prefix
                    content = content.split(",")[1]
                
                decoded_content = base64.b64decode(content)
                
                # Extract text content based on file type
                extracted_text = ""
                if file_type == "text/plain":
                    extracted_text = decoded_content.decode('utf-8')
                elif file_type == "application/pdf":
                    # For PDF files, we'll need to use a PDF parser
                    extracted_text = await self._extract_pdf_text(decoded_content)
                elif file_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
                    # For Word documents
                    extracted_text = await self._extract_doc_text(decoded_content, file_type)
                else:
                    # Try to decode as text
                    try:
                        extracted_text = decoded_content.decode('utf-8')
                    except:
                        extracted_text = f"Binary file content ({len(decoded_content)} bytes)"
                
                return {
                    "filename": filename,
                    "type": file_type,
                    "content": content,  # Keep original base64
                    "extracted_text": extracted_text,
                    "size": len(decoded_content)
                }
                
            except Exception as e:
                logger.error(f"Error decoding file content: {e}")
                return {
                    "filename": filename,
                    "type": file_type,
                    "content": content,
                    "extracted_text": f"Error extracting text: {str(e)}",
                    "size": 0
                }
                
        except Exception as e:
            logger.error(f"Error processing file upload: {e}")
            return None

    async def _extract_pdf_text(self, pdf_content: bytes) -> str:
        """Extract text from PDF content"""
        try:
            import PyPDF2
            import io
            
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except ImportError:
            logger.warning("PyPDF2 not available for PDF text extraction")
            return f"PDF file ({len(pdf_content)} bytes) - Install PyPDF2 for text extraction"
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return f"PDF file ({len(pdf_content)} bytes) - Error extracting text: {str(e)}"

    async def _extract_doc_text(self, doc_content: bytes, file_type: str) -> str:
        """Extract text from Word document content"""
        try:
            import docx
            import io
            
            if file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                # DOCX file
                doc = docx.Document(io.BytesIO(doc_content))
                text = ""
                for paragraph in doc.paragraphs:
                    text += paragraph.text + "\n"
                return text.strip()
            else:
                # DOC file - more complex, might need python-docx2txt or similar
                return f"Word document ({len(doc_content)} bytes) - Install python-docx for text extraction"
        except ImportError:
            logger.warning("python-docx not available for Word document text extraction")
            return f"Word document ({len(doc_content)} bytes) - Install python-docx for text extraction"
        except Exception as e:
            logger.error(f"Error extracting Word document text: {e}")
            return f"Word document ({len(doc_content)} bytes) - Error extracting text: {str(e)}"

async def process_input_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Process function for input nodes"""
    input_node = InputNode()
    return await input_node.process(node_data, inputs, context or {}) 