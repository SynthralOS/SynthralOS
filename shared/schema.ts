import { pgTable, text, varchar, timestamp, serial, integer, jsonb, boolean, real, index, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ScraperType } from '../server/services/scraping/types';

// Enums for Airbyte
export enum AirbyteConnectionStatus {
  Active = 'active',
  Inactive = 'inactive',
  Deprecated = 'deprecated'
}

export enum AirbyteSyncStatus {
  Pending = 'pending',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

// Enum for job status
export enum JobStatus {
  Created = 'created',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

// Enum for workflow execution status
export enum ExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

// Enum for change detection alert status
export enum AlertStatus {
  Unread = 'unread',
  Read = 'read',
  Deleted = 'deleted'
}

// Enum for Slack connection status
export enum SlackConnectionStatus {
  Connected = 'connected',
  Error = 'error',
  Disconnected = 'disconnected'
}

// User table for authentication and user management
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username').notNull().unique(),
  email: varchar('email').notNull().unique(),
  password: varchar('password').notNull(),
  name: varchar('name'),
  image: varchar('image'),
  provider: text('provider'),
  provider_id: text('provider_id'),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  subscription_status: text('subscription_status'),
  subscription_tier: text('subscription_tier'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users);

// Scraping Jobs table
export const scrapingJobs = pgTable('scraping_jobs', {
  id: varchar('id').primaryKey().default(serial('id_auto').toString()),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  type: varchar('type').notNull().$type<ScraperType>(),
  config: jsonb('config').notNull(),
  status: varchar('status').notNull().$type<JobStatus>(),
  schedule: varchar('schedule'),
  lastRunAt: timestamp('last_run_at'),
  lastCompletedAt: timestamp('last_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = typeof scrapingJobs.$inferInsert;
export const insertScrapingJobSchema = createInsertSchema(scrapingJobs);

// Scraping Results table
export const scrapingResults = pgTable('scraping_results', {
  id: serial('id').primaryKey(),
  jobId: varchar('job_id').references(() => scrapingJobs.id).notNull(),
  success: boolean('success').notNull(),
  data: jsonb('data'),
  error: text('error'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    jobIdx: index('job_idx').on(table.jobId),
    createdAtIdx: index('created_at_idx').on(table.createdAt)
  };
});

export type ScrapingResult = typeof scrapingResults.$inferSelect;
export type InsertScrapingResult = typeof scrapingResults.$inferInsert;
export const insertScrapingResultSchema = createInsertSchema(scrapingResults);

// Change Detection Monitors table
export const changeDetectionMonitors = pgTable('change_detection_monitors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  url: varchar('url').notNull(),
  selectors: jsonb('selectors').notNull(),
  frequency: varchar('frequency').notNull(), // 'hourly', 'daily', 'weekly', etc.
  diffThreshold: real('diff_threshold').default(0.05).notNull(),
  ignoredSelectors: jsonb('ignored_selectors'),
  baselineContent: jsonb('baseline_content'),
  lastCheckedAt: timestamp('last_checked_at'),
  lastChangedAt: timestamp('last_changed_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type ChangeDetectionMonitor = typeof changeDetectionMonitors.$inferSelect;
export type InsertChangeDetectionMonitor = typeof changeDetectionMonitors.$inferInsert;
export const insertChangeDetectionMonitorSchema = createInsertSchema(changeDetectionMonitors);

// Change Detection Alerts table
export const changeDetectionAlerts = pgTable('change_detection_alerts', {
  id: serial('id').primaryKey(),
  monitorId: integer('monitor_id').references(() => changeDetectionMonitors.id).notNull(),
  previousContent: jsonb('previous_content'),
  currentContent: jsonb('current_content').notNull(),
  diffPct: real('diff_pct').notNull(),
  diffDetails: jsonb('diff_details'),
  status: varchar('status').notNull().$type<AlertStatus>().default(AlertStatus.Unread),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    monitorIdx: index('monitor_idx').on(table.monitorId),
    statusIdx: index('status_idx').on(table.status),
    createdAtIdx: index('alert_created_at_idx').on(table.createdAt)
  };
});

export type ChangeDetectionAlert = typeof changeDetectionAlerts.$inferSelect;
export type InsertChangeDetectionAlert = typeof changeDetectionAlerts.$inferInsert;
export const insertChangeDetectionAlertSchema = createInsertSchema(changeDetectionAlerts);

// Scraping Templates table for saving reusable scraper configurations
export const scrapingTemplates = pgTable('scraping_templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  type: varchar('type').notNull().$type<ScraperType>(),
  config: jsonb('config').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type ScrapingTemplate = typeof scrapingTemplates.$inferSelect;
export type InsertScrapingTemplate = typeof scrapingTemplates.$inferInsert;
export const insertScrapingTemplateSchema = createInsertSchema(scrapingTemplates);

// Social Connectors table for integration with social media platforms
export const socialConnectors = pgTable('social_connectors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  platform: varchar('platform').notNull(),
  credentials: jsonb('credentials').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('social_user_id_idx').on(table.userId),
    platformIdx: index('social_platform_idx').on(table.platform),
    activeIdx: index('social_active_idx').on(table.isActive)
  };
});

export type SocialConnector = typeof socialConnectors.$inferSelect;
export type InsertSocialConnector = typeof socialConnectors.$inferInsert;
export const insertSocialConnectorSchema = createInsertSchema(socialConnectors);

// Social Monitors table for continuous monitoring of social media content
export const socialMonitors = pgTable('social_monitors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  connectorId: integer('connector_id').references(() => socialConnectors.id).notNull(),
  name: varchar('name').notNull(),
  type: varchar('type').notNull(), // 'keyword', 'user', 'hashtag', etc.
  query: jsonb('query').notNull(), // Search parameters
  frequency: varchar('frequency').notNull(), // 'realtime', 'hourly', 'daily', etc.
  status: varchar('status').default('active').notNull(),
  lastRunAt: timestamp('last_run_at'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('social_monitor_user_id_idx').on(table.userId),
    connectorIdIdx: index('social_monitor_connector_id_idx').on(table.connectorId),
    statusIdx: index('social_monitor_status_idx').on(table.status)
  };
});

export type SocialMonitor = typeof socialMonitors.$inferSelect;
export type InsertSocialMonitor = typeof socialMonitors.$inferInsert;
export const insertSocialMonitorSchema = createInsertSchema(socialMonitors);

// Monitor Results table for storing results from social monitoring
export const monitorResults = pgTable('monitor_results', {
  id: serial('id').primaryKey(),
  monitorId: integer('monitor_id').references(() => socialMonitors.id).notNull(),
  postId: varchar('post_id').notNull(),
  platform: varchar('platform').notNull(),
  content: jsonb('content').notNull(),
  author: varchar('author').notNull(),
  publishedAt: timestamp('published_at'),
  sentiment: real('sentiment'),
  engagement: jsonb('engagement'), // likes, shares, comments, etc.
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    monitorIdIdx: index('monitor_result_monitor_id_idx').on(table.monitorId),
    postIdIdx: index('monitor_result_post_id_idx').on(table.postId),
    authorIdx: index('monitor_result_author_idx').on(table.author),
    publishedAtIdx: index('monitor_result_published_at_idx').on(table.publishedAt)
  };
});

export type MonitorResult = typeof monitorResults.$inferSelect;
export type InsertMonitorResult = typeof monitorResults.$inferInsert;
export const insertMonitorResultSchema = createInsertSchema(monitorResults);

// Social Alerts table for storing alerts based on monitoring conditions
export const socialAlerts = pgTable('social_alerts', {
  id: serial('id').primaryKey(),
  monitorId: integer('monitor_id').references(() => socialMonitors.id).notNull(),
  resultId: integer('result_id').references(() => monitorResults.id),
  type: varchar('type').notNull(), // 'keyword_match', 'sentiment_drop', 'engagement_spike', etc.
  title: varchar('title').notNull(),
  description: text('description'),
  severity: varchar('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  status: varchar('status').default('unread').notNull(),
  readAt: timestamp('read_at'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    monitorIdIdx: index('social_alert_monitor_id_idx').on(table.monitorId),
    resultIdIdx: index('social_alert_result_id_idx').on(table.resultId),
    statusIdx: index('social_alert_status_idx').on(table.status),
    severityIdx: index('social_alert_severity_idx').on(table.severity),
    createdAtIdx: index('social_alert_created_at_idx').on(table.createdAt)
  };
});

export type SocialAlert = typeof socialAlerts.$inferSelect;
export type InsertSocialAlert = typeof socialAlerts.$inferInsert;
export const insertSocialAlertSchema = createInsertSchema(socialAlerts);

// Activity Logs for user actions and system events
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error'
}

export enum EntityType {
  User = 'user',
  Workflow = 'workflow',
  Agent = 'agent',
  ScrapingJob = 'scraping_job',
  Monitor = 'monitor',
  System = 'system'
}

// Workflow table
export const workflows = pgTable('workflows', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  data: jsonb('data').notNull(), // JSON representation of the workflow
  isPublic: boolean('is_public').default(false).notNull(),
  isTemplate: boolean('is_template').default(false).notNull(),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    ownerIdIdx: index('workflow_owner_id_idx').on(table.ownerId),
    publicIdx: index('workflow_public_idx').on(table.isPublic),
    templateIdx: index('workflow_template_idx').on(table.isTemplate)
  };
});

// Create workflow insert schema
export const insertWorkflowSchema = createInsertSchema(workflows, {
  data: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any())
  }).or(z.string()),
  tags: z.array(z.string()).optional().nullable()
});

