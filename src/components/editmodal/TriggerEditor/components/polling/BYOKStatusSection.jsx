import React from 'react';
import PropTypes from 'prop-types';
import { ApiKeyNavigator } from '../../../../shared/ApiKeyNavigator';

const BYOKStatusSection = ({ loadingApiKeys, apiKeyError, availableApiKeys }) => {
  if (loadingApiKeys) {
    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-700 text-sm">Loading API keys...</span>
        </div>
      </div>
    );
  }

  if (apiKeyError) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-red-700 text-sm">⚠️ {apiKeyError}</span>
          <ApiKeyNavigator
            openInNewTab={true}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          >
            Manage Keys
          </ApiKeyNavigator>
        </div>
      </div>
    );
  }

  const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
  const totalKeys = availableApiKeys.length;

  if (totalKeys === 0) {
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-yellow-700 text-sm">🔑 No API keys configured for external APIs</span>
          <ApiKeyNavigator
            openInNewTab={true}
            className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
          >
            Add Keys
          </ApiKeyNavigator>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-green-700 text-sm">
          ✅ {validKeys.length}/{totalKeys} API keys ready for external services
        </span>
        <ApiKeyNavigator
          openInNewTab={true}
          className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
        >
          Manage Keys
        </ApiKeyNavigator>
      </div>
    </div>
  );
};

BYOKStatusSection.propTypes = {
  loadingApiKeys: PropTypes.bool.isRequired,
  apiKeyError: PropTypes.string,
  availableApiKeys: PropTypes.array.isRequired
};

export default BYOKStatusSection; 