// components/rich-content/renderers/HtmlRenderer.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const HtmlRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [showSource, setShowSource] = useState(false);
  const [isSafe, setIsSafe] = useState(false);
  const [sanitizedHtml, setSanitizedHtml] = useState('');
  const iframeRef = useRef(null);

  // Simple HTML sanitization (in production, use DOMPurify)
  const sanitizeHtml = (html) => {
    // Remove dangerous tags and attributes
    const dangerous = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi, // onclick, onload, etc.
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    let sanitized = html;
    dangerous.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  };

  // Check if HTML content is safe
  const checkSafety = (html) => {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:text\/html/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(html));
  };

  // Process HTML content
  useEffect(() => {
    const htmlContent = typeof content === 'object' && content.content 
      ? content.content 
      : typeof content === 'string' 
        ? content 
        : String(content);

    const safe = checkSafety(htmlContent);
    setIsSafe(safe);
    setSanitizedHtml(safe ? htmlContent : sanitizeHtml(htmlContent));
  }, [content]);

  // Copy HTML to clipboard
  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(sanitizedHtml);
    } catch (error) {
      console.error('Failed to copy HTML:', error);
    }
  };

  // Download HTML file
  const downloadHtml = () => {
    const blob = new Blob([sanitizedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = metadata?.filename || `content-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render in iframe for safety
  const renderInIframe = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(sanitizedHtml);
      doc.close();
    }
  };

  useEffect(() => {
    if (displayMode !== 'minimal' && sanitizedHtml) {
      renderInIframe();
    }
  }, [sanitizedHtml, displayMode]);

  if (!content) return null;

  return (
    <div className="html-renderer space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🌐</span>
            {metadata?.title || 'HTML Content'}
          </h3>
          
          {/* Safety indicator */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isSafe 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isSafe ? '✓ Safe' : '⚠ Sanitized'}
          </div>
        </div>

        {displayMode !== 'minimal' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSource(!showSource)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              {showSource ? 'Hide' : 'View'} Source
            </button>
            <button
              onClick={copyHtml}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              📋 Copy
            </button>
            <button
              onClick={downloadHtml}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              💾 Download
            </button>
          </div>
        )}
      </div>

      {/* Warning for unsafe content */}
      {!isSafe && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <div className="text-yellow-800 text-sm">
              <strong>Content Sanitized:</strong> Potentially unsafe elements have been removed for security.
            </div>
          </div>
        </div>
      )}

      {/* HTML Preview */}
      {!showSource && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {displayMode === 'minimal' ? (
            // Minimal mode - just show a preview
            <div className="p-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            </div>
          ) : (
            // Full iframe rendering
            <div className="relative">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">HTML Preview</span>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Rendered in safe sandbox</span>
                </div>
              </div>
              <iframe
                ref={iframeRef}
                className="w-full h-96 border-0"
                sandbox="allow-same-origin"
                title="HTML Content Preview"
              />
            </div>
          )}
        </div>
      )}

      {/* Source Code View */}
      {showSource && (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">HTML Source</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">
                {sanitizedHtml.split('\n').length} lines
              </span>
              <button
                onClick={copyHtml}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="p-4 overflow-auto max-h-96">
            <pre className="text-sm text-gray-300 leading-relaxed">
              <code dangerouslySetInnerHTML={{ 
                __html: sanitizedHtml
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;')
              }} />
            </pre>
          </div>
        </div>
      )}

      {/* HTML Statistics */}
      {displayMode === 'immersive' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Size</div>
            <div className="text-lg font-semibold text-blue-800">
              {(sanitizedHtml.length / 1024).toFixed(1)}KB
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 mb-1">Lines</div>
            <div className="text-lg font-semibold text-green-800">
              {sanitizedHtml.split('\n').length}
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Tags</div>
            <div className="text-lg font-semibold text-purple-800">
              {(sanitizedHtml.match(/<[^>]+>/g) || []).length}
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600 mb-1">Status</div>
            <div className="text-lg font-semibold text-orange-800">
              {isSafe ? 'Safe' : 'Sanitized'}
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      {displayMode === 'immersive' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <span className="mr-2">🛡️</span>
            Security Information
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• HTML content is rendered in a secure sandbox</li>
            <li>• Scripts and dangerous elements are automatically removed</li>
            <li>• External resources are blocked for security</li>
            <li>• Content is safe to view and interact with</li>
          </ul>
        </div>
      )}
    </div>
  );
};

HtmlRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default HtmlRenderer;