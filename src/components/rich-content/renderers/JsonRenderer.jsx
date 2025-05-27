// components/rich-content/renderers/JsonRenderer.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const JsonRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [isExpanded, setIsExpanded] = useState(displayMode === 'immersive');
  const [copiedPath, setCopiedPath] = useState(null);

  // Safely parse JSON content
  const parseJsonContent = (content) => {
    try {
      if (typeof content === 'string') {
        return JSON.parse(content);
      }
      return content;
    } catch (error) {
      return content; // Return as-is if parsing fails
    }
  };

  const jsonData = parseJsonContent(content);

  // Copy value to clipboard
  const copyToClipboard = async (value, path) => {
    try {
      const textValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      await navigator.clipboard.writeText(textValue);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Render JSON value with appropriate styling
  const renderJsonValue = (value, key = null, path = '', depth = 0) => {
    const currentPath = path ? `${path}.${key}` : key || '';
    
    if (value === null) {
      return (
        <span className="json-null" title="null value">
          null
        </span>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className="json-boolean" title={`Boolean: ${value}`}>
          {value.toString()}
        </span>
      );
    }

    if (typeof value === 'number') {
      return (
        <span className="json-number" title={`Number: ${value}`}>
          {value}
        </span>
      );
    }

    if (typeof value === 'string') {
      const isUrl = value.startsWith('http://') || value.startsWith('https://');
      const isEmail = value.includes('@') && value.includes('.');
      
      return (
        <span className="json-string group relative">
          <span className="text-green-600">"{value}"</span>
          {(isUrl || isEmail) && (
            <button
              onClick={() => isUrl ? window.open(value, '_blank') : window.location.href = `mailto:${value}`}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title={isUrl ? 'Open link' : 'Send email'}
            >
              {isUrl ? '🔗' : '📧'}
            </button>
          )}
          <button
            onClick={() => copyToClipboard(value, currentPath)}
            className="ml-1 text-gray-400 hover:text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy value"
          >
            {copiedPath === currentPath ? '✅' : '📋'}
          </button>
        </span>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>;
      }

      return (
        <div className="json-array">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            [{isExpanded ? '−' : '+'} {value.length} items]
          </button>
          {isExpanded && (
            <div className="ml-4 mt-2 space-y-1">
              {value.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 font-mono text-sm min-w-[2rem]">
                    {index}:
                  </span>
                  <div className="flex-1">
                    {renderJsonValue(item, index, currentPath, depth + 1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      
      if (keys.length === 0) {
        return <span className="text-gray-500">{'{}'}</span>;
      }

      return (
        <div className="json-object">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            {'{'}
            {isExpanded ? '−' : '+'} {keys.length} keys{'}'}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-2 space-y-2">
              {keys.map((objKey) => (
                <div key={objKey} className="flex items-start gap-2 group">
                  <span className="json-key font-semibold text-purple-600 min-w-fit">
                    "{objKey}":
                  </span>
                  <div className="flex-1">
                    {renderJsonValue(value[objKey], objKey, currentPath, depth + 1)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(value[objKey], `${currentPath}.${objKey}`)}
                    className="text-gray-400 hover:text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy value"
                  >
                    {copiedPath === `${currentPath}.${objKey}` ? '✅' : '📋'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-600">{String(value)}</span>;
  };

  // Minimal display mode
  if (displayMode === 'minimal') {
    const preview = typeof jsonData === 'object' && jsonData !== null
      ? `{${Object.keys(jsonData).length} keys}`
      : typeof jsonData === 'string'
      ? jsonData.length > 50 ? `${jsonData.substring(0, 50)}...` : jsonData
      : String(jsonData);

    return (
      <div className="json-minimal p-2 bg-gray-50 rounded border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">JSON</span>
          <span className="font-mono text-sm text-gray-700">{preview}</span>
        </div>
      </div>
    );
  }

  // Full immersive display
  return (
    <div className="json-renderer">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗂️</span>
          <span className="font-semibold text-gray-700">JSON Data</span>
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
            {typeof jsonData === 'object' && jsonData !== null
              ? Array.isArray(jsonData)
                ? `Array (${jsonData.length} items)`
                : `Object (${Object.keys(jsonData).length} keys)`
              : typeof jsonData
            }
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(jsonData, 'root')}
            className="text-sm bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 px-3 py-1 rounded border transition-colors"
            title="Copy entire JSON"
          >
            {copiedPath === 'root' ? '✅ Copied' : '📋 Copy All'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 px-3 py-1 rounded border transition-colors"
          >
            {isExpanded ? '📁 Collapse' : '📂 Expand'}
          </button>
        </div>
      </div>

      {/* JSON Content */}
      <div className="json-content bg-white border rounded-lg p-4 font-mono text-sm overflow-x-auto">
        {renderJsonValue(jsonData)}
      </div>

      {/* Footer with metadata */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Metadata:</strong> {Object.keys(metadata).join(', ')}
        </div>
      )}
    </div>
  );
};

JsonRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive'])
};

export default JsonRenderer;