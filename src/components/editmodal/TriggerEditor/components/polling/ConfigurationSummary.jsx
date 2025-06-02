import React from 'react';
import PropTypes from 'prop-types';

const ConfigurationSummary = ({ formData }) => {
  const getSmartEndpointAnalysis = () => {
    if (!formData.apiEndpoint) return null;
    
    const url = formData.apiEndpoint.toLowerCase();
    
    // DexScreener Detection
    if (url.includes('dexscreener.com')) {
      if (url.includes('token-boosts')) {
        return (
          <div className="space-y-2">
            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
              <strong>⚠️ Token Boosts Endpoint Detected</strong>
              <p className="text-yellow-700 mt-1">
                This endpoint provides promotion data, not trading data (price, volume, market cap).
              </p>
            </div>
            <div className="text-blue-700">
              <strong>💡 For Trading Data, Consider:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li><code>/latest/dex/search?q=TOKEN</code> - Search for specific tokens</li>
                <li><code>/latest/dex/pairs/CHAIN/ADDRESS</code> - Specific pair data</li>
                <li><code>/token-profiles/latest/v1</code> - Token profiles with metadata</li>
              </ul>
            </div>
          </div>
        );
      } else if (url.includes('/search')) {
        return (
          <div className="p-2 bg-green-100 border border-green-300 rounded">
            <strong>✅ Trading Data Endpoint</strong>
            <p className="text-green-700 mt-1">
              This endpoint provides trading data: price, volume, liquidity, market cap.
            </p>
          </div>
        );
      } else if (url.includes('/pairs/')) {
        return (
          <div className="p-2 bg-green-100 border border-green-300 rounded">
            <strong>✅ Specific Pair Endpoint</strong>
            <p className="text-green-700 mt-1">
              This endpoint provides detailed data for a specific trading pair.
            </p>
          </div>
        );
      } else if (url.includes('token-profiles')) {
        return (
          <div className="p-2 bg-blue-100 border border-blue-300 rounded">
            <strong>📊 Token Profiles Endpoint</strong>
            <p className="text-blue-700 mt-1">
              This endpoint provides token metadata and profile information.
            </p>
          </div>
        );
      } else {
        return (
          <div className="p-2 bg-gray-100 border border-gray-300 rounded">
            <strong>🤔 Unknown DexScreener Endpoint</strong>
            <p className="text-gray-700 mt-1">
              Use "Preview Data" to see what this endpoint returns.
            </p>
          </div>
        );
      }
    }
    
    // Airtable Detection
    else if (url.includes('airtable.com')) {
      if (url.includes('api.airtable.com')) {
        return (
          <div className="p-2 bg-green-100 border border-green-300 rounded">
            <strong>✅ Airtable API Endpoint</strong>
            <p className="text-green-700 mt-1">
              This will return records from your Airtable base. Make sure you have the correct API key.
            </p>
          </div>
        );
      } else {
        return (
          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
            <strong>⚠️ Airtable Web URL Detected</strong>
            <p className="text-yellow-700 mt-1">
              This looks like a web URL. For API access, use: <code>https://api.airtable.com/v0/BASE_ID/TABLE_NAME</code>
            </p>
          </div>
        );
      }
    }
    
    // Google Sheets Detection
    else if (url.includes('docs.google.com') || url.includes('sheets.googleapis.com')) {
      if (url.includes('/export?format=csv')) {
        return (
          <div className="p-2 bg-green-100 border border-green-300 rounded">
            <strong>✅ Google Sheets CSV Export</strong>
            <p className="text-green-700 mt-1">
              This will return CSV data. Make sure the sheet is publicly accessible.
            </p>
          </div>
        );
      } else if (url.includes('sheets.googleapis.com')) {
        return (
          <div className="p-2 bg-blue-100 border border-blue-300 rounded">
            <strong>📊 Google Sheets API</strong>
            <p className="text-blue-700 mt-1">
              This uses the official Google Sheets API. Ensure you have proper authentication.
            </p>
          </div>
        );
      } else {
        return (
          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
            <strong>⚠️ Google Sheets Web URL</strong>
            <p className="text-yellow-700 mt-1">
              For API access, use the CSV export URL or Google Sheets API endpoint.
            </p>
          </div>
        );
      }
    }
    
    // GitHub Detection
    else if (url.includes('github.com') || url.includes('api.github.com')) {
      if (url.includes('api.github.com')) {
        return (
          <div className="p-2 bg-green-100 border border-green-300 rounded">
            <strong>✅ GitHub API Endpoint</strong>
            <p className="text-green-700 mt-1">
              This will return GitHub data (repos, issues, etc.). Consider rate limits.
            </p>
          </div>
        );
      } else {
        return (
          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
            <strong>⚠️ GitHub Web URL</strong>
            <p className="text-yellow-700 mt-1">
              For API access, use: <code>https://api.github.com/repos/OWNER/REPO/issues</code>
            </p>
          </div>
        );
      }
    }
    
    // Notion Detection
    else if (url.includes('notion.com') || url.includes('api.notion.com')) {
      if (url.includes('api.notion.com')) {
        return (
          <div className="p-2 bg-green-100 border border-green-300 rounded">
            <strong>✅ Notion API Endpoint</strong>
            <p className="text-green-700 mt-1">
              This will return Notion database or page data. Ensure proper integration setup.
            </p>
          </div>
        );
      } else {
        return (
          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
            <strong>⚠️ Notion Web URL</strong>
            <p className="text-yellow-700 mt-1">
              For API access, use: <code>https://api.notion.com/v1/databases/DATABASE_ID/query</code>
            </p>
          </div>
        );
      }
    }
    
    // Slack Detection
    else if (url.includes('slack.com')) {
      return (
        <div className="p-2 bg-blue-100 border border-blue-300 rounded">
          <strong>📱 Slack API Endpoint</strong>
          <p className="text-blue-700 mt-1">
            This will return Slack data. Make sure you have proper bot permissions and tokens.
          </p>
        </div>
      );
    }
    
    // Generic API Detection
    else if (url.includes('api.') || url.includes('/api/')) {
      return (
        <div className="p-2 bg-blue-100 border border-blue-300 rounded">
          <strong>🔗 API Endpoint Detected</strong>
          <p className="text-blue-700 mt-1">
            This appears to be an API endpoint. Use "Preview Data" to see the response structure.
          </p>
        </div>
      );
    }
    
    // Unknown/Generic URL
    else {
      return (
        <div className="p-2 bg-gray-100 border border-gray-300 rounded">
          <strong>🤔 Unknown Endpoint Type</strong>
          <p className="text-gray-700 mt-1">
            Use "Preview Data" to test this endpoint and see what data it returns.
          </p>
        </div>
      );
    }
  };

  const getPollingIntervalDisplay = () => {
    const interval = formData.pollingInterval || 300;
    const minutes = Math.floor(interval / 60);
    const seconds = interval % 60;
    
    if (minutes === 0) {
      return `${seconds} seconds`;
    } else if (seconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  const getAuthTypeDisplay = () => {
    switch (formData.authType) {
      case 'api_key':
        return 'API Key';
      case 'bearer_token':
        return 'Bearer Token';
      case 'basic_auth':
        return 'Basic Auth (Username/Password)';
      case 'none':
      default:
        return 'No Authentication';
    }
  };

  const getChangeDetectionDisplay = () => {
    switch (formData.changeDetectionMethod) {
      case 'array_length':
        return 'Array Length (Best for lists/tables)';
      case 'field_value':
        return `Field Value: ${formData.changeDetectionField || 'Not specified'}`;
      case 'response_hash':
        return 'Entire Response Hash';
      case 'timestamp':
        return `Timestamp: ${formData.timestampField || 'Not specified'}`;
      default:
        return 'Array Length (Default)';
    }
  };

  const getFilteringStatus = () => {
    const hasSelectedFields = formData.selectedFields && formData.selectedFields.length > 0;
    const hasTargetFields = formData.targetFields && formData.targetFields.length > 0;
    const hasExcludeFields = formData.excludeFields && formData.excludeFields.length > 0;
    const hasSmartMode = formData.summaryMode;
    
    if (!hasSelectedFields && !hasTargetFields && !hasExcludeFields && !hasSmartMode) {
      return 'No filtering applied - agent gets all data';
    }
    
    let status = [];
    if (hasSmartMode) status.push('Smart Mode enabled');
    if (hasSelectedFields) status.push(`${formData.selectedFields.length} fields selected`);
    if (hasTargetFields) status.push(`${formData.targetFields.length} target fields`);
    if (hasExcludeFields) status.push(`${formData.excludeFields.length} excluded fields`);
    
    return status.join(', ');
  };

  if (!formData.apiEndpoint) {
    return null;
  }

  return (
    <>
      {/* Smart Endpoint Guidance - Universal Detection */}
      <div className="mb-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">🔍 Smart Endpoint Analysis</h4>
          {getSmartEndpointAnalysis()}
          
          {/* Universal Guidance */}
          <div className="mt-3 p-2 bg-white border border-blue-300 rounded">
            <strong>💡 Universal Tips:</strong>
            <ul className="mt-1 ml-4 list-disc text-blue-700 text-sm">
              <li>Use "Preview Data" to see exactly what this endpoint returns</li>
              <li>Check authentication requirements for your specific service</li>
              <li>Consider rate limits and polling frequency</li>
              <li>Test with a longer polling interval first (5+ minutes)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Data Summary */}
      <div className="mb-4">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-2">📋 Current Configuration</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>Service:</strong> {formData.serviceName || 'Unknown'}</div>
            <div><strong>Endpoint:</strong> <code className="bg-gray-200 px-1 rounded text-xs break-all">{formData.apiEndpoint}</code></div>
            <div><strong>Authentication:</strong> {getAuthTypeDisplay()}</div>
            <div><strong>Change Detection:</strong> {getChangeDetectionDisplay()}</div>
            <div><strong>Polling Interval:</strong> Every {getPollingIntervalDisplay()}</div>
            <div><strong>Data Approval:</strong> {formData.requireDataApproval ? 'Review before processing' : 'Auto-process all changes'}</div>
            <div><strong>Field Filtering:</strong> {getFilteringStatus()}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            💡 Use "Preview Data" to see what your agent will receive from this API
          </div>
        </div>
      </div>
    </>
  );
};

ConfigurationSummary.propTypes = {
  formData: PropTypes.object.isRequired
};

export default ConfigurationSummary; 