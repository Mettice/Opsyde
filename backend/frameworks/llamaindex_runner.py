import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from llama_index.core import (
    VectorStoreIndex,
    ListIndex,
    TreeIndex,
    KeywordTableIndex,
    Document,
    Settings,
    ServiceContext
)
from llama_index.llms.openai import OpenAI

logger = logging.getLogger(__name__)

async def run_llamaindex_tool(tool_data: Dict[str, Any], inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Run a LlamaIndex-based tool with the given configuration
    """
    try:
        # Extract configuration
        config = tool_data.get("frameworkConfig", {})
        index_type = config.get("index_type", "vector")
        query_mode = config.get("query_mode", "default")
        llm_model = config.get("llm_model", "gpt-4")
        temperature = float(config.get("temperature", 0.7))
        max_tokens = int(config.get("max_tokens", 4000))
        prompt_template = config.get("prompt", "")

        # Extract input text
        input_text = None
        if inputs:
            # Try to get text from various input structures
            for key, value in inputs.items():
                if isinstance(value, dict):
                    # Case 1: Input node result
                    if value.get("type") == "input_result" and "data" in value:
                        for data_key, data_value in value["data"].items():
                            if isinstance(data_value, dict) and "value" in data_value:
                                input_text = str(data_value["value"])
                                break
                    # Case 2: Direct value in data
                    elif "data" in value and isinstance(value["data"], dict):
                        for data_key, data_value in value["data"].items():
                            if isinstance(data_value, dict) and "value" in data_value:
                                input_text = str(data_value["value"])
                                break
                    # Case 3: Nested input structure
                    elif "inputs" in value and isinstance(value["inputs"], dict):
                        for input_key, input_value in value["inputs"].items():
                            if isinstance(input_value, dict) and "value" in input_value:
                                input_text = str(input_value["value"])
                                break
                    # Case 4: Direct value
                    elif "value" in value:
                        input_text = str(value["value"])
                    # Case 5: Text input field
                    elif "text_input" in value:
                        input_text = str(value["text_input"])
                elif isinstance(value, str):
                    input_text = value

                if input_text:
                    break

        # Build prompt with input text
        if input_text:
            prompt = f"{prompt_template}\n\nInput: {input_text}" if prompt_template else input_text
        else:
            prompt = prompt_template

        # Ensure prompt is not empty
        prompt = prompt.strip()
        if not prompt:
            logger.warning("Empty prompt after processing, using default")
            prompt = "Please provide a helpful response."

        # Configure LLM
        llm = OpenAI(
            model=llm_model,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Update global settings
        Settings.llm = llm
        Settings.chunk_size = 512
        Settings.chunk_overlap = 20

        # Create document from prompt
        doc = Document(text=prompt)
        
        # Create appropriate index based on type
        if index_type == "vector":
            index = VectorStoreIndex.from_documents([doc])
        elif index_type == "list":
            index = ListIndex.from_documents([doc])
        elif index_type == "tree":
            index = TreeIndex.from_documents([doc])
        elif index_type == "keyword":
            index = KeywordTableIndex.from_documents([doc])
        else:
            return {
                "type": "error",
                "error": f"Unsupported index type: {index_type}",
                "timestamp": datetime.now().isoformat()
            }

        # Query the index
        query_engine = index.as_query_engine()
        response = query_engine.query(prompt)

        return {
            "type": "tool_result",
            "output": str(response),
            "framework": "llamaindex",
            "metadata": {
                "index_type": index_type,
                "query_mode": query_mode,
                "llm_model": llm_model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "prompt_length": len(prompt),
                "input_text": input_text,
                "timestamp": datetime.now().isoformat()
            }
        }

    except ImportError as e:
        logger.error(f"Import error in LlamaIndex tool: {str(e)}")
        return {
            "type": "error",
            "error": f"LlamaIndex package is not installed correctly: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error in LlamaIndex tool: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
