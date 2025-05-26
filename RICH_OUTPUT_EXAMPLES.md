# 🎨 Rich Output System Examples

## 📝 Text Output Example

### Simple Text
```python
from backend.schemas.output_schema import RichOutput

# Create simple text output
text_output = RichOutput.create_text(
    "Hello! This is a simple text output from your workflow.",
    title="Welcome Message"
)
```

**Result**: Clean, formatted text display

---

## 📋 Markdown Output Example

### Rich Markdown Content
```python
markdown_content = """
# 📊 Analysis Results

## Key Findings

**Important discoveries:**
- Data processing completed successfully
- Found **3 critical insights**
- Performance improved by *25%*

### Recommendations

1. **Optimize database queries**
   - Use indexing for faster lookups
   - Implement caching layer

2. **Enhance user experience**
   - Reduce page load times
   - Improve mobile responsiveness

### Code Example
```python
def optimize_query(sql):
    return sql + " USE INDEX (idx_performance)"
```

> **Note**: These recommendations should be implemented in the next sprint.
"""

markdown_output = RichOutput.create_markdown(markdown_content, "Analysis Report")
```

**Result**: Fully formatted markdown with headers, lists, code blocks, and styling

---

## 🗂️ JSON Data Example

### Structured Data Display
```python
data = {
    "user": {
        "id": 12345,
        "name": "John Doe",
        "email": "john@example.com",
        "preferences": {
            "theme": "dark",
            "notifications": True,
            "language": "en"
        }
    },
    "stats": {
        "login_count": 42,
        "last_login": "2024-01-15T10:30:00Z",
        "active_sessions": 2
    },
    "permissions": ["read", "write", "admin"]
}

json_output = RichOutput.create_json(data, "User Profile Data")
```

**Result**: Interactive JSON viewer with collapsible sections and syntax highlighting

---

## 📊 Chart Output Example

### Bar Chart
```python
chart_data = {
    "labels": ["January", "February", "March", "April", "May"],
    "datasets": [{
        "label": "Sales Revenue",
        "data": [12000, 19000, 15000, 25000, 22000],
        "backgroundColor": [
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 99, 132, 0.8)",
            "rgba(255, 205, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
            "rgba(153, 102, 255, 0.8)"
        ]
    }]
}

chart_output = RichOutput.create_chart(
    chart_data, 
    ChartType.BAR, 
    "Monthly Sales Performance"
)
```

**Result**: Interactive bar chart with hover effects and legend

---

## 📋 Table Output Example

### Data Table
```python
table_data = [
    {"name": "Alice Johnson", "department": "Engineering", "salary": 95000, "performance": "Excellent"},
    {"name": "Bob Smith", "department": "Marketing", "salary": 72000, "performance": "Good"},
    {"name": "Carol Davis", "department": "Sales", "salary": 68000, "performance": "Excellent"},
    {"name": "David Wilson", "department": "Engineering", "salary": 88000, "performance": "Good"},
    {"name": "Eva Brown", "department": "HR", "salary": 65000, "performance": "Satisfactory"}
]

table_output = RichOutput.create_table(
    table_data,
    columns=["name", "department", "salary", "performance"],
    title="Employee Performance Report"
)
```

**Result**: Sortable table with pagination and search functionality

---

## 🖼️ Image Output Example

### Base64 Image Display
```python
# Example with a small base64 image (placeholder)
image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

image_output = RichOutput.create_image(
    image_data,
    image_format="png",
    title="Generated Chart",
    encoding="base64"
)
```

**Result**: Image display with loading states and error handling

---

## 💻 Code Output Example

### Syntax Highlighted Code
```python
code_content = '''
def analyze_data(dataset):
    """
    Analyze the provided dataset and return insights.
    
    Args:
        dataset (pd.DataFrame): The data to analyze
        
    Returns:
        dict: Analysis results
    """
    results = {
        'total_rows': len(dataset),
        'columns': list(dataset.columns),
        'missing_values': dataset.isnull().sum().to_dict(),
        'summary_stats': dataset.describe().to_dict()
    }
    
    # Calculate correlation matrix
    if len(dataset.select_dtypes(include=[np.number]).columns) > 1:
        results['correlations'] = dataset.corr().to_dict()
    
    return results
'''

code_output = RichOutput.create_code(code_content, "python", "Data Analysis Function")
```

