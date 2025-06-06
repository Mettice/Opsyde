import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { HuggingFaceToolKit } from '../../data/toolkits';

const DraggableHuggingFaceTool = ({ tool, onDrop }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'huggingface-tool',
    item: {
      type: 'tool',
      toolData: {
        id: `${tool.id}-${Date.now()}`,
        type: 'tool',
        position: { x: 0, y: 0 },
        data: {
          label: tool.title,
          description: tool.description,
          toolType: 'huggingface',
          provider: tool.provider,
          task: tool.task,
          model: tool.model,
          category: tool.category,
          config: tool.config,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          verified: tool.verified,
          averageResponseTime: tool.averageResponseTime,
          businessValue: tool.businessValue,
          useCases: tool.useCases,
          icon: getToolIcon(tool.task),
          nodeId: `${tool.id}-${Date.now()}`,
          nodeType: 'tool'
        }
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [tool]);

  const getToolIcon = (task) => {
    const iconMap = {
      'summarization': '📄',
      'text-classification': '😊',
      'question-answering': '❓',
      'zero-shot-classification': '🏷️',
      'text-generation': '✍️',
      'feature-extraction': '🧠'
    };
    return iconMap[task] || '🤖';
  };

  const getResponseTimeColor = (time) => {
    const seconds = parseFloat(time.replace('s', ''));
    if (seconds < 4) return 'text-green-600';
    if (seconds < 7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div
      ref={drag}
      className={`
        group relative bg-white border rounded-lg p-4 cursor-grab
        hover:shadow-lg transition-all duration-200
        ${isDragging ? 'opacity-50 rotate-3 scale-105' : 'opacity-100'}
        ${tool.verified ? 'border-green-200 hover:border-green-300' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      {/* Verified Badge */}
      {tool.verified && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <span>✓</span>
          <span>Verified</span>
        </div>
      )}

      {/* Tool Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl">{getToolIcon(tool.task)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{tool.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{tool.description}</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className={`font-medium ${getResponseTimeColor(tool.averageResponseTime)}`}>
          ⚡ {tool.averageResponseTime}
        </span>
        <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {tool.category}
        </span>
      </div>

      {/* Model Info */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Model</div>
        <div className="text-sm font-mono bg-gray-50 px-2 py-1 rounded text-gray-700">
          {tool.model}
        </div>
      </div>

      {/* Business Value */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Business Value</div>
        <div className="text-sm text-gray-700">{tool.businessValue}</div>
      </div>

      {/* Use Cases Preview */}
      {tool.useCases && tool.useCases.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">Use Cases</div>
          <div className="text-xs text-gray-600">
            {tool.useCases.slice(0, 2).map((useCase, index) => (
              <div key={index} className="truncate">{useCase}</div>
            ))}
            {tool.useCases.length > 2 && (
              <div className="text-gray-400">+{tool.useCases.length - 2} more...</div>
            )}
          </div>
        </div>
      )}

      {/* Drag Indicator */}
      <div className="absolute bottom-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6L6 10l4 4 4-4-4-4z"/>
        </svg>
      </div>
    </div>
  );
};

const HuggingFaceToolPalette = ({ isVisible, onClose, onToolDrop }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isVisible) return null;

  const tools = HuggingFaceToolKit.tools || [];
  const categories = ['all', ...new Set(tools.map(tool => tool.category))];

  const filteredTools = tools.filter(tool => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.task.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🤗 HuggingFace AI Toolkit
                <span className="bg-green-500 text-xs px-2 py-1 rounded-full">
                  {HuggingFaceToolKit.successRate} Success Rate
                </span>
              </h2>
              <p className="text-blue-100 mt-1">
                {HuggingFaceToolKit.description} • {tools.length} Production-Ready Tools
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {category === 'all' ? 'All Tools' : category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toolkit Stats */}
        <div className="p-4 bg-blue-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {HuggingFaceToolKit.metadata.totalTools}
              </div>
              <div className="text-sm text-gray-600">Total Tools</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {HuggingFaceToolKit.metadata.avgResponseTime}
              </div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {categories.length - 1}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map(tool => (
                <DraggableHuggingFaceTool
                  key={tool.id}
                  tool={tool}
                  onDrop={onToolDrop}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No tools found</h3>
              <p className="text-gray-500">
                Try adjusting your search or category filter.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              💡 <strong>Tip:</strong> Drag tools directly onto your workflow canvas
            </div>
            <div className="flex items-center gap-4">
              <span>🤗 Powered by HuggingFace</span>
              <span>✅ Production Tested</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HuggingFaceToolPalette; 