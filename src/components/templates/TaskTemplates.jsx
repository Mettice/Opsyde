import React, { useState } from 'react';
import { taskTemplates } from '../../data/taskTemplates';

const TaskTemplates = ({ onClose, onSelectTemplate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(taskTemplates.map(task => task.category))];

  const filteredTasks = taskTemplates.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search tasks..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {filteredTasks.map((task, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
            onClick={() => onSelectTemplate(task)}
          >
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">{task.icon}</span>
              <h3 className="font-semibold text-lg">{task.name}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-1">{task.description}</p>
            <div className="text-xs text-gray-500">
              <strong>Input:</strong> {task.expectedInput}<br />
              <strong>Output:</strong> {task.expectedOutput}
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center text-gray-500">No matching tasks found.</div>
      )}

      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Close
        </button>
      </div>
    </div>
  );
};

export default TaskTemplates;