import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  
  .markdown-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
  }
  
  .markdown-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  
  .markdown-content th,
  .markdown-content td {
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    text-align: left;
  }
  
  .markdown-content th {
    background-color: #f7fafc;
    font-weight: 600;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  if (!document.head.querySelector('style[data-rich-content-renderer]')) {
    styleElement.setAttribute('data-rich-content-renderer', 'true');
    document.head.appendChild(styleElement);
  }
}

// Lazy load chart components for better performance
const Chart = lazy(() => import('react-chartjs-2'));

// Chart.js registration (you'll need to install chart.js and react-chartjs-2)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Enhanced JSON syntax highlighter
const syntaxHighlight = (json) => {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|\d+)/g,
    match => {
      let cls = 'text-gray-600';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-purple-600';
        else cls = 'text-green-600';
      } else if (/true|false/.test(match)) cls = 'text-blue-600';
      else if (/null/.test(match)) cls = 'text-red-600';
      return `<span class="${cls}">${match}</span>`;
    });
};

// Text Renderer Component
const TextRenderer = ({ content }) => {
  if (!content) return null;
  
  const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  return (
    <div className="text-renderer space-y-2">
      <div className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
        {textContent}
      </div>
    </div>
  );
};

// Markdown Renderer Component
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  const markdownContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  return (
    <div className="markdown-renderer space-y-3">
      <div 
        className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:space-y-1 prose-ol:space-y-1"
        dangerouslySetInnerHTML={{ 
          __html: markdownContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-3 mt-4">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2 mt-3">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium mb-2 mt-2">$1</h3>')
            .replace(/^\- (.*$)/gim, '<li class="ml-4">• $1</li>')
            .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
            .replace(/\n\n/g, '</p><p class="mb-3">')
            .replace(/^(?!<[h|l])/gm, '<p class="mb-2">')
            .replace(/(?<!>)$/gm, '</p>')
        }}
      />
    </div>
  );
};

// HTML Content Renderer
const HtmlRenderer = ({ content, metadata }) => (
  <div className="rich-html-content">
    {metadata?.title && (
      <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
    )}
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  </div>
);

// JSON Content Renderer
const JsonRenderer = ({ content }) => {
  if (!content) return null;
  
  try {
    const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
    const formattedJson = JSON.stringify(jsonContent, null, 2);
    
    return (
      <div className="json-renderer space-y-2">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-mono">
            {formattedJson}
          </pre>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="json-renderer space-y-2">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">Invalid JSON content</p>
          <pre className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">
            {String(content)}
          </pre>
        </div>
      </div>
    );
  }
};

// Image Content Renderer
const ImageRenderer = ({ content, metadata }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getImageSrc = () => {
    if (content.startsWith('data:image/')) {
      return content;
    } else if (metadata?.encoding === 'base64') {
      const format = metadata?.image_format || 'png';
      return `data:image/${format};base64,${content}`;
    } else {
      return content; // Assume it's a URL
    }
  };

  return (
    <div className="image-container">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      <div className="relative inline-block">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        {hasError ? (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            <span className="text-lg">🖼️</span>
            <p className="text-sm mt-1">Failed to load image</p>
          </div>
        ) : (
          <img
            src={getImageSrc()}
            alt={metadata?.title || 'Generated image'}
            className="max-w-full h-auto rounded shadow-sm"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Chart Content Renderer
const ChartRenderer = ({ content, metadata }) => {
  const chartData = useMemo(() => {
    // Convert content to Chart.js format
    if (content.labels && content.datasets) {
      return content; // Already in Chart.js format
    }
    
    // Try to convert from other formats
    if (Array.isArray(content)) {
      // Array of objects - convert to chart data
      const labels = content.map((item, index) => item.label || item.name || `Item ${index + 1}`);
      const values = content.map(item => item.value || item.count || item.y || 0);
      
      return {
        labels,
        datasets: [{
          label: metadata?.title || 'Data',
          data: values,
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1
        }]
      };
    }
    
    return null;
  }, [content, metadata]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: !!metadata?.title,
        text: metadata?.title,
      },
    },
  };

  if (!chartData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-700">
        <span className="text-lg">📊</span>
        <p className="text-sm mt-1">Unable to render chart - invalid data format</p>
      </div>
    );
  }

  const chartType = metadata?.chart_type || 'bar';

  return (
    <div className="chart-container bg-white p-4 rounded border">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-4">{metadata.title}</h3>
      )}
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <Chart type={chartType} data={chartData} options={chartOptions} />
      </Suspense>
    </div>
  );
};

