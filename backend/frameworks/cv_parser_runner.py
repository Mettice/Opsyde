from tools.parse_cv import parse_uploaded_cv
from frameworks.openrouter_runner import ask_model
from frameworks.huggingface_runner import extract_skills, extract_experience, extract_education
import json
import logging
import base64
import io
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)

def debug_print_structure(obj, prefix=""):
    """Helper function to print nested structure"""
    if isinstance(obj, dict):
        logger.info(f"{prefix}Dict with keys: {list(obj.keys())}")
        for k, v in obj.items():
            logger.info(f"{prefix}Key '{k}' has type {type(v)}")
            if k == "file_upload" or k == "content" or k == "filename":
                if isinstance(v, str):
                    logger.info(f"{prefix}Value preview: {v[:30]}...")
                else:
                    logger.info(f"{prefix}Value type: {type(v)}")
    elif isinstance(obj, list):
        logger.info(f"{prefix}List with {len(obj)} items")
        for i, item in enumerate(obj):
            if i < 3:  # Just show first 3 items
                logger.info(f"{prefix}Item {i} has type {type(item)}")
    else:
        logger.info(f"{prefix}Value type: {type(obj)}")
        if isinstance(obj, str):
            logger.info(f"{prefix}Value preview: {obj[:30]}...")

def find_file_data_recursive(obj, depth=0, path=""):
    """Recursively search for file data in nested structures"""
    if depth > 10:  # Prevent infinite recursion
        return None
        
    if isinstance(obj, dict):
        # Direct check for file_upload
        if "file_upload" in obj and isinstance(obj["file_upload"], dict):
            if "filename" in obj["file_upload"] and "content" in obj["file_upload"]:
                logger.info(f"Found file_upload at path: {path}.file_upload")
                return obj["file_upload"]
        
        # Check for filename and content directly
        if "filename" in obj and "content" in obj:
            logger.info(f"Found direct filename/content at path: {path}")
            return obj
            
        # Recursively check all dictionary values
        for key, value in obj.items():
            result = find_file_data_recursive(value, depth + 1, f"{path}.{key}")
            if result:
                return result
    
    # Check if it's a list
    if isinstance(obj, list):
        for i, item in enumerate(obj):
            result = find_file_data_recursive(item, depth + 1, f"{path}[{i}]")
            if result:
                return result
                
    return None

def extract_text_from_pdf(content):
    """Extract text from PDF content"""
    try:
        # Handle base64 content
        if isinstance(content, str):
            if "base64," in content:
                content = content.split("base64,")[1]
            try:
                pdf_bytes = base64.b64decode(content)
            except Exception as e:
                logger.error(f"Base64 decode error: {str(e)}")
                return None
        else:
            logger.error(f"Content is not a string, it's {type(content)}")
            return None
        
        # Read PDF
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PdfReader(pdf_file)
        
        # Extract text
        extracted_text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                extracted_text += page_text + "\n"
        
        return extracted_text
    except Exception as e:
        logger.error(f"PDF extraction error: {str(e)}")
        return None

def run_cv_parser_tool(tool_data):
    """Process a CV file and extract information"""
    try:
        logger.info(f"\n{'='*20} CV PARSER START {'='*20}")
        
        # Print complete structure for debugging
        logger.info("FULL TOOL_DATA STRUCTURE:")
        debug_print_structure(tool_data, "  ")
        
        # First attempt: Use the existing parse_uploaded_cv function
        if isinstance(tool_data, dict) and "inputs" in tool_data:
            logger.info("Trying parse_uploaded_cv with inputs")
            parse_result = parse_uploaded_cv(tool_data.get("inputs", {}))
            logger.info(f"Parse result: {parse_result}")
            
            if "summary" in parse_result and not parse_result["summary"].startswith("⚠️"):
                # Success path
                logger.info("parse_uploaded_cv worked successfully")
                text = parse_result.get("summary", "")
                skills = extract_skills(text)
                experience = extract_experience(text)
                education = extract_education(text)
                
                return {
                    "output": f"Successfully processed {parse_result.get('filename', 'CV')}",
                    "type": "cv_result",
                    "filename": parse_result.get("filename", "unknown.pdf"),
                    "skills": skills,
                    "experience_years": experience,
                    "education": education,
                    "extracted_text": text[:500] + "..." if len(text) > 500 else text
                }
        
        # Second attempt: Try to find file data recursively
        logger.info("Trying to find file data recursively")
        file_data = find_file_data_recursive(tool_data)
        
        if file_data:
            logger.info(f"Found file data: {file_data.get('filename', 'unknown')}")
            content = file_data.get("content", "")
            filename = file_data.get("filename", "unknown.pdf")
            
            if content:
                # Extract text from PDF
                text = extract_text_from_pdf(content)
                
                if text:
                    logger.info(f"Successfully extracted text from PDF: {len(text)} characters")
                    # Process the extracted text
                    skills = extract_skills(text)
                    experience = extract_experience(text)
                    education = extract_education(text)
                    
                    return {
                        "output": f"Successfully processed {filename}",
                        "type": "cv_result",
                        "filename": filename,
                        "skills": skills,
                        "experience_years": experience,
                        "education": education,
                        "extracted_text": text[:500] + "..." if len(text) > 500 else text
                    }
                else:
                    logger.error("Failed to extract text from PDF")
            else:
                logger.error("File content is empty")
        
        # Third attempt: Manual reconstruction from whatever we can find
        logger.info("Trying to manually extract file info")
        
        # Search for any filename
        filename = None
        content = None
        
        if isinstance(tool_data, dict):
            # Try to find filename in any nested dictionary
            def find_filename(obj, depth=0):
                if depth > 10:
                    return None
                if isinstance(obj, dict):
                    if "filename" in obj:
                        return obj.get("filename")
                    for k, v in obj.items():
                        result = find_filename(v, depth+1)
                        if result:
                            return result
                return None
            
            # Try to find content in any nested dictionary
            def find_content(obj, depth=0):
                if depth > 10:
                    return None
                if isinstance(obj, dict):
                    if "content" in obj:
                        return obj.get("content")
                    for k, v in obj.items():
                        result = find_content(v, depth+1)
                        if result:
                            return result
                return None
            
            filename = find_filename(tool_data)
            content = find_content(tool_data)
            
            logger.info(f"Manual search - Found filename: {filename}")
            logger.info(f"Manual search - Found content: {True if content else False}")
            
            if filename and content:
                # Try to extract text from PDF
                text = extract_text_from_pdf(content)
                
                if text:
                    logger.info(f"Successfully extracted text from PDF: {len(text)} characters")
                    # Process the extracted text
                    skills = extract_skills(text)
                    experience = extract_experience(text)
                    education = extract_education(text)
                    
                    return {
                        "output": f"Successfully processed {filename}",
                        "type": "cv_result",
                        "filename": filename,
                        "skills": skills,
                        "experience_years": experience,
                        "education": education,
                        "extracted_text": text[:500] + "..." if len(text) > 500 else text
                    }
        
        # If all attempts fail, return detailed error for debugging
        logger.error("All attempts to find and process file data failed")
        return {
            "output": "Failed to find valid file data in the input",
            "type": "error",
            "error": "Missing required file data (content or filename)",
            "debug_info": "Check CV Parser logs for detailed structure information"
        }
            
    except Exception as e:
        logger.error(f"CV parser error: {str(e)}")
        return {
            "output": str(e),
            "type": "error",
            "error": str(e)
        }