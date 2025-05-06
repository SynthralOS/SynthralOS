/**
 * Zep Memory System
 * 
 * Fuzzy memory fallback system that provides natural language memory search
 * with high recall for cases where structured memory approaches fail.
 */

import { BaseMemory, MemoryConfig, MemoryEntry, MemorySearchResult } from './BaseMemory';
import { MemoryType } from '@shared/schema';
import { db } from '../../db';
import { memorySystems, memoryEntries } from '@shared/schema';
import { eq, and, desc, or, like } from 'drizzle-orm';
import { generateId } from '../../utils';
import OpenAI from 'openai';

// Initialize OpenAI client for semantic search
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ZepConfig extends MemoryConfig {
  useSemanticSearch?: boolean;    // Whether to use semantic (embedding-based) search
  useFuzzyMatching?: boolean;     // Whether to use fuzzy string matching
  maxResults?: number;            // Maximum number of results to return
  minRelevanceScore?: number;     // Minimum relevance score (0-1)
  contextSize?: number;           // Size of context window in tokens
}

export class ZepMemory extends BaseMemory {
  private memoryStore: Map<string, MemoryEntry>;
  private systemId: number | null = null;
  private config: ZepConfig;
  private semanticIndex: Map<string, number[]> = new Map();
  
  constructor(
    userId: number,
    name: string,
    config: ZepConfig = {}
  ) {
    super(MemoryType.Zep, userId, name, config);
    this.memoryStore = new Map<string, MemoryEntry>();
    this.config = {
      useSemanticSearch: true,
      useFuzzyMatching: true,
      maxResults: 10,
      minRelevanceScore: 0.6,
      contextSize: 4000,
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
          eq(memorySystems.type, MemoryType.Zep)
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
          
          // Load embeddings if available
          if (mem.metadata && (mem.metadata as any).embedding) {
            this.semanticIndex.set(mem.entryKey, (mem.metadata as any).embedding);
          }
        });
        
