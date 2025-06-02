import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const TestingSection = ({ formData, handleInputChange }) => {
  const handlePreviewData = async () => {
    if (!formData.apiEndpoint) {
      toast.error('Please enter an API endpoint first');
      return;
    }
    
    try {
      console.log('🔍 Starting Preview Data request...');
      toast.loading('🔍 Fetching data preview...', { id: 'preview-data' });
      
      const requestBody = {
        apiEndpoint: formData.apiEndpoint,
        authType: formData.authType || 'none',
        apiKey: formData.apiKey || '',
        bearerToken: formData.bearerToken || '',
        username: formData.username || '',
        password: formData.password || '',
        changeDetectionMethod: formData.changeDetectionMethod || 'array_length',
        serviceName: formData.serviceName || 'Unknown API',
        // ADD FIELD FILTERING TO PREVIEW
        selectedFields: formData.selectedFields || [],
        targetFields: formData.targetFields || [],
        excludeFields: formData.excludeFields || [],
        summaryMode: formData.summaryMode || false,
        maxRecords: formData.maxRecords || 10,
        maxTokens: formData.maxTokens || 4000
      };
      
      console.log('🔍 Request body:', requestBody);
      
      // Use the simpler backend endpoint that doesn't rely on AI
      const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('🔍 Response status:', response.status, response.statusText);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Error response:', errorText);
        toast.error(`❌ Failed to fetch data: ${response.status}`, {
          id: 'preview-data',
          duration: 4000
        });
        return;
      }
      
      const result = await response.json();
      console.log('🔍 Parsed result:', result);
      
      if (result.success && result.sample_data) {
        console.log('🔍 Success! Sample data received:', result.sample_data);
        
        // Create a user-friendly data preview
        let previewText = "📊 Data Structure Preview:\n\n";
        
        // Show filtering status
        if (result.filtering_applied) {
          const selectedCount = (formData.selectedFields || []).length;
          const targetCount = (formData.targetFields || []).length;
          const excludeCount = (formData.excludeFields || []).length;
          
          previewText += "🎯 FILTERED DATA (What Your Agent Will Receive):\n";
          if (selectedCount > 0) {
            previewText += `✅ Selected ${selectedCount} specific fields\n`;
          }
          if (targetCount > 0) {
            previewText += `✅ Including ${targetCount} target fields\n`;
          }
          if (excludeCount > 0) {
            previewText += `✅ Excluding ${excludeCount} unwanted fields\n`;
          }
          previewText += "\n";
        } else {
          previewText += "📋 RAW DATA (No filtering applied):\n\n";
        }
        
        // Analyze the data structure for better display
        const data = result.sample_data;
        
        if (Array.isArray(data)) {
          previewText += `📋 Array with ${data.length} items\n`;
          if (data.length > 0 && typeof data[0] === 'object') {
            previewText += `🔑 Sample item fields: ${Object.keys(data[0]).join(', ')}\n\n`;
            previewText += `📄 First item:\n${JSON.stringify(data[0], null, 2)}`;
          }
        } else if (typeof data === 'object' && data !== null) {
          // Check for CSV parsed data (Google Sheets)
          if (data.source === 'csv_parsed' && data.headers && data.records) {
            previewText += `📊 Google Sheets CSV: ${data.total_rows} rows, ${data.total_columns} columns\n`;
            previewText += `🔑 Column headers: ${data.headers.join(', ')}\n\n`;
            
            if (data.records.length > 0) {
              previewText += `📄 Sample record (first row):\n`;
              const firstRecord = data.records[0];
              for (const [key, value] of Object.entries(firstRecord)) {
                previewText += `  ${key}: "${value}"\n`;
              }
              
              if (data.records.length > 1) {
                previewText += `\n📄 Second record:\n`;
                const secondRecord = data.records[1];
                for (const [key, value] of Object.entries(secondRecord)) {
                  previewText += `  ${key}: "${value}"\n`;
                }
              }
            }
          }
          // Check for common patterns
          else if (data.records && Array.isArray(data.records)) {
            previewText += `📊 Airtable-style: ${data.records.length} records\n`;
            if (data.records.length > 0) {
              const firstRecord = data.records[0];
              if (firstRecord.fields) {
                previewText += `🔑 Available fields: ${Object.keys(firstRecord.fields).join(', ')}\n\n`;
                previewText += `📄 Sample record:\n${JSON.stringify(firstRecord, null, 2)}`;
              }
            }
          } else if (data.values && Array.isArray(data.values)) {
            previewText += `📈 Google Sheets-style: ${data.values.length} rows\n`;
            if (data.values.length > 0) {
              previewText += `🔑 First row (headers): ${data.values[0].join(', ')}\n`;
              if (data.values.length > 1) {
                previewText += `📄 Sample data row:\n${JSON.stringify(data.values[1], null, 2)}`;
              }
            }
          } else {
            // Generic object
            previewText += `🔑 Object keys: ${Object.keys(data).join(', ')}\n\n`;
            previewText += `📄 Sample data:\n${JSON.stringify(data, null, 2).substring(0, 400)}...`;
          }
        } else {
          previewText += `📄 Raw data:\n${JSON.stringify(data, null, 2)}`;
        }
        
        // Truncate if too long
        if (previewText.length > 800) {
          previewText = previewText.substring(0, 800) + '\n\n... (truncated)';
        }
        
        if (result.filtering_applied) {
          previewText += '\n\n🎯 This filtered data is what your agent will receive!';
          previewText += '\n💡 Raw data has been filtered based on your field selections.';
        } else {
          previewText += '\n\n📋 This raw data is what your agent will receive!';
          previewText += '\n💡 No field filtering applied - agent gets all data.';
        }
        
        toast.success(previewText, {
          id: 'preview-data',
          duration: 12000,
          style: {
            maxWidth: '700px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap'
          }
        });
        
        // Also log full data to console for developers
        console.log('🔍 Full Data Preview for Agent:', result.sample_data);
        console.log('📊 Data Structure Analysis:', result.data_structure);
        
      } else {
        console.error('🔍 Request failed:', result);
        toast.error(`❌ ${result.error || 'Failed to fetch data preview'}`, {
          id: 'preview-data',
          duration: 6000
        });
      }
      
    } catch (error) {
      console.error('🔍 Exception caught:', error);
      toast.error(`❌ Preview error: ${error.message}`, {
        id: 'preview-data',
        duration: 6000
      });
    }
  };

  const handleAiAnalysis = async () => {
    try {
      toast.loading('🤖 AI is analyzing your API...', { id: 'test-connection' });
      
      // Check if this is a CSV endpoint (Google Sheets, etc.)
      if (formData.apiEndpoint && (formData.apiEndpoint.includes('output=csv') || formData.apiEndpoint.includes('export?format=csv'))) {
        // For CSV endpoints, use the simple test instead of AI analysis
        toast.success('📊 CSV endpoint detected - using simple analysis instead of AI', {
          id: 'test-connection',
          duration: 3000
        });
        
        // Trigger the simple preview instead
        setTimeout(() => {
          handlePreviewData();
        }, 500);
        return;
      }
      
      // Use the backend debug endpoint with AI analysis
      const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiEndpoint: formData.apiEndpoint,
          authType: formData.authType || 'none',
          apiKey: formData.apiKey || '',
          bearerToken: formData.bearerToken || '',
          username: formData.username || '',
          password: formData.password || '',
          changeDetectionMethod: formData.changeDetectionMethod || 'array_length',
          serviceName: formData.serviceName || 'Unknown API'
        })
      });
      
      // Check if response is ok first
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`❌ Server error (${response.status}): ${errorText.substring(0, 100)}`, {
          id: 'test-connection',
          duration: 6000
        });
        console.error('Server error:', response.status, errorText);
        return;
      }
      
      // Try to parse JSON with error handling
      let result;
      try {
        const responseText = await response.text();
        if (!responseText.trim()) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(responseText);
      } catch (jsonError) {
        toast.error(`❌ Invalid response from server: ${jsonError.message}`, {
          id: 'test-connection',
          duration: 6000
        });
        console.error('JSON parsing error:', jsonError);
        return;
      }
      
      if (result.success) {
        const { data_structure, change_detection_info, ai_insights, smart_filtering_config } = result;
        
        // 🤖 AUTO-APPLY AI SMART FILTERING RECOMMENDATIONS
        if (smart_filtering_config && smart_filtering_config.confidence > 0.8 && smart_filtering_config.auto_apply) {
          // Enable Smart Filtering Mode
          handleInputChange({ target: { name: 'summaryMode', value: true } });

          // Apply AI-recommended target fields
          if (smart_filtering_config.recommended_target_fields?.length > 0) {
            handleInputChange({ target: { name: 'targetFields', value: smart_filtering_config.recommended_target_fields } });
            handleInputChange({ target: { name: 'targetFieldsString', value: smart_filtering_config.recommended_target_fields.join(', ') } });
          }

          // Apply AI-recommended exclude fields
          if (smart_filtering_config.recommended_exclude_fields?.length > 0) {
            handleInputChange({ target: { name: 'excludeFields', value: smart_filtering_config.recommended_exclude_fields } });
            handleInputChange({ target: { name: 'excludeFieldsString', value: smart_filtering_config.recommended_exclude_fields.join(', ') } });
          }

          // Apply AI-recommended limits
          if (smart_filtering_config.recommended_max_records) {
            handleInputChange({ target: { name: 'maxRecords', value: smart_filtering_config.recommended_max_records } });
          }
          if (smart_filtering_config.recommended_max_tokens) {
            handleInputChange({ target: { name: 'maxTokens', value: smart_filtering_config.recommended_max_tokens } });
          }

          // Show success message
          setTimeout(() => {
            toast.success(
              `🤖 AI Smart Filtering Applied!\n✅ ${smart_filtering_config.recommended_target_fields?.length || 0} key fields selected\n✅ ${smart_filtering_config.recommended_exclude_fields?.length || 0} noise fields excluded\n✅ Optimized for ${smart_filtering_config.recommended_max_records || 5} records\n\nReasoning: ${smart_filtering_config.reasoning}`,
              { duration: 10000, style: { maxWidth: '500px', fontSize: '12px', whiteSpace: 'pre-line' } }
            );
          }, 1000);
        }
        
        // Show success message with AI insights
        let message = `✅ API connection successful!`;
        
        if (data_structure?.records_count !== undefined) {
          message += ` Found ${data_structure.records_count} items.`;
        } else if (data_structure?.item_count !== undefined) {
          message += ` Found ${data_structure.item_count} items.`;
        } else if (data_structure?.keys) {
          message += ` Found data with keys: ${data_structure.keys.slice(0, 3).join(', ')}${data_structure.keys.length > 3 ? '...' : ''}`;
        }
        
        toast.success(message, { 
          id: 'test-connection',
          duration: 8000
        });
        
        // Log detailed AI analysis
        console.log('🤖 AI API Analysis:', result);
        console.log('📊 Data Structure:', data_structure);
        console.log('🎯 Change Detection Recommendations:', change_detection_info);
        if (ai_insights) {
          console.log('🔍 AI Service Insights:', ai_insights);
        }
        
        // Show AI recommendations - ONLY if AI actually provided them
        if (change_detection_info?.explanation) {
          setTimeout(() => {
            toast.success(
              `🤖 AI Recommendation: ${change_detection_info.explanation}`,
              { duration: 6000 }
            );
          }, 1000);
        }
        
        // Show AI recommended method if different from current
        if (change_detection_info?.ai_recommended_method && 
            change_detection_info.ai_recommended_method !== formData.changeDetectionMethod) {
          setTimeout(() => {
            toast.success(
              `💡 AI suggests using "${change_detection_info.ai_recommended_method}" method for better results`,
              { duration: 8000 }
            );
          }, 1500);
        }
        
        // Show suggested field paths if available
        if (change_detection_info?.suggested_paths && change_detection_info.suggested_paths.length > 0) {
          setTimeout(() => {
            toast.success(
              `💡 Suggested monitoring paths: ${change_detection_info.suggested_paths.slice(0, 2).join(', ')}`,
              { duration: 8000 }
            );
          }, 2000);
        }
        
        // Show service insights if detected
        if (ai_insights?.detected_service) {
          setTimeout(() => {
            toast.success(
              `🔍 AI detected service: ${ai_insights.detected_service} (${ai_insights.api_type || 'API'})`,
              { duration: 6000 }
            );
          }, 2500);
        }
        
        // Show data structure summary
        if (data_structure) {
          const itemCount = data_structure.records_count || data_structure.item_count || data_structure.keys?.length;
          const serviceName = ai_insights?.detected_service || formData.serviceName || 'API';
          
          if (itemCount !== undefined) {
            setTimeout(() => {
              toast.success(
                `📊 Analysis Complete: ${serviceName} with ${itemCount} ${data_structure.records_count ? 'records' : data_structure.item_count ? 'items' : 'fields'} detected`,
                { duration: 6000 }
              );
            }, 3000);
          }
        }
        
      } else {
        // Show error with AI suggestion if available
        let errorMessage = result.error || 'Unknown error occurred';
        if (result.ai_suggestion) {
          errorMessage += ` | AI Suggestion: ${result.ai_suggestion}`;
        }
        
        toast.error(`❌ ${errorMessage}`, {
          id: 'test-connection',
          duration: 8000
        });
        console.error('API test failed:', result);
      }
      
    } catch (error) {
      toast.error(`❌ Connection error: ${error.message}`, {
        id: 'test-connection',
        duration: 6000
      });
      console.error('API test error:', error);
    }
  };

  const handleTestBackend = async () => {
    try {
      toast.loading('Testing backend connection...', { id: 'test-backend' });
      
      const response = await fetch('http://localhost:8000/api/triggers/debug/test', {
        method: 'GET'
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ Backend connected: ${result.message}`, {
          id: 'test-backend',
          duration: 3000
        });
      } else {
        toast.error(`❌ Backend error: ${response.status}`, {
          id: 'test-backend',
          duration: 3000
        });
      }
    } catch (error) {
      toast.error(`❌ Backend unreachable: ${error.message}`, {
        id: 'test-backend',
        duration: 3000
      });
    }
  };

  const handleTestTriggerOnly = async () => {
    if (!formData.apiEndpoint) {
      toast.error('Please configure the trigger first');
      return;
    }
    
    try {
      toast.loading('🔄 Testing trigger only...', { id: 'test-trigger' });
      
      // Test just the trigger configuration
      const response = await fetch('http://localhost:8000/api/triggers/debug/test-api-polling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiEndpoint: formData.apiEndpoint,
          authType: formData.authType || 'none',
          apiKey: formData.apiKey || '',
          bearerToken: formData.bearerToken || '',
          username: formData.username || '',
          password: formData.password || '',
          changeDetectionMethod: formData.changeDetectionMethod || 'array_length',
          serviceName: formData.serviceName || 'Unknown API'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(`✅ Trigger Test Passed! Connected to ${result.service_detected || formData.serviceName}`, {
            id: 'test-trigger',
            duration: 4000
          });
        } else {
          toast.error(`❌ Trigger Test Failed: ${result.error}`, {
            id: 'test-trigger',
            duration: 4000
          });
        }
      } else {
        toast.error(`❌ Trigger Test Failed: ${response.status}`, {
          id: 'test-trigger',
          duration: 4000
        });
      }
    } catch (error) {
      toast.error(`❌ Trigger Test Error: ${error.message}`, {
        id: 'test-trigger',
        duration: 4000
      });
    }
  };

  const handleTestApprovalWorkflow = async () => {
    if (!formData.apiEndpoint) {
      toast.error('Please set API endpoint first');
      return;
    }
    
    try {
      toast.loading('🔍 Testing data approval workflow...', { id: 'test-approval' });
      
      // Simulate the approval workflow
      const mockChanges = [
        {
          type: "new",
          id: "record_1",
          data: {
            "baseToken.symbol": "PEPE",
            "priceUsd": "0.00001234",
            "volume.h24": 1000000,
            "liquidity.usd": 500000
          }
        },
        {
          type: "modified",
          id: "record_2", 
          data: {
            "baseToken.symbol": "DOGE",
            "priceUsd": "0.08456",
            "volume.h24": 2000000,
            "liquidity.usd": 750000
          }
        }
      ];
      
      // Show approval interface
      const approvalMessage = `
🔍 Data Approval Required

${mockChanges.length} changes detected:
• ${mockChanges.filter(r => r.type === 'new').length} new records
• ${mockChanges.filter(r => r.type === 'modified').length} modified records

Selected Fields: ${(formData.selectedFields || ['All fields']).join(', ')}

In the real workflow:
1. ✅ You review the actual data
2. ✅ Select which records to process  
3. ✅ Agent only gets approved data
4. ✅ Future polling uses same settings

This prevents unwanted data from reaching your agent!
      `;
      
      toast.success(approvalMessage, {
        id: 'test-approval',
        duration: 10000,
        style: {
          maxWidth: '500px',
          fontSize: '12px',
          whiteSpace: 'pre-line'
        }
      });
      
    } catch (error) {
      toast.error(`Error: ${error.message}`, { id: 'test-approval' });
    }
  };

  const showWorkflowGuide = () => {
    const workflow = `
🎯 Your New Workflow:

1. 🔍 Trigger detects API changes
2. 📋 You review detected data  
3. ✅ Select what to send to agent
4. 🤖 Agent processes only approved data
5. ⚡ Future runs use same settings

Benefits:
• ✅ Full control over agent input
• ✅ No unwanted data processing  
• ✅ Universal for any API
• ✅ Clean, focused results
    `;
    
    toast.success(workflow, {
      duration: 8000,
      style: {
        maxWidth: '400px',
        fontSize: '12px',
        whiteSpace: 'pre-line'
      }
    });
  };

  return (
    <>
      {/* AI-Powered Test API Connection Button */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTestBackend}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded transition-colors"
          >
            🔧 Test Backend
          </button>
          
          <button
            type="button"
            onClick={handlePreviewData}
            className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded transition-colors"
          >
            🔍 Preview Data
          </button>
          
          <button
            type="button"
            onClick={handleAiAnalysis}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            🤖 AI-Powered API Analysis & Test
          </button>
        </div>
        
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>💡 Pro Tip:</strong> Use <strong>"Preview Data"</strong> to see exactly what your agent will receive, then craft better prompts in the Agent node!
        </div>
      </div>
      
      {/* Individual Node Testing */}
      <div className="mb-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">🧪 Individual Node Testing</h3>
          <p className="text-sm text-green-700 mb-3">
            Test each component independently before running the full workflow
          </p>
          
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTestTriggerOnly}
              className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded transition-colors"
            >
              🔄 Test Trigger Only
            </button>
            
            <button
              type="button"
              onClick={() => {
                toast('💡 To test the Agent: Go to Agent node → Use "Test Agent" button with sample data from Preview Data', {
                  duration: 6000,
                  icon: '💡'
                });
              }}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors"
            >
              🤖 Test Agent (Guide)
            </button>
            
            <button
              type="button"
              onClick={() => {
                toast('💡 To test the Task: Go to Task node → Use "Test Task" button after agent is configured', {
                  duration: 6000,
                  icon: '💡'
                });
              }}
              className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-sm rounded transition-colors"
            >
              📋 Test Task (Guide)
            </button>
            
            <button
              type="button"
              onClick={() => {
                toast('💡 Full workflow test: Use the "▶️ Run Crew" button to test the complete flow', {
                  duration: 6000,
                  icon: '💡'
                });
              }}
              className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded transition-colors"
            >
              🚀 Test Full Flow (Guide)
            </button>
          </div>
          
          <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs">
            <strong>🎯 Testing Strategy:</strong> 
            <br />1. Test Trigger → 2. Preview Data → 3. Configure Agent with real data → 4. Test Agent → 5. Test Task → 6. Run Full Flow
          </div>
        </div>
      </div>

      {/* Test Data Approval Workflow */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTestApprovalWorkflow}
            className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded transition-colors"
          >
            🧪 Test Approval Workflow
          </button>
          
          <button
            type="button"
            onClick={showWorkflowGuide}
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded transition-colors"
          >
            💡 How It Works
          </button>
        </div>
      </div>
    </>
  );
};

TestingSection.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default TestingSection; 