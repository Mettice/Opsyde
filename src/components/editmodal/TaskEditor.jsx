import React from 'react';
import PropTypes from 'prop-types';
import HelpTooltip from '../HelpTooltip';

const TaskEditor = ({ formData, handleInputChange, availableDependencies }) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Description
          <HelpTooltip type="task" field="description" />
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="Detailed description of what needs to be done"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1 flex items-center">
          Expected Output
          <HelpTooltip type="task" field="expectedOutput" />
        </label>
        <textarea
          name="expectedOutput"
          value={formData.expectedOutput || ''}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows="2"
          placeholder="What should this task produce?"
        />
      </div>

      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="async"
          name="async"
          checked={formData.async || false}
          onChange={handleInputChange}
          className="mr-2"
        />
        <label htmlFor="async" className="text-gray-700 flex items-center">
          Asynchronous Execution
          <HelpTooltip type="task" field="async" />
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1">Dependencies</label>
        <div className="bg-gray-50 p-3 rounded border">
          <p className="text-sm text-gray-500 mb-2">
            Dependencies are automatically detected from connections, but you can specify dependency types:
          </p>
          {formData.dependencies && formData.dependencies.length > 0 ? (
            formData.dependencies.map((dep, index) => (
              <div key={index} className="flex items-center mb-2">
                <span className="text-sm font-medium mr-2">{dep.label}:</span>
                <select
                  name={`dependencies[${index}].type`}
                  value={dep.type || 'data'}
                  onChange={(e) => {
                    const newDeps = [...formData.dependencies];
                    newDeps[index] = { ...newDeps[index], type: e.target.value };
                    handleInputChange({
                      target: {
                        name: 'dependencies',
                        value: newDeps
                      }
                    });
                  }}
                  className="text-sm p-1 border rounded"
                >
                  <option value="data">Data Dependency</option>
                  <option value="execution">Execution Dependency</option>
                  <option value="optional">Optional</option>
                </select>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">No dependencies detected. Connect this task to other tasks to create dependencies.</p>
          )}
        </div>
      </div>
    </>
  );
};

TaskEditor.propTypes = {
  formData: PropTypes.object.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  availableDependencies: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      name: PropTypes.string
    })
  )
};

export default TaskEditor;