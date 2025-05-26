import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const InputNode = memo(({ data, isConnectable, selected }) => {
  // Ensure data.nodeId has a default value
  const nodeId = data.nodeId || `input-node-${Math.random().toString(36).substring(2, 9)}`;
  const [value, setValue] = useState(data.value || '');
  const [filePreview, setFilePreview] = useState(null);
  const [customFields, setCustomFields] = useState(data.customFields || {});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);

  // Extract expected inputs from connected nodes
  const expectedInputs = data.expectedInputs || [];

  // Add a ref for the file input
  const fileInputRef = useRef(null);

  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // Get input type icon - moved before getStatusDisplay
  const getInputTypeIcon = () => {
    const inputType = data.inputType || 'text';
    switch (inputType) {
      case 'file':
        return '📁';
      case 'url':
        return '🔗';
      default:
        return '📝';
    }
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'processing':
        return { icon: '⚡', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'success':
        return { icon: '✅', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'error':
        return { icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'waiting':
        return { icon: '⏳', color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      default:
        return { icon: getInputTypeIcon(), color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
  };

  const statusDisplay = getStatusDisplay();

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

          // Create clean file data structure without DOM elements or React components
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
          console.log('[DEBUG] Sending file data structure:', {
            filename: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
          });

          // Update node data
          setValue(fileData);
          setUploadStatus('File uploaded successfully');

          // Call onValueChange with just the file data
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
    const inputKey = data.inputKey || 'text_input';

    setValue(newValue);

    // Format the value to match the expected structure
    const structuredValue = {
      type: 'text_input',
      value: newValue,
      text_output: newValue
    };

    // structured object so the flow knows where it came from
    if (data.onValueChange) {
      const flowResult = {
        nodeId: nodeId,
        nodeType: 'input',
        label: data.label || '',
        inputKey: inputKey,
        type: 'text_input',
        value: structuredValue
      };
      data.onValueChange(flowResult);
    }
  };

  // Handle edit and delete events
  const handleEditClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Include all necessary data in the event detail
    const event = new CustomEvent('node-edit', { 
      detail: { 
        nodeId: nodeId,
        nodeType: data.nodeType || 'input',
        data: {
          ...data,
          nodeId,
          value,
          customFields,
          filePreview,
          inputType: data.inputType || 'text',
          label: data.label || 'Input',
          variableName: data.variableName,
          isRequired: data.isRequired
        }
      } 
    });
    document.dispatchEvent(event);
  }, [data, nodeId, value, customFields, filePreview]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: nodeId,
        nodeType: data.nodeType || 'input'
      } 
    });
    document.dispatchEvent(event);
  }, [nodeId, data?.nodeType]);

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
    if (!value) {
      // Initialize with empty value but proper structure
      const initialData = {
        type: 'text_input',
        value: '',
        text_output: '',
        nodeId: nodeId,
        nodeType: 'input',
        inputKey: data.inputKey || data.variableName || 'input'
      };
      
      if (data.onValueChange) {
        data.onValueChange(initialData);
      }
    } else if (typeof value === 'string') {
      // String values need structure
      const structuredData = {
        type: 'text_input',
        value: value,
        text_output: value,
        nodeId: nodeId,
        nodeType: 'input',
        inputKey: data.inputKey || data.variableName || 'input'
      };
      
      if (data.onValueChange) {
        data.onValueChange(structuredData);
      }
    }
  }, [value, data.inputKey, data.inputType, data.variableName, data.onValueChange, nodeId]);

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
    <div 
      className={`
        relative group w-80
        bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20
        backdrop-blur-sm border-2 rounded-2xl
        shadow-lg shadow-blue-100/50
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:shadow-blue-200/60 hover:scale-[1.02] hover:-translate-y-1
        ${selected ? 
          'border-blue-400 shadow-blue-300/60 scale-[1.01]' : 
          `${statusDisplay.borderColor} hover:border-blue-300`
        }
        ${status === 'processing' ? 'animate-pulse' : ''}
        ${status === 'error' ? 'animate-shake' : ''}
      `}
    >
      {/* Animated border for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-75 animate-spin-slow -z-10" 
             style={{ padding: '2px' }}>
          <div className="w-full h-full rounded-2xl bg-white"></div>
        </div>
      )}

      {/* Execution Progress Ring */}
      {(status === 'processing' || executionProgress > 0) && (
        <div className="absolute -top-2 -right-2 w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              className="text-gray-200"
            />
            <circle
              cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeDasharray={`${executionProgress * 0.88} 88`}
              className="text-blue-500 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl ${statusDisplay.bgColor} 
              flex items-center justify-center text-2xl
              shadow-inner border ${statusDisplay.borderColor}
              ${status === 'processing' ? 'animate-bounce' : ''}
            `}>
              {statusDisplay.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800 leading-tight">
                {data.label || 'Input'}
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                {inputType} input
              </div>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${statusDisplay.color} ${statusDisplay.bgColor}
          `}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {/* Clear button */}
        {(value || filePreview) && (
          <div className="flex justify-end mb-3">
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors duration-200"
              title="Clear input"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${executionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gray-600">
              ⚡ {executionTime > 0 ? `${executionTime.toFixed(1)}s` : '--'}
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              💰 ${cost > 0 ? cost.toFixed(3) : '0.000'}
            </span>
          </div>
          {isRequired && (
            <span className="flex items-center gap-1 text-red-600">
              * Required
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-3">
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Main Input Section */}
      <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
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
                className="w-full border-2 border-dashed border-blue-200 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:border-blue-400 transition-colors duration-200"
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
              className="w-full p-2 border rounded text-sm focus:border-blue-300 focus:ring focus:ring-blue-200 bg-white/80"
              id={`url-input-${nodeId}`}
              name={`url-input-${nodeId}`}
              aria-label="URL input"
            />
          ) : (
            <textarea
              value={typeof value === 'object' ? value.text_input || '' : value}
              onChange={handleInputChange}
              placeholder="Enter text..."
              rows={3}
              className="w-full p-2 border rounded text-sm focus:border-blue-300 focus:ring focus:ring-blue-200 bg-white/80"
              id={`text-input-${nodeId}`}
              name={`text-input-${nodeId}`}
              aria-label="Text input"
            />
          )}
        </div>
      </div>

      {/* Expected Inputs Section */}
      {expectedInputs.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
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
        </div>
      )}

      {/* Custom Fields Section */}
      <div className="px-4 pb-3">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-700">Custom Fields:</div>
            <button
              onClick={() => setNewFieldKey(newFieldKey ? '' : 'new-field')}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors duration-200"
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
                className="flex-1 text-xs p-2 border rounded bg-white/80"
              />
              <button
                onClick={addCustomField}
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors duration-200"
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
                  className="flex-1 text-xs p-2 border rounded bg-white/80"
                />
                <button
                  onClick={() => deleteCustomField(key)}
                  className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors duration-200"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      {(data.variableName || isRequired) && (
        <div className="px-4 pb-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 p-3">
            <div className="space-y-2">
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
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button
            onClick={handleEditClick}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ top: -8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-4 h-4 bg-gradient-to-r from-blue-600 to-blue-800 border-2 border-white shadow-lg hover:scale-125 transition-transform duration-200"
        style={{ bottom: -8 }}
      />

      {/* Glow effect for selected state */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-blue-400/20 -z-10 blur-xl" />
      )}
    </div>
  );
});

InputNode.propTypes = {
  data: PropTypes.shape({
    nodeId: PropTypes.string,
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
    })),
    executionState: PropTypes.object
  }).isRequired,
  isConnectable: PropTypes.bool,
  selected: PropTypes.bool,
};

InputNode.displayName = 'InputNode';

export default InputNode; 