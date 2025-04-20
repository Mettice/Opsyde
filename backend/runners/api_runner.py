import requests
import logging

logger = logging.getLogger(__name__)

def run_api_tool(tool_data, input_params={}):
    try:
        url = tool_data.get("apiEndpoint")
        if not url:
            return {"output": "[Error] Missing API endpoint", "type": "error"}

        # Log what we're doing
        logger.info(f"Making API request to: {url}")
        logger.info(f"Input parameters: {input_params}")
        
        # Set up headers
        headers = {}
        if tool_data.get("apiKey"):
            headers["Authorization"] = f"Bearer {tool_data['apiKey']}"
            
        # Parse parameter list from string to list
        param_str = tool_data.get("parameters", "")
        param_keys = []
        
        if param_str:
            # Handle both newline and comma-separated parameters
            if "\n" in param_str:
                param_keys = [p.strip() for p in param_str.split("\n") if p.strip()]
            else:
                param_keys = [p.strip() for p in param_str.split(",") if p.strip()]
        
        logger.info(f"Parsed parameter keys: {param_keys}")
        
        # Build payload from input parameters
        payload = {}
        for key in param_keys:
            # Handle key:value format
            if ":" in key:
                k, v = key.split(":", 1)
                payload[k.strip()] = v.strip()
            # Handle regular keys
            elif key in input_params:
                payload[key] = input_params.get(key, "")
        
        logger.info(f"Final payload: {payload}")
        
        # Make the request
        response = requests.get(url, headers=headers, params=payload)
        
        # Try to parse as JSON first
        try:
            result = response.json()
            logger.info(f"API returned JSON: {result}")
            return {
                "output": result,
                "type": "api_result",
                "status_code": response.status_code,
                "content_type": response.headers.get("Content-Type", "")
            }
        except ValueError:
            # Not JSON, return as text
            result = response.text
            logger.info(f"API returned text: {result}")
            return {
                "output": result,
                "type": "api_result",
                "status_code": response.status_code,
                "content_type": response.headers.get("Content-Type", "")
            }

    except Exception as e:
        logger.error(f"API Runner Error: {str(e)}")
        return {
            "output": f"[API Runner Error] {str(e)}",
            "type": "error",
            "error": str(e)
        }
