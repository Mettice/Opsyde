#!/usr/bin/env python3
"""
Quick Telegram Bot Test Script
Replace the placeholders with your actual values and run this to test your bot.
"""

import requests
import json

# REPLACE THESE WITH YOUR ACTUAL VALUES
BOT_TOKEN = "8163116561:AAH5mKM-MDINf5gJXMsRxycNsRfFILBcJZ0"  # From BotFather
CHAT_ID = "5251498620"     # From getUpdates API call

def test_telegram_bot():
    """Test sending a message to Telegram"""
    
    if BOT_TOKEN == "YOUR_BOT_TOKEN_HERE" or CHAT_ID == "YOUR_CHAT_ID_HERE":
        print("❌ Please update BOT_TOKEN and CHAT_ID in this script first!")
        print("\n📋 Setup Instructions:")
        print("1. Get bot token from @BotFather")
        print("2. Get chat ID from: https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates")
        print("3. Update the values in this script")
        print("4. Run again")
        return False
    
    # Test message
    message = """
🚀 **Crypto Trading Bot Test**

✅ Bot is working correctly!
💰 Ready to send trading notifications
📊 All systems operational

This is a test message from your Nodai crypto trading workflow.
    """
    
    # Telegram API URL
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    # Payload
    payload = {
        "chat_id": CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    try:
        print("📤 Sending test message to Telegram...")
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            print("✅ SUCCESS! Message sent to Telegram")
            print(f"📱 Check your Telegram chat for the test message")
            return True
        else:
            print(f"❌ FAILED! Status code: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    print("🤖 Telegram Bot Test Script")
    print("=" * 40)
    test_telegram_bot() 