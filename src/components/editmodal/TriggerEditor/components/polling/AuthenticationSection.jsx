import React from 'react';
import PropTypes from 'prop-types';

const AuthenticationSection = ({ formData, handleInputChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 mb-1 font-medium">
        Authentication (Optional)
      </label>
      <select
        name="authType"
        value={formData.authType || 'none'}
        onChange={handleInputChange}
        className="w-full p-2 border rounded mb-2"
      >
        <option value="none">No Authentication</option>
        <option value="api_key">API Key</option>
        <option value="bearer_token">Bearer Token</option>
        <option value="basic_auth">Basic Auth</option>
      </select>

      {formData.authType === 'api_key' && (
        <input
          type="password"
          name="apiKey"
          value={formData.apiKey || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="Your API key"
        />
      )}

      {formData.authType === 'bearer_token' && (
        <input
          type="password"
          name="bearerToken"
          value={formData.bearerToken || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          placeholder="Your bearer token"
        />
      )}

      {formData.authType === 'basic_auth' && (
        <div className="space-y-2">
          <input
            type="text"
            name="username"
            value={formData.username || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="Username"
          />
          <input
            type="password"
            name="password"
            value={formData.password || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="Password"
          />
        </div>
      )}
    </div>
  );
};

AuthenticationSection.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired
};

export default AuthenticationSection; 