// Position enum similar to ReactFlow Position values
export enum NodePosition {
  Left = 'left',
  Right = 'right',
  Top = 'top',
  Bottom = 'bottom'
}

export interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any; // Required property
  selected?: boolean;
  dragging?: boolean;
  sourcePosition?: NodePosition | string;
  targetPosition?: NodePosition | string;
  width?: number;
  height?: number;
  [key: string]: any;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  label?: string;
  selected?: boolean;
  type?: string;
  [key: string]: any;
}

export interface WorkflowData {
  nodes: Node[];
  edges: Edge[];
  [key: string]: any;
}

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

// Add Zod schema for workflow data
export const workflowDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    data: z.any(),
    selected: z.boolean().optional(),
    dragging: z.boolean().optional(),
    sourcePosition: z.union([z.nativeEnum(NodePosition), z.string()]).optional(),
    targetPosition: z.union([z.nativeEnum(NodePosition), z.string()]).optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })).default([]),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.union([z.string(), z.null()]).optional(),
    targetHandle: z.union([z.string(), z.null()]).optional(),
    animated: z.boolean().optional(),
    label: z.string().optional(),
    selected: z.boolean().optional(),
    type: z.string().optional()
  })).default([])
});
// Use the existing insertWorkflowSchema defined above

// Workflow executions table
export const workflowExecutions = pgTable('workflow_executions', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').references(() => workflows.id).notNull(),
  triggeredById: integer('triggered_by_id').references(() => users.id).notNull(),
  status: varchar('status').$type<ExecutionStatus>().notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  progress: integer('progress').default(0).notNull(),
  result: jsonb('result'),
  error: text('error'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    workflowIdIdx: index('workflow_execution_workflow_id_idx').on(table.workflowId),
    triggeredByIdx: index('workflow_execution_triggered_by_idx').on(table.triggeredById),
    statusIdx: index('workflow_execution_status_idx').on(table.status),
    startedAtIdx: index('workflow_execution_started_at_idx').on(table.startedAt)
  };
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;
export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions);

