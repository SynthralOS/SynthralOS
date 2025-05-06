/**
 * Type definitions for social monitoring components
 */

/**
 * Configuration object for social connectors
 */
export interface SocialConnectorConfig {
  name: string;
  // Authentication tokens/credentials
  accessToken?: string;
  bearerToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  // Other optional configs
  username?: string;
  password?: string;
  [key: string]: any; // Allow for platform-specific config options
}

/**
 * Interface for all social media connectors
 */
export interface SocialConnectorInterface {
  authenticate(): Promise<boolean>;
  isAuthenticated(): Promise<boolean>;
  refreshAuth(): Promise<boolean>;
  search(options: SearchOptions): Promise<Post[]>;
  getUserProfile(username: string): Promise<Record<string, any>>;
  getFollowers(username: string, limit?: number): Promise<string[]>;
  startMonitoring(options: MonitorOptions): Promise<{ monitorId: string }>;
  stopMonitoring(monitorId: string): Promise<boolean>;
  getMonitorResults(monitorId: string): Promise<any[]>;
  getName(): string;
  getPlatform(): string;
}

/**
 * Options for search operations
 */
export interface SearchOptions {
  keywords: string[];
  accounts?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  includeRetweets?: boolean;
  onlyVerified?: boolean;
  language?: string;
  location?: string;
  radius?: number; // For geo-based searches
  sort?: 'recent' | 'popular' | 'relevant';
  [key: string]: any; // Allow for platform-specific search options
}

/**
 * Options for monitoring operations
 */
export interface MonitorOptions {
  keywords: string[];
  accounts?: string[];
  frequency?: number; // How often to check (in minutes)
  alertThreshold?: number; // Threshold for generating alerts (0-100)
  startDate?: Date; 
  endDate?: Date;
  includeRetweets?: boolean;
  language?: string;
  location?: string;
  radius?: number; // For geo-based monitoring
  [key: string]: any; // Allow for platform-specific monitoring options
}

/**
 * Standard post object returned from all platforms
 */
export interface Post {
  id: string;
  platform: string;
  content: string;
  url: string;
  authorId: string;
  authorUsername: string;
  authorName?: string;
  authorVerified?: boolean;
  timestamp: Date;
  engagementCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  metadata: Record<string, any>; // Platform-specific details
}

/**
 * Analyzed post with additional metadata
 */
export interface AnalyzedPost extends Post {
  keywordMatches: string[]; // Which keywords matched
  relevanceScore: number; // Score from 0-100
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    compound: number;
  };
}