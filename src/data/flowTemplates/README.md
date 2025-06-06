# Flow Templates Organization

## Overview
This directory contains modularized flow templates to keep the main `flowTemplates.js` file manageable. Each category of templates should be in its own file.

## Directory Structure
```
src/data/flowTemplates/
├── README.md                     # This file
├── autoEmailReplyTemplate.js     # Email automation templates
├── crm_qualifier_bot.js          # CRM and lead qualification templates  
├── cvTemplates.js                # CV/Resume analysis templates
├── legalAiAssistant.js           # Legal AI and compliance templates
├── cryptoTradingTemplates.js     # Cryptocurrency trading templates
├── marketingTemplates.js         # Marketing automation templates (example)
├── businessIntelligenceTemplates.js # BI and analytics templates (example)
└── ... (future categories)
```

## Adding New Templates

### 1. Create a new category file (recommended for 3+ templates)
```javascript
// src/data/flowTemplates/yourCategoryTemplates.js

export const yourCategoryTemplates = [
  {
    id: "unique-template-id",
    name: "🎯 Your Template Name",
    description: "Brief description of what this template does",
    category: "Your Category",
    thumbnail: "/img/your-template-flow.png",
    
    // Template metadata
    metadata: {
      version: "1.0",
      created: "2024-12-19", 
      author: "Your Name",
      complexity: "Simple|Medium|Advanced|Expert",
      estimatedTime: "30 seconds - 5 minutes",
      useCase: "Specific use case description",
      industry: ["Industry1", "Industry2"],
      frameworks: ["crewai", "framework2"],
      businessValue: "High|Medium|Low - Brief value description"
    },

    // Visual flow nodes
    nodes: [
      // Your node definitions here
    ],

    // Connection flow  
    edges: [
      // Your edge definitions here
    ],

    // Template classification
    tags: ["tag1", "tag2", "tag3"],
    frameworksUsed: ["framework1", "framework2"]
  }
  // ... more templates
];

export default yourCategoryTemplates;
```

### 2. Add single template to existing category
Add your template object to the appropriate existing array in the category file.

### 3. Update main templates file
```javascript
// src/data/flowTemplates.js

// Add import
import yourCategoryTemplates from './flowTemplates/yourCategoryTemplates';

// Add to combined array
export const flowTemplates = [
  ...baseTemplates,
  autoEmailReplyTemplate,
  ...crmQualifierTemplates,
  ...cvTemplates,
  legalAiAssistantTemplate,
  ...cryptoTradingTemplates,
  ...yourCategoryTemplates,  // Add here
  // ... existing templates
];
```

## Template Categories

### Current Categories
- **Base Templates**: Core examples and test templates
- **Email Automation**: Email marketing and auto-reply workflows
- **CRM & Lead Qualification**: Sales and customer management
- **CV/Resume Analysis**: HR and recruitment workflows  
- **Legal AI**: Legal document analysis and compliance
- **Crypto Trading**: Cryptocurrency monitoring and trading

### Suggested Future Categories
- **Marketing Automation**: Social media, content generation, campaigns
- **Business Intelligence**: Analytics, reporting, data processing
- **E-commerce**: Order processing, inventory, customer service
- **Content Creation**: Writing, design, multimedia workflows
- **DevOps**: CI/CD, monitoring, deployment automation
- **Financial Analysis**: Accounting, budgeting, financial modeling
- **Healthcare**: Patient management, medical analysis (compliance aware)
- **Real Estate**: Property analysis, lead qualification, market research

## Best Practices

### Template Structure
1. **Unique IDs**: Ensure all node and edge IDs are unique across templates
2. **Clear Names**: Use descriptive names with relevant emojis  
3. **Proper Metadata**: Include all required metadata fields
4. **Real Examples**: Use working API endpoints and realistic data
5. **Error Handling**: Include proper error handling in complex flows

### Node Configuration
- **Triggers**: Use real, working API endpoints when possible
- **Agents**: Provide detailed, specific prompts and backstories
- **Tasks**: Clear descriptions and expected outputs
- **Logic**: Simple, testable conditions
- **Outputs**: Working webhook URLs or placeholder patterns

### Documentation
- **Use Case**: Clear explanation of business value
- **Setup Instructions**: Step-by-step implementation guide
- **Business Value**: Quantified benefits when possible
- **Complexity**: Realistic time and skill estimates

### File Organization
- **Under 500 lines**: Keep individual template files manageable
- **Logical Grouping**: Group related templates together
- **Consistent Naming**: Use clear, descriptive file names
- **Export Patterns**: Use consistent export/import patterns

## Template Metadata Schema

```javascript
metadata: {
  // Required fields
  version: "1.0",
  created: "YYYY-MM-DD",
  author: "Author Name", 
  complexity: "Simple|Medium|Advanced|Expert",
  useCase: "Detailed use case description",

  // Recommended fields  
  estimatedTime: "Human readable time estimate",
  industry: ["Array", "Of", "Industries"],
  frameworks: ["Array", "Of", "Frameworks"],
  businessValue: "Value tier and brief description",
  
  // Optional fields
  estimatedCost: "$X-Y per execution",
  aiCapabilities: ["Array", "Of", "AI", "Features"],
  outputFormat: "Description of output",
  complianceFeatures: ["Array", "Of", "Compliance", "Features"],
  deploymentRequirements: {
    hardware: "Hardware requirements",
    software: "Software requirements"
  },
  professionalServices: {
    implementation: "Implementation details",
    support: "Support options"
  }
}
```

## Examples

### Simple Template (1-3 nodes)
```javascript
{
  name: "🔑 API Key Test",
  complexity: "Simple", 
  estimatedTime: "30 seconds",
  nodes: [/* 1-3 nodes */]
}
```

### Medium Template (4-8 nodes)  
```javascript
{
  name: "📊 Market Analysis", 
  complexity: "Medium",
  estimatedTime: "2-3 minutes", 
  nodes: [/* 4-8 nodes */]
}
```

### Advanced Template (9-15 nodes)
```javascript
{
  name: "🏛️ Legal AI Assistant",
  complexity: "Advanced", 
  estimatedTime: "15-30 minutes",
  nodes: [/* 9-15 nodes */]
}
```

### Expert Template (16+ nodes)
```javascript
{
  name: "🏢 Enterprise Multi-Agent Platform",
  complexity: "Expert",
  estimatedTime: "30+ minutes", 
  nodes: [/* 16+ nodes */]
}
```

## Contributing

1. **Follow the structure**: Use the established patterns and naming conventions
2. **Test thoroughly**: Ensure templates work end-to-end before submitting
3. **Document completely**: Include all metadata and clear descriptions  
4. **Real-world focus**: Create templates that solve actual business problems
5. **Keep it modular**: Break large template sets into logical categories

## Questions?

If you have questions about template organization or need help creating new categories, refer to existing templates as examples or consult the main development team. 