// Workflow execution logs table
export const executionLogs = pgTable('execution_logs', {
  id: serial('id').primaryKey(),
  executionId: integer('execution_id').references(() => workflowExecutions.id).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  level: varchar('level').notNull(), // 'debug', 'info', 'warning', 'error'
  message: text('message').notNull(),
  source: varchar('source') // Node ID or component that generated the log
}, (table) => {
  return {
    executionIdIdx: index('execution_log_execution_id_idx').on(table.executionId),
    timestampIdx: index('execution_log_timestamp_idx').on(table.timestamp),
    levelIdx: index('execution_log_level_idx').on(table.level)
  };
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;
export const insertExecutionLogSchema = createInsertSchema(executionLogs);

// Node executions table
export const nodeExecutions = pgTable('node_executions', {
  id: serial('id').primaryKey(),
  executionId: integer('execution_id').references(() => workflowExecutions.id).notNull(),
  nodeId: varchar('node_id').notNull(), // ID of the node in the workflow definition
  status: varchar('status').$type<ExecutionStatus>().notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error')
}, (table) => {
  return {
    executionIdIdx: index('node_execution_execution_id_idx').on(table.executionId),
    nodeIdIdx: index('node_execution_node_id_idx').on(table.nodeId),
    statusIdx: index('node_execution_status_idx').on(table.status)
  };
});

export type NodeExecution = typeof nodeExecutions.$inferSelect;
export type InsertNodeExecution = typeof nodeExecutions.$inferInsert;
export const insertNodeExecutionSchema = createInsertSchema(nodeExecutions);

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  level: varchar('level').notNull().$type<LogLevel>(),
  action: varchar('action').notNull(),
  entityType: varchar('entity_type').$type<EntityType>(),
  entityId: varchar('entity_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address'),
  userAgent: varchar('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('activity_log_user_id_idx').on(table.userId),
    levelIdx: index('activity_log_level_idx').on(table.level),
    actionIdx: index('activity_log_action_idx').on(table.action),
    entityTypeIdx: index('activity_log_entity_type_idx').on(table.entityType),
    timestampIdx: index('activity_log_timestamp_idx').on(table.timestamp)
  };
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export const insertActivityLogSchema = createInsertSchema(activityLogs);

// User Preferences table
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  theme: varchar('theme').default('system'),
  uiDensity: varchar('ui_density').default('comfortable'),
  timezone: varchar('timezone'),
  dateFormat: varchar('date_format'),
  defaultLanguage: varchar('default_language').default('en'),
  aiSettings: jsonb('ai_settings').default({}),
  notificationSettings: jsonb('notification_settings').default({}),
  customization: jsonb('customization').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('user_preferences_user_id_idx').on(table.userId)
  };
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;
export const insertUserPreferenceSchema = createInsertSchema(userPreferences);

// Memory + RAG + Vector DB Components

// Memory Systems
export enum MemoryType {
  Context7 = 'context7',  // Fast, low-latency memory
  Mem0 = 'mem0',          // Structured memory
  Graphiti = 'graphiti',  // Knowledge graph memory
  Zep = 'zep',            // Fuzzy memory fallback
  LlamaIndex = 'llamaindex', // Index-based memory
  Custom = 'custom'       // Custom memory implementation
}

export const memorySystems = pgTable('memory_systems', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  type: varchar('type').$type<MemoryType>().notNull(),
  description: text('description'),
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false),
  metrics: jsonb('metrics').default({}),  // Performance metrics
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('memory_user_id_idx').on(table.userId),
    typeIdx: index('memory_type_idx').on(table.type),
    activeIdx: index('memory_active_idx').on(table.isActive),
    defaultIdx: index('memory_default_idx').on(table.isDefault)
  };
});

