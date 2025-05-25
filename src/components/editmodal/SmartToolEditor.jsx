const SmartToolEditor = ({ formData, handleInputChange }) => {
    return (
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
          🤖 AI-Powered Integration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">
              Describe what you want to do:
            </label>
            <textarea
              name="ai_description"
              value={formData.ai_description || ''}
              onChange={handleInputChange}
              placeholder="e.g., 'Get new leads from HubSpot created today and send them to Slack'"
              className="w-full p-3 border border-gray-300 rounded-lg"
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Service Type (optional):</label>
            <select
              name="service_type"
              value={formData.service_type || ''}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Let AI figure it out</option>
              <option value="crm">CRM (HubSpot, Salesforce, etc.)</option>
              <option value="database">Database (PostgreSQL, MySQL, etc.)</option>
              <option value="communication">Communication (Slack, Discord, etc.)</option>
              <option value="productivity">Productivity (Notion, Google Sheets, etc.)</option>
            </select>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              💡 <strong>AI will automatically:</strong>
              <br />• Figure out the API endpoints
              <br />• Handle authentication
              <br />• Map your data correctly
              <br />• Generate the integration code
            </p>
          </div>
        </div>
      </div>
    );
  };
  