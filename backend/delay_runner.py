import asyncio
import re

async def run_delay_node(data: dict):
    duration_str = data.get("duration", "5s")
    match = re.match(r"(\d+)(s|m|h)", duration_str.strip().lower())
    if not match:
        return f"Invalid delay format: {duration_str}"

    value, unit = match.groups()
    value = int(value)
    seconds = value * (60 if unit == "m" else 3600 if unit == "h" else 1)

    await asyncio.sleep(seconds)
    return f"Waited for {duration_str}"