export type MemorySystem = typeof memorySystems.$inferSelect;
export type InsertMemorySystem = typeof memorySystems.$inferInsert;
export const insertMemorySystemSchema = createInsertSchema(memorySystems);

// Memory entries (stored memories)
export const memoryEntries = pgTable('memory_entries', {
  id: serial('id').primaryKey(),
  systemId: integer('system_id').references(() => memorySystems.id).notNull(),
  entryKey: varchar('entry_key').notNull(),  // Unique identifier for the memory
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  importance: real('importance').default(0.5), // How important this memory is
  lastAccessed: timestamp('last_accessed'),
  accessCount: integer('access_count').default(0),
  embeddingId: integer('embedding_id'), // Will be set up with a deferred constraint after vectorItems is defined
  expires: timestamp('expires'),  // When this memory should expire
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    systemIdIdx: index('memory_entry_system_id_idx').on(table.systemId),
    entryKeyIdx: index('memory_entry_key_idx').on(table.entryKey),
    importanceIdx: index('memory_importance_idx').on(table.importance),
    lastAccessedIdx: index('memory_last_accessed_idx').on(table.lastAccessed)
  };
});

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertMemoryEntry = typeof memoryEntries.$inferInsert;
export const insertMemoryEntrySchema = createInsertSchema(memoryEntries);

// Knowledge Graph (for Graphiti memory system)
export const knowledgeGraphNodes = pgTable('knowledge_graph_nodes', {
  id: serial('id').primaryKey(),
  systemId: integer('system_id').references(() => memorySystems.id).notNull(),
  nodeType: varchar('node_type').notNull(),  // 'entity', 'concept', 'fact', etc.
  label: varchar('label').notNull(),
  properties: jsonb('properties').default({}),
  embedding: jsonb('embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    systemIdIdx: index('graph_node_system_id_idx').on(table.systemId),
    nodeTypeIdx: index('graph_node_type_idx').on(table.nodeType),
    labelIdx: index('graph_node_label_idx').on(table.label)
  };
});

export type KnowledgeGraphNode = typeof knowledgeGraphNodes.$inferSelect;
export type InsertKnowledgeGraphNode = typeof knowledgeGraphNodes.$inferInsert;
export const insertKnowledgeGraphNodeSchema = createInsertSchema(knowledgeGraphNodes);

export const knowledgeGraphEdges = pgTable('knowledge_graph_edges', {
  id: serial('id').primaryKey(),
  systemId: integer('system_id').references(() => memorySystems.id).notNull(),
  sourceId: integer('source_id').references(() => knowledgeGraphNodes.id).notNull(),
  targetId: integer('target_id').references(() => knowledgeGraphNodes.id).notNull(),
  relationship: varchar('relationship').notNull(),
  weight: real('weight').default(1.0),
  properties: jsonb('properties').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    systemIdIdx: index('graph_edge_system_id_idx').on(table.systemId),
    sourceIdIdx: index('graph_edge_source_id_idx').on(table.sourceId),
    targetIdIdx: index('graph_edge_target_id_idx').on(table.targetId),
    relationshipIdx: index('graph_edge_relationship_idx').on(table.relationship)
  };
});

export type KnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferSelect;
export type InsertKnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferInsert;
export const insertKnowledgeGraphEdgeSchema = createInsertSchema(knowledgeGraphEdges);

// RAG Systems
export enum RagType {
  LightRAG = 'light_rag',     // Lightweight RAG without vector database
  PineconeRAG = 'pinecone_rag', // Vector database integration with Pinecone
  QdrantRAG = 'qdrant_rag',   // Advanced RAG system with Qdrant vector database
  ChromaRAG = 'chroma_rag',   // Chroma DB integration for document embedding
  PgVectorRAG = 'pgvector_rag', // PostgreSQL with pgvector extension for document storage
  SemanticRAG = 'semantic_rag', // High-precision semantic search RAG
  HybridRAG = 'hybrid_rag',   // Combined semantic and keyword RAG
  CodeRAG = 'code_rag',       // Specialized for code retrieval
  LegalRAG = 'legal_rag',     // Specialized for legal document retrieval
  LlamaIndexRAG = 'llamaindex_rag', // LlamaIndex-based RAG
  MultimodalRAG = 'multimodal_rag', // For text+image retrieval
  Custom = 'custom'           // Custom RAG implementation
}

