// Node and edge types for the workflow builder
import { z } from 'zod';

// We'll use ReactFlow's Node and Edge types
import type { CSSProperties } from 'react';
import { 
  LangGraphStateNodeSchema, 
  LangGraphNodeSchema,
  LangGraphEdgeSchema,
  LangGraphConditionalNodeSchema,
  AgentNodeSchema as LangGraphAgentNodeSchema,
  AgentSupervisorNodeSchema,
  MemoryStoreNodeSchema,
  ContextRetrieverNodeSchema,
  ToolNodeSchema,
  ToolExecutorNodeSchema,
  ConversationChainNodeSchema,
  ConversationRouterNodeSchema,
  OutputParserNodeSchema,
  OutputFormatterNodeSchema
} from './langgraph-nodes';

// Import LangChain node schemas
import {
  LangChainLLMChainSchema,
  LangChainAgentSchema,
  LangChainRetrievalSchema,
  LangChainMemorySchema
} from './langchain-nodes';

// Position enum for node connection points (for ReactFlow compatibility)
export enum Position {
  Left = 'left',
  Right = 'right',
  Top = 'top',
  Bottom = 'bottom'
}

// NodePosition type used for node placement coordinates (distinct from connection points)
export interface NodePosition {
  x: number;
  y: number;
}

// Node Categories
export enum NodeCategory {
  TRIGGER = 'Trigger',
  INPUT = 'Input',
  PROCESSING = 'Processing',
  AI = 'AI',
  INTEGRATION = 'Integration',
  OUTPUT = 'Output',
  CONTROL_FLOW = 'Control Flow',
  UTILITY = 'Utility',
  LANGGRAPH = 'LangGraph',
  AGENT = 'Agent',
  MEMORY = 'Memory',
  CONVERSATION = 'Conversation',
  DOCUMENT = 'Document',
  SCRAPING = 'Scraping',
  OSINT = 'OSINT',
  SOCIAL = 'Social',
  GUARDRAILS = 'Guardrails',
  RUNTIME = 'Runtime',
  RAG = 'RAG',
  VECTOR_DB = 'Vector DB',
  TELEMETRY = 'Telemetry',
}

// Node Types
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

// Node Schemas
// Schema for the Manual Trigger Node
export const ManualTriggerNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// Schema for the Schedule Trigger Node
export const ScheduleTriggerNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  schedule: z.string().min(1, 'Schedule is required'),
  timezone: z.string().optional(),
});

// Schema for the OCR Node
export const OCRNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  documentType: z.string().optional(),
  language: z.string().optional(),
  enhanceImage: z.boolean().optional(),
  engine: z.string().optional(),
});

// Schema for the Text Generation Node
export const TextGenerationNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  model: z.string().min(1, 'Model is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(1).optional(),
});

// Schema for the Agent Node
export const AgentNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  agentType: z.string().min(1, 'Agent type is required'),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(1).optional(),
});

// Schema for the Scraper Node
export const ScraperNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  selectors: z.record(z.string()).optional(),
  siteType: z.string().optional(),
  javascriptRendering: z.boolean().optional(),
});

// Schema for the API Request Node
export const APIRequestNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  integrationId: z.string().optional(),
  endpoint: z.string().min(1, 'Endpoint is required'),
  method: z.string().min(1, 'Method is required'),
  headers: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  body: z.string().optional(),
});

// Schema for the Condition Node
export const ConditionNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  condition: z.string().min(1, 'Condition is required'),
});

// Schema for the Code Node
export const CodeNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  language: z.string().optional(),
});

// Schema for OCR Processor Node
export const OCRProcessorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  documentType: z.string().optional(),
  language: z.string().optional(),
  enhanceImage: z.boolean().default(false),
  minConfidence: z.number().min(0).max(1).default(0.7),
  outputFormat: z.enum(['text', 'json']).default('text'),
});

// Schema for OCR Engine Selector Node
export const OCREngineSelectorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  defaultEngine: z.string().default('tesseract'),
  handleHandwriting: z.boolean().default(false),
  handleTables: z.boolean().default(false),
  handleStructured: z.boolean().default(false),
  regionConsideration: z.boolean().default(false),
});

// Schema for Web Scraper Node
export const WebScraperSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  selectors: z.record(z.string()).optional(),
  extractLinks: z.boolean().default(false),
  extractImages: z.boolean().default(false),
  paginationSelector: z.string().optional(),
  maxPages: z.number().min(1).default(1),
});

// Schema for Browser Automation Node
export const BrowserAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  script: z.string().min(1, 'Script is required'),
  headless: z.boolean().default(true),
  waitForSelector: z.string().optional(),
  screenshotPath: z.string().optional(),
});

// Schema for OSINT Search Node
export const OSINTSearchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  query: z.string().min(1, 'Query is required'),
  sources: z.array(z.string()).optional(),
  maxResults: z.number().min(1).default(10),
  includeImages: z.boolean().default(false),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});

// Schema for OSINT Analyzer Node
export const OSINTAnalyzerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  analysisType: z.enum(['sentiment', 'entities', 'summary', 'connections']).default('summary'),
  depth: z.number().min(1).max(5).default(3),
  llmModel: z.string().optional(),
  visualizeResults: z.boolean().default(false),
});

// Schema for Social Connector Node
export const SocialConnectorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']).default('twitter'),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accessToken: z.string().optional(),
    accessTokenSecret: z.string().optional(),
  }).optional(),
  useOAuth: z.boolean().default(true),
});

// Schema for Social Monitor Node
export const SocialMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  keywords: z.array(z.string()).default([]),
  accounts: z.array(z.string()).default([]),
  frequency: z.number().min(1).default(15),
  alertThreshold: z.number().min(0).default(0.7),
  storeHistory: z.boolean().default(true),
});

// Schema for Agent Protocol Node
export const AgentProtocolSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  protocolType: z.enum(['agent-gpt', 'auto-gpt', 'baby-agi', 'langchain', 'meta-gpt', 'crew-ai', 'autogen']).default('agent-gpt'),
  agentModel: z.string().default('claude-3-7-sonnet-20250219'), // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
  maxSteps: z.number().min(1).default(10),
  memory: z.boolean().default(true),
  tools: z.array(z.string()).default([]),
});

// Schema for Agent Protocol Connector Node
export const AgentProtocolConnectorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  protocol: z.string(),
  endpoint: z.string().url('Valid URL is required'),
  authentication: z.enum(['none', 'api-key', 'oauth']).default('api-key'),
  apiKey: z.string().optional(),
  timeout: z.number().min(1).default(30),
});

// Schema for Guardrail Filter Node
export const GuardrailFilterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  filterType: z.enum(['content', 'toxicity', 'personal-info', 'custom']).default('content'),
  rules: z.array(z.object({
    name: z.string(),
    description: z.string(),
    action: z.enum(['block', 'warn', 'log']).default('block'),
  })).default([]),
  customPrompt: z.string().optional(),
  logViolations: z.boolean().default(true),
});

// Schema for Guardrail Modifier Node
export const GuardrailModifierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  modifierType: z.enum(['rewrite', 'censor', 'enhance', 'custom']).default('rewrite'),
  rules: z.array(z.string()).default([]),
  customPrompt: z.string().optional(),
  model: z.string().default('claude-3-7-sonnet-20250219'), // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
  preserveIntent: z.boolean().default(true),
});

