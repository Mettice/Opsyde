#!/usr/bin/env python3
"""
Simple test to verify DexScreener API returns real crypto data
"""

import requests
import json

def test_dexscreener_endpoint():
    """Test the DexScreener endpoint and show real crypto data"""
    
    endpoint = "https://api.dexscreener.com/latest/dex/search?q=PEPE"
    
    print(f"🔍 Testing DexScreener endpoint: {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ SUCCESS! Status: {response.status_code}")
            print(f"📊 Response type: {type(data)}")
            
            if isinstance(data, dict):
                print(f"🔑 Top-level keys: {list(data.keys())}")
                
                # Check for pairs data
                if 'pairs' in data:
                    pairs = data['pairs']
                    print(f"💰 Found {len(pairs)} trading pairs")
                    
                    # Show first 3 pairs
                    for i, pair in enumerate(pairs[:3]):
                        if isinstance(pair, dict):
                            print(f"\n🚀 PAIR {i+1}:")
                            print(f"   Token: {pair.get('baseToken', {}).get('name', 'Unknown')}")
                            print(f"   Symbol: {pair.get('baseToken', {}).get('symbol', 'Unknown')}")
                            print(f"   Price: ${pair.get('priceUsd', 'Unknown')}")
                            print(f"   Chain: {pair.get('chainId', 'Unknown')}")
                            print(f"   Liquidity: ${pair.get('liquidity', {}).get('usd', 'Unknown')}")
                            print(f"   Volume 24h: ${pair.get('volume', {}).get('h24', 'Unknown')}")
                            print(f"   Price Change: {pair.get('priceChange', {}).get('h24', 'Unknown')}%")
                
                # Show raw structure for debugging
                print(f"\n📋 Raw data structure (first 500 chars):")
                print(json.dumps(data, indent=2)[:500] + "...")
                
            else:
                print(f"📋 Raw response: {data}")
                
            return True
            
        else:
            print(f"❌ FAILED! Status: {response.status_code}")
            print(f"📋 Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 DexScreener API Test")
    print("=" * 50)
    
    success = test_dexscreener_endpoint()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ Test PASSED - DexScreener API is working!")
        print("💡 The endpoint returns real crypto data")
    else:
        print("❌ Test FAILED - Check your internet connection")
        print("💡 Try a different endpoint or check API status") 