export const ragSystems = pgTable('rag_systems', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  type: varchar('type').$type<RagType>().notNull(),
  description: text('description'),
  config: jsonb('config').notNull(),
  vectorDbId: integer('vector_db_id').references(() => vectorDatabases.id),
  memorySystemId: integer('memory_system_id').references(() => memorySystems.id),
  isActive: boolean('is_active').default(true).notNull(),
  metrics: jsonb('metrics').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('rag_user_id_idx').on(table.userId),
    typeIdx: index('rag_type_idx').on(table.type),
    activeIdx: index('rag_active_idx').on(table.isActive)
  };
});

export type RagSystem = typeof ragSystems.$inferSelect;
export type InsertRagSystem = typeof ragSystems.$inferInsert;
export const insertRagSystemSchema = createInsertSchema(ragSystems);

// Vector Databases
export enum VectorDbType {
  PgVector = 'pgvector',  // Postgres pgvector
  Milvus = 'milvus',
  Qdrant = 'qdrant',
  Weaviate = 'weaviate',
  External = 'external'   // User's own vector DB
}

export const vectorDatabases = pgTable('vector_databases', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  type: varchar('type').$type<VectorDbType>().notNull(),
  description: text('description'),
  config: jsonb('config').notNull(),  // connection details, etc.
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false),
  dimensions: integer('dimensions').default(1536),  // embedding dimensions
  metrics: jsonb('metrics').default({}),  // Performance metrics
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('vector_db_user_id_idx').on(table.userId),
    typeIdx: index('vector_db_type_idx').on(table.type),
    activeIdx: index('vector_db_active_idx').on(table.isActive),
    defaultIdx: index('vector_db_default_idx').on(table.isDefault)
  };
});

export type VectorDatabase = typeof vectorDatabases.$inferSelect;
export type InsertVectorDatabase = typeof vectorDatabases.$inferInsert;
export const insertVectorDatabaseSchema = createInsertSchema(vectorDatabases);

// Vector Collections
export const vectorCollections = pgTable('vector_collections', {
  id: serial('id').primaryKey(),
  dbId: integer('db_id').references(() => vectorDatabases.id).notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  itemCount: integer('item_count').default(0),
  dimensions: integer('dimensions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    dbIdIdx: index('vector_collection_db_id_idx').on(table.dbId),
    nameIdx: index('vector_collection_name_idx').on(table.name)
  };
});

export type VectorCollection = typeof vectorCollections.$inferSelect;
export type InsertVectorCollection = typeof vectorCollections.$inferInsert;
export const insertVectorCollectionSchema = createInsertSchema(vectorCollections);

// Vector Items - Enhanced version of the previous vectorIndex table
export const vectorItems = pgTable('vector_items', {
  id: serial('id').primaryKey(),
  collectionId: integer('collection_id').references(() => vectorCollections.id).notNull(),
  objectId: varchar('object_id').notNull(),
  objectType: varchar('object_type').notNull(),
  embedding: jsonb('embedding').notNull(),  // Will be replaced with pgvector column
  metadata: jsonb('metadata').default({}),
  content: text('content'),
  title: varchar('title'),
  chunkSize: integer('chunk_size'),
  chunkOverlap: integer('chunk_overlap'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    collectionIdIdx: index('vector_item_collection_id_idx').on(table.collectionId),
    objectIdIdx: index('vector_item_object_id_idx').on(table.objectId),
    objectTypeIdx: index('vector_item_object_type_idx').on(table.objectType),
    titleIdx: index('vector_item_title_idx').on(table.title),
    // Will be replaced with pgvector index
    embeddingIdx: index('vector_item_embedding_idx').on(table.embedding)
  };
});

export type VectorItem = typeof vectorItems.$inferSelect;
export type InsertVectorItem = typeof vectorItems.$inferInsert;
export const insertVectorItemSchema = createInsertSchema(vectorItems);

// Advanced Search Table to store search history and save searches
export const savedSearches = pgTable('saved_searches', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name').notNull(),
  query: text('query').notNull(),
  filters: jsonb('filters').default({}),
  entityType: varchar('entity_type').notNull(), // 'workflow', 'agent', 'job', etc.
  isFavorite: boolean('is_favorite').default(false),
  lastRun: timestamp('last_run'),
  resultCount: integer('result_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('saved_search_user_id_idx').on(table.userId),
    entityTypeIdx: index('saved_search_entity_type_idx').on(table.entityType)
  };
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;
export const insertSavedSearchSchema = createInsertSchema(savedSearches);

// =====================================================================
// Data Integration and ETL Services
// =====================================================================

// ---- Slack Integration ----
export const slackConfigs = pgTable('slack_configs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  botToken: varchar('bot_token').notNull(),
  channelId: varchar('channel_id'),
  defaultChannelId: varchar('default_channel_id'), // Add default channel ID
  teamId: varchar('team_id'),
  workspaceName: varchar('workspace_name'),
  connectionStatus: varchar('connection_status').$type<SlackConnectionStatus>().default(SlackConnectionStatus.Disconnected),
  lastConnectionError: text('last_connection_error'),
  lastConnectedAt: timestamp('last_connected_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('slack_config_user_id_idx').on(table.userId),
    isActiveIdx: index('slack_config_is_active_idx').on(table.isActive),
    connectionStatusIdx: index('slack_config_conn_status_idx').on(table.connectionStatus)
  };
});

