// frontend/src/components/editmodal/AgentEditor.jsx - REPLACE your existing
import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { FRAMEWORK_OPTIONS } from '../EditModall';
import LLMConfigSection from './shared/LLMConfigSection';

const AgentEditor = ({ formData, handleInputChange, handleFrameworkChange }) => {
  return (
    <>
      {/* Basic Agent Configuration */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Role *
          <HelpTooltip type="agent" field="role" />
        </label>
        <input
          type="text"
          name="role"
          value={formData.role || ''}
          onChange={handleInputChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Senior Software Engineer, Research Analyst, Content Creator"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Goal *
          <HelpTooltip type="agent" field="goal" />
        </label>
        <textarea
          name="goal"
          value={formData.goal || ''}
          onChange={handleInputChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="3"
          placeholder="What is this agent's primary objective? Be specific about what you want them to accomplish."
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Backstory *
          <HelpTooltip type="agent" field="backstory" />
        </label>
        <textarea
          name="backstory"
          value={formData.backstory || ''}
          onChange={handleInputChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="3"
          placeholder="Background and context for this agent. This helps shape their personality and approach."
          required
        />
      </div>

      {/* Framework Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Framework *
          <HelpTooltip type="agent" field="framework" />
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {FRAMEWORK_OPTIONS.AGENT.map(option => (
            <label 
              key={option.value} 
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                formData.framework === option.value 
                  ? 'border-blue-300 bg-blue-50 shadow-sm' 
                  : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="framework"
                value={option.value}
                checked={formData.framework === option.value}
                onChange={handleFrameworkChange}
                className="mr-3"
                required
              />
              <div className="text-sm font-medium text-gray-800">
                {option.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* LLM Configuration */}
      {formData.framework && formData.framework !== 'webhook' && (
        <LLMConfigSection
          formData={formData}
          handleInputChange={handleInputChange}
          framework={formData.framework}
          showApiKey={true}
          isInherited={false}
        />
      )}

      {/* Webhook Configuration */}
      {formData.framework === 'webhook' && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800 mb-3">🔗 Webhook Configuration</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL *</label>
            <input
              type="url"
              name="frameworkConfig.url"
              value={formData.frameworkConfig?.url || ''}
              onChange={handleInputChange}
              placeholder="https://your-webhook-endpoint.com"
              className="w-full p-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              required
            />
            <div className="text-xs text-yellow-700 mt-1">
              The webhook will receive agent requests and should return responses
            </div>
          </div>
        </div>
      )}

      {/* Agent Behavior Settings */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-4">🎛️ Agent Behavior</h4>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowDelegation"
              name="allowDelegation"
              checked={formData.allowDelegation || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowDelegation" className="ml-2 block text-sm text-gray-700">
              Allow Delegation
              <HelpTooltip type="agent" field="allowDelegation" />
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableMemory"
              name="enableMemory"
              checked={formData.enableMemory || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableMemory" className="ml-2 block text-sm text-gray-700">
              Enable Memory
              <HelpTooltip type="agent" field="enableMemory" />
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="verbose"
              name="verbose"
              checked={formData.verbose || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="verbose" className="ml-2 block text-sm text-gray-700">
              Verbose Mode
              <HelpTooltip type="agent" field="verbose" />
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

AgentEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired
};

export default AgentEditor;