// components/rich-content/renderers/ErrorRenderer.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const ErrorRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [showStackTrace, setShowStackTrace] = useState(false);
  const [showRawError, setShowRawError] = useState(false);

  if (!content) return null;

  // Parse error content
  const parseError = (errorContent) => {
    if (typeof errorContent === 'string') {
      return {
        message: errorContent,
        type: 'Error',
        stack: null,
        code: null
      };
    }

    if (typeof errorContent === 'object' && errorContent !== null) {
      return {
        message: errorContent.message || errorContent.error || 'Unknown error',
        type: errorContent.name || errorContent.type || 'Error',
        stack: errorContent.stack || errorContent.stackTrace,
        code: errorContent.code || errorContent.errorCode,
        details: errorContent.details,
        timestamp: errorContent.timestamp,
        source: errorContent.source || errorContent.origin
      };
    }

    return {
      message: String(errorContent),
      type: 'Error',
      stack: null,
      code: null
    };
  };

  const errorData = parseError(content);

  // Determine error severity
  const getSeverity = () => {
    const message = errorData.message.toLowerCase();
    const type = errorData.type.toLowerCase();

    if (type.includes('critical') || message.includes('critical') || 
        type.includes('fatal') || message.includes('fatal')) {
      return 'critical';
    }
    
    if (type.includes('warning') || message.includes('warning')) {
      return 'warning';
    }
    
    return 'error';
  };

  const severity = getSeverity();

  // Get styling based on severity
  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-red-100 border-red-300',
          icon: '🔥',
          iconBg: 'bg-red-500',
          title: 'text-red-900',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          container: 'bg-yellow-100 border-yellow-300',
          icon: '⚠️',
          iconBg: 'bg-yellow-500',
          title: 'text-yellow-900',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          container: 'bg-red-50 border-red-200',
          icon: '❌',
          iconBg: 'bg-red-500',
          title: 'text-red-900',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        };
    }
  };

  const styles = getSeverityStyles();

  // Copy error details to clipboard
  const copyError = async () => {
    const errorInfo = [
      `Error Type: ${errorData.type}`,
      `Message: ${errorData.message}`,
      errorData.code && `Code: ${errorData.code}`,
      errorData.source && `Source: ${errorData.source}`,
      errorData.timestamp && `Timestamp: ${new Date(errorData.timestamp).toISOString()}`,
      errorData.stack && `\nStack Trace:\n${errorData.stack}`
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(errorInfo);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className={`error-container rounded-lg border p-4 ${styles.container}`}>
      <div className="flex items-start space-x-4">
        {/* Error icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
          <span className="text-white text-lg">{styles.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Error header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className={`font-semibold ${styles.title}`}>
                {metadata?.title || errorData.type}
              </h3>
              {errorData.code && (
                <div className={`text-sm ${styles.text} opacity-75`}>
                  Error Code: {errorData.code}
                </div>
              )}
            </div>
            
            {displayMode !== 'minimal' && (
              <button
                onClick={copyError}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy error details"
              >
                📋
              </button>
            )}
          </div>

          {/* Error message */}
          <div className={`${styles.text} mb-3 leading-relaxed`}>
            {errorData.message}
          </div>

          {/* Error metadata */}
          {(errorData.source || errorData.timestamp) && (
            <div className="flex flex-wrap gap-4 text-sm opacity-75 mb-3">
              {errorData.source && (
                <div className={styles.text}>
                  <strong>Source:</strong> {errorData.source}
                </div>
              )}
              {errorData.timestamp && (
                <div className={styles.text}>
                  <strong>Time:</strong> {new Date(errorData.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Error details */}
          {errorData.details && displayMode !== 'minimal' && (
            <div className="mb-3 p-3 bg-white/60 rounded border">
              <h4 className={`font-medium ${styles.title} mb-2`}>Details:</h4>
              <div className={`text-sm ${styles.text}`}>
                {typeof errorData.details === 'object' 
                  ? JSON.stringify(errorData.details, null, 2)
                  : errorData.details
                }
              </div>
            </div>
          )}

          {/* Action buttons */}
          {displayMode !== 'minimal' && (
            <div className="flex flex-wrap gap-2">
              {errorData.stack && (
                <button
                  onClick={() => setShowStackTrace(!showStackTrace)}
                  className={`px-3 py-1 text-sm text-white rounded transition-colors ${styles.button}`}
                >
                  {showStackTrace ? 'Hide' : 'Show'} Stack Trace
                </button>
              )}
              
              <button
                onClick={() => setShowRawError(!showRawError)}
                className={`px-3 py-1 text-sm text-white rounded transition-colors ${styles.button}`}
              >
                {showRawError ? 'Hide' : 'Show'} Raw Error
              </button>
              
              <button
                onClick={copyError}
                className={`px-3 py-1 text-sm text-white rounded transition-colors ${styles.button}`}
              >
                Copy Details
              </button>
            </div>
          )}

          {/* Stack trace */}
          {showStackTrace && errorData.stack && (
            <div className="mt-4 p-3 bg-gray-900 text-gray-100 rounded font-mono text-xs overflow-auto max-h-64">
              <div className="font-semibold text-gray-300 mb-2">Stack Trace:</div>
              <pre className="whitespace-pre-wrap">{errorData.stack}</pre>
            </div>
          )}

          {/* Raw error data */}
          {showRawError && (
            <div className="mt-4 p-3 bg-gray-100 rounded font-mono text-xs overflow-auto max-h-64">
              <div className="font-semibold text-gray-700 mb-2">Raw Error Data:</div>
              <pre className="whitespace-pre-wrap text-gray-600">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Quick fixes or suggestions */}
      {displayMode === 'immersive' && (
        <div className="mt-4 p-3 bg-white/60 rounded border">
          <h4 className={`font-medium ${styles.title} mb-2`}>Troubleshooting Tips:</h4>
          <ul className={`text-sm ${styles.text} space-y-1`}>
            <li>• Check the input data format and structure</li>
            <li>• Verify all required fields are present</li>
            <li>• Review recent changes that might have caused this error</li>
            <li>• Check network connectivity if this involves external services</li>
            <li>• Look for similar errors in the execution logs</li>
          </ul>
        </div>
      )}
    </div>
  );
};

ErrorRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default ErrorRenderer;