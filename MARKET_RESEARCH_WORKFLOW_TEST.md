# Market Research Workflow Test - 2025 Automation Platforms

## Test Workflow Configuration

This test demonstrates the enhanced rich output system with:
- ✅ **Label/Value Display**: Clean presentation instead of JSON
- ✅ **Chart Visualization**: Market share and growth trend charts  
- ✅ **Table Rendering**: Competitive analysis matrices
- ✅ **Markdown Formatting**: Professional research reports
- ✅ **Mixed Content**: Combined text, charts, and tables

## Workflow Setup Instructions

### 1. Input Node
```json
{
  "nodeType": "input",
  "label": "Market Research Input",
  "value": "Analyze the 2025 automation platform market focusing on n8n, Make.com, Zapier positioning strategies, market trends, user adoption patterns, and competitive landscape for small to enterprise businesses",
  "inputType": "text",
  "variableName": "research_query",
  "isRequired": true
}
```

### 2. Senior Market Research Analyst Agent
```json
{
  "nodeType": "agent",
  "label": "Senior Market Research Analyst",
  "role": "Senior Market Research Analyst specializing in SaaS and automation platforms",
  "goal": "Conduct comprehensive market research on automation platforms and provide strategic insights for 2025 with data visualizations",
  "backstory": "You are a seasoned market research analyst with 15+ years of experience in SaaS, automation tools, and business process optimization. You specialize in competitive analysis, market positioning, and strategic recommendations for technology companies. You always include data visualizations and charts in your reports.",
  "framework": "crewai",
  "llmModel": "gpt-4",
  "temperature": 0.3,
  "max_tokens": 4000,
  "enableMemory": true,
  "streamIntermediateSteps": true
}
```

### 3. Market Analysis Task
```json
{
  "nodeType": "task",
  "label": "Comprehensive Market Analysis",
  "description": "Analyze the 2025 automation platform market with focus on n8n, Make.com, Zapier, and emerging competitors. Include market size, growth trends, user segments, pricing strategies, competitive positioning, and generate sample chart data for visualization.",
  "expectedOutput": "Comprehensive market analysis report in markdown format including: 1) Executive summary, 2) Market overview with sample chart data in JSON format, 3) Competitive analysis matrix, 4) Strategic recommendations. Include sample chart configurations for market share pie chart and growth trends line chart.",
  "priority": "high",
  "type": "research"
}
```

### 4. Output Node
```json
{
  "nodeType": "output",
  "label": "Rich Market Research Output",
  "outputType": "smart_api",
  "ai_description": "Format and display comprehensive market research with charts and visualizations",
  "service_type": "data_visualization"
}
```

## Expected Test Results

### 1. Input Display Enhancement
**Before**: Raw JSON showing `{"label": "Market Research Input", "value": "Analyze the current trends..."}`

**After**: Clean formatted display:
```
┌─ INPUT ─────────────────────────────────┐
│ Market Research Input                   │
└─────────────────────────────────────────┘
┌─ VALUE ─────────────────────────────────┐
│ Analyze the 2025 automation platform   │
│ market focusing on n8n, Make.com...    │
└─────────────────────────────────────────┘
```

### 2. Chart Visualization Test
The agent should generate output containing chart data like:

```json
{
  "type": "chart",
  "chart_data": {
    "type": "pie",
    "data": {
      "labels": ["Zapier", "Make.com", "n8n", "Microsoft Power Automate", "Others"],
      "datasets": [{
        "data": [35, 20, 15, 18, 12],
        "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
      }]
    },
    "options": {
      "responsive": true,
      "plugins": {
        "title": {
          "display": true,
          "text": "Automation Platform Market Share 2025"
        }
      }
    }
  }
}
```

### 3. Table Rendering Test
Competitive analysis should render as a proper table:

| Platform | Ease of Use | Developer Friendly | Enterprise Features | Pricing | Market Position |
|----------|-------------|-------------------|-------------------|---------|----------------|
| Zapier | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Premium | Market Leader |
| Make.com | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Competitive | Strong Challenger |
| n8n | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Open Source | Developer Favorite |

### 4. Markdown Formatting Test
Research report should display with proper formatting:

# 2025 Automation Platform Market Analysis

## Executive Summary
The automation platform market continues to experience **rapid growth** in 2025...

## Key Findings
- Market size: $X billion
- Growth rate: X% YoY
- Leading platforms: Zapier, Make.com, n8n

## Recommendations
1. **Focus on developer experience**
2. **Expand enterprise features**
3. **Competitive pricing strategies**

## Testing Checklist

### Visual Verification
- [ ] Input shows as clean label/value pair (not JSON)
- [ ] Charts render as interactive visualizations
- [ ] Tables display with proper formatting
- [ ] Markdown shows headers, bold text, lists
- [ ] No horizontal scrolling issues
- [ ] Content fits within container boundaries

### Functional Testing
- [ ] Debug mode shows proper content detection
- [ ] Console logs show correct content types
- [ ] Scroll behavior works smoothly
- [ ] Content is responsive to window resizing

### Content Quality
- [ ] Market research is comprehensive and relevant
- [ ] Chart data is realistic and meaningful
- [ ] Competitive analysis includes all major platforms
- [ ] Recommendations are actionable

## Troubleshooting

### If charts don't render:
1. Check browser console for Chart.js errors
2. Verify chart data structure in debug mode
3. Ensure Chart.js dependencies are loaded

### If tables show as JSON:
1. Check content type detection in console
2. Verify table data has headers and rows
3. Check TableRenderer component

### If markdown shows as plain text:
1. Verify ReactMarkdown is working
2. Check content type detection
3. Look for markdown syntax in content

## Success Metrics

✅ **Enhanced UX**: Clean, professional display of research data
✅ **Rich Visualizations**: Interactive charts and formatted tables  
✅ **Improved Readability**: Proper markdown formatting with structure
✅ **Better Performance**: Smooth scrolling and responsive design
✅ **Professional Output**: Publication-ready market research reports

This test workflow validates all the enhanced rich output features while generating valuable 2025 market research insights for automation platform positioning strategies. 