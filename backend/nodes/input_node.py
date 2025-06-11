import logging
import base64
from typing import Dict, Any
from models.data import NodeData
from frameworks.file_handler import FileHandler
from datetime import datetime

# NEW: Import multimodal processor for LLM-centric processing
try:
    from core.multimodal_processor import process_multimodal_input
    MULTIMODAL_AVAILABLE = True
except ImportError:
    MULTIMODAL_AVAILABLE = False
    logging.warning("Multimodal processor not available - falling back to basic file handling")

logger = logging.getLogger(__name__)

class InputNode:
    """Enhanced input node for collecting user inputs and multimodal data with LLM processing"""
    
    def __init__(self):
        self.file_handler = FileHandler()

    async def process(
        self, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Enhanced input node processing with LLM-centric multimodal support"""
        try:
            # Get the input configuration
            input_type = node_data.get("inputType", "text")
            input_value = node_data.get("value", "")
            input_label = node_data.get("label", "Input")
            
            logger.info(f"🎯 Processing input node: {input_label} (type: {input_type})")
            
            # NEW: Handle multimodal input with LLM processing
            if input_type == "multimodal" and input_value:
                return await self._process_multimodal_input(input_value, input_label, context)
            
            # Handle file upload (legacy support)
            elif input_type == "file" and input_value:
                return await self._process_file_upload(input_value, input_label, context)
            
            # Handle text and URL inputs
            else:
                return await self._process_text_input(input_value, input_label, input_type, context)
                
        except Exception as e:
            logger.error(f"Error in input node: {str(e)}")
            return NodeData.from_error(f"Input processing failed: {str(e)}")

    async def _process_multimodal_input(
        self, 
        input_value: Any, 
        input_label: str, 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process multimodal input using LLM-powered multimodal processor"""
        try:
            if not MULTIMODAL_AVAILABLE:
                logger.warning("Multimodal processor not available, falling back to file processing")
                return await self._process_file_upload(input_value, input_label, context)
            
            # Extract file data from input value
            file_data = None
            filename = "unknown"
            
            if isinstance(input_value, dict):
                # Handle standardized multimodal output from frontend
                if "filename" in input_value and "content" in input_value:
                    filename = input_value["filename"]
                    file_data = input_value.get("content", "")
                elif "value" in input_value and "file_upload" in input_value["value"]:
                    file_upload = input_value["value"]["file_upload"]
                    filename = file_upload.get("filename", "unknown")
                    file_data = file_upload.get("content", "")
                elif "file_upload" in input_value:
                    file_upload = input_value["file_upload"]
                    filename = file_upload.get("filename", "unknown")
                    file_data = file_upload.get("content", "")
            
            if not file_data:
                return NodeData.from_error("No file data found in multimodal input")
            
            logger.info(f"🤖 Processing multimodal file: {filename}")
            
            # Use the multimodal processor for LLM-powered analysis
            multimodal_result = await process_multimodal_input(
                file_data=file_data,
                filename=filename,
                context=context or {}
            )
            
            if multimodal_result.get("success"):
                # 🚀 STANDARDIZED MULTIMODAL RESULT FOR LLM-CENTRIC WORKFLOW
                standardized_result = {
                    "success": True,
                    "data": {
                        "type": "multimodal_input",
                        "input_type": "multimodal",
                        "label": input_label,
                        "filename": multimodal_result.get("filename", filename),
                        "file_type": multimodal_result.get("type", "unknown"),
                        "processed_content": self._extract_content_from_multimodal_result(multimodal_result),
                        "extracted_entities": self._extract_entities_from_multimodal_result(multimodal_result),
                        "multimodal_analysis": multimodal_result  # Include full analysis
                    },
                    "error": None,
                    "metadata": {
                        "node_type": "input",
                        "input_type": "multimodal",
                        "filename": multimodal_result.get("filename", filename),
                        "file_type": multimodal_result.get("type", "unknown"),
                        "api_used": multimodal_result.get("api_used"),
                        "processing_timestamp": multimodal_result.get("timestamp", datetime.now().isoformat()),
                        "llm_processed": True
                    }
                }
                
                logger.info(f"✅ Multimodal processing successful: {filename} ({multimodal_result.get('type')})")
                return NodeData.from_value(standardized_result)
            else:
                error_msg = multimodal_result.get("error", "Multimodal processing failed")
                logger.error(f"❌ Multimodal processing failed: {error_msg}")
                return NodeData.from_error(f"Multimodal processing failed: {error_msg}")
                
        except Exception as e:
            logger.error(f"Error in multimodal processing: {str(e)}")
            return NodeData.from_error(f"Multimodal processing error: {str(e)}")

    def _extract_content_from_multimodal_result(self, result: Dict[str, Any]) -> str:
        """Extract the main content from multimodal processing result"""
        # Try different content sources based on file type
        file_type = result.get("type", "")
        
        if file_type == "image":
            analysis = result.get("analysis", {})
            return analysis.get("description", "") or analysis.get("extracted_text", "")
        elif file_type == "audio":
            transcription = result.get("transcription", {})
            return transcription.get("text", "")
        elif file_type == "document":
            return result.get("content", "")
        else:
            # Fallback: try to find any text content
            return (result.get("content", "") or 
                   result.get("analysis", {}).get("description", "") or 
                   result.get("transcription", {}).get("text", "") or
                   "Content extracted")

    def _extract_entities_from_multimodal_result(self, result: Dict[str, Any]) -> list:
        """Extract entities/structure from multimodal processing result"""
        # Try to extract structured data
        structure = result.get("structure", {})
        if structure:
            return structure.get("extracted_entities", [])
        
        # Fallback: create basic entities from content
        content = self._extract_content_from_multimodal_result(result)
        if content:
            return [
                {"type": "content", "value": content[:100] + "..." if len(content) > 100 else content},
                {"type": "file_type", "value": result.get("type", "unknown")},
                {"type": "filename", "value": result.get("filename", "unknown")}
            ]
        
        return []

    async def _process_file_upload(self, input_value: Any, input_label: str, context: Dict[str, Any]) -> NodeData:
        """Process file upload with basic extraction (legacy method)"""
        try:
            file_content = await self._extract_file_content(input_value)
            if file_content:
                # 🚀 STANDARDIZED FILE INPUT RESULT
                standardized_result = {
                    "success": True,
                    "data": {
                        "type": "file_input",
                        "input_type": "file",
                        "label": input_label,
                        "file_content": file_content["content"],
                        "filename": file_content["filename"],
                        "file_type": file_content["type"],
                        "extracted_text": file_content.get("extracted_text", ""),
                        "file_size": file_content.get("size", 0)
                    },
                    "error": None,
                    "metadata": {
                        "node_type": "input",
                        "input_type": "file",
                        "filename": file_content["filename"],
                        "file_type": file_content["type"],
                        "timestamp": context.get("execution_timestamp", datetime.now().isoformat()),
                        "llm_processed": False
                    }
                }
                
                logger.info(f"File input processed: {input_label} - {file_content['filename']}")
                return NodeData.from_value(standardized_result)
            else:
                return NodeData.from_error("Failed to process file upload")
                
        except Exception as e:
            logger.error(f"Error processing file upload: {str(e)}")
            return NodeData.from_error(f"File upload processing failed: {str(e)}")

    async def _process_text_input(
        self, 
        input_value: Any, 
        input_label: str, 
        input_type: str, 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process text and URL inputs"""
        try:
            # 🚀 STANDARDIZED TEXT INPUT RESULT
            standardized_result = {
                "success": True,
                "data": {
                    "type": "text_input",
                    "input_type": input_type,
                    "label": input_label,
                    "value": input_value,
                    "text_content": str(input_value)  # Ensure string format for downstream processing
                },
                "error": None,
                "metadata": {
                    "node_type": "input",
                    "input_type": input_type,
                    "value_length": len(str(input_value)),
                    "timestamp": context.get("execution_timestamp", datetime.now().isoformat()),
                    "llm_processed": False
                }
            }
            
            logger.info(f"Input node processed: {input_label} = {str(input_value)[:100]}...")
            return NodeData.from_value(standardized_result)
            
        except Exception as e:
            logger.error(f"Error processing text input: {str(e)}")
            return NodeData.from_error(f"Text input processing failed: {str(e)}")

    async def _extract_file_content(self, input_value: Any) -> Dict[str, Any]:
        """Extract file content (legacy method)"""
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