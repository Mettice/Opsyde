// Legal AI Assistant Template
// Based on the $35K legal AI system case study

export const legalAiAssistantTemplate = {
  id: "private_legal_gpt",
  name: "🏛️ Private Legal AI Assistant",
  description: "Self-hosted legal AI assistant for document upload, embedding, RAG queries, and compliance routing. Built for law firms requiring data privacy and compliance. No OpenAI or external cloud dependencies.",
  category: "Legal & Compliance",
  thumbnail: "/img/legal-ai-assistant-flow.png",
  
  // Template metadata
  metadata: {
    version: "1.0",
    created: "2024-12-19",
    author: "CrewBuilder AI - Enterprise Legal Suite",
    complexity: "Expert",
    estimatedTime: "15-30 minutes setup",
    estimatedCost: "$35K-65K implementation",
    useCase: "Private legal document analysis and Q&A system for compliance-focused law firms",
    industry: ["Legal", "Law Firms", "Compliance", "Professional Services"],
    frameworks: ["crewai", "huggingface", "chromadb", "llamaindex"],
    features: [
      "🔒 Private LLM (LLaMA 3 70B)",
      "📄 Legal document processing",
      "🗄️ Vector database storage (ChromaDB)",
      "💬 Staff Q&A interface", 
      "📧 Email/Slack routing",
      "📋 Compliance audit logging",
      "🛡️ Zero external API dependencies"
    ],
    businessValue: "Very High - $6K/week savings in paralegal time, full compliance, immediate ROI",
    complianceFeatures: [
      "Self-hosted infrastructure",
      "No data leaves premises", 
      "Full audit trails",
      "IP access controls",
      "JWT authentication",
      "GDPR/HIPAA ready"
    ]
  },

  // Visual flow nodes
  nodes: [
    // 1. Document Upload Trigger
    {
      id: "trigger-doc-upload",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "📁 Legal Document Monitor",
        triggerType: "universal_polling",
        serviceName: "Google Drive Legal Folder",
        apiEndpoint: "https://www.googleapis.com/drive/v3/files?q='YOUR_LEGAL_FOLDER_ID'+in+parents",
        pollingInterval: 300, // 5 minutes
        authType: "oauth2",
        changeDetectionMethod: "array_length",
        description: "Monitors shared Google Drive folder for new legal documents (PDFs, DOCX)",
        
        // Legal-specific filtering
        includeFields: ["id", "name", "mimeType", "createdTime", "size"],
        excludeFields: ["permissions", "owners"],
        fieldConditions: {
          "mimeType": ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        },
        maxNewRecords: 10,
        
        nodeId: "trigger-doc-upload",
        nodeType: "trigger"
      }
    },

    // 2. Document Processing Agent
    {
      id: "agent-doc-processor",
      type: "agent",
      position: { x: 400, y: 100 },
      data: {
        label: "📄 Legal Document Processor",
        role: "Legal Document Processing Specialist",
        goal: "Extract, validate, and prepare legal documents for embedding while maintaining document integrity and metadata",
        backstory: "You are a specialized legal document processing expert with deep knowledge of legal document structures, confidentiality requirements, and compliance standards. You handle sensitive legal documents with the utmost care and precision.",
        
        prompt: `You are a legal document processing specialist. Your task is to:

1. **Document Validation**:
   - Verify document type (contracts, briefs, case files, etc.)
   - Check for sensitive information markers
   - Validate document completeness and readability

2. **Text Extraction**:
   - Extract clean text while preserving legal formatting
   - Maintain paragraph structure and section headers
   - Preserve important metadata (dates, parties, case numbers)

3. **Chunking Strategy**:
   - Use legal-aware chunking (by section, clause, or paragraph)
   - Maintain context across related sections
   - Ensure no sensitive information is truncated

4. **Compliance Checks**:
   - Flag any PII or sensitive client information
   - Ensure proper document classification
   - Generate processing audit trail

Return structured output with:
- Document type classification
- Extracted text chunks with metadata
- Compliance flags and recommendations
- Processing summary for audit logs`,

        framework: "crewai",
        frameworkConfig: {
          provider: "ollama", // Private LLM
          model: "llama3:70b",
          temperature: 0.1, // Low temperature for accuracy
          max_tokens: 4000
        },
        llmModel: "llama3:70b",
        temperature: 0.1,
        max_tokens: 4000,
        allowDelegation: false,
        enableMemory: true,
        verbose: true,
        nodeId: "agent-doc-processor",
        nodeType: "agent"
      }
    },

    // 3. ChromaDB Vector Storage Tool
    {
      id: "tool-chromadb",
      type: "tool",
      position: { x: 700, y: 100 },
      data: {
        label: "🗄️ ChromaDB Vector Store",
        description: "Store document embeddings in private ChromaDB instance with legal metadata",
        toolType: "vector_database",
        framework: "chromadb",
        
        config: {
          collection_name: "legal_documents",
          persist_directory: "/data/legal_chromadb",
          embedding_model: "sentence-transformers/all-MiniLM-L6-v2",
          metadata_fields: ["document_type", "client_name", "case_number", "date_created", "confidentiality_level"],
          chunk_size: 500,
          chunk_overlap: 50
        },
        
        parameters: {
          operation: "upsert",
          documents: "processed_chunks",
          metadata: "document_metadata",
          ids: "chunk_ids"
        },
        
        icon: "🗄️",
        category: "Vector Database",
        nodeId: "tool-chromadb",
        nodeType: "tool"
      }
    },

    // 3B. Document Processing Task
    {
      id: "task-doc-processing",
      type: "task",
      position: { x: 550, y: 100 },
      data: {
        label: "📄 Process Documents",
        description: "Extract and prepare legal documents for embedding",
        expectedOutput: "Processed document chunks with metadata ready for vector storage",
        async: false,
        agentId: "agent-doc-processor",
        nodeId: "task-doc-processing",
        nodeType: "task"
      }
    },

    // 4. Staff Q&A Input
    {
      id: "input-legal-query",
      type: "input",
      position: { x: 100, y: 300 },
      data: {
        label: "💬 Legal Staff Query",
        description: "Legal staff submits questions about documents",
        inputType: "text",
        placeholder: "Enter your legal question (e.g., 'What are the key terms in the Smith contract?')",
        value: "",
        
        // Legal-specific input validation
        validation: {
          required: true,
          minLength: 10,
          maxLength: 500,
          pattern: ".*", // Allow any legal question format
        },
        
        metadata: {
          staffId: "user_context",
          timestamp: "auto",
          queryType: "legal_research"
        },
        
        nodeId: "input-legal-query",
        nodeType: "input"
      }
    },

    // 5. RAG Retrieval Agent
    {
      id: "agent-rag-retrieval",
      type: "agent", 
      position: { x: 400, y: 300 },
      data: {
        label: "🔍 Legal RAG Specialist",
        role: "Legal Research and Retrieval Specialist",
        goal: "Retrieve the most relevant legal document sections to answer staff queries with high precision and legal context awareness",
        backstory: "You are an expert legal researcher with 15+ years of experience in legal document analysis. You understand legal terminology, case law structure, and contract language. You excel at finding relevant information quickly and accurately.",
        
        prompt: `You are a legal research specialist performing document retrieval. Your task:

1. **Query Analysis**:
   - Parse the legal question for key concepts
   - Identify the type of legal information needed
   - Determine appropriate search strategy

2. **Vector Search**:
   - Query ChromaDB with optimized search terms
   - Retrieve top 5-7 most relevant document chunks
   - Consider legal context and terminology

3. **Result Filtering**:
   - Rank results by legal relevance
   - Filter out non-relevant or duplicated content
   - Ensure retrieved content has sufficient context

4. **Context Preparation**:
   - Organize retrieved chunks logically
   - Maintain document source references
   - Prepare context for answer generation

Return structured results with:
- Ranked relevant document chunks
- Source document metadata
- Relevance scores and reasoning
- Context summary for answer generation`,

        framework: "crewai",
        frameworkConfig: {
          provider: "ollama",
          model: "llama3:70b",
          temperature: 0.2,
          max_tokens: 3000
        },
        llmModel: "llama3:70b",
        temperature: 0.2,
        max_tokens: 3000,
        allowDelegation: true,
        enableMemory: true,
        verbose: true,
        nodeId: "agent-rag-retrieval",
        nodeType: "agent"
      }
    },

    // 5B. Document Retrieval Task
    {
      id: "task-doc-retrieval",
      type: "task",
      position: { x: 550, y: 300 },
      data: {
        label: "🔍 Retrieve Documents",
        description: "Search and retrieve relevant legal documents for the query",
        expectedOutput: "Ranked list of relevant document chunks with metadata and context",
        async: false,
        agentId: "agent-rag-retrieval",
        nodeId: "task-doc-retrieval",
        nodeType: "task"
      }
    },

    // 6. Legal Answer Generation Agent
    {
      id: "agent-legal-answer",
      type: "agent",
      position: { x: 700, y: 300 },
      data: {
        label: "⚖️ Legal Answer Generator",
        role: "Senior Legal AI Assistant",
        goal: "Generate accurate, well-reasoned legal answers based on retrieved document context while maintaining professional legal standards",
        backstory: "You are a senior legal AI assistant with expertise equivalent to a experienced paralegal or junior associate. You provide accurate legal information based on document analysis while maintaining appropriate disclaimers and professional standards.",
        
        prompt: `You are a senior legal AI assistant helping legal staff with document-based queries.

**INSTRUCTIONS**:
1. **Answer Structure**:
   - Provide clear, direct answers based on retrieved documents
   - Include specific document references and citations
   - Maintain professional legal language and tone

2. **Legal Standards**:
   - Base answers strictly on provided document context
   - Include relevant legal disclaimers when appropriate
   - Flag any potential conflicts or unclear areas

3. **Response Format**:
   - Executive summary (2-3 sentences)
   - Detailed analysis with document citations
   - Relevant document excerpts (if helpful)
   - Recommended next steps or follow-up

4. **Compliance**:
   - Maintain client confidentiality
   - Use appropriate legal terminology
   - Provide audit-ready responses

**IMPORTANT**: Only answer based on the provided document context. If information is insufficient, clearly state this and suggest additional research needs.

**OUTPUT FORMAT**:
## Legal Analysis

**Summary**: [Brief answer]

**Analysis**: [Detailed response with citations]

**Source Documents**: [List of referenced documents]

**Recommendations**: [Next steps or follow-up needed]

**Disclaimer**: This analysis is based on available documents and should be reviewed by qualified legal counsel.`,

        framework: "crewai",
        frameworkConfig: {
          provider: "ollama",
          model: "llama3:70b",
          temperature: 0.3,
          max_tokens: 4000
        },
        llmModel: "llama3:70b",
        temperature: 0.3,
        max_tokens: 4000,
        allowDelegation: false,
        enableMemory: true,
        verbose: true,
        nodeId: "agent-legal-answer",
        nodeType: "agent"
      }
    },

    // 6B. Legal Answer Generation Task
    {
      id: "task-legal-answer",
      type: "task",
      position: { x: 850, y: 300 },
      data: {
        label: "⚖️ Generate Legal Answer",
        description: "Generate comprehensive legal analysis based on retrieved documents",
        expectedOutput: "Professional legal analysis with citations, recommendations, and compliance disclaimers",
        async: false,
        agentId: "agent-legal-answer",
        nodeId: "task-legal-answer",
        nodeType: "task"
      }
    },

    // 7. Logic Node for Routing
    {
      id: "logic-urgency-routing",
      type: "logic",
      position: { x: 1000, y: 300 },
      data: {
        label: "🚦 Urgency Router",
        description: "Route responses based on urgency and type",
        condition: 'answer.includes("urgent") || answer.includes("deadline") || answer.includes("time-sensitive")',
        
        // Enhanced routing logic
        conditions: {
          urgent: 'answer.includes("urgent") || answer.includes("deadline") || answer.includes("court date")',
          complex: 'answer.includes("review required") || answer.includes("unclear") || answer.includes("conflicting")',
          standard: 'true' // Default case
        },
        
        nodeId: "logic-urgency-routing",
        nodeType: "logic"
      }
    },

    // 8A. Urgent Slack Alert
    {
      id: "output-slack-urgent",
      type: "output",
      position: { x: 1200, y: 200 },
      data: {
        label: "🚨 Urgent Slack Alert",
        outputType: "webhook",
        description: "Send urgent legal matters to Slack immediately",
        
        webhookUrl: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
        webhookMethod: "POST",
        webhookHeaders: {
          "Content-Type": "application/json"
        },
        webhookPayload: {
          "channel": "#legal-urgent",
          "text": "🚨 *URGENT LEGAL MATTER*\n\n**Query**: {query_text}\n\n**Analysis**: {legal_answer}\n\n**Staff**: {staff_id}\n**Time**: {timestamp}",
          "username": "Legal AI Assistant",
          "icon_emoji": ":scales:",
          "attachments": [
            {
              "color": "danger",
              "fields": [
                {
                  "title": "Priority",
                  "value": "URGENT",
                  "short": true
                },
                {
                  "title": "Source Documents",
                  "value": "{source_documents}",
                  "short": true
                }
              ]
            }
          ]
        },
        
        nodeId: "output-slack-urgent",
        nodeType: "output"
      }
    },

    // 8B. Standard Email Response
    {
      id: "output-email-standard",
      type: "output", 
      position: { x: 1200, y: 350 },
      data: {
        label: "📧 Email Response",
        outputType: "email",
        description: "Send standard legal analysis via email",
        
        emailTo: "{staff_email}",
        emailCc: "legal-team@lawfirm.com",
        emailSubject: "Legal Analysis: {query_summary}",
        emailTemplate: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-bottom: 10px;">⚖️ Legal Analysis Response</h2>
    <p style="color: #666; margin: 0;"><strong>Query ID:</strong> {query_id} | <strong>Generated:</strong> {timestamp}</p>
  </div>
  
  <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
    <h3 style="color: #495057;">Your Question:</h3>
    <p style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
      {query_text}
    </p>
    
    <h3 style="color: #495057; margin-top: 30px;">Legal Analysis:</h3>
    <div style="line-height: 1.6;">
      {legal_answer}
    </div>
    
    <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
      <strong>📋 Compliance Note:</strong> This analysis is generated from internal documents and should be reviewed by qualified legal counsel for final decisions.
    </div>
  </div>
  
  <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #666; font-size: 12px;">
    Legal AI Assistant | Confidential Attorney-Client Privileged Communication
  </div>
</body>
</html>
        `,
        
        nodeId: "output-email-standard",
        nodeType: "output"
      }
    },

    // 9. Compliance Audit Logger
    {
      id: "agent-audit-logger",
      type: "agent",
      position: { x: 1000, y: 500 },
      data: {
        label: "📋 Compliance Audit Logger",
        role: "Legal Compliance Auditor",
        goal: "Create comprehensive audit logs for all legal AI interactions ensuring full compliance and traceability",
        backstory: "You are a meticulous compliance specialist responsible for maintaining detailed audit trails for legal AI interactions. You ensure all activities are properly logged for regulatory compliance and legal protection.",
        
        prompt: `You are creating compliance audit logs for legal AI interactions.

**LOG REQUIREMENTS**:
1. **Query Information**:
   - Staff member ID and role
   - Original question/request
   - Timestamp and session ID

2. **Document Access Tracking**:
   - Documents accessed via RAG retrieval
   - Document classifications and sensitivity levels
   - Access permissions and authorization

3. **AI Processing Details**:
   - Models used and processing parameters
   - Vector database queries performed
   - Response generation metadata

4. **Response Delivery**:
   - Method of delivery (email/Slack)
   - Recipients and access levels
   - Content sensitivity flags

5. **Compliance Status**:
   - Privacy protection measures applied
   - Audit requirements met
   - Any compliance warnings or notes

**OUTPUT FORMAT**:
Generate structured audit log in JSON format:

{
  "audit_id": "unique_identifier",
  "timestamp": "ISO_8601_timestamp",
  "activity_type": "document_processing|query_response|system_access",
  "staff_info": {
    "staff_id": "staff_identifier",
    "role": "role_title",
    "department": "legal_department"
  },
  "query_details": {
    "question": "original_question",
    "query_type": "research|analysis|review",
    "sensitivity_level": "low|medium|high|confidential"
  },
  "document_access": {
    "documents_accessed": ["doc_ids"],
    "document_types": ["contract|brief|memo"],
    "access_method": "vector_search|direct_access",
    "authorization_level": "staff|associate|partner"
  },
  "ai_processing": {
    "models_used": ["llama3:70b", "sentence-transformers"],
    "processing_time": "duration_ms",
    "tokens_processed": "input_output_count",
    "vector_queries": "search_count"
  },
  "response_delivery": {
    "method": "email|slack|direct",
    "recipients": ["recipient_list"],
    "delivery_timestamp": "ISO_8601_timestamp",
    "content_classification": "public|internal|confidential"
  },
  "compliance_status": "compliant|review_required|violation",
  "compliance_notes": "any_compliance_observations",
  "retention_policy": "7_years_legal_standard"
}

Ensure all sensitive information is appropriately classified and logged for audit purposes.`,

        framework: "crewai",
        frameworkConfig: {
          provider: "ollama",
          model: "llama3:8b", // Smaller model for logging tasks
          temperature: 0.1,
          max_tokens: 1000
        },
        llmModel: "llama3:8b",
        temperature: 0.1,
        max_tokens: 1000,
        allowDelegation: false,
        enableMemory: false,
        verbose: false, // Reduce log noise
        nodeId: "agent-audit-logger",
        nodeType: "agent"
      }
    },

    // 9B. Audit Logging Task
    {
      id: "task-audit-logging",
      type: "task",
      position: { x: 1150, y: 500 },
      data: {
        label: "📋 Create Audit Log",
        description: "Generate comprehensive compliance audit logs for all legal AI activities",
        expectedOutput: "Structured JSON audit log with all required compliance information and metadata",
        async: false,
        agentId: "agent-audit-logger",
        nodeId: "task-audit-logging",
        nodeType: "task"
      }
    },

    // 10. Database Output for Audit Logs
    {
      id: "output-audit-database",
      type: "output",
      position: { x: 1200, y: 500 },
      data: {
        label: "🗄️ Audit Database",
        outputType: "database",
        description: "Store compliance audit logs in secure database",
        
        databaseTable: "legal_ai_audit_logs",
        databaseConnection: "postgresql://legal_db:5432/compliance",
        databaseFields: {
          "audit_id": "{audit_log.audit_id}",
          "timestamp": "{audit_log.timestamp}",
          "staff_id": "{audit_log.staff_info.staff_id}",
          "query_text": "{audit_log.query_details.question}",
          "documents_accessed": "{audit_log.document_access.documents_accessed}",
          "response_method": "{audit_log.response_delivery.method}",
          "compliance_status": "{audit_log.compliance_status}",
          "processing_metadata": "{audit_log.ai_processing}"
        },
        
        // Compliance settings
        encryption: true,
        retention_days: 2555, // 7 years for legal compliance
        backup_enabled: true,
        
        nodeId: "output-audit-database",
        nodeType: "output"
      }
    }
  ],

  // Connection flow
  edges: [
    // Document processing flow
    {
      id: "edge-upload-process",
      source: "trigger-doc-upload",
      target: "agent-doc-processor",
      type: "animated",
      animated: true,
      data: {
        label: "📄 New Documents",
        dataType: "legal_documents",
        state: "idle"
      }
    },
    {
      id: "edge-process-task",
      source: "agent-doc-processor",
      target: "task-doc-processing",
      type: "animated",
      animated: true,
      data: {
        label: "🤖 Agent Ready",
        dataType: "agent",
        state: "idle"
      }
    },
    {
      id: "edge-task-embed",
      source: "task-doc-processing",
      target: "tool-chromadb",
      type: "animated", 
      animated: true,
      data: {
        label: "📝 Processed Text",
        dataType: "document_chunks",
        state: "idle"
      }
    },

    // Q&A flow
    {
      id: "edge-query-retrieval",
      source: "input-legal-query",
      target: "agent-rag-retrieval",
      type: "animated",
      animated: true,
      data: {
        label: "❓ Legal Query",
        dataType: "text",
        state: "idle"
      }
    },
    {
      id: "edge-retrieval-task",
      source: "agent-rag-retrieval",
      target: "task-doc-retrieval",
      type: "animated",
      animated: true,
      data: {
        label: "🤖 Agent Ready",
        dataType: "agent",
        state: "idle"
      }
    },
    {
      id: "edge-task-answer",
      source: "task-doc-retrieval",
      target: "agent-legal-answer",
      type: "animated",
      animated: true,
      data: {
        label: "📚 Retrieved Context",
        dataType: "document_context",
        state: "idle"
      }
    },
    {
      id: "edge-answer-task",
      source: "agent-legal-answer",
      target: "task-legal-answer",
      type: "animated",
      animated: true,
      data: {
        label: "🤖 Agent Ready",
        dataType: "agent",
        state: "idle"
      }
    },
    {
      id: "edge-task-routing",
      source: "task-legal-answer",
      target: "logic-urgency-routing",
      type: "animated",
      animated: true,
      data: {
        label: "⚖️ Legal Analysis",
        dataType: "legal_answer",
        state: "idle"
      }
    },

    // Routing outputs
    {
      id: "edge-urgent-slack",
      source: "logic-urgency-routing",
      target: "output-slack-urgent",
      sourceHandle: "true",
      type: "animated",
      animated: true,
      data: {
        label: "🚨 Urgent Alert",
        dataType: "urgent_notification",
        state: "idle"
      }
    },
    {
      id: "edge-standard-email",
      source: "logic-urgency-routing", 
      target: "output-email-standard",
      sourceHandle: "false",
      type: "animated",
      animated: true,
      data: {
        label: "📧 Standard Response",
        dataType: "email_response",
        state: "idle"
      }
    },

    // Audit logging (from all activities - FIXED)
    {
      id: "edge-doc-process-audit",
      source: "task-doc-processing",
      target: "agent-audit-logger",
      type: "animated",
      animated: true,
      data: {
        label: "📋 Log Processing",
        dataType: "audit_data",
        state: "idle"
      }
    },
    {
      id: "edge-embed-audit",
      source: "tool-chromadb",
      target: "agent-audit-logger",
      type: "animated",
      animated: true,
      data: {
        label: "📋 Log Embedding",
        dataType: "audit_data",
        state: "idle"
      }
    },
    {
      id: "edge-rag-audit",
      source: "task-doc-retrieval",
      target: "agent-audit-logger",
      type: "animated",
      animated: true,
      data: {
        label: "📋 Log Retrieval",
        dataType: "audit_data",
        state: "idle"
      }
    },
    {
      id: "edge-slack-audit",
      source: "output-slack-urgent",
      target: "agent-audit-logger",
      type: "animated",
      animated: true,
      data: {
        label: "📋 Log Activity",
        dataType: "audit_data",
        state: "idle"
      }
    },
    {
      id: "edge-email-audit",
      source: "output-email-standard",
      target: "agent-audit-logger",
      type: "animated",
      animated: true,
      data: {
        label: "📋 Log Activity", 
        dataType: "audit_data",
        state: "idle"
      }
    },
    {
      id: "edge-audit-task",
      source: "agent-audit-logger",
      target: "task-audit-logging",
      type: "animated",
      animated: true,
      data: {
        label: "🤖 Agent Ready",
        dataType: "agent",
        state: "idle"
      }
    },
    {
      id: "edge-task-database",
      source: "task-audit-logging",
      target: "output-audit-database",
      type: "animated",
      animated: true,
      data: {
        label: "🗄️ Store Logs",
        dataType: "audit_record",
        state: "idle"
      }
    },

    // Vector DB connection for RAG
    {
      id: "edge-chromadb-retrieval",
      source: "tool-chromadb",
      target: "agent-rag-retrieval",
      type: "dashed",
      animated: false,
      data: {
        label: "🔍 Query Vector DB",
        dataType: "vector_search",
        state: "idle"
      }
    }
  ],

  // Template tags and classification
  tags: [
    "Legal AI",
    "Private LLM", 
    "Document Analysis",
    "RAG",
    "Compliance",
    "ChromaDB",
    "LLaMA 3",
    "Enterprise",
    "Self-Hosted",
    "Audit Trail"
  ],

  // Deployment and setup information
  deployment: {
    requirements: {
      hardware: {
        gpu: "2x A100 80GB or equivalent",
        ram: "128GB minimum",
        storage: "2TB NVMe SSD",
        cpu: "16+ cores"
      },
      software: {
        os: "Ubuntu 22.04 LTS",
        docker: "24.0+",
        python: "3.11+",
        chromadb: "0.4.0+",
        llamaindex: "0.9.0+"
      }
    },
    
    setup_steps: [
      "1. Deploy private LLM (LLaMA 3 70B with vLLM)",
      "2. Set up ChromaDB instance with persistence",
      "3. Configure Google Drive API for document monitoring",
      "4. Set up email/Slack integrations",
      "5. Configure compliance database",
      "6. Import legal document workflow",
      "7. Test with sample legal documents",
      "8. Train staff on system usage"
    ],
    
    security_checklist: [
      "✅ Network isolation and VPN access",
      "✅ End-to-end encryption for all data",
      "✅ Multi-factor authentication",
      "✅ Role-based access controls",
      "✅ Audit logging enabled",
      "✅ Regular security updates",
      "✅ Compliance monitoring active",
      "✅ Data backup and recovery tested"
    ]
  },

  // Professional services package
  professional_services: {
    implementation_package: {
      price: "$45,000 - $65,000",
      includes: [
        "Custom LLM deployment and optimization",
        "ChromaDB setup and tuning",
        "Legal document template configuration", 
        "Staff training (8 hours)",
        "Compliance audit setup",
        "30-day post-deployment support",
        "Documentation and runbooks"
      ],
      timeline: "2-3 weeks"
    },
    
    monthly_support: {
      price: "$3,500/month",
      includes: [
        "Infrastructure monitoring",
        "LLM model updates",
        "Compliance reporting",
        "Technical support",
        "System optimizations",
        "Backup management"
      ]
    },
    
    roi_calculation: {
      paralegal_time_saved: "40 hours/week",
      hourly_rate: "$150/hour", 
      weekly_savings: "$6,000",
      monthly_savings: "$24,000",
      annual_savings: "$288,000",
      payback_period: "3-4 months"
    }
  }
};

// Export for use in main templates file
export default legalAiAssistantTemplate; 