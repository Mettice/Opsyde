import React, { useState } from 'react';
import PropTypes from 'prop-types';

// Helper function to extract service name from description
const extractServiceName = (description) => {
  if (!description) return 'unknown_service';
  
  const commonServices = ['hubspot', 'slack', 'notion', 'discord', 'airtable', 'linear', 'webflow'];
  const descriptionLower = description.toLowerCase();
  
  for (const service of commonServices) {
    if (descriptionLower.includes(service)) {
      return service;
    }
  }
  
  // Try to extract from common patterns
  const words = descriptionLower.split(/\s+/);
  for (const word of words) {
    if (word.length > 3 && word.endsWith('api')) {
      return word.replace('api', '');
    }
  }
  
  return 'unknown_service';
};

const SmartOutputEditor = ({ 
  formData, 
  handleInputChange, 
  onTestIntegration, 
  isTestingIntegration, 
  testResult 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get values from either direct formData or nested config
  const getValue = (fieldName) => {
    return formData[fieldName] || formData.config?.[fieldName] || '';
  };

  // NEW: Determine if this is smart email vs smart API
  const isSmartEmail = formData.outputType === 'smart_email';
  const isSmartAPI = formData.outputType === 'smart_api';

  // NEW: Different service types based on output type
  const getServiceTypes = () => {
    if (isSmartEmail) {
      return [
        { value: '', label: '🔍 Let AI auto-detect email format', icon: '🤖' },
        { value: 'marketing', label: '📧 Marketing Email', description: 'Professional marketing campaigns' },
        { value: 'notification', label: '🔔 Notification Email', description: 'System alerts and updates' },
        { value: 'report', label: '📊 Report Email', description: 'Data reports and summaries' },
        { value: 'personal', label: '👤 Personal Email', description: 'Personal communication style' },
        { value: 'transactional', label: '💳 Transactional Email', description: 'Order confirmations, receipts' }
      ];
    } else {
      return [
        { value: '', label: '🔍 Let AI auto-detect', icon: '🤖' },
        { value: 'crm', label: '👥 CRM Integration', description: 'HubSpot, Salesforce, Pipedrive, etc.' },
        { value: 'communication', label: '💬 Team Communication', description: 'Slack, Discord, Teams, etc.' },
        { value: 'productivity', label: '📝 Productivity Tools', description: 'Notion, Airtable, Google Workspace, etc.' },
        { value: 'database', label: '🗄️ Database', description: 'PostgreSQL, MySQL, MongoDB, etc.' },
        { value: 'marketing', label: '📧 Marketing Automation', description: 'Mailchimp, ConvertKit, ActiveCampaign, etc.' },
        { value: 'analytics', label: '📊 Analytics', description: 'Google Analytics, Mixpanel, Amplitude, etc.' },
        { value: 'project_management', label: '📋 Project Management', description: 'Asana, Trello, Monday.com, etc.' },
        { value: 'custom_api', label: '🔧 Custom API/Webhook', description: 'Any REST API or webhook endpoint' }
      ];
    }
  };

  const serviceTypes = getServiceTypes();

  // NEW: Different placeholders and labels based on type
  const getDescriptionConfig = () => {
    if (isSmartEmail) {
      return {
        label: "📧 How should the email be formatted and sent?",
        placeholder: `Examples:
- Send a professional summary email to the client with key metrics
- Create a weekly report email with charts and data tables
- Send a personalized thank you email with custom branding
- Format results as a newsletter-style email with sections
- Send urgent alerts with clear action items highlighted`,
        helpText: "Describe the email style, formatting, and recipient details"
      };
    } else {
      return {
        label: "📝 What do you want to do with your workflow data?",
        placeholder: `Examples:
- Send new leads to HubSpot as contacts with tags
- Update my Notion project status page with results
- Post a summary to our Slack #results channel
- Add completed tasks to Airtable with priority scores
- Send formatted reports to clients via email`,
        helpText: "Be specific about the service, action, and data format you want"
      };
    }
  };

  const descriptionConfig = getDescriptionConfig();

  // Enhanced test integration using shared research
  const handleTestSmartIntegration = async () => {
    // Call the parent's test integration function
    if (onTestIntegration) {
      onTestIntegration();
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6 rounded-xl border border-purple-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mr-4">
          <span className="text-2xl">{isSmartEmail ? '📧' : '🤖'}</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-purple-900">
            {isSmartEmail ? 'AI-Powered Smart Email' : 'AI-Powered Smart Integration'}
          </h3>
          <p className="text-sm text-purple-700">
            {isSmartEmail 
              ? 'AI will format and send professional emails automatically'
              : 'Describe what you want to do - AI will handle the technical details'
            }
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Description */}
        <div>
          <label className="block text-gray-800 mb-2 font-medium">
            {descriptionConfig.label}
          </label>
          <textarea
            name="ai_description"
            value={getValue('ai_description')}
            onChange={handleInputChange}
            placeholder={descriptionConfig.placeholder}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            rows="4"
          />
          <div className="text-xs text-gray-600 mt-2 flex items-center">
            <span className="mr-1">💡</span>
            {descriptionConfig.helpText}
          </div>
        </div>

        {/* Service Type Hint */}
        <div>
          <label className="block text-gray-800 mb-2 font-medium">
            {isSmartEmail ? '📧 Email Style Category' : '🎯 Service Category (helps AI understand better)'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {serviceTypes.map(type => (
              <label 
                key={type.value} 
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors hover:bg-white ${
                  getValue('service_type') === type.value 
                    ? 'border-purple-300 bg-white shadow-sm' 
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="service_type"
                  value={type.value}
                  checked={getValue('service_type') === type.value}
                  onChange={handleInputChange}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">{type.label}</div>
                  {type.description && (
                    <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Smart Email Specific Fields */}
        {isSmartEmail && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3">📧 Email Configuration</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Recipient Email:</label>
                <input
                  type="email"
                  name="recipient_email"
                  value={getValue('recipient_email')}
                  onChange={handleInputChange}
                  placeholder="recipient@example.com or let AI extract from data"
                  className="w-full p-2 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Subject Template:</label>
                <input
                  type="text"
                  name="subject_template"
                  value={getValue('subject_template')}
                  onChange={handleInputChange}
                  placeholder="e.g., 'Weekly Report - {date}' or let AI generate"
                  className="w-full p-2 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Output Format Preference */}
        <div>
          <label className="block text-gray-800 mb-2 font-medium">
            {isSmartEmail ? '📋 Email Format Preferences' : '📋 Data Format Preferences (optional)'}
          </label>
          <input
            type="text"
            name="output_format"
            value={getValue('output_format')}
            onChange={handleInputChange}
            placeholder={isSmartEmail 
              ? "e.g., 'Include charts and tables', 'Use company branding', 'Add executive summary'"
              : "e.g., 'Include only name, email, and score fields' or 'Format as markdown table' or 'Use JSON with nested objects'"
            }
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
          <div className="text-xs text-gray-600 mt-1">
            {isSmartEmail 
              ? "Specify email formatting, styling, and content preferences"
              : "Specify how you want the data structured or formatted"
            }
          </div>
        </div>

        {/* Test Integration */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <span className="mr-2">🧪</span>
              {isSmartEmail ? 'Test Email Format' : 'Test AI Integration'}
            </h4>
            <button
              type="button"
              onClick={handleTestSmartIntegration}
              disabled={isTestingIntegration || !getValue('ai_description')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                isTestingIntegration || !getValue('ai_description')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
              }`}
            >
              {isTestingIntegration ? (
                <>
                  <span className="animate-spin mr-2">🤖</span>
                  AI Analyzing...
                </>
              ) : (
                <>
                  <span className="mr-2">{isSmartEmail ? '📧' : '🚀'}</span>
                  {isSmartEmail ? 'Preview Email' : 'Test Integration'}
                </>
              )}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {testResult.success ? (
                <div>
                  <div className="font-bold mb-2 flex items-center">
                    <span className="mr-2">✅</span>
                    Integration Plan Generated Successfully!
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>🎯 Detected Service:</strong> {testResult.service_detected}</div>
                    <div><strong>🔗 Integration Type:</strong> {testResult.integration_type}</div>
                    <div><strong>📊 Confidence:</strong> {(testResult.confidence * 100).toFixed(0)}%</div>
                    {testResult.endpoint && (
                      <div><strong>🌐 Endpoint:</strong> <code className="text-xs bg-green-100 px-1 rounded">{testResult.endpoint}</code></div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold mb-2 flex items-center">
                    <span className="mr-2">❌</span>
                    Integration Test Failed
                  </div>
                  <div className="text-sm mb-2">{testResult.error}</div>
                  {testResult.fallback_suggestion && (
                    <div className="text-xs bg-red-100 p-2 rounded mt-2">
                      💡 <strong>Suggestion:</strong> {testResult.fallback_suggestion}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!testResult && !isTestingIntegration && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <span className="mr-2">💡</span>
              Click "Test Integration" to see how AI will handle your description
            </div>
          )}
        </div>

        {/* AI Capabilities Preview */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
            <span className="mr-2">🧠</span>
            What AI Will Handle Automatically
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start">
              <span className="text-green-600 mr-2 mt-0.5">✅</span>
              <span className="text-blue-700">Service detection & API discovery</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 mt-0.5">✅</span>
              <span className="text-blue-700">Authentication handling</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 mt-0.5">✅</span>
              <span className="text-blue-700">Data field mapping</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 mt-0.5">✅</span>
              <span className="text-blue-700">Error handling & retries</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 mt-0.5">✅</span>
              <span className="text-blue-700">Format conversion</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2 mt-0.5">✅</span>
              <span className="text-blue-700">Rate limiting compliance</span>
            </div>
          </div>
        </div>

        {/* Advanced Options (Collapsible) */}
        <details className="bg-yellow-50 border border-yellow-200 rounded-lg">
          <summary className="p-3 font-semibold text-yellow-800 cursor-pointer hover:bg-yellow-100 rounded-lg">
            🔧 Advanced Configuration (Optional)
          </summary>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Custom API Endpoint:</label>
              <input
                type="text"
                name="manual_endpoint"
                value={getValue('manual_endpoint')}
                onChange={handleInputChange}
                placeholder="https://api.myservice.com/endpoint"
                className="w-full p-2 text-sm border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Custom Headers (JSON):</label>
              <textarea
                name="manual_headers"
                value={getValue('manual_headers')}
                onChange={handleInputChange}
                placeholder='{"Authorization": "Bearer your-token", "Content-Type": "application/json"}'
                className="w-full p-2 text-sm border border-yellow-300 rounded font-mono focus:ring-2 focus:ring-yellow-400"
                rows="3"
              />
            </div>
            <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
              ⚠️ Manual settings will override AI detection. Use only if you need specific configuration.
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

SmartOutputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onTestIntegration: PropTypes.func.isRequired,
  isTestingIntegration: PropTypes.bool.isRequired,
  testResult: PropTypes.object
};

export default SmartOutputEditor;