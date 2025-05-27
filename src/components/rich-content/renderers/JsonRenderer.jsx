// components/rich-content/renderers/JsonRenderer.jsx
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { safeStringify } from '../utils/safeStringify';

const JsonRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [isExpanded, setIsExpanded] = useState(displayMode !== 'minimal');
  
  if (!content) return null;
  
  const processedContent = useMemo(() => {
    try {
      // Handle extracted content object structure
      const jsonContent = typeof content === 'object' && content.content 
        ? (typeof content.content === 'string' ? JSON.parse(content.content) : content.content)
        : typeof content === 'string' 
          ? JSON.parse(content) 
          : content;
      
      return {
        success: true,
        data: jsonContent,
        formatted: safeStringify(jsonContent, 2)
      };
    } catch (error) {
      // Handle extracted content object structure for error case
      const fallbackContent = typeof content === 'object' && content.content 
        ? content.content 
        : content;
        
      return {
        success: false,
        error: error.message,
        raw: String(fallbackContent)
      };
    }
  }, [content]);

  if (!processedContent.success) {
    return (
      <div className="json-renderer space-y-2">
        {metadata?.title && (
          <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
        )}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-red-500 mr-2">⚠️</span>
            <p className="text-red-700 text-sm font-medium">Invalid JSON content</p>
          </div>
          <pre className="text-sm text-red-600 whitespace-pre-wrap break-words bg-red-100 p-2 rounded">
            {processedContent.raw}
          </pre>
        </div>
      </div>
    );
  }

  const displayContent = displayMode === 'minimal' && !isExpanded
    ? processedContent.formatted.length > 500 
      ? `${processedContent.formatted.substring(0, 500)}...`
      : processedContent.formatted
    : processedContent.formatted;

  return (
    <div className="json-renderer space-y-2">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        {/* Header with copy button */}
        <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">JSON Data</span>
          <div className="flex items-center space-x-2">
            {displayMode === 'minimal' && processedContent.formatted.length > 500 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
            <button
              onClick={() => navigator.clipboard?.writeText(processedContent.formatted)}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
        
        {/* JSON Content */}
        <div className="p-4 overflow-auto max-h-96">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-mono">
            {displayContent}
          </pre>
        </div>
      </div>
    </div>
  );
};

JsonRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default JsonRenderer;