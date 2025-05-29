# 🧠 Logic Node - Universal Decision Making Guide

## Overview

Logic Nodes are the decision-making powerhouses of your workflows. They evaluate conditions and route your workflow based on AI outputs, data values, or any other criteria. Think of them as intelligent traffic controllers that direct your workflow down different paths based on the data they receive.

## 🎯 Universal Applications

### Crypto Trading
- **Buy/Sell Decisions**: `decision == "STRONG_BUY" && confidence > 0.8`
- **Risk Management**: `risk_score < 0.3 && red_flags.length == 0`
- **Portfolio Limits**: `position_size < max_position && total_exposure < 0.1`

### Business Automation
- **Lead Qualification**: `score > 80 && sentiment == "positive"`
- **Content Approval**: `tone == "professional" && word_count > 100`
- **Priority Routing**: `priority == "high" && response_time < 24`

### Data Processing
- **Quality Control**: `status == "completed" && error_count == 0`
- **Performance Monitoring**: `execution_time < 10 && token_usage < 2000`
- **Threshold Alerts**: `value > threshold && trend == "increasing"`

## 🔍 How Field Detection Works

### Automatic Field Detection
Logic Nodes automatically detect available fields from connected nodes:

1. **Agent Nodes**: Analyzes the agent's prompt and role to predict output fields
2. **Trigger Nodes**: Provides trigger-specific fields (api_data, service_name, etc.)
3. **Task Nodes**: Offers standard task outputs (result, status, execution_time)
4. **Tool Nodes**: Exposes tool-specific outputs based on tool type

### Smart Pattern Recognition
The system recognizes patterns in your agent prompts:

**Crypto Trading Patterns**:
```
Prompt contains: "decision", "BUY", "trading"
→ Detected fields: decision, confidence, risk_score, reasons, red_flags
```

**Market Analysis Patterns**:
```
Prompt contains: "market", "analysis", "research"
→ Detected fields: market_trend, sentiment, score, recommendation
```

**Content Generation Patterns**:
```
Prompt contains: "email", "content", "write"
→ Detected fields: subject, body, tone, word_count
```

## 📝 Building Logic Conditions

### Basic Syntax

#### String Comparisons
```javascript
// Exact match
decision == "STRONG_BUY"

// Not equal
status != "error"

// Contains text
response.includes("success")

// Starts/ends with
message.startswith("Error:")
```

#### Number Comparisons
```javascript
// Greater than
confidence > 0.8
score >= 75

// Less than
risk_score < 0.3
price <= 100

// Range check
score >= 70 && score <= 90
```

#### Array Operations
```javascript
// Check array length
red_flags.length == 0
reasons.length > 2

// Check if array contains item
tags.includes("verified")
categories.includes("high-priority")

// Empty/non-empty arrays
errors.length == 0  // Empty
results.length > 0  // Not empty
```

### Advanced Logic

#### Combining Conditions
```javascript
// AND logic (both must be true)
decision == "BUY" && confidence > 0.7

// OR logic (either can be true)
priority == "high" || score > 90

// Complex combinations
(decision == "BUY" || decision == "STRONG_BUY") && risk_score < 0.5

// Negation
!(status == "error" || confidence < 0.5)
```

#### Nested Conditions
```javascript
// Grouped logic
(confidence > 0.8 && risk_score < 0.3) || (confidence > 0.9 && risk_score < 0.5)

// Multiple criteria
score > 80 && sentiment == "positive" && response_time < 24 && verified == true
```

## 🚀 Real-World Examples

### 1. Crypto Trading Bot
```javascript
// Strong buy signal with risk management
decision == "STRONG_BUY" && confidence > 0.8 && risk_score < 0.3 && red_flags.length == 0

// Conservative trading
(decision == "BUY" && confidence > 0.75) || (decision == "STRONG_BUY" && confidence > 0.6)

// Stop-loss trigger
current_price < entry_price * 0.95 || profit_percentage > 20
```

### 2. Lead Qualification System
```javascript
// High-quality lead
score > 85 && sentiment == "positive" && company_size > 100

// Urgent follow-up needed
(score > 70 && last_contact_days > 7) || priority == "hot"

// Qualified for sales team
budget > 10000 && decision_maker == true && timeline == "immediate"
```

### 3. Content Moderation
```javascript
// Auto-approve content
tone == "professional" && word_count > 100 && word_count < 500 && sentiment_score > 0.7

// Flag for review
contains_sensitive_words == true || sentiment_score < 0.3 || confidence < 0.6

// Reject automatically
spam_score > 0.8 || inappropriate_content == true
```

### 4. Performance Monitoring
```javascript
// System healthy
response_time < 2000 && error_rate < 0.01 && cpu_usage < 80

// Warning threshold
response_time > 2000 || error_rate > 0.01 || memory_usage > 85

// Critical alert
response_time > 5000 || error_rate > 0.05 || system_down == true
```

