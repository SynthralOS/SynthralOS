import { 
  SocialConnectorInterface, 
  SocialConnectorConfig, 
  SearchOptions, 
  Post, 
  MonitorOptions
} from './types';
import { 
  SocialConnector as SocialConnectorModel,
  InsertSocialConnector,
  socialConnectors
} from '@shared/schema';
import { db } from '../../db';
import { eq } from 'drizzle-orm';

/**
 * Base abstract class for all social connectors
 * Implements common functionality and defines the interface
 * for platform-specific implementations
 */
export abstract class BaseSocialConnector implements SocialConnectorInterface {
  protected userId: number;
  protected config: SocialConnectorConfig;
  protected id?: number;
  protected name: string;
  protected platform: string;
  
  constructor(userId: number, config: SocialConnectorConfig, id?: number) {
    this.userId = userId;
    this.config = config;
    this.id = id;
    this.name = config.name || '';
    this.platform = this.getPlatform();
  }
  
  /**
   * Authenticate with the social platform
   * Should be implemented by platform-specific connectors
   */
  abstract authenticate(): Promise<boolean>;
  
  /**
   * Check if the connector is authenticated with the platform
   * Should be implemented by platform-specific connectors
   */
  abstract isAuthenticated(): Promise<boolean>;
  
  /**
   * Refresh authentication if needed
   * Should be implemented by platform-specific connectors
   */
  abstract refreshAuth(): Promise<boolean>;
  
  /**
   * Search for posts/content based on options
   * Should be implemented by platform-specific connectors
   */
  abstract search(options: SearchOptions): Promise<Post[]>;
  
  /**
   * Get user profile from the platform
   * Should be implemented by platform-specific connectors
   */
  abstract getUserProfile(username: string): Promise<Record<string, any>>;
  
  /**
   * Get followers of a user
   * Should be implemented by platform-specific connectors
   */
  abstract getFollowers(username: string, limit?: number): Promise<string[]>;
  
  /**
   * Start monitoring based on options
   * Should be implemented by platform-specific connectors
   */
  abstract startMonitoring(options: MonitorOptions): Promise<{ monitorId: string }>;
  
  /**
   * Stop an active monitoring process
   * Should be implemented by platform-specific connectors
   */
  abstract stopMonitoring(monitorId: string): Promise<boolean>;
  
  /**
   * Get results from a monitoring process
   * Should be implemented by platform-specific connectors
   */
  abstract getMonitorResults(monitorId: string): Promise<any[]>;
  
  /**
   * Get connector name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get platform name
   * Should be overridden by platform-specific connectors
   */
  abstract getPlatform(): string;
  
  /**
   * Save connector to database
   */
  async save(): Promise<SocialConnectorModel> {
    // Sanitize config - remove sensitive data for storage
    const storableConfig = this.getSanitizedConfig();
    
    if (this.id) {
      // Update existing connector
      const [updated] = await db
        .update(socialConnectors)
        .set({
          name: this.name,
          platform: this.platform,
          credentials: storableConfig,
          updatedAt: new Date()
        })
        .where(eq(socialConnectors.id, this.id))
        .returning();
      
      return updated;
    } else {
      // Create new connector
      const [created] = await db
        .insert(socialConnectors)
        .values({
          userId: this.userId,
          name: this.name,
          platform: this.platform,
          credentials: storableConfig,
          isActive: true,
          metadata: {}
        })
        .returning();
      
      this.id = created.id;
      return created;
    }
  }
  
  /**
   * Create a sanitized copy of config for storage
   * Removes sensitive fields that shouldn't be stored directly
   */
  protected getSanitizedConfig(): Record<string, any> {
    const { apiSecret, clientSecret, password, ...safeConfig } = this.config;
    return safeConfig;
  }
  
  /**
   * Get config value safely
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T {
    return (this.config[key] as T) || defaultValue as T;
  }
}