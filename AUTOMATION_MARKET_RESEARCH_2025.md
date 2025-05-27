# 2025 Automation Platform Market Research Template

## Executive Summary
This template provides a comprehensive framework for analyzing the automation platform market in 2025, focusing on key players like n8n, Make.com, Zapier, and emerging competitors. The research includes market positioning, competitive analysis, and strategic recommendations.

## Market Research Workflow Configuration

### Input Node Configuration
```json
{
  "label": "Market Research Input",
  "value": "Analyze the 2025 automation platform market focusing on n8n, Make.com, Zapier positioning strategies, market trends, user adoption patterns, and competitive landscape for small to enterprise businesses",
  "inputType": "text",
  "variableName": "research_query",
  "isRequired": true
}
```

### Senior Market Research Analyst Agent
```json
{
  "role": "Senior Market Research Analyst",
  "goal": "Conduct comprehensive market research on automation platforms and provide strategic insights for 2025",
  "backstory": "You are a seasoned market research analyst with 15+ years of experience in SaaS, automation tools, and business process optimization. You specialize in competitive analysis, market positioning, and strategic recommendations for technology companies.",
  "framework": "crewai",
  "llmModel": "gpt-4",
  "temperature": 0.3,
  "enableMemory": true,
  "streamIntermediateSteps": true
}
```

### Market Analysis Task
```json
{
  "description": "Analyze the 2025 automation platform market with focus on n8n, Make.com, Zapier, and emerging competitors. Include market size, growth trends, user segments, pricing strategies, and competitive positioning.",
  "expectedOutput": "Comprehensive market analysis report with charts, competitive matrix, market positioning map, and strategic recommendations formatted in markdown with data visualizations",
  "priority": "high",
  "type": "research"
}
```

### Data Visualization Agent
```json
{
  "role": "Data Visualization Specialist",
  "goal": "Create compelling charts, graphs, and visual representations of market research data",
  "backstory": "You are an expert in data visualization and business intelligence with expertise in creating clear, actionable charts and graphs that tell compelling stories with data.",
  "framework": "crewai",
  "llmModel": "gpt-4",
  "temperature": 0.2,
  "enableMemory": true
}
```

### Chart Generation Task
```json
{
  "description": "Generate comprehensive charts and visualizations for the automation platform market research including market share pie charts, growth trend line graphs, competitive positioning matrices, and user segment analysis",
  "expectedOutput": "Multiple chart configurations in JSON format ready for rendering, including market share, growth trends, competitive analysis, and user demographics",
  "priority": "high",
  "type": "visualization"
}
```

## Expected Research Outputs

### 1. Market Overview Report
- Market size and growth projections for 2025
- Key market drivers and challenges
- Technology trends affecting automation platforms
- Regulatory and compliance considerations

### 2. Competitive Analysis
- Detailed profiles of n8n, Make.com, Zapier
- Emerging competitors and disruptors
- Feature comparison matrix
- Pricing strategy analysis
- Market positioning assessment

### 3. User Segment Analysis
- Small business adoption patterns
- Enterprise requirements and preferences
- Developer vs. business user needs
- Geographic market variations

### 4. Strategic Recommendations
- Market positioning strategies
- Product development priorities
- Partnership opportunities
- Go-to-market recommendations

## Sample Chart Data Structures

### Market Share Chart
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

### Growth Trends Chart
```json
{
  "type": "chart",
  "chart_data": {
    "type": "line",
    "data": {
      "labels": ["2020", "2021", "2022", "2023", "2024", "2025"],
      "datasets": [
        {
          "label": "Zapier",
          "data": [100, 150, 220, 310, 420, 550],
          "borderColor": "#FF6384",
          "tension": 0.1
        },
        {
          "label": "Make.com",
          "data": [50, 80, 130, 200, 290, 400],
          "borderColor": "#36A2EB",
          "tension": 0.1
        },
        {
          "label": "n8n",
          "data": [10, 25, 60, 120, 200, 320],
          "borderColor": "#FFCE56",
          "tension": 0.1
        }
      ]
    },
    "options": {
      "responsive": true,
      "plugins": {
        "title": {
          "display": true,
          "text": "User Growth Trends (Thousands of Users)"
        }
      }
    }
  }
}
```

### Competitive Positioning Matrix
```json
{
  "type": "table",
  "headers": ["Platform", "Ease of Use", "Developer Friendly", "Enterprise Features", "Pricing", "Market Position"],
  "rows": [
    ["Zapier", "⭐⭐⭐⭐⭐", "⭐⭐⭐", "⭐⭐⭐", "Premium", "Market Leader"],
    ["Make.com", "⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐", "Competitive", "Strong Challenger"],
    ["n8n", "⭐⭐⭐", "⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "Open Source", "Developer Favorite"],
    ["Power Automate", "⭐⭐⭐", "⭐⭐", "⭐⭐⭐⭐⭐", "Enterprise", "Enterprise Focus"]
  ]
}
```

## Implementation Instructions

1. **Set up the workflow** with the input node containing the research query
2. **Configure the Market Research Analyst** agent with the specified parameters
3. **Add the Market Analysis Task** to generate comprehensive research
4. **Include the Data Visualization Agent** for chart generation
5. **Connect to an Output Node** configured for rich content display
6. **Run the workflow** and observe the rich output rendering

## Expected Rich Output Features

- **Label/Value Display**: Clean presentation of input parameters
- **Markdown Rendering**: Formatted research reports with headers, lists, and emphasis
- **Chart Visualization**: Interactive charts showing market data
- **Table Display**: Competitive analysis matrices
- **Image Support**: Market positioning diagrams (if generated)

## Testing Scenarios

1. **Basic Research**: Run with the default input to test markdown rendering
2. **Chart Generation**: Verify that chart data is properly visualized
3. **Table Display**: Check competitive analysis matrix rendering
4. **Mixed Content**: Test combination of text, charts, and tables in single output

This template provides a comprehensive framework for testing the rich output system while generating valuable market research insights for automation platform positioning in 2025. 