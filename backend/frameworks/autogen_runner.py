def run_autogen_tool(tool_data):
    try:
        input_text = tool_data.get("input", "Default message")
        # Simulation only – replace with actual Autogen agent logic
        return f"[Simulated] Autogen agent responded to: '{input_text}'"
    except Exception as e:
        return f"[Error] Autogen tool failed: {str(e)}"
