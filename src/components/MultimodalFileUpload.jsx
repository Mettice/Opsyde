import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon, PhotoIcon, SpeakerWaveIcon, TableCellsIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useLLMMode } from '../contexts/LLMContext';
import { ApiKeyNavigator } from './shared/ApiKeyNavigator';    
// If you have a BYOK context/hook, import it here
// import { useBYOK } from '../contexts/BYOKContext';

const LLM_OPTIONS = [
  { value: 'auto', label: 'Auto (Best for file)' },
  { value: 'openai', label: 'OpenAI (GPT-4/4V)' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  // Add more as needed
];

const DEFAULT_PROMPTS = {
  csv: 'Extract each row as a JSON object with name, email, role, and company. Output as a JSON array.',
  document: 'Extract key information as a JSON object. Output as a JSON array if multiple records.',
  image: 'Describe the image and extract any text as JSON.',
  audio: 'Transcribe the audio and summarize as JSON.',
  json: 'Summarize the JSON content and extract key fields.',
  zip: 'List the files in the ZIP and extract structured data from each if possible.'
};

const LLM_MODELS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  gemini: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
  ],
  claude: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ]
};

const MultimodalFileUpload = ({ 
  onFileProcessed, 
  onError, 
  acceptedTypes = 'image/*,audio/*,.pdf,.docx,.txt,.md,.csv,.xlsx,.json,.zip',
  maxSizeMB = 25, // Increased from 10MB to 25MB for documents
  multiple = false,
  className = '',
  triggerData = null, // NEW: Accept trigger data for processing
  autoProcessTriggerData = true // NEW: Auto-process trigger data
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(null);
  const [triggerProcessed, setTriggerProcessed] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState('auto');
  const [selectedModel, setSelectedModel] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const fileInputRef = useRef(null);
  const [availableLLMs, setAvailableLLMs] = useState([]);
  const [llmWarning, setLlmWarning] = useState('');
  const [availableApiKeys, setAvailableApiKeys] = useState({});
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);

  // LLM mode and BYOK context
  const { llmModeEnabled, smartMappingEnabled } = useLLMMode();
  // const { userKeys } = useBYOK(); // Uncomment if you have BYOK context
  const userKeys = window.USER_API_KEYS || {}; // Fallback if no BYOK context

  // NEW: Process trigger data when it becomes available
  useEffect(() => {
    if (triggerData && autoProcessTriggerData && !triggerProcessed) {
      console.log('🔗 Auto-processing trigger data:', triggerData);
      processTriggerData(triggerData);
      setTriggerProcessed(true);
    }
  }, [triggerData, autoProcessTriggerData, triggerProcessed]);

  // Fetch BYOK keys on mount (AgentEditor style)
  useEffect(() => {
    async function fetchKeys() {
      setLoadingApiKeys(true);
      try {
        const res = await fetch('/api/user-settings/api-keys');
        const data = await res.json();
        if (data.success && data.data && data.data.api_keys) {
          setAvailableApiKeys(data.data.api_keys);
          const llms = [
            { value: 'auto', label: 'Auto (Best for file)', available: true },
            ...(data.data.api_keys.openai ? [{ value: 'openai', label: 'OpenAI (GPT-4/4V)', available: true }] : []),
            ...(data.data.api_keys.gemini ? [{ value: 'gemini', label: 'Gemini (Google)', available: true }] : []),
            ...(data.data.api_keys.claude ? [{ value: 'claude', label: 'Claude (Anthropic)', available: true }] : [])
          ];
          setAvailableLLMs(llms);
          if (!llms.find(opt => opt.value === selectedLLM && opt.available)) {
            setSelectedLLM('auto');
          }
        } else {
          setAvailableLLMs([{ value: 'auto', label: 'Auto (Best for file)', available: true }]);
        }
      } catch (e) {
        setAvailableLLMs([{ value: 'auto', label: 'Auto (Best for file)', available: true }]);
      } finally {
        setLoadingApiKeys(false);
      }
    }
    fetchKeys();
  }, []);

  // Warn if user selects unavailable LLM
  useEffect(() => {
    if (selectedLLM !== 'auto' && !availableLLMs.find(opt => opt.value === selectedLLM && opt.available)) {
      setLlmWarning('No API key found for this LLM provider. Please add your key in settings.');
    } else {
      setLlmWarning('');
    }
  }, [selectedLLM, availableLLMs]);

  // Update model selection when provider changes
  useEffect(() => {
    setSelectedModel('');
  }, [selectedLLM]);

  // Enhanced file type detection with ZIP support
  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'document';
    if (file.name.endsWith('.csv')) return 'csv';
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'spreadsheet';
    if (file.name.endsWith('.json')) return 'json';
    if (file.name.endsWith('.zip') || file.type === 'application/zip') return 'zip';
    if (file.type.includes('document') || file.name.match(/\.(docx?|txt|md)$/i)) return 'document';
    return 'unknown';
  };

  // Enhanced file icons with ZIP support
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="w-8 h-8 text-blue-500" />;
      case 'audio':
        return <SpeakerWaveIcon className="w-8 h-8 text-green-500" />;
      case 'csv':
        return <TableCellsIcon className="w-8 h-8 text-orange-500" />;
      case 'spreadsheet':
        return <ChartBarIcon className="w-8 h-8 text-green-600" />;
      case 'json':
        return <DocumentTextIcon className="w-8 h-8 text-indigo-500" />;
      case 'zip':
        return <span className="w-8 h-8 text-purple-500 text-2xl">📦</span>;
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

  // Enhanced file validation with ZIP support
  const validateFile = (file) => {
    const fileType = getFileType(file);
    
    // Different size limits for different file types
    let sizeLimit = maxSizeMB;
    if (fileType === 'image') sizeLimit = Math.min(maxSizeMB, 15); // 15MB for images
    if (fileType === 'audio') sizeLimit = Math.min(maxSizeMB, 50); // 50MB for audio
    if (fileType === 'zip') sizeLimit = Math.min(maxSizeMB, 100); // 100MB for ZIP files
    if (['csv', 'spreadsheet', 'json', 'document'].includes(fileType)) sizeLimit = maxSizeMB; // Full limit for docs
    
    // Check file size
    if (file.size > sizeLimit * 1024 * 1024) {
      return `File size must be less than ${sizeLimit}MB for ${fileType} files`;
    }

    // Check file type
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

  // Enhanced CSV parsing for preview
  const parseCSVContent = (content) => {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return null;
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, Math.min(6, lines.length)).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {});
      });
      
      return {
        headers,
        rows,
        totalRows: lines.length - 1,
        previewRows: rows.length
      };
    } catch (error) {
      console.error('CSV parsing error:', error);
      return null;
    }
  };

  // Helper to get default prompt for file type
  const getDefaultPrompt = (fileType) => DEFAULT_PROMPTS[fileType] || DEFAULT_PROMPTS.document;

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
          timestamp: new Date().toISOString(),
          processingProgress: 0
        };

        // Add to uploaded files
        setUploadedFiles(prev => [...prev, fileInfo]);

        // Build context for LLM-centric and BYOK
        const context = {
          llm_mode_enabled: llmModeEnabled,
          smart_mapping_enabled: smartMappingEnabled,
          user_keys: availableApiKeys,
          file_type: fileType,
          file_size: file.size,
          preferred_llm: selectedLLM,
          llm_model: selectedModel,
          prompt: customPrompt || getDefaultPrompt(fileType)
        };

        // Send to backend for processing
        try {
          // Update progress
          fileInfo.processingProgress = 25;
          setUploadedFiles(prev => prev.map(f => f.id === fileInfo.id ? fileInfo : f));

          const response = await fetch('/api/multimodal/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file_data: base64Data,
              filename: file.name,
              file_type: fileType,
              context
            })
          });

          fileInfo.processingProgress = 75;
          setUploadedFiles(prev => prev.map(f => f.id === fileInfo.id ? fileInfo : f));

          if (response.ok) {
            const result = await response.json();
            fileInfo.processed = result;
            fileInfo.success = result.success;
            fileInfo.processingProgress = 100;
            
            // Enhanced processing for CSV files
            if (fileType === 'csv' && result.content) {
              fileInfo.csvData = parseCSVContent(result.content);
            }
            
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
          fileInfo.processingProgress = 0;
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

  // Toggle expanded preview
  const togglePreview = (fileId) => {
    setExpandedPreview(expandedPreview === fileId ? null : fileId);
  };

  // NEW: Process trigger data that may contain files or URLs
  const processTriggerData = async (data) => {
    setProcessing(true);
    
    try {
      console.log('🔗 Processing trigger data for multimodal input:', data);
      
      // Check for file URLs in trigger data
      const fileUrls = extractFileUrlsFromTriggerData(data);
      
      if (fileUrls.length > 0) {
        console.log(`🔗 Found ${fileUrls.length} file URLs in trigger data`);
        
        // Process each URL as a "file"
        for (const url of fileUrls) {
          try {
            const filename = url.split('/').pop() || 'trigger_file';
            const fileInfo = {
              id: Date.now() + Math.random(),
              name: filename,
              type: 'url',
              size: 0, // Unknown size for URLs
              url: url,
              fromTrigger: true,
              timestamp: new Date().toISOString(),
              processingProgress: 0
            };
            
            setUploadedFiles(prev => [...prev, fileInfo]);
            
            // Send URL to backend for processing
            const context = {
              llm_mode_enabled: llmModeEnabled,
              smart_mapping_enabled: smartMappingEnabled,
              user_keys: availableApiKeys,
              file_type: 'url',
              source: 'trigger',
              trigger_data: data,
              preferred_llm: selectedLLM,
              llm_model: selectedModel,
              prompt: customPrompt || getDefaultPrompt('url')
            };
            
            const response = await fetch('/api/multimodal/process-url', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                file_url: url,
                filename: filename,
                context: context
              })
            });
            
            fileInfo.processingProgress = 75;
            setUploadedFiles(prev => prev.map(f => f.id === fileInfo.id ? fileInfo : f));
            
            if (response.ok) {
              const result = await response.json();
              fileInfo.processed = result;
              fileInfo.success = result.success;
              fileInfo.processingProgress = 100;
              
              onFileProcessed?.({
                ...fileInfo,
                extractedData: result
              });
            } else {
              throw new Error('URL processing failed');
            }
            
            setUploadedFiles(prev => prev.map(f => f.id === fileInfo.id ? fileInfo : f));
            
          } catch (urlError) {
            console.error('❌ Failed to process URL from trigger:', urlError);
          }
        }
      } else {
        // No file URLs, but we can still process the trigger data as structured input
        console.log('🔗 No file URLs found, processing trigger data as structured input');
        
        const triggerFileInfo = {
          id: Date.now() + Math.random(),
          name: 'trigger_data.json',
          type: 'trigger_data',
          size: JSON.stringify(data).length,
          fromTrigger: true,
          timestamp: new Date().toISOString(),
          processingProgress: 100,
          processed: {
            success: true,
            type: 'trigger_data',
            content: JSON.stringify(data, null, 2),
            trigger_metadata: data
          },
          success: true
        };
        
        setUploadedFiles(prev => [...prev, triggerFileInfo]);
        
        onFileProcessed?.({
          ...triggerFileInfo,
          extractedData: triggerFileInfo.processed
        });
      }
      
    } catch (error) {
      console.error('❌ Error processing trigger data:', error);
      onError?.(`Failed to process trigger data: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Extract file URLs from various trigger data formats
  const extractFileUrlsFromTriggerData = (data) => {
    const urls = [];
    
    try {
      if (typeof data === 'object' && data !== null) {
        // Check common patterns for file URLs
        const checkForUrls = (obj, path = []) => {
          if (Array.isArray(obj)) {
            obj.forEach((item, index) => checkForUrls(item, [...path, index]));
          } else if (typeof obj === 'object' && obj !== null) {
            Object.entries(obj).forEach(([key, value]) => {
              if (typeof value === 'string' && (
                value.startsWith('http') && (
                  value.includes('.pdf') || value.includes('.jpg') || 
                  value.includes('.png') || value.includes('.zip') ||
                  value.includes('.csv') || value.includes('.xlsx')
                )
              )) {
                urls.push(value);
              } else if (typeof value === 'object') {
                checkForUrls(value, [...path, key]);
              }
            });
          }
        };
        
        checkForUrls(data);
        
        // Also check specific known patterns
        if (data.attachments && Array.isArray(data.attachments)) {
          data.attachments.forEach(att => {
            if (att.url) urls.push(att.url);
          });
        }
        
        if (data.files && Array.isArray(data.files)) {
          data.files.forEach(file => {
            if (typeof file === 'string' && file.startsWith('http')) {
              urls.push(file);
            } else if (file.url) {
              urls.push(file.url);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Error extracting URLs from trigger data:', error);
    }
    
    return [...new Set(urls)]; // Remove duplicates
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* LLM Selection and Prompt UI */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">LLM Provider</label>
          <select
            className="w-full border rounded-md px-2 py-1 text-sm"
            value={selectedLLM}
            onChange={e => setSelectedLLM(e.target.value)}
            disabled={processing || loadingApiKeys}
          >
            {availableLLMs.map(opt => (
              <option key={opt.value} value={opt.value} disabled={!opt.available}>{opt.label}{!opt.available ? ' (No key)' : ''}</option>
            ))}
          </select>
          {llmWarning && <div className="text-xs text-red-600 mt-1">{llmWarning}</div>}
          {selectedLLM !== 'auto' && (
            <div className="text-xs text-gray-500 mt-1">
              {availableApiKeys[selectedLLM] ? 'Key available' : 'No key'}
            </div>
          )}
          <div className="mt-2">
            <ApiKeyNavigator 
              availableApiKeys={availableApiKeys} 
              loadingApiKeys={loadingApiKeys}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {loadingApiKeys ? 'Loading API keys...' : 'Manage API Keys'}
            </ApiKeyNavigator>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
          <select
            className="w-full border rounded-md px-2 py-1 text-sm"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            disabled={processing || selectedLLM === 'auto' || !LLM_MODELS[selectedLLM]}
          >
            <option value="">{selectedLLM === 'auto' ? 'Auto-select model' : 'Select a model'}</option>
            {LLM_MODELS[selectedLLM]?.map(model => (
              <option key={model.value} value={model.value}>{model.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Extraction Prompt</label>
          <textarea
            className="w-full border rounded-md px-2 py-1 text-sm resize-y min-h-[48px] max-h-40"
            placeholder="e.g. Extract name, email, role as JSON array"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            disabled={processing}
          />
        </div>
      </div>
      {/* Enhanced Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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

        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            dragActive ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <CloudArrowUpIcon className={`w-8 h-8 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          
          <div>
            <p className="text-xl font-semibold text-gray-900">
              {processing ? 'Processing files...' : 'Upload multimodal files'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop or click to select files
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs text-gray-400">
              <span>📷 Images</span>
              <span>🎵 Audio</span>
              <span>📄 Documents</span>
              <span>📊 CSV/Excel</span>
              <span>🔤 JSON</span>
              <span>📦 ZIP</span>
              <span>🔗 URLs</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Max {maxSizeMB}MB per file
            </p>
          </div>

          {processing && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600 font-medium">Processing with AI...</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Uploaded Files ({uploadedFiles.length})</h4>
            <span className="text-xs text-gray-500">🧠 AI-Powered Processing</span>
          </div>
          
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`rounded-xl border shadow-sm transition-all duration-200 ${
                  file.success === undefined
                    ? 'border-blue-200 bg-blue-50'
                    : file.success
                    ? 'border-green-200 bg-green-50 hover:shadow-md'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className="capitalize font-medium">{file.type}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.size)}</span>
                        {file.csvData && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600 font-medium">{file.csvData.totalRows} rows</span>
                          </>
                        )}
                      </div>
                      
                      {/* Processing Progress */}
                      {file.processingProgress > 0 && file.processingProgress < 100 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-blue-600">Processing...</span>
                            <span className="text-blue-600">{file.processingProgress}%</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${file.processingProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Processing Status */}
                      {file.processed && (
                        <div className="mt-2">
                          {file.processed.success ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-green-600 font-medium">
                                ✅ Processed with {file.processed.api_used || 'AI'}
                              </span>
                              {file.processed.warning && (
                                <span className="text-xs text-orange-600">⚠️ Limited processing</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-red-600 font-medium">
                              ❌ {file.processed.error || 'Processing failed'}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {file.error && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ❌ {file.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {file.success === undefined && file.processingProgress === 0 && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    
                    {file.success === true && (
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500 text-lg">✓</span>
                        {(file.csvData || (file.processed && file.processed.content)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreview(file.id);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                          >
                            {expandedPreview === file.id ? 'Hide' : 'Preview'}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {file.success === false && (
                      <span className="text-red-500 text-lg">✗</span>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Enhanced Preview Section */}
                {expandedPreview === file.id && file.success && (
                  <div className="border-t border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-800">Extracted Data Preview</h5>
                      <span className="text-xs text-gray-500">{file.processed?.api_used || 'AI Processing'}</span>
                    </div>
                    
                    {/* CSV Table Preview */}
                    {file.csvData && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 text-sm">
                            <span className="font-medium text-orange-600">📊 CSV Data</span>
                            <span className="text-gray-500">{file.csvData.totalRows} total rows</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{file.csvData.headers.length} columns</span>
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                {file.csvData.headers.map((header, idx) => (
                                  <th key={idx} className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {file.csvData.rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  {file.csvData.headers.map((header, headerIdx) => (
                                    <td key={headerIdx} className="px-3 py-2 text-gray-600 border-b border-gray-100">
                                      {row[header] || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {file.csvData.totalRows > file.csvData.previewRows && (
                          <div className="text-center">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Showing {file.csvData.previewRows} of {file.csvData.totalRows} rows
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Other File Types Preview */}
                    {!file.csvData && file.processed && (
                      <div className="space-y-3">
                        {file.type === 'image' && file.processed.analysis && (
                          <div>
                            <div className="text-sm font-medium text-blue-600 mb-2">🖼️ Image Analysis</div>
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><strong>Description:</strong> {file.processed.analysis.description}</p>
                              {file.processed.analysis.extracted_text && (
                                <p><strong>Text Found:</strong> {file.processed.analysis.extracted_text}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {file.type === 'audio' && file.processed.transcription && (
                          <div>
                            <div className="text-sm font-medium text-green-600 mb-2">🎵 Audio Transcription</div>
                            <div className="text-sm text-gray-700">
                              <p>{file.processed.transcription.text}</p>
                            </div>
                          </div>
                        )}
                        
                        {file.type === 'document' && file.processed.content && (
                          <div>
                            <div className="text-sm font-medium text-purple-600 mb-2">📄 Document Content</div>
                            <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                {file.processed.content.substring(0, 1000)}
                                {file.processed.content.length > 1000 && '...'}
                              </pre>
                            </div>
                          </div>
                        )}
                        
                        {file.type === 'json' && file.processed.content && (
                          <div>
                            <div className="text-sm font-medium text-indigo-600 mb-2">🔤 JSON Structure</div>
                            <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                              <pre className="text-xs text-gray-700">
                                {JSON.stringify(JSON.parse(file.processed.content.substring(0, 1000)), null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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