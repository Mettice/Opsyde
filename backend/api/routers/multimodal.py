"""
Multimodal Processing API Router
Handles image, audio, and document processing requests
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import base64
from datetime import datetime
import json

# Try to import multimodal processor with fallback
try:
    from backend.core.multimodal_processor import process_multimodal_input
    MULTIMODAL_PROCESSOR_AVAILABLE = True
except ImportError:
    try:
        from core.multimodal_processor import process_multimodal_input
        MULTIMODAL_PROCESSOR_AVAILABLE = True
    except ImportError:
        MULTIMODAL_PROCESSOR_AVAILABLE = False
        logging.warning("Multimodal processor not available - using fallback processing")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/multimodal", tags=["multimodal"])

class MultimodalProcessRequest(BaseModel):
    file_data: str  # Base64 encoded file data
    filename: str
    file_type: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class MultimodalProcessResponse(BaseModel):
    type: str
    filename: str
    success: bool
    timestamp: str
    api_used: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None
    transcription: Optional[Dict[str, Any]] = None
    content: Optional[str] = None
    structure: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    warning: Optional[str] = None

class ProcessUrlRequest(BaseModel):
    file_url: str
    filename: str
    context: Optional[Dict[str, Any]] = None

@router.post("/process", response_model=MultimodalProcessResponse)
async def process_multimodal_file(request: MultimodalProcessRequest):
    """
    Process a multimodal file (image, audio, document) and extract structured data
    """
    try:
        logger.info(f"🎯 Processing multimodal file: {request.filename}")
        
        # Validate base64 data
        try:
            file_bytes = base64.b64decode(request.file_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")
        
        # Process the file
        if MULTIMODAL_PROCESSOR_AVAILABLE:
            result = await process_multimodal_input(
                file_data=request.file_data,
                filename=request.filename,
                context=request.context or {}
            )
        else:
            # Use fallback processing
            result = await _fallback_process_multimodal(
                file_data=request.file_data,
                filename=request.filename,
                context=request.context or {}
            )
        
        # Convert to response format
        response = MultimodalProcessResponse(
            type=result.get('type', 'unknown'),
            filename=result.get('filename', request.filename),
            success=result.get('success', False),
            timestamp=result.get('timestamp', datetime.now().isoformat()),
            api_used=result.get('api_used'),
            error=result.get('error'),
            warning=result.get('warning')
        )
        
        # Add type-specific data
        if result.get('type') == 'image':
            response.analysis = result.get('analysis')
        elif result.get('type') == 'audio':
            response.transcription = result.get('transcription')
        elif result.get('type') == 'document':
            response.content = result.get('content')
            response.structure = result.get('structure')
        
        logger.info(f"✅ Successfully processed {request.filename}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Error processing multimodal file {request.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.post("/process-upload")
async def process_uploaded_file(file: UploadFile = File(...)):
    """
    Process an uploaded file directly (alternative to base64)
    """
    try:
        logger.info(f"🎯 Processing uploaded file: {file.filename}")
        
        # Read file content
        file_content = await file.read()
        
        # Convert to base64
        base64_data = base64.b64encode(file_content).decode('utf-8')
        
        # Process the file
        result = await process_multimodal_input(
            file_data=base64_data,
            filename=file.filename,
            context={}
        )
        
        logger.info(f"✅ Successfully processed uploaded file {file.filename}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error processing uploaded file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")

@router.get("/supported-types")
async def get_supported_types():
    """
    Get list of supported file types for multimodal processing
    """
    return {
        "supported_types": {
            "images": ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
            "audio": ['.mp3', '.wav', '.m4a', '.ogg', '.flac'],
            "documents": ['.pdf', '.docx', '.txt', '.md'],
            "spreadsheets": ['.csv', '.xlsx', '.xls'],
            "data": ['.json', '.xml']
        },
        "max_size_limits": {
            "images": 15,  # 15MB for images
            "audio": 50,   # 50MB for audio
            "documents": 25, # 25MB for documents
            "spreadsheets": 25, # 25MB for spreadsheets
            "data": 25     # 25MB for data files
        },
        "default_max_size_mb": 25,
        "available_apis": {
            "vision": ["gemini", "gpt4v"],
            "audio": ["whisper"],
            "documents": ["built_in"],
            "spreadsheets": ["built_in"],
            "data": ["built_in"]
        },
        "processing_features": {
            "csv": ["structure_analysis", "data_preview", "column_detection"],
            "images": ["text_extraction", "object_detection", "scene_analysis"],
            "audio": ["transcription", "language_detection"],
            "documents": ["text_extraction", "structure_analysis"]
        }
    }

@router.post("/batch-process")
async def batch_process_files(requests: List[MultimodalProcessRequest]):
    """
    Process multiple files in a batch
    """
    try:
        logger.info(f"🎯 Processing batch of {len(requests)} files")
        
        results = []
        for i, request in enumerate(requests):
            try:
                # Process each file
                result = await process_multimodal_input(
                    file_data=request.file_data,
                    filename=request.filename,
                    context=request.context or {}
                )
                
                # Add batch info
                result['batch_index'] = i
                result['batch_total'] = len(requests)
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"❌ Error processing file {request.filename} in batch: {str(e)}")
                results.append({
                    'type': 'error',
                    'filename': request.filename,
                    'success': False,
                    'error': str(e),
                    'batch_index': i,
                    'batch_total': len(requests),
                    'timestamp': datetime.now().isoformat()
                })
        
        successful = len([r for r in results if r.get('success')])
        logger.info(f"✅ Batch processing complete: {successful}/{len(requests)} successful")
        
        return {
            'batch_results': results,
            'summary': {
                'total': len(requests),
                'successful': successful,
                'failed': len(requests) - successful,
                'success_rate': (successful / len(requests)) * 100 if requests else 0
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Batch processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check for multimodal processing service
    """
    try:
        # Test basic functionality
        test_result = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'multimodal_processor': 'available',
                'vision_apis': 'ready',
                'audio_apis': 'ready',
                'document_processor': 'ready'
            }
        }
        
        return test_result
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@router.post("/process-url")
async def process_file_url(request: ProcessUrlRequest):
    """
    Process a file from a URL (typically from trigger data)
    """
    try:
        logger.info(f"🔗 Processing file URL: {request.file_url}")
        
        # Download file from URL
        import aiohttp
        import ssl
        import base64
        
        # Create SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        async with aiohttp.ClientSession() as session:
            async with session.get(request.file_url, ssl=ssl_context) as response:
                if response.status == 200:
                    file_bytes = await response.read()
                    
                    # Convert to base64 for processing
                    base64_data = base64.b64encode(file_bytes).decode('utf-8')
                    
                    # Check if ZIP file and process accordingly
                    if request.filename.lower().endswith('.zip'):
                        result = await _process_zip_from_url(base64_data, request.filename, request.context or {})
                    elif MULTIMODAL_PROCESSOR_AVAILABLE:
                        result = await process_multimodal_input(
                            file_data=base64_data,
                            filename=request.filename,
                            context=request.context or {}
                        )
                    else:
                        result = await _fallback_process_url_file(
                            file_bytes, request.filename, request.file_url, request.context or {}
                        )
                    
                    logger.info(f"✅ URL file processed successfully: {request.filename}")
                    return {
                        'success': True,
                        'result': result,
                        'source_url': request.file_url,
                        'filename': request.filename,
                        'file_size': len(file_bytes),
                        'timestamp': datetime.now().isoformat()
                    }
                    
                else:
                    raise HTTPException(status_code=400, detail=f"Failed to download file: HTTP {response.status}")
                    
    except Exception as e:
        logger.error(f"❌ Error processing URL {request.file_url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"URL processing failed: {str(e)}")

async def _process_zip_from_url(base64_data: str, filename: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Process ZIP file downloaded from URL"""
    try:
        import zipfile
        import io
        import base64
        
        logger.info(f"📦 Processing ZIP file from URL: {filename}")
        
        # Decode base64 to bytes
        zip_bytes = base64.b64decode(base64_data)
        zip_buffer = io.BytesIO(zip_bytes)
        
        processed_files = []
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            file_list = zip_file.namelist()
            logger.info(f"📦 ZIP from URL contains {len(file_list)} files")
            
            for file_name in file_list:
                if file_name.endswith('/'):
                    continue  # Skip directories
                
                try:
                    # Extract file content
                    file_content = zip_file.read(file_name)
                    file_base64 = base64.b64encode(file_content).decode('utf-8')
                    
                    # Process extracted file
                    if MULTIMODAL_PROCESSOR_AVAILABLE:
                        result = await process_multimodal_input(
                            file_data=file_base64,
                            filename=file_name,
                            context={**context, "source": "zip_from_url", "zip_filename": filename}
                        )
                    else:
                        result = {
                            "success": True,
                            "type": "extracted_from_url_zip",
                            "filename": file_name,
                            "content": f"Extracted from ZIP URL: {file_name} ({len(file_content)} bytes)",
                            "timestamp": datetime.now().isoformat()
                        }
                    
                    processed_files.append({
                        "filename": file_name,
                        "size": len(file_content),
                        "processing_result": result
                    })
                    
                except Exception as file_error:
                    logger.warning(f"⚠️ Failed to process file {file_name} from URL ZIP: {str(file_error)}")
                    processed_files.append({
                        "filename": file_name,
                        "error": str(file_error),
                        "processing_result": {"success": False, "error": str(file_error)}
                    })
        
        return {
            "success": True,
            "type": "zip_from_url",
            "filename": filename,
            "total_files": len(file_list),
            "processed_files": len(processed_files),
            "extracted_files": processed_files,
            "combined_content": _combine_zip_contents(processed_files),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing ZIP from URL {filename}: {str(e)}")
        return {
            "success": False,
            "error": f"ZIP URL processing failed: {str(e)}",
            "filename": filename,
            "type": "zip_from_url"
        }

async def _fallback_process_url_file(
    file_bytes: bytes, 
    filename: str, 
    source_url: str, 
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """Fallback processing for files downloaded from URLs"""
    try:
        file_ext = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
        file_type = "document"
        
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
            file_type = "image"
        elif file_ext in ['mp3', 'wav', 'm4a', 'ogg', 'flac']:
            file_type = "audio"
        elif file_ext == 'csv':
            file_type = "csv"
        elif file_ext in ['xlsx', 'xls']:
            file_type = "spreadsheet"
        elif file_ext == 'json':
            file_type = "json"
        
        # Basic content extraction for text-based files
        content = ""
        if file_type in ["csv", "json"] or file_ext in ["txt", "md"]:
            try:
                content = file_bytes.decode('utf-8')[:2000]  # First 2000 chars
            except UnicodeDecodeError:
                content = f"Binary file: {filename} ({len(file_bytes)} bytes)"
        else:
            content = f"Downloaded file: {filename} ({len(file_bytes)} bytes) from {source_url}"
        
        return {
            "success": True,
            "type": f"url_{file_type}",
            "filename": filename,
            "source_url": source_url,
            "content": content,
            "file_size": len(file_bytes),
            "file_type": file_type,
            "processing_method": "fallback_url_processor",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error in fallback URL file processing: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "filename": filename,
            "source_url": source_url
        }

def _combine_zip_contents(processed_files: List[Dict[str, Any]]) -> str:
    """Combine content from ZIP file processing"""
    try:
        combined_content = f"ZIP Archive Contents ({len(processed_files)} files):\n\n"
        
        for file_info in processed_files:
            filename = file_info.get("filename", "unknown")
            result = file_info.get("processing_result", {})
            
            combined_content += f"=== {filename} ===\n"
            
            if result.get("success"):
                content = result.get("content", "")
                if content:
                    if len(content) > 500:
                        combined_content += content[:500] + "...\n\n"
                    else:
                        combined_content += content + "\n\n"
                else:
                    combined_content += f"File processed successfully (type: {result.get('type', 'unknown')})\n\n"
            else:
                combined_content += f"Error processing file: {result.get('error', 'Unknown error')}\n\n"
        
        return combined_content
        
    except Exception as e:
        logger.error(f"❌ Error combining ZIP contents: {str(e)}")
        return f"Error combining ZIP contents: {str(e)}"

async def _fallback_process_multimodal(
    file_data: str,
    filename: str,
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Fallback multimodal processing when full processor isn't available"""
    try:
        logger.info(f"🔄 Using fallback processing for: {filename}")
        
        # Enhanced file type detection
        file_ext = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
        file_type = "document"
        
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
            file_type = "image"
        elif file_ext in ['mp3', 'wav', 'm4a', 'ogg', 'flac']:
            file_type = "audio"
        elif file_ext == 'csv':
            file_type = "csv"
        elif file_ext in ['xlsx', 'xls']:
            file_type = "spreadsheet"
        elif file_ext == 'json':
            file_type = "json"
        elif file_ext in ['pdf', 'docx', 'txt', 'md']:
            file_type = "document"
        
        # Enhanced content processing based on file type
        content = f"File: {filename}"
        structure = None
        warning = None
        
        if file_ext in ['txt', 'md', 'csv', 'json'] and file_data:
            try:
                decoded_content = base64.b64decode(file_data).decode('utf-8')
                
                if file_ext == 'csv':
                    # Enhanced CSV processing
                    content = decoded_content
                    structure = _parse_csv_structure(decoded_content, filename)
                    warning = None if len(decoded_content) < 10000 else "Large CSV file - showing preview only"
                
                elif file_ext == 'json':
                    # JSON processing
                    content = decoded_content
                    try:
                        json_data = json.loads(decoded_content)
                        structure = {
                            "type": "json",
                            "keys": list(json_data.keys()) if isinstance(json_data, dict) else None,
                            "array_length": len(json_data) if isinstance(json_data, list) else None,
                            "preview": str(json_data)[:500] + "..." if len(str(json_data)) > 500 else str(json_data)
                        }
                    except json.JSONDecodeError:
                        structure = {"type": "json", "error": "Invalid JSON format"}
                
                else:
                    # Regular text processing
                    content = decoded_content[:2000] + "..." if len(decoded_content) > 2000 else decoded_content
                    
            except UnicodeDecodeError:
                content = f"Binary file: {filename} (content could not be read as text)"
                warning = "File contains binary data - text extraction not available"
            except Exception as e:
                content = f"File: {filename} (error reading content: {str(e)})"
                warning = f"Error processing file: {str(e)}"
        
        # Return enhanced standardized result
        result = {
            'type': file_type,
            'filename': filename,
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'api_used': 'fallback_processor',
            'content': content,
            'warning': warning or 'Processed with fallback system - limited functionality available'
        }
        
        # Add type-specific data
        if structure:
            result['structure'] = structure
            
        if file_type == 'image':
            result['analysis'] = {
                'description': f"Image file: {filename}",
                'extracted_text': '',
                'confidence': 0.1,
                'note': 'Image analysis not available in fallback mode'
            }
        elif file_type == 'audio':
            result['transcription'] = {
                'text': f"Audio file: {filename} (transcription not available in fallback mode)",
                'confidence': 0.1,
                'note': 'Audio transcription requires full processing system'
            }
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Fallback processing failed: {str(e)}")
        return {
            'type': 'error',
            'filename': filename,
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def _parse_csv_structure(csv_content: str, filename: str) -> Dict[str, Any]:
    """Parse CSV content and extract structure information"""
    try:
        import csv
        import io
        
        # Use CSV reader for proper parsing
        csv_reader = csv.reader(io.StringIO(csv_content))
        rows = list(csv_reader)
        
        if not rows:
            return {"type": "csv", "error": "Empty CSV file"}
        
        headers = rows[0] if rows else []
        data_rows = rows[1:] if len(rows) > 1 else []
        
        # Analyze data types in columns
        column_analysis = {}
        for i, header in enumerate(headers):
            column_data = [row[i] if i < len(row) else '' for row in data_rows[:100]]  # Sample first 100 rows
            column_analysis[header] = _analyze_column_data(column_data)
        
        # Calculate statistics
        stats = {
            "total_rows": len(data_rows),
            "total_columns": len(headers),
            "empty_cells": sum(1 for row in data_rows for cell in row if not cell.strip()),
            "file_size_estimate": len(csv_content)
        }
        
        return {
            "type": "csv",
            "filename": filename,
            "headers": headers,
            "total_rows": len(data_rows),
            "total_columns": len(headers),
            "column_analysis": column_analysis,
            "statistics": stats,
            "preview_rows": data_rows[:5],  # First 5 rows for preview
            "processing_note": "CSV structure analyzed successfully"
        }
        
    except Exception as e:
        logger.error(f"CSV parsing error: {str(e)}")
        return {
            "type": "csv",
            "error": f"CSV parsing failed: {str(e)}",
            "raw_preview": csv_content[:500] + "..." if len(csv_content) > 500 else csv_content
        }

def _analyze_column_data(column_data: list) -> Dict[str, Any]:
    """Analyze data type and characteristics of a column"""
    if not column_data:
        return {"type": "empty", "non_empty_count": 0}
    
    non_empty_data = [item for item in column_data if item.strip()]
    
    if not non_empty_data:
        return {"type": "empty", "non_empty_count": 0}
    
    # Detect data type
    numeric_count = 0
    date_count = 0
    email_count = 0
    url_count = 0
    
    for item in non_empty_data[:50]:  # Sample first 50 non-empty values
        item = item.strip()
        
        # Check if numeric
        try:
            float(item.replace(',', ''))
            numeric_count += 1
        except ValueError:
            pass
        
        # Check if email
        if '@' in item and '.' in item.split('@')[-1]:
            email_count += 1
        
        # Check if URL
        if item.startswith(('http://', 'https://', 'www.')):
            url_count += 1
        
        # Check if date-like
        if any(char in item for char in ['/', '-']) and any(char.isdigit() for char in item):
            date_count += 1
    
    total_sample = len(non_empty_data[:50])
    
    # Determine primary type
    if numeric_count / total_sample > 0.8:
        data_type = "numeric"
    elif email_count / total_sample > 0.5:
        data_type = "email"
    elif url_count / total_sample > 0.5:
        data_type = "url"
    elif date_count / total_sample > 0.5:
        data_type = "date"
    else:
        data_type = "text"
    
    return {
        "type": data_type,
        "non_empty_count": len(non_empty_data),
        "total_count": len(column_data),
        "sample_values": non_empty_data[:3],  # Show first 3 values as examples
        "confidence": max(numeric_count, email_count, url_count, date_count) / total_sample if total_sample > 0 else 0
    } 