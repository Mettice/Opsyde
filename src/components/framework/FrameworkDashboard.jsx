import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FrameworkDashboard = () => {
  const [frameworkCapabilities, setFrameworkCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [recommendedWorkflows, setRecommendedWorkflows] = useState([]);
  const [activeMetrics, setActiveMetrics] = useState({});

  useEffect(() => {
    loadAllCapabilities();
    generateWorkflowRecommendations();
  }, []);

  const loadAllCapabilities = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/tools/frameworks/all-capabilities');
      if (response.ok) {
        const data = await response.json();
        setFrameworkCapabilities(data);
        calculateMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load framework capabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data) => {
    const frameworks = data.frameworks || {};
    const available = Object.values(frameworks).filter(f => f.available).length;
    const total = Object.keys(frameworks).length;
    
    setActiveMetrics({
      availabilityRate: (available / total * 100).toFixed(1),
      totalFrameworks: total,
      availableFrameworks: available,
      totalFeatures: Object.values(frameworks).reduce((acc, f) => {
        if (f.available && f.features) {
          return acc + Object.values(f.features).filter(Boolean).length;
        }
        return acc;
      }, 0),
      totalProviders: [...new Set(Object.values(frameworks).flatMap(f => 
        f.supported_providers || []
      ))].length
    });
  };

  const generateWorkflowRecommendations = () => {
    const workflows = [
      {
        id: 'research_analysis',
        title: '🔬 Advanced Research & Analysis',
        description: 'Multi-agent research pipeline with document processing',
        frameworks: ['langchain', 'llamaindex', 'autogen'],
        complexity: 'Advanced',
        useCase: 'Research Teams',
        estimatedTime: '15-30 min',
        steps: [
          'AutoGen Research Agent collects initial data',
          'LlamaIndex processes and indexes documents', 
          'LangChain agent performs deep analysis',
          'AutoGen Critic reviews and validates findings'
        ],
        benefits: ['Comprehensive research', 'Multi-perspective analysis', 'Automated validation'],
        icon: '🔬'
      },
      {
        id: 'content_generation',
        title: '✍️ Intelligent Content Creation',
        description: 'AI-powered content generation with quality assurance',
        frameworks: ['langchain', 'huggingface', 'autogen'],
        complexity: 'Intermediate',
        useCase: 'Content Teams',
        estimatedTime: '10-20 min',
        steps: [
          'HuggingFace analyzes content requirements',
          'LangChain generates initial content',
          'AutoGen Critic reviews and improves',
          'Final quality check and optimization'
        ],
        benefits: ['High-quality content', 'Automated review', 'Consistent style'],
        icon: '✍️'
      },
      {
        id: 'customer_support',
        title: '🎧 Intelligent Customer Support',
        description: 'Multi-modal customer support with knowledge base',
        frameworks: ['langchain', 'llamaindex', 'huggingface'],
        complexity: 'Intermediate',
        useCase: 'Support Teams',
        estimatedTime: '5-15 min',
        steps: [
          'HuggingFace classifies customer intent',
          'LlamaIndex retrieves relevant knowledge',
          'LangChain generates personalized response',
          'Automated follow-up and feedback collection'
        ],
        benefits: ['24/7 availability', 'Consistent responses', 'Knowledge retention'],
        icon: '🎧'
      }
    ];
    
    setRecommendedWorkflows(workflows);
  };

  const getFrameworkStatus = (framework) => {
    if (!frameworkCapabilities?.frameworks?.[framework]) return 'unknown';
    return frameworkCapabilities.frameworks[framework].available ? 'available' : 'unavailable';
  };

  const getFrameworkColor = (framework) => {
    const status = getFrameworkStatus(framework);
    const colors = {
      available: 'text-green-600 bg-green-100 border-green-200',
      unavailable: 'text-red-600 bg-red-100 border-red-200',
      unknown: 'text-gray-600 bg-gray-100 border-gray-200'
    };
    return colors[status] || colors.unknown;
  };

  const frameworkIcons = {
    huggingface: '🤗',
    langchain: '🦜',
    llamaindex: '📚',
    autogen: '🤝'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-700">Loading Framework Dashboard...</h2>
            <p className="text-gray-500 mt-2">Analyzing all available capabilities</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🚀 CrewBuilder Framework Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive overview of all AI frameworks, capabilities, and intelligent workflow recommendations
          </p>
        </motion.div>

        {/* Metrics Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Framework Availability</p>
                <p className="text-3xl font-bold text-blue-600">{activeMetrics.availabilityRate}%</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Frameworks</p>
                <p className="text-3xl font-bold text-green-600">
                  {activeMetrics.availableFrameworks}/{activeMetrics.totalFrameworks}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Features</p>
                <p className="text-3xl font-bold text-purple-600">{activeMetrics.totalFeatures}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛠️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Providers</p>
                <p className="text-3xl font-bold text-orange-600">{activeMetrics.totalProviders}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Framework Status Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Framework Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {frameworkCapabilities?.frameworks && Object.entries(frameworkCapabilities.frameworks).map(([name, config]) => (
              <div key={name} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{frameworkIcons[name] || '🔧'}</span>
                    <h3 className="text-lg font-semibold capitalize">{name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getFrameworkColor(name)}`}>
                    {config.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                
                {config.available ? (
                  <div className="space-y-2">
                    {config.tasks && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Tasks:</span> {config.tasks.length}
                      </div>
                    )}
                    {config.tools && Object.keys(config.tools).length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Tools:</span> {Object.keys(config.tools).length}
                      </div>
                    )}
                    {config.supported_providers && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Providers:</span> {config.supported_providers.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    {config.error || 'Framework not available'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Workflow Recommendations */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6">🎯 Intelligent Workflow Recommendations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {recommendedWorkflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-3">{workflow.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{workflow.title}</h3>
                      <p className="text-gray-600 text-sm">{workflow.description}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {workflow.frameworks.map((framework) => (
                        <span key={framework} className={`px-2 py-1 rounded-full text-xs font-medium border ${getFrameworkColor(framework)}`}>
                          {frameworkIcons[framework]} {framework}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <div><strong>Use Case:</strong> {workflow.useCase}</div>
                    <div><strong>Time:</strong> {workflow.estimatedTime}</div>
                  </div>

                  <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
                    🚀 Start Workflow
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FrameworkDashboard; 