export type SlackConfig = typeof slackConfigs.$inferSelect;
export type InsertSlackConfig = typeof slackConfigs.$inferInsert;
export const insertSlackConfigSchema = createInsertSchema(slackConfigs, {
  botToken: z.string().min(1, "Bot token is required")
});

export const slackChannels = pgTable('slack_channels', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  configId: integer('config_id').references(() => slackConfigs.id).notNull(),
  channelId: varchar('channel_id').notNull(),
  name: varchar('name').notNull(),
  isPrivate: boolean('is_private').default(false),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('slack_channel_user_id_idx').on(table.userId),
    configIdIdx: index('slack_channel_config_id_idx').on(table.configId),
    channelIdIdx: index('slack_channel_id_idx').on(table.channelId)
  };
});

export type SlackChannel = typeof slackChannels.$inferSelect;
export type InsertSlackChannel = typeof slackChannels.$inferInsert;
export const insertSlackChannelSchema = createInsertSchema(slackChannels);

export const slackMessages = pgTable('slack_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  channelId: integer('channel_id').references(() => slackChannels.id).notNull(),
  messageId: varchar('message_id').notNull(), // The Slack 'ts' identifier
  text: text('text'),
  sender: varchar('sender'),
  senderName: varchar('sender_name'),
  attachments: jsonb('attachments'),
  reactions: jsonb('reactions'),
  threadTs: varchar('thread_ts'), // Parent thread ts
  postedAt: timestamp('posted_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('slack_message_user_id_idx').on(table.userId),
    channelIdIdx: index('slack_message_channel_id_idx').on(table.channelId),
    messageIdIdx: index('slack_message_id_idx').on(table.messageId),
    postedAtIdx: index('slack_message_posted_at_idx').on(table.postedAt)
  };
});

export type SlackMessage = typeof slackMessages.$inferSelect;
export type InsertSlackMessage = typeof slackMessages.$inferInsert;
export const insertSlackMessageSchema = createInsertSchema(slackMessages);

export enum SlackWebhookEventType {
  Message = 'message',
  ChannelCreated = 'channel_created',
  ChannelArchived = 'channel_archived',
  ChannelUnarchived = 'channel_unarchived',
  MemberJoined = 'member_joined_channel',
  MemberLeft = 'member_left_channel',
  AppMention = 'app_mention',
  Other = 'other'
}

export const slackWebhooks = pgTable('slack_webhooks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  configId: integer('config_id').references(() => slackConfigs.id).notNull(),
  webhookUrl: varchar('webhook_url').notNull(),
  description: text('description'),
  events: jsonb('events').$type<SlackWebhookEventType[]>().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('slack_webhook_user_id_idx').on(table.userId),
    configIdIdx: index('slack_webhook_config_id_idx').on(table.configId),
    isActiveIdx: index('slack_webhook_is_active_idx').on(table.isActive)
  };
});

export type SlackWebhook = typeof slackWebhooks.$inferSelect;
export type InsertSlackWebhook = typeof slackWebhooks.$inferInsert;
export const insertSlackWebhookSchema = createInsertSchema(slackWebhooks, {
  events: z.array(z.nativeEnum(SlackWebhookEventType))
});

// ---- End Slack Integration ----

// ---- Nango Integration (OAuth Provider) ----
export enum OAuthConnectionStatus {
  Connected = 'connected',
  Error = 'error',
  Disconnected = 'disconnected',
  Expired = 'expired'
}

export const oauthConnections = pgTable('oauth_connections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  provider: varchar('provider').notNull(),
  connectionId: varchar('connection_id').notNull(),
  nangoConnectionId: varchar('nango_connection_id').notNull(),
  connectionStatus: varchar('connection_status').$type<OAuthConnectionStatus>().default(OAuthConnectionStatus.Disconnected).notNull(),
  metadata: jsonb('metadata'),
  tokenData: jsonb('token_data'),
  lastError: text('last_error'),
  lastConnectedAt: timestamp('last_connected_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('oauth_user_id_idx').on(table.userId),
    providerIdx: index('oauth_provider_idx').on(table.provider),
    connectionIdIdx: index('oauth_connection_id_idx').on(table.connectionId),
    statusIdx: index('oauth_status_idx').on(table.connectionStatus)
  };
});

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type InsertOAuthConnection = typeof oauthConnections.$inferInsert;
export const insertOAuthConnectionSchema = createInsertSchema(oauthConnections);

