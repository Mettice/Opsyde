import logging
from typing import Dict, Any
from datetime import datetime

from models.data import NodeData
from core.llm_runner import llm_runner

logger = logging.getLogger(__name__)

def evaluate_condition(condition: str, inputs: Dict[str, Any]) -> bool:
    """
    Safely evaluate a condition string with given inputs
    Handles both Python and JavaScript-style conditions
    """
    try:
        # 🚀 FIX: Convert JavaScript-style conditions to Python
        python_condition = convert_js_to_python_condition(condition)
        
        # Create a safe evaluation context with the inputs
        # Make inputs available both as 'inputs' dict and as individual variables
        eval_globals = {
            "inputs": inputs,
            **inputs  # Unpack inputs so they're available as individual variables
        }
        
        logger.debug(f"Original condition: {condition}")
        logger.debug(f"Python condition: {python_condition}")
        logger.debug(f"Available variables: {list(eval_globals.keys())}")
        
        # Evaluate the condition
        result = eval(python_condition, eval_globals, {})
        logger.info(f"Condition '{condition}' evaluated to: {result}")
        return bool(result)
    except Exception as e:
        logger.error(f"Error evaluating condition '{condition}': {str(e)}")
        logger.error(f"Available inputs: {inputs}")
        return False

def convert_js_to_python_condition(condition: str) -> str:
    """
    Convert JavaScript-style logical conditions to Python-compatible syntax
    """
    # Replace JavaScript operators with Python equivalents
    conversions = {
        # Logical operators
        '&&': ' and ',
        '||': ' or ',
        '!': ' not ',
        
        # Equality/inequality operators  
        '===': ' == ',
        '!==': ' != ',
        
        # Null/undefined checks
        '!== null': ' is not None',
        '=== null': ' is None',
        '!== undefined': ' is not None',
        '=== undefined': ' is None',
        ' null': ' None',
        ' undefined': ' None',
        
        # String comparisons
        '!== ""': ' != ""',
        '=== ""': ' == ""',
    }
    
    python_condition = condition
    for js_syntax, py_syntax in conversions.items():
        python_condition = python_condition.replace(js_syntax, py_syntax)
    
    # Handle variables that might not exist in inputs
    # Add safety checks for undefined variables
    if 'response' in python_condition and 'response' not in python_condition.split('inputs.get('):
        # Wrap direct variable references in inputs.get() for safety
        python_condition = python_condition.replace('response', 'inputs.get("response", inputs.get("input", inputs.get("result", "")))')
    
    return python_condition