// Table Content Renderer
const TableRenderer = ({ content, metadata }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const columns = metadata?.columns || (content.length > 0 ? Object.keys(content[0]) : []);
  
  const sortedData = useMemo(() => {
    if (!sortColumn) return content;
    
    return [...content].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [content, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(content.length / itemsPerPage);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="table-container">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-4">{metadata.title}</h3>
      )}
      
      <div className="overflow-x-auto bg-white rounded border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column}</span>
                    {sortColumn === column && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map(column => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {String(row[column] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, content.length)} of {content.length} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// File Content Renderer
const FileRenderer = ({ content, metadata }) => {
  const handleDownload = () => {
    try {
      const fileName = metadata?.file_name || 'download';
      const fileType = metadata?.file_type || 'txt';
      const encoding = metadata?.encoding || 'base64';
      
      let blob;
      if (encoding === 'base64') {
        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: `application/${fileType}` });
      } else {
        blob = new Blob([content], { type: 'text/plain' });
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const formatFileSize = (size) => {
    if (!size) return 'Unknown size';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="file-container bg-gray-50 border border-gray-200 rounded-lg p-4">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📄</span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-gray-900">
            {metadata?.file_name || 'Generated File'}
          </div>
          <div className="text-sm text-gray-500">
            {metadata?.file_type?.toUpperCase() || 'FILE'} • {formatFileSize(metadata?.file_size)}
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  );
};

// Code Content Renderer
const CodeRenderer = ({ content, metadata }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="code-container">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      
      <div className="relative">
        <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 rounded-t-lg">
          <span className="text-sm font-medium">
            {metadata?.language || 'code'}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        <SyntaxHighlighter
          language={metadata?.language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// Error Content Renderer
const ErrorRenderer = ({ content, metadata }) => (
  <div className="error-container bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <span className="text-2xl">❌</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-red-800 mb-1">
          {metadata?.title || 'Error'}
        </h3>
        <div className="text-red-700 text-sm">
          {content}
        </div>
      </div>
    </div>
  </div>
);

// Helper functions for content detection
const isHtmlContent = (str) => {
  if (typeof str !== 'string') return false;
  return str.trim().startsWith('<') && str.includes('</') && str.trim().endsWith('>');
};

const isCodeContent = (str) => {
  if (typeof str !== 'string') return false;
  
  // Check for actual code patterns, not just markdown
  const codePatterns = [
    /^```[\w]*\n[\s\S]*?\n```$/m,     // Code blocks with language
    /^function\s+\w+\s*\(/m,          // Function declarations
    /^class\s+\w+/m,                  // Class declarations
    /^import\s+.*from/m,              // Import statements
    /^const\s+\w+\s*=/m,              // Const declarations
    /^let\s+\w+\s*=/m,                // Let declarations
    /^var\s+\w+\s*=/m,                // Var declarations
    /^\s*if\s*\(/m,                   // If statements
    /^\s*for\s*\(/m,                  // For loops
    /^\s*while\s*\(/m,                // While loops
    /^\s*def\s+\w+\s*\(/m,            // Python functions
    /^\s*public\s+class/m,            // Java classes
    /^\s*#include\s*</m,              // C/C++ includes
    /^\s*console\.log\s*\(/m,         // Console logs
    /^\s*print\s*\(/m,                // Print statements
  ];
  
  // Must have at least 2 code patterns to be considered code
  const matches = codePatterns.filter(pattern => pattern.test(str)).length;
  return matches >= 2;
};

const isBase64Image = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || 
         (str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str));
};

// Enhanced content detection that handles nested agent results
const detectContentType = (content) => {
  try {
    // Handle null/undefined
    if (!content) return 'text';
    
    // Handle extracted content types (from extractDisplayContent)
    if (typeof content === 'object' && content !== null && content.type) {
      return content.type;
    }
    
    // Handle string content
    if (typeof content === 'string') {
      const trimmed = content.trim();
      // Check if it looks like markdown using the improved detection
      if (isMarkdownContent(trimmed)) {
        return 'markdown';
      }
      return 'text';
    }
    
    // Handle arrays
    if (Array.isArray(content)) {
      // Check if it's table data (array of objects with consistent keys)
      if (content.length > 0 && content.every(item => typeof item === 'object' && item !== null)) {
        const firstKeys = Object.keys(content[0]);
        if (firstKeys.length > 0 && content.every(item => 
          Object.keys(item).some(key => firstKeys.includes(key))
        )) {
          return 'table';
        }
      }
      return 'json';
    }
    
    // Handle objects
    if (typeof content === 'object' && content !== null) {
      // Check for specific object patterns
      if (content.headers && content.rows) return 'table';
      if (content.data && typeof content.data === 'string' && isBase64Image(content.data)) return 'image';
      if (content.type === 'chart' || (content.data && (content.labels || content.datasets))) return 'chart';
      if (content.filename || content.file_upload) return 'file';
      if (content.label && content.value) return 'label_value_pair';
      
      return 'json';
    }
    
    // Default fallback
    return 'text';
    
  } catch (error) {
    console.error('Error detecting content type:', error);
    return 'text';
  }
};

// Enhanced markdown detection
const isMarkdownContent = (str) => {
  if (typeof str !== 'string') return false;
  
  const markdownPatterns = [
    /^#{1,6}\s+/m,                    // Headers
    /\*\*.*?\*\*/,                    // Bold text
    /\*.*?\*/,                        // Italic text
    /^[-*+]\s+/m,                     // Unordered lists
    /^\d+\.\s+/m,                     // Ordered lists
    /\[.*?\]\(.*?\)/,                 // Links
    /^>\s+/m,                         // Blockquotes
    /^\|.*\|.*\|/m,                   // Tables
    /^---+$/m,                        // Horizontal rules
    /`[^`]+`/,                        // Inline code
  ];
  
  // Check for markdown patterns
  const matches = markdownPatterns.filter(pattern => pattern.test(str)).length;
  
  // If it has markdown patterns and doesn't look like actual code, it's markdown
  return matches >= 2 && !isCodeContent(str);
};

// Extract the actual content from nested structures
const extractDisplayContent = (content) => {
  try {
    // Handle null/undefined
    if (!content) return { type: 'text', content: 'No content available' };
    
    // Handle simple strings - prioritize these
    if (typeof content === 'string') {
      const trimmed = content.trim();
      // Check if it looks like markdown using the improved detection
      if (isMarkdownContent(trimmed)) {
        return { type: 'markdown', content: trimmed };
      }
      return { type: 'text', content: trimmed };
    }
    
    // Handle arrays - look for string content first
    if (Array.isArray(content)) {
      // If it's an array of strings, join them
      if (content.every(item => typeof item === 'string')) {
        const joined = content.join('\n');
        if (joined.includes('##') || joined.includes('**') || joined.includes('- ')) {
          return { type: 'markdown', content: joined };
        }
        return { type: 'text', content: joined };
      }
      // Otherwise return as table data
      return { type: 'table', content: content };
    }
    
    // Handle objects - this is where we need to be more thorough
    if (typeof content === 'object' && content !== null) {
      // Check if it has a specific type property
      if (content.type) {
        switch (content.type) {
          case 'label_value_pair':
            return { type: 'label_value_pair', content };
          case 'file_info':
            return { type: 'file_info', content };
          case 'chart':
            return { type: 'chart', content };
          case 'image':
            return { type: 'image', content };
          case 'table':
            return { type: 'table', content: content.data || content };
          default:
            break;
        }
      }
      
      // Look for common content patterns in objects
      const contentKeys = ['content', 'text', 'output', 'result', 'data', 'message', 'response', 'body'];
      for (const key of contentKeys) {
        if (content[key] && typeof content[key] === 'string' && content[key].trim()) {
          const textContent = content[key].trim();
          if (isMarkdownContent(textContent)) {
            return { type: 'markdown', content: textContent };
          }
          return { type: 'text', content: textContent };
        }
      }
      
      // Enhanced recursive search for meaningful text content
      const findTextContent = (obj, depth = 0, path = '') => {
        if (depth > 5) return null; // Prevent infinite recursion
        
        // Skip React-specific properties
        if (typeof obj !== 'object' || obj === null) return null;
        
        const results = [];
        
        for (const [key, value] of Object.entries(obj)) {
          // Skip React and internal properties
          if (key.startsWith('_') || key.startsWith('$$') || key === 'ref' || key === 'key') {
            continue;
          }
          
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string' && value.trim()) {
            const trimmed = value.trim();
            // Only include substantial text content (more than just single words)
            if (trimmed.length > 10 || trimmed.includes('\n') || trimmed.includes('.')) {
              results.push({
                path: currentPath,
                content: trimmed,
                isMarkdown: isMarkdownContent(trimmed)
              });
            }
          } else if (Array.isArray(value)) {
            // Handle arrays of strings
            const stringItems = value.filter(item => typeof item === 'string' && item.trim());
            if (stringItems.length > 0) {
              const joined = stringItems.join('\n');
              results.push({
                path: currentPath,
                content: joined,
                isMarkdown: isMarkdownContent(joined)
              });
            } else {
              // Recursively search array items
              value.forEach((item, index) => {
                const subResults = findTextContent(item, depth + 1, `${currentPath}[${index}]`);
                if (subResults) results.push(...subResults);
              });
            }
          } else if (typeof value === 'object' && value !== null) {
            const subResults = findTextContent(value, depth + 1, currentPath);
            if (subResults) results.push(...subResults);
          }
        }
        
        return results.length > 0 ? results : null;
      };
      
      const textResults = findTextContent(content);
      if (textResults && textResults.length > 0) {
        // Sort by content length (longest first) and take the most substantial content
        textResults.sort((a, b) => b.content.length - a.content.length);
        
        // If we have multiple substantial pieces of content, combine them
        if (textResults.length > 1) {
          const combinedContent = textResults
            .slice(0, 5) // Take top 5 results
            .map(result => {
              // Add a header for each section if we have a meaningful path
              const header = result.path.split('.').pop();
              if (header && header !== 'content' && header !== 'text' && header !== 'output') {
                return `**${header.charAt(0).toUpperCase() + header.slice(1)}:**\n${result.content}`;
              }
              return result.content;
            })
            .join('\n\n');
          
          return { 
            type: textResults[0].isMarkdown ? 'markdown' : 'text', 
            content: combinedContent 
          };
        } else {
          // Single result
          const result = textResults[0];
          return { 
            type: result.isMarkdown ? 'markdown' : 'text', 
            content: result.content 
          };
        }
      }
      
      // Check for image data
      if (content.data && typeof content.data === 'string' && isBase64Image(content.data)) {
        return { type: 'image', content };
      }
      
      // Check for table data
      if (content.headers && content.rows) {
        return { type: 'table', content };
      }
      
      // Check if it looks like chart data
      if (content.type === 'chart' || (content.data && (content.labels || content.datasets))) {
        return { type: 'chart', content };
      }
      
      // Fallback: create a summary of the object
      const keys = Object.keys(content);
      if (keys.length > 0) {
        const summary = keys
          .filter(key => !key.startsWith('_') && !key.startsWith('$$'))
          .slice(0, 10) // Limit to first 10 keys
          .map(key => {
            const value = content[key];
            if (typeof value === 'string') {
              return `**${key}:** ${value.length > 100 ? value.substring(0, 100) + '...' : value}`;
            } else if (typeof value === 'number') {
              return `**${key}:** ${value}`;
            } else if (typeof value === 'boolean') {
              return `**${key}:** ${value ? 'Yes' : 'No'}`;
            } else if (Array.isArray(value)) {
              return `**${key}:** Array with ${value.length} items`;
            } else if (typeof value === 'object' && value !== null) {
              return `**${key}:** Object with ${Object.keys(value).length} properties`;
            }
            return `**${key}:** ${String(value)}`;
          })
          .join('\n');
        
        return { type: 'markdown', content: summary };
      }
      
      // Last resort: JSON display
      return { type: 'json', content };
    }
    
    // Handle primitives
    return { type: 'text', content: String(content) };
    
  } catch (error) {
    console.error('Error extracting display content:', error);
    return { 
      type: 'error', 
      content: `Error processing content: ${error.message}` 
    };
  }
};

// Label/Value Pair Renderer
const LabelValueRenderer = ({ content, metadata }) => (
  <div className="label-value-container bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
    <div className="flex flex-col space-y-3">
      <div className="label-section">
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Input</span>
        <div className="mt-1 p-3 bg-white rounded-md border border-blue-100 shadow-sm">
          <p className="text-gray-800 font-medium">{content.label}</p>
        </div>
      </div>
      <div className="value-section">
        <span className="text-sm font-semibold text-green-700 uppercase tracking-wide">Value</span>
        <div className="mt-1 p-3 bg-white rounded-md border border-green-100 shadow-sm">
          <p className="text-gray-800">{content.value}</p>
        </div>
      </div>
    </div>
  </div>
);

// File Info Renderer
const FileInfoRenderer = ({ content, metadata }) => (
  <div className="file-info-container bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">📄</span>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-purple-800">File Upload</h3>
        <div className="mt-2 space-y-1 text-sm">
          <div><span className="font-medium text-purple-700">Name:</span> <span className="text-gray-800">{content.filename}</span></div>
          <div><span className="font-medium text-purple-700">Type:</span> <span className="text-gray-800">{content.type}</span></div>
          <div><span className="font-medium text-purple-700">Size:</span> <span className="text-gray-800">{(content.size / 1024).toFixed(2)} KB</span></div>
        </div>
      </div>
    </div>
  </div>
);

// Main Rich Content Renderer Component
const RichContentRenderer = ({ content, maxHeight = '400px', className = '' }) => {
  // Enhanced container classes for better layout
  const containerClasses = `
    rich-content-container overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
    p-4 space-y-2 bg-white rounded-lg border border-gray-200 shadow-sm
    prose prose-sm max-w-none
    ${className}
  `.trim();

  const containerStyle = {
    maxHeight,
    overflowY: 'auto',
    overflowX: 'hidden',
    wordBreak: 'break-word',
    lineHeight: '1.7',
    position: 'relative',
    zIndex: 1
  };

  try {
    // Extract and detect content type
    const extracted = extractDisplayContent(content);
    const contentType = detectContentType(extracted.content);

    // Render based on detected content type
    switch (contentType) {
      case 'markdown':
        return (
          <div className={containerClasses} style={containerStyle}>
            <MarkdownRenderer content={extracted.content} />
          </div>
        );

      case 'html':
        return (
          <div className={containerClasses} style={containerStyle}>
            <HtmlRenderer content={extracted.content} />
          </div>
        );

      case 'json':
        return (
          <div className={containerClasses} style={containerStyle}>
            <JsonRenderer content={extracted.content} />
          </div>
        );

      case 'table':
        return (
          <div className={containerClasses} style={containerStyle}>
            <TableRenderer content={extracted.content} />
          </div>
        );

      case 'image':
        return (
          <div className={containerClasses} style={containerStyle}>
            <ImageRenderer content={extracted.content} />
          </div>
        );

      case 'chart':
        return (
          <div className={containerClasses} style={containerStyle}>
            <ChartRenderer content={extracted.content} />
          </div>
        );

      case 'code':
        return (
          <div className={containerClasses} style={containerStyle}>
            <CodeRenderer content={extracted.content} />
          </div>
        );

      case 'file':
        return (
          <div className={containerClasses} style={containerStyle}>
            <FileRenderer content={extracted.content} />
          </div>
        );

      case 'label_value_pair':
        return (
          <div className={containerClasses} style={containerStyle}>
            <LabelValueRenderer content={extracted.content} />
          </div>
        );

      case 'file_info':
        return (
          <div className={containerClasses} style={containerStyle}>
            <FileInfoRenderer content={extracted.content} />
          </div>
        );

      case 'error':
        return (
          <div className={containerClasses} style={containerStyle}>
            <ErrorRenderer content={extracted.content} />
          </div>
        );

      case 'text':
      default:
        return (
          <div className={containerClasses} style={containerStyle}>
            <TextRenderer content={extracted.content} />
          </div>
        );
    }
  } catch (error) {
    console.error('❌ Error rendering content:', error);
    console.log('🔍 Content that caused error:', content);
    return (
      <div className={containerClasses} style={containerStyle}>
        <ErrorRenderer content={`Error rendering content: ${error.message}`} />
      </div>
    );
  }
};

RichContentRenderer.propTypes = {
  content: PropTypes.any.isRequired,
  maxHeight: PropTypes.string,
  className: PropTypes.string,
};

export default RichContentRenderer; 