import requests

def run_api_tool(tool_data, input_params={}):
    try:
        url = tool_data.get("apiEndpoint")
        if not url:
            return "[Error] Missing API endpoint"

        headers = {}
        if tool_data.get("apiKey"):
            headers["Authorization"] = f"Bearer {tool_data['apiKey']}"

        # Parse parameter list from string to list
        param_keys = tool_data.get("parameters", "").split("\n")
        payload = {key: input_params.get(key, "") for key in param_keys}

        res = requests.post(url, headers=headers, json=payload)
        return res.json() if res.headers.get("Content-Type", "").startswith("application/json") else res.text

    except Exception as e:
        return f"[API Runner Error] {str(e)}"
