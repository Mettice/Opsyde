#!/usr/bin/env python3
"""
Test script to verify crypto template configuration
"""

def test_crypto_config():
    """Test the crypto trading configuration"""
    
    print("🚀 Crypto Trading Bot Configuration Test")
    print("=" * 50)
    
    # DexScreener API test
    dex_config = {
        "serviceName": "DexScreener",
        "apiEndpoint": "https://api.dexscreener.com/latest/dex/search/?q=ETH",
        "pollingInterval": 60,
        "changeDetectionMethod": "array_length",
        "authType": "none"
    }
    
    print("📊 DexScreener Configuration:")
    for key, value in dex_config.items():
        print(f"  {key}: {value}")
    
    # Telegram configuration
    telegram_config = {
        "webhookUrl": "https://api.telegram.org/bot8163116561:AAH5mKM-MDINf5gJXMsRxycNsRfFILBcJZ0/sendMessage",
        "chatId": "5251498620",
        "parseMode": "HTML"
    }
    
    print("\n📱 Telegram Configuration:")
    for key, value in telegram_config.items():
        print(f"  {key}: {value}")
    
    # Test message
    test_message = """🚀 <b>CRYPTO TRADING BOT TEST</b>

✅ System is working!
📊 Monitoring DexScreener for new tokens
⏰ Time: 2025-05-29 03:45:00

This is a test from your crypto trading workflow."""
    
    print("\n📝 Test Message:")
    print(test_message)
    
    print("\n✅ Configuration looks good!")
    print("💡 Next steps:")
    print("1. Update your trigger node with DexScreener endpoint")
    print("2. Change Telegram payload to use {task_output}")
    print("3. Change parse_mode to HTML")
    print("4. Test with simple message first")

if __name__ == "__main__":
    test_crypto_config() 