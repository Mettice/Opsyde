import React from 'react';

const openrouterModels = [
  "mistralai/mistral-7b-instruct",
  "openai/gpt-3.5-turbo",
  "meta-llama/llama-2-70b-chat",
  "anthropic/claude-2"
];

export default function FrameworkSelector({ selectedFramework, setSelectedFramework, selectedModel, setSelectedModel }) {
  return (
    <div className="flex gap-4 mb-4">
      <select className="px-3 py-2 border border-gray-300 rounded-md" value={selectedFramework} onChange={(e) => setSelectedFramework(e.target.value)}>
        <option value="crew">CrewAI</option>
        <option value="openrouter">OpenRouter</option>
        <option value="huggingface">HuggingFace</option>
        <option value="llamaindex">LlamaIndex</option>
        <option value="autogen">Autogen</option>
      </select>

      {selectedFramework === "openrouter" && (
        <select className="px-3 py-2 border border-gray-300 rounded-md" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {openrouterModels.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      )}
    </div>
  );
}