import React from 'react';

export default function ToolTemplatesFooter({ onAddCustom, onClose }) {
  const handleAddCustom = () => {
    if (onAddCustom) {
      onAddCustom();
    } else {
      // Default custom tool if no handler provided
      onSelectTemplate({
        name: 'Custom Tool',
        description: 'Custom tool definition',
        toolType: 'custom',
        parameters: '',
        icon: '🛠️',
        category: 'Custom'
      });
    }
  };

  return (
    <div className="flex justify-between">
      <button 
        onClick={handleAddCustom}
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
      >
        Create Custom Tool
      </button>
      <button 
        onClick={onClose}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Cancel
      </button>
    </div>
  );
} 