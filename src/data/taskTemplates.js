export const taskTemplates = [
    {
      name: 'Summarize Text',
      description: 'Takes long text input and summarizes it.',
      expectedInput: 'Long form text',
      expectedOutput: 'Summary',
      toolsLinked: ['LangChain Summarizer Tool'],
      icon: '📝',
      category: 'Content',
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-11-15',
      async: false,
      complexity: 'Medium'
    },
    {
      name: 'Web Research',
      description: 'Searches the web for information on a topic.',
      expectedInput: 'Research topic or question',
      expectedOutput: 'Comprehensive research report',
      toolsLinked: ['Web Search Tool', 'Content Extractor'],
      icon: '🔍',
      category: 'Research',
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-11-20',
      async: true,
      complexity: 'High'
    },
    {
      name: 'Data Analysis',
      description: 'Analyzes data and extracts insights.',
      expectedInput: 'CSV or JSON data',
      expectedOutput: 'Analysis report with insights',
      toolsLinked: ['Data Analysis Tool', 'Chart Generator'],
      icon: '📊',
      category: 'Analytics',
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-05',
      async: false,
      complexity: 'High'
    },
    {
      name: 'Email Drafting',
      description: 'Drafts professional emails based on requirements.',
      expectedInput: 'Email purpose and key points',
      expectedOutput: 'Drafted email',
      toolsLinked: ['Grammar Checker'],
      icon: '✉️',
      category: 'Communication',
      version: '1.0',
      author: 'CrewAI Team',
      created: '2023-12-10',
      async: false,
      complexity: 'Low'
    }
  ];
  

  