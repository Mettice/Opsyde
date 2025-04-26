import requests
from datetime import datetime
import logging
import json
import os
import asyncio
import aiohttp
from typing import Dict, Any, List, AsyncGenerator

logger = logging.getLogger(__name__)

# Define supported models with their configurations
SUPPORTED_MODELS = {
    'meta-llama/Llama-2-70b-chat-hf': {
        'type': 'chat',
        'max_length': 4096,
        'supports_streaming': True
    },
    'mistralai/Mistral-7B-Instruct-v0.2': {
        'type': 'chat',
        'max_length': 8192,
        'supports_streaming': True
    },
    'tiiuae/falcon-180B-chat': {
        'type': 'chat',
        'max_length': 2048,
        'supports_streaming': True
    },
    'google/flan-t5-xxl': {
        'type': 'text',
        'max_length': 512,
        'supports_streaming': False
    },
    'bigscience/bloom': {
        'type': 'text',
        'max_length': 2048,
        'supports_streaming': True
    },
    'microsoft/phi-2': {
        'type': 'chat',
        'max_length': 2048,
        'supports_streaming': True
    }
}

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

async def run_huggingface_tool(tool_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run a HuggingFace tool with proper error handling"""
    try:
        # Extract tool configuration
        label = tool_data.get("label", "Unknown Tool")
        inputs = tool_data.get("inputs") or {}
        
        logger.info(f"Processing HuggingFace tool '{label}'")
        logger.debug(f"Tool inputs: {json.dumps(inputs, default=str)}")
        
        # Get file data from inputs
        file_data = None
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
                "type": "error",
                "error": "File must have both content and filename"
            }
        
        logger.info(f"Processing file: {filename}")
        
        # Process file based on type
        try:
            if filename.lower().endswith('.pdf'):
                result = await process_pdf(content)
            elif filename.lower().endswith(('.doc', '.docx')):
                result = await process_document(content)
            elif filename.lower().endswith(('.txt', '.md')):
                result = await process_text(content)
            else:
                return {
                    "type": "error",
                    "error": f"Unsupported file type: {filename}"
                }
            
            return {
                "type": "tool_result",
                "output": result,
                "metadata": {
                    "filename": filename,
                    "timestamp": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            return {
                "type": "error",
                "error": f"File processing error: {str(e)}"
            }
            
    except Exception as e:
        logger.error(f"Error in HuggingFace tool: {str(e)}")
        return {
            "type": "error",
            "error": str(e)
        }

async def process_pdf(content: str) -> Dict[str, Any]:
    """Process PDF content"""
    try:
        import base64
        import io
        from PyPDF2 import PdfReader
        
        # Decode base64 content
        pdf_bytes = base64.b64decode(content)
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PdfReader(pdf_file)
        
        # Extract text
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        # Extract metadata
        info = pdf_reader.metadata
        
        return {
            "text": text,
            "metadata": {
                "pages": len(pdf_reader.pages),
                "title": info.get('/Title', ''),
                "author": info.get('/Author', ''),
                "creation_date": info.get('/CreationDate', '')
            }
        }
    except Exception as e:
        raise Exception(f"PDF processing error: {str(e)}")

async def process_document(content: str) -> Dict[str, Any]:
    """Process Word document content"""
    try:
        import base64
        import io
        from docx import Document
        
        # Decode base64 content
        doc_bytes = base64.b64decode(content)
        doc_file = io.BytesIO(doc_bytes)
        doc = Document(doc_file)
        
        # Extract text
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        
        return {
            "text": text,
            "metadata": {
                "paragraphs": len(doc.paragraphs)
            }
        }
    except Exception as e:
        raise Exception(f"Document processing error: {str(e)}")

async def process_text(content: str) -> Dict[str, Any]:
    """Process plain text content"""
    try:
        import base64
        
        # Decode base64 content
        text = base64.b64decode(content).decode('utf-8')
        
        return {
            "text": text,
            "metadata": {
                "length": len(text),
                "lines": len(text.splitlines())
            }
        }
    except Exception as e:
        raise Exception(f"Text processing error: {str(e)}")

async def stream_huggingface_response(
    messages: List[Dict[str, str]],
    model: str,
    temperature: float = 0.7,
    max_tokens: int = 500
) -> AsyncGenerator[str, None]:
    """Stream responses from HuggingFace's API"""
    try:
        api_token = os.getenv("HUGGINGFACE_API_KEY")
        if not api_token:
            raise ValueError("HUGGINGFACE_API_KEY not found in environment variables")

        # Format messages for streaming
        formatted_messages = format_messages_for_model(messages, model)

        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

        data = {
            "inputs": formatted_messages,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_tokens,
                "return_full_text": False,
                "do_sample": True,
                "stream": True
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"https://api-inference.huggingface.co/models/{model}",
                headers=headers,
                json=data
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"HuggingFace API error: {response.status} - {error_text}")

                async for chunk in response.content:
                    if chunk:
                        try:
                            chunk_data = json.loads(chunk)
                            if isinstance(chunk_data, list):
                                text = chunk_data[0].get("generated_text", "")
                            elif isinstance(chunk_data, dict):
                                text = chunk_data.get("generated_text", "")
                            else:
                                text = str(chunk_data)
                            
                            yield text
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to decode chunk: {chunk}")
                            continue

    except Exception as e:
        logger.error(f"Error in HuggingFace streaming: {str(e)}")
        raise

def format_messages_for_model(messages: List[Dict[str, str]], model: str) -> str:
    """Format messages based on the model type"""
    model_config = SUPPORTED_MODELS.get(model)
    if not model_config:
        raise ValueError(f"Unsupported model: {model}")

    if model_config['type'] == 'chat':
        formatted_messages = []
        for msg in messages:
            if msg["role"] == "system":
                formatted_messages.append(f"<|system|>\n{msg['content']}</s>")
            elif msg["role"] == "user":
                formatted_messages.append(f"<|user|>\n{msg['content']}</s>")
            elif msg["role"] == "assistant":
                formatted_messages.append(f"<|assistant|>\n{msg['content']}</s>")
        return "\n".join(formatted_messages) + "\n<|assistant|>\n"
    else:
        # For non-chat models, concatenate all messages
        return " ".join(msg["content"] for msg in messages)

async def run_huggingface_chat(
    messages: List[Dict[str, str]],
    model: str,
    temperature: float = 0.7,
    max_tokens: int = 500,
    stream: bool = False
) -> str:
    """
    Run a chat completion using HuggingFace's API with streaming support
    """
    try:
        # Validate model
        if model not in SUPPORTED_MODELS:
            raise ValueError(f"Unsupported model: {model}. Available models: {list(SUPPORTED_MODELS.keys())}")

        # Check if streaming is supported
        if stream and not SUPPORTED_MODELS[model]['supports_streaming']:
            logger.warning(f"Streaming not supported for {model}, falling back to non-streaming mode")
            stream = False

        # Get API token
        api_token = os.getenv("HUGGINGFACE_API_KEY")
        if not api_token:
            raise ValueError("HUGGINGFACE_API_KEY not found in environment variables")

        # Format messages
        formatted_messages = format_messages_for_model(messages, model)

        # Prepare headers
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

        # Prepare request data
        data = {
            "inputs": formatted_messages,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": min(max_tokens, SUPPORTED_MODELS[model]['max_length']),
                "return_full_text": False,
                "do_sample": True
            }
        }

        if stream:
            full_response = ""
            async for chunk in stream_huggingface_response(messages, model, temperature, max_tokens):
                full_response += chunk
            return full_response

        # Non-streaming request
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"https://api-inference.huggingface.co/models/{model}",
                headers=headers,
                json=data
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"HuggingFace API error: {response.status} - {error_text}")

                result = await response.json()

                # Handle different response formats
                if isinstance(result, list):
                    text = result[0].get("generated_text", "")
                elif isinstance(result, dict):
                    text = result.get("generated_text", "")
                else:
                    text = str(result)

                # Clean up the response
                text = text.strip()
                if text.endswith("</s>"):
                    text = text[:-4]

                return text

    except Exception as e:
        logger.error(f"Error in HuggingFace chat: {str(e)}")
        raise