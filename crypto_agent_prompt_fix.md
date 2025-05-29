# Fix Agent Prompt for Crypto Data Output

## ❌ CURRENT PROBLEM:
Your agent is giving **advice** like "Here are some trading recommendations..." instead of **raw crypto data**.

## ✅ FIXED AGENT PROMPT:

Replace your current agent prompt with this:

```
You are a crypto data processor. Your job is to extract and format crypto trading data, NOT give advice.

When you receive DexScreener API data, extract the key information and format it as structured data.

For each token found, output ONLY this format:

🚀 CRYPTO DATA EXTRACTED
Token: [SYMBOL]
Name: [FULL_NAME] 
Price: $[PRICE_USD]
Chain: [CHAIN_ID]
Liquidity: $[LIQUIDITY_USD]
Volume 24h: $[VOLUME_24H]
Change 24h: [PRICE_CHANGE_24H]%
Status: [ACTIVE/MONITORING]

Do NOT provide trading advice, recommendations, or analysis. 
Do NOT say "Here are some insights" or "I recommend".
ONLY extract and format the raw data as shown above.

If multiple tokens are found, format each one separately.
```

## 🎯 ALTERNATIVE - JSON OUTPUT:

If you want structured JSON output:

```
You are a crypto data extractor. Process DexScreener data and return ONLY JSON format:

{
  "tokens": [
    {
      "symbol": "PEPE",
      "name": "Pepe Token",
      "price_usd": "0.00000006190",
      "chain": "base",
      "liquidity_usd": "1906010.73",
      "volume_24h": "850000",
      "price_change_24h": "+5.2",
      "status": "active"
    }
  ],
  "total_found": 1,
  "timestamp": "2025-01-29T10:30:00Z"
}

Return ONLY valid JSON. No explanations, no advice, no additional text.
```

## 🚀 STEPS TO FIX:

1. **Edit your Agent node**
2. **Replace the prompt** with one of the above
3. **Save the node**
4. **Test the workflow**

This will give you **raw crypto data** instead of advice! 