// Schema for Runtime Executor Node
export const RuntimeExecutorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  runtimeType: z.enum(['e2b', 'open_interpreter', 'wasm_edge', 'bacalhau', 'cline_node', 'open_devin', 'mcp_server', 'coolify']).default('e2b'),
  code: z.string().min(1, 'Code is required'),
  language: z.string().default('python'),
  timeout: z.number().min(1).default(60),
  environment: z.record(z.string()).default({}),
  requirements: z.array(z.string()).default([]),
});

// Schema for Runtime Environment Node
export const RuntimeEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  runtimeType: z.enum(['e2b', 'open_interpreter', 'wasm_edge', 'bacalhau', 'cline_node', 'open_devin', 'mcp_server', 'coolify']).default('e2b'),
  environmentVariables: z.record(z.string()).default({}),
  resources: z.object({
    cpu: z.number().min(1).default(1),
    memory: z.number().min(256).default(1024),
    gpu: z.boolean().default(false),
  }).default({}),
  timeout: z.number().min(1).default(300),
});

// Schema for Memory Dashboard Node
export const MemoryDashboardSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  memoryTypes: z.array(z.enum(['buffer', 'vector', 'conversation', 'entity', 'structured', 'episodic', 'custom'])).default(['buffer']),
  visualize: z.boolean().default(true),
  maxEntries: z.number().min(1).default(100),
  autoRefresh: z.boolean().default(false),
  refreshInterval: z.number().min(5).default(60),
});

// Schema for RAG Retriever Node
export const RAGRetrieverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  datastoreId: z.string().optional(),
  retrievalType: z.enum(['semantic', 'keyword', 'hybrid']).default('hybrid'),
  topK: z.number().min(1).default(5),
  scoreThreshold: z.number().min(0).max(1).default(0.7),
  reranker: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
});

// Schema for RAG DB Switch Node
export const RAGDBSwitchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  strategy: z.enum(['round-robin', 'availability', 'performance', 'custom']).default('performance'),
  databases: z.array(z.object({
    id: z.string(),
    name: z.string(),
    priority: z.number().min(1).default(1),
  })).default([]),
  fallbackDb: z.string().optional(),
  customRoutingLogic: z.string().optional(),
});

// Schema for Vector Store Node
export const VectorStoreSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  storeType: z.enum(['pinecone', 'weaviate', 'qdrant', 'chroma', 'redis', 'lancedb', 'supavec']).default('supavec'),
  connectionString: z.string().optional(),
  dimension: z.number().min(1).default(1536),
  metric: z.enum(['cosine', 'euclidean', 'dot']).default('cosine'),
  embeddingModel: z.string().default('text-embedding-large'),
});

// Schema for Vector Search Node
export const VectorSearchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  storeId: z.string().optional(),
  query: z.string().min(1, 'Query is required'),
  topK: z.number().min(1).default(5),
  filter: z.record(z.any()).default({}),
  includeValues: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
});

// Schema for Vector Index Node
export const VectorIndexSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  storeId: z.string().optional(),
  documents: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    metadata: z.record(z.any()).default({}),
  })).default([]),
  chunkSize: z.number().min(1).default(1000),
  chunkOverlap: z.number().min(0).default(200),
  embeddingBatchSize: z.number().min(1).default(100),
});

// Schema for Telemetry Collector Node
export const TelemetryCollectorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  metrics: z.array(z.enum(['cpu', 'memory', 'latency', 'throughput', 'error-rate', 'custom'])).default(['latency', 'error-rate']),
  customMetrics: z.array(z.object({
    name: z.string(),
    type: z.enum(['counter', 'gauge', 'histogram']).default('counter'),
    description: z.string().optional(),
  })).default([]),
  sampleRate: z.number().min(0.01).max(1).default(1),
  aggregationPeriod: z.number().min(1).default(60),
});

// Schema for Telemetry Alert Node
export const TelemetryAlertSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alertConditions: z.array(z.object({
    metric: z.string(),
    operator: z.enum(['>', '>=', '<', '<=', '==', '!=']).default('>'),
    threshold: z.number(),
    duration: z.number().min(0).default(0),
  })).default([]),
  notificationChannels: z.array(z.enum(['email', 'slack', 'webhook', 'console'])).default([]),
  cooldownPeriod: z.number().min(0).default(300),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('warning'),
});

// Schema for Activity Logger Node
export const ActivityLoggerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  level: z.enum(['debug', 'info', 'warning', 'error']).default('info'),
  entityType: z.enum(['user', 'workflow', 'agent', 'document', 'system']).default('workflow'),
  action: z.string().min(1, 'Action is required'),
  message: z.string().optional(),
  details: z.record(z.any()).default({}),
  storeInDatabase: z.boolean().default(true),
});

// Schema for Audit Trail Node
export const AuditTrailSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  filters: z.object({
    entityType: z.array(z.enum(['user', 'workflow', 'agent', 'document', 'system'])).optional(),
    level: z.array(z.enum(['debug', 'info', 'warning', 'error'])).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: z.string().optional(),
  }).default({}),
  maxResults: z.number().min(1).default(100),
  exportFormat: z.enum(['json', 'csv', 'html']).default('json'),
  includeMetadata: z.boolean().default(true),
});

// Schema for Unified Search Node
export const UnifiedSearchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  query: z.string().min(1, 'Search query is required'),
  entityTypes: z.array(z.enum(['document', 'workflow', 'agent', 'conversation', 'social', 'custom'])).default(['document', 'workflow']),
  useSemanticSearch: z.boolean().default(true),
  filters: z.record(z.any()).default({}),
  maxResults: z.number().min(1).default(20),
  sortBy: z.enum(['relevance', 'date', 'alpha']).default('relevance'),
});

// Schema for Saved Search Node
export const SavedSearchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  savedSearchId: z.string().optional(),
  createNewSearch: z.boolean().default(false),
  searchName: z.string().optional(),
  searchDescription: z.string().optional(),
  scheduleInterval: z.number().min(0).default(0),
  notifyOnResults: z.boolean().default(false),
  exportResults: z.boolean().default(false),
});

// Schema for Execution Stats Node
export const ExecutionStatsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  workflowId: z.string().optional(),
  metrics: z.array(z.enum(['duration', 'success-rate', 'throughput', 'error-rate', 'cost', 'resource-usage'])).default(['duration', 'success-rate']),
  timeRange: z.enum(['hour', 'day', 'week', 'month', 'custom']).default('day'),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
  aggregation: z.enum(['sum', 'average', 'min', 'max']).default('average'),
});

// Schema for Performance Monitor Node
export const PerformanceMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  monitoredWorkflows: z.array(z.string()).default([]),
  monitorAll: z.boolean().default(true),
  metrics: z.array(z.string()).default(['memory-usage', 'cpu-usage', 'response-time']),
  thresholds: z.record(z.object({
    warning: z.number().optional(),
    critical: z.number().optional(),
  })).default({}),
  alertOnThreshold: z.boolean().default(true),
  samplingInterval: z.number().min(5).default(60),
});

// Schema for User Preferences Node
export const UserPreferencesSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  userId: z.string().optional(),
  preferencesCategory: z.enum(['ui', 'notifications', 'ai-models', 'workflows']).default('ui'),
  operation: z.enum(['get', 'set', 'update', 'delete']).default('get'),
  preferences: z.record(z.any()).default({}),
  applyImmediately: z.boolean().default(true),
});

