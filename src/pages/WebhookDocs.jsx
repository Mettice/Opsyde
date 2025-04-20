import React from 'react';

const WebhookDocs = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Webhook Flow Integration</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <p className="mb-4">
          NodAI provides a webhook endpoint that allows external systems to send workflow definitions directly to the platform.
          This enables seamless integration with automation platforms, CRMs, and custom applications.
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Endpoint</h2>
        <div className="bg-gray-100 p-3 rounded font-mono mb-4">
          POST /load-webhook-flow
        </div>
        <p>
          This endpoint accepts JSON payloads containing node and edge definitions that will be loaded into the NodAI canvas.
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Authentication</h2>
        <p className="mb-4">
          To secure your webhook endpoint, you can set an environment variable <code>NODAI_WEBHOOK_SECRET</code> and then
          include this token in your requests.
        </p>
        <div className="bg-gray-100 p-3 rounded font-mono mb-4">
          Headers: {`{
  "Content-Type": "application/json",
  "x-nodai-secret": "your-secret-token"
}`}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Request Format</h2>
        <div className="bg-gray-100 p-3 rounded font-mono mb-4 overflow-auto">
          {`{
  "nodes": [
    {
      "id": "agent-1",
      "type": "agent",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Research Agent",
        "role": "Researcher",
        "goal": "Find information about a topic",
        "nodeId": "agent-1",
        "nodeType": "agent"
      }
    },
    // More nodes...
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "agent-1",
      "target": "task-1"
    },
    // More edges...
  ],
  "metadata": {
    "origin": "make",  // Optional: Source system (make, zapier, n8n, marketplace, ai, etc.)
    "author": "John Doe",  // Optional: Creator information
    "description": "A workflow for research tasks"  // Optional: Description
  },
  "mode": "replace"  // Optional: "replace" (default) or "merge"
}`}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Response Format</h2>
        <div className="bg-gray-100 p-3 rounded font-mono mb-4">
          {`{
  "status": "success",
  "data": {
    "nodes": [...],
    "edges": [...],
    "metadata": {...},
    "mode": "replace"
  }
}`}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Example Usage</h2>
        <div className="bg-gray-100 p-3 rounded font-mono mb-4 overflow-auto">
          {`// JavaScript example
fetch('https://your-nodai-instance.com/load-webhook-flow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-nodai-secret': 'your-secret-token'
  },
  body: JSON.stringify({
    nodes: [...],
    edges: [...],
    metadata: {
      origin: 'zapier',
      author: 'Marketing Team'
    },
    mode: 'merge'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`}
        </div>
      </div>
    </div>
  );
};

export default WebhookDocs; 