        // Update metrics
        this.metrics.cacheSize = this.memoryStore.size;
      } else {
        // Create new memory system
        const [newSystem] = await db.insert(memorySystems)
          .values({
            userId: this.userId,
            name: this.name,
            type: MemoryType.Zep,
            description: 'Fuzzy memory fallback system',
            config: this.config as any,
            isActive: true,
            isDefault: false,
            metrics: this.metrics as any,
          })
          .returning();
        
        this.systemId = newSystem.id;
      }
    } catch (error) {
      console.error('Error initializing Zep memory:', error);
      throw new Error('Failed to initialize memory system');
    }
  }

  /**
   * Store a new memory
   */
  async addMemory(entry: MemoryEntry): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }

      // Generate key if not provided
      const key = entry.key || `mem-${generateId()}`;
      
      // Generate embedding if semantic search is enabled
      let embedding: number[] | undefined;
      if (this.config.useSemanticSearch) {
        embedding = await this.generateEmbedding(entry.content);
      }
      
      // Prepare metadata
      const metadata = {
        ...entry.metadata || {},
        ...(embedding ? { embedding } : {})
      };
      
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
      
      // Add to semantic index if embedding exists
      if (embedding) {
        this.semanticIndex.set(key, embedding);
      }
      
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
      console.error('Error adding memory to Zep:', error);
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
          
          // Add to semantic index if embedding exists
          if (memory.metadata && memory.metadata.embedding) {
            this.semanticIndex.set(key, memory.metadata.embedding);
          }
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
      console.error('Error retrieving memory from Zep:', error);
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
      
      // Generate new embedding if content changed and semantic search is enabled
      let embedding: number[] | undefined;
      if (update.content && this.config.useSemanticSearch) {
        embedding = await this.generateEmbedding(update.content);
      }
      
      // Prepare updated metadata
      const metadata = {
        ...existing.metadata,
        ...update.metadata || {},
        ...(embedding ? { embedding } : {})
      };
      
      // Apply updates
      const updated: MemoryEntry = {
        ...existing,
        ...update,
        metadata,
        key,  // Ensure key remains the same
      };
      
      // Update in memory
      this.memoryStore.set(key, updated);
      
      // Update semantic index if embedding exists
      if (embedding) {
        this.semanticIndex.set(key, embedding);
      }
      
      // Update in database
      await db.update(memoryEntries)
        .set({
          content: updated.content,
          metadata: metadata as any,
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
      console.error('Error updating memory in Zep:', error);
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
      
      // Remove from semantic index
      this.semanticIndex.delete(key);
      
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
      console.error('Error removing memory from Zep:', error);
      throw new Error('Failed to remove memory');
    }
  }

  /**
   * Find memories that are relevant to the given query
   * Uses a combination of semantic search and fuzzy string matching
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      const results: MemorySearchResult[] = [];
      
      // Use semantic search if enabled
      if (this.config.useSemanticSearch) {
        const semanticResults = await this.semanticSearch(query, limit * 2);
        results.push(...semanticResults);
      }
      
      // Use fuzzy matching if enabled and we need more results
      if (this.config.useFuzzyMatching && results.length < limit) {
        const fuzzyResults = await this.fuzzySearch(
          query, 
          limit * 2, 
          results.map(r => r.memory.key)
        );
        
        // Add fuzzy results that aren't already in semantic results
        const existingKeys = new Set(results.map(r => r.memory.key));
        const newFuzzyResults = fuzzyResults.filter(r => !existingKeys.has(r.memory.key));
        
        results.push(...newFuzzyResults);
      }
      
      // Sort by score, apply minimum relevance threshold, and limit
      const filteredResults = results
        .filter(r => r.score >= this.config.minRelevanceScore!)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // Update access information for retrieved memories
      for (const result of filteredResults) {
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
      
      return filteredResults;
    } catch (error) {
      console.error('Error searching memories in Zep:', error);
      
      // Fall back to simple keyword search
      return this.keywordSearch(query, limit);
    }
  }

  /**
   * Perform semantic search using embeddings
   */
  private async semanticSearch(query: string, limit: number): Promise<MemorySearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarity for each item in semantic index
      const results: MemorySearchResult[] = [];
      
      for (const [key, embedding] of this.semanticIndex.entries()) {
        const memory = this.memoryStore.get(key);
        if (!memory) continue;
        
        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
        
        results.push({
          memory,
          score: similarity
        });
      }
      
      // Sort by similarity and take top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Perform fuzzy search using string matching
   */
  private async fuzzySearch(
    query: string,
    limit: number,
    excludeKeys: string[] = []
  ): Promise<MemorySearchResult[]> {
    const exclude = new Set(excludeKeys);
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const results: MemorySearchResult[] = [];
    
    for (const [key, memory] of this.memoryStore.entries()) {
      if (exclude.has(key)) continue;
      
      const content = memory.content.toLowerCase();
      
      // Calculate fuzzy match score using term frequency
      let score = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) {
          // Count occurrences
          const count = (content.match(new RegExp(term, 'g')) || []).length;
          score += (0.1 * count) / content.length;
          
          // Boost for exact phrase matches
          if (content.includes(query.toLowerCase())) {
            score += 0.3;
          }
        }
      }
      
      // Apply memory importance as a weight
      score *= (memory.importance || 0.5);
      
      if (score > 0) {
        results.push({
          memory,
          score
        });
      }
    }
    
    // Normalize scores to be between 0-1
    const maxScore = Math.max(...results.map(r => r.score), 0.001);
    for (const result of results) {
      result.score = result.score / maxScore;
    }
    
    // Sort and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Simple keyword search as a fallback
   */
  private async keywordSearch(query: string, limit: number): Promise<MemorySearchResult[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const results: MemorySearchResult[] = [];
    
    for (const [key, memory] of this.memoryStore.entries()) {
      const content = memory.content.toLowerCase();
      
      let matches = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) {
          matches++;
        }
      }
      
      if (matches > 0) {
        const score = matches / queryTerms.length;
        
        results.push({
          memory,
          score
        });
      }
    }
    
    return results
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
      
      // Clear in-memory stores
      this.memoryStore.clear();
      this.semanticIndex.clear();
      
      // Clear from database
      await db.delete(memoryEntries)
        .where(eq(memoryEntries.systemId, this.systemId!));
      
      // Update metrics
      this.metrics.cacheSize = 0;
    } catch (error) {
      console.error('Error clearing Zep memory:', error);
      throw new Error('Failed to clear memory');
    }
  }

  /**
   * Generate embedding for text using OpenAI API
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      // Return random embedding for development without API key
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8000) // Limit to 8000 chars per OpenAI docs
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return random embedding as fallback
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions do not match');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}