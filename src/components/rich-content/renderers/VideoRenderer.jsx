import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

const VideoRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);

  // Extract video source
  const getVideoSrc = () => {
    if (typeof content === 'string') {
      return content;
    }
    if (content && typeof content === 'object') {
      return content.url || content.src || content.data;
    }
    return null;
  };

  const videoSrc = getVideoSrc();
  const title = metadata?.title || metadata?.filename || 'Video';
  const poster = metadata?.poster || metadata?.thumbnail;

  // Handle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  if (!videoSrc) {
    return (
      <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
        ⚠️ Invalid video content
      </div>
    );
  }

  if (displayMode === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>🎬</span>
        <span>{title}</span>
        <span className="text-xs">Video</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-black">
      <div 
        className="relative group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          className="w-full h-auto max-h-96"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          controls={showControls}
          preload="metadata"
        />
        
        {/* Custom overlay controls */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <button
              onClick={togglePlayPause}
              className="w-16 h-16 bg-white bg-opacity-90 text-black rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all text-2xl"
            >
              ▶️
            </button>
          </div>
        )}
        
        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-50 text-white rounded flex items-center justify-center hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
          title="Fullscreen"
        >
          ⛶
        </button>
      </div>
      
      {/* Video info */}
      <div className="p-3 bg-white">
        <div className="font-medium text-gray-900">{title}</div>
        
        {metadata?.duration && (
          <div className="text-sm text-gray-500 mt-1">
            Duration: {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}
          </div>
        )}
        
        {metadata?.description && (
          <div className="text-sm text-gray-600 mt-2">
            {metadata.description}
          </div>
        )}
        
        {metadata?.resolution && (
          <div className="text-xs text-gray-500 mt-1">
            {metadata.resolution.width}x{metadata.resolution.height}
          </div>
        )}
      </div>
    </div>
  );
};

VideoRenderer.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default VideoRenderer; 