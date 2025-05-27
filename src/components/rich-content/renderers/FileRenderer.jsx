import React from 'react';
import PropTypes from 'prop-types';

const FileRenderer = ({ content, metadata, displayMode = 'immersive' }) => {
  // Extract file information
  const getFileInfo = () => {
    if (typeof content === 'string') {
      // Handle base64 or URL content
      return {
        name: metadata?.filename || 'file',
        size: metadata?.size || null,
        type: metadata?.type || 'application/octet-stream',
        url: content.startsWith('data:') ? content : null,
        downloadUrl: content.startsWith('http') ? content : null
      };
    }
    
    if (content && typeof content === 'object') {
      return {
        name: content.filename || content.name || 'file',
        size: content.size || null,
        type: content.type || content.mimeType || 'application/octet-stream',
        url: content.url || content.data || null,
        downloadUrl: content.downloadUrl || content.url || null
      };
    }
    
    return {
      name: 'file',
      size: null,
      type: 'application/octet-stream',
      url: null,
      downloadUrl: null
    };
  };

  const fileInfo = getFileInfo();

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎧';
    if (type.includes('text')) return '📝';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('word') || type.includes('document')) return '📋';
    return '📁';
  };

  // Handle download
  const handleDownload = () => {
    if (fileInfo.downloadUrl) {
      window.open(fileInfo.downloadUrl, '_blank');
    } else if (fileInfo.url && fileInfo.url.startsWith('data:')) {
      // Create download link for base64 data
      const link = document.createElement('a');
      link.href = fileInfo.url;
      link.download = fileInfo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (displayMode === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{getFileIcon(fileInfo.type)}</span>
        <span>{fileInfo.name}</span>
        {fileInfo.size && <span className="text-xs">({formatFileSize(fileInfo.size)})</span>}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">
            {getFileIcon(fileInfo.type)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{fileInfo.name}</div>
            <div className="text-sm text-gray-500">
              {fileInfo.type}
              {fileInfo.size && ` • ${formatFileSize(fileInfo.size)}`}
            </div>
          </div>
        </div>
        
        {(fileInfo.downloadUrl || fileInfo.url) && (
          <button
            onClick={handleDownload}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Download
          </button>
        )}
      </div>
      
      {metadata?.description && (
        <div className="mt-3 text-sm text-gray-600">
          {metadata.description}
        </div>
      )}
    </div>
  );
};

FileRenderer.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  metadata: PropTypes.object,
  displayMode: PropTypes.oneOf(['minimal', 'immersive', 'post'])
};

export default FileRenderer; 