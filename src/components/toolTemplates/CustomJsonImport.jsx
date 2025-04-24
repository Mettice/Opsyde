import React, { useState } from 'react';

export default function CustomJsonImport({
  jsonSchema, 
  setJsonSchema, 
  error, 
  setError, 
  onSelectTemplate, 
  onClose
}) {
  const [parsedTools, setParsedTools] = useState([]);

  const parseJsonSchema = () => {
    setError('');
    try {
      const parsed = JSON.parse(jsonSchema);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON schema must be an array of tool objects");
      }
      const validTools = parsed.filter(tool => tool.name && tool.description);
      if (validTools.length === 0) {
        throw new Error("No valid tools found in JSON schema");
      }
      setParsedTools(validTools);
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
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={parseJsonSchema}
      >
        Parse JSON
      </button>

      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {parsedTools.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Parsed Tools:</h3>
          <div className="grid grid-cols-2 gap-4">
            {parsedTools.map((tool, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                onClick={() => {
                  onSelectTemplate({
                    ...tool,
                    nodeType: 'tool'
                  });
                  onClose();
                }}
              >
                <h4 className="font-medium">{tool.name}</h4>
                <p className="text-sm text-gray-600">{tool.description}</p>
                {tool.framework && (
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
                    {tool.framework}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}