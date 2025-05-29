import React, { useState } from 'react';

const LogicNodeHelp = ({ onInsertExample }) => {
  const [activeTab, setActiveTab] = useState('examples');

  const quickExamples = {
    crypto: [
      {
        title: '🚀 Strong Buy Signal',
        code: 'decision == "STRONG_BUY" && confidence > 0.8',
        description: 'Execute when AI is very confident about buying'
      },
      {
        title: '⚠️ Risk Check',
        code: 'risk_score < 0.3 && red_flags.length == 0',
        description: 'Only proceed if risk is low and no warnings'
      },
      {
        title: '📊 High Confidence',
        code: 'confidence > 0.75 && (decision == "BUY" || decision == "STRONG_BUY")',
        description: 'Filter for high-confidence buy decisions'
      }
    ],
    business: [
      {
        title: '⭐ Quality Lead',
        code: 'score > 80 && sentiment == "positive"',
        description: 'Route high-scoring positive leads to sales'
      },
      {
        title: '🔥 Urgent Item',
        code: 'priority == "high" && response_time < 24',
        description: 'Flag items needing immediate attention'
      },
      {
        title: '✅ Auto-Approve',
        code: 'tone == "professional" && word_count > 100',
        description: 'Approve content meeting quality standards'
      }
    ],
    general: [
      {
        title: '📈 Success Check',
        code: 'status == "completed" && response != ""',
        description: 'Verify successful execution with valid output'
      },
      {
        title: '🎯 Performance',
        code: 'execution_time < 10 && token_usage < 2000',
        description: 'Ensure good performance within limits'
      },
      {
        title: '🔍 Error Handling',
        code: 'error_count == 0 && warnings.length < 3',
        description: 'Check for minimal errors and warnings'
      }
    ]
  };

  const syntaxGuide = [
    {
      category: 'String Operations',
      examples: [
        { code: 'status == "completed"', desc: 'Exact match' },
        { code: 'message.includes("error")', desc: 'Contains text' },
        { code: 'response.startswith("Success")', desc: 'Starts with' }
      ]
    },
    {
      category: 'Number Operations',
      examples: [
        { code: 'confidence > 0.8', desc: 'Greater than' },
        { code: 'score >= 75', desc: 'Greater or equal' },
        { code: 'price < 100', desc: 'Less than' }
      ]
    },
    {
      category: 'Array Operations',
      examples: [
        { code: 'errors.length == 0', desc: 'Empty array' },
        { code: 'tags.includes("verified")', desc: 'Contains item' },
        { code: 'results.length > 5', desc: 'Array size check' }
      ]
    },
    {
      category: 'Logic Operators',
      examples: [
        { code: 'condition1 && condition2', desc: 'AND (both true)' },
        { code: 'condition1 || condition2', desc: 'OR (either true)' },
        { code: '!(condition)', desc: 'NOT (opposite)' }
      ]
    }
  ];

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🧠 Logic Node Quick Help</h3>
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('examples')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'examples' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Examples
          </button>
          <button
            onClick={() => setActiveTab('syntax')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'syntax' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Syntax
          </button>
        </div>
      </div>

      {activeTab === 'examples' && (
        <div className="space-y-4">
          {Object.entries(quickExamples).map(([category, examples]) => (
            <div key={category} className="border rounded-lg p-3">
              <h4 className="font-medium mb-2 capitalize text-gray-800">{category} Use Cases</h4>
              <div className="space-y-2">
                {examples.map((example, idx) => (
                  <div key={idx} className="flex items-start justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{example.title}</div>
                      <code className="text-xs bg-white px-2 py-1 rounded block my-1 text-blue-600">
                        {example.code}
                      </code>
                      <div className="text-xs text-gray-600">{example.description}</div>
                    </div>
                    <button
                      onClick={() => onInsertExample && onInsertExample(example.code)}
                      className="ml-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'syntax' && (
        <div className="space-y-4">
          {syntaxGuide.map((section, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <h4 className="font-medium mb-2 text-gray-800">{section.category}</h4>
              <div className="space-y-2">
                {section.examples.map((example, exIdx) => (
                  <div key={exIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <code className="text-sm text-blue-600 font-mono">{example.code}</code>
                      <div className="text-xs text-gray-600 mt-1">{example.desc}</div>
                    </div>
                    <button
                      onClick={() => onInsertExample && onInsertExample(example.code)}
                      className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                    >
                      Insert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h5 className="font-medium text-yellow-800 mb-1">💡 Quick Tips</h5>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• String values need quotes: <code>"STRONG_BUY"</code></li>
          <li>• Numbers don't need quotes: <code>0.8</code></li>
          <li>• Use <code>&&</code> for AND, <code>||</code> for OR</li>
          <li>• Check arrays with <code>.length</code> or <code>.includes()</code></li>
        </ul>
      </div>
    </div>
  );
};

export default LogicNodeHelp; 