import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const LogicEditor = ({ 
  formData, 
  handleInputChange, 
  testInput, 
  setTestInput, 
  testResult, 
  setTestResult, 
  savedTestInputs, 
  saveTestInput 
}) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="logic" field="description" />
        </label>
        <input
          type="text"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="Evaluates a condition and routes flow"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Condition
          <HelpTooltip type="logic" field="condition" />
          <span 
            className="ml-1 text-gray-500 cursor-help text-xs"
            title="Use inputs.*, context.*, or env.* in conditions. You can write Python-like logic using and, or, not."
          >
            ❓
          </span>
        </label>
        <textarea
          name="condition"
          value={formData.condition || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded font-mono"
          placeholder="inputs.value > 10"
          rows={3}
        />
        <div className="text-xs text-gray-500 mt-1">
          Use Python-like syntax. Available variables: inputs, context, env
        </div>
      </div>
      
      <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
        <h4 className="font-medium text-yellow-800 mb-2">Condition Examples:</h4>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li><code className="bg-yellow-100 px-1 rounded">inputs.temperature {'>'} 70</code> - Check if temperature exceeds 70</li>
          <li><code className="bg-yellow-100 px-1 rounded">inputs.status == "approved"</code> - Check if status is "approved"</li>
          <li><code className="bg-yellow-100 px-1 rounded">"error" in inputs.message</code> - Check if message contains "error"</li>
          <li><code className="bg-yellow-100 px-1 rounded">len(inputs.items) {'>'} 0</code> - Check if items list is not empty</li>
          <li><code className="bg-yellow-100 px-1 rounded">inputs.score {'>'} 80 and inputs.status == "approved"</code> - Score AND status check</li>
          <li><code className="bg-yellow-100 px-1 rounded">inputs.country == "France" or inputs.score {'>'} 90</code> - Either country or high score</li>
          <li><code className="bg-yellow-100 px-1 rounded">not inputs.flagged</code> - Flag must be false or missing</li>
        </ul>
      </div>

      {/* Condition testing section */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold mb-2">Test Your Condition</h3>
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">
            Test Input (JSON)
          </label>
          <textarea
            value={testInput || ''}
            onChange={(e) => setTestInput(e.target.value)}
            className="w-full p-2 border rounded font-mono text-sm"
            rows={5}
            placeholder='{"value": 15, "status": "approved"}'
          />
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold">Saved Inputs</h3>
          
          <div className="flex items-center space-x-2">
            <select
              className="text-sm border rounded p-1"
              onChange={(e) => {
                if (e.target.value) {
                  const selected = savedTestInputs.find(item => item.name === e.target.value);
                  if (selected) {
                    setTestInput(selected.input);
                  }
                }
              }}
              value=""
            >
              <option value="">Load saved input</option>
              {savedTestInputs.map((item, index) => (
                <option key={index} value={item.name}>{item.name}</option>
              ))}
            </select>
            
            <button
              type="button"
              onClick={saveTestInput}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
            >
              Save Input
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              try {
                const inputs = JSON.parse(testInput);
                // Simple evaluation using Function constructor
                const result = new Function('inputs', `return ${formData.condition}`)(inputs);
                setTestResult({
                  success: true,
                  result: result,
                  path: result ? 'true' : 'false'
                });
              } catch (error) {
                setTestResult({
                  success: false,
                  error: error.message
                });
              }
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Run Test
          </button>
          
          {testResult && (
            <div className={`ml-4 p-2 rounded ${
              testResult.success 
                ? testResult.result 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {testResult.success 
                ? <>
                    Result: <span className="font-bold">{testResult.result ? 'TRUE' : 'FALSE'}</span>
                    <div className="text-xs mt-1">
                      Flow will follow the <span className="font-semibold">{testResult.path}</span> path
                    </div>
                  </>
                : <>Error: {testResult.error}</>
              }
            </div>
          )}
        </div>
      </div>
    </>
  );
};

LogicEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  testInput: PropTypes.string,
  setTestInput: PropTypes.func.isRequired,
  testResult: PropTypes.object,
  setTestResult: PropTypes.func.isRequired,
  savedTestInputs: PropTypes.array.isRequired,
  saveTestInput: PropTypes.func.isRequired
};

export default LogicEditor;