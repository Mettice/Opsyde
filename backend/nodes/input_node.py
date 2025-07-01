import logging
import base64
from typing import Dict, Any, List
from models.data import NodeData
from frameworks.file_handler import FileHandler
from datetime import datetime
from nodes.base_node import BaseNode, NodeConfig
from pydantic import Field, BaseModel
from core.smart_mapper import SmartMapper
from models.schemas import NodeSchema, SchemaField, SchemaType

# NEW: Import multimodal processor for LLM-centric processing
try:
    from backend.core.multimodal_processor import process_multimodal_input
    MULTIMODAL_AVAILABLE = True
except ImportError:
    try:
        # Fallback for different import contexts
        from core.multimodal_processor import process_multimodal_input
        MULTIMODAL_AVAILABLE = True
    except ImportError:
        MULTIMODAL_AVAILABLE = False
        logging.warning("Multimodal processor not available - falling back to basic file handling")

logger = logging.getLogger(__name__)

class InputNodeConfig(NodeConfig):
    """Configuration for Input nodes"""
    label: str
    description: str
    inputType: str = Field(default="text", description="Input type")
    placeholder: str = Field(default="", description="Placeholder text")
    defaultValue: str = Field(default="", description="Default value")
    validation: Dict[str, Any] = Field(default_factory=dict, description="Input validation rules")
    
    # Enhanced input schema for inputs
    input_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'input': SchemaField(
                type=SchemaType.ANY,
                description='User input',
                optional=False
            ),
            'context': SchemaField(
                type=SchemaType.OBJECT,
                description='Context for input',
                optional=True
            ),
            'multimodalResult': SchemaField(
                type=SchemaType.OBJECT,
                description='Result from multimodal processing',
                optional=True
            ),
            'trigger_data': SchemaField(
                type=SchemaType.OBJECT,
                description='Data from trigger nodes',
                optional=True
            )
        },
        required_fields=['input']
    ))
    output_schema: NodeSchema = Field(default_factory=lambda: NodeSchema(
        fields={
            'result': SchemaField(
                type=SchemaType.ANY,
                description='Input result',
                optional=False
            ),
            'metadata': SchemaField(
                type=SchemaType.OBJECT,
                description='Execution metadata',
                optional=False,
                properties={
                    'node_type': SchemaField(type=SchemaType.STRING, description='Type of node'),
                    'input_type': SchemaField(type=SchemaType.STRING, description='Type of input'),
                    'filename': SchemaField(type=SchemaType.STRING, description='Filename if applicable', optional=True),
                    'file_type': SchemaField(type=SchemaType.STRING, description='File type if applicable', optional=True),
                    'api_used': SchemaField(type=SchemaType.STRING, description='API used for processing', optional=True),
                    'processing_timestamp': SchemaField(type=SchemaType.STRING, description='Timestamp of processing'),
                    'llm_processed': SchemaField(type=SchemaType.BOOLEAN, description='Whether LLM was used'),
                    'content_length': SchemaField(type=SchemaType.NUMBER, description='Length of content')
                }
            ),
            'error': SchemaField(
                type=SchemaType.STRING,
                description='Error message',
                optional=True
            )
        },
        required_fields=['result', 'metadata']
    ))

