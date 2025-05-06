import { 
  users,
  scrapingJobs,
  scrapingResults,
  changeDetectionMonitors,
  changeDetectionAlerts,
  scrapingTemplates,
  socialMonitors,
  workflows,
  workflowExecutions,
  nodeExecutions,
  executionLogs,
  airbyteSources,
  airbyteDestinations,
  airbyteConnections,
  airbyteSyncJobs,
  airbyteConfigs,
  composioConfigs,
  composioWorkflows,
  composioTriggers,
  composioActions,
  composioExecutions,
  slackConfigs,
  slackChannels,
  slackMessages,
  slackWebhooks,
  oauthConnections,
  type User, 
  type InsertUser,
  type ScrapingJob,
  type InsertScrapingJob,
  type ScrapingResult,
  type InsertScrapingResult,
  type ChangeDetectionMonitor,
  type InsertChangeDetectionMonitor,
  type ChangeDetectionAlert,
  type InsertChangeDetectionAlert,
  type ScrapingTemplate,
  type InsertScrapingTemplate,
  type SocialMonitor,
  type InsertSocialMonitor,
  type Workflow,
  type InsertWorkflow,
  type WorkflowExecution,
  type InsertWorkflowExecution,
  type NodeExecution,
  type InsertNodeExecution,
  type ExecutionLog,
  type InsertExecutionLog,
  type AirbyteSource,
  type InsertAirbyteSource,
  type AirbyteDestination,
  type InsertAirbyteDestination,
  type AirbyteConnection,
  type InsertAirbyteConnection,
  type AirbyteSyncJob,
  type InsertAirbyteSyncJob,
  type AirbyteConfig,
  type InsertAirbyteConfig,
  type ComposioWorkflow,
  type InsertComposioWorkflow,
  type ComposioTrigger,
  type InsertComposioTrigger,
  type ComposioAction,
  type InsertComposioAction,
  type ComposioExecution,
  type InsertComposioExecution,
  type ComposioConfig,
  type InsertComposioConfig,
  // Slack integration types
  type SlackConfig,
  type InsertSlackConfig,
  type SlackChannel,
  type InsertSlackChannel,
  type SlackMessage,
  type InsertSlackMessage,
  type SlackWebhook,
  type InsertSlackWebhook,
  // OAuth connection types
  type OAuthConnection,
  type InsertOAuthConnection,
  ExecutionStatus,
  AirbyteConnectionStatus,
  AirbyteSyncStatus,
  ComposioWorkflowStatusType,
  ComposioExecutionStatusType,
  SlackConnectionStatus,
  SlackWebhookEventType,
  OAuthConnectionStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, SQL, like, between, gte, lte, or, sql, not, isNull, lt, gt } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Social monitoring methods
  getSocialMonitorsByUser(userId: number): Promise<SocialMonitor[]>;
  createSocialMonitor(monitor: InsertSocialMonitor): Promise<SocialMonitor>;
  
  // Workflow methods
  getWorkflow(id: number): Promise<Workflow | undefined>;
  getWorkflowsByUser(userId: number): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: number, workflow: Partial<Workflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: number): Promise<boolean>;
  
  // Workflow Execution methods
  getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined>;
  getWorkflowExecutionsByWorkflow(workflowId: number): Promise<WorkflowExecution[]>;
  getWorkflowExecutionsByUser(
    userId: number, 
    options?: { 
      limit?: number; 
      offset?: number; 
      status?: ExecutionStatus | null; 
      search?: string; 
      fromDate?: Date | null; 
      toDate?: Date | null; 
    }
  ): Promise<WorkflowExecution[]>;
  countWorkflowExecutionsByUser(
    userId: number, 
    options?: { 
      status?: ExecutionStatus | null; 
      search?: string; 
      fromDate?: Date | null; 
      toDate?: Date | null; 
    }
  ): Promise<number>;
  createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateWorkflowExecution(id: number, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution | undefined>;
  
  // Node Execution methods
  getNodeExecution(id: number): Promise<NodeExecution | undefined>;
  getNodeExecutions(executionId: number): Promise<NodeExecution[]>;
  createNodeExecution(nodeExecution: InsertNodeExecution): Promise<NodeExecution>;
  updateNodeExecution(id: number, nodeExecution: Partial<NodeExecution>): Promise<NodeExecution | undefined>;
  
  // Execution Log methods
  getExecutionLog(id: number): Promise<ExecutionLog | undefined>;
  getExecutionLogs(executionId: number): Promise<ExecutionLog[]>;
  createExecutionLog(log: InsertExecutionLog): Promise<ExecutionLog>;
  
  // Airbyte methods
  getAirbyteConfig(userId: number): Promise<{ userId: number, configJson: string } | undefined>;
  saveAirbyteConfig(userId: number, config: { userId: number, configJson: string }): Promise<{ userId: number, configJson: string }>;
  getAirbyteSources(userId: number): Promise<AirbyteSource[]>;
  getAirbyteSource(id: number): Promise<AirbyteSource | undefined>;
  createAirbyteSource(source: InsertAirbyteSource): Promise<AirbyteSource>;
  getAirbyteDestinations(userId: number): Promise<AirbyteDestination[]>;
  getAirbyteDestination(id: number): Promise<AirbyteDestination | undefined>;
  createAirbyteDestination(destination: InsertAirbyteDestination): Promise<AirbyteDestination>;
  getAirbyteConnections(userId: number): Promise<AirbyteConnection[]>;
  getAirbyteConnection(id: number): Promise<AirbyteConnection | undefined>;
  createAirbyteConnection(connection: InsertAirbyteConnection): Promise<AirbyteConnection>;
  getAirbyteSyncJobs(userId: number): Promise<AirbyteSyncJob[]>;
  getAirbyteSyncJob(id: number): Promise<AirbyteSyncJob | undefined>;
  createAirbyteSyncJob(job: InsertAirbyteSyncJob): Promise<AirbyteSyncJob>;
  updateAirbyteSyncJob(id: number, job: Partial<AirbyteSyncJob>): Promise<AirbyteSyncJob | undefined>;
  
  // Composio methods
  getComposioConfig(userId: number): Promise<{ userId: number, configJson: string } | undefined>;
  saveComposioConfig(userId: number, config: { userId: number, configJson: string }): Promise<{ userId: number, configJson: string }>;
  getComposioWorkflows(userId: number): Promise<ComposioWorkflow[]>;
  getComposioWorkflow(id: number): Promise<ComposioWorkflow | undefined>;
  createComposioWorkflow(workflow: InsertComposioWorkflow): Promise<ComposioWorkflow>;
  updateComposioWorkflow(id: number, workflow: Partial<ComposioWorkflow>): Promise<ComposioWorkflow | undefined>;
  deleteComposioWorkflow(id: number): Promise<boolean>;
  getComposioTriggers(workflowId: number): Promise<ComposioTrigger[]>;
  getComposioTrigger(id: number): Promise<ComposioTrigger | undefined>;
  createComposioTrigger(trigger: InsertComposioTrigger): Promise<ComposioTrigger>;
  getComposioActions(workflowId: number): Promise<ComposioAction[]>;
  getComposioAction(id: number): Promise<ComposioAction | undefined>;
  createComposioAction(action: InsertComposioAction): Promise<ComposioAction>;
  getComposioExecutions(userId: number, workflowId?: number): Promise<ComposioExecution[]>;
  getComposioExecution(id: number): Promise<ComposioExecution | undefined>;
  createComposioExecution(execution: InsertComposioExecution): Promise<ComposioExecution>;
  updateComposioExecution(id: number, execution: Partial<ComposioExecution>): Promise<ComposioExecution | undefined>;

  // Slack methods
  getSlackConfig(userId: number): Promise<SlackConfig | undefined>;
  getSlackConfigById(id: number): Promise<SlackConfig | undefined>;
  createSlackConfig(config: InsertSlackConfig): Promise<SlackConfig>;
  updateSlackConfig(id: number, config: Partial<SlackConfig>): Promise<SlackConfig | undefined>;
  deleteSlackConfig(id: number): Promise<boolean>;
  
  getSlackChannels(userId: number, configId?: number): Promise<SlackChannel[]>;
  getSlackChannel(id: number): Promise<SlackChannel | undefined>;
  getSlackChannelBySlackId(userId: number, configId: number, channelId: string): Promise<SlackChannel | undefined>;
  createSlackChannel(channel: InsertSlackChannel): Promise<SlackChannel>;
  updateSlackChannel(id: number, updateData: Partial<SlackChannel>): Promise<SlackChannel | undefined>;
  createOrUpdateSlackChannels(userId: number, configId: number, channels: { channelId: string; name: string; isPrivate?: boolean }[]): Promise<SlackChannel[]>;
  
  getSlackMessages(channelId: number, options?: { limit?: number; before?: Date; after?: Date }): Promise<SlackMessage[]>;
  getSlackMessageByMessageId(channelId: number, messageId: string): Promise<SlackMessage | undefined>;
  createSlackMessage(message: InsertSlackMessage): Promise<SlackMessage>;
  batchCreateSlackMessages(messages: InsertSlackMessage[]): Promise<number>;
  
  getSlackWebhooks(userId: number, configId?: number): Promise<SlackWebhook[]>;
  getSlackWebhook(id: number): Promise<SlackWebhook | undefined>;
  createSlackWebhook(webhook: InsertSlackWebhook): Promise<SlackWebhook>;
  updateSlackWebhook(id: number, webhookData: Partial<SlackWebhook>): Promise<SlackWebhook | undefined>;
  deleteSlackWebhook(id: number): Promise<boolean>;
  
  // OAuth (Nango) methods
  getOAuthConnectionsByUser(userId: number): Promise<OAuthConnection[]>;
  getOAuthConnectionsByProvider(userId: number, provider: string): Promise<OAuthConnection[]>;
  getOAuthConnection(id: number): Promise<OAuthConnection | undefined>;
  getOAuthConnectionByNangoId(userId: number, provider: string, connectionId: string): Promise<OAuthConnection | undefined>;
  createOAuthConnection(connection: InsertOAuthConnection): Promise<OAuthConnection>;
  updateOAuthConnection(id: number, connection: Partial<OAuthConnection>): Promise<OAuthConnection | undefined>;
  deleteOAuthConnection(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Social monitoring methods
  async getSocialMonitorsByUser(userId: number): Promise<SocialMonitor[]> {
    try {
      // Check if connector_id column exists in the schema
      // If it doesn't exist, just select by userId without filtering by connector_id
      return await db
        .select()
        .from(socialMonitors)
        .where(eq(socialMonitors.userId, userId))
        .orderBy(desc(socialMonitors.createdAt));
    } catch (error) {
      console.error("Error fetching social monitors for user:", error);
      
      // In case of error (likely a schema issue), return empty array for now
      // In a production app, we'd need to handle schema migrations properly
      return [];
    }
  }
  
  async createSocialMonitor(monitorData: InsertSocialMonitor): Promise<SocialMonitor> {
    try {
      // Convert to format expected by database schema
      const dbMonitor: InsertSocialMonitor = {
        userId: monitorData.userId,
        name: monitorData.name,
        // Map from service format to schema format
        type: 'keyword', // Default type
        connectorId: 1, // Default connector
        // Convert keywords or platforms to JSON query format
        query: monitorData.query || { keywords: [], platforms: [] },
        frequency: monitorData.frequency?.toString() || 'hourly',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [newMonitor] = await db
        .insert(socialMonitors)
        .values(dbMonitor)
        .returning();
      return newMonitor;
    } catch (error) {
      console.error("Error creating social monitor:", error);
      throw error;
    }
  }

  // Workflow methods
  async getWorkflow(id: number): Promise<Workflow | undefined> {
    try {
      const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
      return workflow;
    } catch (error) {
      console.error("Error fetching workflow:", error);
      return undefined;
    }
  }
  
  async getWorkflowsByUser(userId: number): Promise<Workflow[]> {
    try {
      return await db
        .select()
        .from(workflows)
        .where(eq(workflows.ownerId, userId))
        .orderBy(desc(workflows.updatedAt));
    } catch (error) {
      console.error("Error fetching workflows for user:", error);
      return [];
    }
  }
  
  async createWorkflow(workflowData: InsertWorkflow): Promise<Workflow> {
    try {
      const [newWorkflow] = await db
        .insert(workflows)
        .values({
          ...workflowData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newWorkflow;
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  }
  
  async updateWorkflow(id: number, workflowData: Partial<Workflow>): Promise<Workflow | undefined> {
    try {
      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          ...workflowData,
          updatedAt: new Date()
        })
        .where(eq(workflows.id, id))
        .returning();
      return updatedWorkflow;
    } catch (error) {
      console.error("Error updating workflow:", error);
      return undefined;
    }
  }
  
  async deleteWorkflow(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(workflows)
        .where(eq(workflows.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting workflow:", error);
      return false;
    }
  }
  
  // Workflow Execution methods
  async getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined> {
    try {
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, id));
      return execution;
    } catch (error) {
      console.error("Error fetching workflow execution:", error);
      return undefined;
    }
  }
  
  async getWorkflowExecutionsByWorkflow(workflowId: number): Promise<WorkflowExecution[]> {
    try {
      return await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId))
        .orderBy(desc(workflowExecutions.startedAt));
    } catch (error) {
      console.error("Error fetching executions for workflow:", error);
      return [];
    }
  }
  
  async getWorkflowExecutionsByUser(
    userId: number, 
    options: { 
      limit?: number; 
      offset?: number; 
      status?: ExecutionStatus | null; 
      search?: string; 
      fromDate?: Date | null; 
      toDate?: Date | null; 
    } = {}
  ): Promise<WorkflowExecution[]> {
    try {
      const { limit = 10, offset = 0, status, search, fromDate, toDate } = options;
      
      // Join with workflows to filter by user ID
      let query = db
        .select({
          execution: workflowExecutions,
          workflowName: workflows.name,
        })
        .from(workflowExecutions)
        .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
        .where(eq(workflows.ownerId, userId));
      
      // Apply filters
      if (status) {
        query = query.where(eq(workflowExecutions.status, status));
      }
      
      if (search && search.trim() !== '') {
        query = query.where(like(workflows.name, `%${search}%`));
      }
      
      if (fromDate) {
        query = query.where(gte(workflowExecutions.startedAt, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(workflowExecutions.startedAt, toDate));
      }
      
      // Paginate and order
      const results = await query
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(limit)
        .offset(offset);
      
      // Map results to executions
      return results.map(result => result.execution);
    } catch (error) {
      console.error("Error fetching executions by user:", error);
      return [];
    }
  }
  
  async countWorkflowExecutionsByUser(
    userId: number, 
    options: { 
      status?: ExecutionStatus | null; 
      search?: string; 
      fromDate?: Date | null; 
      toDate?: Date | null; 
    } = {}
  ): Promise<number> {
    try {
      const { status, search, fromDate, toDate } = options;
      
      // Join with workflows to filter by user ID
      let query = db
        .select({ count: sql<number>`count(*)` })
        .from(workflowExecutions)
        .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
        .where(eq(workflows.ownerId, userId));
      
      // Apply filters
      if (status) {
        query = query.where(eq(workflowExecutions.status, status));
      }
      
      if (search && search.trim() !== '') {
        query = query.where(like(workflows.name, `%${search}%`));
      }
      
      if (fromDate) {
        query = query.where(gte(workflowExecutions.startedAt, fromDate));
      }
      
      if (toDate) {
        query = query.where(lte(workflowExecutions.startedAt, toDate));
      }
      
      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      console.error("Error counting executions by user:", error);
      return 0;
    }
  }
  
  async createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    try {
      const [newExecution] = await db
        .insert(workflowExecutions)
        .values({
          ...execution,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newExecution;
    } catch (error) {
      console.error("Error creating workflow execution:", error);
      throw error;
    }
  }
  
  async updateWorkflowExecution(id: number, executionData: Partial<WorkflowExecution>): Promise<WorkflowExecution | undefined> {
    try {
      const [updatedExecution] = await db
        .update(workflowExecutions)
        .set({
          ...executionData,
          updatedAt: new Date()
        })
        .where(eq(workflowExecutions.id, id))
        .returning();
      return updatedExecution;
    } catch (error) {
      console.error("Error updating workflow execution:", error);
      return undefined;
    }
  }
  
  // Node Execution methods
  async getNodeExecution(id: number): Promise<NodeExecution | undefined> {
    try {
      const [nodeExecution] = await db
        .select()
        .from(nodeExecutions)
        .where(eq(nodeExecutions.id, id));
      return nodeExecution;
    } catch (error) {
      console.error("Error fetching node execution:", error);
      return undefined;
    }
  }
  
  async getNodeExecutions(executionId: number): Promise<NodeExecution[]> {
    try {
      return await db
        .select()
        .from(nodeExecutions)
        .where(eq(nodeExecutions.executionId, executionId))
        .orderBy(nodeExecutions.startedAt);
    } catch (error) {
      console.error("Error fetching node executions:", error);
      return [];
    }
  }
  
  async createNodeExecution(nodeExecution: InsertNodeExecution): Promise<NodeExecution> {
    try {
      const [newNodeExecution] = await db
        .insert(nodeExecutions)
        .values(nodeExecution)
        .returning();
      return newNodeExecution;
    } catch (error) {
      console.error("Error creating node execution:", error);
      throw error;
    }
  }
  
  async updateNodeExecution(id: number, nodeExecutionData: Partial<NodeExecution>): Promise<NodeExecution | undefined> {
    try {
      const [updatedNodeExecution] = await db
        .update(nodeExecutions)
        .set(nodeExecutionData)
        .where(eq(nodeExecutions.id, id))
        .returning();
      return updatedNodeExecution;
    } catch (error) {
      console.error("Error updating node execution:", error);
      return undefined;
    }
  }
  
  // Execution Log methods
  async getExecutionLog(id: number): Promise<ExecutionLog | undefined> {
    try {
      const [log] = await db
        .select()
        .from(executionLogs)
        .where(eq(executionLogs.id, id));
      return log;
    } catch (error) {
      console.error("Error fetching execution log:", error);
      return undefined;
    }
  }
  
  async getExecutionLogs(executionId: number): Promise<ExecutionLog[]> {
    try {
      return await db
        .select()
        .from(executionLogs)
        .where(eq(executionLogs.executionId, executionId))
        .orderBy(executionLogs.timestamp);
    } catch (error) {
      console.error("Error fetching execution logs:", error);
      return [];
    }
  }
  
  async createExecutionLog(log: InsertExecutionLog): Promise<ExecutionLog> {
    try {
      const [newLog] = await db
        .insert(executionLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error("Error creating execution log:", error);
      throw error;
    }
  }

  // Airbyte methods
  async getAirbyteConfig(userId: number): Promise<{ userId: number, configJson: string } | undefined> {
    try {
      const [config] = await db
        .select()
        .from(airbyteConfigs)
        .where(eq(airbyteConfigs.userId, userId));
      
      if (config) {
        return {
          userId: config.userId,
          configJson: config.configJson
        };
      }
      return undefined;
    } catch (error) {
      console.error("Error fetching Airbyte config:", error);
      return undefined;
    }
  }

  async saveAirbyteConfig(userId: number, config: { userId: number, configJson: string }): Promise<{ userId: number, configJson: string }> {
    try {
      // Check if a config already exists for this user
      const existingConfig = await this.getAirbyteConfig(userId);
      
      if (existingConfig) {
        // Update existing config
        const [updatedConfig] = await db
          .update(airbyteConfigs)
          .set({ 
            configJson: config.configJson,
            updatedAt: new Date()
          })
          .where(eq(airbyteConfigs.userId, userId))
          .returning();
        
        return {
          userId: updatedConfig.userId,
          configJson: updatedConfig.configJson
        };
      } else {
        // Insert new config
        const [newConfig] = await db
          .insert(airbyteConfigs)
          .values({
            userId,
            configJson: config.configJson
          })
          .returning();
        
        return {
          userId: newConfig.userId,
          configJson: newConfig.configJson
        };
      }
    } catch (error) {
      console.error("Error saving Airbyte config:", error);
      throw error;
    }
  }

  async getAirbyteSources(userId: number): Promise<AirbyteSource[]> {
    try {
      return await db
        .select()
        .from(airbyteSources)
        .where(eq(airbyteSources.userId, userId));
    } catch (error) {
      console.error("Error fetching Airbyte sources:", error);
      return [];
    }
  }

  async getAirbyteSource(id: number): Promise<AirbyteSource | undefined> {
    try {
      const [source] = await db
        .select()
        .from(airbyteSources)
        .where(eq(airbyteSources.id, id));
      return source;
    } catch (error) {
      console.error("Error fetching Airbyte source:", error);
      return undefined;
    }
  }

  async createAirbyteSource(source: InsertAirbyteSource): Promise<AirbyteSource> {
    try {
      const [newSource] = await db
        .insert(airbyteSources)
        .values(source)
        .returning();
      return newSource;
    } catch (error) {
      console.error("Error creating Airbyte source:", error);
      throw error;
    }
  }

  async getAirbyteDestinations(userId: number): Promise<AirbyteDestination[]> {
    try {
      return await db
        .select()
        .from(airbyteDestinations)
        .where(eq(airbyteDestinations.userId, userId));
    } catch (error) {
      console.error("Error fetching Airbyte destinations:", error);
      return [];
    }
  }

  async getAirbyteDestination(id: number): Promise<AirbyteDestination | undefined> {
    try {
      const [destination] = await db
        .select()
        .from(airbyteDestinations)
        .where(eq(airbyteDestinations.id, id));
      return destination;
    } catch (error) {
      console.error("Error fetching Airbyte destination:", error);
      return undefined;
    }
  }

  async createAirbyteDestination(destination: InsertAirbyteDestination): Promise<AirbyteDestination> {
    try {
      const [newDestination] = await db
        .insert(airbyteDestinations)
        .values(destination)
        .returning();
      return newDestination;
    } catch (error) {
      console.error("Error creating Airbyte destination:", error);
      throw error;
    }
  }

  async getAirbyteConnections(userId: number): Promise<AirbyteConnection[]> {
    try {
      return await db
        .select()
        .from(airbyteConnections)
        .where(eq(airbyteConnections.userId, userId));
    } catch (error) {
      console.error("Error fetching Airbyte connections:", error);
      return [];
    }
  }

  async getAirbyteConnection(id: number): Promise<AirbyteConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(airbyteConnections)
        .where(eq(airbyteConnections.id, id));
      return connection;
    } catch (error) {
      console.error("Error fetching Airbyte connection:", error);
      return undefined;
    }
  }

  async createAirbyteConnection(connection: InsertAirbyteConnection): Promise<AirbyteConnection> {
    try {
      const [newConnection] = await db
        .insert(airbyteConnections)
        .values(connection)
        .returning();
      return newConnection;
    } catch (error) {
      console.error("Error creating Airbyte connection:", error);
      throw error;
    }
  }

  async getAirbyteSyncJobs(userId: number): Promise<AirbyteSyncJob[]> {
    try {
      return await db
        .select()
        .from(airbyteSyncJobs)
        .where(eq(airbyteSyncJobs.userId, userId))
        .orderBy(desc(airbyteSyncJobs.createdAt));
    } catch (error) {
      console.error("Error fetching Airbyte sync jobs:", error);
      return [];
    }
  }

  async getAirbyteSyncJob(id: number): Promise<AirbyteSyncJob | undefined> {
    try {
      const [job] = await db
        .select()
        .from(airbyteSyncJobs)
        .where(eq(airbyteSyncJobs.id, id));
      return job;
    } catch (error) {
      console.error("Error fetching Airbyte sync job:", error);
      return undefined;
    }
  }

  async createAirbyteSyncJob(job: InsertAirbyteSyncJob): Promise<AirbyteSyncJob> {
    try {
      const [newJob] = await db
        .insert(airbyteSyncJobs)
        .values(job)
        .returning();
      return newJob;
    } catch (error) {
      console.error("Error creating Airbyte sync job:", error);
      throw error;
    }
  }

  async updateAirbyteSyncJob(id: number, job: Partial<AirbyteSyncJob>): Promise<AirbyteSyncJob | undefined> {
    try {
      const [updatedJob] = await db
        .update(airbyteSyncJobs)
        .set({ 
          ...job,
          updatedAt: new Date()
        })
        .where(eq(airbyteSyncJobs.id, id))
        .returning();
      return updatedJob;
    } catch (error) {
      console.error("Error updating Airbyte sync job:", error);
      return undefined;
    }
  }

  // Composio methods implementation
  async getComposioConfig(userId: number): Promise<ComposioConfig | undefined> {
    try {
      const [config] = await db
        .select()
        .from(composioConfigs)
        .where(eq(composioConfigs.userId, userId));
      
      return config;
    } catch (error) {
      console.error("Error getting Composio config:", error);
      return undefined;
    }
  }
  
  async saveComposioConfig(userId: number, config: { userId: number, configJson: string }): Promise<ComposioConfig> {
    try {
      // Check if config exists for this user
      const existingConfig = await this.getComposioConfig(userId);
      
      if (existingConfig) {
        // Update
        const [updatedConfig] = await db
          .update(composioConfigs)
          .set({
            configJson: config.configJson,
            updatedAt: new Date()
          })
          .where(eq(composioConfigs.userId, userId))
          .returning();
        
        return updatedConfig;
      } else {
        // Insert
        const [newConfig] = await db
          .insert(composioConfigs)
          .values({
            userId,
            configJson: config.configJson,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return newConfig;
      }
    } catch (error) {
      console.error("Error saving Composio config:", error);
      throw error;
    }
  }
  
  async getComposioWorkflows(userId: number): Promise<ComposioWorkflow[]> {
    try {
      return await db
        .select()
        .from(composioWorkflows)
        .where(eq(composioWorkflows.userId, userId))
        .orderBy(desc(composioWorkflows.createdAt));
    } catch (error) {
      console.error("Error getting Composio workflows:", error);
      return [];
    }
  }
  
  async getComposioWorkflow(id: number): Promise<ComposioWorkflow | undefined> {
    try {
      const [workflow] = await db
        .select()
        .from(composioWorkflows)
        .where(eq(composioWorkflows.id, id));
      
      return workflow;
    } catch (error) {
      console.error("Error getting Composio workflow:", error);
      return undefined;
    }
  }
  
  async createComposioWorkflow(workflow: InsertComposioWorkflow): Promise<ComposioWorkflow> {
    try {
      const [newWorkflow] = await db
        .insert(composioWorkflows)
        .values({
          ...workflow,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newWorkflow;
    } catch (error) {
      console.error("Error creating Composio workflow:", error);
      throw error;
    }
  }
  
  async updateComposioWorkflow(id: number, workflow: Partial<ComposioWorkflow>): Promise<ComposioWorkflow | undefined> {
    try {
      const [updatedWorkflow] = await db
        .update(composioWorkflows)
        .set({
          ...workflow,
          updatedAt: new Date()
        })
        .where(eq(composioWorkflows.id, id))
        .returning();
      
      return updatedWorkflow;
    } catch (error) {
      console.error("Error updating Composio workflow:", error);
      return undefined;
    }
  }
  
  async deleteComposioWorkflow(id: number): Promise<boolean> {
    try {
      await db
        .delete(composioWorkflows)
        .where(eq(composioWorkflows.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting Composio workflow:", error);
      return false;
    }
  }
  
  async getComposioTriggers(workflowId: number): Promise<ComposioTrigger[]> {
    try {
      return await db
        .select()
        .from(composioTriggers)
        .where(eq(composioTriggers.workflowId, workflowId))
        .orderBy(desc(composioTriggers.createdAt));
    } catch (error) {
      console.error("Error getting Composio triggers:", error);
      return [];
    }
  }
  
  async getComposioTrigger(id: number): Promise<ComposioTrigger | undefined> {
    try {
      const [trigger] = await db
        .select()
        .from(composioTriggers)
        .where(eq(composioTriggers.id, id));
      
      return trigger;
    } catch (error) {
      console.error("Error getting Composio trigger:", error);
      return undefined;
    }
  }
  
  async createComposioTrigger(trigger: InsertComposioTrigger): Promise<ComposioTrigger> {
    try {
      const [newTrigger] = await db
        .insert(composioTriggers)
        .values({
          ...trigger,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newTrigger;
    } catch (error) {
      console.error("Error creating Composio trigger:", error);
      throw error;
    }
  }
  
  async getComposioActions(workflowId: number): Promise<ComposioAction[]> {
    try {
      return await db
        .select()
        .from(composioActions)
        .where(eq(composioActions.workflowId, workflowId))
        .orderBy(desc(composioActions.createdAt));
    } catch (error) {
      console.error("Error getting Composio actions:", error);
      return [];
    }
  }
  
  async getComposioAction(id: number): Promise<ComposioAction | undefined> {
    try {
      const [action] = await db
        .select()
        .from(composioActions)
        .where(eq(composioActions.id, id));
      
      return action;
    } catch (error) {
      console.error("Error getting Composio action:", error);
      return undefined;
    }
  }
  
  async createComposioAction(action: InsertComposioAction): Promise<ComposioAction> {
    try {
      const [newAction] = await db
        .insert(composioActions)
        .values({
          ...action,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newAction;
    } catch (error) {
      console.error("Error creating Composio action:", error);
      throw error;
    }
  }
  
  async getComposioExecutions(userId: number, workflowId?: number): Promise<ComposioExecution[]> {
    try {
      let query = db
        .select()
        .from(composioExecutions)
        .where(eq(composioExecutions.userId, userId));
      
      if (workflowId) {
        query = query.where(eq(composioExecutions.workflowId, workflowId));
      }
      
      return await query.orderBy(desc(composioExecutions.createdAt));
    } catch (error) {
      console.error("Error getting Composio executions:", error);
      return [];
    }
  }
  
  async getComposioExecution(id: number): Promise<ComposioExecution | undefined> {
    try {
      const [execution] = await db
        .select()
        .from(composioExecutions)
        .where(eq(composioExecutions.id, id));
      
      return execution;
    } catch (error) {
      console.error("Error getting Composio execution:", error);
      return undefined;
    }
  }
  
  async createComposioExecution(execution: InsertComposioExecution): Promise<ComposioExecution> {
    try {
      const [newExecution] = await db
        .insert(composioExecutions)
        .values({
          ...execution,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newExecution;
    } catch (error) {
      console.error("Error creating Composio execution:", error);
      throw error;
    }
  }
  
  async updateComposioExecution(id: number, execution: Partial<ComposioExecution>): Promise<ComposioExecution | undefined> {
    try {
      const [updatedExecution] = await db
        .update(composioExecutions)
        .set({
          ...execution,
          updatedAt: new Date()
        })
        .where(eq(composioExecutions.id, id))
        .returning();
      
      return updatedExecution;
    } catch (error) {
      console.error("Error updating Composio execution:", error);
      return undefined;
    }
  }

  // Slack Integration methods
  async getSlackConfig(userId: number): Promise<SlackConfig | undefined> {
    try {
      const [config] = await db
        .select()
        .from(slackConfigs)
        .where(
          and(
            eq(slackConfigs.userId, userId),
            eq(slackConfigs.isActive, true)
          )
        );
      return config;
    } catch (error) {
      console.error("Error getting Slack config:", error);
      return undefined;
    }
  }

  async getSlackConfigById(id: number): Promise<SlackConfig | undefined> {
    try {
      const [config] = await db
        .select()
        .from(slackConfigs)
        .where(eq(slackConfigs.id, id));
      return config;
    } catch (error) {
      console.error("Error getting Slack config by ID:", error);
      return undefined;
    }
  }

  async createSlackConfig(config: InsertSlackConfig): Promise<SlackConfig> {
    try {
      // First deactivate any existing active configs for this user
      await db
        .update(slackConfigs)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(slackConfigs.userId, config.userId),
            eq(slackConfigs.isActive, true)
          )
        );

      // Then create the new config
      const [newConfig] = await db
        .insert(slackConfigs)
        .values(config)
        .returning();
      return newConfig;
    } catch (error) {
      console.error("Error creating Slack config:", error);
      throw error;
    }
  }

  async updateSlackConfig(id: number, configData: Partial<SlackConfig>): Promise<SlackConfig | undefined> {
    try {
      // No need to cast now that we're using the proper enum type everywhere
      // The default type is already SlackConnectionStatus
      
      const [updated] = await db
        .update(slackConfigs)
        .set({
          ...configData,
          updatedAt: new Date()
        })
        .where(eq(slackConfigs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating Slack config:", error);
      return undefined;
    }
  }

  async deleteSlackConfig(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(slackConfigs)
        .where(eq(slackConfigs.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting Slack config:", error);
      return false;
    }
  }

  async getSlackChannels(userId: number, configId?: number): Promise<SlackChannel[]> {
    try {
      let query = db
        .select()
        .from(slackChannels)
        .where(eq(slackChannels.userId, userId));
      
      if (configId) {
        query = query.where(eq(slackChannels.configId, configId));
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting Slack channels:", error);
      return [];
    }
  }

  async getSlackChannel(id: number): Promise<SlackChannel | undefined> {
    try {
      const [channel] = await db
        .select()
        .from(slackChannels)
        .where(eq(slackChannels.id, id));
      return channel;
    } catch (error) {
      console.error("Error getting Slack channel:", error);
      return undefined;
    }
  }

  async getSlackChannelBySlackId(userId: number, configId: number, channelId: string): Promise<SlackChannel | undefined> {
    try {
      const [channel] = await db
        .select()
        .from(slackChannels)
        .where(
          and(
            eq(slackChannels.userId, userId),
            eq(slackChannels.configId, configId),
            eq(slackChannels.channelId, channelId)
          )
        );
      return channel;
    } catch (error) {
      console.error("Error getting Slack channel by Slack ID:", error);
      return undefined;
    }
  }

  async createSlackChannel(channel: InsertSlackChannel): Promise<SlackChannel> {
    try {
      const [newChannel] = await db
        .insert(slackChannels)
        .values(channel)
        .returning();
      return newChannel;
    } catch (error) {
      console.error("Error creating Slack channel:", error);
      throw error;
    }
  }

  async updateSlackChannel(id: number, updateData: Partial<SlackChannel>): Promise<SlackChannel | undefined> {
    try {
      const [updated] = await db
        .update(slackChannels)
        .set(updateData)
        .where(eq(slackChannels.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating Slack channel:", error);
      return undefined;
    }
  }

  async createOrUpdateSlackChannels(userId: number, configId: number, channels: { channelId: string; name: string; isPrivate?: boolean }[]): Promise<SlackChannel[]> {
    try {
      const results: SlackChannel[] = [];
      
      for (const channel of channels) {
        // Check if channel already exists
        const existing = await this.getSlackChannelBySlackId(userId, configId, channel.channelId);
        
        if (existing) {
          // Update existing channel
          const updated = await this.updateSlackChannel(existing.id, {
            name: channel.name,
            isPrivate: channel.isPrivate,
            lastSyncedAt: new Date()
          });
          if (updated) results.push(updated);
        } else {
          // Create new channel
          const newChannel = await this.createSlackChannel({
            userId,
            configId,
            channelId: channel.channelId,
            name: channel.name,
            isPrivate: channel.isPrivate,
            lastSyncedAt: new Date()
          });
          results.push(newChannel);
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error creating/updating Slack channels:", error);
      return [];
    }
  }

  async getSlackMessages(channelId: number, options?: { limit?: number; before?: Date; after?: Date }): Promise<SlackMessage[]> {
    try {
      let query = db
        .select()
        .from(slackMessages)
        .where(eq(slackMessages.channelId, channelId))
        .orderBy(desc(slackMessages.postedAt));
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.before) {
        query = query.where(lt(slackMessages.postedAt, options.before));
      }
      
      if (options?.after) {
        query = query.where(gt(slackMessages.postedAt, options.after));
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting Slack messages:", error);
      return [];
    }
  }

  async getSlackMessageByMessageId(channelId: number, messageId: string): Promise<SlackMessage | undefined> {
    try {
      const [message] = await db
        .select()
        .from(slackMessages)
        .where(
          and(
            eq(slackMessages.channelId, channelId),
            eq(slackMessages.messageId, messageId)
          )
        );
      return message;
    } catch (error) {
      console.error("Error getting Slack message by message ID:", error);
      return undefined;
    }
  }

  async createSlackMessage(message: InsertSlackMessage): Promise<SlackMessage> {
    try {
      const [newMessage] = await db
        .insert(slackMessages)
        .values(message)
        .returning();
      return newMessage;
    } catch (error) {
      console.error("Error creating Slack message:", error);
      throw error;
    }
  }

  async batchCreateSlackMessages(messages: InsertSlackMessage[]): Promise<number> {
    try {
      if (messages.length === 0) return 0;
      
      const result = await db
        .insert(slackMessages)
        .values(messages);
      
      return result.rowCount;
    } catch (error) {
      console.error("Error batch creating Slack messages:", error);
      return 0;
    }
  }

  async getSlackWebhooks(userId: number, configId?: number): Promise<SlackWebhook[]> {
    try {
      let query = db
        .select()
        .from(slackWebhooks)
        .where(eq(slackWebhooks.userId, userId));
      
      if (configId) {
        query = query.where(eq(slackWebhooks.configId, configId));
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting Slack webhooks:", error);
      return [];
    }
  }

  async getSlackWebhook(id: number): Promise<SlackWebhook | undefined> {
    try {
      const [webhook] = await db
        .select()
        .from(slackWebhooks)
        .where(eq(slackWebhooks.id, id));
      return webhook;
    } catch (error) {
      console.error("Error getting Slack webhook:", error);
      return undefined;
    }
  }

  async createSlackWebhook(webhook: InsertSlackWebhook): Promise<SlackWebhook> {
    try {
      const [newWebhook] = await db
        .insert(slackWebhooks)
        .values(webhook)
        .returning();
      return newWebhook;
    } catch (error) {
      console.error("Error creating Slack webhook:", error);
      throw error;
    }
  }

  async updateSlackWebhook(id: number, webhookData: Partial<SlackWebhook>): Promise<SlackWebhook | undefined> {
    try {
      const [updated] = await db
        .update(slackWebhooks)
        .set({
          ...webhookData,
          updatedAt: new Date()
        })
        .where(eq(slackWebhooks.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating Slack webhook:", error);
      return undefined;
    }
  }

  async deleteSlackWebhook(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(slackWebhooks)
        .where(eq(slackWebhooks.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting Slack webhook:", error);
      return false;
    }
  }

  // OAuth connection methods
  async getOAuthConnectionsByUser(userId: number): Promise<OAuthConnection[]> {
    try {
      return await db
        .select()
        .from(oauthConnections)
        .where(eq(oauthConnections.userId, userId))
        .orderBy(desc(oauthConnections.updatedAt));
    } catch (error) {
      console.error("Error getting OAuth connections by user:", error);
      return [];
    }
  }

  async getOAuthConnectionsByProvider(userId: number, provider: string): Promise<OAuthConnection[]> {
    try {
      return await db
        .select()
        .from(oauthConnections)
        .where(and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, provider)
        ))
        .orderBy(desc(oauthConnections.updatedAt));
    } catch (error) {
      console.error("Error getting OAuth connections by provider:", error);
      return [];
    }
  }

  async getOAuthConnection(id: number): Promise<OAuthConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(oauthConnections)
        .where(eq(oauthConnections.id, id));
      return connection;
    } catch (error) {
      console.error("Error getting OAuth connection:", error);
      return undefined;
    }
  }

  async getOAuthConnectionByNangoId(userId: number, provider: string, connectionId: string): Promise<OAuthConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(oauthConnections)
        .where(and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, provider),
          eq(oauthConnections.connectionId, connectionId)
        ));
      return connection;
    } catch (error) {
      console.error("Error getting OAuth connection by Nango ID:", error);
      return undefined;
    }
  }

  async createOAuthConnection(connection: InsertOAuthConnection): Promise<OAuthConnection> {
    try {
      const [newConnection] = await db
        .insert(oauthConnections)
        .values({
          ...connection,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newConnection;
    } catch (error) {
      console.error("Error creating OAuth connection:", error);
      throw error;
    }
  }

  async updateOAuthConnection(id: number, connectionData: Partial<OAuthConnection>): Promise<OAuthConnection | undefined> {
    try {
      const [updatedConnection] = await db
        .update(oauthConnections)
        .set({
          ...connectionData,
          updatedAt: new Date()
        })
        .where(eq(oauthConnections.id, id))
        .returning();
      return updatedConnection;
    } catch (error) {
      console.error("Error updating OAuth connection:", error);
      return undefined;
    }
  }

  async deleteOAuthConnection(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(oauthConnections)
        .where(eq(oauthConnections.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting OAuth connection:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();