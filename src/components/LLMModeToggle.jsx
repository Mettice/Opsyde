import React from "react";
import { Switch } from "@headlessui/react";
import { BoltIcon, CpuChipIcon, ChartBarIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useLLMMode } from "../contexts/LLMContext";

const LLMModeToggle = ({ className = "" }) => {
  const {
    llmModeEnabled,
    smartMappingEnabled,
    status,
    loading,
    error,
    toggleLLMMode,
    toggleSmartMapping,
    testLLMMode
  } = useLLMMode();

  const handleTestLLMMode = async () => {
    try {
      const data = await testLLMMode();
      alert(`LLM Mode Test ${data.success ? 'Passed' : 'Failed'}\n\nResult: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      console.error('Error testing LLM mode:', err);
    }
  };

  const getStatusColor = () => {
    if (llmModeEnabled) return 'text-blue-600';
    if (smartMappingEnabled) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (llmModeEnabled) return <BoltIcon className="w-5 h-5" />;
    if (smartMappingEnabled) return <CpuChipIcon className="w-5 h-5" />;
    return <ChartBarIcon className="w-5 h-5" />;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h3 className="text-lg font-medium text-gray-900">Processing Mode</h3>
        </div>
        
        {error && (
          <div className="flex items-center space-x-1 text-red-600">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Current Status */}
      {status && (
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()} bg-gray-50`}>
            {status.current_status}
          </div>
        </div>
      )}

      {/* LLM Mode Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              🤖 LLM-Centric Mode
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Route all processing through LLM for intelligent reasoning and transformation
            </p>
          </div>
          
          <Switch
            checked={llmModeEnabled}
            onChange={toggleLLMMode}
            disabled={loading}
            className={`${
              llmModeEnabled ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading ? 'opacity-50' : ''
            }`}
          >
            <span
              className={`${
                llmModeEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>

        {/* Smart Mapping Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              🧠 Smart Input Mapping
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically map inputs between nodes intelligently
            </p>
          </div>
          
          <Switch
            checked={smartMappingEnabled}
            onChange={toggleSmartMapping}
            disabled={loading}
            className={`${
              smartMappingEnabled ? 'bg-green-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              loading ? 'opacity-50' : ''
            }`}
          >
            <span
              className={`${
                smartMappingEnabled ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>
      </div>

      {/* Test Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleTestLLMMode}
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Testing...' : 'Test Current Mode'}
        </button>
      </div>

      {/* Statistics */}
      {status && status.statistics && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Success Rate:</span>
              <span className="ml-2 font-medium">{status.statistics.success_rate}%</span>
            </div>
            <div>
              <span className="text-gray-500">Avg. Time:</span>
              <span className="ml-2 font-medium">{status.statistics.average_execution_time}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Available Providers */}
      {status && status.available_providers && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Providers</h4>
          <div className="flex flex-wrap gap-2">
            {status.available_providers.map((provider) => (
              <span
                key={provider}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {provider}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMModeToggle; 