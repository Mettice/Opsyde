import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const InputNode = memo(({ data, isConnectable, selected }) => {
  const [value, setValue] = useState(data.value || '');
  const [filePreview, setFilePreview] = useState(null);
  const [customFields, setCustomFields] = useState(data.customFields || {});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);

  // Extract expected inputs from connected nodes
  const expectedInputs = data.expectedInputs || [];

  // Add a ref for the file input
  const fileInputRef = useRef(null);

  const handleUploadClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Enhanced file validation
  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Check if file exists
    if (!file) {
      throw new Error('No file provided for validation');
    }

    // Check file size
    if (file.size === 0) {
      throw new Error('File is empty');
    }

    if (file.size > maxSize) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type "${file.type}" not supported. Please upload PDF, DOC, DOCX, or TXT files`);
    }

    // Log validation success
    console.log('[DEBUG] File validation passed:', {
      filename: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    });

    return true;
  };

  // Enhanced file processing
  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const result = reader.result;
          // Create structured file data
          const fileData = {
            file_upload: {
              filename: file.name,
              content: result,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified
            },
            text_input: '', // Initialize empty text input
            inputKey: data.inputKey || 'file_input',
            type: 'file'
          };

          console.log('File data before sending:', {
            filename: file.name,
            content: result,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
          });

          resolve(fileData);
        } catch (error) {
          reject(new Error('Error processing file: ' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));

      if (file.type.includes('text')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  // Enhanced file upload handler
  const handleFileUpload = async (event) => {
    try {
      setUploadStatus('Uploading...');
      const file = event.target.files[0];

      // Clear previous data if no file selected
      if (!file) {
        console.log('[DEBUG] No file selected, clearing data');
        setValue({ value: {} });
        setUploadStatus('');
        setFilePreview(null);
        return;
      }

      // Set file preview
      setFilePreview(file.name);

      // Validate file
      validateFile(file);

      // Create FileReader instance
      const reader = new FileReader();

      // Handle file reading
      reader.onload = async (e) => {
        try {
          // Get base64 content without data URL prefix
          const base64Content = e.target.result.split(',')[1];

          // Create file data structure
          const fileData = {
            value: {
              file_upload: {
                filename: file.name,
                content: base64Content,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
              }
            },
            inputKey: 'file_upload',
            type: 'file'
          };

          // Log the structure being sent
          console.log('[DEBUG] Sending file data structure:', fileData);

          // Update node data
          setValue(fileData);
          setUploadStatus('File uploaded successfully');

          // Call onValueChange with the complete structure
          if (data.onValueChange) {
            data.onValueChange(fileData);
          }
        } catch (error) {
          console.error('[ERROR] Error processing file:', error);
          setUploadStatus('Error processing file');
          setValue({ value: {} });
        }
      };

      reader.onerror = () => {
        console.error('[ERROR] Error reading file');
        setUploadStatus('Error reading file');
        setValue({ value: {} });
      };

      // Start reading the file
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[ERROR] File upload error:', error.message);
      setUploadStatus(error.message);
      setValue({ value: {} });
    }
  };

  // Handle custom field changes
  const handleCustomFieldChange = (key, value) => {
    setCustomFields(prev => ({
      ...prev,
      [key]: value
    }));

    if (data.onValueChange) {
      data.onValueChange({
        value: value,
        inputKey: key,
        type: 'custom',
        customFields: {
          ...customFields,
          [key]: value
        }
      });
    }
  };

  // Add new custom field
  const addCustomField = () => {
    if (!newFieldKey || customFields[newFieldKey]) return;

    setCustomFields(prev => ({
      ...prev,
      [newFieldKey]: ''
    }));
    setNewFieldKey('');
  };

  // Delete custom field
  const deleteCustomField = (key) => {
    setCustomFields(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Handle regular input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const inputData = {
      text_input: newValue,
      inputKey: data.inputKey || 'text_input',
      type: 'text',
      file_upload: null // Clear any file data
    };

    setValue(inputData);
    setFilePreview(null);
    
    if (data.onValueChange) {
      data.onValueChange(inputData);
    }
  };

  // Handle edit and delete events
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'input'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.nodeId,
        nodeType: data.nodeType || 'input'
      } 
    });
    document.dispatchEvent(event);
  }, [data?.nodeId, data?.nodeType]);

  const inputType = data.inputType || 'text';
  const isRequired = data.isRequired || false;
  
  useEffect(() => {
    // Initialize the value with proper structure
    if (data.inputType === 'file' && !value) {
      setValue({
        filename: null,
        content: null,
        type: null
      });
    }
  }, [data.inputType]);

  useEffect(() => {
    // Ensure the node's output is properly structured for the flow
    if (value && typeof value === 'object' && value.value) {
      // Already properly structured
      if (data.onValueChange) {
        data.onValueChange(value);
      }
    } else {
      // Structure the value properly
      const outputData = {
        value: {
          text_input: typeof value === 'string' ? value : '',
          file_upload: typeof value === 'object' ? value : null
        },
        inputKey: data.inputKey || data.variableName || 'input',
        type: data.inputType || 'text',
        nodeType: 'input'
      };

      if (data.onValueChange) {
        data.onValueChange(outputData);
      }
    }
  }, [value, data.inputKey, data.inputType, data.variableName, data.onValueChange]);

  // Clear input handler
  const handleClear = () => {
    setValue('');
    setFilePreview(null);
    setUploadStatus('');
    setError(null);
    
    if (data.onValueChange) {
      data.onValueChange({
        text_input: '',
        file_upload: null,
        inputKey: data.inputKey || 'text_input',
        type: 'text'
      });
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md w-80 border-2 ${selected ? 'border-blue-500' : 'border-blue-200'}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            {inputType === 'file' ? '📁' : inputType === 'url' ? '🔗' : '📝'}
          </div>
          <div>
            <div className="font-bold text-gray-800">{data.label || 'Input'}</div>
            <div className="text-xs text-gray-500">{inputType} input</div>
          </div>
        </div>
        {(value || filePreview) && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600"
            title="Clear input"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Main Input Section */}
      <div className="mb-4" onClick={e => e.stopPropagation()}>
        {inputType === 'file' ? (
          <>
            <input 
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt"
            />
            <button
              type="button"
              onClick={handleUploadClick}
              className="w-full border-2 border-dashed border-blue-200 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:border-blue-400"
            >
              <div className="flex flex-col items-center justify-center min-h-[120px]">
                <span className="text-2xl mb-2">📄</span>
                {filePreview ? (
                  <div className="text-center">
                    <div className="font-medium">{filePreview}</div>
                    <div className="text-xs text-gray-500 mt-1">Click to change file</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div>Click to upload file</div>
                    <div className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, or TXT</div>
                  </div>
                )}
              </div>
            </button>
            {uploadStatus && (
              <div className={`text-xs mt-2 text-center ${
                uploadStatus.includes('Error') ? 'text-red-500' :
                uploadStatus === 'File uploaded successfully' ? 'text-green-500' :
                'text-blue-500'
              }`}>
                {uploadStatus}
              </div>
            )}
          </>
        ) : inputType === 'url' ? (
          <input
            type="url"
            value={value}
            onChange={handleInputChange}
            placeholder="Enter URL..."
            className="w-full p-2 border rounded text-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            id={`url-input-${data.nodeId}`}
            name={`url-input-${data.nodeId}`}
            aria-label="URL input"
          />
        ) : (
          <textarea
            value={typeof value === 'object' ? value.text_input || '' : value}
            onChange={handleInputChange}
            placeholder="Enter text..."
            rows={3}
            className="w-full p-2 border rounded text-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            id={`text-input-${data.nodeId}`}
            name={`text-input-${data.nodeId}`}
            aria-label="Text input"
          />
        )}
      </div>

      {/* Expected Inputs Section */}
      {expectedInputs.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">Expected Inputs:</div>
          <div className="space-y-2">
            {expectedInputs.map((input, index) => (
              <div key={index} className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center">
                <span>{input.name}</span>
                <span className="text-gray-500">{input.hint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Fields Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-700">Custom Fields:</div>
          <button
            onClick={() => setNewFieldKey(newFieldKey ? '' : 'new-field')}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
          >
            {newFieldKey ? 'Cancel' : 'Add Field'}
          </button>
        </div>

        {/* Add New Field Input */}
        {newFieldKey && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              placeholder="Field name"
              className="flex-1 text-xs p-2 border rounded"
            />
            <button
              onClick={addCustomField}
              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
            >
              Add
            </button>
          </div>
        )}

        {/* Custom Fields List */}
        <div className="space-y-2">
          {Object.entries(customFields).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                placeholder={`Value for ${key}`}
                className="flex-1 text-xs p-2 border rounded"
              />
              <button
                onClick={() => deleteCustomField(key)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="space-y-2 mb-4">
        {data.variableName && (
          <div className="text-xs text-gray-500">
            Variable: <code className="bg-gray-100 px-1 py-0.5 rounded">{data.variableName}</code>
          </div>
        )}
        {isRequired && (
          <div className="text-xs text-red-600">
            Required Input *
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleEditClick}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        >
          Edit
        </button>
        <button
          onClick={handleDeleteClick}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
        >
          Delete
        </button>
      </div>

      {/* Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500 bottom-[-4px]"
      />
    </div>
  );
});

InputNode.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string.isRequired,
    label: PropTypes.string,
    inputType: PropTypes.oneOf(['text', 'file', 'url']),
    inputKey: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    variableName: PropTypes.string,
    isRequired: PropTypes.bool,
    onValueChange: PropTypes.func,
    customFields: PropTypes.object,
    expectedInputs: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      hint: PropTypes.string
    }))
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

InputNode.displayName = 'InputNode';

export default InputNode; 