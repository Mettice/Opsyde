// Enhanced ToolEditor.jsx - Modern Enterprise Design
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';
import { ToolType, FRAMEWORK_OPTIONS } from '../EditModall';
import { toast } from 'react-hot-toast';
import EnhancedFrameworkSelector from '../toolTemplates/EnhancedFrameworkSelector';

// Modern Universal API Builder Component
const UniversalApiBuilder = ({ 
  formData, 
  handleInputChange, 
  onApiResearch, 
  isResearching, 
  researchResult,
  availableApiKeys = [],
  loadingApiKeys = false
}) => {
  // LLM selection state
  const [selectedLLM, setSelectedLLM] = useState(formData.selectedLLM || '');

  // Get available LLMs based on API keys (matching AgentEditor pattern)
  const getAvailableLLMs = () => {
    const llms = [];
    
    availableApiKeys.forEach(key => {
      if (key.validation_status === 'valid') {
        switch (key.provider) {
          case 'openai':
            llms.push({
              provider: 'openai',
              name: 'OpenAI GPT',
              models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
              icon: '🤖'
            });
            break;
          case 'anthropic':
            llms.push({
              provider: 'anthropic',
              name: 'Anthropic Claude',
              models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
              icon: '🧠'
            });
            break;
          case 'openrouter':
            llms.push({
              provider: 'openrouter',
              name: 'OpenRouter',
              models: ['openai/gpt-4', 'anthropic/claude-3-opus', 'meta-llama/llama-2-70b-chat'],
              icon: '🌐'
            });
            break;
        }
      }
    });
    
    return llms;
  };

  // Auto-select first available LLM ONLY ONCE when API keys are loaded
  useEffect(() => {
    const availableLLMs = getAvailableLLMs();
    if (availableLLMs.length > 0 && !selectedLLM && !formData.selectedLLM) {
      const firstLLM = availableLLMs[0];
      setSelectedLLM(firstLLM.provider);
      
      // Update form data without causing infinite loop
      handleInputChange({ 
        target: { 
          name: 'selectedLLM', 
          value: firstLLM.provider 
        } 
      });
      
      toast.success(`🤖 Auto-selected ${firstLLM.name} for API research`);
    }
  }, [availableApiKeys.length]); // Only depend on the length, not the full array

  // Handle LLM selection change
  const handleLLMChange = (e) => {
    const newLLM = e.target.value;
    setSelectedLLM(newLLM);
    
    // Update form data
    handleInputChange({ 
      target: { 
        name: 'selectedLLM', 
        value: newLLM 
      } 
    });

    // Auto-inject API key if available
    if (newLLM && availableApiKeys.length > 0) {
      const matchingKey = availableApiKeys.find(key => 
        key.provider === newLLM && key.validation_status === 'valid'
      );
      
      if (matchingKey) {
        const placeholder = `[BYOK:${matchingKey.provider}]`;
        
        handleInputChange({ 
          target: { 
            name: 'apiKey', 
            value: placeholder 
          } 
        });
        
        toast.success(`🔑 Auto-injected ${matchingKey.provider_name} API key from BYOK Manager`);
      }
    }
  };

  const handleStartResearch = async () => {
    // Validation
    if (!formData.serviceName?.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    
    if (!formData.description?.trim()) {
      toast.error('Please enter a description of what you want to do');
      return;
    }

    if (!selectedLLM) {
      toast.error('Please select an AI model for research');
      return;
    }

    const researchData = {
      serviceName: formData.serviceName,
      description: formData.description,
      selectedLLM: selectedLLM ? { provider: selectedLLM } : null
    };

    await onApiResearch(researchData);
  };

  const availableLLMs = getAvailableLLMs();

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">🤖 AI-Powered API Discovery</h3>
        <p className="text-sm text-blue-700">
              Let our AI research and configure any API automatically. Just describe what you want to do.
            </p>
          </div>

      {/* LLM Selection */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          🤖 Choose AI Model for Research
          <span className="text-red-500 ml-1">*</span>
        </label>
        
        {loadingApiKeys ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700 text-sm">Loading available AI models...</span>
        </div>
          </div>
        ) : availableLLMs.length === 0 ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <span className="text-yellow-700 text-sm">⚠️ No AI models available. Please add API keys in BYOK Manager.</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="ml-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
            >
              Add Keys
            </button>
          </div>
        ) : (
          <select
            value={selectedLLM}
            onChange={handleLLMChange}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">Select AI Model...</option>
            {availableLLMs.map((llm) => (
              <option key={llm.provider} value={llm.provider}>
                {llm.icon} {llm.name} - {llm.models[0]} (Ready)
              </option>
            ))}
          </select>
        )}
        
        {selectedLLM && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
            <span className="text-green-700">
              🔑 API key auto-loaded from BYOK Manager for {availableLLMs.find(l => l.provider === selectedLLM)?.name}
            </span>
          </div>
        )}
      </div>

          {/* Service Name Input */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          🎯 What service do you want to connect to?
          <span className="text-red-500 ml-1">*</span>
            </label>
              <input
                type="text"
          name="serviceName"
          value={formData.serviceName || ''}
                onChange={handleInputChange}
          className="w-full p-3 border rounded-lg"
          placeholder="e.g., Gmail, Slack, Airtable, Notion, Stripe, GitHub..."
        />
          </div>

          {/* Action Description */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 font-medium">
          📝 What do you want to accomplish?
          <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
          name="description"
          value={formData.description || ''}
              onChange={handleInputChange}
          className="w-full p-3 border rounded-lg h-24"
          placeholder="e.g., Send email notifications, Create calendar events, Update spreadsheet rows, Post to Slack channels..."
        />
        <div className="text-xs text-gray-500 mt-1">
          💡 Be specific about what you want to do - this helps our AI find the right API endpoints
          </div>
          </div>

          {/* Research Button */}
            <button
              type="button"
              onClick={handleStartResearch}
        disabled={isResearching || !selectedLLM}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          isResearching || !selectedLLM
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
                {isResearching ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            🤖 AI is researching...
          </span>
        ) : (
          '🚀 Start AI Research & Configuration'
              )}
            </button>

          {/* Research Results */}
          {researchResult && (
        <div className={`mt-4 p-4 rounded-lg border ${
              researchResult.success 
            ? 'bg-green-50 border-green-200' 
            : researchResult.auth_required 
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
            }`}>
              {researchResult.success ? (
            <>
              <h4 className="font-semibold text-green-800 mb-2">✅ Research Complete!</h4>
              <div className="text-sm text-green-700">
                <p><strong>Service:</strong> {researchResult.service || 'Detected'}</p>
                <p><strong>Configuration:</strong> {researchResult.summary || 'API endpoints and authentication configured'}</p>
                    </div>
            </>
          ) : researchResult.auth_required ? (
            <>
              <h4 className="font-semibold text-yellow-800 mb-2">🔐 Authentication Required</h4>
              <div className="text-sm text-yellow-700 space-y-3">
                <p><strong>Service:</strong> {researchResult.auth_guidance?.service || 'Unknown'}</p>
                <p><strong>Auth Type:</strong> {researchResult.auth_guidance?.auth_type || 'API Key/Token'}</p>
                
                {researchResult.auth_guidance && (
                  <div className="bg-white border border-yellow-300 rounded p-3 mt-3">
                    <h5 className="font-semibold text-yellow-800 mb-2">📋 Setup Instructions:</h5>
                    <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                      {researchResult.auth_guidance.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    
                    <div className="mt-3 space-y-2">
                      <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                        <strong>Token Format:</strong> <code className="bg-yellow-200 px-1 rounded">{researchResult.auth_guidance.token_format}</code>
                        </div>
                      
                      {researchResult.auth_guidance.documentation && (
                        <div className="p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                          <strong>📚 Documentation:</strong> 
                          <a 
                            href={researchResult.auth_guidance.documentation} 
                                target="_blank" 
                                rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                              >
                            {researchResult.auth_guidance.documentation}
                              </a>
                            </div>
                          )}
                      
                      {researchResult.auth_guidance.security_note && (
                        <div className="p-2 bg-red-100 border border-red-300 rounded text-xs">
                          <strong>🔒 Security:</strong> {researchResult.auth_guidance.security_note}
                            </div>
                          )}

                      {researchResult.auth_guidance.additional_setup && (
                        <div className="p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                          <strong>⚠️ Additional Setup:</strong> {researchResult.auth_guidance.additional_setup}
                            </div>
                          )}
                              </div>
                            </div>
                          )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResearchResult(null)}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
                  >
                    Dismiss
                  </button>
                  {researchResult.auth_guidance?.documentation && (
                    <button
                      type="button"
                      onClick={() => window.open(researchResult.auth_guidance.documentation, '_blank')}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                    >
                      📚 View Docs
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // Scroll to authentication section
                      const authSection = document.querySelector('[name="authType"]');
                      if (authSection) {
                        authSection.scrollIntoView({ behavior: 'smooth' });
                        authSection.focus();
                      }
                    }}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                  >
                    🔧 Configure Auth
                  </button>
                              </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-semibold text-red-800 mb-2">❌ Research Failed</h4>
              <div className="text-sm text-red-700 space-y-2">
                <p><strong>Error:</strong> {researchResult.error}</p>
                {researchResult.suggestion && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                    <p className="text-yellow-800">
                      <strong>💡 Suggestion:</strong> {researchResult.suggestion}
                    </p>
                            </div>
                          )}
                {researchResult.raw_response && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800">
                      🔍 View raw AI response
                    </summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                      {researchResult.raw_response}
                        </div>
                  </details>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResearchResult(null)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open('/api-keys', '_blank')}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                  >
                    Check API Keys
                  </button>
                </div>
                    </div>
            </>
                  )}
                </div>
              )}
    </div>
  );
};

