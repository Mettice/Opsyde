// templates/autoEmailReplyTemplate.js

export const autoEmailReplyTemplate = {
    name: "Auto Email Reply Bot",
    description: "Classifies and replies to incoming emails based on intent.",
    thumbnail: "/img/email-bot-preview.png",
    nodes: [
      {
        id: "agent-inbox-parser",
        type: "agent",
        position: { x: 100, y: 100 },
        data: {
          label: "Inbox Agent",
          role: "Parser",
          goal: "Extract and analyze content from incoming emails",
          backstory: "You are responsible for scanning and interpreting incoming emails to identify context and intent.",
          llmModel: "gpt-4",
          allowDelegation: false,
          verbose: true,
          nodeId: "agent-inbox-parser",
          nodeType: "agent"
        }
      },
      {
        id: "task-classify-intent",
        type: "task",
        position: { x: 100, y: 250 },
        data: {
          label: "Classify Intent",
          description: "Identify email category (inquiry, lead, complaint, etc.)",
          expectedOutput: "Email type and priority",
          async: false,
          nodeId: "task-classify-intent",
          nodeType: "task"
        }
      },
      {
        id: "task-generate-reply",
        type: "task",
        position: { x: 300, y: 250 },
        data: {
          label: "Generate Reply",
          description: "Draft the appropriate email response based on context",
          expectedOutput: "Email response content",
          async: false,
          nodeId: "task-generate-reply",
          nodeType: "task"
        }
      },
      {
        id: "tool-email-sender",
        type: "tool",
        position: { x: 500, y: 100 },
        data: {
          label: "Email Sender",
          description: "Sends the reply via SMTP or API",
          toolType: "email",
          parameters: "recipient, subject, body",
          icon: "📤",
          category: "Output",
          nodeId: "tool-email-sender",
          nodeType: "tool"
        }
      }
    ],
    edges: [
      { id: "edge-1", source: "agent-inbox-parser", target: "task-classify-intent", type: "smoothstep" },
      { id: "edge-2", source: "task-classify-intent", target: "task-generate-reply", type: "smoothstep" },
      { id: "edge-3", source: "task-generate-reply", target: "tool-email-sender", type: "smoothstep" }
    ],
    tags: ["Email", "Automation", "Support", "Sales"],
    version: "1.0",
    author: "NodAi",
    created: new Date().toISOString()
  };
  