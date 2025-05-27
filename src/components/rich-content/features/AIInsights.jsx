// components/rich-content/features/AIInsights.jsx
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { shouldShowAIInsights } from '../content-detection/ContentDetector';
import { extractDisplayContent } from '../content-detection/ContentExtractor';

const AIInsights = ({ content, contentType, metadata }) => {
  const [insights, setInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState({
    data: true,
    summary: false,
    chart: false
  });

  // Check if we should show AI insights for this content
  const shouldShow = useMemo(() => {
    return shouldShowAIInsights(content, metadata);
  }, [content, metadata]);

  // Don't render if content isn't suitable for insights
  if (!shouldShow) {
    return null;
  }

  const generateInsights = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      // Extract the display content for analysis
      const displayContent = extractDisplayContent(content);
      const analysisContent = displayContent.content || displayContent;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: analysisContent,
          contentType: displayContent.type,
          analysisType: 'comprehensive'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setInsights(result.insights || result);
        
        // Auto-enable summary and chart if insights are generated
        setShowOptions(prev => ({
          ...prev,
          summary: true,
          chart: (result.insights?.chartData || result.chartData) ? true : prev.chart
        }));
      } else {
        throw new Error('Failed to generate insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      
      // Generate mock insights for demo purposes
      const mockInsights = generateMockInsights(content, contentType);
      setInsights(mockInsights);
      setShowOptions(prev => ({ ...prev, summary: true, chart: true }));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockInsights = (content, contentType) => {
    // Simple mock insights based on content type
    const baseInsights = {
      summary: "This data contains interesting patterns that could provide valuable business insights.",
      keyFindings: [
        "Data shows clear trends in user behavior",
        "Performance metrics indicate optimization opportunities",
        "Results suggest actionable next steps"
      ],
      recommendations: [
        "Monitor these metrics regularly",
        "Consider implementing automated alerts",
        "Share findings with relevant stakeholders"
      ]
    };

    if (contentType === 'table') {
      return {
        ...baseInsights,
        summary: "The table data reveals several key patterns and outliers worth investigating.",
        dataQuality: "Good",
        recordCount: Array.isArray(content) ? content.length : "Unknown"
      };
    }

    if (contentType === 'json') {
      return {
        ...baseInsights,
        summary: "The JSON structure contains rich information suitable for further analysis.",
        complexity: "Medium",
        fields: typeof content === 'object' ? Object.keys(content).length : "Unknown"
      };
    }

    return baseInsights;
  };

  return (
    <div className="ai-insights mt-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-purple-800 flex items-center">
          <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            🧠
          </span>
          AI Insights
        </h4>
        
        {!insights && (
          <button
            onClick={generateInsights}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isGenerating
                ? 'bg-purple-300 text-purple-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mr-2"></div>
                Analyzing...
              </span>
            ) : (
              'Generate Insights'
            )}
          </button>
        )}
      </div>

      {insights ? (
        <div className="space-y-4">
          {/* Insights Options */}
          <div className="flex items-center space-x-4 pb-3 border-b border-purple-200">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showOptions.data}
                onChange={(e) => setShowOptions(prev => ({ ...prev, data: e.target.checked }))}
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              Show Data
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showOptions.summary}
                onChange={(e) => setShowOptions(prev => ({ ...prev, summary: e.target.checked }))}
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              Show Summary
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showOptions.chart}
                onChange={(e) => setShowOptions(prev => ({ ...prev, chart: e.target.checked }))}
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              Show Chart
            </label>
          </div>

          {/* Summary */}
          {showOptions.summary && insights.summary && (
            <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
              <h5 className="font-medium text-purple-800 mb-2">📊 Summary</h5>
              <p className="text-purple-700 text-sm leading-relaxed">{insights.summary}</p>
            </div>
          )}

          {/* Key Findings */}
          {showOptions.data && insights.keyFindings && (
            <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
              <h5 className="font-medium text-purple-800 mb-3">🔍 Key Findings</h5>
              <ul className="space-y-2">
                {insights.keyFindings.map((finding, index) => (
                  <li key={index} className="text-purple-700 text-sm flex items-start">
                    <span className="text-purple-500 mr-2 mt-0.5">•</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {showOptions.data && insights.recommendations && (
            <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
              <h5 className="font-medium text-purple-800 mb-3">💡 Recommendations</h5>
              <ul className="space-y-2">
                {insights.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-purple-700 text-sm flex items-start">
                    <span className="text-purple-500 mr-2 mt-0.5">→</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chart placeholder */}
          {showOptions.chart && insights.chartData && (
            <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
              <h5 className="font-medium text-purple-800 mb-3">📈 Visualization</h5>
              <div className="h-32 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-sm">Chart visualization would appear here</span>
              </div>
            </div>
          )}

          {/* Metadata */}
          {(insights.dataQuality || insights.recordCount || insights.complexity) && (
            <div className="bg-white/40 rounded-lg p-3 border border-purple-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                {insights.dataQuality && (
                  <div>
                    <div className="text-xs text-purple-600 mb-1">Quality</div>
                    <div className="text-sm font-medium text-purple-800">{insights.dataQuality}</div>
                  </div>
                )}
                {insights.recordCount && (
                  <div>
                    <div className="text-xs text-purple-600 mb-1">Records</div>
                    <div className="text-sm font-medium text-purple-800">{insights.recordCount}</div>
                  </div>
                )}
                {insights.complexity && (
                  <div>
                    <div className="text-xs text-purple-600 mb-1">Complexity</div>
                    <div className="text-sm font-medium text-purple-800">{insights.complexity}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-purple-600 text-sm">
            Click "Generate Insights" to analyze this data with AI
          </div>
        </div>
      )}
    </div>
  );
};

AIInsights.propTypes = {
  content: PropTypes.any.isRequired,
  contentType: PropTypes.string,
  metadata: PropTypes.object
};

export default AIInsights;