import React from 'react';
import PropTypes from 'prop-types';

const ChangeDetectionSection = ({ formData, handleInputChange }) => {
  const getMethodDescription = (method) => {
    switch (method) {
      case 'array_length':
        return {
          title: '📊 Array Length Detection (Best for Lists)',
          description: 'Monitors how many items are in an array/list. When new items are added, the count increases and triggers your workflow. Perfect for detecting new records, issues, messages, etc.',
          example: 'Example: API returns 10 items → Someone adds 1 → Now 11 items → Workflow triggers!'
        };
      case 'field_value':
        return {
          title: '🎯 Field Value Detection',
          description: 'Monitors a specific field in your data. When that field\'s value changes, it triggers your workflow. Great for status changes, counters, etc.',
          example: 'Example: Monitor "data[0].status" - triggers when the first item\'s status changes'
        };
      case 'response_hash':
        return {
          title: '🔍 Entire Response Detection',
          description: 'Monitors the entire API response. Any change anywhere in your data triggers the workflow. Most sensitive but may trigger frequently.',
          example: 'Example: Any field in any item changes → Workflow triggers'
        };
      case 'timestamp':
        return {
          title: '⏰ Timestamp Detection',
          description: 'Monitors a timestamp field to detect when data was last modified. Perfect for APIs that include "updated_at" or "modified" fields.',
          example: 'Example: Monitor "data[0].updated_at" timestamp'
        };
      default:
        return null;
    }
  };

  const currentMethod = formData.changeDetectionMethod || 'array_length';
  const methodInfo = getMethodDescription(currentMethod);

  return (
    <div className="mb-4">
      <label className="block text-gray-700 mb-1 font-medium">
        Change Detection Method
      </label>
      <select
        name="changeDetectionMethod"
        value={currentMethod}
        onChange={handleInputChange}
        className="w-full p-2 border rounded mb-2"
      >
        <option value="array_length">Monitor Array Length (Best for lists/tables)</option>
        <option value="field_value">Monitor Specific Field</option>
        <option value="response_hash">Monitor Entire Response</option>
        <option value="timestamp">Monitor Timestamp Field</option>
      </select>

      {/* Detailed explanations for each method */}
      {methodInfo && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div>
            <strong>{methodInfo.title}</strong>
            <p className="mt-1 text-blue-700">{methodInfo.description}</p>
            <p className="mt-1 text-blue-600 font-medium">{methodInfo.example}</p>
          </div>
        </div>
      )}

      {formData.changeDetectionMethod === 'field_value' && (
        <div className="mt-2">
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Field Path to Monitor
          </label>
          <input
            type="text"
            name="changeDetectionField"
            value={formData.changeDetectionField || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded text-sm"
            placeholder="e.g., data[0].status, items[0].name, response.count"
          />
          <div className="text-xs text-gray-500 mt-1">
            Use dot notation to specify the exact field path in the API response
          </div>
        </div>
      )}

      {formData.changeDetectionMethod === 'timestamp' && (
        <div className="mt-2">
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Timestamp Field Path
          </label>
          <input
            type="text"
            name="timestampField"
            value={formData.timestampField || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded text-sm"
            placeholder="e.g., data[0].updated_at, lastModified, timestamp"
          />
          <div className="text-xs text-gray-500 mt-1">
            Path to the timestamp field that indicates when data was last updated
          </div>
        </div>
      )}
    </div>
  );
};

ChangeDetectionSection.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default ChangeDetectionSection; 