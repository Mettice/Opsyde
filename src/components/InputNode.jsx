import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';
import MultimodalFileUpload from './MultimodalFileUpload';

const InputNode = memo(({ 
  data, 
  isConnectable, 
  selected,
  // Visual enhancement props
  isCompact = false,
  isDimmed = false,
  isHighlighted = false,
  enhancementMode = 'default',
  onHover,
  onUnhover
}) => {
  // Ensure data.nodeId has a default value
  const nodeId = data.nodeId || `input-node-${Math.random().toString(36).substring(2, 9)}`;
  const [value, setValue] = useState(data.value || '');
  const [filePreview, setFilePreview] = useState(null);
  const [multimodalResult, setMultimodalResult] = useState(null); // NEW: Store LLM processing result
  const [customFields, setCustomFields] = useState(data.customFields || {});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error, waiting
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cost, setCost] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Extract expected inputs from connected nodes
  const expectedInputs = data.expectedInputs || [];

  // Add a ref for the file input
  const fileInputRef = useRef(null);

  // Safe data access to prevent errors
  const safeData = {
    label: data.label || 'Input',
    inputType: data.inputType || 'text',
    placeholder: data.placeholder || 'Enter value...',
    isRequired: data.isRequired || false,
    variableName: data.variableName || 'input_value',
    description: data.description || '',
    nodeId: data.nodeId || data.id || ''
  };

  // Simulate execution progress and metrics
  useEffect(() => {
    if (data.executionState) {
      setStatus(data.executionState.status || 'idle');
      setExecutionProgress(data.executionState.progress || 0);
      setExecutionTime(data.executionState.time || 0);
      setCost(data.executionState.cost || 0);
    }
  }, [data.executionState]);

  // NEW: Handle multimodal file processing
  const handleMultimodalFileProcessed = useCallback((fileInfo) => {
    console.log('🎯 Multimodal file processed:', fileInfo);
    
    setStatus('processing');
    
    // Store the full multimodal processing result
    setMultimodalResult({
      type: fileInfo.type,
      filename: fileInfo.name,
      extractedData: fileInfo.extractedData,
      success: fileInfo.success,
      timestamp: new Date().toISOString()
    });
    
    // Create standardized output for downstream nodes
    const standardizedOutput = {
      type: fileInfo.type, // image, audio, document
      filename: fileInfo.name,
      content: fileInfo.extractedData?.content || fileInfo.extractedData?.transcription?.text || fileInfo.extractedData?.analysis?.description,
      extracted_entities: fileInfo.extractedData?.structure?.extracted_entities || [],
      metadata: {
        api_used: fileInfo.extractedData?.api_used,
        processing_timestamp: new Date().toISOString(),
        node_type: 'input_multimodal'
      }
    };
    
    setValue(standardizedOutput);
    setStatus('success');
    
    // Update the node data to pass to downstream nodes
    if (data.onChange) {
      data.onChange({
        ...data,
        value: standardizedOutput,
        multimodalResult: standardizedOutput
      });
    }
  }, [data]);

  // NEW: Handle multimodal processing errors
  const handleMultimodalError = useCallback((errorMessage) => {
    console.error('❌ Multimodal processing error:', errorMessage);
    setError(errorMessage);
    setStatus('error');
    setMultimodalResult(null);
  }, []);

  // Beautiful input-specific colors and status system
  const getStatusConfig = () => {
    const configs = {
      processing: {
        icon: '⚡',
        pulse: 'animate-pulse',
        glow: 'shadow-blue-500/40',
        gradient: 'from-blue-400/20 to-cyan-500/20',
        border: 'border-blue-400/60',
        dot: 'bg-gradient-to-r from-blue-400 to-cyan-600',
        overlay: 'bg-gradient-to-br from-blue-500/10 to-cyan-600/10'
      },
      success: {
        icon: '✅',
        pulse: '',
        glow: 'shadow-green-500/40',
        gradient: 'from-green-400/20 to-emerald-500/20',
        border: 'border-green-400/60',
        dot: 'bg-gradient-to-r from-green-400 to-emerald-500',
        overlay: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10'
      },
      error: {
        icon: '⚠️',
        pulse: 'animate-bounce',
        glow: 'shadow-red-500/40',
        gradient: 'from-red-400/20 to-pink-500/20',
        border: 'border-red-400/60',
        dot: 'bg-gradient-to-r from-red-400 to-pink-500',
        overlay: 'bg-gradient-to-br from-red-500/10 to-pink-600/10'
      },
      waiting: {
        icon: '⏳',
        pulse: 'animate-pulse',
        glow: 'shadow-orange-500/40',
        gradient: 'from-orange-400/20 to-amber-500/20',
        border: 'border-orange-400/60',
        dot: 'bg-gradient-to-r from-orange-400 to-amber-500',
        overlay: 'bg-gradient-to-br from-orange-500/10 to-amber-600/10'
      },
      idle: {
        icon: getInputTypeIcon(),
        pulse: '',
        glow: 'shadow-gray-300/50',
        gradient: 'from-white/90 to-gray-50/80',
        border: 'border-gray-200/70',
        dot: 'bg-gradient-to-r from-gray-400 to-blue-500',
        overlay: 'bg-gradient-to-br from-gray-500/5 to-blue-600/5'
      }
    };
    return configs[status] || configs.idle;
  };

  const statusConfig = getStatusConfig();

  // Beautiful input type specific colors
  const getInputTypeConfig = () => {
    const inputType = safeData.inputType;
    const configs = {
      text: {
        name: 'Text Input',
        colors: {
          primary: 'from-blue-400 to-cyan-600',
          secondary: 'from-blue-50/90 to-cyan-100/80',
          accent: 'bg-gradient-to-r from-blue-500 to-cyan-600',
          text: 'text-blue-700',
          glow: 'shadow-blue-400/30',
          border: 'border-blue-300/50',
          glass: 'bg-gradient-to-br from-blue-500/10 to-cyan-600/10'
        }
      },
      file: {
        name: 'File Input',
        colors: {
          primary: 'from-purple-400 to-violet-600',
          secondary: 'from-purple-50/90 to-violet-100/80',
          accent: 'bg-gradient-to-r from-purple-500 to-violet-600',
          text: 'text-purple-700',
          glow: 'shadow-purple-400/30',
          border: 'border-purple-300/50',
          glass: 'bg-gradient-to-br from-purple-500/10 to-violet-600/10'
        }
      },
      multimodal: { // NEW: Multimodal input type
        name: 'Multimodal Input',
        colors: {
          primary: 'from-indigo-400 to-purple-600',
          secondary: 'from-indigo-50/90 to-purple-100/80',
          accent: 'bg-gradient-to-r from-indigo-500 to-purple-600',
          text: 'text-indigo-700',
          glow: 'shadow-indigo-400/30',
          border: 'border-indigo-300/50',
          glass: 'bg-gradient-to-br from-indigo-500/10 to-purple-600/10'
        }
      },
      url: {
        name: 'URL Input',
        colors: {
          primary: 'from-green-400 to-teal-600',
          secondary: 'from-green-50/90 to-teal-100/80',
          accent: 'bg-gradient-to-r from-green-500 to-teal-600',
          text: 'text-green-700',
          glow: 'shadow-green-400/30',
          border: 'border-green-300/50',
          glass: 'bg-gradient-to-br from-green-500/10 to-teal-600/10'
        }
      }
    };
    return configs[inputType] || configs.text;
  };

  const inputTypeConfig = getInputTypeConfig();

  // Get input type icon
  function getInputTypeIcon() {
    const inputType = safeData.inputType;
    switch (inputType) {
      case 'file':
        return '📁';
      case 'multimodal':
        return '🎭'; // NEW: Multimodal icon
      case 'url':
        return '🔗';
      default:
        return '📝';
    }
  }

  const getDisplayName = () => {
    return safeData.label || safeData.variableName || 'Input Node';
  };

  const getInputDescription = () => {
    if (safeData.description) return safeData.description;
    
    switch (safeData.inputType) {
      case 'text': return 'Text input for entering custom values';
      case 'file': return 'File upload input for documents and files';
      case 'multimodal': return 'AI-powered multimodal input for images, audio, and documents';
      case 'url': return 'URL input for web addresses';
      default: return 'Input node for data collection';
    }
  };

  const getTruncatedValue = () => {
    if (multimodalResult) {
      return `${multimodalResult.type}: ${multimodalResult.filename}`;
    }
    if (!value) return 'No value set';
    if (typeof value === 'object') {
      const jsonStr = JSON.stringify(value);
      return jsonStr.length > 50 ? jsonStr.substring(0, 50) + '...' : jsonStr;
    }
    const stringValue = String(value);
    return stringValue.length > 50 ? stringValue.substring(0, 50) + '...' : stringValue;
  };

  // Legacy file upload handling (kept for compatibility)
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
    
    const editEvent = new CustomEvent('node-edit', {
      detail: {
        nodeId: safeData.nodeId,
        nodeType: 'input',
        data
      }
    });
    document.dispatchEvent(editEvent);
  }, [data, safeData.nodeId]);

  const handleDeleteClick = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const event = new CustomEvent('node-delete', { 
      detail: { 
        nodeId: data.id || safeData.nodeId,
        nodeType: 'input'
      } 
    });
    document.dispatchEvent(event);
  }, [data, safeData.nodeId]);

  // Mouse event handlers for visual enhancements
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

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
    <>
      {/* Rotating shadow/glow effect for processing state */}
      {status === 'processing' && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 rounded-3xl blur-xl animate-spin" 
               style={{ transform: 'scale(1.1)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/15 via-blue-500/15 to-cyan-500/15 rounded-3xl blur-lg animate-spin" 
               style={{ transform: 'scale(1.05)', animationDirection: 'reverse', animationDuration: '3s' }} />
        </div>
      )}

      {/* Main container with glassmorphism and enhanced styling */}
      <div 
        className={`
          relative group h-auto overflow-hidden
          backdrop-blur-xl bg-white/80 border border-white/40
          rounded-3xl shadow-2xl ${statusConfig.glow} ${inputTypeConfig.colors.glow}
          transition-all duration-700 ease-out
          hover:scale-[1.03] hover:shadow-2xl hover:bg-white/90
          hover:backdrop-blur-2xl hover:-translate-y-1
          ${selected ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white/50 shadow-blue-400/40' : ''}
          ${isHighlighted ? 'scale-105 ring-2 ring-purple-400/60 shadow-purple-400/40' : ''}
          ${isDimmed ? 'opacity-50 scale-95' : ''}
          ${statusConfig.pulse}
        `}
        style={{ width: '320px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Beautiful Animated Background Gradients */}
        <div className={`absolute inset-0 ${inputTypeConfig.colors.glass} rounded-3xl`} />
        <div className={`absolute inset-0 ${statusConfig.overlay} rounded-3xl`} />
        
        {/* Floating Glass Orbs for Premium Effect */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm opacity-60" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-tr from-white/30 to-transparent rounded-full blur-sm opacity-40" />
        
        {/* Status indicator dot with beautiful gradient */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`w-4 h-4 rounded-full ${statusConfig.dot} ${statusConfig.pulse} shadow-lg border border-white/50`} />
        </div>

        {/* Main content with glassmorphism container */}
        <div className="relative p-6 space-y-4">
          {/* Header: Input Icon + Type Icon with premium styling */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Premium Input Type Icon */}
              <div className={`
                w-14 h-14 rounded-2xl ${inputTypeConfig.colors.secondary} 
                ${inputTypeConfig.colors.border} border-2
                flex items-center justify-center text-2xl
                shadow-lg backdrop-blur-sm
                group-hover:scale-110 transition-transform duration-300
                relative overflow-hidden
                ${status === 'processing' ? 'animate-spin' : ''}
              `}>
                {/* Icon background glow */}
                <div className={`absolute inset-0 ${inputTypeConfig.colors.accent} opacity-10 rounded-2xl`} />
                <span className="relative z-10">{getInputTypeIcon()}</span>
              </div>
              
              {/* Status Icon with premium effect */}
              <div className="relative">
                <div className={`
                  w-12 h-12 rounded-xl bg-white/60 backdrop-blur-sm
                  flex items-center justify-center text-xl
                  shadow-lg border border-white/40
                  ${statusConfig.pulse}
                `}>
                  {statusConfig.icon}
                </div>
              </div>
            </div>
            
            {/* Action buttons - beautiful glass effect */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <button
                onClick={handleEditClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white/90 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Edit Input"
              >
                <span className="text-lg">✏️</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-10 h-10 rounded-xl bg-white/70 hover:bg-red-100/80 backdrop-blur-sm 
                          flex items-center justify-center transition-all duration-300 
                          hover:scale-110 shadow-lg border border-white/40 hover:shadow-xl"
                title="Delete Input"
              >
                <span className="text-lg">🗑️</span>
              </button>
            </div>
          </div>

          {/* Smart Content Hierarchy with beautiful typography */}
          <div className="space-y-3">
            {/* Primary: Input Name with gradient text */}
            <h3 className={`
              font-bold text-xl leading-tight
              bg-gradient-to-r ${inputTypeConfig.colors.primary} bg-clip-text text-transparent
              group-hover:scale-105 transition-transform duration-300
            `}>
              {getDisplayName()}
            </h3>
            
            {/* Secondary: Input Type with subtle styling */}
            <p className="text-sm text-gray-700 leading-relaxed opacity-90 font-medium">
              {getInputDescription()}
            </p>

            {/* Compact Input Area based on type */}
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/30">
              {/* Text Input */}
              {safeData.inputType === 'text' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    placeholder={safeData.placeholder || "Enter text..."}
                    className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-500 focus:outline-none border-b border-gray-200 focus:border-blue-400 transition-colors pb-1"
                  />
                  {value && (
                    <div className="text-xs text-gray-500 truncate">
                      Current: {getTruncatedValue()}
                    </div>
                  )}
                </div>
              )}

              {/* NEW: Multimodal Input with LLM Processing */}
              {safeData.inputType === 'multimodal' && (
                <div className="space-y-3">
                  <MultimodalFileUpload
                    onFileProcessed={handleMultimodalFileProcessed}
                    onError={handleMultimodalError}
                    multiple={false}
                    className="border-0 bg-transparent p-0"
                    acceptedTypes="image/*,audio/*,.pdf,.docx,.txt,.md,.csv"
                    maxSizeMB={10}
                  />
                  
                  {/* Processing Preview */}
                  {multimodalResult && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-200/50">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {multimodalResult.type === 'image' && <span className="text-lg">🖼️</span>}
                          {multimodalResult.type === 'audio' && <span className="text-lg">🎵</span>}
                          {multimodalResult.type === 'document' && <span className="text-lg">📄</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium text-indigo-700 truncate">
                              {multimodalResult.filename}
                            </h4>
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                              {multimodalResult.type}
                            </span>
                          </div>
                          
                          {/* Show extracted content preview */}
                          {multimodalResult.extractedData && (
                            <div className="space-y-2">
                              {/* For images: show description */}
                              {multimodalResult.type === 'image' && multimodalResult.extractedData.analysis?.description && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">🤖 AI Description:</p>
                                  <p className="text-xs text-gray-700 line-clamp-2">
                                    {multimodalResult.extractedData.analysis.description}
                                  </p>
                                </div>
                              )}
                              
                              {/* For audio: show transcription */}
                              {multimodalResult.type === 'audio' && multimodalResult.extractedData.transcription?.text && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">🎤 Transcription:</p>
                                  <p className="text-xs text-gray-700 line-clamp-2">
                                    {multimodalResult.extractedData.transcription.text}
                                  </p>
                                </div>
                              )}
                              
                              {/* For documents: show content preview */}
                              {multimodalResult.type === 'document' && multimodalResult.extractedData.content && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">📄 Content Preview:</p>
                                  <p className="text-xs text-gray-700 line-clamp-2">
                                    {multimodalResult.extractedData.content.substring(0, 100)}...
                                  </p>
                                </div>
                              )}
                              
                              {/* Show API used */}
                              {multimodalResult.extractedData.api_used && (
                                <div className="flex items-center gap-1 pt-1">
                                  <span className="text-xs text-gray-500">Processed with:</span>
                                  <span className="text-xs text-indigo-600 font-medium">
                                    {multimodalResult.extractedData.api_used}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50/80 backdrop-blur-sm rounded-lg p-3 border border-red-200/50">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">⚠️</span>
                        <span className="text-xs text-red-700">{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload */}
              {safeData.inputType === 'file' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx,.jpg,.png,.csv"
                      />
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                        <span className="text-sm">📁</span>
                        <span className="text-sm text-gray-600">
                          {filePreview ? filePreview.name : 'Choose file...'}
                        </span>
                      </div>
                    </label>
                    {filePreview && (
                      <button
                        onClick={handleClear}
                        className="text-red-500 hover:text-red-700 text-sm"
                        title="Clear file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {uploadStatus && (
                    <div className="text-xs text-blue-600">{uploadStatus}</div>
                  )}
                  {error && (
                    <div className="text-xs text-red-600">{error}</div>
                  )}
                </div>
              )}

              {/* URL Input */}
              {safeData.inputType === 'url' && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={value}
                    onChange={handleInputChange}
                    placeholder={safeData.placeholder || "Enter URL..."}
                    className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-500 focus:outline-none border-b border-gray-200 focus:border-blue-400 transition-colors pb-1"
                  />
                  {value && (
                    <div className="text-xs text-gray-500 truncate">
                      URL: {getTruncatedValue()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer: Input Type Badge + Status */}
          <div className="flex items-center justify-between pt-3 border-t border-white/30">
            <div className={`
              px-4 py-2 rounded-full ${inputTypeConfig.colors.secondary}
              ${inputTypeConfig.colors.text} text-sm font-bold
              shadow-lg backdrop-blur-sm border border-white/40
              hover:scale-105 transition-transform duration-300
            `}>
              {inputTypeConfig.name}
            </div>
            
            {/* Required indicator with glass effect */}
            {safeData.isRequired && (
              <div className="px-3 py-1 rounded-lg bg-red-50/80 backdrop-blur-sm border border-red-200/40 shadow-md">
                <div className="text-xs text-red-600 font-medium">
                  * Required
                </div>
              </div>
            )}
          </div>

          {/* Execution progress bar with beautiful styling */}
          {status === 'processing' && executionProgress > 0 && (
            <div className="space-y-2 pt-2">
              <div className="w-full bg-white/40 backdrop-blur-sm rounded-full h-2 shadow-inner border border-white/30">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${inputTypeConfig.colors.accent} shadow-lg`}
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 text-center font-medium bg-white/40 backdrop-blur-sm rounded-lg py-1 px-2">
                {executionProgress}% • {executionTime}s • ${cost.toFixed(3)}
              </div>
            </div>
          )}
        </div>

        {/* Connection handles with beautiful styling */}
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 border-2 border-white shadow-xl rounded-full"
        />
      </div>

      {/* Rich Tooltip with premium glassmorphism */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 z-50 w-80 p-5 
                       bg-gray-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl 
                       border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Tooltip content with beautiful styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-lg">{getInputTypeIcon()}</span>
              <div className="font-bold text-cyan-300">Input Details</div>
            </div>
            
            {/* Input Description */}
            <div className="text-sm leading-relaxed opacity-90">
              {getInputDescription()}
            </div>
            
            {/* Variable Name */}
            {safeData.variableName && (
              <div>
                <div className="font-semibold text-green-300 pt-2 flex items-center gap-2">
                  <span>🏷️</span>Variable Name
                </div>
                <div className="text-sm leading-relaxed opacity-90">{safeData.variableName}</div>
              </div>
            )}
            
            {/* Current Value */}
            {value && (
              <div>
                <div className="font-semibold text-blue-300 pt-2 flex items-center gap-2">
                  <span>💾</span>Current Value
                </div>
                <div className="text-sm leading-relaxed opacity-90 max-h-20 overflow-y-auto">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                </div>
              </div>
            )}
            
            <div className="flex justify-between pt-3 border-t border-gray-700 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span>📝</span>Type: {inputTypeConfig.name}
              </span>
              <span className="flex items-center gap-1">
                <span>⚡</span>Status: {status}
              </span>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 
                         bg-gray-900 rotate-45 border-l border-t border-gray-700/50"></div>
        </div>
      )}
    </>
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
  isCompact: PropTypes.bool,
  isDimmed: PropTypes.bool,
  isHighlighted: PropTypes.bool,
  enhancementMode: PropTypes.string,
  onHover: PropTypes.func,
  onUnhover: PropTypes.func,
};

InputNode.displayName = 'InputNode';

export default InputNode; 