// ---- End Nango Integration ----

// We're using enums already defined at the top of the file, no need to redeclare them
// Commenting these out to prevent duplicate identifier errors
/*
export enum AirbyteConnectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated'
}

export enum AirbyteSyncStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
*/

// Airbyte Sources table
export const airbyteSources = pgTable('airbyte_sources', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sourceId: varchar('source_id').notNull(), // External Airbyte source ID
  sourceDefinitionId: varchar('source_definition_id').notNull(), // Reference to Airbyte source type
  name: varchar('name').notNull(),
  connectionConfiguration: jsonb('connection_configuration').notNull(),
  workspaceId: varchar('workspace_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('airbyte_source_user_id_idx').on(table.userId),
    sourceIdIdx: index('airbyte_source_id_idx').on(table.sourceId),
    nameIdx: index('airbyte_source_name_idx').on(table.name)
  };
});

export type AirbyteSource = typeof airbyteSources.$inferSelect;
export type InsertAirbyteSource = typeof airbyteSources.$inferInsert;
export const insertAirbyteSourceSchema = createInsertSchema(airbyteSources);

// Airbyte Destinations table
export const airbyteDestinations = pgTable('airbyte_destinations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  destinationId: varchar('destination_id').notNull(), // External Airbyte destination ID
  destinationDefinitionId: varchar('destination_definition_id').notNull(), // Reference to Airbyte destination type
  name: varchar('name').notNull(),
  connectionConfiguration: jsonb('connection_configuration').notNull(),
  workspaceId: varchar('workspace_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('airbyte_destination_user_id_idx').on(table.userId),
    destinationIdIdx: index('airbyte_destination_id_idx').on(table.destinationId),
    nameIdx: index('airbyte_destination_name_idx').on(table.name)
  };
});

export type AirbyteDestination = typeof airbyteDestinations.$inferSelect;
export type InsertAirbyteDestination = typeof airbyteDestinations.$inferInsert;
export const insertAirbyteDestinationSchema = createInsertSchema(airbyteDestinations);

// Airbyte Connections table
export const airbyteConnections = pgTable('airbyte_connections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  connectionId: varchar('connection_id').notNull(), // External Airbyte connection ID
  sourceId: integer('source_id').references(() => airbyteSources.id).notNull(),
  destinationId: integer('destination_id').references(() => airbyteDestinations.id).notNull(),
  name: varchar('name').notNull(),
  namespaceDefinition: varchar('namespace_definition').default('source'),
  namespaceFormat: varchar('namespace_format').default('${SOURCE_NAMESPACE}'),
  prefix: varchar('prefix'),
  syncCatalog: jsonb('sync_catalog').notNull(),
  schedule: jsonb('schedule'),
  status: varchar('status').$type<AirbyteConnectionStatus>().default(AirbyteConnectionStatus.Active).notNull(),
  resourceRequirements: jsonb('resource_requirements'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('airbyte_connection_user_id_idx').on(table.userId),
    connectionIdIdx: index('airbyte_connection_id_idx').on(table.connectionId),
    sourceIdIdx: index('airbyte_connection_source_id_idx').on(table.sourceId),
    destinationIdIdx: index('airbyte_connection_destination_id_idx').on(table.destinationId),
    statusIdx: index('airbyte_connection_status_idx').on(table.status)
  };
});

export type AirbyteConnection = typeof airbyteConnections.$inferSelect;
export type InsertAirbyteConnection = typeof airbyteConnections.$inferInsert;
export const insertAirbyteConnectionSchema = createInsertSchema(airbyteConnections);

// Airbyte Sync Jobs table
export const airbyteSyncJobs = pgTable('airbyte_sync_jobs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  connectionId: integer('connection_id').references(() => airbyteConnections.id).notNull(),
  jobId: varchar('job_id'), // External Airbyte job ID
  status: varchar('status').$type<AirbyteSyncStatus>().default(AirbyteSyncStatus.Pending).notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  bytesSynced: integer('bytes_synced'),
  recordsSynced: integer('records_synced'),
  logUrl: varchar('log_url'),
  error: jsonb('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('airbyte_sync_job_user_id_idx').on(table.userId),
    connectionIdIdx: index('airbyte_sync_job_connection_id_idx').on(table.connectionId),
    jobIdIdx: index('airbyte_sync_job_id_idx').on(table.jobId),
    statusIdx: index('airbyte_sync_job_status_idx').on(table.status)
  };
});

export type AirbyteSyncJob = typeof airbyteSyncJobs.$inferSelect;
export type InsertAirbyteSyncJob = typeof airbyteSyncJobs.$inferInsert;
export const insertAirbyteSyncJobSchema = createInsertSchema(airbyteSyncJobs);