class InputNode(BaseNode):
    """Enhanced Input Node with schema support"""
    def get_config_model(self) -> type[BaseModel]:
        return InputNodeConfig

    async def process(
        self, 
        node_data: Dict[str, Any], 
        inputs: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> NodeData:
        """Enhanced input node processing with LLM-centric multimodal support and trigger integration"""
        try:
            # Get the input configuration
            input_type = node_data.get("inputType", "text")
            input_value = node_data.get("value", "")
            input_label = node_data.get("label", "Input")
            
            # Check for multimodal result from frontend
            multimodal_result = node_data.get("multimodalResult")
            
            # NEW: Check for trigger data from upstream trigger nodes
            trigger_data = inputs.get("trigger_data") or inputs.get("api_data") or inputs.get("webhook_data")
            
            logger.info(f"🎯 Processing input node: {input_label} (type: {input_type})")
            logger.info(f"   Has multimodal result: {bool(multimodal_result)}")
            logger.info(f"   Has trigger data: {bool(trigger_data)}")
            logger.info(f"   Input value type: {type(input_value)}")
            logger.info(f"   Available inputs: {list(inputs.keys())}")
            
            # Priority 0: Handle trigger data integration (NEW)
            if trigger_data and input_type == "multimodal":
                return await self._process_trigger_data_for_multimodal(trigger_data, input_label, context)
            
            # Priority 1: Handle multimodal result from frontend (existing)
            elif multimodal_result and input_type == "multimodal":
                return await self._process_frontend_multimodal_result(multimodal_result, input_label, context)
            
            # Priority 2: Handle explicit multimodal input type (existing frontend integration)
            elif input_type == "multimodal" and input_value:
                return await self._process_multimodal_input(input_value, input_label, context)
            
            # Priority 3: Handle file upload (legacy support)
            elif input_type == "file" and input_value:
                return await self._process_file_upload(input_value, input_label, context)
            
            # Priority 4: Handle text and URL inputs (enhanced with LLM context)
            else:
                return await self._process_text_input(input_value, input_label, input_type, context)
                
        except Exception as e:
            logger.error(f"Error in input node: {str(e)}")
            return NodeData.from_error(f"Input processing failed: {str(e)}")

    async def _process_frontend_multimodal_result(
        self, 
        multimodal_result: Dict[str, Any], 
        input_label: str, 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process multimodal result that comes directly from frontend"""
        try:
            logger.info(f"🎭 Processing frontend multimodal result: {multimodal_result.get('filename', 'unknown')}")
            
            # Extract data from frontend multimodal result
            filename = multimodal_result.get("filename", "unknown")
            file_type = multimodal_result.get("type", "unknown")
            extracted_data = multimodal_result.get("extractedData", {})
            
            # Get the main content from extracted data
            content = ""
            if extracted_data:
                content = (
                    extracted_data.get("content") or
                    extracted_data.get("transcription", {}).get("text") or
                    extracted_data.get("analysis", {}).get("description") or
                    "Content extracted by AI"
                )
            
            # Create standardized result for LLM-centric processing
            standardized_result = {
                "success": True,
                "data": {
                    "type": "multimodal_input",
                    "input_type": "multimodal",
                    "label": input_label,
                    "filename": filename,
                    "file_type": file_type,
                    "processed_content": content,
                    "extracted_entities": self._extract_entities_from_frontend_result(extracted_data),
                    "multimodal_analysis": {
                        "api_used": extracted_data.get("api_used", "frontend_processed"),
                        "processing_timestamp": multimodal_result.get("timestamp", datetime.now().isoformat()),
                        "success": multimodal_result.get("success", True)
                    },
                    "raw_multimodal_result": multimodal_result  # Keep original for debugging
                },
                "error": None,
                "metadata": {
                    "node_type": "input",
                    "input_type": "multimodal",
                    "filename": filename,
                    "file_type": file_type,
                    "api_used": extracted_data.get("api_used", "frontend_processed"),
                    "processing_timestamp": multimodal_result.get("timestamp", datetime.now().isoformat()),
                    "llm_processed": True,
                    "content_length": len(content) if content else 0
                }
            }
            
            logger.info(f"✅ Frontend multimodal processing successful: {filename} ({file_type})")
            return NodeData.from_value(standardized_result)
            
        except Exception as e:
            logger.error(f"Error processing frontend multimodal result: {str(e)}")
            return NodeData.from_error(f"Frontend multimodal processing failed: {str(e)}")

    def _extract_entities_from_frontend_result(self, extracted_data: Dict[str, Any]) -> list:
        """Extract entities from frontend multimodal processing result"""
        entities = []
        
        try:
            # Try to get entities from structure
            if "structure" in extracted_data and "extracted_entities" in extracted_data["structure"]:
                entities = extracted_data["structure"]["extracted_entities"]
            
            # If no entities, create basic ones from available data
            if not entities:
                if extracted_data.get("content"):
                    entities.append({
                        "type": "content",
                        "value": extracted_data["content"][:200] + "..." if len(extracted_data["content"]) > 200 else extracted_data["content"]
                    })
                
                if extracted_data.get("transcription", {}).get("text"):
                    entities.append({
                        "type": "transcription",
                        "value": extracted_data["transcription"]["text"][:200] + "..." if len(extracted_data["transcription"]["text"]) > 200 else extracted_data["transcription"]["text"]
                    })
                
                if extracted_data.get("analysis", {}).get("description"):
                    entities.append({
                        "type": "description",
                        "value": extracted_data["analysis"]["description"]
                    })
                
                # Add metadata entities
                if extracted_data.get("api_used"):
                    entities.append({
                        "type": "processing_api",
                        "value": extracted_data["api_used"]
                    })
            
            return entities
            
        except Exception as e:
            logger.warning(f"Error extracting entities from frontend result: {str(e)}")
            return [{"type": "error", "value": f"Entity extraction failed: {str(e)}"}]

    async def _process_multimodal_input(
        self, 
        input_value: Any, 
        input_label: str, 
        context: Dict[str, Any]
    ) -> NodeData:
        """Process multimodal input using LLM-powered multimodal processor"""
        try:
            if not MULTIMODAL_AVAILABLE:
                logger.warning("Multimodal processor not available, using fallback processing")
                return await self._fallback_multimodal_processing(input_value, input_label, context)
            
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

    async def _fallback_multimodal_processing(
        self, 
        input_value: Any, 
        input_label: str, 
        context: Dict[str, Any]
    ) -> NodeData:
        """Fallback multimodal processing when full processor isn't available"""
        try:
            logger.info(f"🔄 Using fallback multimodal processing for: {input_label}")
            
            # Extract basic file info
            filename = "unknown"
            file_data = None
            
            if isinstance(input_value, dict):
                filename = input_value.get("filename", "unknown")
                file_data = input_value.get("content", "")
            
            # Simple file type detection
            file_ext = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
            file_type = "document"
            
            if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                file_type = "image"
            elif file_ext in ['mp3', 'wav', 'm4a', 'ogg', 'flac']:
                file_type = "audio"
            elif file_ext in ['pdf', 'docx', 'txt', 'md', 'csv']:
                file_type = "document"
            
            # Create basic processed content
            if file_ext in ['txt', 'md'] and file_data:
                try:
                    # Try to decode text files
                    content = base64.b64decode(file_data).decode('utf-8')
                    processed_content = content[:1000] + "..." if len(content) > 1000 else content
                except:
                    processed_content = f"Text file: {filename} (content could not be read)"
            else:
                processed_content = f"File uploaded: {filename} ({file_type})"
            
            # Create standardized result
            standardized_result = {
                "success": True,
                "data": {
                    "type": "multimodal_input",
                    "input_type": "multimodal",
                    "label": input_label,
                    "filename": filename,
                    "file_type": file_type,
                    "processed_content": processed_content,
                    "extracted_entities": [
                        {"type": "filename", "value": filename},
                        {"type": "file_type", "value": file_type},
                        {"type": "processing_method", "value": "fallback"}
                    ],
                    "multimodal_analysis": {
                        "api_used": "fallback_processor",
                        "processing_timestamp": datetime.now().isoformat(),
                        "success": True,
                        "note": "Processed with fallback system - limited functionality"
                    }
                },
                "error": None,
                "metadata": {
                    "node_type": "input",
                    "input_type": "multimodal",
                    "filename": filename,
                    "file_type": file_type,
                    "api_used": "fallback_processor",
                    "processing_timestamp": datetime.now().isoformat(),
                    "llm_processed": False,
                    "fallback_used": True
                }
            }
            
            logger.info(f"✅ Fallback multimodal processing successful: {filename}")
            return NodeData.from_value(standardized_result)
            
        except Exception as e:
            logger.error(f"❌ Fallback multimodal processing failed: {str(e)}")
            return NodeData.from_error(f"Fallback multimodal processing failed: {str(e)}")

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

    async def _process_trigger_data_for_multimodal(
        self,
        trigger_data: Dict[str, Any],
        input_label: str,
        context: Dict[str, Any]
    ) -> NodeData:
        """NEW: Process trigger data for multimodal input nodes"""
        try:
            logger.info(f"🔗 Processing trigger data for multimodal input: {input_label}")
            
            # Extract data from different trigger types
            if isinstance(trigger_data, dict):
                
                # Handle API polling trigger data
                if "api_data" in trigger_data or "raw_data" in trigger_data:
                    return await self._process_api_trigger_data(trigger_data, input_label, context)
                
                # Handle webhook trigger data with file attachments
                elif "webhook_data" in trigger_data or "attachments" in trigger_data:
                    return await self._process_webhook_file_data(trigger_data, input_label, context)
                
                # Handle file URLs from triggers
                elif "file_url" in trigger_data or "file_urls" in trigger_data:
                    return await self._process_trigger_file_urls(trigger_data, input_label, context)
                
                # Handle direct file content from triggers
                elif "file_content" in trigger_data and "filename" in trigger_data:
                    return await self._process_trigger_file_content(trigger_data, input_label, context)
                
                # Fallback: treat as general trigger data
                else:
                    return await self._process_general_trigger_data(trigger_data, input_label, context)
            
            else:
                # Handle non-dict trigger data
                return await self._process_simple_trigger_data(trigger_data, input_label, context)
                
        except Exception as e:
            logger.error(f"❌ Error processing trigger data for multimodal: {str(e)}")
            return NodeData.from_error(f"Trigger data processing failed: {str(e)}")

    async def _process_api_trigger_data(
        self,
        trigger_data: Dict[str, Any],
        input_label: str,
        context: Dict[str, Any]
    ) -> NodeData:
        """Process API polling trigger data that may contain file references"""
        try:
            api_data = trigger_data.get("api_data") or trigger_data.get("raw_data")
            service_name = trigger_data.get("service_name", "Unknown API")
            
            logger.info(f"📡 Processing API trigger data from {service_name}")
            
            # Check if API data contains file URLs or attachments
            file_urls = []
            file_contents = []
            
            if isinstance(api_data, dict):
                # Look for file URLs in common API response patterns
                for key in ["attachments", "files", "documents", "media", "images"]:
                    if key in api_data:
                        items = api_data[key]
                        if isinstance(items, list):
                            for item in items:
                                if isinstance(item, dict) and "url" in item:
                                    file_urls.append(item["url"])
                                elif isinstance(item, str) and item.startswith("http"):
                                    file_urls.append(item)
                
                # Look for direct file content
                if "file_content" in api_data and "filename" in api_data:
                    file_contents.append({
                        "content": api_data["file_content"],
                        "filename": api_data["filename"],
                        "type": api_data.get("file_type", "unknown")
                    })
            
            # Process files if found
            if file_urls or file_contents:
                return await self._process_multiple_files_from_trigger(
                    file_urls, file_contents, trigger_data, input_label, context
                )
            
            # If no files, create structured data for downstream processing
            else:
                structured_result = {
                    "success": True,
                    "data": {
                        "type": "api_trigger_data",
                        "input_type": "multimodal",
                        "label": input_label,
                        "service_name": service_name,
                        "api_data": api_data,
                        "processed_content": self._format_api_data_as_text(api_data),
                        "extracted_entities": self._extract_entities_from_api_data(api_data),
                        "trigger_metadata": trigger_data
                    },
                    "error": None,
                    "metadata": {
                        "node_type": "input",
                        "input_type": "multimodal", 
                        "source": "api_trigger",
                        "service_name": service_name,
                        "processing_timestamp": datetime.now().isoformat(),
                        "data_type": "api_response"
                    }
                }
                
                logger.info(f"✅ API trigger data processed: {service_name}")
                return NodeData.from_value(structured_result)
                
        except Exception as e:
            logger.error(f"❌ Error processing API trigger data: {str(e)}")
            return NodeData.from_error(f"API trigger processing failed: {str(e)}")

    async def _process_webhook_file_data(
        self,
        trigger_data: Dict[str, Any],
        input_label: str,
        context: Dict[str, Any]
    ) -> NodeData:
        """Process webhook trigger data that contains file attachments"""
        try:
            webhook_data = trigger_data.get("webhook_data", trigger_data)
            attachments = webhook_data.get("attachments", [])
            
            logger.info(f"📨 Processing webhook with {len(attachments)} attachments")
            
            if not attachments:
                # No attachments, process as regular webhook data
                return await self._process_general_trigger_data(trigger_data, input_label, context)
            
            # Process each attachment
            processed_files = []
            for attachment in attachments:
                try:
                    if "url" in attachment:
                        # Download file from URL
                        file_data = await self._download_file_from_url(attachment["url"])
                        if file_data:
                            processed_file = await self._process_downloaded_file(
                                file_data, 
                                attachment.get("filename", "webhook_file"),
                                context
                            )
                            processed_files.append(processed_file)
                    
                    elif "content" in attachment:
                        # Direct file content
                        processed_file = await self._process_multimodal_file_content(
                            attachment["content"],
                            attachment.get("filename", "webhook_file"),
                            context
                        )
                        processed_files.append(processed_file)
                        
                except Exception as file_error:
                    logger.warning(f"⚠️ Failed to process attachment: {str(file_error)}")
                    continue
            
            # Combine results
            combined_result = {
                "success": True,
                "data": {
                    "type": "webhook_multimodal",
                    "input_type": "multimodal",
                    "label": input_label,
                    "processed_files": processed_files,
                    "total_files": len(processed_files),
                    "webhook_data": webhook_data,
                    "combined_content": self._combine_file_contents(processed_files)
                },
                "error": None,
                "metadata": {
                    "node_type": "input",
                    "input_type": "multimodal",
                    "source": "webhook_trigger",
                    "total_files": len(processed_files),
                    "processing_timestamp": datetime.now().isoformat()
                }
            }
            
            logger.info(f"✅ Webhook files processed: {len(processed_files)} files")
            return NodeData.from_value(combined_result)
            
        except Exception as e:
            logger.error(f"❌ Error processing webhook file data: {str(e)}")
            return NodeData.from_error(f"Webhook file processing failed: {str(e)}")

    async def _process_trigger_file_urls(
        self,
        trigger_data: Dict[str, Any],
        input_label: str,
        context: Dict[str, Any]
    ) -> NodeData:
        """Process file URLs from trigger data"""
        try:
            file_urls = trigger_data.get("file_urls") or [trigger_data.get("file_url")]
            file_urls = [url for url in file_urls if url]  # Filter out None values
            
            logger.info(f"🔗 Processing {len(file_urls)} file URLs from trigger")
            
            if not file_urls:
                return NodeData.from_error("No valid file URLs found in trigger data")
            
            processed_files = []
            for url in file_urls:
                try:
                    # Download and process each file
                    file_data = await self._download_file_from_url(url)
                    if file_data:
                        filename = url.split("/")[-1] or "downloaded_file"
                        processed_file = await self._process_downloaded_file(file_data, filename, context)
                        processed_files.append(processed_file)
                        
                except Exception as url_error:
                    logger.warning(f"⚠️ Failed to process URL {url}: {str(url_error)}")
                    continue
            
            if not processed_files:
                return NodeData.from_error("Failed to process any files from URLs")
            
            # Return combined results
            combined_result = {
                "success": True,
                "data": {
                    "type": "url_multimodal",
                    "input_type": "multimodal",
                    "label": input_label,
                    "processed_files": processed_files,
                    "source_urls": file_urls,
                    "total_files": len(processed_files),
                    "combined_content": self._combine_file_contents(processed_files)
                },
                "error": None,
                "metadata": {
                    "node_type": "input",
                    "input_type": "multimodal",
                    "source": "trigger_urls",
                    "total_files": len(processed_files),
                    "processing_timestamp": datetime.now().isoformat()
                }
            }
            
            logger.info(f"✅ URL files processed: {len(processed_files)} files")
            return NodeData.from_value(combined_result)
            
        except Exception as e:
            logger.error(f"❌ Error processing trigger file URLs: {str(e)}")
            return NodeData.from_error(f"Trigger URL processing failed: {str(e)}")

    async def _download_file_from_url(self, url: str) -> bytes:
        """Download file content from URL"""
        try:
            import aiohttp
            import ssl
            
            # Create SSL context that doesn't verify certificates for flexibility
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, ssl=ssl_context) as response:
                    if response.status == 200:
                        return await response.read()
                    else:
                        logger.warning(f"❌ Failed to download file: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"❌ Error downloading file from {url}: {str(e)}")
            return None

    async def _process_downloaded_file(self, file_data: bytes, filename: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process downloaded file data using multimodal processor"""
        try:
            # Convert to base64 for multimodal processor
            import base64
            base64_data = base64.b64encode(file_data).decode('utf-8')
            
            # Check if it's a ZIP file
            if filename.lower().endswith('.zip'):
                return await self._process_zip_file(base64_data, filename, context)
            
            # Process with multimodal processor
            if MULTIMODAL_AVAILABLE:
                result = await process_multimodal_input(
                    file_data=base64_data,
                    filename=filename,
                    context=context or {}
                )
                return result
            else:
                # Fallback processing
                return {
                    "success": True,
                    "type": "downloaded_file",
                    "filename": filename,
                    "content": f"Downloaded file: {filename} ({len(file_data)} bytes)",
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Error processing downloaded file {filename}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "filename": filename
            }

    async def _process_zip_file(self, base64_data: str, filename: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """NEW: Process ZIP files by extracting and processing each file"""
        try:
            import zipfile
            import io
            import base64
            
            logger.info(f"📦 Processing ZIP file: {filename}")
            
            # Decode base64 to bytes
            zip_bytes = base64.b64decode(base64_data)
            
            # Create a file-like object from bytes
            zip_buffer = io.BytesIO(zip_bytes)
            
            processed_files = []
            
            with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
                file_list = zip_file.namelist()
                logger.info(f"📦 ZIP contains {len(file_list)} files: {file_list}")
                
                for file_name in file_list:
                    try:
                        # Skip directories
                        if file_name.endswith('/'):
                            continue
                        
                        # Extract file content
                        file_content = zip_file.read(file_name)
                        
                        # Convert to base64 for processing
                        file_base64 = base64.b64encode(file_content).decode('utf-8')
                        
                        # Process the extracted file
                        if MULTIMODAL_AVAILABLE:
                            result = await process_multimodal_input(
                                file_data=file_base64,
                                filename=file_name,
                                context={**context, "source": "zip_extraction", "zip_filename": filename}
                            )
                        else:
                            # Fallback processing
                            result = {
                                "success": True,
                                "type": "extracted_file",
                                "filename": file_name,
                                "content": f"Extracted from ZIP: {file_name} ({len(file_content)} bytes)",
                                "timestamp": datetime.now().isoformat()
                            }
                        
                        processed_files.append({
                            "filename": file_name,
                            "size": len(file_content),
                            "processing_result": result
                        })
                        
                    except Exception as file_error:
                        logger.warning(f"⚠️ Failed to process file {file_name} from ZIP: {str(file_error)}")
                        processed_files.append({
                            "filename": file_name,
                            "error": str(file_error),
                            "processing_result": {"success": False, "error": str(file_error)}
                        })
            
            # Return combined ZIP processing result
            zip_result = {
                "success": True,
                "type": "zip_archive",
                "filename": filename,
                "total_files": len(file_list),
                "processed_files": len(processed_files),
                "extracted_files": processed_files,
                "combined_content": self._combine_zip_file_contents(processed_files),
                "zip_metadata": {
                    "original_size": len(zip_bytes),
                    "compression_ratio": f"{len(zip_bytes)/sum(f.get('size', 0) for f in processed_files):.2f}" if processed_files else "N/A"
                },
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"✅ ZIP file processed: {filename} - {len(processed_files)} files extracted")
            return zip_result
            
        except Exception as e:
            logger.error(f"❌ Error processing ZIP file {filename}: {str(e)}")
            return {
                "success": False,
                "error": f"ZIP processing failed: {str(e)}",
                "filename": filename,
                "type": "zip_archive"
            }

    def _combine_zip_file_contents(self, processed_files: List[Dict[str, Any]]) -> str:
        """Combine content from multiple files extracted from ZIP"""
        try:
            combined_content = f"ZIP Archive Contents ({len(processed_files)} files):\n\n"
            
            for file_info in processed_files:
                filename = file_info.get("filename", "unknown")
                result = file_info.get("processing_result", {})
                
                combined_content += f"=== {filename} ===\n"
                
                if result.get("success"):
                    content = result.get("content", "")
                    if content:
                        # Truncate very long content
                        if len(content) > 1000:
                            combined_content += content[:1000] + "...\n\n"
                        else:
                            combined_content += content + "\n\n"
                    else:
                        combined_content += f"File processed successfully (type: {result.get('type', 'unknown')})\n\n"
                else:
                    combined_content += f"Error processing file: {result.get('error', 'Unknown error')}\n\n"
            
            return combined_content
            
        except Exception as e:
            logger.error(f"❌ Error combining ZIP file contents: {str(e)}")
            return f"Error combining ZIP contents: {str(e)}"

    def _format_api_data_as_text(self, api_data: Any) -> str:
        """Format API data as readable text"""
        try:
            if isinstance(api_data, dict):
                # Look for common API response patterns
                if "data" in api_data:
                    return self._format_api_data_as_text(api_data["data"])
                elif "results" in api_data:
                    return self._format_api_data_as_text(api_data["results"])
                elif "items" in api_data:
                    return self._format_api_data_as_text(api_data["items"])
                else:
                    # Format as key-value pairs
                    formatted = "API Response Data:\n"
                    for key, value in api_data.items():
                        if isinstance(value, (dict, list)):
                            formatted += f"{key}: {type(value).__name__} with {len(value)} items\n"
                        else:
                            formatted += f"{key}: {value}\n"
                    return formatted
            
            elif isinstance(api_data, list):
                formatted = f"API Response List ({len(api_data)} items):\n"
                for i, item in enumerate(api_data[:5]):  # Show first 5 items
                    formatted += f"{i+1}. {item}\n"
                if len(api_data) > 5:
                    formatted += f"... and {len(api_data) - 5} more items\n"
                return formatted
                
            else:
                return str(api_data)
                
        except Exception as e:
            logger.error(f"❌ Error formatting API data: {str(e)}")
            return f"API Data (formatting error): {str(api_data)[:500]}"

    def _extract_entities_from_api_data(self, api_data: Any) -> List[Dict[str, Any]]:
        """Extract entities from API data"""
        entities = []
        try:
            if isinstance(api_data, dict):
                for key, value in api_data.items():
                    if key.lower() in ["id", "name", "title", "email", "url", "price", "symbol"]:
                        entities.append({
                            "type": key.lower(),
                            "value": str(value),
                            "confidence": 0.9
                        })
            elif isinstance(api_data, list) and api_data:
                # Extract from first item if it's a dict
                if isinstance(api_data[0], dict):
                    entities = self._extract_entities_from_api_data(api_data[0])
                    
        except Exception as e:
            logger.error(f"❌ Error extracting entities from API data: {str(e)}")
            
        return entities

    def _combine_file_contents(self, processed_files: List[Dict[str, Any]]) -> str:
        """Combine content from multiple processed files"""
        try:
            combined = ""
            for i, file_result in enumerate(processed_files):
                filename = file_result.get("filename", f"file_{i}")
                content = file_result.get("content", "")
                
                combined += f"=== {filename} ===\n"
                if content:
                    combined += content[:500] + ("..." if len(content) > 500 else "") + "\n\n"
                else:
                    combined += "No content extracted\n\n"
                    
            return combined
            
        except Exception as e:
            logger.error(f"❌ Error combining file contents: {str(e)}")
            return "Error combining file contents"

    async def _process_general_trigger_data(
        self,
        trigger_data: Dict[str, Any],
        input_label: str,
        context: Dict[str, Any]
    ) -> NodeData:
        """Process general trigger data that doesn't contain files"""
        try:
            logger.info(f"📥 Processing general trigger data for {input_label}")
            
            # Create structured result from trigger data
            structured_result = {
                "success": True,
                "data": {
                    "type": "trigger_data",
                    "input_type": "multimodal",
                    "label": input_label,
                    "trigger_data": trigger_data,
                    "processed_content": self._format_trigger_data_as_text(trigger_data),
                    "extracted_entities": self._extract_entities_from_trigger_data(trigger_data),
                    "trigger_type": trigger_data.get("trigger_type", "unknown")
                },
                "error": None,
                "metadata": {
                    "node_type": "input",
                    "input_type": "multimodal",
                    "source": "trigger",
                    "trigger_type": trigger_data.get("trigger_type", "unknown"),
                    "processing_timestamp": datetime.now().isoformat()
                }
            }
            
            logger.info(f"✅ General trigger data processed for {input_label}")
            return NodeData.from_value(structured_result)
            
        except Exception as e:
            logger.error(f"❌ Error processing general trigger data: {str(e)}")
            return NodeData.from_error(f"General trigger processing failed: {str(e)}")

    def _format_trigger_data_as_text(self, trigger_data: Any) -> str:
        """Format trigger data as readable text"""
        try:
            if isinstance(trigger_data, dict):
                formatted = "Trigger Data:\n"
                for key, value in trigger_data.items():
                    if key == "api_data" and isinstance(value, (dict, list)):
                        formatted += f"{key}: {self._format_api_data_as_text(value)}\n"
                    elif isinstance(value, (dict, list)):
                        formatted += f"{key}: {type(value).__name__} with {len(value)} items\n"
                    else:
                        formatted += f"{key}: {value}\n"
                return formatted
            else:
                return str(trigger_data)
                
        except Exception as e:
            logger.error(f"❌ Error formatting trigger data: {str(e)}")
            return f"Trigger Data: {str(trigger_data)[:500]}"

    def _extract_entities_from_trigger_data(self, trigger_data: Any) -> List[Dict[str, Any]]:
        """Extract entities from trigger data"""
        entities = []
        try:
            if isinstance(trigger_data, dict):
                # Look for common trigger data patterns
                if "api_data" in trigger_data:
                    entities.extend(self._extract_entities_from_api_data(trigger_data["api_data"]))
                
                # Extract trigger-specific entities
                for key, value in trigger_data.items():
                    if key.lower() in ["service_name", "trigger_type", "webhook_url"]:
                        entities.append({
                            "type": key.lower(),
                            "value": str(value),
                            "confidence": 0.8
                        })
                        
        except Exception as e:
            logger.error(f"❌ Error extracting entities from trigger data: {str(e)}")
            
        return entities

async def process_input_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced input node processor with schema validation and smart mapping"""
    smart_mapper = SmartMapper()
    mapped_inputs = await smart_mapper.smart_map_inputs(node_data, context or {}, inputs)
    input_node = InputNode()
    return await input_node.process(node_data, inputs, context or {}) 