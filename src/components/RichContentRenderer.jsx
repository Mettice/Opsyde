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

// Text Content Renderer
const TextRenderer = ({ content, metadata }) => (
  <div className="text-sm leading-relaxed whitespace-pre-wrap">
    {metadata?.title && (
      <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
    )}
    {content}
  </div>
);

// Markdown Content Renderer
const MarkdownRenderer = ({ content, metadata }) => (
  <div className="prose prose-sm max-w-none overflow-hidden">
    {metadata?.title && (
      <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
    )}
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="my-2 overflow-hidden rounded-lg">
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <div className="overflow-auto max-h-48 bg-gray-100 rounded-lg p-3 my-2">
              {children}
            </div>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  </div>
);

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

// JSON Content Renderer with collapsible sections
const JsonRenderer = ({ content, metadata }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  
  const toggleKey = (key) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const renderJsonValue = (value, key = '', depth = 0) => {
    if (depth > 5) return <span className="text-gray-500">...</span>;
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return (
          <div className="ml-4">
            <button
              onClick={() => toggleKey(key)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              [{value.length} items] {expandedKeys.has(key) ? '▼' : '▶'}
            </button>
            {expandedKeys.has(key) && (
              <div className="ml-4 mt-1">
                {value.map((item, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">{index}:</span>
                    {renderJsonValue(item, `${key}[${index}]`, depth + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        const keys = Object.keys(value);
        return (
          <div className="ml-4">
            <button
              onClick={() => toggleKey(key)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {`{${keys.length} keys}`} {expandedKeys.has(key) ? '▼' : '▶'}
            </button>
            {expandedKeys.has(key) && (
              <div className="ml-4 mt-1">
                {keys.map(objKey => (
                  <div key={objKey} className="mb-1">
                    <span className="text-purple-600 font-medium">{objKey}:</span>
                    {renderJsonValue(value[objKey], `${key}.${objKey}`, depth + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    } else {
      const className = typeof value === 'string' ? 'text-green-600' :
                      typeof value === 'number' ? 'text-blue-600' :
                      typeof value === 'boolean' ? 'text-orange-600' :
                      value === null ? 'text-red-600' : 'text-gray-600';
      
      return <span className={className}>{JSON.stringify(value)}</span>;
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {metadata?.title && (
        <h3 className="font-semibold text-gray-800 mb-2">{metadata.title}</h3>
      )}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">JSON Data</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          {isExpanded ? 'Collapse' : 'Expand'} All
        </button>
      </div>
      
      {isExpanded ? (
        <div className="overflow-auto max-h-64 bg-white rounded border">
          <pre 
            className="text-xs p-3 whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ 
              __html: syntaxHighlight(typeof content === 'string' ? content : JSON.stringify(content, null, 2))
            }}
          />
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-auto">
          {Object.keys(content).map(key => (
            <div key={key} className="text-sm">
              <span className="text-purple-600 font-medium">{key}:</span>
              {renderJsonValue(content[key], key, 0)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  
  const codePatterns = [
    /^(function|def|class|import|from|const|let|var)\s+/m,
    /^(public|private|protected)\s+/m,
    /^\s*\/\/.*$/m,
    /^\s*#.*$/m,
    /^\s*\/\*[\s\S]*?\*\/$/m,
  ];
  
  return codePatterns.some(pattern => pattern.test(str));
};

const isBase64Image = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') || 
         (str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str));
};

// Enhanced content detection that handles nested agent results
const detectContentType = (content) => {
  if (!content) return 'text';
  
  // Handle nested agent/task results - look for markdown content first
  if (typeof content === 'object' && content !== null) {
    // Check for agent/task result patterns
    if (content.value && typeof content.value === 'object') {
      // Look for output or result fields that might contain markdown
      const output = content.value.output || content.value.result;
      if (typeof output === 'string') {
        // Check if it's markdown content
        if (isMarkdownContent(output)) {
          return 'markdown';
        }
        // If it's a long text, treat as text
        if (output.length > 100) {
          return 'text';
        }
      }
    }
    
    // Check direct result/output fields
    const directOutput = content.result || content.output || content.data;
    if (typeof directOutput === 'string') {
      if (isMarkdownContent(directOutput)) {
        return 'markdown';
      }
      if (directOutput.length > 100) {
        return 'text';
      }
    }
    
    // Check if it's chart data
    if (content.labels && content.datasets) {
      return 'chart';
    }
    
    // Check if it's table data
    if (Array.isArray(content) && content.length > 0 && 
        typeof content[0] === 'object' && content[0] !== null) {
      return 'table';
    }
    
    // Check if it's an array of objects (table data)
    if (content.payload && Array.isArray(content.payload) && 
        content.payload.length > 0 && typeof content.payload[0] === 'object') {
      return 'table';
    }
    
    // Check for rich output format
    if (content.output_type) {
      return content.output_type;
    }
    
    // Default to JSON for complex objects
    return 'json';
  }
  
  // Handle strings
  if (typeof content === 'string') {
    if (isMarkdownContent(content)) {
      return 'markdown';
    }
    if (isHtmlContent(content)) {
      return 'html';
    }
    if (isCodeContent(content)) {
      return 'code';
    }
    if (isBase64Image(content)) {
      return 'image';
    }
    return 'text';
  }
  
  // Handle arrays
  if (Array.isArray(content)) {
    if (content.length > 0 && typeof content[0] === 'object' && content[0] !== null) {
      return 'table';
    }
    return 'json';
  }
  
  return 'text';
};

// Enhanced markdown detection
const isMarkdownContent = (str) => {
  if (typeof str !== 'string') return false;
  
  const markdownPatterns = [
    /^#{1,6}\s+.+/m,           // Headers
    /\*\*[^*]+\*\*/,           // Bold
    /\*[^*]+\*/,               // Italic
    /`[^`]+`/,                 // Inline code
    /```[\s\S]*?```/,          // Code blocks
    /^\s*[-*+]\s+/m,           // Lists
    /^\s*\d+\.\s+/m,           // Numbered lists
    /\[([^\]]+)\]\(([^)]+)\)/, // Links
    /^\s*>\s+/m,               // Blockquotes
    /\|.*\|.*\|/,              // Tables
  ];
  
  return markdownPatterns.some(pattern => pattern.test(str));
};

// Extract the actual content from nested structures
const extractDisplayContent = (content) => {
  if (!content) return content;
  
  // Handle nested agent/task results
  if (typeof content === 'object' && content !== null) {
    // Look for the actual content in nested structures
    if (content.value && typeof content.value === 'object') {
      const output = content.value.output || content.value.result;
      if (typeof output === 'string' && output.length > 0) {
        return output;
      }
    }
    
    // Check direct fields
    const directOutput = content.result || content.output || content.data;
    if (typeof directOutput === 'string' && directOutput.length > 0) {
      return directOutput;
    }
    
    // For rich output format, return the payload
    if (content.output_type && content.payload) {
      return content.payload;
    }
  }
  
  return content;
};

// Main Rich Content Renderer Component
const RichContentRenderer = ({ content, maxHeight = '400px', className = '' }) => {
  // Extract the actual content to display
  const displayContent = extractDisplayContent(content);
  
  // Detect the content type
  const contentType = detectContentType(content);
  
  // Get metadata if available
  const metadata = content?.metadata || {};
  
  // Add debug logging
  console.log('RichContentRenderer Debug:', {
    originalContent: content,
    displayContent: displayContent,
    detectedType: contentType,
    metadata: metadata
  });

  // Enhanced container classes with proper overflow handling
  const containerClasses = `rich-content-renderer overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${className}`;
  const style = { 
    maxHeight,
    overflowY: 'auto',
    overflowX: 'hidden',
    wordBreak: 'break-word',
    position: 'relative'
  };

  try {
    switch (contentType) {
      case 'markdown':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <MarkdownRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'html':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <HtmlRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'json':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <JsonRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <TableRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <ImageRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <ChartRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'code':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <CodeRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <FileRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <ErrorRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
      
      case 'text':
      default:
        return (
          <div className={containerClasses} style={style}>
            <div className="p-2">
              <TextRenderer content={displayContent} metadata={metadata} />
            </div>
          </div>
        );
    }
  } catch (error) {
    console.error('Error in RichContentRenderer:', error);
    return (
      <div className={`${containerClasses} error-container bg-red-50 border border-red-200 rounded-lg`} style={style}>
        <div className="p-2">
          <ErrorRenderer 
            content={`Rendering error: ${error.message}`} 
            metadata={{ title: 'Rendering Error' }} 
          />
        </div>
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