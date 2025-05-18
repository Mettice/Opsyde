import json
import logging
import base64
import io
import re
import tempfile
import os
import sys
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

# Configure logger
logger = logging.getLogger(__name__)

# Check if required packages are available
CV_PARSER_AVAILABLE = False
try:
    from PyPDF2 import PdfReader
    import spacy
    import docx
    CV_PARSER_AVAILABLE = True
    logger.info("CV Parser dependencies available")
    
    # Add the parent directory to sys.path to allow imports from tools
    backend_dir = str(Path(__file__).parent.parent)
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
    
    try:
        from tools.parse_cv import parse_uploaded_cv
    except ImportError:
        logger.warning("Could not import parse_cv from tools")
    
    # Load spaCy model
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        logger.warning("Downloading spaCy model...")
        import subprocess
        subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
        nlp = spacy.load("en_core_web_sm")
    
except ImportError as e:
    logger.warning(f"CV Parser not available - missing dependencies: {str(e)}")

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

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes"""
    if not CV_PARSER_AVAILABLE:
        return "PDF parsing not available - missing dependencies"
        
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            if page_text := page.extract_text():
                # Clean up the text
                page_text = re.sub(r'\s+', ' ', page_text)  # Normalize whitespace
                page_text = re.sub(r'-\s*\n', '', page_text)  # Join hyphenated words
                page_text = re.sub(r'\n', ' ', page_text)  # Replace newlines with spaces
                text += page_text + "\n"
        
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        return ""

def extract_text_from_docx(docx_bytes: bytes) -> str:
    """Extract text from DOCX bytes"""
    if not CV_PARSER_AVAILABLE:
        return "DOCX parsing not available - missing dependencies"
        
    try:
        doc = docx.Document(io.BytesIO(docx_bytes))
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        return ""

def extract_skills(text):
    """Extract skills from text"""
    if not CV_PARSER_AVAILABLE:
        return ["Skills extraction not available - missing dependencies"]
        
    skills = set()
    
    # Look for skills section
    if "Core Skills" in text:
        skills_text = text.split("Core Skills")[1].split("---")[0].lower()
        
        # Common technical terms to look for
        tech_terms = [
            "python", "javascript", "typescript", "node.js", "git", "rest apis",
            "html", "css", "mongodb", "langchain", "crewai", "openai", "anthropic",
            "make.com", "zapier", "uipath", "n8n", "airtable", "docker", "firebase",
            "faiss", "vector db", "rag", "fastapi", "chart.js", "llm", "ai"
        ]
        
        # Find skills
        for term in tech_terms:
            if term in skills_text:
                # Format skill name appropriately
                if term in ["python", "javascript", "typescript", "mongodb", "docker"]:
                    skills.add(term.capitalize())
                elif "." in term:
                    skills.add(term)  # Keep as is for things like "Make.com"
                else:
                    skills.add(term.upper())  # For acronyms like API, RAG, LLM
    
    return sorted(list(skills))

def extract_experience(text: str) -> float:
    """Extract total years of experience, handling real CV formats"""
    if not CV_PARSER_AVAILABLE:
        return 0.0
        
    import re
    from datetime import datetime

    now = datetime.now()
    date_ranges = []

    # Match formats like "Jan 2020 – Present", "2010 - 2014", "May 2022 - Jun 2024"
    patterns = [
        r"([A-Za-z]{3,9})\s+\d{4}\s*[-–]\s*(Present|[A-Za-z]{3,9}\s+\d{4})",  # "Jan 2020 - Present"
        r"\d{4}\s*[-–]\s*(Present|\d{4})"  # "2010 - 2014"
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            try:
                start_str, end_str = match.group(0).split("–" if "–" in match.group(0) else "-")
                start_str = start_str.strip()
                end_str = end_str.strip()

                # Parse start
                if re.match(r"[A-Za-z]+ \d{4}", start_str):
                    start = datetime.strptime(start_str, "%b %Y" if len(start_str.split()[0]) <= 3 else "%B %Y")
                else:
                    start = datetime.strptime(start_str, "%Y")

                # Parse end
                if end_str.lower() == "present":
                    end = now
                elif re.match(r"[A-Za-z]+ \d{4}", end_str):
                    end = datetime.strptime(end_str, "%b %Y" if len(end_str.split()[0]) <= 3 else "%B %Y")
                else:
                    end = datetime.strptime(end_str, "%Y")

                if end > start:
                    date_ranges.append((start, end))

            except Exception as e:
                print(f"Error parsing: {match.group(0)} – {e}")

    # Merge overlapping ranges
    date_ranges.sort()
    merged = []
    for start, end in date_ranges:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)

    # Calculate total duration
    total_days = sum((end - start).days for start, end in merged)
    return round(total_days / 365.25, 1)


def extract_education(text: str) -> list:
    """Extract clean education and certifications from CV text"""
    if not CV_PARSER_AVAILABLE:
        return [{"degree": "Unknown", "field": "Education extraction not available - missing dependencies"}]

    education = []
    pattern = r"(Bachelor|Master|PhD|B\.Sc\.|M\.Sc\.|B\.Eng\.|M\.Eng\.)\s*(?:in|of)?\s*(.*?)(?=\d{4}|$)"
    for match in re.finditer(pattern, text, re.IGNORECASE):
        field = re.sub(r"[^\w\s\-\/&]", "", match.group(2)).strip()
        if 2 < len(field) < 80:  # Ignore overly long matches
            education.append({"degree": match.group(1), "field": field})

    cert_pattern = r"(?:Certifications|Certificates|Courses)\s*(.*?)\s*(?=(?:Experience|Skills|Education|$))"
    for cert_match in re.finditer(cert_pattern, text, re.IGNORECASE | re.DOTALL):
        lines = cert_match.group(1).split("\n")
        for line in lines:
            line = line.strip("- •\t ")
            if len(line) > 5 and not line.lower().startswith("linkedin"):
                education.append({"degree": "Certification", "field": line})

    return education

def extract_contact(text: str) -> dict:
    """Extract contact information from CV text"""
    if not CV_PARSER_AVAILABLE:
        return {"status": "Contact extraction not available - missing dependencies"}

    contact = {}
    
    # Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        contact["email"] = email_match.group(0)
    
    # Phone
    phone_match = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    if phone_match:
        contact["phone"] = phone_match.group(0)
    
    # LinkedIn
    linkedin_match = re.search(r'(?:linkedin\.com/in/|linkedin\.com/company/)[\w-]+', text)
    if linkedin_match:
        contact["linkedin"] = linkedin_match.group(0)

    # GitHub
    github_match = re.search(r'(?:github\.com/|github\.com/)[\w-]+', text)
    if github_match:
        contact["github"] = github_match.group(0)
    
    return contact

async def run_cv_parser_tool(node_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """Run the CV parser tool with the given node data and inputs"""
    if not CV_PARSER_AVAILABLE:
        logger.warning("CV Parser not available - missing dependencies")
        return {
            "type": "cv_result",
            "data": {
                "experience_years": 0,
                "skills": ["CV Parser not available - missing dependencies"],
                "education": [{"degree": "Unknown", "field": "CV Parser not available - missing dependencies"}],
                "contact": {"status": "CV Parser not available - missing dependencies"},
                "filename": "unknown",
                "extracted_text": "CV Parser not available - missing dependencies"
            }
        }
    
    try:
        logger.info("Starting CV parser tool execution")
        logger.info(f"Node data: {json.dumps(node_data, default=str)}")
        logger.info(f"Inputs: {json.dumps(inputs, default=str)}")

        # Find file data in either node_data or inputs
        file_data = find_file_data_recursive(node_data) or find_file_data_recursive(inputs)
        if not file_data:
            logger.error("No file data found in node_data or inputs")
            return {
                "error": "No file data found in node_data or inputs",
                "type": "error"
            }

        logger.info(f"Found file data: {json.dumps(file_data, default=str)}")

        # Extract text from the file
        if file_data.get("type", "").lower() == "application/pdf":
            text = extract_text_from_pdf(base64.b64decode(file_data["content"]))
        elif file_data.get("type", "").lower() == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            text = extract_text_from_docx(base64.b64decode(file_data["content"]))
        else:
            logger.error(f"Unsupported file type: {file_data.get('type')}")
            return {
                "error": f"Unsupported file type: {file_data.get('type')}",
                "type": "error"
            }

        # Extract information from the text
        skills = extract_skills(text)
        experience = extract_experience(text)
        education = extract_education(text)
        contact = extract_contact(text)

        # Return the extracted information with cv_result type
        return {
            "type": "cv_result",
            "data": {
                "experience_years": experience,
                "skills": skills,
                "education": education,
                "contact": contact,
                "filename": file_data.get("filename", "unknown"),
                "extracted_text": text[:3000]  # Optional: for preview
            }
        }

    except Exception as e:
        logger.error(f"Error in CV parser tool: {str(e)}")
        return {
            "error": f"Error in CV parser tool: {str(e)}",
            "type": "error"
        }