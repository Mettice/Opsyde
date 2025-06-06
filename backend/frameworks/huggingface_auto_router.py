#!/usr/bin/env python3
"""
🚦 HuggingFace Auto-Router
Smart routing system for HuggingFace tasks with production-tested methods
"""

import logging
from typing import Dict, Any, Optional
from huggingface_hub import InferenceClient
import aiohttp
import asyncio

logger = logging.getLogger(__name__)

class HuggingFaceAutoRouter:
    """Smart auto-router for HuggingFace tasks with fallback mechanisms"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = InferenceClient(token=api_key)
    
    async def route_task(
        self, 
        task: str, 
        model: str, 
        inputs: Dict[str, Any],
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Route to appropriate task handler"""
        try:
            logger.info(f"🚦 Auto-routing task: {task} with model: {model}")
            
            # Clean inputs first - remove node metadata and extract actual text
            cleaned_inputs = self._clean_inputs(inputs, task)
            logger.info(f"🧹 Cleaned inputs: {cleaned_inputs}")
            
            if task == "question-answering":
                return await self._route_question_answering(model, cleaned_inputs, config)
            elif task == "text-classification":
                return await self._route_text_classification(model, cleaned_inputs, config)
            elif task == "summarization":
                return await self._route_summarization(model, cleaned_inputs, config)
            elif task == "zero-shot-classification":
                return await self._route_zero_shot_classification(model, cleaned_inputs, config)
            elif task == "text-generation":
                return await self._route_text_generation(model, cleaned_inputs, config)
            elif task == "feature-extraction":
                return await self._route_feature_extraction(model, cleaned_inputs, config)
            elif task == "token-classification":
                return await self._route_token_classification(model, cleaned_inputs, config)
            else:
                # Generic task routing for unknown tasks
                return await self._route_generic_task(task, model, cleaned_inputs, config)
                
        except Exception as e:
            logger.error(f"❌ Task routing failed: {str(e)}")
            return {
                "success": False,
                "error": f"Task routing failed: {str(e)}",
                "task": task,
                "model": model
            }

    def _clean_inputs(self, inputs: Dict[str, Any], task: str) -> Dict[str, Any]:
        """Clean and format inputs for HuggingFace API"""
        try:
            # Extract text from various possible sources
            text_content = None
            
            # First, check for task-specific inputs from HuggingFace configuration
            if "text" in inputs:
                text_content = inputs["text"]
            elif "inputs" in inputs:
                if isinstance(inputs["inputs"], str):
                    text_content = inputs["inputs"]
                elif isinstance(inputs["inputs"], dict):
                    # Handle nested inputs
                    nested = inputs["inputs"]
                    if "text" in nested:
                        text_content = nested["text"]
                    elif isinstance(nested, dict) and len(nested) == 1:
                        # Single key-value pair, use the value
                        text_content = list(nested.values())[0]
            
            # If no direct text found, look for file input content
            if not text_content:
                for key, value in inputs.items():
                    if key.startswith("input_from_"):
                        # This is data from an input node
                        if isinstance(value, dict):
                            # Check for file content
                            if "value" in value and isinstance(value["value"], dict):
                                file_data = value["value"]
                                if "extracted_text" in file_data:
                                    text_content = file_data["extracted_text"]
                                elif "file_content" in file_data:
                                    text_content = file_data["file_content"]
                                elif "value" in file_data and file_data["value"]:
                                    text_content = file_data["value"]
            
            # If still no text content, try to get any string value
            if not text_content:
                for key, value in inputs.items():
                    if isinstance(value, str) and value.strip():
                        text_content = value
                        break
            
            # Format for specific tasks
            if task == "token-classification":
                return {"inputs": text_content or "No text provided"}
            elif task == "text-classification":
                return {"inputs": text_content or "No text provided"}
            elif task == "summarization":
                return {"inputs": text_content or "No text provided"}
            elif task == "question-answering":
                # Keep original structure for Q&A
                if "question" in inputs and "context" in inputs:
                    return {"inputs": {"question": inputs["question"], "context": inputs["context"]}}
                else:
                    return {"inputs": {"question": "What is this about?", "context": text_content or "No context provided"}}
            else:
                # Generic formatting
                return {"inputs": text_content or "No text provided"}
                
        except Exception as e:
            logger.error(f"❌ Input cleaning failed: {str(e)}")
            # Fallback to simple text extraction
            text = str(inputs.get("text", inputs.get("inputs", "No text provided")))
            return {"inputs": text}

    async def _route_question_answering(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle question-answering with both InferenceClient and HTTP fallback"""
        try:
            # Extract question and context from inputs
            qa_input = inputs.get("inputs", inputs)
            
            if isinstance(qa_input, dict) and 'question' in qa_input and 'context' in qa_input:
                question = qa_input['question']
                context = qa_input['context']
                
                logger.info(f"🔍 Q&A: question='{question}', context preview='{context[:100]}...'")
                
                try:
                    # Primary method: InferenceClient
                    result = self.client.question_answering(
                        question=question,
                        context=context,
                        model=model
                    )
                    
                    if isinstance(result, dict):
                        answer = result.get('answer', str(result))
                        score = result.get('score', 0)
                        return {
                            "success": True,
                            "output": f"{answer} (confidence: {score:.1%})",
                            "answer": answer,
                            "confidence": score,
                            "method": "inference_client"
                        }
                    else:
                        return {
                            "success": True,
                            "output": str(result),
                            "method": "inference_client"
                        }
                        
                except Exception as client_error:
                    logger.warning(f"⚠️ InferenceClient failed, trying HTTP fallback: {client_error}")
                    
                    # Fallback method: Direct HTTP API
                    return await self._http_fallback_qa(model, question, context)
                    
            else:
                return {
                    "success": False,
                    "error": f"Invalid Q&A format. Expected dict with 'question' and 'context', got: {type(qa_input)}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Question-answering routing failed: {str(e)}"
            }
    
    async def _route_text_classification(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle text classification tasks"""
        try:
            text_input = inputs.get("inputs", inputs.get("text", ""))
            
            if isinstance(text_input, dict):
                text_input = text_input.get("text", str(text_input))
            
            logger.info(f"🏷️ Text classification: '{text_input[:100]}...'")
            
            result = self.client.text_classification(text_input, model=model)
            
            if isinstance(result, list) and len(result) > 0:
                best_result = result[0]
                label = best_result.get('label', 'unknown')
                score = best_result.get('score', 0)
                
                return {
                    "success": True,
                    "output": f"Sentiment: {label} (confidence: {score:.1%})",
                    "label": label,
                    "confidence": score,
                    "all_results": result
                }
            else:
                return {
                    "success": True,
                    "output": str(result),
                    "raw_result": result
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Text classification routing failed: {str(e)}"
            }
    
    async def _route_summarization(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle text summarization"""
        try:
            text_input = inputs.get("inputs", inputs.get("text", ""))
            
            if isinstance(text_input, dict):
                text_input = text_input.get("text", str(text_input))
            
            logger.info(f"📄 Summarization: '{text_input[:100]}...'")
            
            result = self.client.summarization(text_input, model=model)
            
            if isinstance(result, list) and len(result) > 0:
                summary = result[0].get('summary_text', str(result))
                return {
                    "success": True,
                    "output": summary,
                    "summary": summary
                }
            else:
                return {
                    "success": True,
                    "output": str(result),
                    "raw_result": result
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Summarization routing failed: {str(e)}"
            }
    
    async def _route_zero_shot_classification(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle zero-shot classification"""
        try:
            input_data = inputs.get("inputs", inputs)
            text = input_data.get("text", "")
            candidate_labels = input_data.get("candidate_labels", [])
            
            logger.info(f"🎯 Zero-shot classification: '{text[:100]}...' with labels: {candidate_labels}")
            
            result = self.client.zero_shot_classification(
                text,
                candidate_labels,
                model=model
            )
            
            if isinstance(result, dict):
                labels = result.get('labels', [])
                scores = result.get('scores', [])
                
                if labels and scores:
                    best_label = labels[0]
                    best_score = scores[0]
                    
                    return {
                        "success": True,
                        "output": f"Classification: {best_label} (confidence: {best_score:.1%})",
                        "best_label": best_label,
                        "confidence": best_score,
                        "all_labels": labels,
                        "all_scores": scores
                    }
                    
            return {
                "success": True,
                "output": str(result),
                "raw_result": result
            }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Zero-shot classification routing failed: {str(e)}"
            }
    
    async def _route_text_generation(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle text generation"""
        try:
            text_input = inputs.get("inputs", inputs.get("text", ""))
            
            if isinstance(text_input, dict):
                text_input = text_input.get("text", str(text_input))
            
            logger.info(f"✍️ Text generation: '{text_input[:100]}...'")
            
            generation_config = {
                "max_new_tokens": config.get("max_tokens", 100) if config else 100,
                "temperature": config.get("temperature", 0.7) if config else 0.7,
                "do_sample": True
            }
            
            result = self.client.text_generation(
                text_input,
                model=model,
                parameters=generation_config
            )
            
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get('generated_text', str(result))
                return {
                    "success": True,
                    "output": generated_text,
                    "generated_text": generated_text
                }
            else:
                return {
                    "success": True,
                    "output": str(result),
                    "raw_result": result
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Text generation routing failed: {str(e)}"
            }
    
    async def _route_feature_extraction(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle feature extraction"""
        try:
            text_input = inputs.get("inputs", inputs.get("text", ""))
            
            if isinstance(text_input, dict):
                text_input = text_input.get("text", str(text_input))
            
            logger.info(f"🧠 Feature extraction: '{text_input[:100]}...'")
            
            result = self.client.feature_extraction(text_input, model=model)
            
            return {
                "success": True,
                "output": f"Extracted {len(result[0]) if result and len(result) > 0 else 0} features",
                "features": result,
                "feature_count": len(result[0]) if result and len(result) > 0 else 0
            }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Feature extraction routing failed: {str(e)}"
            }
    
    async def _route_generic_task(
        self, 
        task: str,
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle generic tasks using HTTP API"""
        try:
            logger.info(f"🔄 Generic task routing: {task}")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            url = f"https://api-inference.huggingface.co/models/{model}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=inputs) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "output": str(result),
                            "raw_result": result,
                            "method": "generic_http"
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Generic task failed: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {
                "success": False,
                "error": f"Generic task routing failed: {str(e)}"
            }
    
    async def _http_fallback_qa(self, model: str, question: str, context: str) -> Dict[str, Any]:
        """HTTP API fallback for question-answering"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "inputs": {
                    "question": question,
                    "context": context
                }
            }
            
            url = f"https://api-inference.huggingface.co/models/{model}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        if isinstance(result, dict):
                            answer = result.get('answer', str(result))
                            score = result.get('score', 0)
                            return {
                                "success": True,
                                "output": f"{answer} (confidence: {score:.1%})",
                                "answer": answer,
                                "confidence": score,
                                "method": "http_fallback"
                            }
                        else:
                            return {
                                "success": True,
                                "output": str(result),
                                "method": "http_fallback"
                            }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"HTTP fallback failed: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {
                "success": False,
                "error": f"HTTP fallback exception: {str(e)}"
            }

    async def _route_token_classification(
        self, 
        model: str, 
        inputs: Dict[str, Any], 
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle token classification (NER) tasks"""
        try:
            text_input = inputs.get("inputs", "")
            
            logger.info(f"🏷️ Token classification (NER): '{text_input[:100]}...'")
            
            result = self.client.token_classification(text_input, model=model)
            
            if isinstance(result, list):
                # Format the results nicely
                entities = []
                output_parts = []
                
                for entity in result:
                    # Safely handle None values
                    entity_raw = entity.get('entity') or 'UNKNOWN'
                    entity_type = entity_raw.replace('B-', '').replace('I-', '') if entity_raw else 'UNKNOWN'
                    word = entity.get('word') or ''
                    confidence = entity.get('score', 0)
                    
                    entities.append({
                        "entity": entity_type,
                        "word": word,
                        "confidence": confidence,
                        "start": entity.get('start', 0),
                        "end": entity.get('end', 0)
                    })
                    
                    if word:  # Only add to output if word is not empty
                        output_parts.append(f"{word} ({entity_type}: {confidence:.1%})")
                
                output_text = "Entities: " + ", ".join(output_parts) if output_parts else "No entities found"
                
                return {
                    "success": True,
                    "output": output_text,
                    "entities": entities,
                    "entity_count": len(entities),
                    "raw_result": result
                }
            else:
                return {
                    "success": True,
                    "output": str(result),
                    "raw_result": result
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Token classification routing failed: {str(e)}"
            }


# Global router instance
_router_cache = {}

async def get_huggingface_router(api_key: str) -> HuggingFaceAutoRouter:
    """Get or create a HuggingFace auto-router instance"""
    if api_key not in _router_cache:
        _router_cache[api_key] = HuggingFaceAutoRouter(api_key)
    return _router_cache[api_key]

async def route_huggingface_task(
    task: str, 
    model: str, 
    inputs: Dict[str, Any],
    api_key: str,
    config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Main routing function for HuggingFace tasks
    
    Args:
        task: The HuggingFace task type (e.g., 'question-answering')
        model: The model to use (e.g., 'deepset/roberta-base-squad2')
        inputs: Input data for the task
        api_key: HuggingFace API key
        config: Optional configuration parameters
    
    Returns:
        Dict with success status and results
    """
    try:
        router = await get_huggingface_router(api_key)
        return await router.route_task(task, model, inputs, config)
    except Exception as e:
        logger.error(f"❌ HuggingFace routing failed: {str(e)}")
        return {
            "success": False,
            "error": f"Routing failed: {str(e)}",
            "task": task,
            "model": model
        } 