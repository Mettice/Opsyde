// components/rich-content/renderers/CodeRenderer.jsx
import React, { useState, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';

// Lazy load syntax highlighter for better performance
const SyntaxHighlighter = lazy(() => 
  import('react-syntax-highlighter').then(module => ({
    default: module.Prism
  }))
);

const vscDarkPlus = lazy(() => 
  import('react-syntax-highlighter/dist/esm/styles/prism').then(module => ({
    default: module.vscDarkPlus
  }))
);

const CodeRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(displayMode !== 'minimal');
  
  if (!content) return null;

  // Extract code content
  const codeContent = typeof content === 'object' && content.content 
    ? content.content 
    : typeof content === 'string' 
      ? content 
      : JSON.stringify(content, null, 2);

  // Detect programming language
  const detectLanguage = (code) => {
    if (metadata?.language) return metadata.language;
    
    // Simple language detection based on patterns
    const languagePatterns = {
      javascript: /^(import|export|const|let|var|function|class|=>|\$\{)/m,
      python: /^(import|from|def|class|if __name__|print\()/m,
      java: /^(public class|import java\.|System\.out\.println)/m,
      csharp: /^(using System|public class|Console\.WriteLine)/m,
      cpp: /^(#include|using namespace|std::)/m,
      sql: /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s+/im,
      json: /^\s*[\{\[]/,
      xml: /^\s*<\?xml|^\s*</,
      html: /^\s*<!DOCTYPE|^\s*<html/,
      css: /^\s*[\w-]+\s*\{|@media|@import/m,
      yaml: /^\s*[\w-]+:\s*$/m,
      markdown: /^#{1,6}\s+|^\*\*.*\*\*|\[.*\]\(.*\)/m
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(code)) {
        return lang;
      }
    }

    return 'text';
  };

  const language = detectLanguage(codeContent);
  const displayContent = displayMode === 'minimal' && !isExpanded && codeContent.length > 500
    ? `${codeContent.substring(0, 500)}...`
    : codeContent;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = codeContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadCode = () => {
    try {
      const filename = metadata?.filename || `code.${getFileExtension(language)}`;
      const blob = new Blob([codeContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading code:', error);
    }
  };

  const getFileExtension = (lang) => {
    const extensions = {
      javascript: 'js',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      sql: 'sql',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      yaml: 'yml',
      markdown: 'md'
    };
    return extensions[lang] || 'txt';
  };

  const getLanguageIcon = (lang) => {
    const icons = {
      javascript: '🟨',
      python: '🐍',
      java: '☕',
      csharp: '🔷',
      cpp: '⚙️',
      sql: '🗄️',
      json: '📄',
      xml: '📑',
      html: '🌐',
      css: '🎨',
      yaml: '📋',
      markdown: '📝'
    };
    return icons[lang] || '💻';
  };

  // Loading fallback for syntax highlighter
  const LoadingFallback = () => (
    <div className="bg-gray-900 text-gray-300 p-4 rounded-b-lg font-mono text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin"></div>
        <span>Loading syntax highlighter...</span>
      </div>
    </div>
  );

  return (
    <div className="code-container space-y-2">
      {/* Header */}
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 flex items-center">
          <span className="mr-2">💻</span>
          {metadata.title}
        </h3>
      )}
      
      <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        {/* Code header */}
        <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-3 text-sm">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{getLanguageIcon(language)}</span>
            <span className="font-medium capitalize">
              {language === 'csharp' ? 'C#' : language}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
              title="Copy code"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={downloadCode}
              className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
              title="Download code"
            >
              <span>💾</span>
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Code content */}
        <div className="relative">
          <Suspense fallback={<LoadingFallback />}>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '14px',
                lineHeight: '1.5'
              }}
              showLineNumbers={true}
              wrapLines={true}
              wrapLongLines={true}
            >
              {codeContent}
            </SyntaxHighlighter>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

CodeRenderer.propTypes = {
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]).isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.string
};

export default CodeRenderer;