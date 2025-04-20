// src/modals/EditLogicModal.jsx
import React, { useState, useEffect } from "react";

export default function EditLogicModal({ node, onSave, onClose }) {
  const [name, setName] = useState(node.data.name || "");
  const [condition, setCondition] = useState(node.data.condition || "");

  const handleSave = () => {
    onSave({
      ...node,
      data: {
        ...node.data,
        name,
        condition,
      },
    });
    onClose();
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Edit Logic Node</h2>

      <label className="block text-sm font-medium">Name</label>
      <input
        className="w-full border px-2 py-1 rounded mb-3"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block text-sm font-medium">Condition</label>
      <input
        className="w-full border px-2 py-1 rounded mb-3 font-mono"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        placeholder='e.g. inputs.score > 80'
      />

      <div className="text-xs text-gray-500 mb-2">
        This node will branch based on the condition result.
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">
          Save
        </button>
        <button onClick={onClose} className="px-3 py-1 border rounded">
          Cancel
        </button>
      </div>
    </div>
  );
}
