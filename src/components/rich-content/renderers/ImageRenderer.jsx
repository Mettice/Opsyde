// components/rich-content/renderers/ImageRenderer.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const ImageRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);

  const getImageSrc = () => {
    // Handle different content formats
    if (typeof content === 'string') {
      // Already a URL or base64
      if (content.startsWith('data:image/') || content.startsWith('http')) {
        return content;
      }
      // Base64 without data URL prefix
      return `data:image/png;base64,${content}`;
    }
    
    if (typeof content === 'object' && content !== null) {
      // Object with image data
      const src = content.src || content.url || content.data || content.image;
      if (src) {
        if (typeof src === 'string') {
          if (src.startsWith('data:image/') || src.startsWith('http')) {
            return src;
          }
          // Base64 data
          const format = content.format || metadata?.image_format || 'png';
          return `data:image/${format};base64,${src}`;
        }
      }
    }
    
    // Fallback for metadata encoding
    if (metadata?.encoding === 'base64') {
      const format = metadata?.image_format || 'png';
      return `data:image/${format};base64,${content}`;
    }
    
    return content;
  };

  const handleImageLoad = (e) => {
    setIsLoading(false);
    const { naturalWidth, naturalHeight } = e.target;
    setDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadImage = () => {
    try {
      const imageSrc = getImageSrc();
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = metadata?.title || metadata?.filename || `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      const imageSrc = getImageSrc();
      if (imageSrc.startsWith('data:image/')) {
        // Copy base64 data to clipboard
        await navigator.clipboard.writeText(imageSrc);
      } else {
        // Copy URL to clipboard
        await navigator.clipboard.writeText(imageSrc);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Keyboard handler for fullscreen
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isFullscreen && e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  if (hasError) {
    return (
      <div className="image-container bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-400 text-4xl mb-2">🖼️</div>
        <h3 className="font-medium text-red-800 mb-1">Failed to load image</h3>
        <p className="text-red-600 text-sm">
          {metadata?.title && `"${metadata.title}" - `}
          The image could not be displayed
        </p>
        {displayMode !== 'minimal' && (
          <div className="mt-4 space-x-2">
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="image-container space-y-3">
        {/* Header */}
        {metadata?.title && (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <span className="mr-2">🖼️</span>
              {metadata.title}
            </h3>
            {displayMode !== 'minimal' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
                  title="Copy image data"
                >
                  📋
                </button>
                <button
                  onClick={downloadImage}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
                  title="Download image"
                >
                  💾
                </button>
              </div>
            )}
          </div>
        )}

        {/* Image container */}
        <div className="relative inline-block max-w-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg min-h-32">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading image...</span>
              </div>
            </div>
          )}
          
          <img
            ref={imgRef}
            src={getImageSrc()}
            alt={metadata?.title || metadata?.alt || 'Image content'}
            className={`max-w-full h-auto rounded-lg shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
              displayMode === 'minimal' ? 'max-h-32 object-cover' : ''
            } ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={displayMode !== 'minimal' ? toggleFullscreen : undefined}
            style={{
              maxHeight: displayMode === 'minimal' ? '128px' : 'none'
            }}
          />
          
          {/* Overlay with image info */}
          {!isLoading && displayMode !== 'minimal' && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              {dimensions.width}×{dimensions.height}
              {metadata?.fileSize && ` • ${(metadata.fileSize / 1024).toFixed(1)}KB`}
            </div>
          )}
          
          {/* Fullscreen button */}
          {!isLoading && displayMode !== 'minimal' && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded backdrop-blur-sm hover:bg-black/80 transition-colors"
              title="View fullscreen"
            >
              🔍
            </button>
          )}
        </div>

        {/* Image metadata */}
        {displayMode === 'immersive' && !isLoading && (
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex flex-wrap gap-4">
              <span>Dimensions: {dimensions.width}×{dimensions.height}</span>
              {metadata?.fileSize && (
                <span>Size: {(metadata.fileSize / 1024).toFixed(1)}KB</span>
              )}
              {metadata?.format && (
                <span>Format: {metadata.format.toUpperCase()}</span>
              )}
            </div>
            {metadata?.description && (
              <p className="text-gray-600 italic">{metadata.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          {/* Close button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 transition-colors z-10"
            title="Close (Esc)"
          >
            ✕
          </button>
          
          {/* Controls */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
            <button 
              onClick={downloadImage}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded backdrop-blur-sm transition-colors"
            >
              💾 Download
            </button>
            <button 
              onClick={copyToClipboard}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded backdrop-blur-sm transition-colors"
            >
              📋 Copy
            </button>
          </div>
          
          {/* Image */}
          <img
            src={getImageSrc()}
            alt={metadata?.title || 'Fullscreen image'}
            className="max-w-full max-h-full object-contain"
            onClick={toggleFullscreen}
          />
          
          {/* Image info */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded backdrop-blur-sm">
            <div className="text-center text-sm">
              {metadata?.title && <div className="font-medium">{metadata.title}</div>}
              <div className="text-gray-300">
                {dimensions.width}×{dimensions.height}
                {metadata?.fileSize && ` • ${(metadata.fileSize / 1024).toFixed(1)}KB`}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

ImageRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default ImageRenderer;