// components/rich-content/RichContentRenderer.jsx
import React, { useState, useMemo, Suspense } from 'react';
import PropTypes from 'prop-types';

// Import content detection utilities
import { detectContentType, CONTENT_TYPES } from './content-detection/ContentDetector';
import { extractDisplayContent, classifyContent } from './content-detection/ContentExtractor';

// Import renderers
import { getRenderer } from './renderers';

// Import features
import AIInsights from './features/AIInsights';
import PlatformSharing from './features/PlatformSharing';
import ExportOptions from './features/ExportOptions';

// Custom CSS for scrollbars and layout
const customStyles = `
  .rich-content-renderer {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
  }
  
  .rich-content-renderer::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .rich-content-renderer::-webkit-scrollbar-track {
    background: #f7fafc;
    border-radius: 3px;
  }
  
  .rich-content-renderer::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
  }
  
  .rich-content-renderer::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  if (!document.head.querySelector('style[data-rich-content-renderer]')) {
    styleElement.setAttribute('data-rich-content-renderer', 'true');
    document.head.appendChild(styleElement);
  }
}

/**
 * Main RichContentRenderer component
 * Orchestrates content detection, extraction, and rendering
 */
const RichContentRenderer = ({
  content,
  maxHeight = '400px',
  className = '',
  metadata = {},
  displayMode = 'immersive',
  onAction,
  // Feature flags
  showAIInsights = true,
  showPlatformSharing = false,
  showExportOptions = false,
  // Platform sharing config
  platforms = [],
  // Export config
  exportFormats = []
}) => {
  const [error, setError] = useState(null);

  // Memoize content processing for performance
  const processedContent = useMemo(() => {
    try {
      const extracted = extractDisplayContent(content);
      const contentType = detectContentType(extracted);
      const classification = classifyContent(content, metadata);
      
      return {
        extracted,
        contentType,
        classification,
        isResult: classification === 'result'
      };
    } catch (err) {
      console.error('Error processing content:', err);
      setError(err.message);
      return {
        extracted: { type: CONTENT_TYPES.ERROR, content: `Processing error: ${err.message}` },
        contentType: CONTENT_TYPES.ERROR,
        classification: 'system',
        isResult: false
      };
    }
  }, [content, metadata]);

  // Container styling based on display mode
  const containerClasses = useMemo(() => {
    const baseClasses = 'rich-content-renderer';
    const modeClasses = {
      minimal: 'text-sm',
      immersive: 'text-base',
      post: 'text-base border-l-4 border-blue-400 pl-4'
    };
    
    return `${baseClasses} ${modeClasses[displayMode]} ${className}`;
  }, [displayMode, className]);

  const containerStyle = useMemo(() => ({
    maxHeight: displayMode === 'minimal' ? '200px' : maxHeight,
    overflowY: 'auto',
    overflowX: 'hidden',
    wordBreak: 'break-word',
    lineHeight: '1.6'
  }), [maxHeight, displayMode]);

  // Loading fallback for lazy-loaded components
  const LoadingFallback = ({ contentType }) => (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-600 text-sm">Loading {contentType} renderer...</span>
      </div>
    </div>
  );

  // Render the appropriate content renderer
  const renderContent = () => {
    const { extracted, contentType } = processedContent;
    
    // For minimal mode, simplify certain content types
    if (displayMode === 'minimal') {
      const simplifiedTypes = {
        [CONTENT_TYPES.CHART]: { icon: '📊', label: 'Chart data available' },
        [CONTENT_TYPES.IMAGE]: { icon: '🖼️', label: 'Image content' },
        [CONTENT_TYPES.AUDIO]: { icon: '🎧', label: 'Audio content' },
        [CONTENT_TYPES.VIDEO]: { icon: '🎬', label: 'Video content' },
        [CONTENT_TYPES.EMBED]: { icon: '🌐', label: 'Embedded content' },
        [CONTENT_TYPES.TABLE]: { icon: '📋', label: 'Table data' },
        [CONTENT_TYPES.FILE]: { icon: '📄', label: 'File content' }
      };

      if (simplifiedTypes[contentType]) {
        const { icon, label } = simplifiedTypes[contentType];
        return (
          <div className="text-sm text-gray-600 p-2 bg-blue-50 rounded flex items-center">
            <span className="mr-2">{icon}</span>
            {label}
          </div>
        );
      }
    }

    // Get the appropriate renderer
    const RendererComponent = getRenderer(contentType);
    
    // Render with Suspense for lazy-loaded components
    return (
      <Suspense fallback={<LoadingFallback contentType={contentType} />}>
        <RendererComponent 
          content={extracted.content || extracted}
          metadata={metadata}
          displayMode={displayMode}
          onAction={onAction}
        />
      </Suspense>
    );
  };

  // Determine if content is suitable for sharing/export
  const isShareable = processedContent.isResult && [
    CONTENT_TYPES.TABLE,
    CONTENT_TYPES.CHART,
    CONTENT_TYPES.IMAGE,
    CONTENT_TYPES.TEXT,
    CONTENT_TYPES.MARKDOWN,
    CONTENT_TYPES.JSON
  ].includes(processedContent.contentType);

  return (
    <div className={containerClasses} style={containerStyle}>
      {/* Display mode indicator for post mode */}
      {displayMode === 'post' && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200">
          <span className="text-lg">📤</span>
          <span className="text-sm font-medium text-blue-700">Ready to Share</span>
        </div>
      )}

      {/* Main content */}
      {renderContent()}

      {/* AI insights for meaningful results in immersive mode */}
      {displayMode === 'immersive' && showAIInsights && processedContent.isResult && (
        <AIInsights 
          content={content} 
          contentType={processedContent.contentType}
          metadata={metadata}
        />
      )}

      {/* Platform sharing for shareable content */}
      {(displayMode === 'immersive' || displayMode === 'post') && 
       showPlatformSharing && 
       isShareable && 
       platforms.length > 0 && (
        <PlatformSharing 
          content={content}
          metadata={metadata}
          platforms={platforms}
        />
      )}

      {/* Export options for meaningful content */}
      {displayMode === 'immersive' && 
       showExportOptions && 
       processedContent.isResult && (
        <ExportOptions 
          content={content}
          metadata={metadata}
          availableFormats={exportFormats}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 text-sm">
            ⚠️ Rendering error: {error}
          </div>
        </div>
      )}
    </div>
  );
};

RichContentRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  maxHeight: PropTypes.string,
  className: PropTypes.string,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post']),
  onAction: PropTypes.func,
  // Feature flags
  showAIInsights: PropTypes.bool,
  showPlatformSharing: PropTypes.bool,
  showExportOptions: PropTypes.bool,
  // Configuration
  platforms: PropTypes.arrayOf(PropTypes.string),
  exportFormats: PropTypes.arrayOf(PropTypes.string),
};

export default RichContentRenderer;