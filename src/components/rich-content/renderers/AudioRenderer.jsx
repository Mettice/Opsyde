import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

const AudioRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  // Extract audio source
  const getAudioSrc = () => {
    if (typeof content === 'string') {
      return content;
    }
    if (content && typeof content === 'object') {
      return content.url || content.src || content.data;
    }
    return null;
  };

  const audioSrc = getAudioSrc();
  const title = metadata?.title || metadata?.filename || 'Audio';

  // Handle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle seek
  const handleSeek = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Format time
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioSrc) {
    return (
      <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
        ⚠️ Invalid audio content
      </div>
    );
  }

  if (displayMode === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>🎧</span>
        <span>{title}</span>
        <span className="text-xs">Audio</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
      
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <div className="flex-1">
          <div className="font-medium text-gray-900 mb-1">{title}</div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {formatTime(currentTime)}
            </span>
            
            <div 
              className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            
            <span className="text-xs text-gray-500">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
      
      {metadata?.description && (
        <div className="mt-3 text-sm text-gray-600">
          {metadata.description}
        </div>
      )}
    </div>
  );
};

AudioRenderer.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default AudioRenderer; 