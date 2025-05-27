// components/rich-content/features/ExportOptions.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { extractDisplayContent, getContentPreview } from '../content-detection/ContentExtractor';
import { detectContentType, CONTENT_TYPES } from '../content-detection/ContentDetector';
import { safeStringify } from '../utils/safeStringify';

const ExportOptions = ({ content, metadata = {}, availableFormats = [] }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState({});
  const [selectedFormats, setSelectedFormats] = useState(new Set());

  // Export format configurations
  const exportConfigs = {
    json: {
      icon: '📄',
      name: 'JSON',
      extension: 'json',
      mimeType: 'application/json',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Structured data with full metadata'
    },
    csv: {
      icon: '📊',
      name: 'CSV',
      extension: 'csv', 
      mimeType: 'text/csv',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Spreadsheet-compatible format'
    },
    txt: {
      icon: '📝',
      name: 'Text',
      extension: 'txt',
      mimeType: 'text/plain',
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'Plain text for easy sharing'
    },
    md: {
      icon: '📋',
      name: 'Markdown',
      extension: 'md',
      mimeType: 'text/markdown',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Formatted text with styling'
    },
    html: {
      icon: '🌐',
      name: 'HTML',
      extension: 'html',
      mimeType: 'text/html',
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'Web-ready document'
    },
    pdf: {
      icon: '📕',
      name: 'PDF',
      extension: 'pdf',
      mimeType: 'application/pdf',
      color: 'bg-red-600 hover:bg-red-700',
      description: 'Print-ready document'
    },
    xlsx: {
      icon: '📈',
      name: 'Excel',
      extension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      description: 'Excel spreadsheet'
    },
    png: {
      icon: '🖼️',
      name: 'PNG Image',
      extension: 'png',
      mimeType: 'image/png',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      description: 'Visual snapshot'
    }
  };

  // Determine available formats based on content type
  const getAvailableFormats = () => {
    const extracted = extractDisplayContent(content);
    const contentType = detectContentType(extracted);
    
    const baseFormats = ['json', 'txt'];
    
    switch (contentType) {
      case CONTENT_TYPES.TABLE:
        return [...baseFormats, 'csv', 'xlsx', 'html', 'pdf'];
      case CONTENT_TYPES.MARKDOWN:
        return [...baseFormats, 'md', 'html', 'pdf'];
      case CONTENT_TYPES.HTML:
        return [...baseFormats, 'html', 'pdf'];
      case CONTENT_TYPES.CODE:
        return [...baseFormats, 'html'];
      case CONTENT_TYPES.CHART:
        return [...baseFormats, 'png', 'html', 'csv'];
      case CONTENT_TYPES.IMAGE:
        return ['png', 'json'];
      default:
        return [...baseFormats, 'md', 'html'];
    }
  };

  const supportedFormats = availableFormats.length > 0 
    ? availableFormats.filter(format => exportConfigs[format])
    : getAvailableFormats();

  // Convert content to different formats
  const convertContent = (format) => {
    const extracted = extractDisplayContent(content);
    const contentType = detectContentType(extracted);
    const title = metadata?.title || 'Export';
    const timestamp = new Date().toISOString();

    switch (format) {
      case 'json':
        return safeStringify({
          title,
          content: extracted.content || extracted,
          contentType,
          metadata: {
            ...metadata,
            exportedAt: timestamp,
            originalFormat: contentType
          }
        }, 2);

      case 'csv':
        if (contentType === CONTENT_TYPES.TABLE && Array.isArray(extracted.content)) {
          const data = extracted.content;
          if (data.length === 0) return 'No data available';
          
          const headers = Object.keys(data[0]);
          const csvHeaders = headers.join(',');
          const csvRows = data.map(row => 
            headers.map(header => `"${String(row[header] || '')}"`).join(',')
          ).join('\n');
          
          return `${csvHeaders}\n${csvRows}`;
        }
        return `Title,Content,Type,Exported\n"${title}","${getContentPreview(content, 1000)}","${contentType}","${timestamp}"`;

      case 'txt':
        const textContent = typeof extracted.content === 'string' 
          ? extracted.content 
          : getContentPreview(content, 5000);
        return `${title}\n${'='.repeat(title.length)}\n\n${textContent}\n\n---\nExported on: ${new Date(timestamp).toLocaleString()}`;

      case 'md':
        const mdContent = typeof extracted.content === 'string' 
          ? extracted.content 
          : getContentPreview(content, 5000);
        return `# ${title}\n\n${mdContent}\n\n---\n*Exported on: ${new Date(timestamp).toLocaleString()}*`;

      case 'html':
        const htmlContent = typeof extracted.content === 'string' 
          ? extracted.content.replace(/\n/g, '<br>')
          : getContentPreview(content, 5000).replace(/\n/g, '<br>');
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
           max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .content { margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
              color: #6b7280; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <strong>Content Type:</strong> ${contentType}<br>
    <strong>Exported:</strong> ${new Date(timestamp).toLocaleString()}
  </div>
  <div class="content">${htmlContent}</div>
  <div class="footer">
    Generated by Workflow Automation System
  </div>
</body>
</html>`;

      default:
        return String(extracted.content || extracted);
    }
  };

  // Handle single format export
  const handleExport = async (format) => {
    if (isExporting) return;

    setIsExporting(true);
    setExportStatus(prev => ({ ...prev, [format]: 'exporting' }));

    try {
      const config = exportConfigs[format];
      const convertedContent = convertContent(format);
      const filename = `${metadata?.title || 'export'}-${Date.now()}.${config.extension}`;

      // Special handling for different formats
      if (format === 'pdf') {
        // For PDF, we'd need a library like jsPDF or send to server
        await exportToPDF(convertedContent, filename);
      } else if (format === 'xlsx') {
        // For Excel, we'd need a library like SheetJS
        await exportToExcel(content, filename);
      } else if (format === 'png') {
        // For PNG, capture screenshot or convert chart
        await exportToImage(content, filename);
      } else {
        // Standard blob download
        const blob = new Blob([convertedContent], { type: config.mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setExportStatus(prev => ({ ...prev, [format]: 'success' }));
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [format]: null }));
      }, 3000);

    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      setExportStatus(prev => ({ ...prev, [format]: 'error' }));
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [format]: null }));
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    if (selectedFormats.size === 0) return;

    for (const format of selectedFormats) {
      await handleExport(format);
      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Placeholder functions for complex exports (would need proper implementation)
  const exportToPDF = async (content, filename) => {
    // Would use jsPDF or server-side PDF generation
    throw new Error('PDF export requires additional library implementation');
  };

  const exportToExcel = async (content, filename) => {
    // Would use SheetJS (xlsx library)
    throw new Error('Excel export requires additional library implementation');
  };

  const exportToImage = async (content, filename) => {
    // Would use html2canvas or similar
    throw new Error('Image export requires additional library implementation');
  };

  // Get button status
  const getButtonStatus = (format) => {
    const status = exportStatus[format];
    switch (status) {
      case 'exporting':
        return { text: 'Exporting...', disabled: true, className: 'opacity-75' };
      case 'success':
        return { text: 'Downloaded ✓', disabled: true, className: 'bg-green-600 text-white' };
      case 'error':
        return { text: 'Failed ✗', disabled: false, className: 'bg-red-600 hover:bg-red-700 text-white' };
      default:
        return { text: 'Export', disabled: false, className: exportConfigs[format].color };
    }
  };

  // Toggle format selection
  const toggleFormat = (format) => {
    const newSelected = new Set(selectedFormats);
    if (newSelected.has(format)) {
      newSelected.delete(format);
    } else {
      newSelected.add(format);
    }
    setSelectedFormats(newSelected);
  };

  if (supportedFormats.length === 0) return null;

  return (
    <div className="export-options mt-6 p-6 bg-gradient-to-br from-emerald-50 via-blue-50 to-teal-50 rounded-xl border border-emerald-200 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-emerald-800 flex items-center">
          <span className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mr-3">
            📤
          </span>
          Export Options
        </h4>
        
        {selectedFormats.size > 0 && (
          <button
            onClick={handleBulkExport}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Export {selectedFormats.size} Selected
          </button>
        )}
      </div>

      {/* Format Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {supportedFormats.map(format => {
          const config = exportConfigs[format];
          const buttonStatus = getButtonStatus(format);
          const isSelected = selectedFormats.has(format);
          
          return (
            <div 
              key={format} 
              className={`relative p-4 bg-white/60 rounded-xl border transition-all duration-200 hover:shadow-md ${
                isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200'
              }`}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2 right-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleFormat(format)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
              </div>
              
              {/* Format info */}
              <div className="mb-3">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{config.icon}</span>
                  <h5 className="font-semibold text-emerald-800">{config.name}</h5>
                </div>
                <p className="text-sm text-emerald-600">{config.description}</p>
              </div>
              
              {/* Export button */}
              <button
                onClick={() => handleExport(format)}
                disabled={buttonStatus.disabled || isExporting}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${buttonStatus.className} text-white
                  ${buttonStatus.disabled ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                `}
              >
                <div className="flex items-center justify-center">
                  {exportStatus[format] === 'exporting' && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  )}
                  {buttonStatus.text}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Export Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-white/60 rounded-lg text-center">
          <div className="text-sm text-emerald-600 mb-1">Content Size</div>
          <div className="text-lg font-semibold text-emerald-800">
            {(JSON.stringify(content).length / 1024).toFixed(1)}KB
          </div>
        </div>
        <div className="p-3 bg-white/60 rounded-lg text-center">
          <div className="text-sm text-emerald-600 mb-1">Available Formats</div>
          <div className="text-lg font-semibold text-emerald-800">
            {supportedFormats.length}
          </div>
        </div>
        <div className="p-3 bg-white/60 rounded-lg text-center">
          <div className="text-sm text-emerald-600 mb-1">Content Type</div>
          <div className="text-lg font-semibold text-emerald-800 capitalize">
            {detectContentType(extractDisplayContent(content))}
          </div>
        </div>
        <div className="p-3 bg-white/60 rounded-lg text-center">
          <div className="text-sm text-emerald-600 mb-1">Selected</div>
          <div className="text-lg font-semibold text-emerald-800">
            {selectedFormats.size}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedFormats(new Set(supportedFormats))}
          className="px-3 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition-colors"
        >
          Select All
        </button>
        <button
          onClick={() => setSelectedFormats(new Set())}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={() => setSelectedFormats(new Set(['json', 'txt']))}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
        >
          Common Formats
        </button>
        <button
          onClick={() => setSelectedFormats(new Set(supportedFormats.filter(f => ['csv', 'xlsx', 'pdf'].includes(f))))}
          className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
        >
          Business Formats
        </button>
      </div>

      {/* Export Tips */}
      <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200">
        <h5 className="font-medium text-blue-800 mb-3 flex items-center">
          <span className="mr-2">💡</span>
          Export Tips
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h6 className="font-medium mb-1">Best Practices:</h6>
            <ul className="space-y-1 text-xs">
              <li>• JSON preserves all data structure and metadata</li>
              <li>• CSV is ideal for spreadsheet applications</li>
              <li>• Markdown maintains formatting for documentation</li>
              <li>• HTML creates shareable web documents</li>
            </ul>
          </div>
          <div>
            <h6 className="font-medium mb-1">File Compatibility:</h6>
            <ul className="space-y-1 text-xs">
              <li>• Excel: .xlsx files open in Microsoft Excel</li>
              <li>• PDF: Universal format for printing and sharing</li>
              <li>• PNG: Visual snapshots for presentations</li>
              <li>• TXT: Compatible with any text editor</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <details className="mt-4">
        <summary className="cursor-pointer text-emerald-700 font-medium hover:text-emerald-800 transition-colors">
          Advanced Export Options
        </summary>
        <div className="mt-3 p-4 bg-white/40 rounded-lg border border-emerald-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Include Metadata
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input type="checkbox" defaultChecked className="mr-2 text-emerald-600" />
                  Export timestamp
                </label>
                <label className="flex items-center text-sm">
                  <input type="checkbox" defaultChecked className="mr-2 text-emerald-600" />
                  Content type information
                </label>
                <label className="flex items-center text-sm">
                  <input type="checkbox" className="mr-2 text-emerald-600" />
                  Processing metadata
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Format Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input type="checkbox" defaultChecked className="mr-2 text-emerald-600" />
                  Pretty formatting
                </label>
                <label className="flex items-center text-sm">
                  <input type="checkbox" className="mr-2 text-emerald-600" />
                  Compress output
                </label>
                <label className="flex items-center text-sm">
                  <input type="checkbox" defaultChecked className="mr-2 text-emerald-600" />
                  Include styling (HTML/PDF)
                </label>
              </div>
            </div>
          </div>
        </div>
      </details>

      {/* Status Messages */}
      {Object.keys(exportStatus).some(key => exportStatus[key] === 'success') && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-800">
            <span className="mr-2">✅</span>
            <span className="text-sm font-medium">
              Export{Object.keys(exportStatus).filter(key => exportStatus[key] === 'success').length > 1 ? 's' : ''} completed successfully!
            </span>
          </div>
        </div>
      )}

      {Object.keys(exportStatus).some(key => exportStatus[key] === 'error') && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-800">
            <span className="mr-2">❌</span>
            <span className="text-sm font-medium">
              Some exports failed. Please try again or contact support if the issue persists.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

ExportOptions.propTypes = {
  content: PropTypes.any.isRequired,
  metadata: PropTypes.object,
  availableFormats: PropTypes.arrayOf(PropTypes.string)
};

export default ExportOptions;