## 🎨 Visual Builder vs Code Editor

### Visual Builder
- **Best for**: Beginners, simple conditions, quick setup
- **Features**: Drag-and-drop interface, field suggestions, operator selection
- **Use when**: Building straightforward conditions with 1-3 criteria

### Code Editor
- **Best for**: Advanced users, complex logic, custom conditions
- **Features**: Full JavaScript-like syntax, unlimited complexity
- **Use when**: Need nested conditions, custom functions, or complex logic

## 🔧 Field Types Reference

### String Fields
- **Operators**: `==`, `!=`, `.includes()`, `.startswith()`, `.endswith()`
- **Examples**: `status == "completed"`, `message.includes("error")`
- **Tips**: Always use quotes for string values

### Number Fields
- **Operators**: `>`, `>=`, `<`, `<=`, `==`, `!=`
- **Examples**: `confidence > 0.8`, `score >= 75`
- **Tips**: No quotes needed for numbers

### Array Fields
- **Operators**: `.length`, `.includes()`, `== []`, `!= []`
- **Examples**: `tags.length > 0`, `errors.includes("timeout")`
- **Tips**: Use `.length` to check array size

### Boolean Fields
- **Operators**: `==`, `!=`, `!`
- **Examples**: `verified == true`, `!is_spam`
- **Tips**: Can use direct boolean or comparison

## 💡 Best Practices

### 1. Start Simple
```javascript
// Good: Simple, clear condition
confidence > 0.8

// Avoid: Overly complex on first try
(confidence > 0.8 && risk_score < 0.3) || (confidence > 0.9 && risk_score < 0.5) || emergency_override == true
```

### 2. Use Meaningful Field Names
```javascript
// Good: Clear field names
user_verified == true && account_balance > 1000

// Avoid: Unclear abbreviations
uv == true && ab > 1000
```

### 3. Handle Edge Cases
```javascript
// Good: Handles missing data
status == "completed" && response != "" && response != null

// Risky: Assumes data exists
status == "completed" && response.length > 0
```

### 4. Test Thoroughly
- Test with realistic data
- Try both TRUE and FALSE scenarios
- Consider edge cases (empty arrays, null values)
- Save test inputs for reuse

### 5. Document Complex Logic
```javascript
// Good: Self-documenting
high_confidence_buy = confidence > 0.8 && decision == "BUY"
low_risk = risk_score < 0.3 && red_flags.length == 0
high_confidence_buy && low_risk

// Better: Use comments in description
// "Execute trade only when AI is highly confident AND risk is low"
confidence > 0.8 && decision == "BUY" && risk_score < 0.3 && red_flags.length == 0
```

## 🚨 Common Pitfalls

### 1. String Comparison Errors
```javascript
// Wrong: Missing quotes
decision == STRONG_BUY

// Correct: Quoted strings
decision == "STRONG_BUY"
```

### 2. Array Length Confusion
```javascript
// Wrong: Checking array directly
if (errors)  // This checks if array exists, not if it's empty

// Correct: Check array length
errors.length == 0  // Checks if array is empty
```

### 3. Operator Precedence
```javascript
// Unclear: Ambiguous precedence
confidence > 0.8 && decision == "BUY" || risk_score < 0.3

// Clear: Use parentheses
(confidence > 0.8 && decision == "BUY") || risk_score < 0.3
```

### 4. Type Mismatches
```javascript
// Wrong: Comparing different types
score > "80"  // Comparing number to string

// Correct: Consistent types
score > 80    // Both numbers
```

## 🎓 Learning Path

### Beginner
1. Start with simple string comparisons
2. Use the Visual Builder
3. Test with basic data
4. Learn AND/OR logic

### Intermediate
1. Combine multiple conditions
2. Work with arrays and numbers
3. Use the Code Editor
4. Handle edge cases

### Advanced
1. Build complex nested logic
2. Create reusable condition patterns
3. Optimize for performance
4. Design robust error handling

## 🔗 Integration Examples

### With Crypto Trading
```javascript
// Entry condition
decision == "STRONG_BUY" && confidence > 0.8 && liquidity > 100000

// Exit condition
profit_percentage > 20 || loss_percentage > 5 || market_trend == "bearish"
```

### With CRM Systems
```javascript
// Lead scoring
score > 80 && company_size > 50 && budget > 10000 && timeline == "immediate"

// Follow-up routing
last_contact_days > 7 && engagement_score > 5 && status == "warm"
```

### With Content Workflows
```javascript
// Auto-publish
quality_score > 8 && plagiarism_check == false && word_count > 500

// Editorial review
quality_score < 7 || contains_sensitive_topics == true || author_new == true
```

This guide provides a comprehensive foundation for using Logic Nodes effectively across any use case. The key is to start simple, test thoroughly, and gradually build more complex conditions as you become comfortable with the syntax and patterns. 