import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { FRAMEWORK_OPTIONS } from '../EditModall';

const AgentEditor = ({ formData, handleInputChange, handleFrameworkChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Role
          <HelpTooltip type="agent" field="role" />
        </label>
        <input
          type="text"
          name="role"
          value={formData.role || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="e.g., Senior Software Engineer"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Goal
          <HelpTooltip type="agent" field="goal" />
        </label>
        <textarea
          name="goal"
          value={formData.goal || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="What is this agent's primary objective?"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Backstory
          <HelpTooltip type="agent" field="backstory" />
        </label>
        <textarea
          name="backstory"
          value={formData.backstory || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="Background and context for this agent"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Framework</label>
        <select
          name="framework"
          value={formData.framework || ''}
          onChange={handleFrameworkChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Select a framework</option>
          {FRAMEWORK_OPTIONS.AGENT.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {formData.framework && renderFrameworkConfig(formData, handleInputChange)}

      <div className="mt-4 space-y-4">
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
    </>
  );
};

// Helper function to render framework-specific configuration
const renderFrameworkConfig = (formData, handleInputChange) => {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-md">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Framework Configuration</h4>
      
      {formData.framework === 'webhook' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
          <input
            type="text"
            name="frameworkConfig.url"
            value={formData.frameworkConfig?.url || ''}
            onChange={handleInputChange}
            placeholder="Enter webhook URL"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      ) : formData.framework === 'openai' ? (
        <div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Model</label>
            <select
              name="frameworkConfig.model"
              value={formData.frameworkConfig?.model || 'gpt-4'}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature</label>
              <input
                type="number"
                name="frameworkConfig.temperature"
                value={formData.frameworkConfig?.temperature || 0.7}
                onChange={handleInputChange}
                min="0"
                max="2"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
              <input
                type="number"
                name="frameworkConfig.max_tokens"
                value={formData.frameworkConfig?.max_tokens || 2000}
                onChange={handleInputChange}
                min="1"
                max="32000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      ) : formData.framework === 'anthropic' ? (
        <div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Model</label>
            <select
              name="frameworkConfig.model"
              value={formData.frameworkConfig?.model || 'claude-3-opus'}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature</label>
              <input
                type="number"
                name="frameworkConfig.temperature"
                value={formData.frameworkConfig?.temperature || 0.7}
                onChange={handleInputChange}
                min="0"
                max="1"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
              <input
                type="number"
                name="frameworkConfig.max_tokens"
                value={formData.frameworkConfig?.max_tokens || 4000}
                onChange={handleInputChange}
                min="1"
                max="4096"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Model</label>
            <input
              type="text"
              name="frameworkConfig.model"
              value={formData.frameworkConfig?.model || ''}
              onChange={handleInputChange}
              placeholder="Enter model name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature</label>
              <input
                type="number"
                name="frameworkConfig.temperature"
                value={formData.frameworkConfig?.temperature || 0.7}
                onChange={handleInputChange}
                min="0"
                max="1"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
              <input
                type="number"
                name="frameworkConfig.max_tokens"
                value={formData.frameworkConfig?.max_tokens || 2000}
                onChange={handleInputChange}
                min="1"
                max="32000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

AgentEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired
};

export default AgentEditor;