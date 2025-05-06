import { 
  SocialConnector as SocialConnectorModel,
  InsertSocialConnector,
  SocialMonitor as SocialMonitorModel,
  InsertSocialMonitor,
  MonitorResult,
  InsertMonitorResult,
  SocialAlert,
  InsertSocialAlert,
  socialConnectors,
  socialMonitors,
  monitorResults,
  socialAlerts
} from '@shared/schema';
import { db } from '../../db';
import { eq, and, desc } from 'drizzle-orm';
import { BaseSocialConnector } from './BaseSocialConnector';
import { TwitterConnector } from './TwitterConnector';
import { LinkedInConnector } from './LinkedInConnector';
import { FacebookConnector } from './FacebookConnector';
import { v4 as uuidv4 } from 'uuid';
import { 
  SearchOptions, 
  Post, 
  MonitorOptions, 
  SocialConnectorConfig, 
  AnalyzedPost
} from './types';

/**
 * Main service for social media monitoring functionality
 * Manages social media connectors and monitoring operations
 */
export class SocialMonitoringService {
  private userId: number;
  private connectors: Map<number, BaseSocialConnector> = new Map();

  constructor(userId?: number) {
    this.userId = userId || 0; // Default to 0 if not provided
  }
  
  /**
   * Set the user ID for the service
   */
  setUserId(userId: number): void {
    this.userId = userId;
  }

  /**
   * Initialize the service by loading all user connectors
   */
  async initialize(): Promise<void> {
    try {
      const connectorModels = await db
        .select()
        .from(socialConnectors)
        .where(eq(socialConnectors.userId, this.userId));

      for (const connectorModel of connectorModels) {
        const connector = await this.loadConnector(connectorModel);
        if (connector) {
          this.connectors.set(connectorModel.id, connector);
        }
      }
    } catch (error) {
      console.error('Error initializing SocialMonitoringService:', error);
      throw error;
    }
  }

