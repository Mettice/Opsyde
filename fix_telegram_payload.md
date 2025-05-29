# Fix Telegram Webhook JSON Payload

## Current BROKEN payload:
```json
{
  "chat_id": "5251498620",
  "text": "{{output}}"
  "parse_mode": "HTML"
}
```

## ✅ FIXED payload (add the missing comma):
```json
{
  "chat_id": "5251498620",
  "text": "{task_output}",
  "parse_mode": "HTML"
}
```

## Alternative - Remove parse_mode completely:
```json
{
  "chat_id": "5251498620",
  "text": "{task_output}"
}
```

## Steps to Fix:
1. Go to your Telegram output node
2. Edit the webhook payload
3. Add the missing comma after "{{output}}"
4. Change "{{output}}" to "{task_output}"
5. Save the node 