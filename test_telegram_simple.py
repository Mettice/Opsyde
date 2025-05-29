#!/usr/bin/env python3
"""
Simple Telegram test with different message formats
"""

import requests
import json

# Your actual credentials
BOT_TOKEN = "8163116561:AAH5mKM-MDINf5gJXMsRxycNsRfFILBcJZ0"
CHAT_ID = "5251498620"

def test_simple_message():
    """Test with simple plain text"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    payload = {
        "chat_id": CHAT_ID,
        "text": "Simple test message - no formatting"
    }
    
    print("📤 Testing simple message...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("✅ Simple message sent successfully!")
        return True
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_html_message():
    """Test with HTML formatting"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    payload = {
        "chat_id": CHAT_ID,
        "text": "<b>HTML Test</b>\n\n✅ Bold text\n📊 Emojis work",
        "parse_mode": "HTML"
    }
    
    print("📤 Testing HTML message...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("✅ HTML message sent successfully!")
        return True
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_markdown_message():
    """Test with Markdown formatting"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    payload = {
        "chat_id": CHAT_ID,
        "text": "*Markdown Test*\n\n✅ Bold text\n📊 Emojis work",
        "parse_mode": "Markdown"
    }
    
    print("📤 Testing Markdown message...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("✅ Markdown message sent successfully!")
        return True
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_crypto_message():
    """Test with crypto trading message"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    message = """🚀 CRYPTO TRADING UPDATE

✅ Trade executed successfully
📊 Token: ETH/USDT
💰 Amount: $50
📈 Status: Monitoring

This is your crypto trading bot update."""
    
    payload = {
        "chat_id": CHAT_ID,
        "text": message
    }
    
    print("📤 Testing crypto message...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("✅ Crypto message sent successfully!")
        return True
    else:
        print(f"❌ Failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    print("🤖 Telegram Format Testing")
    print("=" * 40)
    
    # Test different formats
    test_simple_message()
    print()
    
    test_html_message()
    print()
    
    test_markdown_message()
    print()
    
    test_crypto_message()
    print()
    
    print("✅ All tests completed!")
    print("💡 Use the format that worked best in your workflow") 