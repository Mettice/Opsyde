#!/usr/bin/env python3
"""Test CrewAI imports to identify the issue"""

print("🔍 Testing CrewAI imports...")

try:
    from crewai import Agent, Task, Crew, Process
    print("✅ CrewAI core imports successful")
except ImportError as e:
    print(f"❌ CrewAI core import error: {e}")

try:
    from crewai.tools import BaseTool
    print("✅ CrewAI BaseTool import successful")
except ImportError as e:
    print(f"❌ CrewAI BaseTool import error: {e}")

try:
    from crewai.tools import WebSearchTool, CalculatorTool, FileReaderTool
    print("✅ CrewAI built-in tools import successful")
except ImportError as e:
    print(f"❌ CrewAI built-in tools import error: {e}")

try:
    import crewai
    print(f"✅ CrewAI version: {getattr(crewai, '__version__', 'unknown')}")
except Exception as e:
    print(f"❌ Version check error: {e}")

print("\n�� Test complete!") 