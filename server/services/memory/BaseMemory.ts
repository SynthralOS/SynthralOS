/**
 * Base Memory System Interface
 * 
 * This is the foundation for all memory systems in SynthralOS.
 * Each specialized memory system must implement this interface.
 */

import { MemoryType } from '@shared/schema';

export interface MemoryConfig {
  windowSize?: number;         // How many items to consider in context window
  decayRate?: number;          // How quickly memories decay (0-1)
  relevanceThreshold?: number; // Threshold for retrieving memories
  ttl?: number;                // Time-to-live in milliseconds for memories
  maxItems?: number;           // Maximum number of memories to store
  [key: string]: any;          // Allow additional custom config options
}

export interface MemoryMetrics {
  retrievalLatency?: number;  // Average latency in ms for retrieval operations
  insertionLatency?: number;  // Average latency in ms for insertion operations
  hitRate?: number;           // Ratio of successful retrievals to total attempts
  cacheSize?: number;         // Current number of items in memory
  [key: string]: any;         // Allow additional custom metrics
}

export interface MemoryEntry {
  key: string;                // Unique identifier for the memory
  content: string;            // The actual content to remember
  metadata?: Record<string, any>; // Additional metadata 
  importance?: number;        // How important this memory is (0-1)
  embedding?: number[];       // Vector embedding if available
  timestamp?: Date;           // When this memory was created
  lastAccessed?: Date;        // When this memory was last accessed
  accessCount?: number;       // How many times this memory has been accessed
  expires?: Date;             // When this memory should expire
}

export interface MemorySearchResult {
  memory: MemoryEntry;        // The memory entry that matched
  score: number;              // Relevance score (0-1)
  context?: {                 // Optional additional context
    relevantNodes?: string[]; // Relevant node content for tree-based memories
    [key: string]: any;       // Allow additional context information
  };
}

export abstract class BaseMemory {
  protected readonly type: MemoryType;
  public config: MemoryConfig;
  protected metrics: MemoryMetrics;
  protected userId: number;
  protected name: string;
  
  constructor(
    type: MemoryType,
    userId: number,
    name: string,
    config: MemoryConfig = {}
  ) {
    this.type = type;
    this.userId = userId;
    this.name = name;
    this.config = {
      windowSize: 10,
      decayRate: 0.05,
      relevanceThreshold: 0.7,
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days by default
      maxItems: 1000,
      ...config
    };
    this.metrics = {
      retrievalLatency: 0,
      insertionLatency: 0,
      hitRate: 0,
      cacheSize: 0
    };
  }

  /**
   * Store a new memory
   */
  abstract addMemory(entry: MemoryEntry): Promise<void>;

  /**
   * Retrieve a specific memory by key
   */
  abstract getMemory(key: string): Promise<MemoryEntry | null>;

  /**
   * Update an existing memory
   */
  abstract updateMemory(key: string, entry: Partial<MemoryEntry>): Promise<void>;

  /**
   * Remove a memory
   */
  abstract removeMemory(key: string): Promise<void>;

  /**
   * Find memories that are relevant to the given query
   */
  abstract searchMemories(query: string, limit?: number): Promise<MemorySearchResult[]>;

  /**
   * Clear all memories
   */
  abstract clear(): Promise<void>;

  /**
   * Get current metrics about the memory system
   */
  getMetrics(): MemoryMetrics {
    return this.metrics;
  }

  /**
   * Update the configuration of the memory system
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
  
  /**
   * Get the memory system's configuration
   */
  getConfig(): MemoryConfig {
    return this.config;
  }
  
  /**
   * Get the memory system's type
   */
  getType(): MemoryType {
    return this.type;
  }
}