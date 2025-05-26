import React, { useState, useRef, useEffect } from 'react';
import GraphMetricsPanel from './GraphMetricsPanel';
import ConnectionRulesPanel from './ConnectionRulesPanel';

export default function FloatingMetricsPanel({ 
  nodes, 
  edges, 
  onHighlightNodes,
  nodeStates = new Map(),
  connectionStates = new Map(),
  isExecuting = false
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('metrics');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(400);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  
  // Handle drag functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && dragRef.current) {
        setPosition({
          x: position.x + e.movementX,
          y: position.y + e.movementY
        });
      }
      
      if (isResizing) {
        const newHeight = Math.max(200, panelHeight + e.movementY);
        setPanelHeight(newHeight);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, isResizing, panelHeight]);
  
  // Handle keyboard accessibility for tabs
  const handleKeyDown = (e, tabId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tabId);
    }
  };
  
  // Toggle theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  
  // Panel theme classes
  const themeClasses = darkMode 
    ? 'bg-gray-800 text-white shadow-lg shadow-gray-900/30' 
    : 'bg-white text-gray-800 shadow-lg';
  
  const headerClasses = darkMode
    ? 'bg-blue-800'
    : 'bg-blue-600';
    
  const tabActiveClasses = darkMode
    ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-400'
    : 'bg-blue-50 text-blue-600 border-b-2 border-blue-500';
    
  const tabInactiveClasses = darkMode
    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100';
    
  const buttonClasses = darkMode
    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-700';
  
  return (
    <div 
      className="fixed z-50 flex flex-col items-end"
      style={{ 
        position: 'absolute',
        top: `${position.y}px`, 
        right: isExpanded ? `${position.x}px` : '4px',
        transition: isDragging ? 'none' : 'all 0.2s ease'
      }}
      ref={panelRef}
    >
      {!isExpanded ? (
        <button 
          onClick={() => setIsExpanded(true)}
          className={`${darkMode ? 'bg-blue-800' : 'bg-blue-600'} hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 transition-all duration-200 shadow-lg`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Flow Analytics
        </button>
      ) : (
        <div 
          className={`rounded-lg overflow-hidden w-[320px] ${themeClasses} transition-all duration-200 transform`}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }}
        >
          {/* Header - Draggable */}
          <div 
            className={`${headerClasses} p-3 flex justify-between items-center cursor-move`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            ref={dragRef}
            role="banner"
            aria-label="Flow Analytics Panel"
          >
            <div className="flex items-center gap-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="font-bold text-white">Flow Analytics</h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleTheme}
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 rounded"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 rounded"
                aria-label="Close panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex ${darkMode ? 'border-b border-gray-700' : 'border-b'}`} role="tablist">
            {['metrics', 'rules', 'debug'].map((tab) => (
              <button 
                key={tab}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-all duration-150 ${activeTab === tab ? tabActiveClasses : tabInactiveClasses}`}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => handleKeyDown(e, tab)}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                id={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div 
            className="overflow-y-auto overflow-x-hidden"
            style={{ height: `${panelHeight}px` }}
          >
            <div className="h-full transition-opacity duration-200" role="tabpanel">
              {activeTab === 'metrics' && (
                <div 
                  className="p-3" 
                  id="panel-metrics"
                  role="tabpanel"
                  aria-labelledby="tab-metrics"
                >
                  <GraphMetricsPanel 
                    nodes={nodes} 
                    edges={edges} 
                    onHighlightNodes={onHighlightNodes}
                    darkMode={darkMode}
                    nodeStates={nodeStates}
                    connectionStates={connectionStates}
                    isExecuting={isExecuting}
                  />
                </div>
              )}
              {activeTab === 'rules' && (
                <div 
                  className="p-3"
                  id="panel-rules"
                  role="tabpanel"
                  aria-labelledby="tab-rules"
                >
                  <ConnectionRulesPanel 
                    onClose={() => setIsExpanded(false)}
                    darkMode={darkMode} 
                  />
                </div>
              )}
              {activeTab === 'debug' && (
                <div 
                  className="p-3"
                  id="panel-debug"
                  role="tabpanel"
                  aria-labelledby="tab-debug"
                >
                  <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <h3 className="font-bold mb-2">Debug Info:</h3>
                    <div className="space-y-1">
                      <div>Nodes: {nodes.length}</div>
                      <div>Edges: {edges.length}</div>
                      <div>Total Elements: {nodes.length + edges.length}</div>
                      <div>Panel Position: {Math.round(position.x)}px, {Math.round(position.y)}px</div>
                      <div>Theme: {darkMode ? 'Dark' : 'Light'}</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => console.log({nodes, edges})}
                        className={`flex-1 ${buttonClasses} px-2 py-1.5 rounded text-xs transition-colors`}
                      >
                        Log Data to Console
                      </button>
                      <button 
                        onClick={() => {
                          setPosition({ x: 0, y: 0 });
                          setPanelHeight(400);
                        }}
                        className={`flex-1 ${buttonClasses} px-2 py-1.5 rounded text-xs transition-colors`}
                      >
                        Reset Position
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Resizer handle */}
          <div 
            className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} cursor-ns-resize flex justify-center items-center hover:bg-blue-400 transition-colors`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          >
            <div className={`w-12 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
          </div>
        </div>
      )}
    </div>
  );
}