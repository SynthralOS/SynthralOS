/**
 * Context7 Memory System
 * 
 * Fast, low-latency memory system optimized for keeping conversation 
 * context and recently accessed information.
 */

import { BaseMemory, MemoryConfig, MemoryEntry, MemorySearchResult } from './BaseMemory';
import { MemoryType } from '@shared/schema';
import { db } from '../../db';
import { memorySystems, memoryEntries } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '../../utils';

export interface Context7Config extends MemoryConfig {
  maxContextSize?: number;        // Maximum size of context window in characters
  compressionThreshold?: number;  // When to compress memories (character count)
  recentItemsWeight?: number;     // Weight for recency in retrieval (0-1)
}

export class Context7Memory extends BaseMemory {
  private memoryStore: Map<string, MemoryEntry>;
  private systemId: number | null = null;
  private config: Context7Config;
  
  constructor(
    userId: number,
    name: string,
    config: Context7Config = {}
  ) {
    super(MemoryType.Context7, userId, name, config);
    this.memoryStore = new Map<string, MemoryEntry>();
    this.config = {
      maxContextSize: 16000,
      compressionThreshold: 32000,
      recentItemsWeight: 0.7,
      ...config
    };
  }

  /**
   * Initialize memory system from database
   * Creates system in DB if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Check if system exists
      const existingSystem = await db.select()
        .from(memorySystems)
        .where(and(
          eq(memorySystems.userId, this.userId),
          eq(memorySystems.name, this.name),
          eq(memorySystems.type, MemoryType.Context7)
        ))
        .limit(1);
      
      if (existingSystem.length > 0) {
        this.systemId = existingSystem[0].id;
        
        // Update config if needed
        if (JSON.stringify(existingSystem[0].config) !== JSON.stringify(this.config)) {
          await db.update(memorySystems)
            .set({ 
              config: this.config as any,
              updatedAt: new Date()
            })
            .where(eq(memorySystems.id, this.systemId));
        }
        
        // Load memories
        const memories = await db.select()
          .from(memoryEntries)
          .where(eq(memoryEntries.systemId, this.systemId))
          .orderBy(desc(memoryEntries.lastAccessed));
        
        // Add to in-memory store
        memories.forEach(mem => {
          this.memoryStore.set(mem.entryKey, {
            key: mem.entryKey,
            content: mem.content,
            metadata: mem.metadata as Record<string, any>,
            importance: mem.importance || 0.5,
            timestamp: mem.createdAt,
            lastAccessed: mem.lastAccessed || undefined,
            accessCount: mem.accessCount || 0,
            expires: mem.expires || undefined
          });
        });
        
        // Update metrics
        this.metrics.cacheSize = this.memoryStore.size;
      } else {
        // Create new memory system
        const [newSystem] = await db.insert(memorySystems)
          .values({
            userId: this.userId,
            name: this.name,
            type: MemoryType.Context7,
            description: 'Fast, low-latency memory system',
            config: this.config as any,
            isActive: true,
            isDefault: false,
            metrics: this.metrics as any,
          })
          .returning();
        
        this.systemId = newSystem.id;
      }
    } catch (error) {
      console.error('Error initializing Context7 memory:', error);
      throw new Error('Failed to initialize memory system');
    }
  }

  /**
   * Store a new memory
   */
  async addMemory(entry: MemoryEntry): Promise<void> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    try {
      // Generate key if not provided
      if (!entry.key) {
        entry.key = `mem_${generateId(10)}`;
      }
      
      // Set timestamp if not provided
      if (!entry.timestamp) {
        entry.timestamp = new Date();
      }
      
      // Store in memory
      this.memoryStore.set(entry.key, {
        ...entry,
        lastAccessed: new Date(),
        accessCount: 0
      });
      
      // Store in database
      await db.insert(memoryEntries)
        .values({
          systemId: this.systemId!,
          entryKey: entry.key,
          content: entry.content,
          metadata: entry.metadata || {},
          importance: entry.importance || 0.5,
          lastAccessed: entry.lastAccessed || new Date(),
          accessCount: entry.accessCount || 0,
          expires: entry.expires,
        });
      
      // Update metrics
      const endTime = Date.now();
      this.metrics.insertionLatency = endTime - startTime;
      this.metrics.cacheSize = this.memoryStore.size;
      
      // Check if we need to prune older memories
      if (this.memoryStore.size > this.config.maxItems!) {
        await this.pruneMemories();
      }
    } catch (error) {
      console.error('Error adding memory:', error);
      throw new Error('Failed to add memory');
    }
  }

  /**
   * Retrieve a specific memory by key
   */
  async getMemory(key: string): Promise<MemoryEntry | null> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    try {
      // First check in-memory cache
      if (this.memoryStore.has(key)) {
        const memory = this.memoryStore.get(key)!;
        
        // Update access stats
        memory.lastAccessed = new Date();
        memory.accessCount = (memory.accessCount || 0) + 1;
        this.memoryStore.set(key, memory);
        
        // Update in database (async, don't await)
        db.update(memoryEntries)
          .set({
            lastAccessed: memory.lastAccessed,
            accessCount: memory.accessCount,
          })
          .where(and(
            eq(memoryEntries.systemId, this.systemId!),
            eq(memoryEntries.entryKey, key)
          ))
          .execute()
          .catch(err => console.error('Error updating memory access stats:', err));
        
        // Update metrics
        const endTime = Date.now();
        this.metrics.retrievalLatency = endTime - startTime;
        this.metrics.hitRate = ((this.metrics.hitRate || 0) * 0.9) + 0.1; // Weighted average
        
        return memory;
      }
      
      // Not found in memory, try database
      const dbMemory = await db.select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.systemId, this.systemId!),
          eq(memoryEntries.entryKey, key)
        ))
        .limit(1);
      
      if (dbMemory.length > 0) {
        const mem = dbMemory[0];
        
        // Update access stats
        const now = new Date();
        const accessCount = (mem.accessCount || 0) + 1;
        
        await db.update(memoryEntries)
          .set({
            lastAccessed: now,
            accessCount: accessCount,
          })
          .where(eq(memoryEntries.id, mem.id));
        
        // Add to in-memory cache
        const memoryEntry: MemoryEntry = {
          key: mem.entryKey,
          content: mem.content,
          metadata: mem.metadata as Record<string, any>,
          importance: mem.importance || 0.5,
          timestamp: mem.createdAt,
          lastAccessed: now,
          accessCount: accessCount,
          expires: mem.expires || undefined
        };
        
        this.memoryStore.set(key, memoryEntry);
        
        // Update metrics
        const endTime = Date.now();
        this.metrics.retrievalLatency = endTime - startTime;
        this.metrics.hitRate = ((this.metrics.hitRate || 0) * 0.9) + 0.1; // Weighted average
        this.metrics.cacheSize = this.memoryStore.size;
        
        return memoryEntry;
      }
      
      // Memory not found
      this.metrics.hitRate = ((this.metrics.hitRate || 0) * 0.9); // Weighted average, miss
      return null;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      throw new Error('Failed to retrieve memory');
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(key: string, updates: Partial<MemoryEntry>): Promise<void> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    try {
      // First check if memory exists
      const existing = await this.getMemory(key);
      if (!existing) {
        throw new Error(`Memory with key ${key} not found`);
      }
      
      // Update in memory
      const updated = {
        ...existing,
        ...updates,
        key // Ensure key isn't changed
      };
      
      this.memoryStore.set(key, updated);
      
      // Update in database
      await db.update(memoryEntries)
        .set({
          content: updated.content,
          metadata: updated.metadata || {},
          importance: updated.importance || 0.5,
          lastAccessed: new Date(),
          expires: updated.expires,
          updatedAt: new Date()
        })
        .where(and(
          eq(memoryEntries.systemId, this.systemId!),
          eq(memoryEntries.entryKey, key)
        ));
    } catch (error) {
      console.error('Error updating memory:', error);
      throw new Error('Failed to update memory');
    }
  }

  /**
   * Remove a memory
   */
  async removeMemory(key: string): Promise<void> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    try {
      // Remove from memory
      this.memoryStore.delete(key);
      
      // Remove from database
      await db.delete(memoryEntries)
        .where(and(
          eq(memoryEntries.systemId, this.systemId!),
          eq(memoryEntries.entryKey, key)
        ));
      
      // Update metrics
      this.metrics.cacheSize = this.memoryStore.size;
    } catch (error) {
      console.error('Error removing memory:', error);
      throw new Error('Failed to remove memory');
    }
  }

  /**
   * Find memories that are relevant to the given query
   * Simple implementation for Context7 prioritizes recency and importance
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    try {
      // For Context7, we do a simple keyword search prioritizing recency
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      
      if (queryTerms.length === 0) {
        return this.getMostRecentMemories(limit);
      }
      
      const results: MemorySearchResult[] = [];
      
      // Search in-memory first for faster results
      for (const memory of this.memoryStore.values()) {
        const content = memory.content.toLowerCase();
        
        // Calculate match score based on:
        // 1. Term frequency
        // 2. Recency
        // 3. Importance
        let matchScore = 0;
        
        // Term frequency
        for (const term of queryTerms) {
          if (content.includes(term)) {
            matchScore += 1;
            
            // Bonus for title match (if metadata has title)
            if (memory.metadata?.title?.toLowerCase().includes(term)) {
              matchScore += 0.5;
            }
          }
        }
        
        if (matchScore > 0) {
          // Normalize term score
          matchScore = matchScore / queryTerms.length;
          
          // Factor in recency (if lastAccessed exists)
          if (memory.lastAccessed) {
            const ageInHours = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60);
            const recencyScore = Math.max(0, 1 - (ageInHours / (24 * 7))); // Decay over a week
            matchScore = (matchScore * (1 - this.config.recentItemsWeight!)) + 
                         (recencyScore * this.config.recentItemsWeight!);
          }
          
          // Factor in importance
          matchScore = matchScore * (memory.importance || 0.5);
          
          results.push({
            entry: memory,
            score: matchScore
          });
        }
      }
      
      // Sort by score and take top N
      const topResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // If we don't have enough results, we could search the database directly
      // for memories that weren't loaded in-memory, but that's for a future optimization
      
      // Update metrics
      const endTime = Date.now();
      this.metrics.retrievalLatency = endTime - startTime;
      
      return topResults;
    } catch (error) {
      console.error('Error searching memories:', error);
      throw new Error('Failed to search memories');
    }
  }

  /**
   * Get most recently accessed memories (fallback for empty queries)
   */
  private async getMostRecentMemories(limit: number): Promise<MemorySearchResult[]> {
    // Sort memory store by lastAccessed
    const sortedMemories = Array.from(this.memoryStore.values())
      .filter(m => m.lastAccessed) // Only include memories with lastAccessed
      .sort((a, b) => {
        const aTime = a.lastAccessed!.getTime();
        const bTime = b.lastAccessed!.getTime();
        return bTime - aTime; // Sort descending (newest first)
      })
      .slice(0, limit);
    
    // Convert to search results
    return sortedMemories.map(memory => {
      // Calculate recency score (1.0 for newest, decreasing for older)
      const ageInHours = (Date.now() - memory.lastAccessed!.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 1 - (ageInHours / (24 * 7))); // Decay over a week
      
      return {
        entry: memory,
        score: recencyScore
      };
    });
  }

  /**
   * Remove oldest, least important, or expired memories
   */
  private async pruneMemories(): Promise<void> {
    try {
      // First, clear any expired memories
      const now = new Date();
      const expiredKeys: string[] = [];
      
      for (const [key, memory] of this.memoryStore.entries()) {
        if (memory.expires && memory.expires < now) {
          expiredKeys.push(key);
        }
      }
      
      // Remove expired memories
      for (const key of expiredKeys) {
        await this.removeMemory(key);
      }
      
      // If we're still over the limit, remove oldest and least important
      if (this.memoryStore.size > this.config.maxItems!) {
        // Calculate score based on recency and importance
        const memoriesWithScore = Array.from(this.memoryStore.entries())
          .map(([key, memory]) => {
            let score = memory.importance || 0.5;
            
            // Factor in recency (if lastAccessed exists)
            if (memory.lastAccessed) {
              const ageInHours = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60);
              const recencyScore = Math.max(0, 1 - (ageInHours / (24 * 7))); // Decay over a week
              score = score * 0.7 + recencyScore * 0.3; // Weight importance higher
            }
            
            return { key, score };
          })
          .sort((a, b) => a.score - b.score); // Sort ascending (lowest score first)
        
        // Remove memories until we're under the limit
        const memoriesToRemove = memoriesWithScore.slice(0, this.memoryStore.size - this.config.maxItems!);
        
        for (const { key } of memoriesToRemove) {
          await this.removeMemory(key);
        }
      }
    } catch (error) {
      console.error('Error pruning memories:', error);
    }
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    try {
      // Clear memory store
      this.memoryStore.clear();
      
      // Clear from database
      await db.delete(memoryEntries)
        .where(eq(memoryEntries.systemId, this.systemId!));
      
      // Update metrics
      this.metrics.cacheSize = 0;
    } catch (error) {
      console.error('Error clearing memories:', error);
      throw new Error('Failed to clear memories');
    }
  }
}