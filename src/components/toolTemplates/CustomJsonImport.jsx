import React from 'react';

export default function CustomJsonImport({
  jsonSchema, setJsonSchema, registryTools, setRegistryTools,
  error, setError, onSelectTemplate, onClose
}) {
  const parseJsonSchema = () => {
    setError('');
    try {
      const parsedTools = JSON.parse(jsonSchema);
      if (!Array.isArray(parsedTools)) {
        throw new Error("JSON schema must be an array of tool objects");
      }
      const validTools = parsedTools.filter(tool => tool.name && tool.description);
      if (validTools.length === 0) {
        throw new Error("No valid tools found in JSON schema");
      }
      setRegistryTools(validTools);
    } catch (err) {
      console.error("Error parsing JSON schema:", err);
      setError(err.message || "Invalid JSON schema");
    }
  };

  return (
    <div className="mb-4">
      <textarea
        className="w-full h-40 p-2 border border-gray-300 rounded"
        placeholder="Paste your JSON tool schema here..."
        value={jsonSchema}
        onChange={(e) => setJsonSchema(e.target.value)}
      ></textarea>
      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={parseJsonSchema}
      >
        Parse JSON
      </button>

      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {registryTools.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Parsed Tools:</h3>
          <div className="grid grid-cols-2 gap-4">
            {registryTools.map((tool, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                onClick={() => {
                  onSelectTemplate(tool);
                  onClose();
                }}
              >
                <h4 className="font-medium">{tool.name}</h4>
                <p className="text-sm text-gray-600">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}