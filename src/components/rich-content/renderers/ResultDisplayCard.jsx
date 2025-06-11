import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import RichContentRenderer from '../RichContentRenderer';

const ResultDisplayCard = ({ 
  content, 
  metadata = {}, 
  title = "Result",
  className = "",
  defaultExpanded = false,
  showMetrics = true,
  colorScheme = "blue"
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);

  // Measure content height for animations
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [content, isExpanded]);

  // Color schemes for different types of content
  const colorSchemes = {
    blue: {
      primary: 'from-blue-500 to-blue-600',
      secondary: 'from-blue-50 to-blue-100',
      accent: 'bg-blue-500',
      border: 'border-blue-200',
      text: 'text-blue-700',
      indicator: 'bg-blue-400',
      glow: 'shadow-blue-200/60'
    },
    green: {
      primary: 'from-green-500 to-green-600',
      secondary: 'from-green-50 to-green-100',
      accent: 'bg-green-500',
      border: 'border-green-200',
      text: 'text-green-700',
      indicator: 'bg-green-400',
      glow: 'shadow-green-200/60'
    },
    purple: {
      primary: 'from-purple-500 to-purple-600',
      secondary: 'from-purple-50 to-purple-100',
      accent: 'bg-purple-500',
      border: 'border-purple-200',
      text: 'text-purple-700',
      indicator: 'bg-purple-400',
      glow: 'shadow-purple-200/60'
    },
    orange: {
      primary: 'from-orange-500 to-orange-600',
      secondary: 'from-orange-50 to-orange-100',
      accent: 'bg-orange-500',
      border: 'border-orange-200',
      text: 'text-orange-700',
      indicator: 'bg-orange-400',
      glow: 'shadow-orange-200/60'
    },
    pink: {
      primary: 'from-pink-500 to-pink-600',
      secondary: 'from-pink-50 to-pink-100',
      accent: 'bg-pink-500',
      border: 'border-pink-200',
      text: 'text-pink-700',
      indicator: 'bg-pink-400',
      glow: 'shadow-pink-200/60'
    }
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.blue;

  // Get content type for appropriate icon
  const getContentIcon = () => {
    // Handle error states with specific error icon
    if (typeof content === 'object' && content?.error) {
      return '❌';
    }
    
    // Handle standardized success states
    if (typeof content === 'object' && content?.success === true) {
      return '✅';
    }
    
    if (typeof content === 'string') {
      if (content.includes('```') || content.includes('function')) return '💻';
      if (content.includes('# ') || content.includes('## ')) return '📝';
      if (content.includes('http')) return '🔗';
      return '📄';
    }
    if (Array.isArray(content)) return '📊';
    if (typeof content === 'object') return '🗂️';
    return '✨';
  };

  // 🔧 NEW: Get status indicator based on content
  const getStatusIndicator = () => {
    if (typeof content === 'object' && content !== null) {
      // Handle standardized format
      if (content.hasOwnProperty('success')) {
        if (content.success === false) {
          return {
            status: 'error',
            color: 'bg-red-500',
            label: 'Failed',
            details: content.error || 'Unknown error'
          };
        } else {
          return {
            status: 'success',
            color: 'bg-green-500',
            label: 'Success',
            details: 'Operation completed successfully'
          };
        }
      }
      
      // Handle legacy error format
      if (content.error || content.type === 'error') {
        return {
          status: 'error',
          color: 'bg-red-500',
          label: 'Error',
          details: content.error || content.message || 'Unknown error'
        };
      }
      
      // Handle legacy success format
      if (content.result || content.output || content.data) {
        return {
          status: 'success',
          color: 'bg-green-500',
          label: 'Result',
          details: 'Data available'
        };
      }
    }
    
    // Default status
    return {
      status: 'info',
      color: 'bg-blue-500',
      label: 'Info',
      details: 'Content available'
    };
  };

  // Calculate content metrics
  const getContentMetrics = () => {
    let wordCount = 0;
    let charCount = 0;
    let lineCount = 0;
    let dataType = 'unknown';

    // 🔧 Enhanced: Handle standardized format for metrics
    let actualContent = content;
    
    if (typeof content === 'object' && content !== null) {
      if (content.hasOwnProperty('success') && content.data) {
        actualContent = content.data;
        dataType = content.success ? 'standardized_success' : 'standardized_error';
      } else if (content.result || content.output || content.data) {
        actualContent = content.result || content.output || content.data;
        dataType = 'legacy_result';
      }
    }

    if (typeof actualContent === 'string') {
      charCount = actualContent.length;
      wordCount = actualContent.split(/\s+/).filter(word => word.length > 0).length;
      lineCount = actualContent.split('\n').length;
      dataType = dataType === 'unknown' ? 'text' : dataType;
    } else if (typeof actualContent === 'object' && actualContent !== null) {
      const jsonStr = JSON.stringify(actualContent, null, 2);
      charCount = jsonStr.length;
      lineCount = jsonStr.split('\n').length;
      wordCount = Object.keys(actualContent).length;
      dataType = dataType === 'unknown' ? 'object' : dataType;
    }

    return { wordCount, charCount, lineCount, dataType };
  };

  const metrics = getContentMetrics();
  const statusIndicator = getStatusIndicator();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCopy = async () => {
    try {
      const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      await navigator.clipboard.writeText(textContent);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleDownload = () => {
    const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Main Card */}
      <div className={`
        relative group
        bg-white rounded-2xl border-2 ${colors.border}
        shadow-lg ${colors.glow}
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1
        ${className}
      `}>
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10 blur-xl" 
             style={{ background: `linear-gradient(45deg, ${colors.indicator}, ${colors.accent})` }} />

        {/* Status Indicators - Top Right */}
        <div className="absolute -top-2 -right-2 flex gap-1">
          <div className={`w-4 h-4 rounded-full ${statusIndicator.color} animate-pulse shadow-lg`} 
               title={`${statusIndicator.label}: ${statusIndicator.details}`} />
          <div className={`w-3 h-3 rounded-full ${statusIndicator.status === 'error' ? 'bg-red-300' : 'bg-green-400'} shadow-lg`} />
          <div className={`w-2 h-2 rounded-full ${statusIndicator.status === 'error' ? 'bg-red-200' : 'bg-yellow-400'} shadow-lg`} />
        </div>

        {/* Header */}
        <div className={`
          p-4 rounded-t-2xl bg-gradient-to-r ${colors.secondary}
          border-b ${colors.border}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-xl bg-gradient-to-r ${colors.primary}
                flex items-center justify-center text-white text-lg
                shadow-lg transform transition-transform group-hover:scale-110
              `}>
                {getContentIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                  {/* 🔧 NEW: Status badge */}
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${statusIndicator.status === 'error' 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : statusIndicator.status === 'success'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }
                  `}>
                    {statusIndicator.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>📊 Rich Content</span>
                  {showMetrics && (
                    <>
                      <span>•</span>
                      <span>{metrics.wordCount} {metrics.dataType === 'object' ? 'keys' : 'words'}</span>
                      <span>•</span>
                      <span>{metrics.lineCount} lines</span>
                      {/* 🔧 NEW: Data type indicator */}
                      <span>•</span>
                      <span className="font-medium" title={`Data format: ${metrics.dataType}`}>
                        {metrics.dataType === 'standardized_success' && '🟢 Standard'}
                        {metrics.dataType === 'standardized_error' && '🔴 Standard'}
                        {metrics.dataType === 'legacy_result' && '🟡 Legacy'}
                        {metrics.dataType === 'text' && '📝 Text'}
                        {metrics.dataType === 'object' && '🗂️ Object'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-110"
                title="Copy content"
              >
                📋
              </button>
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-110"
                title="Download content"
              >
                💾
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-110"
                title="Fullscreen view"
              >
                🔍
              </button>
              <button
                onClick={toggleExpanded}
                className={`
                  p-2 rounded-lg bg-gradient-to-r ${colors.primary} text-white
                  hover:shadow-lg transition-all duration-200 hover:scale-110
                  ${isExpanded ? 'rotate-180' : ''}
                `}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                ⌄
              </button>
            </div>
          </div>
        </div>

        {/* Content Preview (Always Visible) */}
        <div className="p-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Preview:</div>
            <div className="text-gray-800">
              <RichContentRenderer 
                content={content} 
                displayMode="minimal"
                maxHeight="200px"
              />
            </div>
          </div>
        </div>

        {/* Expandable Content */}
        <div 
          className={`
            overflow-hidden transition-all duration-500 ease-out
            ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="px-4 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-inner">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Full Content</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${colors.indicator}`} />
                    <span>Live Content</span>
                  </div>
                </div>
                <div 
                  ref={contentRef}
                  className="max-h-none overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                >
                  <RichContentRenderer 
                    content={content} 
                    metadata={metadata}
                    displayMode="immersive"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Bar */}
        {showMetrics && isExpanded && (
          <div className={`
            px-4 pb-4
          `}>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-800">{metrics.charCount}</div>
                  <div className="text-xs text-gray-500">Characters</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-800">{metrics.wordCount}</div>
                  <div className="text-xs text-gray-500">{typeof content === 'object' ? 'Keys' : 'Words'}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-800">{metrics.lineCount}</div>
                  <div className="text-xs text-gray-500">Lines</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
            {/* Fullscreen Header */}
            <div className={`
              p-6 rounded-t-2xl bg-gradient-to-r ${colors.secondary}
              border-b ${colors.border} flex-shrink-0
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-12 h-12 rounded-xl bg-gradient-to-r ${colors.primary}
                    flex items-center justify-center text-white text-xl
                    shadow-lg
                  `}>
                    {getContentIcon()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <div className="text-sm text-gray-600">Fullscreen View</div>
                  </div>
                </div>
                <button
                  onClick={toggleFullscreen}
                  className="p-3 rounded-xl bg-white/60 hover:bg-white/80 text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-110"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <RichContentRenderer 
                  content={content} 
                  metadata={metadata}
                  displayMode="immersive"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

ResultDisplayCard.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  title: PropTypes.string,
  className: PropTypes.string,
  defaultExpanded: PropTypes.bool,
  showMetrics: PropTypes.bool,
  colorScheme: PropTypes.oneOf(['blue', 'green', 'purple', 'orange', 'pink'])
};

export default ResultDisplayCard; 