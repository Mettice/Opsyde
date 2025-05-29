#!/usr/bin/env python3
"""
🪙 Crypto Monitor Utility
Simple script to monitor and display crypto data fetching in real-time
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, Any, List

class CryptoMonitor:
    """Monitor crypto data fetching for debugging"""
    
    def __init__(self):
        self.last_data = None
        self.fetch_count = 0
        
    async def fetch_dexscreener_data(self, query: str = "PEPE") -> Dict[str, Any]:
        """Fetch data from DexScreener API"""
        url = f"https://api.dexscreener.com/latest/dex/search?q={query}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.fetch_count += 1
                        return data
                    else:
                        print(f"❌ API Error: {response.status}")
                        return None
        except Exception as e:
            print(f"❌ Fetch Error: {e}")
            return None
    
    def display_crypto_data(self, data: Dict[str, Any]) -> None:
        """Display crypto data in a readable format"""
        if not data or 'pairs' not in data:
            print("❌ No crypto data available")
            return
        
        pairs = data.get('pairs', [])
        print(f"\n🪙 DexScreener Data (Fetch #{self.fetch_count})")
        print(f"⏰ Time: {datetime.now().strftime('%H:%M:%S')}")
        print(f"📊 Found {len(pairs)} pairs")
        print("=" * 60)
        
        for i, pair in enumerate(pairs[:5]):  # Show top 5
            token = pair.get('baseToken', {})
            symbol = token.get('symbol', 'Unknown')
            name = token.get('name', 'Unknown')
            price = pair.get('priceUsd', 'N/A')
            liquidity = pair.get('liquidity', {}).get('usd', 'N/A')
            volume24h = pair.get('volume', {}).get('h24', 'N/A')
            change24h = pair.get('priceChange', {}).get('h24', 'N/A')
            chain = pair.get('chainId', 'Unknown')
            
            print(f"🪙 Pair {i+1}: {symbol} ({name})")
            print(f"   💰 Price: ${price}")
            print(f"   💧 Liquidity: ${liquidity}")
            print(f"   📊 Volume 24h: ${volume24h}")
            print(f"   📈 Change 24h: {change24h}%")
            print(f"   🔗 Chain: {chain}")
            print()
    
    def check_for_changes(self, new_data: Dict[str, Any]) -> bool:
        """Check if data has changed since last fetch"""
        if self.last_data is None:
            self.last_data = new_data
            return True
        
        # Simple comparison - check if number of pairs changed
        old_count = len(self.last_data.get('pairs', []))
        new_count = len(new_data.get('pairs', []))
        
        if old_count != new_count:
            print(f"🔄 CHANGE DETECTED: {old_count} → {new_count} pairs")
            self.last_data = new_data
            return True
        
        # Check if any prices changed
        old_pairs = {p.get('baseToken', {}).get('symbol'): p.get('priceUsd') 
                    for p in self.last_data.get('pairs', [])}
        new_pairs = {p.get('baseToken', {}).get('symbol'): p.get('priceUsd') 
                    for p in new_data.get('pairs', [])}
        
        for symbol, new_price in new_pairs.items():
            old_price = old_pairs.get(symbol)
            if old_price != new_price:
                print(f"💰 PRICE CHANGE: {symbol} ${old_price} → ${new_price}")
                self.last_data = new_data
                return True
        
        return False
    
    async def monitor_continuous(self, query: str = "PEPE", interval: int = 60):
        """Continuously monitor crypto data"""
        print(f"🚀 Starting Crypto Monitor for '{query}'")
        print(f"⏱️  Checking every {interval} seconds")
        print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                data = await self.fetch_dexscreener_data(query)
                
                if data:
                    has_changes = self.check_for_changes(data)
                    
                    if has_changes or self.fetch_count == 1:
                        self.display_crypto_data(data)
                    else:
                        print(f"⏰ {datetime.now().strftime('%H:%M:%S')} - No changes detected (Fetch #{self.fetch_count})")
                
                await asyncio.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n👋 Crypto Monitor stopped")

async def main():
    """Main function"""
    monitor = CryptoMonitor()
    
    # Test single fetch
    print("🧪 Testing single fetch...")
    data = await monitor.fetch_dexscreener_data("PEPE")
    if data:
        monitor.display_crypto_data(data)
    
    # Ask user if they want continuous monitoring
    try:
        response = input("\n🔄 Start continuous monitoring? (y/n): ").lower()
        if response == 'y':
            await monitor.monitor_continuous("PEPE", 60)
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main()) 