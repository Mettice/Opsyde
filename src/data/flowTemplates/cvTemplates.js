export const flowTemplates = [
    {
      name: 'Smart CV Parser & Scorer',
      description: 'Parse resumes, extract skills, score candidates, and log results.',
      thumbnail: '/img/cv-score.png',
      tags: ['HR', 'Automation', 'Recruitment'],
      version: '1.0',
      author: 'NodAi',
      created: '2025-04-15',
      nodes: [
        {
          id: 'agent-cv-1',
          type: 'agent',
          position: { x: 100, y: 80 },
          data: {
            label: 'Talent Analyst',
            role: 'HR Specialist',
            goal: 'Review, score, and qualify job candidates.',
            backstory: 'You are an experienced HR assistant with resume parsing skills.',
            llmModel: 'gpt-3.5-turbo',
            allowDelegation: true,
            verbose: true,
            nodeId: 'agent-cv-1',
            nodeType: 'agent'
          }
        },
        {
          id: 'tool-parse-1',
          type: 'tool',
          position: { x: 330, y: 150 },
          data: {
            label: 'CV Parser (HuggingFace)',
            description: 'Parses resume PDF or text and extracts structured data.',
            toolType: 'api',
            framework: 'huggingface',
            parameters: 'resume_url',
            icon: '📄',
            category: 'NLP',
            nodeId: 'tool-parse-1',
            nodeType: 'tool'
          }
        },
        {
          id: 'task-score-1',
          type: 'task',
          position: { x: 570, y: 150 },
          data: {
            label: 'Score Candidate',
            description: 'Score based on job fit, skills, and experience.',
            expectedOutput: 'Numeric score + match summary',
            async: false,
            nodeId: 'task-score-1',
            nodeType: 'task'
          }
        },
        {
          id: 'tool-log-1',
          type: 'tool',
          position: { x: 770, y: 280 },
          data: {
            label: 'Log to Sheet',
            description: 'Store parsed data + score in Google Sheets',
            toolType: 'api',
            framework: 'custom',
            parameters: 'name\nemail\nskills\nscore\nrecommendation',
            icon: '📊',
            category: 'Output',
            nodeId: 'tool-log-1',
            nodeType: 'tool'
          }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'agent-cv-1', target: 'tool-parse-1', type: 'smoothstep' },
        { id: 'edge-2', source: 'tool-parse-1', target: 'task-score-1', type: 'smoothstep' },
        { id: 'edge-3', source: 'task-score-1', target: 'tool-log-1', type: 'smoothstep' }
      ]
    },

    {
        name: "CV Parser + Interview Prep",
        description: "Parse, score and prepare questions for a candidate CV",
        frameworksUsed: ["huggingface", "openrouter", "sheets"],
        tags: ["Recruitment", "HR", "Automation"],
        thumbnail: "/img/cv-parser.png",
        nodes: [
          {
            id: "agent-cv",
            type: "agent",
            position: { x: 100, y: 100 },
            data: {
              label: "CV Screening Agent",
              role: "Recruitment Assistant",
              goal: "Analyze CVs and generate insights",
              backstory: "You are a recruiting assistant helping to score candidates and prep interview questions.",
              llmModel: "gpt-4",
              framework: "openrouter",
              allowDelegation: true,
              verbose: true,
              nodeId: "agent-cv",
              nodeType: "agent"
            }
          },
          {
            id: "tool-parser",
            type: "tool",
            position: { x: 300, y: 100 },
            data: {
              label: "CV Parser",
              description: "Parse uploaded CV and extract key fields",
              toolType: "custom",
              parameters: "cv_text",
              icon: "📄",
              category: "HR",
              framework: "huggingface",
              nodeId: "tool-parser",
              nodeType: "tool"
            }
          },
          {
            id: "task-score-cv",
            type: "task",
            position: { x: 500, y: 200 },
            data: {
              label: "Score CV",
              description: "Evaluate candidate fit for the job",
              expectedOutput: "Candidate score + summary",
              nodeId: "task-score-cv",
              nodeType: "task"
            }
          },
          {
            id: "task-generate-questions",
            type: "task",
            position: { x: 700, y: 300 },
            data: {
              label: "Generate Interview Questions",
              description: "Produce personalized questions based on experience",
              expectedOutput: "Set of tailored questions",
              nodeId: "task-generate-questions",
              nodeType: "task"
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'agent-cv', target: 'task-score-cv', type: 'smoothstep' },
          { id: 'edge-2', source: 'tool-parser', target: 'task-score-cv', type: 'smoothstep' },
          { id: 'edge-3', source: 'task-score-cv', target: 'task-generate-questions', type: 'smoothstep' }
                  
                  
        ],
        version: "1.0",
        author: "NodAi",
        created: "2025-04-15"
      }
  ];
  