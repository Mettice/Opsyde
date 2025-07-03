import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MultimodalFileUpload from '../MultimodalFileUpload';
import ResultDisplayCard from '../rich-content/renderers/ResultDisplayCard';

const InputEditor = ({ formData, handleInputChange, onSave, onClose, connectedNodes = [], previousNodeOutputs = {}, nodeId }) => {
  // Only render the MultimodalFileUpload section
  const handleFileProcessed = (fileData) => {
    handleInputChange({
      target: {
        name: 'multimodal_data',
        value: fileData
      }
    });
  };

  // Test/Preview state
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);

  const handleTest = async () => {
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_data: formData, test_inputs: {} })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.result || data.output || data);
      } else {
        setTestError(data.error || 'Test failed');
      }
    } catch (err) {
      setTestError(err.message || 'Test failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <MultimodalFileUpload
        onFileProcessed={handleFileProcessed}
        acceptedTypes="image/*,audio/*,.pdf,.docx,.txt,.md,.csv,.xlsx,.json,.zip"
        maxSizeMB={25}
        multiple={false}
      />
      <div className="mt-4">
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={testLoading}
        >
          {testLoading ? 'Testing...' : 'Test/Preview'}
        </button>
        {testError && (
          <div className="mt-2 text-red-600">{testError}</div>
        )}
        {testResult && (
          <div className="mt-2">
            <ResultDisplayCard
              content={testResult}
              title="Test Result"
              colorScheme="blue"
              defaultExpanded={false}
              showMetrics={true}
              metadata={{
                nodeType: 'input',
                testType: 'preview'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

InputEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array,
  previousNodeOutputs: PropTypes.object,
  nodeId: PropTypes.string
};

export default InputEditor;