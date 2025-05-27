import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/react/24/solid';

const ModernSidebar = ({ 
  onAddNode, 
  onOpenTemplates, 
  onOpenSmartTools,
  onOpenToolTemplates,
  className = "" 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    nodes: true,
    templates: false,
    inspector: false
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const nodeCategories = [
    {
      title: 'Triggers',
      icon: BoltIcon,
      items: [
        { 
          id: 'trigger', 
          name: 'Trigger', 
          description: 'Start your workflow',
          icon: '⚡',
          color: 'bg-purple-100 border-purple-200'
        }
      ]
    },
    {
      title: 'Agents',
      icon: UserIcon,
      items: [
        { 
          id: 'agent', 
          name: 'AI Agent', 
          description: 'Intelligent assistant',
          icon: '🤖',
          color: 'bg-blue-100 border-blue-200'
        }
      ]
    },
    {
      title: 'Tasks',
      icon: ClipboardDocumentListIcon,
      items: [
        { 
          id: 'task', 
          name: 'Task', 
          description: 'Execute a specific action',
          icon: '📋',
          color: 'bg-green-100 border-green-200'
        }
      ]
    },
    {
      title: 'Tools',
      icon: WrenchScrewdriverIcon,
      items: [
        { 
          id: 'tool_templates', 
          name: 'Add Tool', 
          description: 'Choose from available tools',
          icon: '🔧',
          color: 'bg-orange-100 border-orange-200',
          action: 'openToolTemplates'
        }
      ]
    },
    {
      title: 'I/O',
      icon: ArrowRightCircleIcon,
      items: [
        { 
          id: 'input', 
          name: 'Input', 
          description: 'Collect user input',
          icon: '📥',
          color: 'bg-indigo-100 border-indigo-200'
        },
        { 
          id: 'output', 
          name: 'Output', 
          description: 'Display results',
          icon: '📤',
          color: 'bg-pink-100 border-pink-200'
        }
      ]
    },
    {
      title: 'Logic',
      icon: ClockIcon,
      items: [
        { 
          id: 'logic', 
          name: 'Logic', 
          description: 'Conditional branching',
          icon: '🔀',
          color: 'bg-yellow-100 border-yellow-200'
        },
        { 
          id: 'delay', 
          name: 'Delay', 
          description: 'Wait for a duration',
          icon: '⏱️',
          color: 'bg-gray-100 border-gray-200'
        }
      ]
    }
  ];

  const templates = [
    {
      id: 'customer-support',
      name: 'Customer Support',
      description: 'AI-powered support workflow',
      thumbnail: '🎧'
    },
    {
      id: 'content-creation',
      name: 'Content Creation',
      description: 'Automated content pipeline',
      thumbnail: '✍️'
    },
    {
      id: 'data-processing',
      name: 'Data Processing',
      description: 'ETL and analysis workflow',
      thumbnail: '📊'
    }
  ];

  const filteredNodes = nodeCategories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const handleNodeClick = (nodeType, action) => {
    if (action === 'openToolTemplates') {
      onOpenToolTemplates && onOpenToolTemplates();
    } else if (onAddNode) {
      onAddNode(nodeType);
    }
  };

  return (
    <div 
      className={`
        ${isExpanded ? 'w-80' : 'w-16'} 
        bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out
        hover:w-80 group ${className}
      `}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Collapsed Header */}
      <div className={`p-4 border-b border-gray-200 ${isExpanded ? 'block' : 'hidden group-hover:block'}`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Components</h2>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Collapsed Icons Only */}
      <div className={`${isExpanded ? 'hidden' : 'block group-hover:hidden'} flex-1 p-2`}>
        <div className="space-y-2">
          {nodeCategories.map((category) => (
            <div key={category.title} className="space-y-1">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNodeClick(item.id, item.action)}
                  className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-solid hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-xl"
                  title={item.name}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          ))}
          
          {/* Flow Templates icon */}
          <button
            onClick={() => onOpenTemplates && onOpenTemplates()}
            className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-solid hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 text-xl"
            title="Flow Templates"
          >
            📁
          </button>
          
          {/* Tool Templates icon */}
          <button
            onClick={() => onOpenToolTemplates && onOpenToolTemplates()}
            className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-solid hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 text-xl"
            title="Tool Templates"
          >
            🔧
          </button>
          
          {/* Smart Tools icon */}
          <button
            onClick={() => onOpenSmartTools && onOpenSmartTools()}
            className="w-12 h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-solid hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-xl"
            title="Smart Tools"
          >
            🧠
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`${isExpanded ? 'block' : 'hidden group-hover:block'} flex-1 overflow-y-auto`}>
        {/* Nodes Section */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('nodes')}
            className="flex items-center justify-between w-full text-left mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <WrenchScrewdriverIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Nodes</span>
            </div>
            {expandedSections.nodes ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.nodes && (
            <div className="space-y-4">
              {filteredNodes.map((category) => (
                <div key={category.title}>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {category.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNodeClick(item.id, item.action)}
                        className={`
                          ${item.color} p-3 rounded-lg border-2 border-dashed
                          hover:border-solid hover:shadow-sm transition-all duration-200
                          text-left group cursor-pointer
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{item.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates Section */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => toggleSection('templates')}
            className="flex items-center justify-between w-full text-left mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Templates</span>
            </div>
            {expandedSections.templates ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.templates && (
            <div className="space-y-2">
              <button
                onClick={() => onOpenTemplates && onOpenTemplates()}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📁</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      Flow Templates
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      Browse and apply pre-built workflows
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => onOpenToolTemplates && onOpenToolTemplates()}
                className="w-full p-3 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🔧</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      Tool Templates
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      Add individual tools to your workflow
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => onOpenSmartTools && onOpenSmartTools()}
                className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🧠</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-blue-900 text-sm">
                      Smart Tools
                    </div>
                    <div className="text-xs text-blue-700 truncate">
                      AI-powered tool suggestions
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Inspector Section */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => toggleSection('inspector')}
            className="flex items-center justify-between w-full text-left mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Inspector</span>
            </div>
            {expandedSections.inspector ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.inspector && (
            <div className="text-sm text-gray-600">
              <p>Select a node to view its properties</p>
            </div>
          )}
        </div>
      </div>

      {/* Expand/Collapse Indicator */}
      <div className={`${isExpanded ? 'hidden' : 'block group-hover:hidden'} absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2`}>
        <div className="w-6 h-12 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center shadow-sm">
          <ChevronDoubleRightIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default ModernSidebar; 