async def run_logic_node(data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run a logic node that evaluates a condition and determines the flow path
    
    Args:
        data: Logic node configuration including condition
        inputs: Input values to use in condition evaluation
        
    Returns:
        Dictionary containing the evaluation result and metadata
    """
    try:
        # Extract the condition from node data
        condition = data.get("condition", "True")
        if not condition:
            condition = "True"
            
        # Log the evaluation attempt
        logger.info(f"Evaluating logic condition: {condition}")
        logger.debug(f"With inputs: {inputs}")
        
        # Evaluate the condition
        result = evaluate_condition(condition, inputs)
        
        # 🚀 ENHANCED: Include original input data in the output for data flow
        # Get the actual data from the main input (usually the first/primary input)
        main_input_data = None
        if inputs:
            # Find the main input data (prefer task output, then agent output, then any data)
            for key, value in inputs.items():
                if 'task' in key.lower() or 'agent' in key.lower():
                    main_input_data = value
                    break
            
            # Fallback to first input if no task/agent input found
            if main_input_data is None:
                main_input_data = next(iter(inputs.values()))
        
        # Return structured response with original data preserved
        return {
            "type": "logic_result",
            "output": {
                "condition": condition,
                "result": result,
                "path": "true" if result else "false"
            },
            # 🚀 CRITICAL: Preserve the original input data for downstream nodes
            "value": main_input_data,  # This ensures data flows through
            "original_inputs": inputs,  # Keep all inputs for debugging
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "logic",
                "condition_evaluated": condition,
                "data_passed_through": main_input_data is not None
            }
        }
        
    except Exception as e:
        logger.error(f"Error in logic node: {str(e)}")
        return {
            "type": "error",
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "node_type": "logic"
            }
        }

async def process_logic_node(
    node_data: Dict[str, Any], 
    inputs: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> NodeData:
    """Enhanced logic node processor with LLM-centric processing support"""
    
    try:
        # 🚀 CHECK FOR LLM-CENTRIC MODE
        llm_mode_enabled = node_data.get('llm_mode_enabled', False)
        
        # If LLM-centric mode is enabled, use LLM Runner for intelligent logic evaluation
        if llm_mode_enabled:
            logger.info(f"🤖 Using LLM-centric processing for logic node")
            
            # Prepare input data for LLM logic evaluation
            llm_input_data = {
                'node_id': node_data.get('nodeId', node_data.get('id', 'unknown')),
                'node_type': 'logic',
                'node_config': node_data,
                'condition': node_data.get('condition', 'True'),
                'inputs': {key: value.value if isinstance(value, NodeData) else value for key, value in inputs.items()},
                'description': f"Evaluate the logic condition '{node_data.get('condition', 'True')}' based on the provided inputs"
            }
            
            # Get user ID from context
            user_id = None
            if context and isinstance(context, dict):
                user_id = context.get('user_id')
            
            # Execute LLM task for logic reasoning
            llm_result = await llm_runner.execute_llm_task(
                task_type='agent_reasoning',
                input_data=llm_input_data,
                context=context or {},
                user_id=user_id,
                stream=False
            )
            
            if llm_result.get('success'):
                # LLM processing successful - return standardized result
                llm_output = llm_result.get('output', {})
                
                # Extract boolean result from LLM reasoning
                reasoning = llm_output.get('reasoning', '')
                llm_decision = llm_output.get('output', 'false').lower()
                logic_result = 'true' in llm_decision or 'yes' in llm_decision or llm_decision == '1'
                
                # Get main input data for preservation
                main_input_data = None
                for key, value in inputs.items():
                    if isinstance(value, NodeData) and not value.is_error():
                        main_input_data = value.value
                        break
                    elif not isinstance(value, NodeData):
                        main_input_data = value
                        break
                
                standardized_result = {
                    "success": True,
                    "data": main_input_data,  # 🔑 PRESERVE INPUT DATA FOR DOWNSTREAM FLOW
                    "error": None,
                    "metadata": {
                        "node_type": "logic",
                        "processing_mode": "llm_centric",
                        "condition": node_data.get('condition', 'True'),
                        "logic_result": logic_result,
                        "path": "true" if logic_result else "false",
                        "llm_reasoning": reasoning,
                        "llm_confidence": llm_output.get('confidence', 0.8),
                        "llm_metadata": llm_result.get('metadata', {}),
                        "timestamp": datetime.now().isoformat(),
                        "data_preserved": main_input_data is not None
                    }
                }
                
                logger.info(f"✅ LLM-centric logic evaluation: {logic_result} (condition: {node_data.get('condition')})")
                return NodeData.from_value(standardized_result)
            else:
                # LLM processing failed, fall back to traditional processing
                logger.warning(f"LLM-centric logic processing failed, falling back to traditional processing: {llm_result.get('error')}")
        
        # 🚀 TRADITIONAL PROCESSING WITH ENHANCED DATA PRESERVATION
        preserved_data = {}
        main_input_data = None
        all_input_values = {}
        
        for key, value in inputs.items():
            if isinstance(value, NodeData):
                if value.is_error():
                    return NodeData.from_error(f"Input '{key}' has error: {value.error}")
                # Extract clean data from NodeData
                actual_value = value.value
            else:
                actual_value = value
            
            # Handle standardized format data extraction for logic evaluation
            if isinstance(actual_value, dict):
                if "success" in actual_value and "data" in actual_value:
                    if actual_value["success"]:
                        clean_data = actual_value["data"]
                        preserved_data[key] = clean_data
                        # For logic evaluation, also extract comparable values
                        if isinstance(clean_data, dict):
                            # Extract simple values for logic conditions
                            for sub_key, sub_value in clean_data.items():
                                all_input_values[f"{key}_{sub_key}"] = sub_value
                            all_input_values[key] = clean_data
                        else:
                            all_input_values[key] = clean_data
                        # Use first successful input as main data to preserve
                        if main_input_data is None:
                            main_input_data = clean_data
                    else:
                        return NodeData.from_error(f"Input '{key}' failed: {actual_value.get('error')}")
                elif "_clean_data" in actual_value:
                    clean_data = actual_value["_clean_data"]
                    preserved_data[key] = clean_data
                    all_input_values[key] = clean_data
                    if main_input_data is None:
                        main_input_data = clean_data
                else:
                    preserved_data[key] = actual_value
                    all_input_values.update(actual_value)
                    if main_input_data is None:
                        main_input_data = actual_value
            else:
                preserved_data[key] = actual_value
                all_input_values[key] = actual_value
                if main_input_data is None:
                    main_input_data = actual_value
        
        # Extract condition and evaluate
        condition = node_data.get("condition", "True")
        if not condition:
            condition = "True"
            
        logger.info(f"Evaluating logic condition: {condition}")
        logger.debug(f"With evaluation data: {all_input_values}")
        
        # Evaluate the condition using traditional logic
        result = evaluate_condition(condition, all_input_values)
        
        # 🚀 STANDARDIZE OUTPUT FORMAT WITH PRESERVED DATA
        standardized_result = {
            "success": True,
            "data": main_input_data,  # 🔑 CRITICAL: Pass through the main input data
            "error": None,
            "metadata": {
                "node_type": "logic",
                "processing_mode": "traditional",
                "condition_evaluated": condition,
                "logic_result": result,
                "path": "true" if result else "false",
                "preserved_inputs": preserved_data,  # Keep all inputs for debugging
                "evaluation_data": all_input_values,  # Keep evaluation context
                "timestamp": datetime.now().isoformat(),
                "data_preserved": main_input_data is not None
            }
        }
        
        return NodeData.from_value(standardized_result)
            
    except Exception as e:
        logger.error(f"Error in logic node processor: {str(e)}")
        return NodeData.from_error(f"Logic node processing failed: {str(e)}") 