// Schema for Preference Sync Node
export const PreferenceSyncSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  syncTarget: z.enum(['browser', 'device', 'account', 'all']).default('all'),
  preferenceGroups: z.array(z.enum(['ui', 'notifications', 'ai-models', 'workflows'])).default(['ui']),
  conflictResolution: z.enum(['newest', 'oldest', 'manual', 'device-priority']).default('newest'),
  syncInterval: z.number().min(0).default(0),
  syncOnConnect: z.boolean().default(true),
});

// Map node types to schemas for validation
export const nodeSchemas: Record<string, z.ZodType<any>> = {
  // Default node schemas
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNodeSchema,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNodeSchema,
  [NodeType.OCR]: OCRNodeSchema,
  [NodeType.TEXT_GENERATION]: TextGenerationNodeSchema,
  [NodeType.AGENT]: AgentNodeSchema,
  [NodeType.SCRAPER]: ScraperNodeSchema,
  [NodeType.API_REQUEST]: APIRequestNodeSchema,
  [NodeType.CONDITION]: ConditionNodeSchema,
  [NodeType.CODE]: CodeNodeSchema,
  
  // LangGraph node schemas
  [NodeType.LANGGRAPH_STATE]: LangGraphStateNodeSchema,
  [NodeType.LANGGRAPH_NODE]: LangGraphNodeSchema,
  [NodeType.LANGGRAPH_EDGE]: LangGraphEdgeSchema,
  [NodeType.LANGGRAPH_CONDITIONAL]: LangGraphConditionalNodeSchema,
  
  // Agent node schemas
  [NodeType.AGENT_NODE]: LangGraphAgentNodeSchema,
  [NodeType.AGENT_SUPERVISOR]: AgentSupervisorNodeSchema,
  
  // Memory and context node schemas
  [NodeType.MEMORY_STORE]: MemoryStoreNodeSchema,
  [NodeType.CONTEXT_RETRIEVER]: ContextRetrieverNodeSchema,
  
  // Tool node schemas
  [NodeType.TOOL_NODE]: ToolNodeSchema,
  [NodeType.TOOL_EXECUTOR]: ToolExecutorNodeSchema,
  
  // Conversation node schemas
  [NodeType.CONVERSATION_CHAIN]: ConversationChainNodeSchema,
  [NodeType.CONVERSATION_ROUTER]: ConversationRouterNodeSchema,
  
  // Output formatter node schemas
  [NodeType.OUTPUT_PARSER]: OutputParserNodeSchema,
  [NodeType.OUTPUT_FORMATTER]: OutputFormatterNodeSchema,
  
  // LangChain specific node schemas
  [NodeType.LANGCHAIN_LLM_CHAIN]: LangChainLLMChainSchema,
  [NodeType.LANGCHAIN_AGENT]: LangChainAgentSchema,
  [NodeType.LANGCHAIN_RETRIEVAL]: LangChainRetrievalSchema,
  [NodeType.LANGCHAIN_MEMORY]: LangChainMemorySchema,
  
  // OCR node schemas
  [NodeType.OCR_PROCESSOR]: OCRProcessorSchema,
  [NodeType.OCR_ENGINE_SELECTOR]: OCREngineSelectorSchema,
  
  // Web Scraping node schemas
  [NodeType.WEB_SCRAPER]: WebScraperSchema,
  [NodeType.BROWSER_AUTOMATION]: BrowserAutomationSchema,
  
  // OSINT Research node schemas
  [NodeType.OSINT_SEARCH]: OSINTSearchSchema,
  [NodeType.OSINT_ANALYZER]: OSINTAnalyzerSchema,
  
  // Social Monitoring node schemas
  [NodeType.SOCIAL_CONNECTOR]: SocialConnectorSchema,
  [NodeType.SOCIAL_MONITOR]: SocialMonitorSchema,
  
  // Agent Protocol node schemas
  [NodeType.AGENT_PROTOCOL]: AgentProtocolSchema,
  [NodeType.AGENT_PROTOCOL_CONNECTOR]: AgentProtocolConnectorSchema,
  
  // Guardrails node schemas
  [NodeType.GUARDRAIL_FILTER]: GuardrailFilterSchema,
  [NodeType.GUARDRAIL_MODIFIER]: GuardrailModifierSchema,
  
  // Runtime node schemas
  [NodeType.RUNTIME_EXECUTOR]: RuntimeExecutorSchema,
  [NodeType.RUNTIME_ENVIRONMENT]: RuntimeEnvironmentSchema,
  
  // Memory Dashboard node schema
  [NodeType.MEMORY_DASHBOARD]: MemoryDashboardSchema,
  
  // RAG node schemas
  [NodeType.RAG_RETRIEVER]: RAGRetrieverSchema,
  [NodeType.RAG_DB_SWITCH]: RAGDBSwitchSchema,
  
  // Vector DB node schemas
  [NodeType.VECTOR_STORE]: VectorStoreSchema,
  [NodeType.VECTOR_SEARCH]: VectorSearchSchema,
  [NodeType.VECTOR_INDEX]: VectorIndexSchema,
  
  // Telemetry node schemas
  [NodeType.TELEMETRY_COLLECTOR]: TelemetryCollectorSchema,
  [NodeType.TELEMETRY_ALERT]: TelemetryAlertSchema,
  
  // Activity Logger node schemas
  [NodeType.ACTIVITY_LOGGER]: ActivityLoggerSchema,
  [NodeType.AUDIT_TRAIL]: AuditTrailSchema,
  
  // Search node schemas
  [NodeType.UNIFIED_SEARCH]: UnifiedSearchSchema,
  [NodeType.SAVED_SEARCH]: SavedSearchSchema,
  
  // Execution Stats node schemas
  [NodeType.EXECUTION_STATS]: ExecutionStatsSchema,
  [NodeType.PERFORMANCE_MONITOR]: PerformanceMonitorSchema,
  
  // User Preferences node schemas
  [NodeType.USER_PREFERENCES]: UserPreferencesSchema,
  [NodeType.PREFERENCE_SYNC]: PreferenceSyncSchema,
};

// Node metadata for the UI
export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  inputs: number;
  outputs: number;
  schema: z.ZodType<any>;
  defaultData?: Record<string, any>;
}

// No import for langGraphNodeDefinitions - we'll define them inline to avoid circular dependencies

