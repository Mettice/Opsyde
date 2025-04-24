import base64
import fitz  # PyMuPDF
import docx2txt
from io import BytesIO
import logging
import json

logger = logging.getLogger(__name__)

def parse_uploaded_cv(input_data):
    """
    Enhanced parser with better debugging and structure handling
    """
    # Debug the input structure
    logger.info(f"parse_uploaded_cv called with input type: {type(input_data)}")
    if isinstance(input_data, dict):
        logger.info(f"Input keys: {list(input_data.keys())}")
    
    # Safety check for None input
    if input_data is None:
        logger.info("No input data provided")
        return {"status": "❌ No input data provided."}
    
    # Try to find file_upload directly
    if isinstance(input_data, dict):
        # Check for direct file_upload
        if "file_upload" in input_data:
            file_info = input_data["file_upload"]
            logger.info("Found file_upload at top level")
        
        # Check for file_upload in value
        elif "value" in input_data and isinstance(input_data["value"], dict):
            if "file_upload" in input_data["value"]:
                file_info = input_data["value"]["file_upload"]
                logger.info("Found file_upload in value")
        
        # Check for a nested structure from inputs
        elif "inputs" in input_data and isinstance(input_data["inputs"], dict):
            inputs = input_data["inputs"]
            if "file_upload" in inputs:
                file_info = inputs["file_upload"]
                logger.info("Found file_upload in inputs")
            elif "value" in inputs and isinstance(inputs["value"], dict):
                if "file_upload" in inputs["value"]:
                    file_info = inputs["value"]["file_upload"]
                    logger.info("Found file_upload in inputs.value")
        
        # Check for a file object with filename and content
        elif "filename" in input_data and "content" in input_data:
            file_info = input_data
            logger.info("Found direct filename/content pair")
        
        # Deep search for file_upload
        else:
            file_info = None
            def find_file_upload(obj, depth=0):
                if depth > 10:  # Prevent infinite recursion
                    return None
                if isinstance(obj, dict):
                    if "file_upload" in obj:
                        return obj["file_upload"]
                    if "filename" in obj and "content" in obj:
                        return obj
                    for key, value in obj.items():
                        result = find_file_upload(value, depth + 1)
                        if result:
                            return result
                return None
            
            file_info = find_file_upload(input_data)
            if file_info:
                logger.info("Found file data in deep search")
    else:
        logger.info(f"Input is not a dictionary, it's {type(input_data)}")
        file_info = None
    
    # Default to empty dict if still not found
    if not file_info:
        logger.error("No file uploaded or invalid file structure")
        return {"status": "❌ No file uploaded or invalid file structure."}
    
    # Debug the file_info structure
    logger.info(f"file_info type: {type(file_info)}")
    if isinstance(file_info, dict):
        logger.info(f"file_info keys: {list(file_info.keys())}")
    
    # Safety check for file_info structure
    if not isinstance(file_info, dict):
        logger.error("Invalid file structure, not a dictionary")
        return {"status": "❌ Invalid file structure."}
    
    # Extract file data with more flexible approach
    filename = file_info.get("filename", "")
    content = file_info.get("content", "")
    file_type = file_info.get("type", "")
    size = file_info.get("size", 0)
    last_modified = file_info.get("lastModified", 0)

    # Log file details
    logger.info(f"Filename: {filename}")
    logger.info(f"Content exists: {bool(content)}")
    logger.info(f"File type: {file_type}")
    
    if not filename or not content:
        logger.error("Missing filename or content")
        return {"status": "❌ No file uploaded or missing filename/content."}

    # Decode base64 content - handle both with and without data URL prefix
    try:
        if isinstance(content, str):
            if "base64," in content:
                content_split = content.split(",")
                if len(content_split) > 1:
                    decoded = base64.b64decode(content_split[-1])
                    logger.info("Decoded base64 content with data URL prefix")
                else:
                    decoded = base64.b64decode(content)
                    logger.info("Decoded base64 content (no split found)")
            else:
                decoded = base64.b64decode(content)
                logger.info("Decoded base64 content (no prefix)")
        else:
            logger.error(f"Content is not a string, it's {type(content)}")
            return {"status": f"❌ Content is not a string: {type(content)}"}
    except Exception as e:
        logger.error(f"Failed to decode file: {str(e)}")
        return {"status": f"❌ Failed to decode file: {str(e)}"}

    try:
        text = decode_document(decoded, filename)
        if not text:
            logger.error("Failed to extract text from document")
            return {"status": "⚠️ Failed to extract text from document."}
            
        return {
            "filename": filename,
            "summary": text,
            "file_type": file_type,
            "size": size,
            "last_modified": last_modified
        }
    except Exception as e:
        logger.error(f"Error in document decoding: {str(e)}")
        return {"status": f"⚠️ Error processing document: {str(e)}"}

def decode_document(binary_data, filename):
    """
    Decode document from binary data
    """
    try:
        if filename.lower().endswith(".pdf"):
            doc = fitz.open(stream=binary_data, filetype="pdf")
            text = "\n".join([page.get_text() for page in doc])
            return text
        elif filename.lower().endswith(".docx"):
            file = BytesIO(binary_data)
            text = docx2txt.process(file)
            return text
        else:
            return f"Unsupported file type: {filename}"
    except Exception as e:
        logger.error(f"Error parsing document: {str(e)}")
        return f"⚠️ Error parsing document: {str(e)}"

async def run_cv_parser_tool(input_data: dict) -> dict:
    try:
        # Extract file data from consistent structure
        file_data = None
        if "value" in input_data:
            file_data = input_data["value"]
        elif "file_upload" in input_data:
            file_data = input_data["file_upload"]
        elif "inputs" in input_data and "file_upload" in input_data["inputs"]:
            file_data = input_data["inputs"]["file_upload"]
        
        if not file_data or not file_data.get("content"):
            raise ValueError("Missing required file data (content or filename)")
            
        # Extract base64 content from data URL
        content = file_data["content"]
        if content.startswith("data:"):
            # Remove data URL prefix
            content = content.split(",", 1)[1]
            
        # Decode base64 content
        try:
            decoded_content = base64.b64decode(content)
        except Exception as e:
            raise ValueError(f"Invalid base64 content: {str(e)}")
            
        # Process file based on type
        if file_data["type"] == "application/pdf":
            # Extract text from PDF
            text = extract_text_from_pdf(decoded_content)
        else:
            # For other file types, try to decode as text
            try:
                text = decoded_content.decode("utf-8")
            except UnicodeDecodeError:
                raise ValueError("File content could not be decoded as text")
                
        # Parse CV text
        parsed_data = parse_cv_text(text)
        
        return {
            "success": True,
            "data": parsed_data,
            "metadata": {
                "filename": file_data.get("filename"),
                "type": file_data.get("type"),
                "size": file_data.get("size"),
                "lastModified": file_data.get("lastModified")
            }
        }
        
    except Exception as e:
        logger.error(f"Error in CV parser: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }