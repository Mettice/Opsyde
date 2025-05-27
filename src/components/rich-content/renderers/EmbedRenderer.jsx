import React, { useState } from 'react';
import PropTypes from 'prop-types';

const EmbedRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Extract embed information
  const getEmbedInfo = () => {
    if (typeof content === 'string') {
      // Check if it's a URL or HTML
      if (content.startsWith('http')) {
        return {
          type: 'url',
          src: content,
          html: null
        };
      } else if (content.includes('<iframe') || content.includes('<embed')) {
        return {
          type: 'html',
          src: null,
          html: content
        };
      }
    }
    
    if (content && typeof content === 'object') {
      return {
        type: content.type || 'url',
        src: content.url || content.src,
        html: content.html || content.embed,
        width: content.width,
        height: content.height
      };
    }
    
    return {
      type: 'url',
      src: content,
      html: null
    };
  };

  const embedInfo = getEmbedInfo();
  const title = metadata?.title || 'Embedded Content';

  // Security check for URLs
  const isSafeUrl = (url) => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      // Allow common safe domains
      const safeDomains = [
        'youtube.com', 'youtu.be', 'vimeo.com', 'codepen.io', 
        'jsfiddle.net', 'codesandbox.io', 'github.com',
        'docs.google.com', 'drive.google.com'
      ];
      return safeDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  };

  // Handle iframe load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  // Handle iframe error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  if (displayMode === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>🌐</span>
        <span>{title}</span>
        <span className="text-xs">Embedded</span>
      </div>
    );
  }

  // Security warning for unsafe URLs
  if (embedInfo.type === 'url' && !isSafeUrl(embedInfo.src)) {
    return (
      <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
        <div className="flex items-center gap-2 text-yellow-800 mb-2">
          <span>⚠️</span>
          <span className="font-medium">External Content</span>
        </div>
        <div className="text-sm text-yellow-700 mb-3">
          This content is from an external source. Click to view in a new tab for security.
        </div>
        <a
          href={embedInfo.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
        >
          <span>🔗</span>
          Open External Link
        </a>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="p-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🌐</span>
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          {embedInfo.src && (
            <a
              href={embedInfo.src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Open in new tab ↗
            </a>
          )}
        </div>
      </div>

      {/* Embed content */}
      <div className="relative">
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}

        {hasError && (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">❌</div>
            <div className="text-sm text-red-600">Failed to load embedded content</div>
          </div>
        )}

        {embedInfo.type === 'html' && embedInfo.html ? (
          <div 
            className="w-full"
            dangerouslySetInnerHTML={{ __html: embedInfo.html }}
          />
        ) : embedInfo.src ? (
          <iframe
            src={embedInfo.src}
            width={embedInfo.width || '100%'}
            height={embedInfo.height || '400'}
            frameBorder="0"
            allowFullScreen
            onLoad={handleLoad}
            onError={handleError}
            className="w-full"
            title={title}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No valid embed content provided
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      {metadata?.description && (
        <div className="p-3 bg-white border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {metadata.description}
          </div>
        </div>
      )}
    </div>
  );
};

EmbedRenderer.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default EmbedRenderer; 