// Node definitions for the UI
export const nodeDefinitions: Record<NodeType, NodeDefinition> = {
  // LangGraph Core Nodes
  [NodeType.LANGGRAPH_STATE]: {
    type: NodeType.LANGGRAPH_STATE,
    category: NodeCategory.LANGGRAPH,
    label: 'State Container',
    description: 'Container for graph state',
    icon: 'Database',
    inputs: 0,
    outputs: 1,
    schema: LangGraphStateNodeSchema,
    defaultData: {
      name: 'State',
      stateType: 'graph',
      stateDefinition: {},
      initialState: {},
    },
  },
  [NodeType.LANGGRAPH_NODE]: {
    type: NodeType.LANGGRAPH_NODE,
    category: NodeCategory.LANGGRAPH,
    label: 'LangGraph Node',
    description: 'General purpose LangGraph node',
    icon: 'Circle',
    inputs: 1,
    outputs: 1,
    schema: LangGraphNodeSchema,
    defaultData: {
      name: 'LangGraph Node',
      functionDefinition: '',
      inputVariables: [],
      outputVariables: [],
    },
  },
  [NodeType.LANGGRAPH_EDGE]: {
    type: NodeType.LANGGRAPH_EDGE,
    category: NodeCategory.LANGGRAPH,
    label: 'Graph Edge',
    description: 'Connection between graph nodes',
    icon: 'ArrowRight',
    inputs: 1,
    outputs: 1,
    schema: LangGraphEdgeSchema,
    defaultData: {
      name: 'Edge',
      sourceNode: '',
      targetNode: '',
      condition: '',
    },
  },
  [NodeType.LANGGRAPH_CONDITIONAL]: {
    type: NodeType.LANGGRAPH_CONDITIONAL,
    category: NodeCategory.LANGGRAPH,
    label: 'Conditional Router',
    description: 'Routes flow based on conditions',
    icon: 'GitMerge',
    inputs: 1,
    outputs: 3,
    schema: LangGraphConditionalNodeSchema,
    defaultData: {
      name: 'Conditional Router',
      conditions: [
        {
          condition: '',
          targetNodeId: '',
        },
      ],
    },
  },
  
  // Agent Nodes
  [NodeType.AGENT_NODE]: {
    type: NodeType.AGENT_NODE,
    category: NodeCategory.AGENT,
    label: 'LLM Agent',
    description: 'AI agent that can use tools and take actions',
    icon: 'Bot',
    inputs: 1,
    outputs: 1,
    schema: AgentNodeSchema,
    defaultData: {
      name: 'Agent',
      agentType: 'assistant',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
      tools: [],
      maxIterations: 10,
    },
  },
  [NodeType.AGENT_SUPERVISOR]: {
    type: NodeType.AGENT_SUPERVISOR,
    category: NodeCategory.AGENT,
    label: 'Agent Supervisor',
    description: 'Coordinates multiple agents',
    icon: 'Users',
    inputs: 1,
    outputs: 1,
    schema: AgentSupervisorNodeSchema,
    defaultData: {
      name: 'Supervisor',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
      agentIds: [],
    },
  },
  
  // Memory Nodes
  [NodeType.MEMORY_STORE]: {
    type: NodeType.MEMORY_STORE,
    category: NodeCategory.MEMORY,
    label: 'Memory Store',
    description: 'Stores conversation or execution memory',
    icon: 'HardDrive',
    inputs: 1,
    outputs: 1,
    schema: MemoryStoreNodeSchema,
    defaultData: {
      name: 'Memory',
      memoryType: 'buffer',
      capacity: 10,
      persistenceType: 'in-memory',
    },
  },
  [NodeType.CONTEXT_RETRIEVER]: {
    type: NodeType.CONTEXT_RETRIEVER,
    category: NodeCategory.MEMORY,
    label: 'Context Retriever',
    description: 'Retrieves relevant context',
    icon: 'Search',
    inputs: 1,
    outputs: 1,
    schema: ContextRetrieverNodeSchema,
    defaultData: {
      name: 'Retriever',
      retrieverType: 'vector',
      topK: 5,
    },
  },
  
  // Tool Nodes
  [NodeType.TOOL_NODE]: {
    type: NodeType.TOOL_NODE,
    category: NodeCategory.UTILITY,
    label: 'Tool',
    description: 'Tool for agents to use',
    icon: 'Wrench',
    inputs: 1,
    outputs: 1,
    schema: ToolNodeSchema,
    defaultData: {
      name: 'Tool',
      toolType: 'custom',
      functionDefinition: '',
      parameters: {},
    },
  },
  [NodeType.TOOL_EXECUTOR]: {
    type: NodeType.TOOL_EXECUTOR,
    category: NodeCategory.UTILITY,
    label: 'Tool Executor',
    description: 'Executes tools',
    icon: 'Terminal',
    inputs: 1,
    outputs: 1,
    schema: ToolExecutorNodeSchema,
    defaultData: {
      name: 'Tool Executor',
      toolIds: [],
    },
  },
  
  // Conversation Nodes
  [NodeType.CONVERSATION_CHAIN]: {
    type: NodeType.CONVERSATION_CHAIN,
    category: NodeCategory.CONVERSATION,
    label: 'Conversation Chain',
    description: 'Chain for conversation',
    icon: 'MessageCircle',
    inputs: 1,
    outputs: 1,
    schema: ConversationChainNodeSchema,
    defaultData: {
      name: 'Conversation',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
    },
  },
  [NodeType.CONVERSATION_ROUTER]: {
    type: NodeType.CONVERSATION_ROUTER,
    category: NodeCategory.CONVERSATION,
    label: 'Conversation Router',
    description: 'Routes conversations',
    icon: 'GitBranch',
    inputs: 1,
    outputs: 2,
    schema: ConversationRouterNodeSchema,
    defaultData: {
      name: 'Router',
      modelName: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      temperature: 0.7,
      systemPrompt: '',
      routes: [
        {
          name: 'Default Route',
          description: 'Default route',
          targetNodeId: '',
        },
      ],
    },
  },
  
  // Output Formatting Nodes
  [NodeType.OUTPUT_PARSER]: {
    type: NodeType.OUTPUT_PARSER,
    category: NodeCategory.PROCESSING,
    label: 'Output Parser',
    description: 'Parses LLM outputs',
    icon: 'FileJson',
    inputs: 1,
    outputs: 1,
    schema: OutputParserNodeSchema,
    defaultData: {
      name: 'Parser',
      parserType: 'json',
      parserDefinition: '',
    },
  },
  [NodeType.OUTPUT_FORMATTER]: {
    type: NodeType.OUTPUT_FORMATTER,
    category: NodeCategory.PROCESSING,
    label: 'Output Formatter',
    description: 'Formats output',
    icon: 'FileText',
    inputs: 1,
    outputs: 1,
    schema: OutputFormatterNodeSchema,
    defaultData: {
      name: 'Formatter',
      formatType: 'json',
      formatTemplate: '',
    },
  },
  
  // LangChain Nodes
  [NodeType.LANGCHAIN_LLM_CHAIN]: {
    type: NodeType.LANGCHAIN_LLM_CHAIN,
    category: NodeCategory.AI,
    label: 'LangChain LLM Chain',
    description: 'Processes inputs using a prompt template and LLM',
    icon: 'BrainCircuit',
    inputs: 1,
    outputs: 1,
    schema: LangChainLLMChainSchema,
    defaultData: {
      name: 'LLM Chain',
      promptTemplate: 'You are a helpful assistant. Answer the following question: {input}',
      outputKey: 'result',
      temperature: 0.7,
      model: 'anthropic',
      verbose: false,
    },
  },
  [NodeType.LANGCHAIN_AGENT]: {
    type: NodeType.LANGCHAIN_AGENT,
    category: NodeCategory.AI,
    label: 'LangChain Agent',
    description: 'AI agent that can use tools to complete tasks',
    icon: 'Cpu',
    inputs: 1,
    outputs: 1,
    schema: LangChainAgentSchema,
    defaultData: {
      name: 'Agent',
      systemMessage: 'You are a helpful assistant with access to tools. Use them to help answer the user query.',
      tools: ['calculator', 'weather', 'search'],
      temperature: 0.2,
      model: 'anthropic',
      verbose: true,
    },
  },
  [NodeType.LANGCHAIN_RETRIEVAL]: {
    type: NodeType.LANGCHAIN_RETRIEVAL,
    category: NodeCategory.AI,
    label: 'LangChain Retrieval',
    description: 'Retrieves relevant information from a vector database',
    icon: 'BookOpen',
    inputs: 1,
    outputs: 1,
    schema: LangChainRetrievalSchema,
    defaultData: {
      name: 'Retrieval Chain',
      promptTemplate: 'Context information is below.\n----\n{context}\n----\nGiven the context information and not prior knowledge, answer the question: {input}',
      collectionId: 1,
      returnSourceDocuments: true,
      topK: 3,
      temperature: 0.0,
      model: 'anthropic',
    },
  },
  [NodeType.LANGCHAIN_MEMORY]: {
    type: NodeType.LANGCHAIN_MEMORY,
    category: NodeCategory.MEMORY,
    label: 'LangChain Memory',
    description: 'Maintains conversation history and context',
    icon: 'Save',
    inputs: 1,
    outputs: 1,
    schema: LangChainMemorySchema,
    defaultData: {
      name: 'Conversation Memory',
      memoryType: 'buffer',
      capacity: 10,
      persistence: false,
      inputKey: 'input',
      outputKey: 'output',
    },
  },
  
  // Trigger Nodes
  [NodeType.MANUAL_TRIGGER]: {
    type: NodeType.MANUAL_TRIGGER,
    category: NodeCategory.TRIGGER,
    label: 'Manual Trigger',
    description: 'Starts a workflow manually',
    icon: 'PlayCircle',
    inputs: 0,
    outputs: 1,
    schema: ManualTriggerNodeSchema,
    defaultData: {
      name: 'Manual Trigger',
      description: '',
    },
  },
  [NodeType.SCHEDULE_TRIGGER]: {
    type: NodeType.SCHEDULE_TRIGGER,
    category: NodeCategory.TRIGGER,
    label: 'Schedule Trigger',
    description: 'Starts a workflow on a schedule',
    icon: 'Clock',
    inputs: 0,
    outputs: 1,
    schema: ScheduleTriggerNodeSchema,
    defaultData: {
      name: 'Schedule Trigger',
      schedule: '0 0 * * *', // Daily at midnight
      timezone: 'UTC',
    },
  },
  [NodeType.WEBHOOK_TRIGGER]: {
    type: NodeType.WEBHOOK_TRIGGER,
    category: NodeCategory.TRIGGER,
    label: 'Webhook Trigger',
    description: 'Starts a workflow when a webhook is called',
    icon: 'Webhook',
    inputs: 0,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Webhook Trigger',
    },
  },
  [NodeType.EVENT_TRIGGER]: {
    type: NodeType.EVENT_TRIGGER,
    category: NodeCategory.TRIGGER,
    label: 'Event Trigger',
    description: 'Starts a workflow when an event occurs',
    icon: 'Bell',
    inputs: 0,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Event Trigger',
    },
  },
  
  // Input Nodes
  [NodeType.TEXT_INPUT]: {
    type: NodeType.TEXT_INPUT,
    category: NodeCategory.INPUT,
    label: 'Text Input',
    description: 'Input text for the workflow',
    icon: 'Type',
    inputs: 0,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Text Input',
    },
  },
  [NodeType.FILE_INPUT]: {
    type: NodeType.FILE_INPUT,
    category: NodeCategory.INPUT,
    label: 'File Input',
    description: 'Input a file for the workflow',
    icon: 'File',
    inputs: 0,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'File Input',
    },
  },
  [NodeType.DATA_SOURCE]: {
    type: NodeType.DATA_SOURCE,
    category: NodeCategory.INPUT,
    label: 'Data Source',
    description: 'Connect to a data source',
    icon: 'Database',
    inputs: 0,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Data Source',
    },
  },
  [NodeType.API_FETCH]: {
    type: NodeType.API_FETCH,
    category: NodeCategory.INPUT,
    label: 'API Fetch',
    description: 'Fetch data from an API',
    icon: 'ArrowDownCircle',
    inputs: 0,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'API Fetch',
    },
  },
  
  // Processing Nodes
  [NodeType.FILTER]: {
    type: NodeType.FILTER,
    category: NodeCategory.PROCESSING,
    label: 'Filter',
    description: 'Filter data based on conditions',
    icon: 'Filter',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Filter',
    },
  },
  [NodeType.TRANSFORM]: {
    type: NodeType.TRANSFORM,
    category: NodeCategory.PROCESSING,
    label: 'Transform',
    description: 'Transform data',
    icon: 'RefreshCw',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Transform',
    },
  },
  [NodeType.MERGE]: {
    type: NodeType.MERGE,
    category: NodeCategory.PROCESSING,
    label: 'Merge',
    description: 'Merge multiple inputs into one',
    icon: 'GitMerge',
    inputs: 2,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Merge',
    },
  },
  [NodeType.SPLIT]: {
    type: NodeType.SPLIT,
    category: NodeCategory.PROCESSING,
    label: 'Split',
    description: 'Split one input into multiple outputs',
    icon: 'GitBranch',
    inputs: 1,
    outputs: 2,
    schema: z.object({}),
    defaultData: {
      name: 'Split',
    },
  },
  
  // AI Nodes
  [NodeType.OCR]: {
    type: NodeType.OCR,
    category: NodeCategory.AI,
    label: 'OCR',
    description: 'Extract text from images',
    icon: 'FileText',
    inputs: 1,
    outputs: 1,
    schema: OCRNodeSchema,
    defaultData: {
      name: 'OCR',
      documentType: 'GENERIC',
      language: 'eng',
      enhanceImage: true,
    },
  },
  [NodeType.TEXT_GENERATION]: {
    type: NodeType.TEXT_GENERATION,
    category: NodeCategory.AI,
    label: 'Text Generation',
    description: 'Generate text using AI',
    icon: 'Type',
    inputs: 1,
    outputs: 1,
    schema: TextGenerationNodeSchema,
    defaultData: {
      name: 'Text Generation',
      model: 'claude-3-7-sonnet-20250219',
      prompt: '',
      temperature: 0.7,
      maxTokens: 1000,
    },
  },
  [NodeType.AGENT]: {
    type: NodeType.AGENT,
    category: NodeCategory.AI,
    label: 'Agent',
    description: 'Use an AI agent',
    icon: 'Bot',
    inputs: 1,
    outputs: 1,
    schema: AgentNodeSchema,
    defaultData: {
      name: 'Agent',
      agentType: 'assistant',
      systemPrompt: '',
      tools: [],
      temperature: 0.7,
      maxTokens: 1000,
    },
  },
  [NodeType.SCRAPER]: {
    type: NodeType.SCRAPER,
    category: NodeCategory.AI,
    label: 'Web Scraper',
    description: 'Scrape content from websites',
    icon: 'Globe',
    inputs: 1,
    outputs: 1,
    schema: ScraperNodeSchema,
    defaultData: {
      name: 'Web Scraper',
      url: '',
      selectors: {},
      siteType: 'GENERIC',
      javascriptRendering: false,
    },
  },
  
  // Integration Nodes
  [NodeType.API_REQUEST]: {
    type: NodeType.API_REQUEST,
    category: NodeCategory.INTEGRATION,
    label: 'API Request',
    description: 'Make an API request',
    icon: 'Send',
    inputs: 1,
    outputs: 1,
    schema: APIRequestNodeSchema,
    defaultData: {
      name: 'API Request',
      method: 'GET',
      endpoint: '',
      headers: {},
      params: {},
    },
  },
  [NodeType.DATABASE]: {
    type: NodeType.DATABASE,
    category: NodeCategory.INTEGRATION,
    label: 'Database',
    description: 'Connect to a database',
    icon: 'Database',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Database',
    },
  },
  [NodeType.WEBHOOK]: {
    type: NodeType.WEBHOOK,
    category: NodeCategory.INTEGRATION,
    label: 'Webhook',
    description: 'Send data to a webhook',
    icon: 'Webhook',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Webhook',
    },
  },
  
  // Output Nodes
  [NodeType.EMAIL]: {
    type: NodeType.EMAIL,
    category: NodeCategory.OUTPUT,
    label: 'Email',
    description: 'Send an email',
    icon: 'Mail',
    inputs: 1,
    outputs: 0,
    schema: z.object({}),
    defaultData: {
      name: 'Email',
    },
  },
  [NodeType.NOTIFICATION]: {
    type: NodeType.NOTIFICATION,
    category: NodeCategory.OUTPUT,
    label: 'Notification',
    description: 'Send a notification',
    icon: 'Bell',
    inputs: 1,
    outputs: 0,
    schema: z.object({}),
    defaultData: {
      name: 'Notification',
    },
  },
  [NodeType.FILE_OUTPUT]: {
    type: NodeType.FILE_OUTPUT,
    category: NodeCategory.OUTPUT,
    label: 'File Output',
    description: 'Output to a file',
    icon: 'File',
    inputs: 1,
    outputs: 0,
    schema: z.object({}),
    defaultData: {
      name: 'File Output',
    },
  },
  [NodeType.DATA_EXPORT]: {
    type: NodeType.DATA_EXPORT,
    category: NodeCategory.OUTPUT,
    label: 'Data Export',
    description: 'Export data',
    icon: 'Share',
    inputs: 1,
    outputs: 0,
    schema: z.object({}),
    defaultData: {
      name: 'Data Export',
    },
  },
  
  // Control Flow Nodes
  [NodeType.CONDITION]: {
    type: NodeType.CONDITION,
    category: NodeCategory.CONTROL_FLOW,
    label: 'Condition',
    description: 'Branch based on a condition',
    icon: 'GitBranch',
    inputs: 1,
    outputs: 2,
    schema: ConditionNodeSchema,
    defaultData: {
      name: 'Condition',
      condition: '',
    },
  },
  [NodeType.SWITCH]: {
    type: NodeType.SWITCH,
    category: NodeCategory.CONTROL_FLOW,
    label: 'Switch',
    description: 'Route based on value',
    icon: 'Shuffle',
    inputs: 1,
    outputs: 3,
    schema: z.object({}),
    defaultData: {
      name: 'Switch',
    },
  },
  [NodeType.LOOP]: {
    type: NodeType.LOOP,
    category: NodeCategory.CONTROL_FLOW,
    label: 'Loop',
    description: 'Loop over items',
    icon: 'Repeat',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Loop',
    },
  },
  [NodeType.PARALLEL]: {
    type: NodeType.PARALLEL,
    category: NodeCategory.CONTROL_FLOW,
    label: 'Parallel',
    description: 'Execute branches in parallel',
    icon: 'Split',
    inputs: 1,
    outputs: 2,
    schema: z.object({}),
    defaultData: {
      name: 'Parallel',
    },
  },
  
  // Utility Nodes
  [NodeType.DELAY]: {
    type: NodeType.DELAY,
    category: NodeCategory.UTILITY,
    label: 'Delay',
    description: 'Add a delay',
    icon: 'Clock',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Delay',
    },
  },
  [NodeType.LOGGER]: {
    type: NodeType.LOGGER,
    category: NodeCategory.UTILITY,
    label: 'Logger',
    description: 'Log information',
    icon: 'List',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Logger',
    },
  },
  [NodeType.CODE]: {
    type: NodeType.CODE,
    category: NodeCategory.UTILITY,
    label: 'Code',
    description: 'Run custom code',
    icon: 'Code',
    inputs: 1,
    outputs: 1,
    schema: CodeNodeSchema,
    defaultData: {
      name: 'Code',
      code: '',
      language: 'javascript',
    },
  },
  [NodeType.VARIABLE]: {
    type: NodeType.VARIABLE,
    category: NodeCategory.UTILITY,
    label: 'Variable',
    description: 'Set or use a variable',
    icon: 'Variable',
    inputs: 1,
    outputs: 1,
    schema: z.object({}),
    defaultData: {
      name: 'Variable',
    },
  },
  
  // OCR Nodes
  [NodeType.OCR_PROCESSOR]: {
    type: NodeType.OCR_PROCESSOR,
    category: NodeCategory.DOCUMENT,
    label: 'OCR Processor',
    description: 'Extracts text from images and documents',
    icon: 'FileText',
    inputs: 1,
    outputs: 1,
    schema: OCRProcessorSchema,
    defaultData: {
      name: 'OCR Processor',
      documentType: 'generic',
      language: 'eng',
      enhanceImage: false,
      minConfidence: 0.7,
      outputFormat: 'text',
    },
  },
  
  // Agent Protocol Nodes
  [NodeType.AGENT_PROTOCOL]: {
    type: NodeType.AGENT_PROTOCOL,
    category: NodeCategory.AGENT,
    label: 'Agent Protocol',
    description: 'Implements the agent protocol standard for agent interoperability',
    icon: 'Network',
    inputs: 1,
    outputs: 1,
    schema: AgentProtocolSchema,
    defaultData: {
      name: 'Agent Protocol',
      protocolType: 'agent-gpt',
      agentModel: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      maxSteps: 10,
      memory: true,
      tools: [],
    },
  },
  [NodeType.AGENT_PROTOCOL_CONNECTOR]: {
    type: NodeType.AGENT_PROTOCOL_CONNECTOR,
    category: NodeCategory.AGENT,
    label: 'Protocol Connector',
    description: 'Connects to external agent protocol compliant services',
    icon: 'Link',
    inputs: 1,
    outputs: 1,
    schema: AgentProtocolConnectorSchema,
    defaultData: {
      name: 'Protocol Connector',
      protocol: 'agent-gpt',
      endpoint: 'https://example.com/agent',
      authentication: 'api-key',
      timeout: 30,
    },
  },
  
  // Guardrails Nodes
  [NodeType.GUARDRAIL_FILTER]: {
    type: NodeType.GUARDRAIL_FILTER,
    category: NodeCategory.GUARDRAILS,
    label: 'Content Filter',
    description: 'Filters content based on safety rules',
    icon: 'ShieldAlert',
    inputs: 1,
    outputs: 2,
    schema: GuardrailFilterSchema,
    defaultData: {
      name: 'Content Filter',
      filterType: 'content',
      rules: [
        {
          name: 'No harmful content',
          description: 'Filter out harmful or inappropriate content',
          action: 'block',
        }
      ],
      logViolations: true,
    },
  },
  [NodeType.GUARDRAIL_MODIFIER]: {
    type: NodeType.GUARDRAIL_MODIFIER,
    category: NodeCategory.GUARDRAILS,
    label: 'Content Modifier',
    description: 'Modifies content to comply with safety rules',
    icon: 'Shield',
    inputs: 1,
    outputs: 1,
    schema: GuardrailModifierSchema,
    defaultData: {
      name: 'Content Modifier',
      modifierType: 'rewrite',
      rules: ['no-harmful-content', 'no-personal-info'],
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      preserveIntent: true,
    },
  },
  [NodeType.OCR_ENGINE_SELECTOR]: {
    type: NodeType.OCR_ENGINE_SELECTOR,
    category: NodeCategory.DOCUMENT,
    label: 'OCR Engine Selector',
    description: 'Selects the appropriate OCR engine based on document features',
    icon: 'GitMerge',
    inputs: 1,
    outputs: 1,
    schema: OCREngineSelectorSchema,
    defaultData: {
      name: 'OCR Engine Selector',
      defaultEngine: 'tesseract',
      handleHandwriting: false,
      handleTables: false,
      handleStructured: false,
      regionConsideration: false,
    },
  },
  
  // Web Scraping Nodes
  [NodeType.WEB_SCRAPER]: {
    type: NodeType.WEB_SCRAPER,
    category: NodeCategory.SCRAPING,
    label: 'Web Scraper',
    description: 'Extracts data from websites',
    icon: 'Globe',
    inputs: 1,
    outputs: 1,
    schema: WebScraperSchema,
    defaultData: {
      name: 'Web Scraper',
      url: 'https://example.com',
      selectors: {
        title: 'h1',
        content: 'article',
      },
      extractLinks: true,
      extractImages: false,
      maxPages: 1,
    },
  },
  [NodeType.BROWSER_AUTOMATION]: {
    type: NodeType.BROWSER_AUTOMATION,
    category: NodeCategory.SCRAPING,
    label: 'Browser Automation',
    description: 'Automates browser interactions for complex scraping',
    icon: 'Chrome',
    inputs: 1,
    outputs: 1,
    schema: BrowserAutomationSchema,
    defaultData: {
      name: 'Browser Automation',
      url: 'https://example.com',
      script: `async (page) => {
  await page.goto('{{url}}');
  await page.waitForSelector('body');
  return await page.content();
}`,
      headless: true,
    },
  },
  
  // OSINT Research Nodes
  [NodeType.OSINT_SEARCH]: {
    type: NodeType.OSINT_SEARCH,
    category: NodeCategory.OSINT,
    label: 'OSINT Search',
    description: 'Searches across multiple OSINT sources',
    icon: 'Search',
    inputs: 1,
    outputs: 1,
    schema: OSINTSearchSchema,
    defaultData: {
      name: 'OSINT Search',
      query: '',
      sources: ['web', 'news', 'social'],
      maxResults: 10,
      includeImages: false,
    },
  },
  [NodeType.OSINT_ANALYZER]: {
    type: NodeType.OSINT_ANALYZER,
    category: NodeCategory.OSINT,
    label: 'OSINT Analyzer',
    description: 'Analyzes and synthesizes OSINT data',
    icon: 'BarChart2',
    inputs: 1,
    outputs: 1,
    schema: OSINTAnalyzerSchema,
    defaultData: {
      name: 'OSINT Analyzer',
      analysisType: 'summary',
      depth: 3,
      llmModel: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      visualizeResults: false,
    },
  },
  
  // Social Monitoring Nodes
  [NodeType.SOCIAL_CONNECTOR]: {
    type: NodeType.SOCIAL_CONNECTOR,
    category: NodeCategory.SOCIAL,
    label: 'Social Connector',
    description: 'Connects to social media platforms',
    icon: 'Share2',
    inputs: 1,
    outputs: 1,
    schema: SocialConnectorSchema,
    defaultData: {
      name: 'Social Connector',
      platform: 'twitter',
      useOAuth: true,
    },
  },
  [NodeType.SOCIAL_MONITOR]: {
    type: NodeType.SOCIAL_MONITOR,
    category: NodeCategory.SOCIAL,
    label: 'Social Monitor',
    description: 'Monitors social media for keywords and accounts',
    icon: 'Activity',
    inputs: 1,
    outputs: 1,
    schema: SocialMonitorSchema,
    defaultData: {
      name: 'Social Monitor',
      keywords: ['synthralos'],
      accounts: [],
      frequency: 15,
      alertThreshold: 0.7,
      storeHistory: true,
    },
  },
  
  // Runtime Nodes
  [NodeType.RUNTIME_EXECUTOR]: {
    type: NodeType.RUNTIME_EXECUTOR,
    category: NodeCategory.RUNTIME,
    label: 'Runtime Executor',
    description: 'Executes code in various runtime environments',
    icon: 'Terminal',
    inputs: 1,
    outputs: 1,
    schema: RuntimeExecutorSchema,
    defaultData: {
      name: 'Runtime Executor',
      runtimeType: 'e2b',
      code: '# Your code here\nprint("Hello World")',
      language: 'python',
      timeout: 60,
      environment: {},
      requirements: [],
    },
  },
  [NodeType.RUNTIME_ENVIRONMENT]: {
    type: NodeType.RUNTIME_ENVIRONMENT,
    category: NodeCategory.RUNTIME,
    label: 'Runtime Environment',
    description: 'Configures runtime environments for code execution',
    icon: 'Server',
    inputs: 1,
    outputs: 1,
    schema: RuntimeEnvironmentSchema,
    defaultData: {
      name: 'Runtime Environment',
      runtimeType: 'e2b',
      environmentVariables: {},
      resources: {
        cpu: 1,
        memory: 1024,
        gpu: false,
      },
      timeout: 300,
    },
  },
  
  // Memory Management Node
  [NodeType.MEMORY_DASHBOARD]: {
    type: NodeType.MEMORY_DASHBOARD,
    category: NodeCategory.MEMORY,
    label: 'Memory Dashboard',
    description: 'Visualizes and manages different memory types',
    icon: 'Database',
    inputs: 1,
    outputs: 1,
    schema: MemoryDashboardSchema,
    defaultData: {
      name: 'Memory Dashboard',
      memoryTypes: ['buffer', 'vector'],
      visualize: true,
      maxEntries: 100,
      autoRefresh: false,
      refreshInterval: 60,
    },
  },
  
  // RAG Nodes
  [NodeType.RAG_RETRIEVER]: {
    type: NodeType.RAG_RETRIEVER,
    category: NodeCategory.RAG,
    label: 'RAG Retriever',
    description: 'Retrieves documents from vector database',
    icon: 'FileSearch',
    inputs: 1,
    outputs: 1,
    schema: RAGRetrieverSchema,
    defaultData: {
      name: 'RAG Retriever',
      retrievalType: 'hybrid',
      topK: 5,
      scoreThreshold: 0.7,
      reranker: false,
    },
  },
  [NodeType.RAG_DB_SWITCH]: {
    type: NodeType.RAG_DB_SWITCH,
    category: NodeCategory.RAG,
    label: 'RAG DB Switch',
    description: 'Routes to different vector databases',
    icon: 'GitBranch',
    inputs: 1,
    outputs: 1,
    schema: RAGDBSwitchSchema,
    defaultData: {
      name: 'RAG DB Switch',
      strategy: 'performance',
      databases: [
        {
          id: 'default',
          name: 'Primary DB',
          priority: 1,
        },
      ],
    },
  },
  
  // Vector DB Nodes
  [NodeType.VECTOR_STORE]: {
    type: NodeType.VECTOR_STORE,
    category: NodeCategory.VECTOR_DB,
    label: 'Vector Store',
    description: 'Manages vector database connection',
    icon: 'Database',
    inputs: 1,
    outputs: 1,
    schema: VectorStoreSchema,
    defaultData: {
      name: 'Vector Store',
      storeType: 'supavec',
      dimension: 1536,
      metric: 'cosine',
      embeddingModel: 'text-embedding-large',
    },
  },
  [NodeType.VECTOR_SEARCH]: {
    type: NodeType.VECTOR_SEARCH,
    category: NodeCategory.VECTOR_DB,
    label: 'Vector Search',
    description: 'Searches for similar vectors in the database',
    icon: 'Search',
    inputs: 1,
    outputs: 1,
    schema: VectorSearchSchema,
    defaultData: {
      name: 'Vector Search',
      query: '',
      topK: 5,
      includeValues: true,
      includeMetadata: true,
    },
  },
  [NodeType.VECTOR_INDEX]: {
    type: NodeType.VECTOR_INDEX,
    category: NodeCategory.VECTOR_DB,
    label: 'Vector Index',
    description: 'Indexes documents in vector database',
    icon: 'FilePlus',
    inputs: 1,
    outputs: 1,
    schema: VectorIndexSchema,
    defaultData: {
      name: 'Vector Index',
      documents: [],
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingBatchSize: 100,
    },
  },
  
  // Telemetry Nodes
  [NodeType.TELEMETRY_COLLECTOR]: {
    type: NodeType.TELEMETRY_COLLECTOR,
    category: NodeCategory.TELEMETRY,
    label: 'Telemetry Collector',
    description: 'Collects performance metrics',
    icon: 'LineChart',
    inputs: 1,
    outputs: 1,
    schema: TelemetryCollectorSchema,
    defaultData: {
      name: 'Telemetry Collector',
      metrics: ['latency', 'error-rate'],
      sampleRate: 1,
      aggregationPeriod: 60,
    },
  },
  [NodeType.TELEMETRY_ALERT]: {
    type: NodeType.TELEMETRY_ALERT,
    category: NodeCategory.TELEMETRY,
    label: 'Telemetry Alert',
    description: 'Configures alerts based on metrics',
    icon: 'Bell',
    inputs: 1,
    outputs: 1,
    schema: TelemetryAlertSchema,
    defaultData: {
      name: 'Telemetry Alert',
      alertConditions: [
        {
          metric: 'error-rate',
          operator: '>',
          threshold: 0.05,
          duration: 300,
        },
      ],
      cooldownPeriod: 300,
      severity: 'warning',
    },
  },
  
  // Activity Logger Nodes
  [NodeType.ACTIVITY_LOGGER]: {
    type: NodeType.ACTIVITY_LOGGER,
    category: NodeCategory.UTILITY,
    label: 'Activity Logger',
    description: 'Logs activity data for audit and monitoring',
    icon: 'FileText',
    inputs: 1,
    outputs: 1,
    schema: ActivityLoggerSchema,
    defaultData: {
      name: 'Activity Logger',
      level: 'info',
      entityType: 'workflow',
      action: 'execution',
      message: '',
      details: {},
      storeInDatabase: true,
    },
  },
  [NodeType.AUDIT_TRAIL]: {
    type: NodeType.AUDIT_TRAIL,
    category: NodeCategory.UTILITY,
    label: 'Audit Trail',
    description: 'Retrieves and filters activity logs',
    icon: 'ScrollText',
    inputs: 1,
    outputs: 1,
    schema: AuditTrailSchema,
    defaultData: {
      name: 'Audit Trail',
      filters: {
        entityType: ['workflow', 'agent'],
        level: ['info', 'warning', 'error'],
      },
      maxResults: 100,
      exportFormat: 'json',
      includeMetadata: true,
    },
  },
  
  // Search Nodes
  [NodeType.UNIFIED_SEARCH]: {
    type: NodeType.UNIFIED_SEARCH,
    category: NodeCategory.UTILITY,
    label: 'Unified Search',
    description: 'Searches across multiple data sources',
    icon: 'Search',
    inputs: 1,
    outputs: 1,
    schema: UnifiedSearchSchema,
    defaultData: {
      name: 'Unified Search',
      query: '',
      entityTypes: ['document', 'workflow'],
      useSemanticSearch: true,
      filters: {},
      maxResults: 20,
      sortBy: 'relevance',
    },
  },
  [NodeType.SAVED_SEARCH]: {
    type: NodeType.SAVED_SEARCH,
    category: NodeCategory.UTILITY, 
    label: 'Saved Search',
    description: 'Uses or creates saved search configurations',
    icon: 'Bookmark',
    inputs: 1,
    outputs: 1,
    schema: SavedSearchSchema,
    defaultData: {
      name: 'Saved Search',
      createNewSearch: false,
      scheduleInterval: 0,
      notifyOnResults: false,
      exportResults: false,
    },
  },
  
  // Execution Stats Nodes
  [NodeType.EXECUTION_STATS]: {
    type: NodeType.EXECUTION_STATS,
    category: NodeCategory.UTILITY,
    label: 'Execution Stats',
    description: 'Retrieves workflow execution statistics',
    icon: 'BarChart',
    inputs: 1,
    outputs: 1,
    schema: ExecutionStatsSchema,
    defaultData: {
      name: 'Execution Stats',
      metrics: ['duration', 'success-rate'],
      timeRange: 'day',
      aggregation: 'average',
    },
  },
  [NodeType.PERFORMANCE_MONITOR]: {
    type: NodeType.PERFORMANCE_MONITOR,
    category: NodeCategory.UTILITY,
    label: 'Performance Monitor',
    description: 'Monitors workflow performance metrics',
    icon: 'LineChart',
    inputs: 1,
    outputs: 1,
    schema: PerformanceMonitorSchema,
    defaultData: {
      name: 'Performance Monitor',
      monitorAll: true,
      metrics: ['memory-usage', 'cpu-usage', 'response-time'],
      alertOnThreshold: true,
      samplingInterval: 60,
    },
  },
  
  // User Preferences Nodes
  [NodeType.USER_PREFERENCES]: {
    type: NodeType.USER_PREFERENCES,
    category: NodeCategory.UTILITY,
    label: 'User Preferences',
    description: 'Manages user preferences and settings',
    icon: 'Settings',
    inputs: 1,
    outputs: 1,
    schema: UserPreferencesSchema,
    defaultData: {
      name: 'User Preferences',
      preferencesCategory: 'ui',
      operation: 'get',
      preferences: {},
      applyImmediately: true,
    },
  },
  [NodeType.PREFERENCE_SYNC]: {
    type: NodeType.PREFERENCE_SYNC,
    category: NodeCategory.UTILITY,
    label: 'Preference Sync',
    description: 'Synchronizes user preferences across devices',
    icon: 'RefreshCw',
    inputs: 1,
    outputs: 1,
    schema: PreferenceSyncSchema,
    defaultData: {
      name: 'Preference Sync',
      syncTarget: 'all',
      preferenceGroups: ['ui'],
      conflictResolution: 'newest',
      syncInterval: 0,
      syncOnConnect: true,
    },
  },
};