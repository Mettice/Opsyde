// components/rich-content/renderers/TextRenderer.jsx
import React from 'react';
import PropTypes from 'prop-types';

const TextRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  if (!content && content !== 0 && content !== false) return null;
  
  // Handle extracted content object structure
  let textContent;
  if (typeof content === 'object' && content !== null) {
    // If it's an extracted content object with content property
    if (content.content && typeof content.content === 'string') {
      textContent = content.content;
    }
    // If it's a result object with output
    else if (content.output && typeof content.output === 'string') {
      textContent = content.output;
    }
    // If it's a result object with success and output
    else if (content.success !== undefined && content.output && typeof content.output === 'string') {
      textContent = content.output;
    }
    // Otherwise stringify as fallback
    else {
      textContent = JSON.stringify(content, null, 2);
    }
  } else if (typeof content === 'string') {
    textContent = content;
  } else {
    textContent = String(content);
  }
  
  // For minimal mode, truncate long text
  const displayContent = displayMode === 'minimal' && textContent.length > 200
    ? `${textContent.substring(0, 200)}...`
    : textContent;
  
  return (
    <div className="text-renderer space-y-2">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      <div className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
        {displayContent}
      </div>
      {displayMode === 'minimal' && textContent.length > 200 && (
        <button className="text-blue-600 text-sm hover:text-blue-700 transition-colors">
          Show more...
        </button>
      )}
    </div>
  );
};

TextRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default TextRenderer;