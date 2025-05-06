/**
 * Mem0 Memory System
 * 
 * Structured memory system for agents with schema-enforced memory storage,
 * automatic entity recognition, and relationship tracking.
 */

import { BaseMemory, MemoryConfig, MemoryEntry, MemorySearchResult } from './BaseMemory';
import { MemoryType } from '@shared/schema';
import { db } from '../../db';
import { memorySystems, memoryEntries } from '@shared/schema';
import { eq, and, desc, or, like } from 'drizzle-orm';
import { generateId } from '../../utils';
import OpenAI from 'openai';

// Ensure we have access to OpenAI for entity extraction
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EntityReference {
  type: string;         // Type of entity (person, organization, concept, etc.)
  name: string;         // Name of the entity
  id?: string;          // Optional reference ID
  importance: number;   // Importance score (0-1)
  firstOccurrence?: Date; // When this entity was first mentioned
  attributes?: Record<string, any>; // Additional entity attributes
}

export interface Mem0MemoryMetadata {
  entities?: EntityReference[];  // Extracted entities
  tags?: string[];               // Manual or auto-generated tags
  sentiment?: number;            // Sentiment score (-1 to 1)
  relations?: Array<{            // Relationships between entities
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
  [key: string]: any;            // Additional metadata
}

export interface Mem0Config extends MemoryConfig {
  extractEntities?: boolean;     // Whether to extract entities automatically
  extractTags?: boolean;         // Whether to extract tags automatically
  extractSentiment?: boolean;    // Whether to extract sentiment automatically
  relationThreshold?: number;    // Minimum confidence for relation extraction
  maxEntities?: number;          // Maximum entities to extract per memory
}

export class Mem0Memory extends BaseMemory {
  private memoryStore: Map<string, MemoryEntry>;
  private systemId: number | null = null;
  private config: Mem0Config;
  
  constructor(
    userId: number,
    name: string,
    config: Mem0Config = {}
  ) {
    super(MemoryType.Mem0, userId, name, config);
    this.memoryStore = new Map<string, MemoryEntry>();
    this.config = {
      extractEntities: true,
      extractTags: true,
      extractSentiment: true,
      relationThreshold: 0.6,
      maxEntities: 10,
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
          eq(memorySystems.type, MemoryType.Mem0)
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
            type: MemoryType.Mem0,
            description: 'Structured memory system with entity recognition',
            config: this.config as any,
            isActive: true,
            isDefault: false,
            metrics: this.metrics as any,
          })
          .returning();
        
