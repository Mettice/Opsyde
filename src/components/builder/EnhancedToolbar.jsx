import React, { useState, useRef, useEffect } from 'react';
import HelpTooltip from '../HelpTooltip';

export default function EnhancedToolbar({ toolbarProps }) {
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [ioDropdownOpen, setIODropdownOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false); // New dropdown state
  const moreDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const ioDropdownRef = useRef(null);
  const toolsDropdownRef = useRef(null); // New dropdown ref

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
      if (ioDropdownRef.current && !ioDropdownRef.current.contains(event.target)) {
        setIODropdownOpen(false);
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target)) {
        setToolsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full px-4 py-2 bg-gray-800 text-white flex items-center justify-between shadow-md z-40">
      {/* Left side - Node buttons */}
      <div className="flex items-center space-x-4">
        {/* Primary node types */}
        <div className="flex space-x-1">
          <button 
            onClick={toolbarProps.onAddAgent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
            title="Add an Agent node"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Agent
            <HelpTooltip type="agent" />
          </button>
          
          <button 
            onClick={toolbarProps.onAddTask}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center"
            title="Add a Task node"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Task
            <HelpTooltip type="task" />
          </button>
          
          {/* Updated Tools dropdown */}
          <div className="relative" ref={toolsDropdownRef}>
            <button 
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
              title="Add Tools"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tools
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 ml-1 transition-transform ${toolsDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <HelpTooltip type="tool" />
            </button>
            
            {toolsDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg p-2 z-50 min-w-[200px]">
                {/* Smart Tools Section */}
                <div className="mb-2 px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Smart AI Tools</div>
                <button 
                  onClick={() => {
                    toolbarProps.onShowSmartTools();
                    setToolsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
                >
                  <span className="mr-2">🤖</span>
                  Smart Tool Selector
                  <span className="ml-auto text-xs text-green-400">NEW</span>
                </button>
                
                <div className="my-2 border-t border-gray-700"></div>
                
                {/* Traditional Tools Section */}
                <div className="mb-2 px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Traditional Tools</div>
                <button 
                  onClick={() => {
                    toolbarProps.onAddTool();
                    setToolsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
                >
                  <span className="mr-2">🔧</span>
                  Tool Templates
                </button>
                
                {/* Quick Access to Popular Smart Tools */}
                <div className="my-2 border-t border-gray-700"></div>
                <div className="mb-2 px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Quick Access</div>
                <button 
                  onClick={() => {
                    // You can add a quick action for popular tools
                    toolbarProps.onQuickAddSmartTool && toolbarProps.onQuickAddSmartTool('text_generation', 'gpt4');
                    setToolsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
                >
                  <span className="mr-2">💬</span>
                  GPT-4 Text Gen
                </button>
                
                <button 
                  onClick={() => {
                    toolbarProps.onQuickAddSmartTool && toolbarProps.onQuickAddSmartTool('image_generation', 'dalle');
                    setToolsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
                >
                  <span className="mr-2">🎨</span>
                  DALL-E Image Gen
                </button>
                
                <button 
                  onClick={() => {
                    toolbarProps.onQuickAddSmartTool && toolbarProps.onQuickAddSmartTool('web_search', 'serper');
                    setToolsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
                >
                  <span className="mr-2">🔍</span>
                  Web Search
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={toolbarProps.onAddTrigger}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center"
            title="Add a Trigger node"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Trigger
          </button>
        </div>
        
        {/* Input/Output dropdown - unchanged */}
        <div className="relative" ref={ioDropdownRef}>
          <button 
            onClick={() => setIODropdownOpen(!ioDropdownOpen)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <span>I/O</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 ml-1 transition-transform ${ioDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {ioDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg p-2 z-50 min-w-[180px]">
              <div className="mb-2 px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Input Nodes</div>
              <button 
                onClick={() => {
                  toolbarProps.onAddInputNode('text');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">📝</span>
                Text Input
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddInputNode('file');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">📁</span>
                File Upload
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddInputNode('url');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">🔗</span>
                URL Input
              </button>
              
              <div className="my-2 border-t border-gray-700"></div>
              
              <div className="mb-2 px-3 py-1 text-xs text-gray-400 uppercase font-semibold">Output Nodes</div>
              <button 
                onClick={() => {
                  toolbarProps.onAddOutputNode('webhook');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">🔗</span>
                Webhook Output
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddOutputNode('discord');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">💬</span>
                Discord Output
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddOutputNode('sheets');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">📊</span>
                Sheets Output
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddOutputNode('email');
                  setIODropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">📧</span>
                Email Output
              </button>
            </div>
          )}
        </div>
        
        {/* More dropdown - unchanged */}
        <div className="relative" ref={moreDropdownRef}>
          <button 
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <span>More</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 ml-1 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {moreDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg p-2 z-50 min-w-[120px]">
              <button 
                onClick={() => {
                  toolbarProps.onAddChat();
                  setMoreDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddDelay();
                  setMoreDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Delay
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onAddLogicNode();
                  setMoreDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <span className="mr-2">⚖️</span>
                Logic
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Right side - Actions - unchanged */}
      <div className="flex items-center space-x-2">
        {/* Save/Load buttons */}
        <div className="flex space-x-1">
          <button 
            onClick={toolbarProps.onSaveProject}
            className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded text-sm flex items-center"
            title="Save your workflow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
          
          <button 
            onClick={toolbarProps.onLoadProject}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
            title="Load a workflow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Load
          </button>
        </div>
        
        {/* Export dropdown */}
        <div className="relative" ref={exportDropdownRef}>
          <button 
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 ml-1 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {exportDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded shadow-lg p-2 z-50 min-w-[120px]">
              <button 
                onClick={() => {
                  toolbarProps.onExportYAML();
                  setExportDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                YAML
                <HelpTooltip type="export" field="yaml" />
              </button>
              
              <button 
                onClick={() => {
                  toolbarProps.onExportPython();
                  setExportDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                main.py
                <HelpTooltip type="export" field="python" />
              </button>
            </div>
          )}
        </div>
        
        {/* Preview button */}
        <button 
          onClick={toolbarProps.onPreviewWorkflow}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm flex items-center"
          title="Preview workflow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Preview
          <HelpTooltip type="preview" />
        </button>
        
        {/* Undo/Redo buttons */}
        <div className="flex space-x-1 ml-2">
          <button 
            onClick={toolbarProps.onUndo}
            disabled={!toolbarProps.canUndo}
            className={`px-2 py-1 rounded text-sm flex items-center ${toolbarProps.canUndo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
            title="Undo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <button 
            onClick={toolbarProps.onRedo}
            disabled={!toolbarProps.canRedo}
            className={`px-2 py-1 rounded text-sm flex items-center ${toolbarProps.canRedo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
            title="Redo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
        
        {/* Execution mode toggle */}
        <div className="ml-2">
          <button
            onClick={toolbarProps.onToggleExecutionMode}
            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm flex items-center"
            title={
              toolbarProps.executionMode === 'local' 
                ? 'Local Mode: Visualize flow execution in the browser' 
                : toolbarProps.executionMode === 'backend' 
                  ? 'Backend Mode: Execute with AI services on the server'
                  : 'Hybrid Mode: Visualize locally while executing on the server'
            }
          >
            <span className="mr-1">
              {toolbarProps.executionMode === 'local' 
                ? '💻' 
                : toolbarProps.executionMode === 'backend' 
                  ? '🌐' 
                  : '⚡'}
            </span>
            <span className="mr-1">
              {toolbarProps.executionMode === 'local' 
                ? 'Local' 
                : toolbarProps.executionMode === 'backend' 
                  ? 'Backend' 
                  : 'Hybrid'}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}