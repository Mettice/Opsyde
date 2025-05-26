# 🎨 Rich Output System Setup Guide

## 📦 Required Dependencies

To enable the full rich output system, you need to install the following packages:

### Frontend Dependencies

```bash
# Core dependencies for rich content rendering
npm install react-markdown remark-gfm
npm install react-syntax-highlighter
npm install chart.js react-chartjs-2
npm install @tailwindcss/typography

# Optional: For enhanced markdown support
npm install remark-math rehype-katex
```

### Backend Dependencies

```bash
# Python dependencies for rich output processing
pip install pydantic
pip install markdown2
pip install jinja2
pip install pillow  # For image processing
pip install pandas  # For table data processing
pip install matplotlib seaborn  # For chart generation
```

## 🚀 Quick Setup

### 1. Install Frontend Dependencies

```bash
cd /path/to/your/frontend
npm install react-markdown remark-gfm react-syntax-highlighter chart.js react-chartjs-2 @tailwindcss/typography
```

### 2. Install Backend Dependencies

```bash
cd /path/to/your/backend
pip install pydantic markdown2 jinja2 pillow pandas matplotlib seaborn
```

### 3. Update Tailwind Config (if using Tailwind CSS)

Add the typography plugin to your `tailwind.config.js`:

```javascript
module.exports = {
  // ... existing config
  plugins: [
    require('@tailwindcss/typography'),
    // ... other plugins
  ],
}
```

## 🎯 Supported Output Types

### ✅ Currently Implemented

- **Text**: Plain text with proper formatting
- **Markdown**: Full markdown support with syntax highlighting
- **HTML**: Safe HTML rendering with sanitization
- **JSON**: Interactive JSON viewer with collapsible sections
- **Tables**: Sortable, paginated data tables
- **Images**: Base64 and URL image display with loading states
- **Charts**: Bar, line, pie charts using Chart.js
- **Files**: Downloadable file attachments
- **Code**: Syntax-highlighted code blocks
- **Errors**: Formatted error displays

### 🔄 Auto-Detection Features

The system automatically detects content types:

- HTML content (starts with `<` tags)
- Markdown content (contains `#`, `**`, ``` markers)
- JSON/Object data
- Table data (arrays of objects)
- Code patterns (function definitions, imports)
- Base64 images

## 🛠️ Usage Examples

### Backend: Creating Rich Outputs

```python
from backend.schemas.output_schema import RichOutput, OutputType, ChartType

# Create a markdown output
markdown_output = RichOutput.create_markdown(
    "# Analysis Results\n\n**Key findings:**\n- Point 1\n- Point 2",
    title="Analysis Report"
)

# Create a chart output
chart_data = {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
        "label": "Sales",
        "data": [100, 150, 200]
    }]
}
chart_output = RichOutput.create_chart(chart_data, ChartType.BAR, "Monthly Sales")

# Create a table output
table_data = [
    {"name": "John", "age": 30, "city": "NYC"},
    {"name": "Jane", "age": 25, "city": "LA"}
]
table_output = RichOutput.create_table(table_data, title="User Data")

# Auto-format any content
auto_output = smart_format_output(some_content, title="Auto-detected Content")
```

### Frontend: Rendering Rich Content

```jsx
import RichContentRenderer from './components/RichContentRenderer';

// Simple usage
<RichContentRenderer content={outputData} />

// With custom height and styling
<RichContentRenderer 
  content={outputData} 
  maxHeight="500px" 
  className="custom-styling" 
/>
```

## 🔧 Configuration Options

### Chart Configuration

Charts support multiple types and can be customized:

```javascript
// Chart types: 'bar', 'line', 'pie', 'scatter', 'area', 'donut'
const chartConfig = {
  output_type: 'chart',
  payload: chartData,
  metadata: {
    chart_type: 'bar',
    title: 'My Chart'
  }
};
```

### Table Configuration

Tables support sorting, pagination, and custom columns:

```javascript
const tableConfig = {
  output_type: 'table',
  payload: tableData,
  metadata: {
    title: 'Data Table',
    columns: ['name', 'value', 'status']  // Optional: specify column order
  }
};
```

## 🎨 Styling Customization

### CSS Classes Available

The rich content renderer uses these CSS classes that you can customize:

```css
/* Main container */
.rich-content-renderer { }

/* Content type specific */
.rich-html-content { }
.chart-container { }
.table-container { }
.image-container { }
.code-container { }
.file-container { }
.error-container { }

/* Interactive elements */
.json-collapsible { }
.table-sortable { }
.code-copy-button { }
```

## 🚨 Troubleshooting

### Common Issues

1. **Charts not rendering**: Make sure Chart.js is installed and registered
2. **Markdown not styled**: Install and configure @tailwindcss/typography
3. **Images not loading**: Check base64 encoding and CORS settings
4. **Large JSON performance**: Use the collapsible JSON viewer for large datasets

### Performance Tips

- Use lazy loading for charts with `React.lazy()`
- Implement pagination for large tables
- Compress images before base64 encoding
- Use the `maxHeight` prop to limit content size

## 🔄 Migration from Old System

If you're upgrading from the old `SafeRichContentRenderer`:

1. Replace imports:
   ```jsx
   // Old
   import SafeRichContentRenderer from './SafeRichContentRenderer';
   
   // New
   import RichContentRenderer from './RichContentRenderer';
   ```

2. Update usage:
   ```jsx
   // Old
   <SafeRichContentRenderer content={data} />
   
   // New
   <RichContentRenderer content={data} maxHeight="400px" />
   ```

3. Backend outputs now support structured format:
   ```python
   # Old: Return raw data
   return {"result": "some text"}
   
   # New: Return rich output
   return {
       "result": "some text",
       "rich_output": RichOutput.create_text("some text").to_dict()
   }
   ```

## 📈 Future Enhancements

Planned features:
- Video/audio content support
- Interactive widgets
- Real-time data streaming
- Export to PDF/Excel
- Collaborative annotations
- Custom renderer plugins

## 🤝 Contributing

To add new output types:

1. Add the type to `OutputType` enum in `backend/schemas/output_schema.py`
2. Create a renderer component in `src/components/RichContentRenderer.jsx`
3. Add detection logic in `detect_output_type()` function
4. Update this documentation

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all dependencies are installed
3. Test with simple content first
4. Check the debug mode in UnifiedExecutionPanel 