        this.systemId = newSystem.id;
      }
    } catch (error) {
      console.error('Error initializing Mem0 memory:', error);
      throw new Error('Failed to initialize memory system');
    }
  }

  /**
   * Store a new memory with structured metadata
   */
  async addMemory(entry: MemoryEntry): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }

      // Generate key if not provided
      const key = entry.key || `mem-${generateId()}`;
      
      // Ensure we have the right metadata structure
      const metadata = entry.metadata || {};
      
      // Perform entity extraction if configured
      if (this.config.extractEntities && entry.content) {
        const entities = await this.extractEntities(entry.content);
        metadata.entities = entities;
      }
      
      // Extract tags if configured
      if (this.config.extractTags && entry.content) {
        const tags = await this.extractTags(entry.content);
        metadata.tags = tags;
      }
      
      // Extract sentiment if configured
      if (this.config.extractSentiment && entry.content) {
        const sentiment = await this.analyzeSentiment(entry.content);
        metadata.sentiment = sentiment;
      }
      
      // Create the memory entry
      const memoryEntry: MemoryEntry = {
        key,
        content: entry.content,
        metadata,
        importance: entry.importance || 0.5,
        timestamp: entry.timestamp || new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        expires: entry.expires
      };
      
      // Add to in-memory store
      this.memoryStore.set(key, memoryEntry);
      
      // Add to database
      await db.insert(memoryEntries)
        .values({
          systemId: this.systemId!,
          entryKey: key,
          content: entry.content,
          metadata: metadata as any,
          importance: entry.importance || 0.5,
          accessCount: 0,
          createdAt: entry.timestamp || new Date(),
          lastAccessed: new Date(),
          expires: entry.expires
        });
      
      // Update metrics
      this.metrics.cacheSize = this.memoryStore.size;
      
      // Track insertion latency
      this.metrics.insertionLatency = this.metrics.insertionLatency 
        ? (this.metrics.insertionLatency + performance.now() - (entry.timestamp?.getTime() || Date.now())) / 2
        : performance.now() - (entry.timestamp?.getTime() || Date.now());
    } catch (error) {
      console.error('Error adding memory to Mem0:', error);
      throw new Error('Failed to add memory');
    }
  }

  /**
   * Retrieve a specific memory by key
   */
  async getMemory(key: string): Promise<MemoryEntry | null> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      const startTime = performance.now();
      
      // Try to get from in-memory cache first
      let memory = this.memoryStore.get(key);
      
      // If not in memory, try database
      if (!memory) {
        const dbMemory = await db.select()
          .from(memoryEntries)
          .where(
            and(
              eq(memoryEntries.systemId, this.systemId!),
              eq(memoryEntries.entryKey, key)
            )
          )
          .limit(1);
        
        if (dbMemory.length > 0) {
          memory = {
            key: dbMemory[0].entryKey,
            content: dbMemory[0].content,
            metadata: dbMemory[0].metadata as Record<string, any>,
            importance: dbMemory[0].importance || 0.5,
            timestamp: dbMemory[0].createdAt,
            lastAccessed: dbMemory[0].lastAccessed || undefined,
            accessCount: dbMemory[0].accessCount || 0,
            expires: dbMemory[0].expires || undefined
          };
          
          // Add to in-memory store
          this.memoryStore.set(key, memory);
        } else {
          // Track hit rate
          this.metrics.hitRate = this.metrics.hitRate !== undefined
            ? (this.metrics.hitRate * (this.metrics.totalQueries || 0)) / ((this.metrics.totalQueries || 0) + 1)
            : 0;
          
          this.metrics.totalQueries = (this.metrics.totalQueries || 0) + 1;
          
          return null;
        }
      }
      
      // Update access information
      const now = new Date();
      const accessCount = (memory.accessCount || 0) + 1;
      
      // Update in memory
      memory.lastAccessed = now;
      memory.accessCount = accessCount;
      
      // Update in database
      await db.update(memoryEntries)
        .set({
          lastAccessed: now,
          accessCount
        })
        .where(
          and(
            eq(memoryEntries.systemId, this.systemId!),
            eq(memoryEntries.entryKey, key)
          )
        );
      
      // Track metrics
      const endTime = performance.now();
      this.metrics.retrievalLatency = this.metrics.retrievalLatency
        ? (this.metrics.retrievalLatency + (endTime - startTime)) / 2
        : endTime - startTime;
      
      this.metrics.hitRate = this.metrics.hitRate !== undefined
        ? (this.metrics.hitRate * (this.metrics.totalQueries || 0) + 1) / ((this.metrics.totalQueries || 0) + 1)
        : 1;
      
      this.metrics.totalQueries = (this.metrics.totalQueries || 0) + 1;
      
      return memory;
    } catch (error) {
      console.error('Error retrieving memory from Mem0:', error);
      throw new Error('Failed to retrieve memory');
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(key: string, update: Partial<MemoryEntry>): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Retrieve existing memory
      const existing = await this.getMemory(key);
      if (!existing) {
        throw new Error(`Memory with key ${key} not found`);
      }
      
      // Apply updates
      const updated: MemoryEntry = {
        ...existing,
        ...update,
        key,  // Ensure key remains the same
      };
      
      if (update.content && this.config.extractEntities) {
        const entities = await this.extractEntities(update.content);
        updated.metadata = {
          ...updated.metadata,
          entities
        };
      }
      
      if (update.content && this.config.extractTags) {
        const tags = await this.extractTags(update.content);
        updated.metadata = {
          ...updated.metadata,
          tags
        };
      }
      
      if (update.content && this.config.extractSentiment) {
        const sentiment = await this.analyzeSentiment(update.content);
        updated.metadata = {
          ...updated.metadata,
          sentiment
        };
      }
      
      // Update in memory
      this.memoryStore.set(key, updated);
      
      // Update in database
      await db.update(memoryEntries)
        .set({
          content: updated.content,
          metadata: updated.metadata as any,
          importance: updated.importance,
          updatedAt: new Date(),
          expires: updated.expires
        })
        .where(
          and(
            eq(memoryEntries.systemId, this.systemId!),
            eq(memoryEntries.entryKey, key)
          )
        );
    } catch (error) {
      console.error('Error updating memory in Mem0:', error);
      throw new Error('Failed to update memory');
    }
  }

  /**
   * Remove a memory
   */
  async removeMemory(key: string): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Remove from in-memory store
      this.memoryStore.delete(key);
      
      // Remove from database
      await db.delete(memoryEntries)
        .where(
          and(
            eq(memoryEntries.systemId, this.systemId!),
            eq(memoryEntries.entryKey, key)
          )
        );
      
      // Update metrics
      this.metrics.cacheSize = this.memoryStore.size;
    } catch (error) {
      console.error('Error removing memory from Mem0:', error);
      throw new Error('Failed to remove memory');
    }
  }

  /**
   * Find memories that are relevant to the given query
   * Uses a hybrid approach with entity matching and keyword matching
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      // Extract entities from the query
      const queryEntities = await this.extractEntities(query);
      
      // First find memories with matching entities
      const results: Map<string, MemorySearchResult> = new Map();
      const entityNames = queryEntities.map(e => e.name.toLowerCase());
      
      // Search in memory entries for entity matches
      for (const [key, memory] of this.memoryStore.entries()) {
        const memoryEntities = memory.metadata?.entities || [];
        
        // Calculate entity match score
        let entityMatchScore = 0;
        for (const entity of memoryEntities) {
          if (entityNames.includes(entity.name?.toLowerCase())) {
            entityMatchScore += (entity.importance || 0.5);
          }
        }
        
        if (entityMatchScore > 0) {
          results.set(key, {
            memory,
            score: entityMatchScore
          });
        }
      }
      
      // Fallback to keyword search if entity search didn't yield enough results
      if (results.size < limit) {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        
        for (const [key, memory] of this.memoryStore.entries()) {
          // Skip if already in results
          if (results.has(key)) continue;
          
          const content = memory.content.toLowerCase();
          
          // Calculate keyword match score
          let matchScore = 0;
          for (const term of queryTerms) {
            if (content.includes(term)) {
              matchScore += 0.2;  // Lower weight for keyword matches vs entity matches
            }
          }
          
          if (matchScore > 0) {
            results.set(key, {
              memory,
              score: matchScore
            });
          }
        }
      }
      
      // Apply recency boost
      const now = Date.now();
      for (const result of results.values()) {
        const memory = result.memory;
        const age = now - (memory.timestamp?.getTime() || 0);
        const recencyBoost = Math.max(0, 1 - (age / (30 * 24 * 60 * 60 * 1000))); // 30 days horizon
        
        // Apply importance and recency to final score
        result.score = result.score * (memory.importance || 0.5) * (0.7 + 0.3 * recencyBoost);
      }
      
      // Sort by score and limit
      const sortedResults = Array.from(results.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // Update access information for retrieved memories
      for (const result of sortedResults) {
        const memory = result.memory;
        memory.lastAccessed = new Date();
        memory.accessCount = (memory.accessCount || 0) + 1;
        
        await db.update(memoryEntries)
          .set({
            lastAccessed: memory.lastAccessed,
            accessCount: memory.accessCount
          })
          .where(
            and(
              eq(memoryEntries.systemId, this.systemId!),
              eq(memoryEntries.entryKey, memory.key)
            )
          );
      }
      
      // Track metrics
      const endTime = performance.now();
      this.metrics.retrievalLatency = this.metrics.retrievalLatency
        ? (this.metrics.retrievalLatency + (endTime - startTime)) / 2
        : endTime - startTime;
      
      return sortedResults;
    } catch (error) {
      console.error('Error searching memories in Mem0:', error);
      
      // Fallback to simple keyword match
      return this.simpleKeywordSearch(query, limit);
    }
  }

  /**
   * Simple keyword search fallback if entity extraction fails
   */
  private async simpleKeywordSearch(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const results: Map<string, MemorySearchResult> = new Map();
    
    for (const [key, memory] of this.memoryStore.entries()) {
      const content = memory.content.toLowerCase();
      
      // Calculate keyword match score
      let matchScore = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) {
          matchScore += 1;
        }
      }
      
      if (matchScore > 0) {
        results.set(key, {
          memory,
          score: matchScore * (memory.importance || 0.5)
        });
      }
    }
    
    // Sort by score and limit
    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Clear in-memory store
      this.memoryStore.clear();
      
      // Clear from database
      await db.delete(memoryEntries)
        .where(eq(memoryEntries.systemId, this.systemId!));
      
      // Update metrics
      this.metrics.cacheSize = 0;
    } catch (error) {
      console.error('Error clearing Mem0 memory:', error);
      throw new Error('Failed to clear memory');
    }
  }

  /**
   * Extract entities from text using OpenAI
   */
  private async extractEntities(text: string): Promise<EntityReference[]> {
    if (!process.env.OPENAI_API_KEY) {
      // Return empty array if no API key is available
      return [];
    }
    
    try {
      const trimmedText = text.slice(0, 4000); // Limit to avoid token issues
      
      const prompt = `
        Extract key entities from the following text. For each entity, provide:
        1. Type (person, organization, concept, location, etc.)
        2. Name (the entity's name)
        3. Importance (a number from 0 to 1 indicating relevance to the text)
        
        Return as JSON array with fields: type, name, importance.
        Only return the JSON array, nothing else.
        
        Text: ${trimmedText}
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      try {
        const parsed = JSON.parse(content);
        const entities = parsed.entities || [];
        
        // Ensure correct structure and limit count
        return entities
          .filter((e: any) => e.name && e.type)
          .slice(0, this.config.maxEntities || 10)
          .map((e: any) => ({
            type: e.type,
            name: e.name,
            importance: e.importance || 0.5,
            firstOccurrence: new Date()
          }));
      } catch (parseError) {
        console.error('Error parsing entity extraction response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Extract tags from text using OpenAI
   */
  private async extractTags(text: string): Promise<string[]> {
    if (!process.env.OPENAI_API_KEY) {
      // Return empty array if no API key is available
      return [];
    }
    
    try {
      const trimmedText = text.slice(0, 4000); // Limit to avoid token issues
      
      const prompt = `
        Generate 3-7 tags for the following text. Tags should be single words or short phrases that capture key topics.
        Return as JSON array of strings.
        Only return the JSON array, nothing else.
        
        Text: ${trimmedText}
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      try {
        const parsed = JSON.parse(content);
        return parsed.tags || [];
      } catch (parseError) {
        console.error('Error parsing tag extraction response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting tags:', error);
      return [];
    }
  }

  /**
   * Analyze sentiment from text using OpenAI
   */
  private async analyzeSentiment(text: string): Promise<number> {
    if (!process.env.OPENAI_API_KEY) {
      // Return neutral sentiment if no API key is available
      return 0;
    }
    
    try {
      const trimmedText = text.slice(0, 4000); // Limit to avoid token issues
      
      const prompt = `
        Analyze the sentiment of the following text on a scale from -1 (very negative) to 1 (very positive).
        Return only a single number representing the sentiment score.
        
        Text: ${trimmedText}
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) return 0;
      
      const score = parseFloat(content.trim());
      return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 0;
    }
  }
}