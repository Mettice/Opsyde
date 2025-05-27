// components/builder/InputPanel.jsx
import React, { useState, useRef, useEffect } from 'react';

export default function InputPanel({ inputs, setInputs, inputSchema = [], nodes = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [filePreviews, setFilePreviews] = useState({});

  // Extract expected inputs from nodes
  const expectedInputs = React.useMemo(() => {
    return (nodes || [])
      .filter(n => n && n.type === "tool" && n.data?.input_key)
      .map(n => ({
        name: n.data.input_key,
        hint: n.data.description || "No description"
      }))
      // Remove duplicates
      .filter((item, index, self) => 
        index === self.findIndex(t => t.name === item.name)
      );
  }, [nodes]);

  // Find missing inputs (expected but not yet added)
  const missingInputs = React.useMemo(() => {
    return expectedInputs.filter(exp => !Object.keys(inputs).includes(exp.name));
  }, [expectedInputs, inputs]);

  // Handle adding a suggested input
  const handleAddSuggested = (suggestion) => {
    setInputs(prev => ({
      ...prev,
      [suggestion.name]: ''
    }));
  };

  // Add a new field
  const addField = () => {
    if (!newFieldKey || newFieldKey === '-- Select input key --') return;
    
    // If the key already exists, don't add it again
    if (Object.keys(inputs).includes(newFieldKey)) {
      setNewFieldKey('');
      return;
    }
    
    setInputs(prev => ({ ...prev, [newFieldKey]: '' }));
    setNewFieldKey('');
  };

  // Handle regular input changes
  const handleInputChange = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  // Handle file uploads for specific fields
  const handleFileUpload = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadStatus(`Uploading ${file.name}...`);
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result;
      setInputs(prev => ({ ...prev, [key]: base64 }));
      setFilePreviews(prev => ({ ...prev, [key]: file.name }));
      setUploadStatus(`✅ Uploaded: ${file.name}`);
    };
    
    reader.onerror = () => {
      setUploadStatus(`❌ Error uploading file`);
    };
    
    reader.readAsDataURL(file); // Base64 encoding
  };

  // Main file upload handler
  const handleMainFileUpload = (file) => {
    if (!file) return;
    
    setUploadStatus('Uploading...');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (file.type.includes('text')) {
          const content = reader.result;
          setInputs(prev => ({
            ...prev,
            file_upload: { filename: file.name, content: content }
          }));
        } else {
          const base64 = reader.result.split(',')[1];
          setInputs(prev => ({
            ...prev,
            file_upload: { filename: file.name, content: base64, type: file.type }
          }));
        }
        setFilePreviews(prev => ({ ...prev, file_upload: file.name }));
        setUploadStatus(`✅ Uploaded: ${file.name}`);
      } catch (error) {
        setUploadStatus(`❌ Error: ${error.message}`);
      }
    };
    
    reader.onerror = () => {
      setUploadStatus(`❌ Error reading file`);
    };
    
    if (file.type.includes('text')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // Delete a field
  const deleteField = (key) => {
    setInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[key];
      return newInputs;
    });
    
    // Also remove from file previews if exists
    if (filePreviews[key]) {
      const updatedPreviews = { ...filePreviews };
      delete updatedPreviews[key];
      setFilePreviews(updatedPreviews);
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [panelRef]);

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
      >
        <span>🧾</span> Inputs {Object.keys(inputs).length > 0 && (
          <span className="bg-blue-700 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
            {Object.keys(inputs).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-10 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-4 z-50">
          <h2 className="text-lg font-bold mb-3 text-gray-800 flex items-center">
            <span className="mr-2">🧾</span> Workflow Inputs
          </h2>
          
          {/* Main file upload section */}
          <div className="mb-4 p-3 border border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
            <h3 className="text-sm font-medium mb-2 text-blue-800">Upload Document</h3>
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.txt,.csv,.json"
              onChange={(e) => handleMainFileUpload(e.target.files[0])}
              className="text-xs w-full mb-1 file:mr-3 file:py-1 file:px-3
                file:rounded file:border-0 file:text-xs file:font-medium
                file:bg-blue-50 file:text-blue-700 hover:file:cursor-pointer
                hover:file:bg-blue-100"
            />
            {uploadStatus && (
              <div className="text-xs mt-2 font-medium">{uploadStatus}</div>
            )}
            {inputs.file_upload && (
              <div className="text-xs mt-2 text-green-600 flex items-center">
                <span className="mr-1">📎</span> {inputs.file_upload.filename}
              </div>
            )}
          </div>
          
          {/* Missing inputs notification */}
          {missingInputs.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 mb-2 font-medium flex items-center">
                <span className="mr-1">👀</span> Missing inputs needed by tools:
              </p>
              <div className="space-y-1.5">
                {missingInputs.map(input => (
                  <div key={input.name} className="flex justify-between items-center">
                    <span className="text-xs font-medium">{input.name}</span>
                    <button 
                      onClick={() => handleAddSuggested(input)}
                      className="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded-md text-yellow-800 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Custom fields */}
          {Object.keys(inputs).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-700">Current Inputs</h3>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                {Object.entries(inputs).map(([key, value]) => {
                  // Skip the file_upload entry as it's handled separately
                  if (key === 'file_upload') return null;
                  
                  const isFileUpload = typeof value === 'string' && value.startsWith('data:');
                  const hint = expectedInputs.find(i => i.name === key)?.hint;
                  
                  return (
                    <div key={key} className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-gray-800">{key}</div>
                        <button
                          onClick={() => deleteField(key)}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      
                      {isFileUpload ? (
                        <div className="mb-2 text-xs text-gray-600 flex items-center">
                          <span className="mr-1">📎</span> {filePreviews[key] || 'Uploaded file'}
                        </div>
                      ) : (
                        <textarea
                          className="w-full p-2 border rounded-md text-sm mb-2 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          rows={2}
                          placeholder={`Value for ${key}`}
                          value={value || ''}
                          onChange={e => handleInputChange(key, e.target.value)}
                        />
                      )}
                      
                      {hint && (
                        <div className="text-xs text-gray-500 mb-2 flex items-start">
                          <span className="mr-1 mt-0.5">💡</span> {hint}
                        </div>
                      )}
                      
                      <label className="text-xs text-gray-600 cursor-pointer inline-block px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => handleFileUpload(e, key)}
                        />
                        <span className="flex items-center">
                          <span className="mr-1">📁</span> Upload File
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add field section */}
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Add New Input</h3>
            <div className="flex items-center gap-2">
              <select
                className="flex-1 border border-gray-300 p-2 rounded-md text-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                value={newFieldKey}
                onChange={e => setNewFieldKey(e.target.value)}
              >
                <option value="">-- Select input key --</option>
                {expectedInputs
                  .filter(input => !Object.keys(inputs).includes(input.name))
                  .map(input => (
                    <option key={input.name} value={input.name}>
                      {input.name}
                    </option>
                  ))
                }
                <option value="custom">Custom key...</option>
              </select>
              <button
                onClick={addField}
                disabled={!newFieldKey || newFieldKey === '-- Select input key --'}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  !newFieldKey || newFieldKey === '-- Select input key --'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                }`}
              >
                Add
              </button>
            </div>
            
            {newFieldKey === 'custom' && (
              <div className="mt-2">
                <input
                  type="text"
                  className="w-full border border-gray-300 p-2 rounded-md text-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  placeholder="Enter custom input name"
                  onChange={e => setNewFieldKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addField()}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
