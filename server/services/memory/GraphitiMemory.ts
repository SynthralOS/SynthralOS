/**
 * Graphiti Memory System
 * 
 * Knowledge graph memory system for sophisticated relationship tracking
 * between entities, concepts, and information with graph-based retrieval.
 */

import { BaseMemory, MemoryConfig, MemoryEntry, MemorySearchResult } from './BaseMemory';
import { MemoryType } from '@shared/schema';
import { db } from '../../db';
import { 
  memorySystems, 
  memoryEntries, 
  knowledgeGraphNodes, 
  knowledgeGraphEdges 
} from '@shared/schema';
import { eq, and, desc, or, like, inArray, sql } from 'drizzle-orm';
import { generateId } from '../../utils';
import OpenAI from 'openai';

// Ensure we have access to OpenAI for graph operations
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GraphNode {
  id: number;            // Database ID
  nodeId: string;        // Business ID
  label: string;         // Node label (concept, entity, fact, etc.)
  properties: Record<string, any>; // Node properties
  embedding?: number[];  // Vector embedding for semantic search
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  id: number;            // Database ID
  sourceId: number;      // Source node DB ID
  targetId: number;      // Target node DB ID
  relationship: string;  // Edge label (knows, contains, is_a, etc.)
  weight: number;        // Relationship strength (0-1)
  properties: Record<string, any>; // Edge properties
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphitiConfig extends MemoryConfig {
  retrievalDepth?: number;       // How many hops from the initial nodes for retrieval
  minNodeWeight?: number;        // Minimum node weight to include in results
  minEdgeWeight?: number;        // Minimum edge weight to consider
  extractGraphFromContent?: boolean; // Whether to extract graph from content automatically  
}

export class GraphitiMemory extends BaseMemory {
  private memoryStore: Map<string, MemoryEntry>;
  private nodeStore: Map<string, GraphNode>;
  private edgeStore: Map<string, GraphEdge[]>;
  private systemId: number | null = null;
  private config: GraphitiConfig;
  
  constructor(
    userId: number,
    name: string,
    config: GraphitiConfig = {}
  ) {
    super(MemoryType.Graphiti, userId, name, config);
    this.memoryStore = new Map<string, MemoryEntry>();
    this.nodeStore = new Map<string, GraphNode>();
    this.edgeStore = new Map<string, GraphEdge[]>();
    this.config = {
      retrievalDepth: 2,
      minNodeWeight: 0.3,
      minEdgeWeight: 0.3,
      extractGraphFromContent: true,
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
          eq(memorySystems.type, MemoryType.Graphiti)
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
        
        // Load graph nodes
        const nodes = await db.select()
          .from(knowledgeGraphNodes)
          .where(eq(knowledgeGraphNodes.systemId, this.systemId));
        
        // Add to node store
        nodes.forEach(node => {
          this.nodeStore.set(node.nodeId, {
            id: node.id,
            nodeId: node.nodeId,
            label: node.label,
            properties: node.properties as Record<string, any>,
            embedding: node.embedding as number[] | undefined,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt
          });
        });
        
        // Load graph edges
        const edges = await db.select()
          .from(knowledgeGraphEdges)
          .where(eq(knowledgeGraphEdges.systemId, this.systemId));
        
        // Add to edge store - group by source
        edges.forEach(edge => {
          const sourceNode = nodes.find(n => n.id === edge.sourceId);
          const targetNode = nodes.find(n => n.id === edge.targetId);
          
          if (!sourceNode || !targetNode) return;
          
          const sourceNodeId = sourceNode.nodeId;
          if (!this.edgeStore.has(sourceNodeId)) {
            this.edgeStore.set(sourceNodeId, []);
          }
          
          const edgeList = this.edgeStore.get(sourceNodeId)!;
          edgeList.push({
            id: edge.id,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            relationship: edge.relationship,
            weight: edge.weight,
            properties: edge.properties as Record<string, any>,
            createdAt: edge.createdAt,
            updatedAt: edge.updatedAt
          });
        });
        
        // Update metrics
        this.metrics.cacheSize = this.memoryStore.size;
        this.metrics.nodeCount = this.nodeStore.size;
        this.metrics.edgeCount = edges.length;
      } else {
        // Create new memory system
        const [newSystem] = await db.insert(memorySystems)
          .values({
            userId: this.userId,
            name: this.name,
            type: MemoryType.Graphiti,
            description: 'Knowledge graph memory system',
            config: this.config as any,
            isActive: true,
            isDefault: false,
            metrics: this.metrics as any,
          })
          .returning();
        
        this.systemId = newSystem.id;
      }
    } catch (error) {
      console.error('Error initializing Graphiti memory:', error);
      throw new Error('Failed to initialize memory system');
    }
  }

  /**
   * Store a new memory and extract graph elements from it
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
      
      // Extract graph if configured
      if (this.config.extractGraphFromContent && entry.content) {
        await this.extractAndStoreGraph(entry.content, key);
      }
      
      // Update metrics
      this.metrics.cacheSize = this.memoryStore.size;
      
      // Track insertion latency
      this.metrics.insertionLatency = this.metrics.insertionLatency 
        ? (this.metrics.insertionLatency + performance.now() - (entry.timestamp?.getTime() || Date.now())) / 2
        : performance.now() - (entry.timestamp?.getTime() || Date.now());
    } catch (error) {
      console.error('Error adding memory to Graphiti:', error);
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
      console.error('Error retrieving memory from Graphiti:', error);
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
      
      // Update graph if content changed
      if (update.content && this.config.extractGraphFromContent) {
        // First, clear existing graph nodes related to this memory
        await this.clearGraphForMemory(key);
        
        // Then extract and store new graph
        await this.extractAndStoreGraph(update.content, key);
      }
    } catch (error) {
      console.error('Error updating memory in Graphiti:', error);
      throw new Error('Failed to update memory');
    }
  }

  /**
   * Remove a memory and its associated graph elements
   */
  async removeMemory(key: string): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // First clear associated graph elements
      await this.clearGraphForMemory(key);
      
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
      console.error('Error removing memory from Graphiti:', error);
      throw new Error('Failed to remove memory');
    }
  }

  /**
   * Find memories that are relevant to the given query using graph traversal
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.systemId) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      // First, identify key concepts in the query
      const queryNodes = await this.extractGraphNodes(query);
      
      if (queryNodes.length === 0) {
        // Fallback to text search if no concepts found
        return this.searchMemoriesByText(query, limit);
      }
      
      // Find nodes that match the query concepts
      const matchingNodeIds: number[] = [];
      
      for (const queryNode of queryNodes) {
        // Look for existing nodes with similar labels
        for (const [nodeId, node] of this.nodeStore.entries()) {
          if (
            node.label.toLowerCase() === queryNode.label.toLowerCase() ||
            (node.properties.name &&
              node.properties.name.toLowerCase() === queryNode.properties.name?.toLowerCase())
          ) {
            matchingNodeIds.push(node.id);
          }
        }
      }
      
      if (matchingNodeIds.length === 0) {
        // No matching nodes, fallback to text search
        return this.searchMemoriesByText(query, limit);
      }
      
      // Perform breadth-first traversal from matching nodes
      const visited = new Set<number>();
      const nodeScores = new Map<number, number>();
      const memoryScores = new Map<string, number>();
      
      // Initialize with matching nodes
      for (const nodeId of matchingNodeIds) {
        visited.add(nodeId);
        nodeScores.set(nodeId, 1.0); // Direct matches get full score
      }
      
      // Traverse the graph up to configured depth
      for (let depth = 0; depth < this.config.retrievalDepth!; depth++) {
        const nextLevel = new Set<number>();
        
        // For each visited node, explore its edges
        for (const nodeId of visited) {
          const node = Array.from(this.nodeStore.values()).find(n => n.id === nodeId);
          if (!node) continue;
          
          // Get current node score
          const nodeScore = nodeScores.get(nodeId) || 0;
          
          // Follow outgoing edges
          const edges = this.edgeStore.get(node.nodeId) || [];
          
          for (const edge of edges) {
            if (edge.weight < this.config.minEdgeWeight!) continue;
            
            // Calculate score decay based on distance and edge weight
            const targetScore = nodeScore * edge.weight * Math.pow(0.7, depth);
            
            if (targetScore < this.config.minNodeWeight!) continue;
            
            // Update target node score
            const targetNodeScore = nodeScores.get(edge.targetId) || 0;
            nodeScores.set(edge.targetId, Math.max(targetNodeScore, targetScore));
            
            // Add to next level if not already visited
            if (!visited.has(edge.targetId)) {
              nextLevel.add(edge.targetId);
            }
          }
          
          // Find memories connected to this node
          await this.addMemoryScoresForNode(node.nodeId, nodeScore, memoryScores);
        }
        
        // Add next level to visited
        for (const id of nextLevel) {
          visited.add(id);
        }
      }
      
      // Convert memory scores to results
      const results: MemorySearchResult[] = [];
      
      for (const [memoryKey, score] of memoryScores.entries()) {
        const memory = this.memoryStore.get(memoryKey);
        if (!memory) continue;
        
        results.push({
          memory,
          score
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
      console.error('Error searching memories in Graphiti:', error);
      
      // Fallback to text search
      return this.searchMemoriesByText(query, limit);
    }
  }

  /**
   * Text-based search fallback
   */
  private async searchMemoriesByText(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
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
   * Clear all memories and graph elements
   */
  async clear(): Promise<void> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Clear in-memory stores
      this.memoryStore.clear();
      this.nodeStore.clear();
      this.edgeStore.clear();
      
      // Clear from database (edges first, then nodes, then memories)
      await db.delete(knowledgeGraphEdges)
        .where(eq(knowledgeGraphEdges.systemId, this.systemId!));
      
      await db.delete(knowledgeGraphNodes)
        .where(eq(knowledgeGraphNodes.systemId, this.systemId!));
      
      await db.delete(memoryEntries)
        .where(eq(memoryEntries.systemId, this.systemId!));
      
      // Update metrics
      this.metrics.cacheSize = 0;
      this.metrics.nodeCount = 0;
      this.metrics.edgeCount = 0;
    } catch (error) {
      console.error('Error clearing Graphiti memory:', error);
      throw new Error('Failed to clear memory');
    }
  }

  /**
   * Add a node to the knowledge graph
   */
  async addNode(
    nodeId: string, 
    label: string, 
    properties: Record<string, any>
  ): Promise<GraphNode> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Check if node already exists
      const existingNode = this.nodeStore.get(nodeId);
      
      if (existingNode) {
        // Update node properties
        await db.update(knowledgeGraphNodes)
          .set({
            properties: {
              ...existingNode.properties,
              ...properties
            } as any,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(knowledgeGraphNodes.systemId, this.systemId!),
              eq(knowledgeGraphNodes.nodeId, nodeId)
            )
          );
        
        // Update in-memory
        existingNode.properties = {
          ...existingNode.properties,
          ...properties
        };
        existingNode.updatedAt = new Date();
        
        return existingNode;
      } else {
        // Insert new node
        const [newNode] = await db.insert(knowledgeGraphNodes)
          .values({
            systemId: this.systemId!,
            nodeId,
            label,
            properties: properties as any,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        // Add to in-memory store
        const graphNode: GraphNode = {
          id: newNode.id,
          nodeId,
          label,
          properties,
          createdAt: newNode.createdAt,
          updatedAt: newNode.updatedAt
        };
        
        this.nodeStore.set(nodeId, graphNode);
        this.metrics.nodeCount = (this.metrics.nodeCount || 0) + 1;
        
        return graphNode;
      }
    } catch (error) {
      console.error('Error adding node to Graphiti:', error);
      throw new Error('Failed to add node');
    }
  }

  /**
   * Add an edge between two nodes
   */
  async addEdge(
    sourceNodeId: string,
    targetNodeId: string,
    relationship: string,
    weight: number = 0.5,
    properties: Record<string, any> = {}
  ): Promise<GraphEdge> {
    try {
      if (!this.systemId) {
        await this.initialize();
      }
      
      // Ensure both nodes exist
      let sourceNode = this.nodeStore.get(sourceNodeId);
      let targetNode = this.nodeStore.get(targetNodeId);
      
      if (!sourceNode) {
        sourceNode = await this.addNode(sourceNodeId, 'Entity', { name: sourceNodeId });
      }
      
      if (!targetNode) {
        targetNode = await this.addNode(targetNodeId, 'Entity', { name: targetNodeId });
      }
      
      // Check if edge already exists
      let existingEdge: GraphEdge | undefined;
      
      const sourceEdges = this.edgeStore.get(sourceNodeId) || [];
      for (const edge of sourceEdges) {
        if (
          edge.sourceId === sourceNode.id &&
          edge.targetId === targetNode.id &&
          edge.relationship === relationship
        ) {
          existingEdge = edge;
          break;
        }
      }
      
      if (existingEdge) {
        // Update edge
        await db.update(knowledgeGraphEdges)
          .set({
            weight,
            properties: {
              ...existingEdge.properties,
              ...properties
            } as any,
            updatedAt: new Date()
          })
          .where(eq(knowledgeGraphEdges.id, existingEdge.id));
        
        // Update in-memory
        existingEdge.weight = weight;
        existingEdge.properties = {
          ...existingEdge.properties,
          ...properties
        };
        existingEdge.updatedAt = new Date();
        
        return existingEdge;
      } else {
        // Insert new edge
        const [newEdge] = await db.insert(knowledgeGraphEdges)
          .values({
            systemId: this.systemId!,
            sourceId: sourceNode.id,
            targetId: targetNode.id,
            relationship,
            weight,
            properties: properties as any,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        // Add to in-memory store
        const graphEdge: GraphEdge = {
          id: newEdge.id,
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          relationship,
          weight,
          properties,
          createdAt: newEdge.createdAt,
          updatedAt: newEdge.updatedAt
        };
        
        if (!this.edgeStore.has(sourceNodeId)) {
          this.edgeStore.set(sourceNodeId, []);
        }
        
        this.edgeStore.get(sourceNodeId)!.push(graphEdge);
        this.metrics.edgeCount = (this.metrics.edgeCount || 0) + 1;
        
        return graphEdge;
      }
    } catch (error) {
      console.error('Error adding edge to Graphiti:', error);
      throw new Error('Failed to add edge');
    }
  }

  /**
   * Extract graph structure from content using OpenAI
   */
  private async extractGraphNodes(text: string): Promise<{
    label: string;
    properties: Record<string, any>;
  }[]> {
    if (!process.env.OPENAI_API_KEY) {
      // Return empty array if no API key is available
      return [];
    }
    
    try {
      const trimmedText = text.slice(0, 4000); // Limit to avoid token issues
      
      const prompt = `
        Identify the 3-7 most important concepts or entities in the following text.
        For each concept, provide:
        1. A label (such as Person, Organization, Location, Concept, Topic, etc.)
        2. Properties (name, description, and any other relevant attributes)
        
        Return as JSON array with objects containing "label" and "properties" fields.
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
        const nodes = parsed.nodes || parsed.concepts || parsed;
        
        if (!Array.isArray(nodes)) return [];
        
        // Ensure correct structure
        return nodes
          .filter((n: any) => n.label && n.properties)
          .map((n: any) => ({
            label: n.label,
            properties: n.properties
          }));
      } catch (parseError) {
        console.error('Error parsing graph extraction response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting graph nodes:', error);
      return [];
    }
  }

  /**
   * Extract relationships between concepts
   */
  private async extractRelationships(nodes: {
    label: string;
    properties: Record<string, any>;
  }[]): Promise<{
    source: string;
    target: string;
    relationship: string;
    weight: number;
  }[]> {
    if (!process.env.OPENAI_API_KEY || nodes.length < 2) {
      return [];
    }
    
    try {
      const nodesText = nodes.map(n => 
        `${n.label}: ${n.properties.name || 'Unnamed'}`
      ).join('\n');
      
      const prompt = `
        Analyze these concepts and identify meaningful relationships between them:
        
        ${nodesText}
        
        For each relationship, provide:
        1. Source concept name
        2. Target concept name
        3. Relationship type (e.g., "is_part_of", "knows", "contains", "is_related_to", etc.)
        4. Weight (0.0 to 1.0) indicating strength of relationship
        
        Only identify relationships where there is a clear connection.
        Return as JSON array with fields: source, target, relationship, weight.
        Only return the JSON array, nothing else.
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      try {
        const parsed = JSON.parse(content);
        const relationships = parsed.relationships || parsed;
        
        if (!Array.isArray(relationships)) return [];
        
        // Ensure correct structure
        return relationships
          .filter((r: any) => r.source && r.target && r.relationship)
          .map((r: any) => ({
            source: r.source,
            target: r.target,
            relationship: r.relationship,
            weight: typeof r.weight === 'number' ? r.weight : 0.5
          }));
      } catch (parseError) {
        console.error('Error parsing relationship extraction response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting relationships:', error);
      return [];
    }
  }

  /**
   * Extract and store graph from content
   */
  private async extractAndStoreGraph(content: string, memoryKey: string): Promise<void> {
    try {
      // Extract nodes
      const nodes = await this.extractGraphNodes(content);
      
      if (nodes.length === 0) return;
      
      // Create nodes
      const createdNodes: GraphNode[] = [];
      
      for (const node of nodes) {
        // Add memory key to node properties
        const nodeId = `${node.label.toLowerCase()}-${node.properties.name || generateId()}`;
        const properties = {
          ...node.properties,
          memoryKeys: [memoryKey]
        };
        
        const createdNode = await this.addNode(nodeId, node.label, properties);
        createdNodes.push(createdNode);
      }
      
      // Extract relationships
      const relationships = await this.extractRelationships(nodes);
      
      // Create edges
      for (const rel of relationships) {
        const sourceNode = createdNodes.find(n => 
          n.properties.name?.toLowerCase() === rel.source.toLowerCase()
        );
        
        const targetNode = createdNodes.find(n => 
          n.properties.name?.toLowerCase() === rel.target.toLowerCase()
        );
        
        if (sourceNode && targetNode) {
          await this.addEdge(
            sourceNode.nodeId,
            targetNode.nodeId,
            rel.relationship,
            rel.weight,
            { memoryKey }
          );
        }
      }
    } catch (error) {
      console.error('Error extracting graph from content:', error);
    }
  }

  /**
   * Clear graph elements associated with a memory
   */
  private async clearGraphForMemory(memoryKey: string): Promise<void> {
    if (!this.systemId) return;
    
    try {
      // Find edges with this memory key
      const edgesToDelete: number[] = [];
      
      for (const [sourceNodeId, edges] of this.edgeStore.entries()) {
        for (const edge of edges) {
          if (edge.properties.memoryKey === memoryKey) {
            edgesToDelete.push(edge.id);
          }
        }
      }
      
      // Delete edges
      if (edgesToDelete.length > 0) {
        await db.delete(knowledgeGraphEdges)
          .where(
            and(
              eq(knowledgeGraphEdges.systemId, this.systemId),
              inArray(knowledgeGraphEdges.id, edgesToDelete)
            )
          );
        
        // Remove from in-memory store
        for (const [sourceNodeId, edges] of this.edgeStore.entries()) {
          this.edgeStore.set(
            sourceNodeId,
            edges.filter(edge => !edgesToDelete.includes(edge.id))
          );
        }
        
        this.metrics.edgeCount = (this.metrics.edgeCount || 0) - edgesToDelete.length;
      }
      
      // Find nodes that only belong to this memory
      const nodesToDelete: number[] = [];
      
      for (const [nodeId, node] of this.nodeStore.entries()) {
        if (
          Array.isArray(node.properties.memoryKeys) && 
          node.properties.memoryKeys.length === 1 &&
          node.properties.memoryKeys[0] === memoryKey
        ) {
          nodesToDelete.push(node.id);
        }
      }
      
      // Delete nodes
      if (nodesToDelete.length > 0) {
        await db.delete(knowledgeGraphNodes)
          .where(
            and(
              eq(knowledgeGraphNodes.systemId, this.systemId),
              inArray(knowledgeGraphNodes.id, nodesToDelete)
            )
          );
        
        // Remove from in-memory store
        for (const [nodeId, node] of this.nodeStore.entries()) {
          if (nodesToDelete.includes(node.id)) {
            this.nodeStore.delete(nodeId);
          }
        }
        
        this.metrics.nodeCount = (this.metrics.nodeCount || 0) - nodesToDelete.length;
      }
      
      // Update nodes that have this memory key among others
      for (const [nodeId, node] of this.nodeStore.entries()) {
        if (
          Array.isArray(node.properties.memoryKeys) && 
          node.properties.memoryKeys.includes(memoryKey) &&
          node.properties.memoryKeys.length > 1
        ) {
          // Remove this memory key
          const updatedMemoryKeys = node.properties.memoryKeys.filter(
            (key: string) => key !== memoryKey
          );
          
          // Update node
          await db.update(knowledgeGraphNodes)
            .set({
              properties: {
                ...node.properties,
                memoryKeys: updatedMemoryKeys
              } as any,
              updatedAt: new Date()
            })
            .where(eq(knowledgeGraphNodes.id, node.id));
          
          // Update in-memory
          node.properties = {
            ...node.properties,
            memoryKeys: updatedMemoryKeys
          };
        }
      }
    } catch (error) {
      console.error('Error clearing graph for memory:', error);
    }
  }

  /**
   * Add memory scores for nodes connected to memories
   */
  private async addMemoryScoresForNode(
    nodeId: string,
    nodeScore: number,
    memoryScores: Map<string, number>
  ): Promise<void> {
    const node = this.nodeStore.get(nodeId);
    if (!node || !node.properties.memoryKeys) return;
    
    const memoryKeys = node.properties.memoryKeys;
    
    for (const memoryKey of memoryKeys) {
      const currentScore = memoryScores.get(memoryKey) || 0;
      memoryScores.set(memoryKey, Math.max(currentScore, nodeScore));
    }
  }
}