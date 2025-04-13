import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from './HelpTooltip';

/**
 * Modal component for editing node properties
 */
const EditModal = ({ isOpen, onClose, onSave, nodeData, nodeType, availableDependencies = [] }) => {
  // Initialize form data with default values
  const [formData, setFormData] = useState({
    label: '',
    role: '',
    description: '',
    goal: '',
    backstory: '',
    llmModel: 'gpt-4',
    allowDelegation: false,
    verbose: true,
    toolType: 'api',
    apiEndpoint: '',
    apiKey: '',
    parameters: '',
    expectedOutput: '',
    async: false,
    dependencies: []
  });

  // Track if form has been modified
  const [isModified, setIsModified] = useState(false);
  
  // Populate form data when nodeData changes
  useEffect(() => {
    if (nodeData) {
      console.log("Setting form data from node data:", nodeData);
      
      // Create a clean copy without any potential circular references
      const cleanData = {
        label: nodeData.label || '',
        role: nodeData.role || '',
        description: nodeData.description || '',
        goal: nodeData.goal || '',
        backstory: nodeData.backstory || '',
        llmModel: nodeData.llmModel || 'gpt-4',
        allowDelegation: nodeData.allowDelegation || false,
        verbose: nodeData.verbose !== undefined ? nodeData.verbose : true,
        toolType: nodeData.toolType || 'api',
        apiEndpoint: nodeData.apiEndpoint || '',
        apiKey: nodeData.apiKey || '',
        parameters: nodeData.parameters || '',
        expectedOutput: nodeData.expectedOutput || '',
        async: nodeData.async || false,
        dependencies: nodeData.dependencies || []
      };
      
      setFormData(cleanData);
      setIsModified(false);
    }
  }, [nodeData]);
  
  // Generic handler for input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsModified(true);
  }, []);

  // Toggle API key visibility
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Format API key for display
  const formatApiKey = (key) => {
    if (!key) return '';
    return showApiKey ? key : '••••••••••••••••';
  };

  // Return null if modal is not open
  if (!isOpen) return null;

  // Use a default value if nodeType is undefined
  const currentNodeType = nodeType || 'agent';

  // Validate form and trigger save
  const handleSave = () => {
    if (!formData.label.trim()) {
      alert('Name is required!');
      return;
    }
    
    // Create a clean copy of the formData to pass to onSave
    const cleanedFormData = { ...formData };
    
    // Perform additional validation if needed
    if (currentNodeType === 'tool' && formData.toolType === 'api' && formData.apiEndpoint) {
      // Simple URL validation
      try {
        new URL(formData.apiEndpoint);
      } catch (e) {
        // Only validate if something is entered
        if (formData.apiEndpoint.trim()) {
          alert('Please enter a valid API endpoint URL');
          return;
        }
      }
    }
    
    onSave(cleanedFormData);
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // Close when clicking the backdrop, but not when clicking the modal itself
        if (e.target === e.currentTarget) {
          if (isModified) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
              onClose();
            }
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="bg-white p-6 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto" onClick={(e) => { if (e) e.stopPropagation(); }}>
        <h2 className="text-xl font-bold mb-4 flex items-center">
          Edit {currentNodeType === 'agent' ? 'Agent' : currentNodeType === 'task' ? 'Task' : 'Tool'}
          <HelpTooltip type={currentNodeType} />
        </h2>

        {/* Name Field (Common to All Types) */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-1 flex items-center">
            Name
            <HelpTooltip type={currentNodeType} field="label" />
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Agent-Specific Fields */}
        {currentNodeType === 'agent' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Role
                <HelpTooltip type="agent" field="role" />
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., Researcher, Writer, Analyst"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Goal
                <HelpTooltip type="agent" field="goal" />
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="What is this agent trying to achieve?"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Backstory
                <HelpTooltip type="agent" field="backstory" />
              </label>
              <textarea
                value={formData.backstory}
                onChange={(e) => handleInputChange('backstory', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Background information that shapes the agent's perspective"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                LLM Model
                <HelpTooltip type="agent" field="llmModel" />
              </label>
              <select
                value={formData.llmModel}
                onChange={(e) => handleInputChange('llmModel', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="allowDelegation"
                checked={formData.allowDelegation}
                onChange={(e) => handleInputChange('allowDelegation', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="allowDelegation" className="text-gray-700 flex items-center">
                Allow Delegation
                <HelpTooltip type="agent" field="allowDelegation" />
              </label>
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="verbose"
                checked={formData.verbose}
                onChange={(e) => handleInputChange('verbose', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="verbose" className="text-gray-700 flex items-center">
                Verbose Output
                <HelpTooltip type="agent" field="verbose" />
              </label>
            </div>
          </>
        )}

        {/* Task-Specific Fields */}
        {currentNodeType === 'task' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="task" field="description" />
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Detailed description of what needs to be done"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Expected Output
                <HelpTooltip type="task" field="expectedOutput" />
              </label>
              <textarea
                value={formData.expectedOutput}
                onChange={(e) => handleInputChange('expectedOutput', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="What should this task produce?"
              />
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="async"
                checked={formData.async}
                onChange={(e) => handleInputChange('async', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="async" className="text-gray-700 flex items-center">
                Asynchronous Execution
                <HelpTooltip type="task" field="async" />
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1">Dependencies</label>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-500 mb-2">
                  Dependencies are automatically detected from connections, but you can specify dependency types:
                </p>
                {formData.dependencies && formData.dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <span className="text-sm font-medium mr-2">{dep.label}:</span>
                    <select
                      value={dep.type}
                      onChange={(e) => {
                        const newDeps = [...formData.dependencies];
                        newDeps[index] = { ...newDeps[index], type: e.target.value };
                        setFormData({ ...formData, dependencies: newDeps });
                      }}
                      className="text-sm p-1 border rounded"
                    >
                      <option value="data">Data Dependency</option>
                      <option value="execution">Execution Dependency</option>
                      <option value="optional">Optional</option>
                    </select>
                  </div>
                ))}
                {(!formData.dependencies || formData.dependencies.length === 0) && (
                  <p className="text-sm text-gray-400 italic">No dependencies detected. Connect this task to other tasks to create dependencies.</p>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Tool-Specific Fields */}
        {currentNodeType === 'tool' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Description
                <HelpTooltip type="tool" field="description" />
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="What does this tool do?"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Tool Type
                <HelpTooltip type="tool" field="toolType" />
              </label>
              <select
                value={formData.toolType}
                onChange={(e) => handleInputChange('toolType', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="api">API</option>
                <option value="search">Search</option>
                <option value="calculator">Calculator</option>
                <option value="file_io">File I/O</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {formData.toolType === 'api' && (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1 flex items-center">
                    API Endpoint
                    <HelpTooltip type="tool" field="apiEndpoint" />
                  </label>
                  <input
                    type="text"
                    value={formData.apiEndpoint}
                    onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-1 flex items-center">
                    <span>API Key (optional)</span>
                    <HelpTooltip type="tool" field="apiKey" />
                    <button 
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="ml-2 text-gray-500 hover:text-gray-700 text-xs p-1"
                      title={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? "🔒" : "👁️"}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={formatApiKey(formData.apiKey)}
                      onChange={(e) => handleInputChange('apiKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={showApiKey ? "" : "••••••••••••••••"}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-gray-700 mb-1 flex items-center">
                Parameters
                <HelpTooltip type="tool" field="parameters" />
              </label>
              <textarea
                value={formData.parameters}
                onChange={(e) => handleInputChange('parameters', e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="Parameters the tool accepts (one per line)"
              />
            </div>
          </>
        )}

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => {
              if (isModified) {
                if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Define PropTypes for type safety and documentation
EditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  nodeData: PropTypes.object,
  nodeType: PropTypes.oneOf(['agent', 'task', 'tool']),
  availableDependencies: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      name: PropTypes.string
    })
  )
};

export default EditModal;