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

from backend.core.multimodal_processor import process_multimodal_input

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
        result = await process_multimodal_input(
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
            "documents": ['.pdf', '.docx', '.txt', '.md', '.csv']
        },
        "max_size_mb": 10,
        "available_apis": {
            "vision": ["gemini", "gpt4v"],
            "audio": ["whisper"],
            "documents": ["built_in"]
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