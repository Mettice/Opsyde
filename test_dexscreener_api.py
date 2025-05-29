#!/usr/bin/env python3
"""
Test DexScreener API endpoints to find the right one for crypto data
"""

import requests
import json

def test_dexscreener_endpoints():
    """Test different DexScreener API endpoints"""
    
    print("🔍 Testing DexScreener API Endpoints")
    print("=" * 50)
    
    endpoints = [
        {
            "name": "Search ETH/USDT pairs",
            "url": "https://api.dexscreener.com/latest/dex/search?q=ETH/USDT"
        },
        {
            "name": "Search PEPE token",
            "url": "https://api.dexscreener.com/latest/dex/search?q=PEPE"
        },
        {
            "name": "Latest boosted tokens",
            "url": "https://api.dexscreener.com/token-boosts/latest/v1"
        },
        {
            "name": "Top boosted tokens",
            "url": "https://api.dexscreener.com/token-boosts/top/v1"
        },
        {
            "name": "Search SOL pairs",
            "url": "https://api.dexscreener.com/latest/dex/search?q=SOL"
        }
    ]
    
    for endpoint in endpoints:
        print(f"\n📊 Testing: {endpoint['name']}")
        print(f"🔗 URL: {endpoint['url']}")
        
        try:
            response = requests.get(endpoint['url'], timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Analyze the response
                if isinstance(data, dict):
                    if 'pairs' in data:
                        pairs_count = len(data['pairs'])
                        print(f"✅ Success! Found {pairs_count} pairs")
                        
                        if pairs_count > 0:
                            first_pair = data['pairs'][0]
                            print(f"📈 Sample token: {first_pair.get('baseToken', {}).get('symbol', 'Unknown')}")
                            print(f"💰 Price USD: ${first_pair.get('priceUsd', 'N/A')}")
                            print(f"🏦 Chain: {first_pair.get('chainId', 'Unknown')}")
                            print(f"💧 Liquidity: ${first_pair.get('liquidity', {}).get('usd', 'N/A')}")
                    elif isinstance(data, list):
                        print(f"✅ Success! Found {len(data)} items")
                        if len(data) > 0:
                            first_item = data[0]
                            print(f"📊 Sample data: {list(first_item.keys())[:5]}")
                    else:
                        print(f"✅ Success! Response keys: {list(data.keys())}")
                else:
                    print(f"✅ Success! Response type: {type(data)}")
                    
            else:
                print(f"❌ Failed: {response.status_code}")
                print(f"Response: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    print(f"\n💡 Recommendation:")
    print(f"Use 'Search ETH/USDT pairs' or 'Latest boosted tokens' for your crypto bot")

def test_specific_endpoint():
    """Test the recommended endpoint in detail"""
    
    print(f"\n🎯 Detailed Test: ETH/USDT Search")
    print("=" * 40)
    
    url = "https://api.dexscreener.com/latest/dex/search?q=ETH/USDT"
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ API Response successful!")
            print(f"📊 Total pairs found: {len(data.get('pairs', []))}")
            
            # Show first 3 pairs
            for i, pair in enumerate(data.get('pairs', [])[:3]):
                print(f"\n🪙 Token #{i+1}:")
                print(f"  Symbol: {pair.get('baseToken', {}).get('symbol', 'Unknown')}")
                print(f"  Name: {pair.get('baseToken', {}).get('name', 'Unknown')}")
                print(f"  Price: ${pair.get('priceUsd', 'N/A')}")
                print(f"  Chain: {pair.get('chainId', 'Unknown')}")
                print(f"  Liquidity: ${pair.get('liquidity', {}).get('usd', 'N/A')}")
                print(f"  24h Volume: ${pair.get('volume', {}).get('h24', 'N/A')}")
                print(f"  24h Change: {pair.get('priceChange', {}).get('h24', 'N/A')}%")
            
            print(f"\n🔧 This endpoint is perfect for your crypto bot!")
            
        else:
            print(f"❌ Failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_dexscreener_endpoints()
    test_specific_endpoint() 