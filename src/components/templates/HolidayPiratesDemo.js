export const HolidayPiratesDealResearchTemplate = {
  name: "HolidayPirates Deal Research Agent",
  description: "AI-powered travel deal discovery and trend analysis system - exactly matching your first mission requirements",
  category: "Travel & E-commerce",
  difficulty: "Advanced",
  estimatedTime: "2-3 minutes",
  icon: "🏴‍☠️",
  tags: ["travel", "web-scraping", "ai-agents", "data-processing", "google-sheets"],
  
  // This matches their exact first mission
  mission: {
    title: "AI-Powered Deal Research Agent",
    objectives: [
      "Identify relevant travel trends based on search and seasonal patterns",
      "Crawl websites to collect fresh deal data",
      "Automatically format and feed results into Google Sheets or CMS"
    ]
  },

  agents: [
    {
      nodeId: "trend-analyst",
      name: "Travel Trend Analyst",
      role: "Senior Travel Market Researcher",
      goal: "Identify emerging travel trends and seasonal patterns that indicate high-value deal opportunities",
      backstory: "Expert in travel market analysis with deep understanding of seasonal booking patterns, destination popularity cycles, and consumer travel behavior. Specializes in identifying trends before they become mainstream.",
      framework: "crewai",
      tools: ["search", "calculator"],
      verbose: true,
      frameworkConfig: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.3,
        api_key: "[BYOK: OpenAI]"
      },
      systemMessage: "You are a senior travel market researcher. Analyze search trends, seasonal patterns, and market data to identify emerging travel opportunities. Focus on destinations showing growth, seasonal price patterns, and booking behavior insights."
    },
    {
      nodeId: "deal-crawler",
      name: "Deal Discovery Crawler",
      role: "Web Scraping Specialist",
      goal: "Crawl travel websites to collect fresh deal data and pricing information",
      backstory: "Expert web scraping specialist with experience in dynamic content extraction from travel booking sites. Skilled at handling anti-bot measures and extracting structured data from complex travel platforms.",
      framework: "langchain",
      tools: ["search", "url_reader", "python"],
      verbose: true,
      frameworkConfig: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.1,
        api_key: "[BYOK: OpenAI]",
        chainType: "agent"
      },
      systemMessage: "You are a web scraping specialist focused on travel deals. Extract flight prices, hotel rates, package deals, and availability from travel websites. Structure data consistently and identify the best value propositions."
    },
    {
      nodeId: "data-formatter",
      name: "Data Processing Specialist",
      role: "Travel Data Engineer",
      goal: "Process, enrich, and format travel deal data for CMS integration and Google Sheets export",
      backstory: "Data engineering specialist with expertise in travel industry data structures. Experienced in normalizing deal data, calculating savings percentages, and formatting content for automated publishing workflows.",
      framework: "langchain",
      tools: ["python", "calculator"],
      verbose: true,
      frameworkConfig: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.2,
        api_key: "[BYOK: OpenAI]",
        chainType: "agent"
      },
      systemMessage: "You are a data engineer specializing in travel deal processing. Clean, normalize, and enrich travel data. Calculate savings percentages, categorize deals, and format data for CMS systems and Google Sheets integration."
    },
    {
      nodeId: "content-optimizer",
      name: "Deal Content Creator",
      role: "Travel Content Specialist",
      goal: "Create compelling deal descriptions and content ready for publication",
      backstory: "Content specialist with expertise in travel marketing copy. Skilled at creating engaging deal descriptions that highlight value propositions and drive bookings while maintaining SEO optimization.",
      framework: "crewai",
      tools: ["search"],
      verbose: true,
      frameworkConfig: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.7,
        api_key: "[BYOK: OpenAI]"
      },
      systemMessage: "You are a travel content specialist. Create compelling, SEO-optimized deal descriptions that highlight value propositions. Include key details like savings amounts, travel dates, and booking deadlines in an engaging format."
    }
  ],

  tasks: [
    {
      nodeId: "analyze-trends",
      description: "Analyze current travel trends and identify high-opportunity destinations and timing patterns for deal discovery",
      expectedOutput: "Comprehensive trend analysis report with top 5 trending destinations, optimal booking windows, and seasonal opportunity insights",
      agent: "trend-analyst",
      context: [],
      toolsConfig: {
        search: {
          enabled: true,
          queries: [
            "travel trends 2024 popular destinations",
            "seasonal flight booking patterns",
            "emerging travel destinations gaining popularity",
            "best time to book flights seasonal analysis"
          ]
        }
      }
    },
    {
      nodeId: "crawl-deals",
      description: "Based on trend analysis, crawl major travel booking sites to discover current deals and pricing for identified opportunities",
      expectedOutput: "Structured dataset of current travel deals including prices, availability, destinations, and booking details",
      agent: "deal-crawler",
      context: ["analyze-trends"],
      toolsConfig: {
        search: {
          enabled: true,
          queries: [
            "flight deals to [trending destinations]",
            "hotel booking deals [seasonal opportunities]",
            "package vacation deals current offers"
          ]
        },
        url_reader: {
          enabled: true,
          target_sites: [
            "booking.com deals",
            "expedia current offers",
            "kayak flight deals"
          ]
        }
      }
    },
    {
      nodeId: "process-data",
      description: "Process and normalize the collected deal data, calculate savings percentages, and prepare structured data for export",
      expectedOutput: "Clean, normalized dataset with calculated metrics ready for Google Sheets and CMS integration",
      agent: "data-formatter",
      context: ["crawl-deals"],
      toolsConfig: {
        python: {
          enabled: true,
          operations: [
            "data_normalization",
            "savings_calculation",
            "date_formatting",
            "price_comparison"
          ]
        }
      }
    },
    {
      nodeId: "create-content",
      description: "Generate compelling deal descriptions and marketing copy optimized for HolidayPirates' audience",
      expectedOutput: "Publication-ready deal content with headlines, descriptions, and key selling points formatted for immediate use",
      agent: "content-optimizer",
      context: ["process-data"],
      toolsConfig: {
        content_requirements: {
          tone: "adventurous, value-focused",
          length: "150-300 words per deal",
          include: ["savings amount", "booking deadline", "travel window", "unique selling points"]
        }
      }
    }
  ],

  expectedOutputs: {
    "analyze-trends": "Market analysis with trending destinations and optimal timing insights",
    "crawl-deals": "Structured travel deal dataset with current pricing and availability",
    "process-data": "Normalized data ready for Google Sheets/CMS integration",
    "create-content": "Publication-ready deal content and marketing copy"
  },

  sampleInputs: {
    research_focus: "European city breaks and Mediterranean beach destinations",
    time_horizon: "Next 3 months booking window",
    target_audience: "Budget-conscious travelers seeking authentic experiences",
    deal_threshold: "Minimum 30% savings or exceptional value proposition"
  },

  integrations: {
    google_sheets: {
      enabled: true,
      format: "Deal Name | Destination | Original Price | Deal Price | Savings % | Travel Dates | Booking Deadline | Description"
    },
    cms_contentful: {
      enabled: true,
      content_type: "travel_deal",
      fields: ["title", "description", "price", "destination", "dates", "images"]
    },
    notifications: {
      enabled: true,
      channels: ["email", "slack"],
      triggers: ["high_value_deals", "trending_destinations", "limited_time_offers"]
    }
  },

  metrics: {
    performance: [
      "Deals discovered per hour",
      "Average savings percentage",
      "Trend prediction accuracy",
      "Content generation speed"
    ],
    business_value: [
      "Revenue potential per deal",
      "User engagement metrics",
      "Booking conversion rates",
      "Content publication efficiency"
    ]
  },

  scalability: {
    features: [
      "Multi-region deal discovery",
      "Real-time price monitoring",
      "Automated trend detection",
      "Dynamic content optimization",
      "A/B testing for deal descriptions"
    ]
  },

  // Demo-specific configurations
  demo: {
    duration: "3 minutes",
    highlights: [
      "Real-time trend analysis",
      "Automated web scraping simulation",
      "Data processing and formatting",
      "Google Sheets integration demo",
      "Publication-ready content generation"
    ],
    sample_results: {
      trends_identified: 5,
      deals_discovered: 12,
      average_savings: "42%",
      content_pieces: 12,
      processing_time: "2.3 minutes"
    }
  }
};

// Export for use in templates
export default HolidayPiratesDealResearchTemplate; 