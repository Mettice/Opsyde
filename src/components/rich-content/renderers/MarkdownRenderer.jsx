// components/rich-content/renderers/MarkdownRenderer.jsx
import React from 'react';
import PropTypes from 'prop-types';

const MarkdownRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  if (!content && content !== 0 && content !== false) return null;
  
  // Handle extracted content object structure
  let markdownContent;
  if (typeof content === 'object' && content !== null) {
    // If it's an extracted content object with content property
    if (content.content && typeof content.content === 'string') {
      markdownContent = content.content;
    }
    // If it's a result object with output
    else if (content.output && typeof content.output === 'string') {
      markdownContent = content.output;
    }
    // If it's a result object with success and output
    else if (content.success !== undefined && content.output && typeof content.output === 'string') {
      markdownContent = content.output;
    }
    // Otherwise stringify as fallback
    else {
      markdownContent = JSON.stringify(content, null, 2);
    }
  } else if (typeof content === 'string') {
    markdownContent = content;
  } else {
    markdownContent = String(content);
  }
  
  // Simple markdown parsing - can be enhanced with a library like react-markdown
  const parseMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-3 mt-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2 mt-3">$1</h2>')  
      .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium mb-2 mt-2">$1</h3>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/^(?!<[h|l])/gm, '<p class="mb-2">')
      .replace(/(?<!>)$/gm, '</p>');
  };

  const processedContent = displayMode === 'minimal' && markdownContent.length > 300
    ? `${markdownContent.substring(0, 300)}...`
    : markdownContent;

  return (
    <div className="markdown-renderer space-y-3">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      <div 
        className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:space-y-1 prose-ol:space-y-1"
        dangerouslySetInnerHTML={{ 
          __html: parseMarkdown(processedContent)
        }}
      />
      {displayMode === 'minimal' && markdownContent.length > 300 && (
        <button className="text-blue-600 text-sm hover:text-blue-700 transition-colors">
          Show more...
        </button>
      )}
    </div>
  );
};

MarkdownRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default MarkdownRenderer;