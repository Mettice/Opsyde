import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import yaml from 'js-yaml';

const CrewAIImporter = ({ onImport, onClose }) => {
  const [yamlContent, setYamlContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Sample CrewAI YAML for demonstration
  const sampleYaml = `# CrewAI Configuration
crew:
  name: "Content Creation Crew"
  description: "A crew for creating and reviewing content"
  
agents:
  - name: "Content Writer"
    role: "Senior Content Writer"
    goal: "Create engaging and informative content"
    backstory: "You are an experienced content writer with expertise in various topics"
    llm:
      model: "gpt-4"
      temperature: 0.7
    tools:
      - web_search
      - file_reader
    memory: true
    
  - name: "Content Reviewer"
    role: "Content Quality Reviewer"
    goal: "Review and improve content quality"
    backstory: "You are a meticulous editor focused on quality and accuracy"
    llm:
      model: "gpt-4"
      temperature: 0.3
    memory: true

tasks:
  - name: "Research Topic"
    description: "Research the given topic thoroughly"
    expected_output: "Comprehensive research summary"
    agent: "Content Writer"
    tools:
      - web_search
      
  - name: "Write Article"
    description: "Write a detailed article based on research"
    expected_output: "Well-structured article"
    agent: "Content Writer"
    depends_on: ["Research Topic"]
    
  - name: "Review Article"
    description: "Review and improve the article"
    expected_output: "Polished final article"
    agent: "Content Reviewer"
    depends_on: ["Write Article"]

tools:
  - name: "web_search"
    description: "Search the web for information"
    type: "search"
  - name: "file_reader"
    description: "Read and analyze files"
    type: "file"

process: "sequential"
memory: true
verbose: true`;

  // Enhanced validation function
  const validateYamlData = useCallback((yamlData) => {
    const warnings = [];
    
    // Check for missing agent roles
    if (yamlData.agents) {
      yamlData.agents.forEach((agent, index) => {
        if (!agent.name) {
          warnings.push({
            type: 'error',
            message: `Agent ${index + 1} is missing a name`,
            category: 'agent'
          });
        }
        if (!agent.role) {
          warnings.push({
            type: 'warning',
            message: `Agent "${agent.name || `Agent ${index + 1}`}" is missing a role`,
            category: 'agent'
          });
        }
        if (!agent.goal) {
          warnings.push({
            type: 'warning',
            message: `Agent "${agent.name || `Agent ${index + 1}`}" is missing a goal`,
            category: 'agent'
          });
        }
        if (!agent.llm?.model) {
          warnings.push({
            type: 'warning',
            message: `Agent "${agent.name || `Agent ${index + 1}`}" has no LLM provider specified`,
            category: 'llm'
          });
        }
      });
    }
    
    // Check for unknown tool types
    if (yamlData.tools) {
      const knownToolTypes = ['search', 'file', 'api', 'calculator', 'email', 'database', 'llm', 'custom'];
      yamlData.tools.forEach((tool) => {
        if (!tool.name) {
          warnings.push({
            type: 'error',
            message: `Tool is missing a name`,
            category: 'tool'
          });
        }
        if (tool.type && !knownToolTypes.includes(tool.type)) {
          warnings.push({
            type: 'info',
            message: `Unknown tool type "${tool.type}" for tool "${tool.name}"`,
            category: 'tool'
          });
        }
      });
    }
    
    // Check for missing task descriptions
    if (yamlData.tasks) {
      yamlData.tasks.forEach((task, index) => {
        if (!task.name) {
          warnings.push({
            type: 'error',
            message: `Task ${index + 1} is missing a name`,
            category: 'task'
          });
        }
        if (!task.description) {
          warnings.push({
            type: 'warning',
            message: `Task "${task.name || `Task ${index + 1}`}" is missing a description`,
            category: 'task'
          });
        }
        if (!task.expected_output) {
          warnings.push({
            type: 'info',
            message: `Task "${task.name || `Task ${index + 1}`}" has no expected output defined`,
            category: 'task'
          });
        }
        
        // Check if assigned agent exists
        if (task.agent) {
          const agentExists = yamlData.agents?.some(a => a.name === task.agent);
          if (!agentExists) {
            warnings.push({
              type: 'error',
              message: `Task "${task.name}" is assigned to agent "${task.agent}" which doesn't exist`,
              category: 'agent-task'
            });
          }
        }
        
        // Check if referenced tools exist
        if (task.tools) {
          task.tools.forEach(toolName => {
            const toolExists = yamlData.tools?.some(t => t.name === toolName);
            if (!toolExists) {
              warnings.push({
                type: 'warning',
                message: `Task "${task.name}" references tool "${toolName}" which doesn't exist`,
                category: 'tool-task'
              });
            }
          });
        }
      });
    }
    
    // Check for orphaned dependencies
    if (yamlData.tasks) {
      yamlData.tasks.forEach((task) => {
        if (task.depends_on) {
          task.depends_on.forEach((dep) => {
            const depExists = yamlData.tasks.some(t => t.name === dep);
            if (!depExists) {
              warnings.push({
                type: 'error',
                message: `Task "${task.name}" depends on "${dep}" which doesn't exist`,
                category: 'dependency'
              });
            }
          });
        }
      });
    }
    
    // Check for agents without tasks
    if (yamlData.agents && yamlData.tasks) {
      yamlData.agents.forEach((agent) => {
        const hasTask = yamlData.tasks.some(t => t.agent === agent.name);
        if (!hasTask) {
          warnings.push({
            type: 'info',
            message: `Agent "${agent.name}" has no assigned tasks`,
            category: 'agent-task'
          });
        }
      });
    }
    
    return warnings;
  }, []);

  const parseYamlToNodes = useCallback((yamlData) => {
    const nodes = [];
    const edges = [];
    let nodeId = 1;
    let yPosition = 100;
    
    // Create agent nodes
    if (yamlData.agents) {
      yamlData.agents.forEach((agent, index) => {
        const agentNode = {
          id: `agent-${nodeId}`,
          type: 'agent',
          position: { x: 100 + (index * 300), y: yPosition },
          data: {
            nodeId: `agent-${nodeId}`,
            nodeType: 'agent',
            label: agent.name || `Agent ${index + 1}`,
            role: agent.role || '',
            goal: agent.goal || '',
            backstory: agent.backstory || '',
            framework: 'crewai',
            llmModel: agent.llm?.model || 'gpt-4',
            temperature: agent.llm?.temperature || 0.7,
            max_tokens: agent.llm?.max_tokens || 4000,
            enableMemory: agent.memory || yamlData.memory || false,
            allowDelegation: agent.allow_delegation || false,
            max_iterations: agent.max_iterations || 3,
            tools: agent.tools || [],
            verbose: yamlData.verbose || true
          }
        };
        nodes.push(agentNode);
        nodeId++;
      });
    }
    
    yPosition += 200;
    
    // Create tool nodes if defined separately
    if (yamlData.tools) {
      yamlData.tools.forEach((tool, index) => {
        // Check if this is a built-in CrewAI tool
        const builtInCrewAITools = ['web_search', 'calculator', 'file_reader'];
        const isBuiltInTool = builtInCrewAITools.includes(tool.name);
        
        const toolNode = {
          id: `tool-${nodeId}`,
          type: 'tool',
          position: { x: 100 + (index * 250), y: yPosition },
          data: {
            nodeId: `tool-${nodeId}`,
            nodeType: 'tool',
            label: tool.name || `Tool ${index + 1}`,
            description: tool.description || '',
            toolType: tool.type || 'api',
            // Use 'crewai' framework only for built-in tools, otherwise use 'api'
            framework: isBuiltInTool ? 'crewai' : 'api',
            frameworkConfig: isBuiltInTool ? {
              // For built-in CrewAI tools, use minimal config
              tool_name: tool.name,
              tool_type: tool.type || 'builtin',
              config: tool.config || {}
            } : {
              // For custom tools, use API framework config
              url: tool.config?.endpoint || '',
              method: tool.config?.method || 'GET',
              headers: tool.config?.headers || {},
              params: tool.config?.params || {}
            }
          }
        };
        nodes.push(toolNode);
        nodeId++;
      });
      yPosition += 200;
    }
    
    // Create task nodes
    if (yamlData.tasks) {
      yamlData.tasks.forEach((task, index) => {
        const taskNode = {
          id: `task-${nodeId}`,
          type: 'task',
          position: { x: 100 + (index * 300), y: yPosition },
          data: {
            nodeId: `task-${nodeId}`,
            nodeType: 'task',
            label: task.name || `Task ${index + 1}`,
            description: task.description || '',
            expectedOutput: task.expected_output || '',
            framework: 'crewai',
            priority: task.priority || 'medium',
            async: task.async || false,
            dependencies: task.depends_on || []
          }
        };
        nodes.push(taskNode);
        
        // Create edges for task dependencies
        if (task.depends_on) {
          task.depends_on.forEach(dependency => {
            const dependencyTask = yamlData.tasks.find(t => t.name === dependency);
            if (dependencyTask) {
              const dependencyIndex = yamlData.tasks.indexOf(dependencyTask);
              const toolOffset = yamlData.tools ? yamlData.tools.length : 0;
              const agentOffset = yamlData.agents ? yamlData.agents.length : 0;
              edges.push({
                id: `edge-${edges.length + 1}`,
                source: `task-${dependencyIndex + agentOffset + toolOffset + 1}`,
                target: `task-${nodeId}`,
                type: 'default'
              });
            }
          });
        }
        
        // Connect agent to task - FIXED: Better agent matching
        if (task.agent) {
          const agent = yamlData.agents?.find(a => a.name === task.agent);
          if (agent) {
            const agentIndex = yamlData.agents.indexOf(agent);
            edges.push({
              id: `edge-${edges.length + 1}`,
              source: `agent-${agentIndex + 1}`,
              target: `task-${nodeId}`,
              type: 'default'
            });
          } else {
            console.warn(`Agent "${task.agent}" not found for task "${task.name}"`);
          }
        }
        
        // Connect tools to task - FIXED: Better tool matching
        if (task.tools) {
          task.tools.forEach(toolName => {
            const tool = yamlData.tools?.find(t => t.name === toolName);
            if (tool) {
              const toolIndex = yamlData.tools.indexOf(tool);
              const agentOffset = yamlData.agents ? yamlData.agents.length : 0;
              edges.push({
                id: `edge-${edges.length + 1}`,
                source: `tool-${agentOffset + toolIndex + 1}`,
                target: `task-${nodeId}`,
                type: 'default'
              });
            } else {
              console.warn(`Tool "${toolName}" not found for task "${task.name}"`);
            }
          });
        }
        
        nodeId++;
      });
    }
    
    // Add output node
    const outputNode = {
      id: `output-${nodeId}`,
      type: 'output',
      position: { x: 400, y: yPosition + 200 },
      data: {
        nodeId: `output-${nodeId}`,
        nodeType: 'output',
        label: 'Crew Output',
        outputType: 'webhook',
        description: 'Final crew execution results'
      }
    };
    nodes.push(outputNode);
    
    // Connect last task to output
    if (yamlData.tasks && yamlData.tasks.length > 0) {
      const toolOffset = yamlData.tools ? yamlData.tools.length : 0;
      const agentOffset = yamlData.agents ? yamlData.agents.length : 0;
      edges.push({
        id: `edge-${edges.length + 1}`,
        source: `task-${yamlData.tasks.length + agentOffset + toolOffset}`,
        target: `output-${nodeId}`,
        type: 'default'
      });
    }
    
    console.log('🔍 Debug - Parsed nodes:', nodes.length);
    console.log('🔍 Debug - Parsed edges:', edges.length);
    console.log('🔍 Debug - Agents found:', yamlData.agents?.length || 0);
    console.log('🔍 Debug - Tasks found:', yamlData.tasks?.length || 0);
    console.log('🔍 Debug - Tools found:', yamlData.tools?.length || 0);
    
    return { nodes, edges };
  }, []);

  const handleYamlChange = useCallback((value) => {
    setYamlContent(value);
    setError(null);
    setValidationWarnings([]);
    
    if (value.trim()) {
      try {
        const parsed = yaml.load(value);
        const warnings = validateYamlData(parsed);
        setValidationWarnings(warnings);
        
        const preview = parseYamlToNodes(parsed);
        setPreviewData(preview);
      } catch (err) {
        setError(`YAML parsing error: ${err.message}`);
        setPreviewData(null);
      }
    } else {
      setPreviewData(null);
    }
  }, [parseYamlToNodes, validateYamlData]);

  const handleImport = useCallback(async () => {
    if (!previewData) return;
    
    setIsProcessing(true);
    try {
      // Add metadata about the import
      const importData = {
        ...previewData,
        metadata: {
          source: 'crewai_yaml',
          importedAt: new Date().toISOString(),
          originalYaml: yamlContent,
          validationWarnings
        }
      };
      
      await onImport(importData);
      onClose();
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [previewData, yamlContent, validationWarnings, onImport, onClose]);

  const loadSample = useCallback(() => {
    setYamlContent(sampleYaml);
    handleYamlChange(sampleYaml);
  }, [handleYamlChange, sampleYaml]);

  // Export back to YAML functionality
  const exportToYaml = useCallback(() => {
    if (!previewData) return;
    
    try {
      // Convert nodes back to YAML structure
      const yamlStructure = {
        crew: {
          name: "Exported Workflow",
          description: "Workflow exported from Nodai"
        },
        agents: [],
        tasks: [],
        tools: [],
        process: "sequential",
        memory: true,
        verbose: true
      };
      
      // Extract agents
      previewData.nodes.filter(n => n.type === 'agent').forEach(node => {
        yamlStructure.agents.push({
          name: node.data.label,
          role: node.data.role,
          goal: node.data.goal,
          backstory: node.data.backstory,
          llm: {
            model: node.data.llmModel,
            temperature: node.data.temperature,
            max_tokens: node.data.max_tokens
          },
          memory: node.data.enableMemory,
          allow_delegation: node.data.allowDelegation,
          tools: node.data.tools
        });
      });
      
      // Extract tools
      previewData.nodes.filter(n => n.type === 'tool').forEach(node => {
        yamlStructure.tools.push({
          name: node.data.label,
          description: node.data.description,
          type: node.data.toolType
        });
      });
      
      // Extract tasks
      previewData.nodes.filter(n => n.type === 'task').forEach(node => {
        yamlStructure.tasks.push({
          name: node.data.label,
          description: node.data.description,
          expected_output: node.data.expectedOutput,
          agent: "Content Writer", // This would need to be mapped from connections
          depends_on: node.data.dependencies
        });
      });
      
      const exportedYaml = yaml.dump(yamlStructure, { indent: 2 });
      
      // Download the file
      const blob = new Blob([exportedYaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exported-crew-config.yaml';
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      setError(`Export failed: ${error.message}`);
    }
  }, [previewData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">CrewAI YAML Importer</h2>
            <p className="text-gray-600 mt-1">
              Import your CrewAI configuration and auto-generate a visual workflow
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Validation Warnings Banner */}
        {validationWarnings.length > 0 && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800 font-medium">
                {validationWarnings.length} validation issue{validationWarnings.length > 1 ? 's' : ''} found
              </span>
              <button 
                className="ml-4 text-yellow-600 hover:text-yellow-800 text-sm underline"
                onClick={() => setShowExportModal(!showExportModal)}
              >
                View Details
              </button>
            </div>
            {showExportModal && (
              <div className="mt-3 space-y-1">
                {validationWarnings.map((warning, index) => (
                  <div key={index} className={`text-sm flex items-center ${
                    warning.type === 'error' ? 'text-red-600' : 
                    warning.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                  }`}>
                    <span className="mr-2">
                      {warning.type === 'error' ? '❌' : warning.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* YAML Input Panel */}
          <div className="w-1/2 flex flex-col border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">YAML Configuration</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    title="Toggle dark mode"
                  >
                    {darkMode ? '☀️' : '🌙'}
                  </button>
                  <button
                    onClick={loadSample}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Load Sample
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={yamlContent}
                onChange={(e) => handleYamlChange(e.target.value)}
                placeholder="Paste your CrewAI YAML configuration here..."
                className={`w-full h-full font-mono text-sm border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-900 text-green-400 border-gray-700' 
                    : 'bg-white text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Preview</h3>
                  <p className="text-sm text-gray-600">Visual representation of your workflow</p>
                </div>
                {previewData && (
                  <button
                    onClick={exportToYaml}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    title="Export back to YAML"
                  >
                    📤 Export YAML
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {previewData && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-700 text-sm font-medium">
                        Successfully parsed! Ready to import {previewData.nodes.length} nodes and {previewData.edges.length} connections.
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Workflow Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Workflow Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Agents:</span>
                        <span className="ml-2 font-medium">
                          {previewData.nodes.filter(n => n.type === 'agent').length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tasks:</span>
                        <span className="ml-2 font-medium">
                          {previewData.nodes.filter(n => n.type === 'task').length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tools:</span>
                        <span className="ml-2 font-medium">
                          {previewData.nodes.filter(n => n.type === 'tool').length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Connections:</span>
                        <span className="ml-2 font-medium">{previewData.edges.length}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Framework:</span>
                        <span className="ml-2 font-medium text-blue-600">CrewAI 0.1.21</span>
                      </div>
                    </div>
                  </div>

                  {/* Node List */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Nodes to be Created</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {previewData.nodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">
                              {node.type === 'agent' ? '🤖' : 
                               node.type === 'task' ? '📋' : 
                               node.type === 'tool' ? '🔧' :
                               node.type === 'output' ? '📤' : '📦'}
                            </span>
                            <div>
                              <div className="font-medium text-sm">{node.data.label}</div>
                              <div className="text-xs text-gray-500 capitalize">{node.type}</div>
                            </div>
                          </div>
                          {node.data.enableMemory && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              Memory
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!previewData && !error && yamlContent && (
                <div className="text-center text-gray-500 py-8">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Processing YAML...</p>
                </div>
              )}

              {!yamlContent && (
                <div className="text-center text-gray-500 py-8">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Paste your CrewAI YAML configuration to get started</p>
                  <button
                    onClick={loadSample}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    or load a sample configuration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">✨ Enhanced:</span> Auto-validation, tool parsing, memory detection, and export back to YAML
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!previewData || isProcessing || validationWarnings.some(w => w.type === 'error')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isProcessing && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Import Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CrewAIImporter.propTypes = {
  onImport: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default CrewAIImporter; 