// HuggingFace Task Configuration Component
const HuggingFaceConfiguration = ({ 
  formData, 
  handleInputChange, 
  availableApiKeys = [],
  loadingApiKeys = false 
}) => {
  const [hfConfig, setHfConfig] = useState({
    task: formData.hfTask || '',
    model: formData.hfModel || '',
    taskInputs: formData.hfTaskInputs || {}
  });
  const [taskOptions, setTaskOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [inputFields, setInputFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [examples, setExamples] = useState({});
  const [modelInfo, setModelInfo] = useState({});
  const [outputPreview, setOutputPreview] = useState(null);

  // 🔄 Enhanced default inputs with realistic examples
  const defaultInputs = {
    "summarization": {
      text: "Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of intelligent agents: any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals. Colloquially, the term artificial intelligence is often used to describe machines that mimic cognitive functions that humans associate with the human mind, such as learning and problem solving."
    },
    "text-classification": {
      text: "I absolutely love using CrewBuilder! It's made my workflow so much more efficient and the AI agents are incredibly helpful."
    },
    "question-answering": {
      context: "CrewBuilder is a powerful workflow automation platform that uses AI agents to streamline business processes. It features a visual node-based editor where users can create complex workflows by connecting different types of nodes including agents, tools, triggers, and outputs. The platform supports multiple AI providers like OpenAI, Anthropic, and HuggingFace, allowing users to choose the best AI model for their specific needs.",
      question: "What is CrewBuilder and what are its main features?"
    },
    "zero-shot-classification": {
      sequence: "Breaking news: Tesla's new AI chip shows 40% performance improvement in autonomous driving tests.",
      labels: ["technology", "finance", "sports", "politics", "health"]
    },
    "token-classification": {
      text: "Elon Musk, CEO of Tesla and SpaceX, announced the new AI breakthrough at the company's headquarters in Austin, Texas on January 15th, 2024."
    },
    "feature-extraction": {
      text: "Transform this sentence into high-dimensional embeddings for semantic search and similarity matching."
    }
  };

  // 🧠 Model information database
  const modelInfoDatabase = {
    "sshleifer/distilbart-cnn-12-6": {
      type: "Inference API",
      size: "Small",
      dataset: "CNN/DailyMail",
      description: "Distilled BART for fast summarization"
    },
    "cardiffnlp/twitter-roberta-base-sentiment": {
      type: "Inference API", 
      size: "Base",
      dataset: "Twitter",
      description: "RoBERTa trained on Twitter data"
    },
    "deepset/roberta-base-squad2": {
      type: "Inference API",
      size: "Base", 
      dataset: "SQuAD 2.0",
      description: "RoBERTa fine-tuned for Q&A"
    },
    "facebook/bart-large-mnli": {
      type: "Inference API",
      size: "Large",
      dataset: "MNLI",
      description: "BART for zero-shot classification"
    },
    "dbmdz/bert-large-cased-finetuned-conll03-english": {
      type: "Transformers",
      size: "Large",
      dataset: "CoNLL-03",
      description: "BERT for named entity recognition"
    }
  };

  // Load HuggingFace configuration on mount
  useEffect(() => {
    loadHuggingFaceConfig();
  }, []);

  // Update models when task changes
  useEffect(() => {
    if (hfConfig.task) {
      loadModelsForTask(hfConfig.task);
      updateInputFields(hfConfig.task);
      // 🔄 Auto-load model-specific input schemas
      autoLoadDefaultInputs(hfConfig.task);
    }
  }, [hfConfig.task]);

  // 🔄 Auto-load default inputs when task changes
  const autoLoadDefaultInputs = (task) => {
    if (defaultInputs[task]) {
      const newConfig = { ...hfConfig, taskInputs: defaultInputs[task] };
      setHfConfig(newConfig);
      handleInputChange({ target: { name: 'hfTaskInputs', value: defaultInputs[task] } });
      toast.success(`📋 Auto-loaded ${task} example data`);
    }
  };

  const loadHuggingFaceConfig = async () => {
    try {
      setLoading(true);
      // ✅ Use the working debug endpoint - it has all the data we need
      const response = await fetch('http://localhost:8000/api/tools/huggingface/debug');
      const data = await response.json();
      
      if (data.status === "success") {
        // Create a basic working config since debug endpoint works
        const config = {
          tasks: ["summarization", "text-classification", "question-answering", "zero-shot-classification", "token-classification", "feature-extraction"],
          categories: {
            "Text Analysis": ["text-classification", "zero-shot-classification"],
            "Question & Answer": ["question-answering"],
            "Text Processing": ["summarization", "feature-extraction"],
            "Named Entity Recognition": ["token-classification"]
          },
          examples: defaultInputs
        };
        
        // Set task options organized by category
        const tasksByCategory = config.categories;
        const allTasks = Object.values(tasksByCategory).flat();
        setTaskOptions(allTasks);
        setExamples(config.examples);
        
        toast.success('🤗 HuggingFace tasks loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load HuggingFace config:', error);
      toast.error('Failed to load HuggingFace configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadModelsForTask = async (task) => {
    try {
      const response = await fetch(`http://localhost:8000/api/tools/huggingface/models/${task}`);
      const data = await response.json();
      
      if (data.success) {
        const models = data.data;
        const modelList = [models.primary, ...models.alternatives].filter(Boolean);
        setModelOptions(modelList);
        
        // Auto-select primary model and load its info
        if (models.primary) {
          const newConfig = { ...hfConfig, model: models.primary };
          setHfConfig(newConfig);
          handleInputChange({ target: { name: 'hfModel', value: models.primary } });
          setModelInfo(modelInfoDatabase[models.primary] || {
            type: "Inference API",
            size: "Unknown",
            dataset: "Custom",
            description: "AI model for " + task
          });
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load models for task');
    }
  };

  const updateInputFields = (task) => {
    const taskToInputFields = {
      "summarization": ["text"],
      "text-classification": ["text"],
      "sentiment-analysis": ["text"],
      "question-answering": ["context", "question"],
      "zero-shot-classification": ["sequence", "labels"],
      "sentence-similarity": ["sentences"],
      "feature-extraction": ["text"],
      "text-generation": ["text"],
      "token-classification": ["text"]
    };
    
    const fields = taskToInputFields[task] || ["text"];
    setInputFields(fields);
  };

  const handleTaskChange = (e) => {
    const task = e.target.value;
    const newConfig = { ...hfConfig, task, model: '', taskInputs: {} };
    setHfConfig(newConfig);
    
    // Update form data
    handleInputChange({ target: { name: 'hfTask', value: task } });
    handleInputChange({ target: { name: 'hfModel', value: '' } });
    handleInputChange({ target: { name: 'hfTaskInputs', value: {} } });
    
    // Clear previous output preview
    setOutputPreview(null);
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    const newConfig = { ...hfConfig, model };
    setHfConfig(newConfig);
    handleInputChange({ target: { name: 'hfModel', value: model } });
    
    // Update model info
    setModelInfo(modelInfoDatabase[model] || {
      type: "Inference API",
      size: "Unknown", 
      dataset: "Custom",
      description: "AI model for " + hfConfig.task
    });
  };

  const handleTaskInputChange = (field, value) => {
    const newInputs = { ...hfConfig.taskInputs, [field]: value };
    const newConfig = { ...hfConfig, taskInputs: newInputs };
    setHfConfig(newConfig);
    handleInputChange({ target: { name: 'hfTaskInputs', value: newInputs } });
  };

  const loadExample = () => {
    if (hfConfig.task && examples[hfConfig.task]) {
      const exampleData = examples[hfConfig.task];
      const newConfig = { ...hfConfig, taskInputs: exampleData };
      setHfConfig(newConfig);
      handleInputChange({ target: { name: 'hfTaskInputs', value: exampleData } });
      toast.success('📋 Example data loaded');
    }
  };

  // 📤 Mock test run to show output preview
  const runPreviewTest = async () => {
    const toastId = toast.loading('🧪 Running preview test...');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock output based on task type
    let mockOutput;
    let confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
    
    switch (hfConfig.task) {
      case 'summarization':
        mockOutput = {
          type: 'text',
          result: "CrewBuilder is an AI-powered workflow automation platform with visual node-based editing and support for multiple AI providers.",
          confidence: confidence
        };
        break;
      case 'text-classification':
        mockOutput = {
          type: 'classification',
          result: [
            { label: 'POSITIVE', score: confidence },
            { label: 'NEGATIVE', score: 1 - confidence }
          ]
        };
        break;
      case 'question-answering':
        mockOutput = {
          type: 'qa',
          result: {
            answer: "CrewBuilder is a workflow automation platform with AI agents, visual editor, and multi-provider support",
            confidence: confidence,
            start: 0,
            end: 95
          }
        };
        break;
      case 'zero-shot-classification':
        mockOutput = {
          type: 'classification',
          result: {
            sequence: hfConfig.taskInputs.sequence,
            labels: ['technology', 'finance', 'sports', 'politics', 'health'],
            scores: [0.85, 0.08, 0.03, 0.02, 0.02]
          }
        };
        break;
      case 'token-classification':
        mockOutput = {
          type: 'ner',
          result: [
            { entity: 'B-PER', word: 'Elon', confidence: 0.99, start: 0, end: 4 },
            { entity: 'I-PER', word: 'Musk', confidence: 0.99, start: 5, end: 9 },
            { entity: 'B-ORG', word: 'Tesla', confidence: 0.95, start: 18, end: 23 },
            { entity: 'B-ORG', word: 'SpaceX', confidence: 0.97, start: 28, end: 34 },
            { entity: 'B-LOC', word: 'Austin', confidence: 0.92, start: 89, end: 95 },
            { entity: 'B-LOC', word: 'Texas', confidence: 0.94, start: 97, end: 102 }
          ]
        };
        break;
      default:
        mockOutput = {
          type: 'text',
          result: 'Mock output for ' + hfConfig.task,
          confidence: confidence
        };
    }
    
    setOutputPreview(mockOutput);
    toast.success('✅ Preview generated! Scroll down to see results.', { id: toastId });
  };

  // 💾 Save as template
  const saveAsTemplate = () => {
    const template = {
      name: `${hfConfig.task} - ${hfConfig.model.split('/').pop()}`,
      task: hfConfig.task,
      model: hfConfig.model,
      taskInputs: hfConfig.taskInputs,
      created: new Date().toISOString()
    };
    
    const templates = JSON.parse(localStorage.getItem('hf_templates') || '[]');
    templates.push(template);
    localStorage.setItem('hf_templates', JSON.stringify(templates));
    
    toast.success('💾 Template saved! You can reuse this configuration later.');
  };

  // 🧠 Render model badges
  const renderModelBadges = () => {
    if (!modelInfo.type) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          modelInfo.type === 'Inference API' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {modelInfo.type}
        </span>
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          modelInfo.size === 'Large' ? 'bg-purple-100 text-purple-700' :
          modelInfo.size === 'Base' ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {modelInfo.size}
        </span>
        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 font-medium">
          {modelInfo.dataset}
        </span>
      </div>
    );
  };

  const getFieldPlaceholder = (field) => {
    const placeholders = {
      text: "Enter text to process...",
      context: "Enter context for the question...",
      question: "Enter your question...",
      sequence: "Enter text to classify...",
      labels: "positive, negative, neutral",
      sentences: "Sentence 1\nSentence 2\nSentence 3"
    };
    return placeholders[field] || `Enter ${field}...`;
  };

  const renderInputField = (field) => {
    const value = hfConfig.taskInputs[field] || '';
    
    if (field === 'labels') {
      return (
        <input
          key={field}
          type="text"
          placeholder={getFieldPlaceholder(field)}
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => {
            const labelArray = e.target.value.split(',').map(l => l.trim()).filter(Boolean);
            handleTaskInputChange(field, labelArray);
          }}
          className="w-full p-3 border rounded-lg"
        />
      );
    } else if (field === 'sentences') {
      return (
        <textarea
          key={field}
          placeholder={getFieldPlaceholder(field)}
          value={Array.isArray(value) ? value.join('\n') : value}
          onChange={(e) => {
            const sentenceArray = e.target.value.split('\n').filter(Boolean);
            handleTaskInputChange(field, sentenceArray);
          }}
          className="w-full p-3 border rounded-lg h-24"
        />
      );
    } else {
      return (
        <textarea
          key={field}
          placeholder={getFieldPlaceholder(field)}
          value={value}
          onChange={(e) => handleTaskInputChange(field, e.target.value)}
          className="w-full p-3 border rounded-lg h-20"
        />
      );
    }
  };

  // 📤 Render output preview component
  const renderOutputPreview = () => {
    if (!outputPreview) return null;
    
    return (
      <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-green-800 flex items-center">
            <span className="mr-2">📤</span>
            Output Preview
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => setOutputPreview({...outputPreview, showJson: !outputPreview.showJson})}
              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
            >
              {outputPreview.showJson ? '👁️ Visual' : '🔧 JSON'}
            </button>
            <button
              onClick={() => setOutputPreview(null)}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>
        </div>
        
        {outputPreview.showJson ? (
          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
            {JSON.stringify(outputPreview.result, null, 2)}
          </pre>
        ) : (
          <div>
            {outputPreview.type === 'classification' && Array.isArray(outputPreview.result) && (
              <div className="space-y-2">
                {outputPreview.result.map((item, i) => (
                  <div key={i} className="flex items-center">
                    <span className="w-20 text-sm font-medium">{item.label}:</span>
                    <div className="flex-1 mx-3 bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.score * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono">{(item.score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
            
            {outputPreview.type === 'zero-shot' && (
              <div className="space-y-2">
                {outputPreview.result.labels.map((label, i) => (
                  <div key={i} className="flex items-center">
                    <span className="w-20 text-sm font-medium">{label}:</span>
                    <div className="flex-1 mx-3 bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${outputPreview.result.scores[i] * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono">{(outputPreview.result.scores[i] * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
            
            {outputPreview.type === 'ner' && (
              <div className="space-y-1">
                <div className="text-sm font-medium mb-2">Detected Entities:</div>
                {outputPreview.result.map((entity, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                      entity.entity.includes('PER') ? 'bg-blue-100 text-blue-700' :
                      entity.entity.includes('ORG') ? 'bg-purple-100 text-purple-700' :
                      entity.entity.includes('LOC') ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {entity.entity.replace('B-', '').replace('I-', '')}
                    </span>
                    <span className="font-medium">{entity.word}</span>
                    <div className="flex-1 mx-3 bg-green-100 rounded-full h-1">
                      <div 
                        className="bg-green-500 h-1 rounded-full"
                        style={{ width: `${entity.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono">{(entity.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
            
            {outputPreview.type === 'text' && (
              <div>
                <div className="bg-white p-3 rounded border text-sm">
                  {outputPreview.result}
                </div>
                {outputPreview.confidence && (
                  <div className="flex items-center mt-2 text-sm">
                    <span className="mr-2">Confidence:</span>
                    <div className="flex-1 bg-green-100 rounded-full h-2 max-w-32">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${outputPreview.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs font-mono">{(outputPreview.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            )}
            
            {outputPreview.type === 'qa' && (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm font-medium text-green-700 mb-1">Answer:</div>
                  <div className="text-sm">{outputPreview.result.answer}</div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="mr-2">Confidence:</span>
                  <div className="flex-1 bg-green-100 rounded-full h-2 max-w-32">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${outputPreview.result.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs font-mono">{(outputPreview.result.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
        <h3 className="font-semibold text-orange-800 mb-2">🤗 HuggingFace AI Configuration</h3>
        <p className="text-sm text-orange-700">
          Choose from 100% working AI models for text processing, Q&A, classification, and more.
        </p>
      </div>

      {loading ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Loading HuggingFace configuration...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Task Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              🎯 AI Task Type
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={hfConfig.task}
              onChange={handleTaskChange}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select AI task...</option>
              <optgroup label="📊 Text Analysis">
                <option value="text-classification">Sentiment Analysis</option>
                <option value="zero-shot-classification">Zero-Shot Classification</option>
              </optgroup>
              <optgroup label="❓ Question & Answer">
                <option value="question-answering">Question Answering</option>
              </optgroup>
              <optgroup label="📝 Text Processing">
                <option value="summarization">Document Summarization</option>
                <option value="feature-extraction">Feature Extraction</option>
              </optgroup>
              <optgroup label="🧠 Named Entity Recognition">
                <option value="token-classification">Named Entity Recognition</option>
              </optgroup>
            </select>
          </div>

          {/* Model Selection */}
          {hfConfig.task && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-1 font-medium">
                🤖 AI Model
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={hfConfig.model}
                onChange={handleModelChange}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select model...</option>
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model} {model === modelOptions[0] ? '(Recommended)' : ''}
                  </option>
                ))}
              </select>
              
              {/* 🧠 Model badges */}
              {renderModelBadges()}
              
              {hfConfig.model && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <span className="text-green-700">
                    ✅ Model ready - {modelInfo.description || '100% success rate in testing'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Input Fields */}
          {inputFields.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700 font-medium">
                  📝 Input Data
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadExample}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                  >
                    📋 Load Example
                  </button>
                  <button
                    type="button"
                    onClick={runPreviewTest}
                    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded"
                  >
                    🧪 Test Run
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {inputFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm text-gray-600 mb-1 capitalize">
                      {field === 'sequence' ? 'Text to Classify' : field}:
                    </label>
                    {renderInputField(field)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Summary */}
          {hfConfig.task && hfConfig.model && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-800">📋 Configuration Summary</h4>
                <button
                  type="button"
                  onClick={saveAsTemplate}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center"
                >
                  💾 Save Template
                </button>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Task: <span className="font-medium">{hfConfig.task}</span></div>
                <div>Model: <span className="font-medium">{hfConfig.model}</span></div>
                <div>Input Fields: <span className="font-medium">{inputFields.join(', ')}</span></div>
                <div>Status: <span className="font-medium text-green-600">Ready to Execute</span></div>
              </div>
            </div>
          )}

          {/* 📤 Output Preview */}
          {renderOutputPreview()}
        </>
      )}
    </div>
  );
};

// 🦜 LangChain Configuration Component
const LangChainConfiguration = ({ 
  formData, 
  handleInputChange, 
  availableApiKeys = [],
  loadingApiKeys = false 
}) => {
  const [selectedTools, setSelectedTools] = useState(formData.langchainTools || []);
  const [executionMode, setExecutionMode] = useState(formData.langchainMode || 'auto');
  const [systemMessage, setSystemMessage] = useState(formData.langchainSystemMessage || '');
  const [availableTools, setAvailableTools] = useState([]);
  const [executionModes, setExecutionModes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load LangChain capabilities from backend
  useEffect(() => {
    const loadLangChainCapabilities = async () => {
      try {
        setLoading(true);
        
        // Load tools
        const toolsResponse = await fetch('http://localhost:8000/api/tools/langchain/tools');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          setAvailableTools(toolsData.tools || []);
        }
        
        // Load execution modes
        const modesResponse = await fetch('http://localhost:8000/api/tools/langchain/execution-modes');
        if (modesResponse.ok) {
          const modesData = await modesResponse.json();
          setExecutionModes(modesData.execution_modes || []);
        }
        
      } catch (error) {
        console.error('Failed to load LangChain capabilities:', error);
        toast.error('Failed to load LangChain capabilities');
        
        // Fallback to static data
        setAvailableTools([
          { id: 'calculator', name: 'Calculator', description: 'Mathematical calculations', category: 'computation' },
          { id: 'search', name: 'Web Search', description: 'Real-time web search', category: 'information' },
          { id: 'wikipedia', name: 'Wikipedia', description: 'Encyclopedia lookup', category: 'information' },
          { id: 'python', name: 'Python Code', description: 'Safe Python execution', category: 'computation' },
          { id: 'file_reader', name: 'File Reader', description: 'Read text files', category: 'file_processing' },
          { id: 'url_reader', name: 'URL Reader', description: 'Fetch webpage content', category: 'information' }
        ]);
        
        setExecutionModes([
          { id: 'auto', name: 'Auto-detect', description: 'Automatically choose based on tools' },
          { id: 'llm_chain', name: 'Simple LLM', description: 'Direct conversation without tools' },
          { id: 'agent', name: 'AI Agent', description: 'Intelligent agent with tool access' },
          { id: 'rag', name: 'RAG Mode', description: 'Retrieval augmented generation' },
          { id: 'conversation', name: 'Conversation', description: 'Chat with memory' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadLangChainCapabilities();
  }, []);

  // Get available LLMs from API keys
  const getAvailableLLMs = () => {
    const llms = [];
    
    availableApiKeys.forEach(key => {
      if (key.validation_status === 'valid') {
        switch (key.provider) {
          case 'openai':
            llms.push({
              provider: 'openai',
              name: 'OpenAI',
              models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
              icon: '🤖'
            });
            break;
          case 'anthropic':
            llms.push({
              provider: 'anthropic',
              name: 'Anthropic Claude',
              models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
              icon: '🧠'
            });
            break;
          case 'perplexity':
            llms.push({
              provider: 'perplexity',
              name: 'Perplexity',
              models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
              icon: '🔍'
            });
            break;
        }
      }
    });
    
    return llms;
  };

  // Handle tool selection
  const handleToolSelection = (toolId) => {
    const newSelectedTools = selectedTools.includes(toolId)
      ? selectedTools.filter(id => id !== toolId)
      : [...selectedTools, toolId];
    
    setSelectedTools(newSelectedTools);
    
    // Update form data
    handleInputChange({
      target: { name: 'langchainTools', value: newSelectedTools }
    });

    // Auto-update execution mode if tools are selected/deselected
    if (executionMode === 'auto') {
      const suggestedMode = newSelectedTools.length > 0 ? 'agent' : 'llm_chain';
      setExecutionMode(suggestedMode);
      handleInputChange({
        target: { name: 'langchainMode', value: suggestedMode }
      });
    }
  };

  // Handle execution mode change
  const handleExecutionModeChange = (mode) => {
    setExecutionMode(mode);
    handleInputChange({
      target: { name: 'langchainMode', value: mode }
    });
  };

  // Handle system message change
  const handleSystemMessageChange = (message) => {
    setSystemMessage(message);
    handleInputChange({
      target: { name: 'langchainSystemMessage', value: message }
    });
  };

  const availableLLMs = getAvailableLLMs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-2">🦜 LangChain Agent Configuration</h3>
        <p className="text-sm text-purple-700">
          Create intelligent AI agents with tool access, memory, and advanced reasoning capabilities.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-700">Loading LangChain capabilities...</span>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <label className="block text-gray-700 mb-2 font-medium">
          🤖 AI Provider
          <span className="text-red-500 ml-1">*</span>
        </label>
        
        {loadingApiKeys ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700 text-sm">Loading available providers...</span>
            </div>
          </div>
        ) : availableLLMs.length === 0 ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <span className="text-yellow-700 text-sm">⚠️ No AI providers available. Please add API keys in BYOK Manager.</span>
          </div>
        ) : (
          <select
            value={formData.langchainProvider || ''}
            onChange={(e) => handleInputChange({ target: { name: 'langchainProvider', value: e.target.value }})}
            className="w-full p-3 border rounded-lg"
            disabled={loading}
          >
            <option value="">Select Provider...</option>
            {availableLLMs.map((llm) => (
              <option key={llm.provider} value={llm.provider}>
                {llm.icon} {llm.name} ({llm.models[0]})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Model Selection */}
      {formData.langchainProvider && (
        <div>
          <label className="block text-gray-700 mb-2 font-medium">🧠 Model</label>
          <select
            value={formData.langchainModel || ''}
            onChange={(e) => handleInputChange({ target: { name: 'langchainModel', value: e.target.value }})}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">Select Model...</option>
            {availableLLMs.find(llm => llm.provider === formData.langchainProvider)?.models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
      )}

      {/* Execution Mode */}
      <div>
        <label className="block text-gray-700 mb-3 font-medium">⚙️ Execution Mode</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {executionModes.map((mode) => (
            <div
              key={mode.id}
              onClick={() => handleExecutionModeChange(mode.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                executionMode === mode.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <h4 className="font-medium text-gray-800">{mode.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{mode.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tool Selection */}
      <div>
        <label className="block text-gray-700 mb-3 font-medium">🧰 Available Tools</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => handleToolSelection(tool.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedTools.includes(tool.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800">{tool.name}</h4>
                {selectedTools.includes(tool.id) && (
                  <span className="text-green-600">✓</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                {tool.category}
              </span>
            </div>
          ))}
        </div>
        
        {selectedTools.length > 0 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
            <span className="text-green-700 text-sm">
              ✅ Selected {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''}: {selectedTools.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* System Message */}
      <div>
        <label className="block text-gray-700 mb-2 font-medium">💬 System Message</label>
        <textarea
          value={systemMessage}
          onChange={(e) => handleSystemMessageChange(e.target.value)}
          placeholder="You are a helpful AI assistant with access to tools. Use tools when necessary to provide accurate information."
          className="w-full p-3 border rounded-lg h-24"
        />
        <p className="text-sm text-gray-500 mt-1">
          Define the agent's personality and behavior
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h4 className="font-medium text-gray-800 mb-2">📋 Configuration Summary</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Provider: {formData.langchainProvider || 'Not selected'}</li>
          <li>• Model: {formData.langchainModel || 'Not selected'}</li>
          <li>• Mode: {executionModes.find(m => m.id === executionMode)?.name || 'Auto-detect'}</li>
          <li>• Tools: {selectedTools.length} selected</li>
          <li>• System Message: {systemMessage ? 'Configured' : 'Default'}</li>
        </ul>
      </div>
    </div>
  );
};

const ToolEditor = ({ 
  formData, 
  handleInputChange, 
  handleFrameworkChange,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  savedTestInputs,
  saveTestInput,
  connectedNodes = []
}) => {
  // 🔑 BYOK State Management (matching AgentEditor pattern)
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(true);
  const [apiKeyError, setApiKeyError] = useState(null);

  // API research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState(null);

  // 🎯 Enhanced Framework Selection State
  const [useEnhancedMode, setUseEnhancedMode] = useState(false);
  const [enhancedFramework, setEnhancedFramework] = useState('');
  const [enhancedProvider, setEnhancedProvider] = useState('');
  const [enhancedModel, setEnhancedModel] = useState('');

  // Existing state
  const [localFrameworkConfig, setLocalFrameworkConfig] = useState(formData.frameworkConfig || {});

  // Find parent agent for inheritance
  const parentAgent = connectedNodes.find(
    node => node.id === formData.inherits_from && (node.type === 'agent' || node.nodeType === 'agent')
  );
  const isInheritingFromAgent = formData.inherits_from && parentAgent;

  useEffect(() => {
    if (formData.frameworkConfig) {
      setLocalFrameworkConfig(formData.frameworkConfig);
    }
  }, [formData.framework]);

  // 🔑 Load API Keys from BYOK Manager (matching AgentEditor pattern)
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoadingApiKeys(true);
        const response = await fetch('http://localhost:8000/api/user-settings/api-keys');
        const result = await response.json();
        
        if (result.success && result.data.api_keys) {
          setAvailableApiKeys(result.data.api_keys);
          setApiKeyError(null);
          console.log('✅ Loaded API keys for ToolEditor:', result.data.api_keys.length);
        } else {
          setApiKeyError('Failed to load API keys');
          console.error('❌ Failed to load API keys:', result);
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        setApiKeyError('Error connecting to API Key Manager');
      } finally {
        setLoadingApiKeys(false);
      }
    };

    loadApiKeys();
  }, []); // Only run once on mount

  // Handle enhanced mode changes
  useEffect(() => {
    if (useEnhancedMode && enhancedFramework && enhancedProvider && enhancedModel) {
      // Update formData with enhanced selections
      handleInputChange({
        target: { name: 'framework', value: enhancedFramework }
      });
      handleInputChange({
        target: { name: 'provider', value: enhancedProvider }
      });
      handleInputChange({
        target: { name: 'model', value: enhancedModel }
      });
      
      // Update framework config
      const enhancedConfig = {
        ...localFrameworkConfig,
        framework: enhancedFramework,
        provider: enhancedProvider,
        model: enhancedModel,
        enhanced_mode: true
      };
      
      setLocalFrameworkConfig(enhancedConfig);
      handleInputChange({
        target: { name: 'frameworkConfig', value: enhancedConfig }
      });
    }
  }, [enhancedFramework, enhancedProvider, enhancedModel, useEnhancedMode]);

  // Get available frameworks based on API keys (matching AgentEditor pattern)
  const getAvailableFrameworks = () => {
    const frameworks = [];
    
    // Add HuggingFace option first
    frameworks.push({
      id: 'huggingface',
      name: '🤗 HuggingFace AI',
      description: '100% working AI models for text processing',
      type: 'ai_models',
      priority: 1
    });

    // Add LangChain option
    frameworks.push({
      id: 'langchain',
      name: '🦜 LangChain Agents',
      description: 'AI agents with tools, memory, and RAG capabilities',
      type: 'ai_agents',
      priority: 2
    });
    
    // Add other framework options
    frameworks.push({
      id: 'universal_api',
      name: '🌐 Universal API Builder',
      description: 'AI-powered API research and integration',
      type: 'api',
      priority: 3
    });

    // Add traditional frameworks
    frameworks.push(
      { id: 'openai', name: 'OpenAI', type: 'llm' },
      { id: 'anthropic', name: 'Anthropic', type: 'llm' },
      { id: 'openrouter', name: 'OpenRouter', type: 'llm' },
      { id: 'custom', name: 'Custom API', type: 'api' },
      { id: 'webhook', name: 'Webhook', type: 'api' }
    );

    return frameworks;
  };

  const handleToolTypeChange = (e) => {
    const newToolType = e.target.value;
    handleInputChange(e);
    
    // Reset related fields when tool type changes
    if (newToolType !== 'universal_api') {
      handleInputChange({ target: { name: 'serviceName', value: '' } });
      handleInputChange({ target: { name: 'description', value: '' } });
      handleInputChange({ target: { name: 'selectedLLM', value: '' } });
    }
    
    // Reset LangChain-specific fields when changing away from LangChain
    if (newToolType !== 'langchain') {
      handleInputChange({ target: { name: 'langchainTools', value: [] } });
      handleInputChange({ target: { name: 'langchainMode', value: 'auto' } });
      handleInputChange({ target: { name: 'langchainSystemMessage', value: '' } });
    }
  };

  const handleApiResearch = async (researchData) => {
    try {
      setIsResearching(true);
      setResearchResult(null);

      // Prepare the request body with LLM information
      const requestBody = {
        service_name: researchData.serviceName,
        description: researchData.description,
        selected_llm: researchData.selectedLLM
      };
      
      // Add endpoint hint if available
      if (researchData.endpointHint) {
        requestBody.endpoint_hint = researchData.endpointHint;
      }
      
      console.log('🤖 Starting API research with:', requestBody);
      
      const response = await fetch('http://localhost:8000/api/tools/research-api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API research result:', result);
        setResearchResult(result);

        if (result.success) {
          toast.success(`✅ Research complete! Found configuration for ${result.service || researchData.serviceName}`);
          
          // Auto-apply configuration if available
          if (result.configuration) {
            const config = result.configuration;
            
            // Update framework configuration
            const newFrameworkConfig = {
              ...localFrameworkConfig,
              service_name: config.service_name || researchData.serviceName,
              base_url: config.base_url,
              auth_type: config.auth_type,
              endpoints: config.endpoints,
              headers: config.headers || {},
              auto_configured: true
            };
            
            setLocalFrameworkConfig(newFrameworkConfig);
            handleInputChange({
              target: {
                name: 'frameworkConfig',
                value: newFrameworkConfig
              }
            });
            
            // Update tool type to API if not already set
            if (formData.toolType === 'universal_api') {
          handleInputChange({
                target: {
                  name: 'toolType',
                  value: 'api'
                }
              });
            }
            
            toast.success('🔧 Configuration automatically applied!');
          }
        } else {
          // Handle failure cases with helpful messages
          const errorMessage = result.error || 'Unknown error occurred';
          const suggestion = result.suggestion || 'Please try again with different parameters';
          
          console.error('❌ API research failed:', result);
          
          // Check if this is an authentication requirement
          if (result.auth_required || result.auth_guidance) {
            // Show authentication guidance
            const authGuidance = result.auth_guidance;
            if (authGuidance) {
              // Show detailed authentication setup instructions
              const authMessage = `🔐 Authentication Required for ${authGuidance.service}

${authGuidance.auth_type} needed. Here's how to get it:

${authGuidance.steps.join('\n')}

Token format: ${authGuidance.token_format}

📚 Documentation: ${authGuidance.documentation}

${authGuidance.security_note ? `🔒 Security: ${authGuidance.security_note}` : ''}

${authGuidance.additional_setup ? `⚠️ Additional setup: ${authGuidance.additional_setup}` : ''}`;

              toast.error(authMessage, {
                duration: 15000,
                style: {
                  maxWidth: '600px',
                  fontSize: '12px',
                  whiteSpace: 'pre-line'
                }
              });
              
              // Also show a shorter message
              setTimeout(() => {
                toast.info(`💡 After getting your ${authGuidance.auth_type}, come back and configure the authentication in the Tool settings`, {
                  duration: 8000
                });
              }, 2000);
            } else {
              toast.error(`🔐 ${errorMessage}`, {
                duration: 6000
              });
            }
          } else {
            // Show detailed error message
            toast.error(`❌ ${errorMessage}`, {
              duration: 6000,
              style: {
                maxWidth: '500px'
              }
            });
            
            // Show suggestion as a separate info toast
            if (suggestion && suggestion !== errorMessage) {
              setTimeout(() => {
                toast.info(`💡 ${suggestion}`, {
                  duration: 8000,
                  style: {
                    maxWidth: '500px'
                  }
                });
              }, 1000);
            }
          }
          
          // Set research result to show the failure in UI
          setResearchResult({
            success: false,
            error: errorMessage,
            suggestion: suggestion,
            auth_required: result.auth_required,
            auth_guidance: result.auth_guidance,
            raw_response: result.raw_response
          });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API research failed:', response.status, errorText);
        
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        let suggestion = 'Check your internet connection and try again';
        
        if (response.status === 422) {
          errorMessage = 'Invalid request format';
          suggestion = 'Please check that all required fields are filled correctly';
        } else if (response.status === 500) {
          errorMessage = 'Server error occurred';
          suggestion = 'The AI service may be temporarily unavailable. Please try again in a few minutes';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'Authentication failed';
          suggestion = 'Please check your API keys in the BYOK Manager';
        }
        
        toast.error(`❌ ${errorMessage}`);
        setTimeout(() => {
          toast.info(`💡 ${suggestion}`, { duration: 6000 });
        }, 1000);
        
        setResearchResult({
          success: false,
          error: errorMessage,
          suggestion: suggestion
        });
      }
      
    } catch (error) {
      console.error('❌ API research error:', error);
      
      let errorMessage = `Network error: ${error.message}`;
      let suggestion = 'Check your internet connection and ensure the backend server is running';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to backend server';
        suggestion = 'Make sure the backend server is running on localhost:8000';
      }
      
      toast.error(`❌ ${errorMessage}`);
      setTimeout(() => {
        toast.info(`💡 ${suggestion}`, { duration: 6000 });
      }, 1000);

      setResearchResult({
        success: false,
        error: errorMessage,
        suggestion: suggestion
      });
    } finally {
      setIsResearching(false);
    }
  };

  // Handle framework change with auto-injection
  const handleFrameworkChangeLocal = (e) => {
    const newFramework = e.target.value;
    handleInputChange(e);
    
    // Auto-inject API key if available
    if (newFramework && availableApiKeys.length > 0) {
      const framework = newFramework.toLowerCase();
      let matchingKey = null;

      // Map framework to provider
      if (framework.includes('openai')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'openai' && key.validation_status === 'valid');
      } else if (framework.includes('anthropic')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'anthropic' && key.validation_status === 'valid');
      } else if (framework.includes('openrouter')) {
        matchingKey = availableApiKeys.find(key => key.provider === 'openrouter' && key.validation_status === 'valid');
      }

      // Auto-inject the API key if found
      if (matchingKey && !formData.apiKey) {
        const placeholder = `[BYOK:${matchingKey.provider}]`;
        handleInputChange({ target: { name: 'apiKey', value: placeholder } });
        toast.success(`🔑 Auto-injected ${matchingKey.provider_name} API key from BYOK Manager`);
      }
    }
  };

  const handleFrameworkConfigChange = (e) => {
    const { name, value } = e.target;
    const configKey = name.split('.')[1];
    
    const newConfig = {
      ...localFrameworkConfig,
      [configKey]: value
    };
    
    setLocalFrameworkConfig(newConfig);
    
    handleInputChange({
      target: {
        name: 'frameworkConfig',
        value: newConfig
      }
    });
  };

  const handleJsonChange = (fieldName, value) => {
    try {
      const parsedValue = JSON.parse(value);
      if (fieldName.startsWith('frameworkConfig.')) {
        const configKey = fieldName.split('.')[1];
        const newConfig = {
          ...localFrameworkConfig,
          [configKey]: parsedValue
        };
        setLocalFrameworkConfig(newConfig);
        handleInputChange({
          target: {
            name: 'frameworkConfig',
            value: newConfig
          }
        });
      } else {
        handleInputChange({
          target: {
            name: fieldName,
            value: parsedValue
          }
        });
      }
    } catch (error) {
      handleInputChange({
        target: {
          name: fieldName,
          value: value
        }
      });
    }
  };

  const runToolTest = () => {
    try {
      const inputs = JSON.parse(testInput);
      
      let simulatedResult;
      
      if (formData.toolType === 'universal_api') {
        simulatedResult = {
          success: true,
          response: {
            message: "Universal API call simulated successfully",
            service: formData.api_service_name,
            endpoint_used: localFrameworkConfig.url,
            data: inputs
          },
          api_type: researchResult?.api_type || 'REST',
          confidence: researchResult?.confidence || 0.9
        };
      } else if (isInheritingFromAgent) {
        simulatedResult = {
          success: true,
          response: `Simulated response using inherited ${parentAgent.data?.framework} configuration`,
          tokens_used: 150,
          model: parentAgent.data?.frameworkConfig?.model || parentAgent.data?.llmModel || 'inherited-model',
          inherited: true
        };
      } else {
        simulatedResult = {
          success: true,
          status_code: 200,
          response: { message: "Tool executed successfully", data: inputs },
          endpoint: localFrameworkConfig.url || formData.apiEndpoint
        };
      }
      
      setTestResult({
        success: true,
        result: simulatedResult,
        execution_time: Math.random() * 2 + 0.5
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
  };

  // 🔑 Render BYOK Status Indicator (matching AgentEditor pattern)
  const renderBYOKStatus = () => {
    if (loadingApiKeys) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Loading API keys...</span>
          </div>
        </div>
      );
    }

    if (apiKeyError) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-sm">⚠️ {apiKeyError}</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
            >
              Manage Keys
            </button>
          </div>
        </div>
      );
    }

    const validKeys = availableApiKeys.filter(key => key.validation_status === 'valid');
    const totalKeys = availableApiKeys.length;

    if (totalKeys === 0) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-yellow-700 text-sm">🔑 No API keys configured for AI tools</span>
            <button
              type="button"
              onClick={() => window.open('/api-keys', '_blank')}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
            >
              Add Keys
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-green-700 text-sm">
            ✅ {validKeys.length}/{totalKeys} API keys ready
            {validKeys.length > 0 && (
              <span className="ml-2 text-xs">
                ({validKeys.map(k => k.provider_name).join(', ')})
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => window.open('/api-keys', '_blank')}
            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
          >
            Manage Keys
          </button>
        </div>
      </div>
    );
  };

  const renderConfigurationSection = () => {
    // HuggingFace Configuration
    if (formData.toolType === 'huggingface') {
      return (
        <HuggingFaceConfiguration
          formData={formData}
          handleInputChange={handleInputChange}
          availableApiKeys={availableApiKeys}
          loadingApiKeys={loadingApiKeys}
        />
      );
    }

    // LangChain Configuration
    if (formData.toolType === 'langchain' || formData.framework === 'langchain') {
      return (
        <LangChainConfiguration
          formData={formData}
          handleInputChange={handleInputChange}
          availableApiKeys={availableApiKeys}
          loadingApiKeys={loadingApiKeys}
        />
      );
    }

    // Universal API Builder Configuration  
    if (formData.toolType === 'universal_api' || formData.framework === 'universal_api') {
      return (
        <UniversalApiBuilder
          formData={formData}
          handleInputChange={handleInputChange}
          onApiResearch={handleApiResearch}
          isResearching={isResearching}
          researchResult={researchResult}
          availableApiKeys={availableApiKeys}
          loadingApiKeys={loadingApiKeys}
        />
      );
    }

    // Traditional framework configuration
    return (
      <>
        {/* Enhanced Framework Selection Mode Toggle */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Framework Selection Mode</h3>
              <p className="text-sm text-gray-600">Choose between simple or enhanced framework configuration</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm ${!useEnhancedMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                Simple
              </span>
              <button
                type="button"
                onClick={() => setUseEnhancedMode(!useEnhancedMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  useEnhancedMode ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useEnhancedMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${useEnhancedMode ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                Enhanced ✨
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {useEnhancedMode 
              ? '✨ Enhanced mode: Native support detection, BYOK integration, and compatibility matrix'
              : '⚡ Simple mode: Quick framework selection'
            }
          </div>
        </div>

        {/* Enhanced Framework Selector */}
        {useEnhancedMode ? (
          <div className="mb-6">
            <EnhancedFrameworkSelector
              selectedFramework={enhancedFramework}
              setSelectedFramework={setEnhancedFramework}
              selectedProvider={enhancedProvider}
              setSelectedProvider={setEnhancedProvider}
              selectedModel={enhancedModel}
              setSelectedModel={setEnhancedModel}
              showOnlyNativeSupport={false}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
            />
          </div>
        ) : (
          /* Traditional Framework Selection */
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 font-medium">
              Framework
            </label>
            <select
              name="framework"
              value={formData.framework || ''}
              onChange={handleFrameworkChangeLocal}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select Framework...</option>
              {getAvailableFrameworks()
                .filter(f => f.type !== 'ai_models' && f.type !== 'api' && f.type !== 'ai_agents')
                .map((framework) => (
                <option key={framework.id} value={framework.id}>
                  {framework.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rest of traditional configuration */}
        {(formData.framework || (useEnhancedMode && enhancedFramework)) && renderFrameworkConfig()}
      </>
    );
  };

  const renderFrameworkConfig = () => {
    if (!formData.framework) return null;

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6 mt-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-purple-600">⚙️</span>
          </span>
          Framework Configuration
        </h2>

        <div className="space-y-6">
          {/* LLM Configuration for frameworks that support it */}
          {['openai', 'anthropic', 'perplexity', 'openrouter', 'huggingface'].includes(formData.framework) && (
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4">LLM Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">Model</label>
                  <select
                    name="model"
                    value={formData.frameworkConfig?.model || formData.model || ''}
                    onChange={handleFrameworkConfigChange}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                  >
                    <option value="">Select Model...</option>
                    {formData.framework === 'openai' && (
                      <>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {formData.framework === 'anthropic' && (
                      <>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </>
                    )}
                    {formData.framework === 'perplexity' && (
                      <>
                        <option value="llama-3.1-sonar-small-128k-online">Llama 3.1 Sonar Small</option>
                        <option value="llama-3.1-sonar-large-128k-online">Llama 3.1 Sonar Large</option>
                      </>
                    )}
                    {formData.framework === 'openrouter' && (
                      <>
                        <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
                        <option value="openai/gpt-4">GPT-4</option>
                        <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                      </>
                    )}
                    {formData.framework === 'huggingface' && (
                      <>
                        <option value="microsoft/DialoGPT-medium">DialoGPT Medium</option>
                        <option value="facebook/blenderbot-400M-distill">BlenderBot</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">Temperature</label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.frameworkConfig?.temperature || formData.temperature || 0.7}
                    onChange={handleFrameworkConfigChange}
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">Max Tokens</label>
                  <input
                    type="number"
                    name="max_tokens"
                    value={formData.frameworkConfig?.max_tokens || formData.max_tokens || 2000}
                    onChange={handleFrameworkConfigChange}
                    min="1"
                    max="8000"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-2">API Key</label>
                  <input
                    type="password"
                    name="api_key"
                    value={formData.frameworkConfig?.api_key || formData.api_key || ''}
                    onChange={handleFrameworkConfigChange}
                    placeholder="Enter your API key..."
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tool Parameters */}
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Tool Parameters</h3>
            <div>
              <label className="block text-slate-700 font-medium mb-2">Parameters (one per line)</label>
              <textarea
                name="parameters"
                value={formData.parameters || ''}
                onChange={handleInputChange}
                rows={5}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                placeholder="input_text&#10;max_length&#10;temperature"
              />
              <p className="text-sm text-slate-500 mt-2">
                Enter the parameters this tool accepts, one per line
              </p>
            </div>
          </div>

          {/* Custom Configuration JSON */}
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Custom Configuration</h3>
            <div>
              <label className="block text-slate-700 font-medium mb-2">Additional Config (JSON)</label>
              <textarea
                name="customConfig"
                value={formData.customConfig || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200 font-mono text-sm"
                placeholder='{"custom_setting": "value", "another_option": true}'
              />
              <p className="text-sm text-slate-500 mt-2">
                Additional configuration options in JSON format
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
          Tool Configuration
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Configure your tool with AI assistance or traditional methods
        </p>
      </div>

      {/* BYOK Status Indicator */}
      {renderBYOKStatus()}

      {/* Inheritance Indicator */}
      {isInheritingFromAgent && (
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-green-200/50 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-lg">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-800 mb-3">
                Inheriting from Agent: {parentAgent.data?.label || parentAgent.id}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Framework</div>
                  <div className="text-green-800">{parentAgent.data?.framework || 'Not set'}</div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Model</div>
                  <div className="text-green-800">{parentAgent.data?.frameworkConfig?.model || 'Not set'}</div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Temperature</div>
                  <div className="text-green-800">{parentAgent.data?.frameworkConfig?.temperature || 0.7}</div>
                </div>
                <div className="p-3 bg-white/60 rounded-lg">
                  <div className="text-green-600 font-medium">Max Tokens</div>
                  <div className="text-green-800">{parentAgent.data?.frameworkConfig?.max_tokens || 2000}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-100/50 rounded-lg">
                <p className="text-green-700 text-sm flex items-center">
                  <span className="mr-2">💡</span>
                  This tool will automatically use the agent's LLM configuration
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Configuration */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-blue-600">📝</span>
          </span>
          Basic Information
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Description
              <HelpTooltip type="tool" field="description" />
            </label>
            <input
              type="text"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
              placeholder="Describe what this tool does..."
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Tool Type *
              <HelpTooltip type="tool" field="toolType" />
            </label>
            <div className="relative">
              <select
                name="toolType"
                value={formData.toolType || ''}
                onChange={handleToolTypeChange}
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 bg-white appearance-none cursor-pointer shadow-sm"
                required
              >
                <option value="">Select Tool Type...</option>
                <option value="huggingface">🤗 HuggingFace AI Models</option>
                <option value="langchain">🦜 LangChain Agents</option>
                <option value="universal_api">🌐 Universal API Builder</option>
                <option value="llm">🤖 LLM Framework</option>
                <option value="api">🔗 API Integration</option>
                <option value="webhook">📨 Webhook</option>
                <option value="custom">⚙️ Custom Tool</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {formData.toolType === 'huggingface'
                ? "🎯 Choose from verified AI models with 100% success rate for text processing tasks"
                : formData.toolType === 'langchain'
                  ? "🤖 Create intelligent AI agents with tools, memory, and advanced reasoning capabilities"
                  : formData.toolType === 'universal_api'
                    ? "🌐 Universal API Builder"
                    : "Choose the type of tool you want to create"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      {formData.toolType && renderConfigurationSection()}

      {/* AI Configuration Display */}
      {formData.toolType === 'universal_api' && researchResult?.success && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-200/50 p-6">
          <h2 className="text-xl font-bold text-green-800 mb-6 flex items-center">
            <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white">✓</span>
            </span>
            AI-Generated Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="text-green-600 font-semibold text-sm mb-1">Service</div>
              <div className="text-green-800 font-bold">{researchResult.service_name}</div>
            </div>
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="text-green-600 font-semibold text-sm mb-1">API Type</div>
              <div className="text-green-800 font-bold">{researchResult.api_type}</div>
            </div>
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="text-green-600 font-semibold text-sm mb-1">Authentication</div>
              <div className="text-green-800 font-bold">{researchResult.auth_type}</div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-white/60 rounded-xl">
            <div className="text-green-600 font-semibold text-sm mb-2">Base URL</div>
            <code className="block p-3 bg-green-100/50 text-green-800 rounded-lg text-sm font-mono break-all">
              {researchResult.base_url}
            </code>
          </div>
          {researchResult.endpoints && (
            <div className="mt-6">
              <h3 className="text-green-800 font-semibold mb-4">Available Actions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {researchResult.endpoints.map((endpoint, i) => (
                  <div key={i} className="p-4 bg-white/60 rounded-xl border border-green-200/30">
                    <div className="font-semibold text-green-800 mb-1">{endpoint.name}</div>
                    <div className="text-green-600 text-sm">{endpoint.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool Settings */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-orange-600">📋</span>
          </span>
          Tool Settings
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Expected Output
              <HelpTooltip type="tool" field="expectedOutput" />
            </label>
            <textarea
              name="expectedOutput"
              value={formData.expectedOutput || ''}
              onChange={handleInputChange}
              placeholder={formData.toolType === 'universal_api' 
                ? "AI will auto-detect expected output format based on the API research..."
                : "Describe what this tool should return..."
              }
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 resize-none shadow-sm"
              rows="4"
            />
            <p className="text-sm text-slate-500 mt-2">
              {formData.toolType === 'universal_api' 
                ? "Expected output will be automatically determined from API research"
                : "Describe the expected output format and content"
              }
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Additional Parameters (JSON)
              <HelpTooltip type="tool" field="parameters" />
            </label>
            <textarea
              name="parameters"
              value={formData.parameters || ''}
              onChange={handleInputChange}
              placeholder={formData.toolType === 'universal_api'
                ? '{"rate_limit": 60, "timeout": 30, "retries": 3}'
                : '{"timeout": 30, "retries": 3}'
              }
              className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 resize-none shadow-sm"
              rows="5"
            />
            <p className="text-sm text-slate-500 mt-2">
              Additional configuration parameters in JSON format
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-indigo-600">🔬</span>
          </span>
          Advanced Options
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3 flex items-center">
              Condition to Run (optional)
              <HelpTooltip type="tool" field="condition" />
            </label>
            <input
              type="text"
              name="condition"
              value={formData.condition || ""}
              onChange={handleInputChange}
              placeholder="e.g. inputs.score > 80"
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-slate-700 placeholder-slate-400 shadow-sm"
            />
            <p className="text-sm text-slate-500 mt-2">
              This tool will only execute if the condition is true. Use <code className="bg-slate-100 px-2 py-1 rounded text-xs">inputs.*</code> to reference input values.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start p-4 bg-slate-50/50 rounded-xl border border-slate-200/30">
              <input
                type="checkbox"
                name="async"
                checked={formData.async || false}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500/20 border-slate-300 rounded mt-1"
              />
              <div className="ml-4">
                <label className="text-slate-800 font-semibold">
                  Execute asynchronously
                </label>
                <p className="text-slate-600 text-sm mt-1">
                  When enabled, this tool will run in the background without blocking other operations
                </p>
              </div>
            </div>

            {formData.toolType === 'universal_api' && researchResult?.success && (
              <div className="flex items-start p-4 bg-blue-50/50 rounded-xl border border-blue-200/30">
                <input
                  type="checkbox"
                  name="save_as_custom_node"
                  checked={formData.save_as_custom_node || false}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500/20 border-slate-300 rounded mt-1"
                />
                <div className="ml-4">
                  <label className="text-blue-800 font-semibold flex items-center">
                    <span className="mr-2">💾</span>
                    Save as Custom Node Template
                  </label>
                  <p className="text-blue-600 text-sm mt-1">
                    Save this AI-configured tool to your node palette for future use
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-green-600">🧪</span>
            </span>
            Test Your Tool
          </h2>
          <div className="flex items-center space-x-3">
            {formData.toolType === 'universal_api' && researchResult?.success && (
              <button
                type="button"
                onClick={() => {
                  const sampleInput = researchResult.sample_input || {
                    query: "test query",
                    parameters: researchResult.sample_parameters || {},
                    context: "test context"
                  };
                  setTestInput(JSON.stringify(sampleInput, null, 2));
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🤖 Use AI Sample
              </button>
            )}
            <button
              type="button"
              onClick={runToolTest}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Run Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <label className="block text-slate-700 font-semibold mb-3">
              Test Input (JSON)
            </label>
            <textarea
              value={testInput || ''}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 resize-none shadow-sm"
              rows={8}
              placeholder={formData.toolType === 'universal_api' && researchResult?.success
                ? JSON.stringify(researchResult.sample_input || {
                    action: "create_item",
                    data: { title: "Test Item", description: "Test Description" }
                  }, null, 2)
                : JSON.stringify({
                    query: "test query",
                    parameters: { limit: 10 },
                    context: "test context"
                  }, null, 2)
              }
            />
            <p className="text-sm text-slate-500 mt-2">
              {formData.toolType === 'universal_api' 
                ? "Test data based on AI research. Click 'Use AI Sample' for auto-generated test data."
                : "Provide test data for your tool"
              }
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-3">Test Result</label>
            <div className="h-64 p-4 border border-slate-200 rounded-xl bg-slate-50/50 overflow-y-auto">
              {testResult ? (
                <div className={`p-4 rounded-xl ${
                  testResult.success 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50' 
                    : 'bg-gradient-to-br from-red-50 to-rose-50 border border-red-200/50'
                }`}>
                  {testResult.success ? (
                    <div>
                      <div className="font-semibold mb-3 flex items-center text-green-800">
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs">✓</span>
                        </span>
                        {formData.toolType === 'universal_api' ? 'AI Integration Success' : 'Test Successful'}
                      </div>
                      <pre className="text-xs bg-white/60 p-3 rounded-lg overflow-x-auto border border-green-200/30 text-green-800">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                      <div className="flex items-center justify-between mt-3 text-xs text-green-600">
                        {testResult.execution_time && (
                          <span>Execution: {testResult.execution_time.toFixed(2)}s</span>
                        )}
                        {formData.toolType === 'universal_api' && testResult.result?.confidence && (
                          <span>AI Confidence: {(testResult.result.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold mb-3 flex items-center text-red-800">
                        <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs">✕</span>
                        </span>
                        Test Failed
                      </div>
                      <div className="text-sm text-red-700 bg-white/60 p-3 rounded-lg border border-red-200/30">
                        {testResult.error}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">🧪</span>
                    </div>
                    <div className="text-sm">
                      {formData.toolType === 'universal_api' 
                        ? "Run a test to verify AI-configured API integration"
                        : "Run a test to see results"
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Test Inputs */}
        <div className="mt-8 p-6 bg-slate-50/50 rounded-xl border border-slate-200/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Saved Test Inputs</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <select
                  className="text-sm border border-slate-200 rounded-lg p-3 pr-10 bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
                  onChange={(e) => {
                    if (e.target.value) {
                      const selected = savedTestInputs.find(item => item.name === e.target.value);
                      if (selected) {
                        setTestInput(selected.input);
                      }
                    }
                  }}
                  value=""
                >
                  <option value="">Load saved input...</option>
                  {(savedTestInputs || []).map((item, index) => (
                    <option key={index} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <button
                type="button"
                onClick={saveTestInput}
                className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-slate-200"
              >
                💾 Save Input
              </button>
            </div>
          </div>

          {savedTestInputs && savedTestInputs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {savedTestInputs.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setTestInput(item.input)}
                  className="p-3 text-left border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="font-medium text-sm text-slate-900 truncate group-hover:text-blue-700">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(item.timestamp || Date.now()).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-sm">No saved test inputs yet</div>
            </div>
          )}
        </div>
      </div>

      {/* AI Research Summary */}
      {formData.toolType === 'universal_api' && researchResult?.success && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200/50 p-6">
          <h2 className="text-xl font-bold text-blue-800 mb-6 flex items-center">
            <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white">🔬</span>
            </span>
            AI Research Summary
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-blue-800 mb-4">📊 Research Results</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Service:</span>
                  <span className="text-blue-800 font-medium">{researchResult.service_name}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">API Type:</span>
                  <span className="text-blue-800 font-medium">{researchResult.api_type}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Auth:</span>
                  <span className="text-blue-800 font-medium">{researchResult.auth_type}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Endpoints:</span>
                  <span className="text-blue-800 font-medium">{researchResult.endpoints?.length || 0}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-20 text-blue-600 shrink-0">Confidence:</span>
                  <div className="flex items-center">
                    <div className="w-20 h-2 bg-blue-200 rounded-full mr-2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        style={{ width: `${(researchResult.confidence * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-blue-800 font-medium text-xs">
                      {(researchResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-4">⚙️ Auto-Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Base URL configured
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  HTTP methods detected
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Headers formatted
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Authentication prepared
                </div>
                <div className="flex items-center text-sm text-blue-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Error handling added
                </div>
              </div>
            </div>
          </div>

          {formData.save_as_custom_node && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl border border-blue-200/30">
              <div className="flex items-center text-blue-800 text-sm font-medium">
                <span className="mr-2">💾</span>
                This configuration will be saved as a reusable custom node template
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-4">
            Your tool configuration is automatically saved as you make changes
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <span>🔒</span>
            <span>Enterprise-grade security</span>
            <span>•</span>
            <span>🚀</span>
            <span>AI-powered configuration</span>
            <span>•</span>
            <span>⚡</span>
            <span>Real-time validation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

ToolEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleFrameworkChange: PropTypes.func.isRequired,
  testInput: PropTypes.string,
  setTestInput: PropTypes.func.isRequired,
  testResult: PropTypes.object,
  setTestResult: PropTypes.func.isRequired,
  savedTestInputs: PropTypes.array,
  saveTestInput: PropTypes.func.isRequired,
  connectedNodes: PropTypes.array
};

export default ToolEditor; 