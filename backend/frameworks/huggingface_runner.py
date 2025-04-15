def run_huggingface_tool(tool_data):
    """
    Simplified function that simulates HuggingFace model output
    """
    try:
        model_name = tool_data.get("model", "gpt2")
        prompt = tool_data.get("prompt", "Hello world")
        max_length = int(tool_data.get("max_length", 50))

        # Simulate model output
        return f"[Simulated] HuggingFace model {model_name} response to: '{prompt}' (max length: {max_length})"
    except Exception as e:
        return f"[Error] HuggingFace tool failed: {str(e)}"
