import React from 'react';
import ResultDisplayCard from './ResultDisplayCard';

const ResultDisplayDemo = () => {
  // Sample content for demonstration
  const sampleResults = [
    {
      title: "AI Analysis Result",
      content: `# AI Automation Benefits Analysis

AI automation offers several compelling benefits that can significantly transform business operations:

## 🚀 **Cost Efficiency**
AI can significantly reduce labor costs by automating routine tasks like data entry, customer service inquiries, and basic analysis. Studies show companies can save 20-30% on operational costs.

## ⚡ **Speed & Accuracy** 
Automated systems process information 24/7 without fatigue, reducing human error rates from ~3-5% to less than 0.1% in many cases.

## 📊 **Data-Driven Insights**
AI can analyze vast datasets to identify patterns humans might miss, enabling better strategic decisions and predictive analytics.

## 🔄 **Scalability**
Unlike human resources, AI systems can scale instantly to handle increased workloads without proportional cost increases.

## 💡 **Innovation Enablement**
By handling routine tasks, AI frees up human workers to focus on creative, strategic, and relationship-building activities.

**Recommendation:** Start with pilot programs in data-heavy, repetitive processes to demonstrate ROI before broader implementation.`,
      colorScheme: "blue",
      defaultExpanded: false
    },
    {
      title: "API Response Data",
      content: {
        status: "success",
        data: {
          users: [
            { id: 1, name: "John Doe", email: "john@example.com", role: "admin" },
            { id: 2, name: "Jane Smith", email: "jane@example.com", role: "user" },
            { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "moderator" }
          ],
          pagination: {
            total: 150,
            page: 1,
            limit: 3,
            hasNext: true
          },
          metadata: {
            requestId: "req_123456789",
            timestamp: "2024-01-15T10:30:00Z",
            version: "v2.1"
          }
        }
      },
      colorScheme: "green",
      defaultExpanded: false
    },
    {
      title: "Code Generation Result",
      content: `\`\`\`python
def analyze_sentiment(text):
    """
    Analyze the sentiment of given text using natural language processing.
    
    Args:
        text (str): The text to analyze
        
    Returns:
        dict: Sentiment analysis results with score and label
    """
    import nltk
    from textblob import TextBlob
    
    # Download required NLTK data
    nltk.download('punkt', quiet=True)
    nltk.download('vader_lexicon', quiet=True)
    
    # Create TextBlob object
    blob = TextBlob(text)
    
    # Get polarity score (-1 to 1)
    polarity = blob.sentiment.polarity
    
    # Determine sentiment label
    if polarity > 0.1:
        label = "positive"
    elif polarity < -0.1:
        label = "negative"
    else:
        label = "neutral"
    
    return {
        "text": text,
        "polarity": polarity,
        "subjectivity": blob.sentiment.subjectivity,
        "label": label,
        "confidence": abs(polarity)
    }

# Example usage
result = analyze_sentiment("I love this new AI automation system!")
print(f"Sentiment: {result['label']} (confidence: {result['confidence']:.2f})")
\`\`\``,
      colorScheme: "purple",
      defaultExpanded: false
    },
    {
      title: "Error Details",
      content: {
        error: "ValidationError",
        message: "Invalid input parameters provided",
        details: {
          field: "email",
          code: "INVALID_FORMAT",
          expected: "valid email address",
          received: "invalid-email-format",
          suggestions: [
            "Ensure email contains @ symbol",
            "Check for valid domain extension",
            "Remove any special characters"
          ]
        },
        stack: "ValidationError: Invalid input parameters\n    at validateEmail (validator.js:23)\n    at processUser (user.js:45)\n    at main (app.js:12)",
        timestamp: "2024-01-15T10:30:00Z"
      },
      colorScheme: "orange",
      defaultExpanded: true
    },
    {
      title: "Task Completion Summary",
      content: {
        taskId: "task_987654321",
        status: "completed",
        summary: "Successfully processed 1,247 customer records and generated personalized email campaigns",
        metrics: {
          recordsProcessed: 1247,
          emailsGenerated: 1247,
          successRate: "99.8%",
          executionTime: "2.3 minutes",
          costSavings: "$450 estimated"
        },
        outputs: {
          emailCampaigns: "campaigns/batch_20240115.json",
          analytics: "reports/campaign_analytics.pdf",
          logs: "logs/execution_20240115.log"
        }
      },
      colorScheme: "pink",
      defaultExpanded: false
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            🎨 Rich Content Display System
          </h1>
          <p className="text-gray-600">
            Beautiful, interactive result cards with expandable content and colorful indicators
          </p>
        </div>

        <div className="space-y-6">
          {sampleResults.map((result, index) => (
            <ResultDisplayCard
              key={index}
              content={result.content}
              title={result.title}
              colorScheme={result.colorScheme}
              defaultExpanded={result.defaultExpanded}
              showMetrics={true}
              className="rich-content-card hover-lift"
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">✨ Features Showcase</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">🎨 Visual Features</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Colorful status indicators</li>
                <li>• Smooth expand/collapse animations</li>
                <li>• Hover effects and transitions</li>
                <li>• Gradient backgrounds</li>
                <li>• Glass morphism effects</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">⚡ Interactive Features</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Expandable content sections</li>
                <li>• Fullscreen modal view</li>
                <li>• Copy to clipboard</li>
                <li>• Download content</li>
                <li>• Content metrics display</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">🔧 Technical Features</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Smart content type detection</li>
                <li>• Markdown rendering</li>
                <li>• JSON formatting</li>
                <li>• Code syntax highlighting</li>
                <li>• Error handling</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">♿ Accessibility</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Keyboard navigation</li>
                <li>• Screen reader support</li>
                <li>• Reduced motion support</li>
                <li>• High contrast mode</li>
                <li>• Focus indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplayDemo;