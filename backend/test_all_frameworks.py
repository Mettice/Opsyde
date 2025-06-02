#!/usr/bin/env python3
"""
Test script to check all framework availability
"""

from framework_registry import framework_registry
import asyncio

async def test_all_frameworks():
    print("🔍 Checking Framework Availability...\n")
    
    # Get framework availability
    frameworks = framework_registry.get_available_frameworks()
    
    print("📊 Framework Status:")
    print("-" * 50)
    
    for fw in frameworks:
        status_icon = "✅" if fw['available'] else "❌"
        print(f"{status_icon} {fw['name'].ljust(15)} - {fw['status']}")
    
    print("\n🔧 Registered Frameworks:")
    print("-" * 30)
    for name in framework_registry._frameworks.keys():
        print(f"  - {name}")
    
    print(f"\n📈 Total Frameworks: {len(frameworks)}")
    available_count = sum(1 for fw in frameworks if fw['available'])
    print(f"📈 Available: {available_count}/{len(frameworks)}")

if __name__ == "__main__":
    asyncio.run(test_all_frameworks()) 