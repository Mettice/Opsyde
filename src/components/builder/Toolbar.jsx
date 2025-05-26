// components/Builder/Toolbar.js
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useBuilderUI } from '../../contexts/BuilderUIContext';

const Toolbar = ({
  onAddAgent,
  onAddTask,
  onAddTool,
  onAddChat,
  onExportYAML,
  onExportPython,
  onExportStructured,
  onSaveProject,
  onLoadProject,
  onPreviewWorkflow,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportProject,
  onAddDelay,
  onAddTrigger,
  onAddLogicNode,
}) => {
  // Add state for tooltip visibility and toolbar collapse
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const { toggleTemplateGallery } = useBuilderUI();
  
  // Tooltip content with more detailed descriptions
  const tooltips = {
    addAgent: "Add an AI agent with specific role, goals, and capabilities to your workflow",
    addTask: "Add a task that can be assigned to agents with expected inputs and outputs",
    addTool: "Add a tool that extends agent capabilities (API, search, calculator, etc.)",
    exportYAML: "Export your workflow as a YAML configuration file for CrewAI",
    exportPython: "Generate a complete Python script with all agents, tasks, and tools defined",
    previewWorkflow: "Preview and simulate how your workflow will execute step by step",
    saveProject: "Save your current project to continue editing later",
    loadProject: "Load a previously saved project or import from other platforms",
    exportProject: "Export a complete project with file structure (src/crew/config, main.py, etc.)",
    addChat: "Add a chatbot node that can interact with users through a conversational interface",
    addDelay: "Add a delay node to pause workflow execution for a specified duration",
    addTrigger: "Add a trigger node to start workflow execution",
    addLogicNode: "Add a logic node to create conditional branches in your workflow"
  };
  
  // Function to show tooltip - make it more reliable
  const showTooltip = (id) => {
    // Use setTimeout to ensure state updates properly
    setTimeout(() => {
      setActiveTooltip(id);
    }, 0);
  };
  
  // Function to hide tooltip
  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showImportDropdown && !event.target.closest('.import-dropdown-container')) {
        setShowImportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImportDropdown]);
  
  // Tooltip component with better styling and positioning
  const Tooltip = ({ id }) => {
    if (activeTooltip !== id) return null;
    
    return (
      <div 
        className="fixed z-[9999] bg-gray-800 text-white text-xs rounded-md py-2 px-3 shadow-lg min-w-[200px] max-w-[250px]"
        style={{
          top: 'calc(var(--tooltip-y, 0) - 40px)',
          left: 'var(--tooltip-x, 0)',
          transform: 'translateX(-50%)',
        }}
      >
        {tooltips[id]}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-gray-800"></div>
      </div>
    );
  };
  
  // Update the button implementation to use refs and set tooltip position
  const buttonRefs = useRef({});

  // Import dropdown options with improved icons
  const importOptions = [
    {
      id: 'template',
      label: 'Template Gallery',
      icon: '📚',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'json',
      label: 'Import JSON',
      icon: '📄',
      color: 'bg-green-100 text-green-600'
    },
    // Only show these in dev mode
    ...(window.DEV_MODE ? [
      {
        id: 'zapier',
        label: 'Import from Zapier',
        icon: '⚡',
        color: 'bg-yellow-100 text-yellow-600'
      },
      {
        id: 'make',
        label: 'Import from Make.com',
        icon: '🔄',
        color: 'bg-purple-100 text-purple-600'
      }
    ] : [])
  ];

  // Handle import option selection
  const handleImportSelect = (optionId) => {
    setShowImportDropdown(false);
    
    if (optionId === 'template') {
      // Show template gallery
      toggleTemplateGallery(true);
      return;
    }
    
    // Create a file input element for other import types
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,.flow';
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          // Pass the file content and import type to the load project handler
          onLoadProject(content, optionId);
        } catch (error) {
          console.error('Error parsing imported file:', error);
          alert('Failed to parse the imported file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    
    fileInput.click();
  };

  // Render the collapsed toolbar
  if (isCollapsed) {
    return (
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
        <button 
          className="bg-gray-800 text-white p-3 rounded-r-md shadow-lg hover:bg-gray-700 transition-colors"
          onClick={() => setIsCollapsed(false)}
          title="Expand Toolbar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
    );
  }

  // Common button style for a more compact look
  const buttonStyle = "transition-colors text-white py-1.5 px-3 rounded text-sm flex items-center shadow-sm";

  return (
    <div className="cursor-move select-none relative">
      <div className="bg-white border-b p-2 flex space-x-1.5 overflow-x-auto items-center">
        {/* Collapse button */}
        <button 
          className="bg-gray-200 hover:bg-gray-300 transition-colors text-gray-700 p-1.5 rounded flex items-center justify-center"
          onClick={() => setIsCollapsed(true)}
          title="Collapse Toolbar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* Group buttons by category with separators */}
        <div className="flex space-x-1.5 items-center">
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addAgent = el}
              className={`${buttonStyle} bg-blue-500 hover:bg-blue-600`}
              onClick={onAddAgent}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addAgent) {
                  const rect = buttonRefs.current.addAgent.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addAgent');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Agent</span>
            </button>
            <Tooltip id="addAgent" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addTask = el}
              className={`${buttonStyle} bg-yellow-500 hover:bg-yellow-600`}
              onClick={onAddTask}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addTask) {
                  const rect = buttonRefs.current.addTask.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addTask');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Task</span>
            </button>
            <Tooltip id="addTask" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addTool = el}
              className={`${buttonStyle} bg-green-500 hover:bg-green-600`}
              onClick={onAddTool}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addTool) {
                  const rect = buttonRefs.current.addTool.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addTool');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Tool</span>
            </button>
            <Tooltip id="addTool" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addChat = el}
              className={`${buttonStyle} bg-pink-500 hover:bg-pink-600`}
              onClick={onAddChat}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addChat) {
                  const rect = buttonRefs.current.addChat.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addChat');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Chat</span>
            </button>
            <Tooltip id="addChat" />
          </div>
        </div>
        
        <div className="h-6 border-l border-gray-300 mx-1"></div>
        
        <div className="flex space-x-1.5 items-center">
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.exportYAML = el}
              className={`${buttonStyle} bg-indigo-500 hover:bg-indigo-600`}
              onClick={onExportYAML}
              onMouseEnter={(e) => {
                if (buttonRefs.current.exportYAML) {
                  const rect = buttonRefs.current.exportYAML.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('exportYAML');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>YAML</span>
            </button>
            <Tooltip id="exportYAML" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.exportPython = el}
              className={`${buttonStyle} bg-blue-600 hover:bg-blue-700`}
              onClick={onExportPython}
              onMouseEnter={(e) => {
                if (buttonRefs.current.exportPython) {
                  const rect = buttonRefs.current.exportPython.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('exportPython');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>main.py</span>
            </button>
            <Tooltip id="exportPython" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.exportProject = el}
              className={`${buttonStyle} bg-teal-500 hover:bg-teal-600`}
              onClick={onExportProject}
              onMouseEnter={(e) => {
                if (buttonRefs.current.exportProject) {
                  const rect = buttonRefs.current.exportProject.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('exportProject');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Project</span>
            </button>
            <Tooltip id="exportProject" />
          </div>
        </div>
        
        <div className="h-6 border-l border-gray-300 mx-1"></div>
        
        <div className="flex space-x-1.5 items-center">
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.previewWorkflow = el}
              className={`${buttonStyle} bg-purple-500 hover:bg-purple-600`}
              onClick={onPreviewWorkflow}
              onMouseEnter={(e) => {
                if (buttonRefs.current.previewWorkflow) {
                  const rect = buttonRefs.current.previewWorkflow.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('previewWorkflow');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Preview</span>
            </button>
            <Tooltip id="previewWorkflow" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.saveProject = el}
              className={`${buttonStyle} bg-pink-500 hover:bg-pink-600`}
              onClick={onSaveProject}
              onMouseEnter={(e) => {
                if (buttonRefs.current.saveProject) {
                  const rect = buttonRefs.current.saveProject.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('saveProject');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Save</span>
            </button>
            <Tooltip id="saveProject" />
          </div>
          
          <div className="relative group import-dropdown-container">
            <button 
              ref={el => buttonRefs.current.loadProject = el}
              className={`${buttonStyle} bg-blue-500 hover:bg-blue-600`}
              onClick={() => setShowImportDropdown(!showImportDropdown)}
              onMouseEnter={(e) => {
                if (buttonRefs.current.loadProject) {
                  const rect = buttonRefs.current.loadProject.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('loadProject');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Load</span>
            </button>
            <Tooltip id="loadProject" />
            
            {/* Modal-style import options */}
            {showImportDropdown && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-30 z-[9999]"
                  onClick={() => setShowImportDropdown(false)}
                ></div>
                
                {/* Centered modal */}
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-lg shadow-xl z-[10000] overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">Import Project</h3>
                    <button 
                      onClick={() => setShowImportDropdown(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4">
                    {importOptions.map((option) => (
                      <button
                        key={option.id}
                        className="w-full text-left px-4 py-3 mb-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center transition-colors rounded border border-gray-200 hover:border-blue-200"
                        onClick={() => handleImportSelect(option.id)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${option.color}`}>
                          <span className="text-lg">{option.icon}</span>
                        </div>
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                    
                    <div className="border-t border-gray-200 my-3"></div>
                    
                    <button
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 flex items-center transition-colors rounded border border-gray-200 hover:border-blue-200"
                      onClick={() => {
                        setShowImportDropdown(false);
                        onLoadProject();
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-gray-100 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="font-medium">Load Saved Project</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="h-6 border-l border-gray-300 mx-1"></div>
        
        <div className="flex space-x-1.5 items-center">
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addDelay = el}
              className={`${buttonStyle} bg-amber-500 hover:bg-amber-600`}
              onClick={onAddDelay}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addDelay) {
                  const rect = buttonRefs.current.addDelay.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addDelay');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Delay</span>
            </button>
            <Tooltip id="addDelay" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addTrigger = el}
              className={`${buttonStyle} bg-purple-500 hover:bg-purple-600`}
              onClick={onAddTrigger}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addTrigger) {
                  const rect = buttonRefs.current.addTrigger.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addTrigger');
              }}
              onMouseLeave={hideTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Trigger</span>
            </button>
            <Tooltip id="addTrigger" />
          </div>
          
          <div className="relative group">
            <button 
              ref={el => buttonRefs.current.addLogicNode = el}
              className={`${buttonStyle} bg-yellow-500 hover:bg-yellow-600`}
              onClick={onAddLogicNode}
              onMouseEnter={(e) => {
                if (buttonRefs.current.addLogicNode) {
                  const rect = buttonRefs.current.addLogicNode.getBoundingClientRect();
                  document.documentElement.style.setProperty('--tooltip-x', `${rect.left + rect.width/2}px`);
                  document.documentElement.style.setProperty('--tooltip-y', `${rect.top}px`);
                }
                showTooltip('addLogicNode');
              }}
              onMouseLeave={hideTooltip}
            >
              <span className="mr-1">⚖️</span>
              <span>Logic</span>
            </button>
            <Tooltip id="addLogicNode" />
          </div>
        </div>
        
        <div className="ml-auto flex space-x-1.5">
          <button 
            className={`py-1.5 px-3 rounded text-sm flex items-center ${canUndo ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            onClick={onUndo}
            disabled={!canUndo}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Undo
          </button>
          <button 
            className={`py-1.5 px-3 rounded text-sm flex items-center ${canRedo ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            onClick={onRedo}
            disabled={!canRedo}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            Redo
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Toolbar);