import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  BarChart3, 
  Lightbulb, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import RichContentRenderer from './RichContentRenderer';

const AutoInsightGenerator = ({ content, contentType = 'text', onInsightsGenerated }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  const generateInsights = async () => {
    if (!content || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          contentType,
          analysisType
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.insights);
        setLastAnalyzed(Date.now());
        
        // Call parent callback if provided
        if (onInsightsGenerated) {
          onInsightsGenerated(data.insights);
        }
      } else {
        throw new Error(data.message || 'Failed to generate insights');
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate insights when content changes
  useEffect(() => {
    if (content && content.length > 50) { // Only for substantial content
      generateInsights();
    }
  }, [content, contentType]);

  const TrendIndicator = ({ trend }) => {
    const isPositive = trend.direction === 'up';
    const isNegative = trend.direction === 'down';
    
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
        <div>
          <div className="text-sm font-medium text-gray-900">{trend.metric}</div>
          <div className={`text-lg font-bold ${
            isPositive ? 'text-green-600' : 
            isNegative ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {trend.change}
          </div>
        </div>
        <div className={`p-2 rounded-full ${
          isPositive ? 'bg-green-100' : 
          isNegative ? 'bg-red-100' : 
          'bg-gray-100'
        }`}>
          <TrendingUp className={`w-5 h-5 ${
            isPositive ? 'text-green-600' : 
            isNegative ? 'text-red-600 transform rotate-180' : 
            'text-gray-600'
          }`} />
        </div>
      </div>
    );
  };

  if (!content) {
    return null;
  }

  return (
    <div className="auto-insight-generator bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">AI Insights</h3>
            <p className="text-xs text-gray-500">Automatically generated analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={generateInsights}
            disabled={loading}
            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            title="Regenerate insights"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-purple-600">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="text-sm">Generating AI insights...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                Failed to generate insights: {error}
              </div>
            </div>
          )}

          {insights && !loading && (
            <div className="space-y-4">
              {/* Summary Section */}
              {insights.summary && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    <h4 className="font-medium text-gray-900">{insights.summary.title}</h4>
                  </div>
                  <ul className="space-y-2">
                    {insights.summary.points.map((point, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-purple-500 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trends Section */}
              {insights.trends && insights.trends.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-gray-900">Key Trends</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.trends.map((trend, index) => (
                      <TrendIndicator key={index} trend={trend} />
                    ))}
                  </div>
                </div>
              )}

              {/* Chart Section */}
              {insights.chartData && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Data Visualization</h4>
                  </div>
                  <RichContentRenderer 
                    content={insights.chartData} 
                    metadata={{ type: 'chart' }}
                  />
                </div>
              )}

              {/* Recommendations Section */}
              {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-orange-600" />
                    <h4 className="font-medium text-gray-900">Recommendations</h4>
                  </div>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-orange-500 mt-1">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoInsightGenerator; 