**Result**: Syntax-highlighted Python code with copy functionality

---

## ❌ Error Output Example

### Error Display
```python
error_output = RichOutput.create_error(
    "Failed to connect to database: Connection timeout after 30 seconds. Please check your network connection and database server status.",
    title="Database Connection Error"
)
```

**Result**: Formatted error message with clear styling and helpful information

---

## 🔄 Auto-Detection Example

### Smart Content Detection
```python
# The system automatically detects content type
mixed_content = {
    "message": "Processing completed successfully!",
    "data": [1, 2, 3, 4, 5],
    "timestamp": "2024-01-15T10:30:00Z"
}

# This will auto-detect as JSON and render accordingly
auto_output = smart_format_output(mixed_content, "Auto-detected Content")
```

**Result**: Automatically formatted based on content type detection

---

## 🎯 Real-World Workflow Example

### Complete Agent Output
```python
# Example of what an agent might return
agent_result = {
    "summary": "# Market Analysis Complete\n\n**Key Insights:**\n- Market growth: 15%\n- Top competitor: CompanyX",
    "data": [
        {"company": "CompanyA", "market_share": 25, "growth": 12},
        {"company": "CompanyB", "market_share": 20, "growth": 8},
        {"company": "CompanyX", "market_share": 30, "growth": 15}
    ],
    "chart": {
        "labels": ["CompanyA", "CompanyB", "CompanyX"],
        "datasets": [{
            "label": "Market Share %",
            "data": [25, 20, 30]
        }]
    },
    "recommendations": """
    ## Recommendations
    
    1. **Focus on growth strategies**
    2. **Monitor CompanyX closely**
    3. **Invest in R&D**
    """
}

# Each part gets rendered appropriately
summary_output = RichOutput.create_markdown(agent_result["summary"])
table_output = RichOutput.create_table(agent_result["data"])
chart_output = RichOutput.create_chart(agent_result["chart"], ChartType.PIE)
recommendations_output = RichOutput.create_markdown(agent_result["recommendations"])
```

**Result**: Multi-format output with markdown, tables, and charts all rendered beautifully

---

## 🚀 Usage in Your Workflows

### In Agent Nodes
```python
# In your agent processing
def process_agent_result(result):
    if isinstance(result, str) and result.startswith('#'):
        return RichOutput.create_markdown(result)
    elif isinstance(result, list) and all(isinstance(item, dict) for item in result):
        return RichOutput.create_table(result)
    elif isinstance(result, dict) and 'labels' in result and 'datasets' in result:
        return RichOutput.create_chart(result, ChartType.BAR)
    else:
        return smart_format_output(result)
```

### In Output Nodes
```python
# Output nodes automatically handle rich content
def format_output(data):
    return {
        "result": data,
        "rich_output": smart_format_output(data).to_dict()
    }
```

---

## 💡 Tips for Best Results

### 1. Structure Your Data
```python
# Good: Well-structured data
good_data = {
    "title": "Analysis Results",
    "metrics": {"accuracy": 0.95, "precision": 0.92},
    "details": "Model performed well on test data"
}

# Better: Use rich output types
better_output = RichOutput.create_json(good_data, "Model Performance")
```

### 2. Use Appropriate Types
```python
# For reports: Use markdown
report = RichOutput.create_markdown("# Report\n\nKey findings...")

# For data: Use tables
data = RichOutput.create_table(rows, title="Results")

# For visualizations: Use charts
chart = RichOutput.create_chart(chart_data, ChartType.LINE)
```

### 3. Add Meaningful Titles
```python
# Good titles help users understand content
RichOutput.create_text("Processing complete", title="Status Update")
RichOutput.create_table(results, title="Customer Analysis Results")
RichOutput.create_chart(data, ChartType.BAR, title="Monthly Revenue Trends")
```

---

## 🎨 Styling and Customization

The rich output system automatically applies appropriate styling:

- **Text**: Clean typography with proper spacing
- **Markdown**: GitHub-style formatting with syntax highlighting
- **JSON**: Collapsible tree view with syntax colors
- **Tables**: Sortable columns with hover effects
- **Charts**: Interactive Chart.js components
- **Code**: Syntax highlighting for 100+ languages
- **Images**: Responsive display with loading states
- **Errors**: Clear, actionable error messages

All components are responsive and work seamlessly in the execution panel! 