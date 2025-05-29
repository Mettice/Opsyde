#!/usr/bin/env python3
"""
Test the exact DexScreener endpoint to verify it returns real crypto data
"""

import requests
import json

def test_working_endpoint():
    """Test the working DexScreener endpoint"""
    
    print("🚀 Testing WORKING DexScreener Endpoint")
    print("=" * 50)
    
    # The WORKING endpoint
    url = "https://api.dexscreener.com/latest/dex/search?q=ETH"
    
    try:
        print(f"📡 Testing: {url}")
        response = requests.get(url, timeout=10)
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ SUCCESS! Got {len(data.get('pairs', []))} pairs")
            
            # Show first 3 pairs
            pairs = data.get('pairs', [])[:3]
            
            for i, pair in enumerate(pairs, 1):
                print(f"\n🪙 Token {i}:")
                print(f"   Symbol: {pair.get('baseToken', {}).get('symbol', 'N/A')}")
                print(f"   Name: {pair.get('baseToken', {}).get('name', 'N/A')}")
                print(f"   Price: ${pair.get('priceUsd', 'N/A')}")
                print(f"   Chain: {pair.get('chainId', 'N/A')}")
                print(f"   Liquidity: ${pair.get('liquidity', {}).get('usd', 'N/A'):,}")
                print(f"   Volume 24h: ${pair.get('volume', {}).get('h24', 'N/A'):,}")
                print(f"   Change 24h: {pair.get('priceChange', {}).get('h24', 'N/A')}%")
            
            print(f"\n🎯 RESULT: This endpoint returns REAL crypto data!")
            print(f"📈 Use this in your trigger: {url}")
            
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    test_working_endpoint() 