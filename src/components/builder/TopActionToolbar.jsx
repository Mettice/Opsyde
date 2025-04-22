import React, { useState, useEffect, useRef } from 'react';

export default function TopActionToolbar({ toolbarProps }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNodeGroup, setShowNodeGroup] = useState(false);
  const [showActionGroup, setShowActionGroup] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const toolbarRef = useRef(null);
  const initialOffsetTop = useRef(null);

  // Handle scroll behavior for sticky toolbar
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar) {
      initialOffsetTop.current = toolbar.offsetTop;
      
      const handleScroll = () => {
        if (window.pageYOffset > initialOffsetTop.current) {
          setIsSticky(true);
        } else {
          setIsSticky(false);
        }
      };
      
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    setShowNodeGroup(false);
    setShowActionGroup(false);
  };

  const toggleNodeGroup = () => {
    setShowNodeGroup(!showNodeGroup);
    setShowActionGroup(false);
  };

  const toggleActionGroup = () => {
    setShowActionGroup(!showActionGroup);
    setShowNodeGroup(false);
  };

  return (
    <div 
      ref={toolbarRef}
      className={`w-full px-4 py-2 bg-gray-800 text-white flex flex-col shadow-md transition-all duration-300 z-50 ${
        isSticky ? 'sticky top-0' : ''
      }`}
    >
      {/* Main toolbar row */}
      <div className="flex items-center justify-between">
        {/* Left side - Node actions */}
        <div className="flex items-center space-x-2">
          {!collapsed ? (
            <>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2 text-sm">Nodes:</span>
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
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddTool}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    title="Add a Tool node"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Tool
                  </button>
                  
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
              </div>
              
              <div className="h-6 border-l border-gray-600 mx-2"></div>
              
              <div className="flex items-center">
                <span className="text-gray-400 mr-2 text-sm">More:</span>
                <div className="flex space-x-1">
                  <button 
                    onClick={toolbarProps.onAddChat}
                    className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    title="Add a Chat node"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddDelay}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    title="Add a Delay node"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Delay
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddLogicNode}
                    className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-1 rounded text-sm flex items-center"
                    title="Add a Logic node"
                  >
                    <span className="mr-1">⚖️</span>
                    Logic
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={toggleNodeGroup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                title="Add nodes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nodes
              </button>
              
              {showNodeGroup && (
                <div className="absolute top-12 left-4 bg-gray-800 rounded shadow-lg p-2 z-50 grid grid-cols-2 gap-2">
                  <button 
                    onClick={toolbarProps.onAddAgent}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Agent
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddTask}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Task
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddTool}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Tool
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddTrigger}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Trigger
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddChat}
                    className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddDelay}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Delay
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onAddLogicNode}
                    className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <span className="mr-1">⚖️</span>
                    Logic
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Right side - Actions and collapse button */}
        <div className="flex items-center space-x-2">
          {!collapsed ? (
            <div className="flex items-center">
              <span className="text-gray-400 mr-2 text-sm">Actions:</span>
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
                
                <button 
                  onClick={toolbarProps.onExportYAML}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  title="Export as YAML"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  YAML
                </button>
                
                <button 
                  onClick={toolbarProps.onExportPython}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm flex items-center"
                  title="Export as Python"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  main.py
                </button>
                
                <button 
                  onClick={toolbarProps.onPreviewWorkflow}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  title="Preview workflow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Preview
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={toggleActionGroup}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center"
                title="Show actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                Actions
              </button>
              
              {showActionGroup && (
                <div className="absolute top-12 right-16 bg-gray-800 rounded shadow-lg p-2 z-50 grid grid-cols-2 gap-2">
                  <button 
                    onClick={toolbarProps.onSaveProject}
                    className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onLoadProject}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Load
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onExportYAML}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    YAML
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onExportPython}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    main.py
                  </button>
                  
                  <button 
                    onClick={toolbarProps.onPreviewWorkflow}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm flex items-center col-span-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Preview
                  </button>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={toggleCollapse}
            className="text-xs text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded flex items-center"
            title={collapsed ? "Expand toolbar" : "Collapse toolbar"}
          >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Second row - Undo/Redo controls */}
      {!collapsed && (
        <div className="flex items-center mt-2 space-x-2">
          <div className="flex space-x-1">
            <button 
              onClick={toolbarProps.onUndo}
              disabled={!toolbarProps.canUndo}
              className={`px-2 py-1 rounded text-xs flex items-center ${toolbarProps.canUndo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Undo
            </button>
            <button 
              onClick={toolbarProps.onRedo}
              disabled={!toolbarProps.canRedo}
              className={`px-2 py-1 rounded text-xs flex items-center ${toolbarProps.canRedo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
              Redo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
