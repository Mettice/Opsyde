import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({ onUpload, acceptedTypes = '*', maxSize = 10485760 }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    setError(null);
    setUploading(true);

    try {
      const file = acceptedFiles[0];
      
      // Check file size
      if (file.size > maxSize) {
        throw new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      }

      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          const fileData = {
            filename: file.name,
            content: base64Data,
            type: file.type,
            size: file.size
          };
          
          await onUpload(fileData);
        } catch (err) {
          setError(err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Error reading file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  }, [maxSize, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${error ? 'border-red-500 bg-red-50' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="text-gray-600">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Uploading...
          </div>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop the file here</p>
        ) : (
          <div>
            <p className="text-gray-600">Drag & drop a file here, or click to select</p>
            <p className="text-sm text-gray-500 mt-1">
              {acceptedTypes === '*' ? 'Any file type accepted' : `Accepted types: ${acceptedTypes}`}
            </p>
            <p className="text-sm text-gray-500">
              Max size: {maxSize / 1024 / 1024}MB
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 