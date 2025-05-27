import React, { useState } from 'react';
import RichContentRenderer from './RichContentRenderer';

const RichContentDisplayModes = ({ content, metadata = {}, onAction = null }) => {
  const [displayMode, setDisplayMode] = useState('immersive');

  const modes = [
    {
      id: 'minimal',
      name: 'Simple',
      icon: '📝',
      description: 'Text-focused, minimal UI'
    },
    {
      id: 'immersive', 
      name: 'Dashboard',
      icon: '📊',
      description: 'Full features with charts & insights'
    },
    {
      id: 'post',
      name: 'Share Mode',
      icon: '📤',
      description: 'Optimized for social sharing'
    }
  ];

  const getModeColor = (mode) => {
    const colors = {
      minimal: 'bg-gray-100 text-gray-700 border-gray-300',
      immersive: 'bg-blue-100 text-blue-700 border-blue-300',
      post: 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[mode] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="rich-content-display-modes">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Display Mode:</span>
          <div className="flex gap-1">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDisplayMode(mode.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                  ${displayMode === mode.id 
                    ? `${getModeColor(mode.id)} shadow-sm scale-105` 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }
                `}
                title={mode.description}
              >
                <span>{mode.icon}</span>
                <span>{mode.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Info */}
        <div className="text-xs text-gray-500">
          {modes.find(m => m.id === displayMode)?.description}
        </div>
      </div>

      {/* Content Renderer */}
      <RichContentRenderer
        content={content}
        metadata={metadata}
        displayMode={displayMode}
        onAction={onAction}
        className="transition-all duration-300"
      />

      {/* Mode Features Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm font-medium text-blue-800 mb-2">
          Current Mode Features:
        </div>
        <div className="text-xs text-blue-700">
          {displayMode === 'minimal' && (
            <ul className="space-y-1">
              <li>• Simplified text display</li>
              <li>• Compact layout</li>
              <li>• Fast loading</li>
            </ul>
          )}
          {displayMode === 'immersive' && (
            <ul className="space-y-1">
              <li>• Full chart visualizations</li>
              <li>• Auto-generated insights</li>
              <li>• Interactive elements</li>
              <li>• Platform sharing buttons</li>
            </ul>
          )}
          {displayMode === 'post' && (
            <ul className="space-y-1">
              <li>• Optimized for sharing</li>
              <li>• Social media formatting</li>
              <li>• Enhanced visual appeal</li>
              <li>• Platform-specific styling</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default RichContentDisplayModes; 