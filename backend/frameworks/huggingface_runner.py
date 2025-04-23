import requests
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

def extract_skills(text):
    """Extract skills from text using simple keyword matching"""
    skills = []
    common_skills = ["Python", "JavaScript", "Java", "C++", "SQL", "HTML", "CSS", 
                    "Machine Learning", "AI", "Data Analysis", "Project Management"]
    for skill in common_skills:
        if skill.lower() in text.lower():
            skills.append(skill)
    return skills

def extract_experience(text):
    """Extract years of experience from text"""
    import re
    # Look for patterns like "X years" or "X+ years"
    matches = re.findall(r'(\d+)\+?\s*(?:year|yr)s?', text.lower())
    if matches:
        return max(int(match) for match in matches)
    return 0

def extract_education(text):
    """Extract education information from text"""
    education = []
    degrees = ["Bachelor", "Master", "PhD", "BSc", "MSc", "MBA"]
    for degree in degrees:
        if degree.lower() in text.lower():
            education.append(degree)
    return education

def run_huggingface_tool(tool_data):
    try:
        # Extract tool configuration
        label = tool_data.get("label", "Unknown Tool")
        inputs = tool_data.get("inputs") or {}
        
        logger.info(f"Processing HuggingFace tool '{label}'")
        logger.debug(f"Tool inputs: {json.dumps(inputs, default=str)}")
        
        # Get file data from inputs - simplified version
        file_data = None
        
        # Check for file_upload in two places only
        if isinstance(inputs, dict):
            if "file_upload" in inputs:
                file_data = inputs["file_upload"]
                logger.info("Found file_upload at top level")
            elif "value" in inputs and isinstance(inputs["value"], dict) and "file_upload" in inputs["value"]:
                file_data = inputs["value"]["file_upload"]
                logger.info("Found file_upload in value")
        
        # Validate file data structure
        if not isinstance(file_data, dict):
            logger.error("File data not found or invalid format")
            return {
                "output": "Missing or invalid file data",
                "type": "error",
                "error": "File data must be a dictionary with content and filename"
            }
            
        # Extract file content and metadata
        content = file_data.get("content")
        filename = file_data.get("filename")
        
        # Validate required fields
        if not content or not filename:
            logger.error("Missing required file data fields")
            return {
                "output": "Missing required file data (content or filename)",
                "type": "error",
                "error": "File must have both content and filename"
            }
        
        logger.info(f"Processing file: {filename}")
        
        # Detect PDF files
        is_pdf = (
            filename.lower().endswith('.pdf') or
            "application/pdf" in file_data.get("type", "").lower()
        )
        
        if not is_pdf:
            return {
                "output": "Invalid file type. Please upload a PDF file.",
                "type": "error",
                "error": "Only PDF files are supported"
            }
        
        # Process PDF file
        try:
            import base64
            import io
            from PyPDF2 import PdfReader
            
            # Handle base64 content
            if isinstance(content, str) and "base64," in content:
                content = content.split("base64,")[1]
            
            # Decode and read PDF
            pdf_bytes = base64.b64decode(content)
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PdfReader(pdf_file)
            
            # Extract text
            extracted_text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
            
            # Extract information
            skills = extract_skills(extracted_text)
            experience = extract_experience(extracted_text)
            education = extract_education(extracted_text)
            
            result = {
                "output": "CV processed successfully",
                "type": "cv_result",
                "filename": filename,
                "skills": skills,
                "experience_years": experience,
                "education": education,
                "extracted_text": extracted_text[:500] + "..." # Preview
            }
            
            logger.info(f"Successfully processed CV: {filename}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return {
                "output": f"Error processing PDF: {str(e)}",
                "type": "error",
                "error": str(e)
            }
            
    except Exception as e:
        logger.error(f"Error in CV parser: {str(e)}")
        return {
            "output": f"Error: {str(e)}",
            "type": "error",
            "error": str(e)
        }