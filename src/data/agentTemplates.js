// agentTemplates.js or within the same file

export const agentTemplates = [
    {
      name: 'Research Agent',
      description: 'Specializes in deep research and summarization.',
      role: 'Researcher',
      goal: 'Provide detailed, factual summaries based on web content.',
      backstory: 'You are an academic researcher agent tasked with analyzing data and documents.',
      icon: '🧠',
      category: 'LangChain',
      llmModel: 'gpt-4',
      allowDelegation: true,
      verbose: true,
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-11-15'
    },
    {
      name: 'Sales Assistant',
      description: 'Helps with sales outreach and follow-ups.',
      role: 'Sales Assistant',
      goal: 'Generate personalized sales messages and follow-up strategies.',
      backstory: 'You are a sales assistant agent specialized in customer outreach and relationship building.',
      icon: '💼',
      category: 'Business',
      llmModel: 'gpt-4',
      allowDelegation: false,
      verbose: true,
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-01'
    },
    {
      name: 'Data Analyst',
      description: 'Analyzes data and creates visualizations.',
      role: 'Data Analyst',
      goal: 'Extract insights from data and present them clearly.',
      backstory: 'You are a data analyst with expertise in statistics and data visualization.',
      icon: '📊',
      category: 'Analytics',
      llmModel: 'gpt-4',
      allowDelegation: true,
      verbose: true,
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-05'
    },
    {
      name: 'Customer Support',
      description: 'Handles customer inquiries and resolves issues.',
      role: 'Support Agent',
      goal: 'Provide helpful, accurate responses to customer questions.',
      backstory: 'You are a customer support agent with a friendly demeanor and problem-solving skills.',
      icon: '🎧',
      category: 'Support',
      llmModel: 'gpt-3.5-turbo',
      allowDelegation: false,
      verbose: true,
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-10'
    }
  ];
  