// Airbyte Configuration table
export const airbyteConfigs = pgTable('airbyte_configs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  configJson: text('config_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('airbyte_config_user_id_idx').on(table.userId)
  };
});

export type AirbyteConfig = typeof airbyteConfigs.$inferSelect;
export type InsertAirbyteConfig = typeof airbyteConfigs.$inferInsert;
export const insertAirbyteConfigSchema = createInsertSchema(airbyteConfigs);

// Composio Status Enum
export enum ComposioWorkflowStatusType {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

export enum ComposioExecutionStatusType {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Composio Configuration table
export const composioConfigs = pgTable('composio_configs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  configJson: text('config_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('composio_config_user_id_idx').on(table.userId)
  };
});

export type ComposioConfig = typeof composioConfigs.$inferSelect;
export type InsertComposioConfig = typeof composioConfigs.$inferInsert;
export const insertComposioConfigSchema = createInsertSchema(composioConfigs);

// Composio Workflows table
export const composioWorkflows = pgTable('composio_workflows', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  workflowId: varchar('workflow_id').notNull(), // External Composio workflow ID
  name: varchar('name').notNull(),
  description: text('description'),
  version: integer('version').default(1).notNull(),
  status: varchar('status').$type<ComposioWorkflowStatusType>().default(ComposioWorkflowStatusType.DRAFT).notNull(),
  definition: jsonb('definition').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('composio_workflow_user_id_idx').on(table.userId),
    workflowIdIdx: index('composio_workflow_id_idx').on(table.workflowId),
    nameIdx: index('composio_workflow_name_idx').on(table.name),
    statusIdx: index('composio_workflow_status_idx').on(table.status)
  };
});

export type ComposioWorkflow = typeof composioWorkflows.$inferSelect;
export type InsertComposioWorkflow = typeof composioWorkflows.$inferInsert;
export const insertComposioWorkflowSchema = createInsertSchema(composioWorkflows, {
  status: z.nativeEnum(ComposioWorkflowStatusType)
});

// Composio Triggers table
export const composioTriggers = pgTable('composio_triggers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  workflowId: integer('workflow_id').references(() => composioWorkflows.id).notNull(),
  triggerId: varchar('trigger_id').notNull(), // External Composio trigger ID
  name: varchar('name').notNull(),
  triggerType: varchar('trigger_type').notNull(),
  configuration: jsonb('configuration').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('composio_trigger_user_id_idx').on(table.userId),
    workflowIdIdx: index('composio_trigger_workflow_id_idx').on(table.workflowId),
    triggerIdIdx: index('composio_trigger_id_idx').on(table.triggerId),
    triggerTypeIdx: index('composio_trigger_type_idx').on(table.triggerType)
  };
});

export type ComposioTrigger = typeof composioTriggers.$inferSelect;
export type InsertComposioTrigger = typeof composioTriggers.$inferInsert;
export const insertComposioTriggerSchema = createInsertSchema(composioTriggers);

// Composio Actions table
export const composioActions = pgTable('composio_actions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  workflowId: integer('workflow_id').references(() => composioWorkflows.id).notNull(),
  actionId: varchar('action_id').notNull(), // External Composio action ID
  name: varchar('name').notNull(),
  actionType: varchar('action_type').notNull(),
  configuration: jsonb('configuration').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('composio_action_user_id_idx').on(table.userId),
    workflowIdIdx: index('composio_action_workflow_id_idx').on(table.workflowId),
    actionIdIdx: index('composio_action_id_idx').on(table.actionId),
    actionTypeIdx: index('composio_action_type_idx').on(table.actionType)
  };
});

export type ComposioAction = typeof composioActions.$inferSelect;
export type InsertComposioAction = typeof composioActions.$inferInsert;
export const insertComposioActionSchema = createInsertSchema(composioActions);

// Composio Executions table
export const composioExecutions = pgTable('composio_executions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  workflowId: integer('workflow_id').references(() => composioWorkflows.id).notNull(),
  triggerId: integer('trigger_id').references(() => composioTriggers.id),
  executionId: varchar('execution_id').notNull(), // External Composio execution ID
  status: varchar('status').$type<ComposioExecutionStatusType>().default(ComposioExecutionStatusType.PENDING).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('composio_execution_user_id_idx').on(table.userId),
    workflowIdIdx: index('composio_execution_workflow_id_idx').on(table.workflowId),
    triggerIdIdx: index('composio_execution_trigger_id_idx').on(table.triggerId),
    executionIdIdx: index('composio_execution_id_idx').on(table.executionId),
    statusIdx: index('composio_execution_status_idx').on(table.status)
  };
});

export type ComposioExecution = typeof composioExecutions.$inferSelect;
export type InsertComposioExecution = typeof composioExecutions.$inferInsert;
export const insertComposioExecutionSchema = createInsertSchema(composioExecutions, {
  status: z.nativeEnum(ComposioExecutionStatusType)
});