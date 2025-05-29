# 🚨 IMMEDIATE FIXES FOR YOUR ISSUES

## **Issue 1: OpenRouter Limit Reached - Switch to OpenAI**

### **Quick Fix - Update Environment Variables:**
```bash
# In your .env file, comment out OpenRouter and use OpenAI:
# OPENROUTER_API_KEY=your_openrouter_key  # Comment this out
OPENAI_API_KEY=your_openai_key_here

# Make sure this is set:
LLM_DEFAULT_PROVIDER=openai
```

### **Fix Agent Node Configuration:**
1. Go to your Crypto Data Extractor agent node
2. Change these settings:
   - **Framework**: Keep as `crewai`
   - **LLM Provider**: Select `OpenAI` (not OpenRouter)
   - **Model**: Select `gpt-4` or `gpt-3.5-turbo`
   - **API Key**: Enter your OpenAI key directly

## **Issue 2: Fix Telegram JSON Error**

### **Current BROKEN Payload:**
```json
{
  "chat_id": "5251498620",
  "text": "{task_output}"
  "parse_mode": "HTML"
}
```

### **✅ FIXED Payload:**
```json
{
  "chat_id": "5251498620",
  "text": "{task_output}",
  "parse_mode": "HTML"
}
```

**OR Remove parse_mode completely:**
```json
{
  "chat_id": "5251498620",
  "text": "{task_output}"
}
```

### **Steps to Fix:**
1. Open your Telegram output node
2. Edit the webhook payload
3. Add the missing comma after `"{task_output}"`
4. Save the node

## **Issue 3: Backend LLM Provider Selection**

The issue is in the backend framework mapping. The system is hardcoded to use OpenRouter for all providers.

### **Files to Check:**
- `backend/frameworks/crewai_runner.py` - Line 50-70 (LLM selection)
- `backend/frameworks/ai_integration_runner.py` - Line 387-431 (Provider mapping)
- `backend/frameworks/shared_api_research.py` - Line 60-80 (LLM priority)

### **Quick Backend Fix:**
Update your agent node to explicitly use OpenAI by setting:
```python
# In agent configuration
frameworkConfig: {
  provider: "openai",
  model: "gpt-4",
  api_key: "your_openai_key"
}
```

## **Issue 4: User API Key Management**

You already have the infrastructure built! Files found:
- `backend/models/user_settings.py` - Complete user settings system
- `backend/services/user_service.py` - User management
- `src/components/APIKeyManager.jsx` - Frontend key management

### **Integration Needed:**
1. Connect user settings to workflow execution
2. Use user's API keys instead of environment variables
3. Add API key management to dashboard

## **🎯 IMMEDIATE ACTION PLAN:**

### **Step 1: Fix Current Workflow (5 minutes)**
1. Add your OpenAI API key to environment
2. Fix the Telegram JSON comma error
3. Test the workflow

### **Step 2: Backend Provider Fix (15 minutes)**
1. Update the LLM provider selection logic
2. Ensure OpenAI is used when selected
3. Test with your OpenAI key

### **Step 3: User Management Integration (30 minutes)**
1. Connect existing user settings to workflows
2. Add API key management to dashboard
3. Implement BYOK for all users

## **🚀 QUICK TEST:**

After fixing the comma and switching to OpenAI:
1. Run your crypto workflow
2. Should get real DexScreener data
3. Should receive clean Telegram message
4. No more OpenRouter 402 errors

**Want me to implement these fixes step by step?** 