import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const WorkflowDashboard = () => {
  const [workflows, setWorkflows] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, inactive, scheduled
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWorkflows();
    loadTriggers();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/crew/');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    }
  };

  const loadTriggers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/triggers/executed');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTriggers(result.data.triggers || []);
        }
      }
    } catch (error) {
      console.error('Error loading triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflowActivation = async (workflowId, isActive) => {
    try {
      const response = await fetch(`http://localhost:8000/api/crew/${workflowId}/toggle-activation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || `Workflow ${isActive ? 'activated' : 'deactivated'}`);
        loadWorkflows(); // Refresh the list
      } else {
        toast.error('Failed to update workflow status');
      }
    } catch (error) {
      toast.error('Failed to update workflow status');
    }
  };

  const loadWorkflowInBuilder = (workflow) => {
    // Store workflow data in localStorage for the builder to pick up
    localStorage.setItem('loadWorkflow', JSON.stringify(workflow));
    
    // Open builder in new tab
    window.open('/builder', '_blank');
    
    toast.success('Workflow loaded in builder!');
  };

  const deleteWorkflow = async (workflowId) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/crew/${workflowId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Workflow deleted successfully');
        loadWorkflows();
      } else {
        toast.error('Failed to delete workflow');
      }
    } catch (error) {
      toast.error('Error deleting workflow');
    }
  };

  const duplicateWorkflow = async (workflow) => {
    try {
      const duplicatedWorkflow = {
        ...workflow,
        name: `${workflow.name} (Copy)`,
        id: undefined // Let backend generate new ID
      };

      const response = await fetch('http://localhost:8000/api/crew/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedWorkflow)
      });

      if (response.ok) {
        toast.success('Workflow duplicated successfully');
        loadWorkflows();
      } else {
        toast.error('Failed to duplicate workflow');
      }
    } catch (error) {
      toast.error('Error duplicating workflow');
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filter) {
      case 'active':
        return workflow.is_active;
      case 'inactive':
        return !workflow.is_active;
      case 'scheduled':
        return workflow.nodes?.some(node => node.type === 'trigger' && node.data?.triggerType === 'schedule');
      default:
        return true;
    }
  });

  const getWorkflowStats = () => {
    return {
      total: workflows.length,
      active: workflows.filter(w => w.is_active).length,
      inactive: workflows.filter(w => !w.is_active).length,
      scheduled: workflows.filter(w => w.nodes?.some(n => n.type === 'trigger')).length
    };
  };

  const stats = getWorkflowStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Loading workflows...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                🚀 Workflow Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Manage and monitor your automated workflows</p>
            </div>
            
            <button
              onClick={() => window.open('/builder', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
            >
              ➕ Create New Workflow
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Workflows</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.scheduled}</div>
            <div className="text-sm text-gray-600">With Triggers</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'active', label: 'Active', count: stats.active },
                { key: 'inactive', label: 'Inactive', count: stats.inactive },
                { key: 'scheduled', label: 'Scheduled', count: stats.scheduled }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map(workflow => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onToggleActivation={toggleWorkflowActivation}
              onLoadInBuilder={loadWorkflowInBuilder}
              onDelete={deleteWorkflow}
              onDuplicate={duplicateWorkflow}
            />
          ))}
        </div>

        {filteredWorkflows.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first workflow to get started'
              }
            </p>
            <button
              onClick={() => window.open('/builder', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create First Workflow
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkflowCard = ({ workflow, onToggleActivation, onLoadInBuilder, onDelete, onDuplicate }) => {
  const [isActive, setIsActive] = useState(workflow.is_active || false);

  const handleToggleActivation = async () => {
    const newState = !isActive;
    setIsActive(newState);
    await onToggleActivation(workflow.id, newState);
  };

  const getNodeCounts = () => {
    const nodes = workflow.nodes || [];
    return {
      agents: nodes.filter(n => n.type === 'agent').length,
      tasks: nodes.filter(n => n.type === 'task').length,
      triggers: nodes.filter(n => n.type === 'trigger').length,
      tools: nodes.filter(n => n.type === 'tool').length
    };
  };

  const counts = getNodeCounts();
  const lastModified = workflow.updated_at ? new Date(workflow.updated_at).toLocaleDateString() : 'Unknown';

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {workflow.name || 'Untitled Workflow'}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {workflow.description || 'No description provided'}
          </p>
        </div>
        
        {/* Activation Toggle */}
        <div className="ml-4">
          <button
            onClick={handleToggleActivation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className="text-xs text-center mt-1">
            {isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Node Counts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-2 rounded-lg">
          <div className="text-sm font-medium text-blue-700">🤖 {counts.agents} Agents</div>
        </div>
        <div className="bg-green-50 p-2 rounded-lg">
          <div className="text-sm font-medium text-green-700">📋 {counts.tasks} Tasks</div>
        </div>
        <div className="bg-purple-50 p-2 rounded-lg">
          <div className="text-sm font-medium text-purple-700">⚡ {counts.triggers} Triggers</div>
        </div>
        <div className="bg-orange-50 p-2 rounded-lg">
          <div className="text-sm font-medium text-orange-700">🔧 {counts.tools} Tools</div>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 mb-4">
        <div>Last modified: {lastModified}</div>
        <div>Nodes: {(workflow.nodes || []).length} • Edges: {(workflow.edges || []).length}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onLoadInBuilder(workflow)}
          className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          📝 Edit
        </button>
        
        <button
          onClick={() => onDuplicate(workflow)}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          📋 Copy
        </button>
        
        <button
          onClick={() => onDelete(workflow.id)}
          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default WorkflowDashboard; 