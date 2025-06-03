import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const VisualServiceExplorer = ({ formData, handleInputChange, onServiceSelected }) => {
  const [selectedService, setSelectedService] = useState(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [hoveredService, setHoveredService] = useState(null);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Compact service cards with essential info
  const serviceCategories = [
    {
      id: 'popular',
      name: 'Most Popular',
      icon: '🔥',
      services: [
        {
          id: 'dexscreener',
          name: 'DexScreener',
          icon: '🔥',
          description: 'Live crypto tracking',
          difficulty: 'Easy',
          setupTime: '30s',
          popularity: 95,
          color: 'from-orange-400 to-red-500',
          features: ['Real-time', 'No API key', 'Multi-token'],
          connectionFlow: ['Endpoint', 'Monitor', 'Alerts'],
          apiEndpoint: 'https://api.dexscreener.com/latest/dex/search?q=PEPE',
          authType: 'none'
        },
        {
          id: 'airtable',
          name: 'Airtable',
          icon: '📊',
          description: 'Database monitoring',
          difficulty: 'Easy',
          setupTime: '2min',
          popularity: 88,
          color: 'from-blue-400 to-cyan-500',
          features: ['Real-time sync', 'Rich data', 'Webhooks'],
          connectionFlow: ['API Key', 'Base ID', 'Monitor'],
          apiEndpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
          authType: 'api_key'
        },
        {
          id: 'google-sheets',
          name: 'Google Sheets',
          icon: '📈',
          description: 'Spreadsheet updates',
          difficulty: 'Easy',
          setupTime: '1min',
          popularity: 92,
          color: 'from-green-400 to-emerald-500',
          features: ['No API needed', 'CSV export', 'Real-time'],
          connectionFlow: ['Share link', 'CSV format', 'Monitor'],
          apiEndpoint: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv',
          authType: 'none'
        },
        {
          id: 'slack',
          name: 'Slack',
          icon: '💬',
          description: 'Team messaging',
          difficulty: 'Medium',
          setupTime: '3min',
          popularity: 85,
          color: 'from-purple-400 to-pink-500',
          features: ['Channel monitoring', 'Bot tokens', 'Rich data'],
          connectionFlow: ['Bot token', 'Channel ID', 'Monitor'],
          apiEndpoint: 'https://slack.com/api/conversations.history',
          authType: 'bearer_token'
        }
      ]
    },
    {
      id: 'data',
      name: 'Data & Productivity',
      icon: '📊',
      services: [
        {
          id: 'notion',
          name: 'Notion',
          icon: '📝',
          description: 'Knowledge base',
          difficulty: 'Medium',
          setupTime: '4min',
          popularity: 78,
          color: 'from-gray-400 to-slate-500',
          features: ['Rich content', 'Databases', 'API v1'],
          connectionFlow: ['Integration', 'Database ID', 'Monitor'],
          apiEndpoint: 'https://api.notion.com/v1/databases/YOUR_DATABASE_ID/query',
          authType: 'bearer_token'
        },
        {
          id: 'github',
          name: 'GitHub',
          icon: '🐙',
          description: 'Code repositories',
          difficulty: 'Easy',
          setupTime: '2min',
          popularity: 82,
          color: 'from-gray-700 to-gray-900',
          features: ['Issues', 'PRs', 'Commits'],
          connectionFlow: ['Token', 'Repo', 'Monitor'],
          apiEndpoint: 'https://api.github.com/repos/OWNER/REPO/issues',
          authType: 'bearer_token'
        }
      ]
    }
  ];

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setShowSetupWizard(true);
  };

  const applyServiceConfiguration = (service) => {
    // Apply the service configuration
    handleInputChange({ target: { name: 'serviceName', value: service.name } });
    handleInputChange({ target: { name: 'apiEndpoint', value: service.apiEndpoint } });
    handleInputChange({ target: { name: 'authType', value: service.authType } });
    handleInputChange({ target: { name: 'pollingInterval', value: '300' } });
    handleInputChange({ target: { name: 'changeDetectionMethod', value: 'array_length' } });
    
    setShowSetupWizard(false);
    
    if (onServiceSelected) {
      onServiceSelected(service);
    }
    
    toast.success(`🎯 ${service.name} configured! Customize settings below.`, {
      duration: 4000
    });
  };

  // AI-powered configuration helper
  const handleAIResearch = async () => {
    if (!aiQuery.trim()) {
      toast.error('Please describe what you want to monitor');
      return;
    }

    setAiLoading(true);
    try {
      // Simulate AI analysis (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock AI response based on query keywords
      const query = aiQuery.toLowerCase();
      let suggestions = [];

      if (query.includes('crypto') || query.includes('token') || query.includes('price')) {
        suggestions = [
          {
            service: serviceCategories[0].services[0], // DexScreener
            reason: 'Perfect for crypto price monitoring with real-time updates',
            confidence: 95,
            customEndpoint: 'https://api.dexscreener.com/latest/dex/search?q=BITCOIN',
            customSettings: {
              pollingInterval: '60',
              changeDetectionMethod: 'response_hash'
            }
          }
        ];
      } else if (query.includes('database') || query.includes('table') || query.includes('data')) {
        suggestions = [
          {
            service: serviceCategories[0].services[1], // Airtable
            reason: 'Ideal for database monitoring with rich data structure',
            confidence: 90,
            customEndpoint: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME',
            customSettings: {
              pollingInterval: '300',
              changeDetectionMethod: 'array_length'
            }
          }
        ];
      } else if (query.includes('sheet') || query.includes('spreadsheet') || query.includes('excel')) {
        suggestions = [
          {
            service: serviceCategories[0].services[2], // Google Sheets
            reason: 'Best for spreadsheet monitoring without API complexity',
            confidence: 88,
            customEndpoint: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv',
            customSettings: {
              pollingInterval: '600',
              changeDetectionMethod: 'response_hash'
            }
          }
        ];
      } else if (query.includes('slack') || query.includes('message') || query.includes('chat')) {
        suggestions = [
          {
            service: serviceCategories[0].services[3], // Slack
            reason: 'Excellent for team communication monitoring',
            confidence: 85,
            customEndpoint: 'https://slack.com/api/conversations.history?channel=YOUR_CHANNEL_ID',
            customSettings: {
              pollingInterval: '180',
              changeDetectionMethod: 'array_length'
            }
          }
        ];
      } else {
        suggestions = [
          {
            service: serviceCategories[0].services[0],
            reason: 'General purpose monitoring - highly reliable',
            confidence: 75,
            customEndpoint: 'https://api.example.com/data',
            customSettings: {
              pollingInterval: '300',
              changeDetectionMethod: 'response_hash'
            }
          }
        ];
      }

      setAiSuggestions(suggestions);
      toast.success('🤖 AI analysis complete! Check the suggestions below.');
    } catch (error) {
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAISuggestion = (suggestion) => {
    // Apply AI-suggested configuration
    handleInputChange({ target: { name: 'serviceName', value: suggestion.service.name } });
    handleInputChange({ target: { name: 'apiEndpoint', value: suggestion.customEndpoint } });
    handleInputChange({ target: { name: 'authType', value: suggestion.service.authType } });
    handleInputChange({ target: { name: 'pollingInterval', value: suggestion.customSettings.pollingInterval } });
    handleInputChange({ target: { name: 'changeDetectionMethod', value: suggestion.customSettings.changeDetectionMethod } });
    
    setShowAIHelper(false);
    setAiSuggestions(null);
    setAiQuery('');
    
    if (onServiceSelected) {
      onServiceSelected(suggestion.service);
    }
    
    toast.success(`🤖 AI configuration applied! ${suggestion.service.name} is ready.`, {
      duration: 4000
    });
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'bg-green-100 text-green-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Hard': 'bg-red-100 text-red-700'
    };
    return colors[difficulty] || colors['Easy'];
  };

  return (
    <div className="space-y-6">
      {/* Header with AI Helper */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-2">🎨 Visual Service Picker</h3>
        <p className="text-sm text-gray-600 mb-3">
          Choose a service to get started quickly with smart defaults
        </p>
        
        {/* AI Helper Button */}
        <button
          onClick={() => setShowAIHelper(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
        >
          <span>🤖</span>
          AI Configuration Helper
        </button>
      </div>

      {/* AI Helper Modal */}
      {showAIHelper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>🤖</span>
                AI Configuration Helper
              </h3>
              <button 
                onClick={() => setShowAIHelper(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe what you want to monitor:
              </label>
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g., 'I want to monitor crypto prices for Bitcoin and Ethereum' or 'Track new entries in my customer database' or 'Watch for new messages in our team Slack channel'"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={4}
              />
            </div>

            <button
              onClick={handleAIResearch}
              disabled={aiLoading || !aiQuery.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing your needs...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Analyze & Suggest Configuration
                </>
              )}
            </button>

            {/* AI Suggestions */}
            {aiSuggestions && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 mb-3">🎯 AI Recommendations:</h4>
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${suggestion.service.color} rounded-lg flex items-center justify-center text-white`}>
                            {suggestion.service.icon}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-800">{suggestion.service.name}</h5>
                            <p className="text-sm text-gray-600">{suggestion.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-purple-600">{suggestion.confidence}% match</div>
                          <div className="text-xs text-gray-500">AI Confidence</div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <div className="text-xs text-gray-600 mb-1">Suggested Configuration:</div>
                        <div className="text-sm space-y-1">
                          <div><strong>Endpoint:</strong> {suggestion.customEndpoint}</div>
                          <div><strong>Check Interval:</strong> {suggestion.customSettings.pollingInterval}s</div>
                          <div><strong>Detection Method:</strong> {suggestion.customSettings.changeDetectionMethod}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => applyAISuggestion(suggestion)}
                        className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors font-medium"
                      >
                        Apply This Configuration →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Service Categories */}
      <div className="space-y-4 relative">
        {serviceCategories.map((category) => (
          <div key={category.id}>
            {/* Minimal Category Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{category.icon}</span>
              <h4 className="font-medium text-gray-800">{category.name}</h4>
            </div>

            {/* Compact Service Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {category.services.map((service, serviceIndex) => (
                <div
                  key={service.id}
                  className="group relative bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => handleServiceSelect(service)}
                  onMouseEnter={() => setHoveredService(service.id)}
                  onMouseLeave={() => setHoveredService(null)}
                >
                  {/* Popularity Badge */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {Math.round(service.popularity/10)}
                  </div>

                  {/* Card Content */}
                  <div className="p-3">
                    {/* Icon and Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 bg-gradient-to-r ${service.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                        {service.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-800 text-sm truncate">{service.name}</h5>
                        <p className="text-xs text-gray-600 truncate">{service.description}</p>
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="flex gap-1 mb-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getDifficultyColor(service.difficulty)}`}>
                        {service.difficulty}
                      </span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {service.setupTime}
                      </span>
                    </div>

                    {/* Setup Button */}
                    <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-1.5 px-3 rounded text-xs font-medium hover:shadow-sm transition-all">
                      Setup →
                    </button>
                  </div>

                  {/* Fixed Position Hover Details Tooltip */}
                  {hoveredService === service.id && (
                    <div 
                      className={`absolute w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 ${
                        serviceIndex >= 2 ? 'right-0' : 'left-0'
                      } ${
                        category.id === 'data' ? 'bottom-full mb-2' : 'top-full mt-2'
                      }`}
                      style={{
                        transform: serviceIndex >= 2 ? 'translateX(0)' : 'translateX(0)'
                      }}
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-800 mb-2">{service.name} Details</div>
                        
                        <div className="mb-2">
                          <div className="text-xs text-gray-600 mb-1">Features:</div>
                          <div className="flex flex-wrap gap-1">
                            {service.features.map((feature, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-1 py-0.5 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-600 mb-1">Setup Flow:</div>
                          <div className="flex items-center gap-1 text-xs">
                            {service.connectionFlow.map((step, idx) => (
                              <React.Fragment key={idx}>
                                <span className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded">
                                  {step}
                                </span>
                                {idx < service.connectionFlow.length - 1 && (
                                  <span className="text-blue-400">→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tooltip Arrow */}
                      <div 
                        className={`absolute w-2 h-2 bg-white border-gray-200 transform rotate-45 ${
                          category.id === 'data' ? 'top-full -mt-1 border-t border-l' : 'bottom-full -mb-1 border-b border-r'
                        } ${
                          serviceIndex >= 2 ? 'right-4' : 'left-4'
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Compact Setup Wizard Modal */}
      {showSetupWizard && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${selectedService.color} rounded-lg flex items-center justify-center text-white`}>
                  {selectedService.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedService.name} Setup</h3>
                  <p className="text-sm text-gray-600">Ready in {selectedService.setupTime}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSetupWizard(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Setup Steps */}
            <div className="space-y-3 mb-4">
              {selectedService.connectionFlow.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-blue-800 text-sm">{step}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Service-specific Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">💡 Quick Tips:</div>
                {selectedService.id === 'dexscreener' && (
                  <div>• No API key needed • Change "PEPE" to your token • Works instantly</div>
                )}
                {selectedService.id === 'airtable' && (
                  <div>• Get API key from account settings • Copy Base ID from URL • Test with small table</div>
                )}
                {selectedService.id === 'google-sheets' && (
                  <div>• Make sheet public • Use CSV export format • No authentication needed</div>
                )}
                {selectedService.id === 'slack' && (
                  <div>• Create bot token • Get channel ID • Enable appropriate scopes</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => applyServiceConfiguration(selectedService)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:shadow-md transition-all"
              >
                Configure {selectedService.name} →
              </button>
              <button
                onClick={() => setShowSetupWizard(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

VisualServiceExplorer.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onServiceSelected: PropTypes.func
};

export default VisualServiceExplorer; 