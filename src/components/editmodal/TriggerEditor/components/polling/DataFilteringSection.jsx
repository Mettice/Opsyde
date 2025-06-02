import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const DataFilteringSection = ({ formData, handleInputChange }) => {
  const handleDiscoverFields = async () => {
    if (!formData.apiEndpoint) {
      toast.error('Please set API endpoint first');
      return;
    }
    
    try {
      toast.loading('🔍 Discovering available fields...', { id: 'discover-fields' });
      
      const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiEndpoint: formData.apiEndpoint,
          authType: formData.authType || 'none',
          apiKey: formData.apiKey || '',
          bearerToken: formData.bearerToken || '',
          username: formData.username || '',
          password: formData.password || '',
          serviceName: formData.serviceName || 'Unknown API'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.sample_data) {
          // Smart field extraction for different API types
          const extractSmartFields = (data) => {
            let fieldsToExtract = [];
            
            // Handle CSV parsed data (Google Sheets)
            if (data.source === 'csv_parsed' && data.headers && data.records) {
              fieldsToExtract = data.headers.map((header, index) => `records[0].${header}`);
              console.log('🔍 Detected CSV format, extracted column headers as fields:', fieldsToExtract);
              return fieldsToExtract;
            }
            
            // Handle Airtable format: { records: [{ fields: {...} }] }
            if (data.records && Array.isArray(data.records) && data.records.length > 0) {
              const firstRecord = data.records[0];
              if (firstRecord.fields) {
                fieldsToExtract = Object.keys(firstRecord.fields).map(field => `records[0].fields.${field}`);
                console.log('🔍 Detected Airtable format, extracted fields:', fieldsToExtract);
              }
            }
            // Handle DexScreener format: { pairs: [...] } or direct array
            else if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
              const extractFields = (obj, prefix = '') => {
                const fields = [];
                if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                  for (const [key, value] of Object.entries(obj)) {
                    const fieldPath = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      fields.push(fieldPath);
                      const nestedFields = extractFields(value, fieldPath);
                      fields.push(...nestedFields);
                    } else {
                      fields.push(fieldPath);
                    }
                  }
                }
                return fields;
              };
              fieldsToExtract = extractFields(data.pairs[0], 'pairs[0]');
              console.log('🔍 Detected structured API format, extracted fields:', fieldsToExtract);
            }
            // Handle direct array format
            else if (Array.isArray(data) && data.length > 0) {
              const extractFields = (obj, prefix = '') => {
                const fields = [];
                if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                  for (const [key, value] of Object.entries(obj)) {
                    const fieldPath = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      fields.push(fieldPath);
                      const nestedFields = extractFields(value, fieldPath);
                      fields.push(...nestedFields);
                    } else {
                      fields.push(fieldPath);
                    }
                  }
                }
                return fields;
              };
              fieldsToExtract = extractFields(data[0], '[0]');
              console.log('🔍 Detected direct array format, extracted fields:', fieldsToExtract);
            }
            // Handle generic object
            else if (typeof data === 'object') {
              const extractFields = (obj, prefix = '') => {
                const fields = [];
                if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                  for (const [key, value] of Object.entries(obj)) {
                    const fieldPath = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      fields.push(fieldPath);
                      const nestedFields = extractFields(value, fieldPath);
                      fields.push(...nestedFields);
                    } else {
                      fields.push(fieldPath);
                    }
                  }
                }
                return fields;
              };
              fieldsToExtract = extractFields(data);
              console.log('🔍 Detected generic object format, extracted fields:', fieldsToExtract);
            }
            
            return fieldsToExtract;
          };
          
          const discoveredFields = extractSmartFields(result.sample_data);
          handleInputChange({ target: { name: 'discoveredFields', value: discoveredFields } });
          handleInputChange({ target: { name: 'showFieldSelection', value: true } });
          
          toast.success(`✅ Discovered ${discoveredFields.length} fields!`, {
            id: 'discover-fields',
            duration: 3000
          });
        } else {
          toast.error('Failed to discover fields', { id: 'discover-fields' });
        }
      } else {
        toast.error('Failed to connect to API', { id: 'discover-fields' });
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`, { id: 'discover-fields' });
    }
  };

  const getServiceRecommendations = () => {
    if (!formData.serviceName) return null;
    
    const serviceName = formData.serviceName.toLowerCase();
    
    if (serviceName.includes('dexscreener')) {
      return {
        include: 'baseToken.symbol, baseToken.name, priceUsd, liquidity.usd, volume.h24, priceChange.h24, chainId',
        exclude: 'info, labels, boosts, profile',
        onApply: () => {
          handleInputChange({ target: { name: 'targetFieldsString', value: 'baseToken.symbol, baseToken.name, priceUsd, liquidity.usd, volume.h24, priceChange.h24, chainId' } });
          handleInputChange({ target: { name: 'targetFields', value: ['baseToken.symbol', 'baseToken.name', 'priceUsd', 'liquidity.usd', 'volume.h24', 'priceChange.h24', 'chainId'] } });
          handleInputChange({ target: { name: 'excludeFieldsString', value: 'info, labels, boosts, profile' } });
          handleInputChange({ target: { name: 'excludeFields', value: ['info', 'labels', 'boosts', 'profile'] } });
        }
      };
    } else if (serviceName.includes('airtable')) {
      return {
        include: 'fields.Topic, fields.Description, fields.Status',
        exclude: 'createdTime, id (unless needed)'
      };
    } else if (serviceName.includes('notion')) {
      return {
        include: 'properties.Name, properties.Status, properties.Description',
        exclude: 'object, parent, archived'
      };
    }
    
    return null;
  };

  const recommendations = getServiceRecommendations();

  return (
    <>
      {/* SIMPLIFIED: Universal Data Selection */}
      <div className="mb-4">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">🎯 Data Selection Workflow</h3>
          <p className="text-sm text-blue-700 mb-3">
            Control what data reaches your agent. Review detected changes before processing.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requireDataApproval"
                  checked={formData.requireDataApproval || false}
                  onChange={(e) => handleInputChange({ target: { name: 'requireDataApproval', value: e.target.checked } })}
                  className="mr-2"
                />
                <span className="font-medium text-blue-800">🔍 Review Data Before Agent Processing</span>
              </label>
              <button
                type="button"
                onClick={handleDiscoverFields}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
              >
                🔍 Discover Fields
              </button>
            </div>
            
            {formData.requireDataApproval ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                <strong>✅ Interactive Mode:</strong> When data changes are detected, you'll review and select what to send to your agent.
                <br />
                <span className="text-green-700">Perfect for ensuring your agent only processes relevant data!</span>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <strong>⚡ Auto Mode:</strong> All detected changes will automatically be sent to your agent.
                <br />
                <span className="text-yellow-700">Enable "Review Data" for more control over what your agent processes.</span>
              </div>
            )}
            
            {/* Field Selection (only show if fields discovered) */}
            {formData.showFieldSelection && formData.discoveredFields && formData.discoveredFields.length > 0 && (
              <div className="p-3 bg-white border border-blue-300 rounded">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Fields ({formData.discoveredFields.length})
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Select which fields to monitor for changes. Only changes in selected fields will trigger your workflow.
                  </p>
                </div>
                
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                  <div className="grid grid-cols-1 gap-1">
                    {formData.discoveredFields.map((field, index) => (
                      <label key={index} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={(formData.selectedFields || []).includes(field)}
                          onChange={(e) => {
                            const currentFields = formData.selectedFields || [];
                            const newFields = e.target.checked 
                              ? [...currentFields, field]
                              : currentFields.filter(f => f !== field);
                            handleInputChange({ target: { name: 'selectedFields', value: newFields } });
                          }}
                          className="mr-2"
                        />
                        <span className="font-mono text-xs text-gray-700">{field}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Quick selection buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange({ target: { name: 'selectedFields', value: formData.discoveredFields } });
                    }}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                  >
                    ✅ Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange({ target: { name: 'selectedFields', value: [] } });
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                  >
                    🗑️ Clear All
                  </button>
                </div>
                
                {/* Selection summary */}
                {formData.selectedFields && formData.selectedFields.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                    <strong>✅ Monitoring {formData.selectedFields.length} fields:</strong>
                    <div className="mt-1 font-mono">
                      {formData.selectedFields.slice(0, 3).join(', ')}
                      {formData.selectedFields.length > 3 && ` ... and ${formData.selectedFields.length - 3} more`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW: Field Filtering Section */}
      <div className="mb-4">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">🎯 Field Filtering (Optional)</h3>
          <p className="text-sm text-purple-700 mb-3">
            Filter API data to include only specific columns. Perfect for focusing on "topic" and "description" fields only.
          </p>
          
          {/* ChatGPT's Smart Filtering Mode Toggle */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="summaryMode"
                  checked={formData.summaryMode || false}
                  onChange={(e) => handleInputChange({ target: { name: 'summaryMode', value: e.target.checked } })}
                  className="mr-2"
                />
                <span className="font-medium text-blue-800">🧠 Smart Filtering Mode (ChatGPT Strategy)</span>
              </label>
            </div>
            <p className="text-xs text-blue-700">
              Automatically optimize data for AI processing: reduce tokens by 80-90%, select most important fields, 
              and limit records to prevent overflow. Based on ChatGPT's recommendations.
            </p>
            
            {formData.summaryMode && (
              <div className="mt-3 space-y-3 p-3 bg-white border border-blue-300 rounded">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Records
                    </label>
                    <select
                      name="maxRecords"
                      value={formData.maxRecords || 5}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="3">3 records (safest)</option>
                      <option value="5">5 records (recommended)</option>
                      <option value="10">10 records (moderate)</option>
                      <option value="20">20 records (high)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Token Limit
                    </label>
                    <select
                      name="maxTokens"
                      value={formData.maxTokens || 2000}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="1000">1,000 tokens (minimal)</option>
                      <option value="2000">2,000 tokens (recommended)</option>
                      <option value="4000">4,000 tokens (generous)</option>
                      <option value="6000">6,000 tokens (maximum)</option>
                    </select>
                  </div>
                </div>
                
                <div className="p-2 bg-green-100 border border-green-300 rounded text-xs">
                  <strong>💡 Smart Mode Benefits:</strong> Automatically selects essential fields, 
                  removes noise, optimizes for {formData.serviceName || 'your API'}, and prevents token overflow.
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Include Only These Fields (comma-separated)
              </label>
              <input
                type="text"
                name="targetFields"
                value={formData.targetFieldsString || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const fieldsArray = value ? value.split(',').map(f => f.trim()).filter(f => f) : [];
                  handleInputChange({ target: { name: 'targetFields', value: fieldsArray } });
                  // Also store as string for display
                  handleInputChange({ target: { name: 'targetFieldsString', value: value } });
                }}
                className="w-full p-2 border rounded text-sm"
                placeholder="e.g., baseToken.symbol, priceUsd, liquidity.usd, volume.h24"
                disabled={formData.summaryMode}
              />
              <div className="text-xs text-purple-600 mt-1">
                {formData.summaryMode ? 
                  "🧠 Smart Mode: Fields auto-selected based on API type" : 
                  "💡 Example: \"baseToken.symbol, priceUsd\" - Agent will only receive these fields"
                }
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Exclude These Fields (comma-separated)
              </label>
              <input
                type="text"
                name="excludeFields"
                value={formData.excludeFieldsString || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const fieldsArray = value ? value.split(',').map(f => f.trim()).filter(f => f) : [];
                  handleInputChange({ target: { name: 'excludeFields', value: fieldsArray } });
                  // Also store as string for display
                  handleInputChange({ target: { name: 'excludeFieldsString', value: value } });
                }}
                className="w-full p-2 border rounded text-sm"
                placeholder="e.g., info, labels, boosts, profile"
              />
              <div className="text-xs text-purple-600 mt-1">
                💡 Example: "info, labels" - Remove noise and metadata fields
              </div>
            </div>
            
            {/* ChatGPT's Service-Specific Recommendations */}
            {recommendations && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-xs font-medium text-yellow-800 mb-1">
                  🎯 Recommended for {formData.serviceName}:
                </div>
                <div className="text-xs text-yellow-700">
                  <strong>Include:</strong> {recommendations.include}<br/>
                  <strong>Exclude:</strong> {recommendations.exclude}
                </div>
                
                {recommendations.onApply && (
                  <button
                    type="button"
                    onClick={recommendations.onApply}
                    className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
                  >
                    🚀 Apply {formData.serviceName} Optimization
                  </button>
                )}
              </div>
            )}
            
            <div className="p-2 bg-purple-100 border border-purple-300 rounded text-xs">
              <strong>🎯 Pro Tip:</strong> Use field filtering to reduce token usage and focus your AI agent on relevant data only. 
              {formData.summaryMode ? 
                " Smart Mode handles this automatically!" : 
                " For crypto data, focus on price, volume, and liquidity fields."
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

DataFilteringSection.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default DataFilteringSection; 