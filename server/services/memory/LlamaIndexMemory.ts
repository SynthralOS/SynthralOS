/**
 * LlamaIndex Memory System
 * 
 * Index-based agent memory system using LlamaIndex for efficient
 * information retrieval and knowledge management.
 */

import { BaseMemory, MemoryConfig, MemoryEntry, MemorySearchResult } from './BaseMemory';
import { MemoryType } from '@shared/schema';
import { db } from '../../db';
import { memorySystems, memoryEntries } from '@shared/schema';
import { eq, and, desc, or, like } from 'drizzle-orm';
import { generateId } from '../../utils';
import OpenAI from 'openai';

// Initialize OpenAI client for embeddings and completions
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IndexNode {
  id: string;
  content: string;
  embedding?: number[];
  children: string[];
  parent?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface LlamaIndexConfig extends MemoryConfig {
  indexType?: 'list' | 'tree' | 'keyword_table'; // Type of index to use
  chunkSize?: number;                           // Size of chunks to index
  chunkOverlap?: number;                        // Overlap between chunks
  embeddingModel?: string;                      // Model for embeddings
  keywordExtraction?: boolean;                  // Whether to extract keywords
  summaryGeneration?: boolean;                  // Whether to generate summaries
}

export class LlamaIndexMemory extends BaseMemory {
  private memoryStore: Map<string, MemoryEntry>;
  private indexStore: Map<string, IndexNode>;
  private systemId: number | null = null;
  private config: LlamaIndexConfig;
  
  constructor(
    userId: number,
    name: string,
    config: LlamaIndexConfig = {}
  ) {
    super(MemoryType.LlamaIndex, userId, name, config);
    this.memoryStore = new Map<string, MemoryEntry>();
    this.indexStore = new Map<string, IndexNode>();
    this.config = {
      indexType: 'tree',
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingModel: 'text-embedding-ada-002',
      keywordExtraction: true,
      summaryGeneration: true,
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
          eq(memorySystems.type, MemoryType.LlamaIndex)
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
          
          // Load index nodes if available
          if (mem.metadata && (mem.metadata as any).indexNodes) {
            const indexNodes = (mem.metadata as any).indexNodes as IndexNode[];
            for (const node of indexNodes) {
              this.indexStore.set(node.id, node);
            }
          }
        });
        
        // Update metrics
        this.metrics.cacheSize = this.memoryStore.size;
        this.metrics.nodeCount = this.indexStore.size;
      } else {
        // Create new memory system
        const [newSystem] = await db.insert(memorySystems)
          .values({
            userId: this.userId,
            name: this.name,
            type: MemoryType.LlamaIndex,
            description: 'Index-based agent memory system',
            config: this.config as any,
            isActive: true,
            isDefault: false,
            metrics: this.metrics as any,
          })
          .returning();
        
        this.systemId = newSystem.id;
      }
    } catch (error) {
      console.error('Error initializing LlamaIndex memory:', error);
      throw new Error('Failed to initialize memory system');
    }
  }

  /**
   * Store a new memory and index it
   */
  async addMemory(entry: MemoryEntry): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }

      // Generate key if not provided
      const key = entry.key || `mem-${generateId()}`;
      
      // Index the content
      const indexNodes = await this.indexContent(entry.content, key);
      
      // Prepare metadata with index nodes
      const metadata = {
        ...entry.metadata || {},
        indexNodes
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
      this.metrics.nodeCount = this.indexStore.size;
      
      // Track insertion latency
      this.metrics.insertionLatency = this.metrics.insertionLatency 
        ? (this.metrics.insertionLatency + performance.now() - (entry.timestamp?.getTime() || Date.now())) / 2
        : performance.now() - (entry.timestamp?.getTime() || Date.now());
    } catch (error) {
      console.error('Error adding memory to LlamaIndex:', error);
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
          
          // Load index nodes if available
          if (memory.metadata && memory.metadata.indexNodes) {
            const indexNodes = memory.metadata.indexNodes as IndexNode[];
            for (const node of indexNodes) {
              this.indexStore.set(node.id, node);
            }
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
      console.error('Error retrieving memory from LlamaIndex:', error);
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
      
      // Determine if we need to re-index content
      let indexNodes = existing.metadata?.indexNodes;
      if (update.content) {
        // Remove old index nodes
        this.removeIndexNodes(key);
        
        // Create new index
        indexNodes = await this.indexContent(update.content, key);
      }
      
      // Prepare updated metadata
      const metadata = {
        ...existing.metadata,
        ...update.metadata || {},
        indexNodes
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
      
      // Update metrics
      this.metrics.nodeCount = this.indexStore.size;
    } catch (error) {
      console.error('Error updating memory in LlamaIndex:', error);
      throw new Error('Failed to update memory');
    }
  }

  /**
   * Remove a memory and its index nodes
   */
  async removeMemory(key: string): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Remove index nodes
      this.removeIndexNodes(key);
      
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
      this.metrics.nodeCount = this.indexStore.size;
    } catch (error) {
      console.error('Error removing memory from LlamaIndex:', error);
      throw new Error('Failed to remove memory');
    }
  }

  /**
   * Find memories that are relevant to the given query using index-based retrieval
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Extract keywords from query if keyword extraction is enabled
      let keywords: string[] = [];
      if (this.config.keywordExtraction) {
        keywords = await this.extractKeywords(query);
      }
      
      // Determine search strategy based on index type
      let relevantNodes: { node: IndexNode, score: number }[] = [];
      
      switch (this.config.indexType) {
        case 'tree':
          relevantNodes = await this.treeSearch(queryEmbedding, keywords, limit * 2);
          break;
        case 'keyword_table':
          relevantNodes = await this.keywordSearch(keywords, limit * 2);
          break;
        case 'list':
        default:
          relevantNodes = await this.listSearch(queryEmbedding, limit * 2);
      }
      
      // Group by memory key and calculate aggregate scores
      const memoryScores = new Map<string, number>();
      const memoryToNodes = new Map<string, IndexNode[]>();
      
      for (const { node, score } of relevantNodes) {
        const memoryKey = node.metadata.memoryKey;
        if (!memoryKey) continue;
        
        // Update score for memory
        const currentScore = memoryScores.get(memoryKey) || 0;
        memoryScores.set(memoryKey, Math.max(currentScore, score));
        
        // Track nodes for each memory
        if (!memoryToNodes.has(memoryKey)) {
          memoryToNodes.set(memoryKey, []);
        }
        memoryToNodes.get(memoryKey)!.push(node);
      }
      
      // Convert to search results
      const results: MemorySearchResult[] = [];
      
      for (const [memoryKey, score] of memoryScores.entries()) {
        const memory = this.memoryStore.get(memoryKey);
        if (!memory) continue;
        
        results.push({
          memory,
          score,
          context: {
            // Include relevant node content as additional context
            relevantNodes: memoryToNodes.get(memoryKey)?.map(n => n.content) || []
          }
        });
      }
      
      // Sort by score and limit
      const sortedResults = results
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
      console.error('Error searching memories in LlamaIndex:', error);
      
      // Fall back to simple search
      return this.simpleSearch(query, limit);
    }
  }

  /**
   * Clear all memories and index nodes
   */
  async clear(): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Clear in-memory stores
      this.memoryStore.clear();
      this.indexStore.clear();
      
      // Clear from database
      await db.delete(memoryEntries)
        .where(eq(memoryEntries.systemId, this.systemId!));
      
      // Update metrics
      this.metrics.cacheSize = 0;
      this.metrics.nodeCount = 0;
    } catch (error) {
      console.error('Error clearing LlamaIndex memory:', error);
      throw new Error('Failed to clear memory');
    }
  }

  /**
   * Index content into nodes
   */
  private async indexContent(content: string, memoryKey: string): Promise<IndexNode[]> {
    // Split into chunks
    const chunks = this.splitIntoChunks(content, this.config.chunkSize!, this.config.chunkOverlap!);
    
    // Create index nodes
    const nodes: IndexNode[] = [];
    
    // Create root node if using tree index
    let rootNodeId: string | undefined;
    if (this.config.indexType === 'tree') {
      const summary = this.config.summaryGeneration 
        ? await this.generateSummary(content)
        : `Root node for memory ${memoryKey}`;
      
      const rootNode: IndexNode = {
        id: `${memoryKey}-root`,
        content: summary,
        children: [],
        metadata: {
          memoryKey,
          isRoot: true,
          level: 0
        },
        createdAt: new Date()
      };
      
      nodes.push(rootNode);
      this.indexStore.set(rootNode.id, rootNode);
      rootNodeId = rootNode.id;
    }
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const nodeId = `${memoryKey}-node-${i}`;
      const chunk = chunks[i];
      
      // Generate embedding
      const embedding = await this.generateEmbedding(chunk);
      
      // Extract keywords if enabled
      let keywords: string[] = [];
      if (this.config.keywordExtraction) {
        keywords = await this.extractKeywords(chunk);
      }
      
      // Create node
      const node: IndexNode = {
        id: nodeId,
        content: chunk,
        embedding,
        children: [],
        parent: rootNodeId,
        metadata: {
          memoryKey,
          chunkIndex: i,
          keywords,
          level: 1
        },
        createdAt: new Date()
      };
      
      // Add to nodes array
      nodes.push(node);
      
      // Add to index store
      this.indexStore.set(nodeId, node);
      
      // Add as child to root node if using tree index
      if (rootNodeId) {
        const rootNode = this.indexStore.get(rootNodeId);
        if (rootNode) {
          rootNode.children.push(nodeId);
        }
      }
    }
    
    return nodes;
  }

  /**
   * Remove index nodes for a memory
   */
  private removeIndexNodes(memoryKey: string): void {
    // Find all nodes for this memory
    const nodeIds: string[] = [];
    
    for (const [id, node] of this.indexStore.entries()) {
      if (node.metadata.memoryKey === memoryKey) {
        nodeIds.push(id);
      }
    }
    
    // Remove from index store
    for (const id of nodeIds) {
      this.indexStore.delete(id);
    }
  }

  /**
   * Tree-based search
   */
  private async treeSearch(
    queryEmbedding: number[],
    keywords: string[],
    limit: number
  ): Promise<{ node: IndexNode, score: number }[]> {
    // Find root nodes
    const rootNodes = [...this.indexStore.values()].filter(node => 
      node.metadata.isRoot === true
    );
    
    // Initialize with root nodes
    let relevantNodes: { node: IndexNode, score: number }[] = [];
    
    for (const rootNode of rootNodes) {
      // Score root node based on keywords
      let rootScore = 0;
      
      // Check for keyword matches in root content
      if (keywords.length > 0) {
        const content = rootNode.content.toLowerCase();
        for (const keyword of keywords) {
          if (content.includes(keyword.toLowerCase())) {
            rootScore += 0.1;
          }
        }
      }
      
      relevantNodes.push({
        node: rootNode,
        score: rootScore
      });
      
      // Find and score child nodes
      for (const childId of rootNode.children) {
        const childNode = this.indexStore.get(childId);
        if (!childNode || !childNode.embedding) continue;
        
        // Calculate similarity score
        const similarity = this.calculateCosineSimilarity(queryEmbedding, childNode.embedding);
        
        // Add keyword score if available
        let keywordScore = 0;
        if (keywords.length > 0 && childNode.metadata.keywords) {
          for (const keyword of keywords) {
            if ((childNode.metadata.keywords as string[]).includes(keyword)) {
              keywordScore += 0.05;
            }
          }
        }
        
        // Combined score
        const score = similarity + keywordScore;
        
        relevantNodes.push({
          node: childNode,
          score
        });
      }
    }
    
    // Sort by score and limit
    return relevantNodes
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Keyword-based search
   */
  private async keywordSearch(
    keywords: string[],
    limit: number
  ): Promise<{ node: IndexNode, score: number }[]> {
    if (keywords.length === 0) {
      return [];
    }
    
    // Find nodes with matching keywords
    const matches: { node: IndexNode, score: number }[] = [];
    
    for (const node of this.indexStore.values()) {
      if (!node.metadata.keywords) continue;
      
      // Calculate keyword match score
      let score = 0;
      const nodeKeywords = node.metadata.keywords as string[];
      
      for (const keyword of keywords) {
        if (nodeKeywords.includes(keyword)) {
          score += 1 / keywords.length;
        }
      }
      
      if (score > 0) {
        matches.push({
          node,
          score
        });
      }
    }
    
    // Sort by score and limit
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * List-based search using vector similarity
   */
  private async listSearch(
    queryEmbedding: number[],
    limit: number
  ): Promise<{ node: IndexNode, score: number }[]> {
    // Find nodes with embeddings
    const matches: { node: IndexNode, score: number }[] = [];
    
    for (const node of this.indexStore.values()) {
      if (!node.embedding) continue;
      
      // Calculate similarity
      const similarity = this.calculateCosineSimilarity(queryEmbedding, node.embedding);
      
      matches.push({
        node,
        score: similarity
      });
    }
    
    // Sort by score and limit
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Simple search as fallback
   */
  private async simpleSearch(query: string, limit: number): Promise<MemorySearchResult[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const results: MemorySearchResult[] = [];
    
    for (const [key, memory] of this.memoryStore.entries()) {
      const content = memory.content.toLowerCase();
      
      let score = 0;
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1 / queryTerms.length;
        }
      }
      
      if (score > 0) {
        results.push({
          memory,
          score: score * (memory.importance || 0.5)
        });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Split text into chunks with overlap
   */
  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      // Get chunk
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunk = text.substring(startIndex, endIndex);
      
      // Add to chunks
      chunks.push(chunk);
      
      // Move start index
      startIndex = endIndex - overlap;
      
      // If we're at the end, break to avoid small final chunks
      if (startIndex + chunkSize >= text.length) {
        if (startIndex < text.length) {
          chunks.push(text.substring(startIndex));
        }
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      // Return random embedding for development without API key
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }
    
    try {
      const response = await openai.embeddings.create({
        model: this.config.embeddingModel || 'text-embedding-ada-002',
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
   * Extract keywords from text
   */
  private async extractKeywords(text: string): Promise<string[]> {
    if (!process.env.OPENAI_API_KEY) {
      return [];
    }
    
    try {
      const prompt = `Extract 5-10 important keywords from the following text. Return only the keywords as a comma-separated list without explanations or quotation marks.
      
Text: ${text.slice(0, 4000)}`;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100
      });
      
      const content = response.choices[0].message.content || '';
      return content.split(',').map(k => k.trim()).filter(k => k.length > 0);
    } catch (error) {
      console.error('Error extracting keywords:', error);
      return [];
    }
  }

  /**
   * Generate summary for text
   */
  private async generateSummary(text: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return `Summary of ${text.slice(0, 50)}...`;
    }
    
    try {
      const prompt = `Summarize the following text in 1-2 sentences:
      
Text: ${text.slice(0, 4000)}`;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100
      });
      
      return response.choices[0].message.content || `Summary not available`;
    } catch (error) {
      console.error('Error generating summary:', error);
      return `Summary not available`;
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