  /**
   * Create a new social media connector
   */
  async createConnector(
    platform: 'twitter' | 'x' | 'linkedin' | 'facebook',
    name: string,
    config: SocialConnectorConfig
  ): Promise<BaseSocialConnector> {
    try {
      let connector: BaseSocialConnector;

      // Create the appropriate connector type based on platform
      switch (platform) {
        case 'twitter':
        case 'x':
          connector = new TwitterConnector(this.userId, { ...config, name });
          break;
        case 'linkedin':
          connector = new LinkedInConnector(this.userId, { ...config, name });
          break;
        case 'facebook':
          connector = new FacebookConnector(this.userId, { ...config, name });
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Authenticate the connector
      const isAuth = await connector.authenticate();
      if (!isAuth) {
        throw new Error(`Authentication failed for ${platform} connector`);
      }

      // Save to database
      const savedConnector = await connector.save();
      
      // Store in memory
      this.connectors.set(savedConnector.id, connector);
      
      return connector;
    } catch (error) {
      console.error(`Error creating ${platform} connector:`, error);
      throw error;
    }
  }

  /**
   * Get all social connectors for the user
   */
  async getConnectors(): Promise<SocialConnectorModel[]> {
    try {
      return await db
        .select()
        .from(socialConnectors)
        .where(eq(socialConnectors.userId, this.userId));
    } catch (error) {
      console.error('Error getting social connectors:', error);
      throw error;
    }
  }

  /**
   * Get a specific connector by ID
   */
  async getConnector(connectorId: number): Promise<BaseSocialConnector> {
    // Check if it's already loaded
    if (this.connectors.has(connectorId)) {
      return this.connectors.get(connectorId)!;
    }

    // Otherwise, load it from the database
    const connectorModel = await db
      .select()
      .from(socialConnectors)
      .where(and(
        eq(socialConnectors.id, connectorId),
        eq(socialConnectors.userId, this.userId)
      ))
      .then(rows => rows[0]);

    if (!connectorModel) {
      throw new Error(`Connector with ID ${connectorId} not found or access denied`);
    }

    const connector = await this.loadConnector(connectorModel);
    if (!connector) {
      throw new Error(`Failed to instantiate connector with ID ${connectorId}`);
    }

    this.connectors.set(connectorId, connector);
    return connector;
  }

  /**
   * Delete a connector
   */
  async deleteConnector(connectorId: number): Promise<boolean> {
    try {
      // Verify the connector belongs to this user
      const connector = await db
        .select()
        .from(socialConnectors)
        .where(and(
          eq(socialConnectors.id, connectorId),
          eq(socialConnectors.userId, this.userId)
        ))
        .then(rows => rows[0]);

      if (!connector) {
        throw new Error(`Connector with ID ${connectorId} not found or access denied`);
      }

      // Delete from database
      await db
        .delete(socialConnectors)
        .where(eq(socialConnectors.id, connectorId));

      // Remove from memory
      this.connectors.delete(connectorId);

      return true;
    } catch (error) {
      console.error(`Error deleting connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new social media monitor
   */
  async createMonitor(
    name: string,
    description: string | null,
    platforms: string[],
    keywords: string[],
    accounts: string[] | null,
    frequency: number,
    alertThreshold: number | null
  ): Promise<SocialMonitorModel> {
    try {
      const monitor: InsertSocialMonitor = {
        name,
        description,
        userId: this.userId,
        platforms,
        keywords,
        accounts,
        frequency,
        alertThreshold,
        isActive: true
      };

      // Insert into database
      const [createdMonitor] = await db
        .insert(socialMonitors)
        .values(monitor)
        .returning();

      return createdMonitor;
    } catch (error) {
      console.error('Error creating social monitor:', error);
      throw error;
    }
  }

  /**
   * Get all monitors for the user
   */
  async getMonitors() {
    try {
      return await db
        .select()
        .from(socialMonitors)
        .where(eq(socialMonitors.userId, this.userId));
    } catch (error) {
      console.error('Error getting social monitors:', error);
      throw error;
    }
  }

  /**
   * Get a specific monitor
   */
  async getMonitor(monitorId: number) {
    try {
      const [monitor] = await db
        .select()
        .from(socialMonitors)
        .where(and(
          eq(socialMonitors.id, monitorId),
          eq(socialMonitors.userId, this.userId)
        ));

      if (!monitor) {
        throw new Error(`Monitor with ID ${monitorId} not found or access denied`);
      }

      return monitor;
    } catch (error) {
      console.error(`Error getting monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Update a monitor
   */
  async updateMonitor(
    monitorId: number,
    updates: Partial<InsertSocialMonitor>
  ): Promise<SocialMonitorModel> {
    try {
      // Verify the monitor belongs to this user
      const monitor = await this.getMonitor(monitorId);

      // Update in database
      const [updatedMonitor] = await db
        .update(socialMonitors)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(socialMonitors.id, monitorId))
        .returning();

      return updatedMonitor;
    } catch (error) {
      console.error(`Error updating monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a monitor
   */
  async deleteMonitor(monitorId: number): Promise<boolean> {
    try {
      // Verify the monitor belongs to this user
      const monitor = await this.getMonitor(monitorId);

      // Delete from database
      await db
        .delete(socialMonitors)
        .where(eq(socialMonitors.id, monitorId));

      return true;
    } catch (error) {
      console.error(`Error deleting monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitor results
   */
  async getMonitorResults(monitorId: number, limit: number = 100) {
    try {
      // Verify the monitor belongs to this user
      const monitor = await this.getMonitor(monitorId);

      // Get results
      return await db
        .select()
        .from(monitorResults)
        .where(eq(monitorResults.monitorId, monitorId))
        .orderBy(desc(monitorResults.timestamp))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting results for monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitor alerts
   */
  async getMonitorAlerts(monitorId: number, limit: number = 100) {
    try {
      // Verify the monitor belongs to this user
      const monitor = await this.getMonitor(monitorId);

      // Get alerts
      return await db
        .select()
        .from(socialAlerts)
        .where(eq(socialAlerts.monitorId, monitorId))
        .orderBy(desc(socialAlerts.timestamp))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting alerts for monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Mark an alert as read
   */
  async markAlertRead(alertId: number): Promise<boolean> {
    try {
      // Get the alert to verify it belongs to a monitor owned by this user
      const [alert] = await db
        .select({
          alert: socialAlerts,
          monitor: socialMonitors
        })
        .from(socialAlerts)
        .innerJoin(
          socialMonitors,
          eq(socialAlerts.monitorId, socialMonitors.id)
        )
        .where(and(
          eq(socialAlerts.id, alertId),
          eq(socialMonitors.userId, this.userId)
        ));

      if (!alert) {
        throw new Error(`Alert with ID ${alertId} not found or access denied`);
      }

      // Update the alert
      await db
        .update(socialAlerts)
        .set({ isRead: true })
        .where(eq(socialAlerts.id, alertId));

      return true;
    } catch (error) {
      console.error(`Error marking alert ${alertId} as read:`, error);
      throw error;
    }
  }

  /**
   * Search across all platforms
   */
  async search(options: SearchOptions): Promise<Post[]> {
    try {
      const connectors = await this.getConnectors();
      const allResults: Post[] = [];

      // Execute search on each platform
      for (const connector of connectors) {
        try {
          const connectorInstance = await this.getConnector(connector.id);
          const results = await connectorInstance.search(options);
          allResults.push(...results);
        } catch (error) {
          console.error(`Error searching with connector ${connector.id}:`, error);
          // Continue with other connectors
        }
      }

      return allResults;
    } catch (error) {
      console.error('Error searching across platforms:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment on text
   */
  async analyzeSentiment(text: string): Promise<{
    positive: number,
    neutral: number,
    negative: number,
    compound: number
  }> {
    try {
      // TODO: Implement using Anthropic or other sentiment analysis API
      // Placeholder implementation
      return {
        positive: Math.random(),
        neutral: Math.random(),
        negative: Math.random(),
        compound: Math.random() * 2 - 1 // Between -1 and 1
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw error;
    }
  }

  private async loadConnector(connectorModel: SocialConnectorModel): Promise<BaseSocialConnector> {
    let connector: BaseSocialConnector;
    
    try {
      const config = {
        ...connectorModel.credentials as any,
        name: connectorModel.name
      };
      
      // Create the appropriate connector type based on platform
      switch (connectorModel.platform) {
        case 'twitter':
        case 'x':
          connector = new TwitterConnector(this.userId, config, connectorModel.id);
          break;
        case 'linkedin':
          connector = new LinkedInConnector(this.userId, config, connectorModel.id);
          break;
        case 'facebook':
          connector = new FacebookConnector(this.userId, config, connectorModel.id);
          break;
        default:
          throw new Error(`Unsupported platform: ${connectorModel.platform}`);
      }
      
      return connector;
    } catch (error) {
      console.error(`Error loading connector ${connectorModel.id}:`, error);
      throw error;
    }
  }

  /**
   * Start monitoring on all platforms for a monitor
   */
  private async startMonitoringPlatforms(
    monitorId: number,
    options: MonitorOptions
  ): Promise<void> {
    const runId = uuidv4();
    let posts: Post[] = [];
    let postCount = 0;
    let mentionCount = 0;
    
    try {
      const monitor = await this.getMonitor(monitorId);
      
      // Get all connectors for specified platforms
      const connectors = await db
        .select()
        .from(socialConnectors)
        .where(and(
          eq(socialConnectors.userId, this.userId),
          eq(socialConnectors.isActive, true)
        ));
      
      const relevantConnectors = connectors.filter(c => 
        (monitor.platforms as string[]).includes(c.platform)
      );
      
      // Search on each platform
      for (const connector of relevantConnectors) {
        try {
          const connectorInstance = await this.getConnector(connector.id);
          const results = await connectorInstance.search({
            keywords: monitor.keywords as string[],
            limit: 100,
            // Add other search options as needed
          });
          
          posts = [...posts, ...results];
          postCount += results.length;
          
          // Count mentions (posts that mention the specific accounts we're monitoring)
          if (monitor.accounts) {
            const accountMentions = results.filter(post => 
              (monitor.accounts as string[]).some(account => 
                post.content.toLowerCase().includes(account.toLowerCase())
              )
            );
            mentionCount += accountMentions.length;
          }
        } catch (error) {
          console.error(`Error monitoring with connector ${connector.id}:`, error);
          // Continue with other connectors
        }
      }
      
      // Analyze the posts and save results
      const analyzedPosts = await this.analyzePosts(posts, monitor.keywords as string[]);
      
      // Save the results
      await this.saveMonitorResults(monitorId, runId, analyzedPosts, postCount, mentionCount);
      
      // Generate alerts for high-relevance posts
      if (monitor.alertThreshold) {
        await this.generateAlerts(monitorId, analyzedPosts, monitor.alertThreshold);
      }
      
      // Update the monitor's last run time
      await db
        .update(socialMonitors)
        .set({ 
          lastRunAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(socialMonitors.id, monitorId));
        
    } catch (error) {
      console.error(`Error in monitoring platforms for monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze posts for keyword matches and sentiment
   */
  private async analyzePosts(posts: Post[], keywords: string[]): Promise<AnalyzedPost[]> {
    return await Promise.all(posts.map(async post => {
      // Find keyword matches
      const keywordMatches = keywords.filter(keyword => 
        post.content.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Calculate a simple relevance score based on keyword count
      const relevanceScore = Math.min(100, (keywordMatches.length / keywords.length) * 100);
      
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(post.content);
      
      return {
        ...post,
        keywordMatches,
        relevanceScore,
        sentiment
      };
    }));
  }

  /**
   * Save monitor results to database
   */
  async saveMonitorResults(
    monitorId: number,
    runId: string,
    analyzedPosts: AnalyzedPost[],
    postCount: number,
    mentionCount: number
  ): Promise<MonitorResult> {
    try {
      // Calculate keyword match counts
      const keywordMatchCounts = analyzedPosts.reduce((acc: Record<string, number>, post) => {
        post.keywordMatches.forEach(keyword => {
          acc[keyword] = (acc[keyword] || 0) + 1;
        });
        return acc;
      }, {});
      
      // Calculate average sentiment
      const totalSentiment = analyzedPosts.reduce(
        (acc, post) => {
          acc.positive += post.sentiment.positive;
          acc.neutral += post.sentiment.neutral;
          acc.negative += post.sentiment.negative;
          acc.compound += post.sentiment.compound;
          return acc;
        }, 
        { positive: 0, neutral: 0, negative: 0, compound: 0 }
      );
      
      const avgSentiment = {
        positive: analyzedPosts.length ? totalSentiment.positive / analyzedPosts.length : 0,
        neutral: analyzedPosts.length ? totalSentiment.neutral / analyzedPosts.length : 0,
        negative: analyzedPosts.length ? totalSentiment.negative / analyzedPosts.length : 0,
        compound: analyzedPosts.length ? totalSentiment.compound / analyzedPosts.length : 0
      };
      
      const result: InsertMonitorResult = {
        monitorId,
        runId,
        postCount,
        mentionCount,
        keywordMatches: keywordMatchCounts,
        sentimentAnalysis: avgSentiment,
        data: analyzedPosts
      };
      
      // Insert into database
      const [savedResult] = await db
        .insert(monitorResults)
        .values(result)
        .returning();
        
      return savedResult;
    } catch (error) {
      console.error(`Error saving monitor results for monitor ${monitorId}:`, error);
      throw error;
    }
  }

  /**
   * Generate alerts for high-relevance posts
   */
  private async generateAlerts(
    monitorId: number,
    analyzedPosts: AnalyzedPost[],
    threshold: number
  ): Promise<void> {
    try {
      // Filter to posts with relevance score above threshold
      const highRelevancePosts = analyzedPosts.filter(post => 
        post.relevanceScore >= threshold
      );
      
      // Create alerts for each high-relevance post
      for (const post of highRelevancePosts) {
        const alert: InsertSocialAlert = {
          monitorId,
          platform: post.platform,
          content: post.content,
          url: post.url,
          keywords: post.keywordMatches,
          score: Math.round(post.relevanceScore),
          metadata: post.metadata,
          isRead: false
        };
        
        await db
          .insert(socialAlerts)
          .values(alert);
      }
    } catch (error) {
      console.error(`Error generating alerts for monitor ${monitorId}:`, error);
      throw error;
    }
  }
}