// components/Builder/Toolbar.js
import React, { useState, useRef } from 'react';

const Toolbar = ({
  onAddAgent,
  onAddTask,
  onAddTool,
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
}) => {
  // Add state for tooltip visibility
  const [activeTooltip, setActiveTooltip] = useState(null);
  
  // Tooltip content with more detailed descriptions
  const tooltips = {
    addAgent: "Add an AI agent with specific role, goals, and capabilities to your workflow",
    addTask: "Add a task that can be assigned to agents with expected inputs and outputs",
    addTool: "Add a tool that extends agent capabilities (API, search, calculator, etc.)",
    exportYAML: "Export your workflow as a YAML configuration file for CrewAI",
    exportPython: "Generate a complete Python script with all agents, tasks, and tools defined",
    previewWorkflow: "Preview and simulate how your workflow will execute step by step",
    saveProject: "Save your current project to continue editing later",
    loadProject: "Load a previously saved project",
    exportProject: "Export a complete project with file structure (src/crew/config, main.py, etc.)",
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

  return (
    <div className="cursor-move select-none">
      <div className="bg-white border-b p-2 flex space-x-2 overflow-x-auto">
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.addAgent = el}
            className="bg-blue-500 hover:bg-blue-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Add Agent</span>
            <span className="w-5 h-5 rounded-full bg-blue-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="addAgent" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.addTask = el}
            className="bg-yellow-500 hover:bg-yellow-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Add Task</span>
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="addTask" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.addTool = el}
            className="bg-blue-400 hover:bg-blue-500 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Add Tool</span>
            <span className="w-5 h-5 rounded-full bg-blue-300 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="addTool" />
        </div>
        
        <div className="h-8 border-l border-gray-300 mx-1"></div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.exportYAML = el}
            className="bg-green-500 hover:bg-green-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Export YAML</span>
            <span className="w-5 h-5 rounded-full bg-green-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="exportYAML" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.exportPython = el}
            className="bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Export main.py</span>
            <span className="w-5 h-5 rounded-full bg-indigo-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="exportPython" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.previewWorkflow = el}
            className="bg-purple-500 hover:bg-purple-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Preview Workflow</span>
            <span className="w-5 h-5 rounded-full bg-purple-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="previewWorkflow" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.saveProject = el}
            className="bg-pink-500 hover:bg-pink-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Save Project</span>
            <span className="w-5 h-5 rounded-full bg-pink-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="saveProject" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.loadProject = el}
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded flex items-center" 
            onClick={onLoadProject}
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
            <span className="mr-2">Load Project</span>
            <span className="w-5 h-5 rounded-full bg-blue-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="loadProject" />
        </div>
        
        <div className="relative group">
          <button 
            ref={el => buttonRefs.current.exportProject = el}
            className="bg-teal-500 hover:bg-teal-600 transition-colors text-white px-4 py-2 rounded flex items-center" 
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
            <span className="mr-2">Export Project</span>
            <span className="w-5 h-5 rounded-full bg-teal-400 text-white flex items-center justify-center text-xs font-bold">?</span>
          </button>
          <Tooltip id="exportProject" />
        </div>
        
        <div className="ml-auto flex space-x-2">
          <button 
            className={`px-4 py-2 rounded ${canUndo ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            onClick={onUndo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button 
            className={`px-4 py-2 rounded ${canRedo ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            onClick={onRedo}
            disabled={!canRedo}
          >
            Redo
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Toolbar);