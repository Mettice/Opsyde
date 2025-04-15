def run_llamaindex_tool(tool_data):
    try:
        query = tool_data.get("query", "What is Opsyde?")
        # Simulation only – replace with real LlamaIndex logic when needed
        return f"[Simulated] LlamaIndex queried: '{query}'"
    except Exception as e:
        return f"[Error] LlamaIndex tool failed: {str(e)}"
