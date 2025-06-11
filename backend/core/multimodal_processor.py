"""
Multimodal Input Processor for CrewBuilder
Handles image, audio, and document processing using AI services
"""

import os
import base64
import logging
import mimetypes
from typing import Dict, Any, Optional, Union, List
import asyncio
import aiohttp
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class MultimodalProcessor:
    """Processes multimodal inputs (image, audio, documents) into text/structured data"""
    
    def __init__(self):
        self.supported_image_types = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        self.supported_audio_types = ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
        self.supported_document_types = ['.pdf', '.docx', '.txt', '.md', '.csv']
        
    async def process_multimodal_input(
        self, 
        file_data: Union[str, bytes], 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process multimodal input and extract structured data
        
        Args:
            file_data: File data (base64 string or bytes)
            filename: Name of the file to determine type
            context: Execution context with API keys
            
        Returns:
            Dict with processed data and metadata
        """
        try:
            # Determine file type
            file_ext = os.path.splitext(filename.lower())[1]
            mime_type = mimetypes.guess_type(filename)[0]
            
            logger.info(f"🎯 Processing multimodal input: {filename} ({file_ext})")
            
            # Route to appropriate processor
            if file_ext in self.supported_image_types:
                return await self._process_image(file_data, filename, context)
            elif file_ext in self.supported_audio_types:
                return await self._process_audio(file_data, filename, context)
            elif file_ext in self.supported_document_types:
                return await self._process_document(file_data, filename, context)
            else:
                return {
                    'type': 'unsupported',
                    'filename': filename,
                    'error': f'Unsupported file type: {file_ext}',
                    'supported_types': {
                        'images': self.supported_image_types,
                        'audio': self.supported_audio_types,
                        'documents': self.supported_document_types
                    }
                }
                
        except Exception as e:
            logger.error(f"❌ Multimodal processing failed for {filename}: {str(e)}")
            return {
                'type': 'error',
                'filename': filename,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _process_image(
        self, 
        image_data: Union[str, bytes], 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process image using vision AI (Gemini, GPT-4V, etc.)"""
        try:
            # Convert to base64 if needed
            if isinstance(image_data, bytes):
                base64_image = base64.b64encode(image_data).decode('utf-8')
            else:
                base64_image = image_data
                
            # Try different vision APIs in order of preference
            api_results = []
            
            # Try Gemini Vision (Google)
            gemini_result = await self._process_with_gemini_vision(base64_image, filename, context)
            if gemini_result and not gemini_result.get('error'):
                api_results.append(('gemini', gemini_result))
            
            # Try GPT-4V (OpenAI) as fallback
            gpt4v_result = await self._process_with_gpt4_vision(base64_image, filename, context)
            if gpt4v_result and not gpt4v_result.get('error'):
                api_results.append(('gpt4v', gpt4v_result))
            
            # Use the best result
            if api_results:
                best_api, best_result = api_results[0]  # Use first successful result
                return {
                    'type': 'image',
                    'filename': filename,
                    'analysis': best_result,
                    'api_used': best_api,
                    'timestamp': datetime.now().isoformat(),
                    'success': True
                }
            else:
                # Fallback: Basic image metadata
                return {
                    'type': 'image',
                    'filename': filename,
                    'analysis': {
                        'description': f'Image file: {filename}',
                        'extracted_text': '',
                        'objects': [],
                        'confidence': 0.1
                    },
                    'api_used': 'fallback',
                    'warning': 'No vision API available, using basic metadata',
                    'timestamp': datetime.now().isoformat(),
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"❌ Image processing failed: {str(e)}")
            return {
                'type': 'image',
                'filename': filename,
                'error': str(e),
                'success': False
            }
    
    async def _process_audio(
        self, 
        audio_data: Union[str, bytes], 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process audio using Whisper or similar STT service"""
        try:
            # Try OpenAI Whisper first
            whisper_result = await self._process_with_whisper(audio_data, filename, context)
            if whisper_result and not whisper_result.get('error'):
                return {
                    'type': 'audio',
                    'filename': filename,
                    'transcription': whisper_result,
                    'api_used': 'whisper',
                    'timestamp': datetime.now().isoformat(),
                    'success': True
                }
            
            # Fallback: Basic audio metadata
            return {
                'type': 'audio',
                'filename': filename,
                'transcription': {
                    'text': f'Audio file: {filename} (transcription not available)',
                    'confidence': 0.1
                },
                'api_used': 'fallback',
                'warning': 'No audio transcription API available',
                'timestamp': datetime.now().isoformat(),
                'success': False
            }
            
        except Exception as e:
            logger.error(f"❌ Audio processing failed: {str(e)}")
            return {
                'type': 'audio',
                'filename': filename,
                'error': str(e),
                'success': False
            }
    
    async def _process_document(
        self, 
        doc_data: Union[str, bytes], 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process documents (PDF, DOCX, etc.) and extract text/structure"""
        try:
            file_ext = os.path.splitext(filename.lower())[1]
            
            if file_ext == '.txt' or file_ext == '.md':
                # Plain text files
                if isinstance(doc_data, bytes):
                    content = doc_data.decode('utf-8')
                else:
                    content = base64.b64decode(doc_data).decode('utf-8')
                    
                return {
                    'type': 'document',
                    'filename': filename,
                    'content': content,
                    'structure': {
                        'type': 'plain_text',
                        'length': len(content),
                        'lines': len(content.split('\n'))
                    },
                    'api_used': 'built_in',
                    'timestamp': datetime.now().isoformat(),
                    'success': True
                }
            
            elif file_ext == '.csv':
                # CSV files
                if isinstance(doc_data, bytes):
                    content = doc_data.decode('utf-8')
                else:
                    content = base64.b64decode(doc_data).decode('utf-8')
                
                # Parse CSV structure
                lines = content.split('\n')
                headers = lines[0].split(',') if lines else []
                rows = len(lines) - 1 if len(lines) > 1 else 0
                
                return {
                    'type': 'document',
                    'filename': filename,
                    'content': content,
                    'structure': {
                        'type': 'csv',
                        'headers': headers,
                        'rows': rows,
                        'columns': len(headers)
                    },
                    'api_used': 'built_in',
                    'timestamp': datetime.now().isoformat(),
                    'success': True
                }
            
            else:
                # Complex documents (PDF, DOCX) - would need specialized libraries
                return {
                    'type': 'document',
                    'filename': filename,
                    'content': f'Document: {filename}',
                    'structure': {
                        'type': file_ext,
                        'note': 'Content extraction not implemented for this file type'
                    },
                    'api_used': 'fallback',
                    'warning': f'Document parsing not implemented for {file_ext}',
                    'timestamp': datetime.now().isoformat(),
                    'success': False
                }
                
        except Exception as e:
            logger.error(f"❌ Document processing failed: {str(e)}")
            return {
                'type': 'document',
                'filename': filename,
                'error': str(e),
                'success': False
            }
    
    async def _process_with_gemini_vision(
        self, 
        base64_image: str, 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Process image with Google Gemini Vision API"""
        try:
            # Get API key from context
            api_key = self._get_api_key('gemini', context) or self._get_api_key('google', context)
            if not api_key:
                logger.warning("⚠️ No Gemini API key available")
                return None
                
            url = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key={api_key}"
            
            payload = {
                "contents": [{
                    "parts": [
                        {"text": "Analyze this image and provide: 1) A detailed description, 2) Any text you can see, 3) Objects/elements present, 4) Any relevant metadata. Format as JSON with keys: description, extracted_text, objects, metadata."},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        if 'candidates' in result and result['candidates']:
                            content = result['candidates'][0]['content']['parts'][0]['text']
                            
                            # Try to parse as JSON, fallback to text
                            try:
                                parsed_content = json.loads(content)
                                return parsed_content
                            except:
                                return {
                                    'description': content,
                                    'extracted_text': '',
                                    'objects': [],
                                    'metadata': {'raw_response': content}
                                }
                    else:
                        logger.warning(f"⚠️ Gemini API error: {response.status}")
                        return None
                        
        except Exception as e:
            logger.warning(f"⚠️ Gemini vision processing failed: {str(e)}")
            return None
    
    async def _process_with_gpt4_vision(
        self, 
        base64_image: str, 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Process image with OpenAI GPT-4V API"""
        try:
            # Get API key from context
            api_key = self._get_api_key('openai', context)
            if not api_key:
                logger.warning("⚠️ No OpenAI API key available")
                return None
                
            url = "https://api.openai.com/v1/chat/completions"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "gpt-4-vision-preview",
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this image and provide: 1) A detailed description, 2) Any text you can see, 3) Objects/elements present, 4) Any relevant metadata. Format as JSON with keys: description, extracted_text, objects, metadata."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }],
                "max_tokens": 1000
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        if 'choices' in result and result['choices']:
                            content = result['choices'][0]['message']['content']
                            
                            # Try to parse as JSON, fallback to text
                            try:
                                parsed_content = json.loads(content)
                                return parsed_content
                            except:
                                return {
                                    'description': content,
                                    'extracted_text': '',
                                    'objects': [],
                                    'metadata': {'raw_response': content}
                                }
                    else:
                        logger.warning(f"⚠️ OpenAI API error: {response.status}")
                        return None
                        
        except Exception as e:
            logger.warning(f"⚠️ GPT-4V processing failed: {str(e)}")
            return None
    
    async def _process_with_whisper(
        self, 
        audio_data: Union[str, bytes], 
        filename: str,
        context: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Process audio with OpenAI Whisper API"""
        try:
            # Get API key from context
            api_key = self._get_api_key('openai', context)
            if not api_key:
                logger.warning("⚠️ No OpenAI API key available")
                return None
                
            url = "https://api.openai.com/v1/audio/transcriptions"
            
            headers = {
                "Authorization": f"Bearer {api_key}"
            }
            
            # Prepare form data
            if isinstance(audio_data, str):
                audio_bytes = base64.b64decode(audio_data)
            else:
                audio_bytes = audio_data
                
            form_data = aiohttp.FormData()
            form_data.add_field('file', audio_bytes, filename=filename)
            form_data.add_field('model', 'whisper-1')
            form_data.add_field('response_format', 'json')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=form_data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            'text': result.get('text', ''),
                            'confidence': 0.9  # Whisper doesn't provide confidence scores
                        }
                    else:
                        logger.warning(f"⚠️ Whisper API error: {response.status}")
                        return None
                        
        except Exception as e:
            logger.warning(f"⚠️ Whisper processing failed: {str(e)}")
            return None
    
    def _get_api_key(self, provider: str, context: Dict[str, Any] = None) -> Optional[str]:
        """Get API key for a provider from context or environment"""
        if context:
            # Try to get from execution context
            if hasattr(context, 'get_api_key_for_framework'):
                return context.get_api_key_for_framework(provider)
            elif isinstance(context, dict):
                user_keys = context.get('user_keys', {})
                return user_keys.get(provider) or user_keys.get(f"{provider}_api_key")
        
        # Fallback to environment variables
        env_key = f"{provider.upper()}_API_KEY"
        return os.getenv(env_key)

# Global instance
multimodal_processor = MultimodalProcessor()

# Convenience function
async def process_multimodal_input(
    file_data: Union[str, bytes], 
    filename: str,
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Convenience function to process multimodal inputs"""
    return await multimodal_processor.process_multimodal_input(file_data, filename, context) 