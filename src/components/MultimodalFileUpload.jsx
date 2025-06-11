import React, { useState, useCallback, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon, PhotoIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

const MultimodalFileUpload = ({ 
  onFileProcessed, 
  onError, 
  acceptedTypes = 'image/*,audio/*,.pdf,.docx,.txt,.md,.csv',
  maxSizeMB = 10,
  multiple = false,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // File type detection
  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'document';
    if (file.type.includes('document') || file.name.match(/\.(docx?|txt|md|csv)$/i)) return 'document';
    return 'unknown';
  };

  // File icon based on type
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="w-8 h-8 text-blue-500" />;
      case 'audio':
        return <SpeakerWaveIcon className="w-8 h-8 text-green-500" />;
      case 'document':
        return <DocumentIcon className="w-8 h-8 text-purple-500" />;
      default:
        return <DocumentIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  // File size formatting
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File validation
  const validateFile = (file) => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    const fileType = getFileType(file);
    if (fileType === 'unknown') {
      return 'File type not supported';
    }

    return null;
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Process uploaded files
  const processFiles = async (files) => {
    setProcessing(true);
    
    try {
      for (const file of files) {
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          onError?.(validationError);
          continue;
        }

        // Convert to base64
        const base64Data = await fileToBase64(file);
        const fileType = getFileType(file);

        // Create file info
        const fileInfo = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: fileType,
          size: file.size,
          base64: base64Data,
          originalFile: file,
          timestamp: new Date().toISOString()
        };

        // Add to uploaded files
        setUploadedFiles(prev => [...prev, fileInfo]);

        // Send to backend for processing
        try {
          const response = await fetch('/api/multimodal/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file_data: base64Data,
              filename: file.name,
              file_type: fileType
            })
          });

          if (response.ok) {
            const result = await response.json();
            fileInfo.processed = result;
            fileInfo.success = result.success;
            
            // Notify parent component
            onFileProcessed?.({
              ...fileInfo,
              extractedData: result
            });
          } else {
            throw new Error('Processing failed');
          }
        } catch (error) {
          console.error('File processing error:', error);
          fileInfo.error = error.message;
          fileInfo.success = false;
          onError?.(`Failed to process ${file.name}: ${error.message}`);
        }

        // Update file in state
        setUploadedFiles(prev => prev.map(f => f.id === fileInfo.id ? fileInfo : f));
      }
    } catch (error) {
      console.error('File upload error:', error);
      onError?.(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle file selection
  const handleFiles = useCallback((files) => {
    const fileArray = Array.from(files);
    if (!multiple && fileArray.length > 1) {
      onError?.('Only one file allowed');
      return;
    }
    processFiles(fileArray);
  }, [multiple, onError]);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change handler
  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Trigger file input
  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${processing ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={acceptedTypes}
          onChange={handleChange}
          disabled={processing}
        />

        <div className="flex flex-col items-center space-y-3">
          <CloudArrowUpIcon className={`w-12 h-12 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {processing ? 'Processing files...' : 'Upload multimodal files'}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop or click to select
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports images, audio, documents (max {maxSizeMB}MB each)
            </p>
          </div>

          {processing && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  file.success === undefined
                    ? 'border-blue-200 bg-blue-50'
                    : file.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.type.charAt(0).toUpperCase() + file.type.slice(1)} • {formatFileSize(file.size)}
                    </p>
                    
                    {file.processed && (
                      <div className="mt-1">
                        {file.processed.success ? (
                          <p className="text-xs text-green-600">
                            ✅ Processed with {file.processed.api_used || 'AI'}
                          </p>
                        ) : (
                          <p className="text-xs text-red-600">
                            ❌ {file.processed.error || 'Processing failed'}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">
                        ❌ {file.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.success === undefined && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  
                  {file.success === true && (
                    <span className="text-green-500">✓</span>
                  )}
                  
                  {file.success === false && (
                    <span className="text-red-500">✗</span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Preview */}
      {uploadedFiles.some(f => f.processed?.success) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Extracted Data Preview</h4>
          <div className="space-y-3">
            {uploadedFiles
              .filter(f => f.processed?.success)
              .map((file) => (
                <div key={file.id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">{file.processed.api_used}</span>
                  </div>
                  
                  {file.type === 'image' && file.processed.analysis && (
                    <div className="text-xs">
                      <p><strong>Description:</strong> {file.processed.analysis.description}</p>
                      {file.processed.analysis.extracted_text && (
                        <p><strong>Text:</strong> {file.processed.analysis.extracted_text}</p>
                      )}
                    </div>
                  )}
                  
                  {file.type === 'audio' && file.processed.transcription && (
                    <div className="text-xs">
                      <p><strong>Transcription:</strong> {file.processed.transcription.text}</p>
                    </div>
                  )}
                  
                  {file.type === 'document' && file.processed.content && (
                    <div className="text-xs">
                      <p><strong>Content:</strong> {file.processed.content.substring(0, 200)}...</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultimodalFileUpload; 