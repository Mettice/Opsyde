# Enhanced Rich Output Schema for Market Research and Data Visualization

def create_market_research_output(
    title: str,
    executive_summary: str,
    market_data: dict,
    competitive_analysis: list,
    charts: list = None,
    recommendations: list = None
) -> dict:
    """Create a comprehensive market research output with charts and analysis."""
    
    output = {
        "output_type": "market_research",
        "title": title,
        "timestamp": datetime.now().isoformat(),
        "payload": {
            "executive_summary": executive_summary,
            "market_data": market_data,
            "competitive_analysis": competitive_analysis,
            "recommendations": recommendations or [],
            "charts": charts or [],
            "metadata": {
                "research_type": "market_analysis",
                "data_sources": ["primary_research", "market_intelligence", "competitive_analysis"],
                "confidence_level": "high"
            }
        }
    }
    
    return output

def create_chart_output(
    chart_type: str,
    title: str,
    data: dict,
    description: str = None
) -> dict:
    """Create a chart output for data visualization."""
    
    chart_config = {
        "type": "chart",
        "chart_data": {
            "type": chart_type,
            "data": data,
            "options": {
                "responsive": True,
                "plugins": {
                    "title": {
                        "display": True,
                        "text": title
                    },
                    "legend": {
                        "display": True,
                        "position": "bottom"
                    }
                }
            }
        },
        "description": description,
        "metadata": {
            "chart_type": chart_type,
            "title": title,
            "generated_at": datetime.now().isoformat()
        }
    }
    
    return chart_config

def create_competitive_matrix_output(
    platforms: list,
    criteria: list,
    scores: dict,
    title: str = "Competitive Analysis Matrix"
) -> dict:
    """Create a competitive analysis matrix output."""
    
    # Build table headers
    headers = ["Platform"] + criteria
    
    # Build table rows
    rows = []
    for platform in platforms:
        row = [platform]
        for criterion in criteria:
            score = scores.get(platform, {}).get(criterion, "N/A")
            row.append(score)
        rows.append(row)
    
    return {
        "type": "table",
        "title": title,
        "headers": headers,
        "rows": rows,
        "metadata": {
            "table_type": "competitive_matrix",
            "platforms_count": len(platforms),
            "criteria_count": len(criteria)
        }
    }

def create_market_share_chart(market_data: dict, title: str = "Market Share Analysis") -> dict:
    """Create a market share pie chart."""
    
    labels = list(market_data.keys())
    data_values = list(market_data.values())
    
    # Generate colors for each segment
    colors = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
        "#FF9F40", "#FF6384", "#C9CBCF", "#4BC0C0", "#FF6384"
    ]
    
    chart_data = {
        "labels": labels,
        "datasets": [{
            "data": data_values,
            "backgroundColor": colors[:len(labels)],
            "borderWidth": 2,
            "borderColor": "#ffffff"
        }]
    }
    
    return create_chart_output("pie", title, chart_data, f"Market share distribution across {len(labels)} platforms")

def create_growth_trends_chart(
    platforms: list,
    years: list,
    growth_data: dict,
    title: str = "Growth Trends Analysis"
) -> dict:
    """Create a growth trends line chart."""
    
    datasets = []
    colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
    
    for i, platform in enumerate(platforms):
        dataset = {
            "label": platform,
            "data": growth_data.get(platform, []),
            "borderColor": colors[i % len(colors)],
            "backgroundColor": colors[i % len(colors)] + "20",  # Add transparency
            "tension": 0.1,
            "fill": False
        }
        datasets.append(dataset)
    
    chart_data = {
        "labels": years,
        "datasets": datasets
    }
    
    return create_chart_output("line", title, chart_data, f"Growth trends for {len(platforms)} platforms over {len(years)} years")

def create_enhanced_markdown_output(
    content: str,
    title: str = None,
    sections: list = None,
    charts: list = None,
    tables: list = None
) -> dict:
    """Create an enhanced markdown output with embedded charts and tables."""
    
    output = {
        "output_type": "enhanced_markdown",
        "title": title,
        "content": content,
        "embedded_content": {
            "charts": charts or [],
            "tables": tables or [],
            "sections": sections or []
        },
        "metadata": {
            "content_type": "markdown",
            "has_charts": bool(charts),
            "has_tables": bool(tables),
            "word_count": len(content.split()) if content else 0
        }
    }
    
    return output

# Sample data generators for testing
def generate_sample_automation_market_data():
    """Generate sample market data for automation platforms."""
    
    market_share = {
        "Zapier": 35,
        "Make.com": 20,
        "n8n": 15,
        "Microsoft Power Automate": 18,
        "Others": 12
    }
    
    growth_data = {
        "Zapier": [100, 150, 220, 310, 420, 550],
        "Make.com": [50, 80, 130, 200, 290, 400],
        "n8n": [10, 25, 60, 120, 200, 320],
        "Microsoft Power Automate": [80, 120, 180, 250, 340, 450]
    }
    
    years = ["2020", "2021", "2022", "2023", "2024", "2025"]
    
    competitive_scores = {
        "Zapier": {
            "Ease of Use": "⭐⭐⭐⭐⭐",
            "Developer Friendly": "⭐⭐⭐",
            "Enterprise Features": "⭐⭐⭐",
            "Pricing": "Premium",
            "Market Position": "Market Leader"
        },
        "Make.com": {
            "Ease of Use": "⭐⭐⭐⭐",
            "Developer Friendly": "⭐⭐⭐⭐",
            "Enterprise Features": "⭐⭐⭐⭐",
            "Pricing": "Competitive",
            "Market Position": "Strong Challenger"
        },
        "n8n": {
            "Ease of Use": "⭐⭐⭐",
            "Developer Friendly": "⭐⭐⭐⭐⭐",
            "Enterprise Features": "⭐⭐⭐⭐",
            "Pricing": "Open Source",
            "Market Position": "Developer Favorite"
        },
        "Microsoft Power Automate": {
            "Ease of Use": "⭐⭐⭐",
            "Developer Friendly": "⭐⭐",
            "Enterprise Features": "⭐⭐⭐⭐⭐",
            "Pricing": "Enterprise",
            "Market Position": "Enterprise Focus"
        }
    }
    
    return {
        "market_share": market_share,
        "growth_data": growth_data,
        "years": years,
        "competitive_scores": competitive_scores,
        "platforms": list(market_share.keys())[:-1]  # Exclude "Others"
    } 