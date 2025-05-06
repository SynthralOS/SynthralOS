/**
 * Server-side copy of node types from client
 * This prevents circular dependency issues
 */

// Re-export all NodeType enums from client
export enum NodeType {
  // Trigger Nodes
  MANUAL_TRIGGER = 'manual-trigger',
  SCHEDULE_TRIGGER = 'schedule-trigger',
  WEBHOOK_TRIGGER = 'webhook-trigger',
  EVENT_TRIGGER = 'event-trigger',
  
  // Input Nodes
  TEXT_INPUT = 'text-input',
  FILE_INPUT = 'file-input',
  DATA_SOURCE = 'data-source',
  API_FETCH = 'api-fetch',
  
  // Processing Nodes
  FILTER = 'filter',
  TRANSFORM = 'transform',
  MERGE = 'merge',
  SPLIT = 'split',
  
  // AI Nodes
  OCR = 'ocr',
  TEXT_GENERATION = 'text-generation',
  AGENT = 'agent',
  SCRAPER = 'scraper',
  
  // Integration Nodes
  API_REQUEST = 'api-request',
  DATABASE = 'database',
  WEBHOOK = 'webhook',
  
  // Output Nodes
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  FILE_OUTPUT = 'file-output',
  DATA_EXPORT = 'data-export',
  
  // Control Flow Nodes
  CONDITION = 'condition',
  SWITCH = 'switch',
  LOOP = 'loop',
  PARALLEL = 'parallel',
  
  // Utility Nodes
  DELAY = 'delay',
  LOGGER = 'logger',
  CODE = 'code',
  VARIABLE = 'variable',
  
  // LangGraph Nodes
  LANGGRAPH_STATE = 'langgraph-state',
  LANGGRAPH_NODE = 'langgraph-node',
  LANGGRAPH_EDGE = 'langgraph-edge',
  LANGGRAPH_CONDITIONAL = 'langgraph-conditional',
  
  // Agent nodes
  AGENT_NODE = 'agent-node',
  AGENT_SUPERVISOR = 'agent-supervisor',
  
  // Memory and context nodes
  MEMORY_STORE = 'memory-store',
  CONTEXT_RETRIEVER = 'context-retriever',
  
  // Tool nodes
  TOOL_NODE = 'tool-node',
  TOOL_EXECUTOR = 'tool-executor',
  
  // Conversation nodes
  CONVERSATION_CHAIN = 'conversation-chain',
  CONVERSATION_ROUTER = 'conversation-router',
  
  // Output formatter nodes
  OUTPUT_PARSER = 'output-parser',
  OUTPUT_FORMATTER = 'output-formatter',
  
  // LangChain specific nodes
  LANGCHAIN_LLM_CHAIN = 'langchain-llm-chain',
  LANGCHAIN_AGENT = 'langchain-agent',
  LANGCHAIN_RETRIEVAL = 'langchain-retrieval',
  LANGCHAIN_MEMORY = 'langchain-memory',
  
  // OCR nodes
  OCR_PROCESSOR = 'ocr-processor',
  OCR_ENGINE_SELECTOR = 'ocr-engine-selector',
  
  // Web Scraping nodes
  WEB_SCRAPER = 'web-scraper',
  BROWSER_AUTOMATION = 'browser-automation',
  
  // OSINT Research nodes
  OSINT_SEARCH = 'osint-search',
  OSINT_ANALYZER = 'osint-analyzer',
  
  // Social Monitoring nodes
  SOCIAL_CONNECTOR = 'social-connector',
  SOCIAL_MONITOR = 'social-monitor',
  
  // Agent Protocol nodes
  AGENT_PROTOCOL = 'agent-protocol',
  AGENT_PROTOCOL_CONNECTOR = 'agent-protocol-connector',
  
  // Guardrails nodes
  GUARDRAIL_FILTER = 'guardrail-filter',
  GUARDRAIL_MODIFIER = 'guardrail-modifier',
  
  // Runtime nodes
  RUNTIME_EXECUTOR = 'runtime-executor',
  RUNTIME_ENVIRONMENT = 'runtime-environment',
  
  // Memory Management nodes
  MEMORY_DASHBOARD = 'memory-dashboard',
  
  // RAG nodes
  RAG_RETRIEVER = 'rag-retriever',
  RAG_DB_SWITCH = 'rag-db-switch',
  
  // Vector DB nodes
  VECTOR_STORE = 'vector-store',
  VECTOR_SEARCH = 'vector-search',
  VECTOR_INDEX = 'vector-index',
  
  // Telemetry nodes
  TELEMETRY_COLLECTOR = 'telemetry-collector',
  TELEMETRY_ALERT = 'telemetry-alert',
  
  // Activity Logger nodes
  ACTIVITY_LOGGER = 'activity-logger',
  AUDIT_TRAIL = 'audit-trail',
  
  // Search nodes
  UNIFIED_SEARCH = 'unified-search',
  SAVED_SEARCH = 'saved-search',
  
  // Execution Stats nodes
  EXECUTION_STATS = 'execution-stats',
  PERFORMANCE_MONITOR = 'performance-monitor',
  
  // User Preferences nodes
  USER_PREFERENCES = 'user-preferences',
  PREFERENCE_SYNC = 'preference-sync',
}