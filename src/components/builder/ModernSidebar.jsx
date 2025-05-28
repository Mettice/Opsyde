import React, { useState } from 'react';
import { 
  BoltIcon, 
  UserIcon, 
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  ArrowRightCircleIcon,
  ArrowLeftCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  FolderIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';

const ModernSidebar = ({ 
  onAddNode, 
  onOpenTemplates, 
  onOpenSmartTools,
  onOpenToolTemplates,
  // Project Management
  onSaveProject,
  onLoadProject,
  onExportYAML,
  onExportPython,
  onDuplicateFlow,
  // Execution Controls
  onRunCrew,
  onPreviewWorkflow,
  onTestStates,
  onToggleExecutionMode,
  executionMode = 'hybrid',
  isExecuting = false,
  // UI Controls
  onToggleCompactMode,
  isCompactMode = false,
  // Import
  onShowCrewAIImporter,
  className = "" 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const nodeCategories = [
    {
      title: 'Triggers',
      icon: BoltIcon,
      gradient: 'from-purple-500 to-indigo-600',
      items: [
        { 
          id: 'trigger', 
          name: 'Trigger', 
          description: 'Start workflows with manual, webhook, or scheduled triggers',
          icon: '⚡',
          gradient: 'from-purple-400 to-purple-600',
          shadow: 'shadow-purple-200',
          details: 'Manual • Webhook • Schedule'
        }
      ]
    },
    {
      title: 'Agents',
      icon: UserIcon,
      gradient: 'from-blue-500 to-cyan-600',
      items: [
        { 
          id: 'agent', 
          name: 'AI Agent', 
          description: 'Intelligent assistants with specialized roles',
          icon: '🤖',
          gradient: 'from-blue-400 to-blue-600',
          shadow: 'shadow-blue-200',
          details: 'CrewAI • OpenAI • Custom LLM'
        }
      ]
    },
    {
      title: 'Tasks',
      icon: ClipboardDocumentListIcon,
      gradient: 'from-green-500 to-emerald-600',
      items: [
        { 
          id: 'task', 
          name: 'Task', 
          description: 'Execute specific actions with expected outputs',
          icon: '📋',
          gradient: 'from-green-400 to-green-600',
          shadow: 'shadow-green-200',
          details: 'Sync • Async • Conditional'
        }
      ]
    },
    {
      title: 'Tools',
      icon: WrenchScrewdriverIcon,
      gradient: 'from-orange-500 to-red-600',
      items: [
        { 
          id: 'tool', 
          name: 'Add Tool', 
          description: 'Powerful integrations and utilities',
          icon: '🔧',
          gradient: 'from-orange-400 to-orange-600',
          shadow: 'shadow-orange-200',
          details: '20+ Built-in Tools'
        }
      ]
    },
    {
      title: 'I/O',
      icon: ArrowRightCircleIcon,
      gradient: 'from-indigo-500 to-purple-600',
      items: [
        { 
          id: 'input', 
          name: 'Input', 
          description: 'Collect user input with validation',
          icon: '📥',
          gradient: 'from-indigo-400 to-indigo-600',
          shadow: 'shadow-indigo-200',
          details: 'Text • Number • File • JSON'
        },
        { 
          id: 'output', 
          name: 'Output', 
          description: 'Display results with rich formatting',
          icon: '📤',
          gradient: 'from-pink-400 to-pink-600',
          shadow: 'shadow-pink-200',
          details: 'Rich Content • Charts • Export'
        }
      ]
    },
    {
      title: 'Logic',
      icon: ClockIcon,
      gradient: 'from-yellow-500 to-orange-600',
      items: [
        { 
          id: 'logic', 
          name: 'Logic', 
          description: 'Conditional branching and decisions',
          icon: '🔀',
          gradient: 'from-yellow-400 to-yellow-600',
          shadow: 'shadow-yellow-200',
          details: 'If/Else • Switch • Loops'
        },
        { 
          id: 'delay', 
          name: 'Delay', 
          description: 'Wait for specific duration or condition',
          icon: '⏱️',
          gradient: 'from-gray-400 to-gray-600',
          shadow: 'shadow-gray-200',
          details: 'Seconds • Minutes • Hours'
        }
      ]
    }
  ];

  const handleNodeClick = (nodeType) => {
    if (onAddNode) {
      onAddNode(nodeType);
    }
  };

  return (
    <div 
      className={`
        ${isHovered ? 'w-80' : 'w-16'} 
        bg-gradient-to-br from-slate-50 to-gray-100 border-r border-gray-200 flex flex-col h-full
        backdrop-blur-sm shadow-xl transition-all duration-300 ease-in-out overflow-hidden
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          {isHovered && (
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent whitespace-nowrap">
              Nodes
            </h2>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Core Nodes */}
        <div className="p-4">
          {!isHovered ? (
            // Collapsed view - only icons
            <div className="space-y-3">
              {nodeCategories.map((category) => (
                category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNodeClick(item.id)}
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
                    title={item.name}
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                  </button>
                ))
              ))}
              
              {/* Templates icon */}
              <button
                onClick={() => onOpenTemplates && onOpenTemplates()}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
                title="Flow Templates"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">📁</span>
              </button>
              
              {/* Tool Templates icon */}
              <button
                onClick={() => onOpenToolTemplates && onOpenToolTemplates()}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
                title="Tool Library"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">🔧</span>
              </button>
              
              {/* Smart Tools icon */}
              <button
                onClick={() => onOpenSmartTools && onOpenSmartTools()}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all duration-200 group"
                title="Smart Tools"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">🧠</span>
              </button>
            </div>
          ) : (
            // Expanded view - full content
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm"></div>
                <div className="relative bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search nodes..."
                    className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Core Nodes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  Core Nodes
                </h3>
                <div className="space-y-2">
                  {nodeCategories.map((category) => (
                    category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNodeClick(item.id)}
                        className="w-full p-3 rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-gray-300/50 hover:shadow-lg transition-all duration-200 text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-lg shadow-md ${item.shadow} group-hover:shadow-lg group-hover:scale-105 transition-all duration-200`}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.details}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                  Templates
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onOpenTemplates && onOpenTemplates()}
                    className="w-full p-3 rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-blue-300/50 hover:shadow-lg transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg shadow-md shadow-blue-200 group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                        📁
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">
                          Flow Templates
                        </div>
                        <div className="text-xs text-gray-500">
                          Pre-built workflows
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tools */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                  Tools
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onOpenToolTemplates && onOpenToolTemplates()}
                    className="w-full p-3 rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-orange-300/50 hover:shadow-lg transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-lg shadow-md shadow-orange-200 group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                        🔧
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">
                          Tool Library
                        </div>
                        <div className="text-xs text-gray-500">
                          20+ Built-in Tools
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => onOpenSmartTools && onOpenSmartTools()}
                    className="w-full p-3 rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-purple-300/50 hover:shadow-lg transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-purple-200 group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                        🧠
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">
                          Smart Tools
                        </div>
                        <div className="text-xs text-gray-500">
                          AI-powered suggestions
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #e2e8f0, #cbd5e1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
        }
      `}</style>
    </div>
  );
};

export default ModernSidebar; 