#!/usr/bin/env python3
"""
Test multiple DexScreener endpoints to avoid Osmosis data
"""

import requests
import json

def test_better_endpoints():
    """Test endpoints that avoid Osmosis"""
    
    print("🔍 Testing BETTER DexScreener Endpoints (No Osmosis)")
    print("=" * 60)
    
    endpoints = [
        {
            "name": "Ethereum Only",
            "url": "https://api.dexscreener.com/latest/dex/pairs/ethereum"
        },
        {
            "name": "BSC Only", 
            "url": "https://api.dexscreener.com/latest/dex/pairs/bsc"
        },
        {
            "name": "Base Chain Only",
            "url": "https://api.dexscreener.com/latest/dex/pairs/base"
        },
        {
            "name": "Search PEPE (Popular Token)",
            "url": "https://api.dexscreener.com/latest/dex/search?q=PEPE"
        },
        {
            "name": "Search DOGE",
            "url": "https://api.dexscreener.com/latest/dex/search?q=DOGE"
        }
    ]
    
    for endpoint in endpoints:
        print(f"\n🧪 Testing: {endpoint['name']}")
        print(f"📡 URL: {endpoint['url']}")
        
        try:
            response = requests.get(endpoint['url'], timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                pairs = data.get('pairs', [])
                
                print(f"✅ SUCCESS! Got {len(pairs)} pairs")
                
                if pairs:
                    # Show first pair
                    pair = pairs[0]
                    chain = pair.get('chainId', 'N/A')
                    symbol = pair.get('baseToken', {}).get('symbol', 'N/A')
                    price = pair.get('priceUsd', 'N/A')
                    liquidity = pair.get('liquidity', {}).get('usd', 0)
                    
                    print(f"   🪙 First Token: {symbol}")
                    print(f"   💰 Price: ${price}")
                    print(f"   🌐 Chain: {chain}")
                    print(f"   💧 Liquidity: ${liquidity:,.2f}" if isinstance(liquidity, (int, float)) else f"   💧 Liquidity: {liquidity}")
                    
                    if chain.lower() != 'osmosis':
                        print(f"   ✅ GOOD: No Osmosis!")
                    else:
                        print(f"   ❌ BAD: Still Osmosis")
                        
                else:
                    print("   ⚠️ No pairs found")
                    
            else:
                print(f"   ❌ FAILED: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
    
    print(f"\n🎯 RECOMMENDATION:")
    print(f"Use one of the chain-specific endpoints to avoid Osmosis:")
    print(f"• Ethereum: https://api.dexscreener.com/latest/dex/pairs/ethereum")
    print(f"• BSC: https://api.dexscreener.com/latest/dex/pairs/bsc") 
    print(f"• Base: https://api.dexscreener.com/latest/dex/pairs/base")

if __name__ == "__main__":
    test_better_endpoints() 