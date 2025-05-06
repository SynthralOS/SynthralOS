/**
 * Search Service
 * 
 * Provides a unified search interface for all entities in the system.
 * Supports both traditional search and semantic (vector) search using pgvector.
 */

import { db } from '../../db';
import { vectorItems, VectorItem, savedSearches } from '@shared/schema';
import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import OpenAI from 'openai';

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Search filters type
 */
export type SearchFilters = {
  userId?: number;
  types?: string[];
  tags?: string[];
  fromDate?: Date;
  toDate?: Date;
  status?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

/**
 * Search result type
 */
export type SearchResult = {
  id: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  relevanceScore?: number;
};

/**
 * Search Service
 */
export class SearchService {
  /**
   * Perform a basic keyword search
   */
  public async basicSearch(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ results: SearchResult[]; total: number; page: number; limit: number }> {
    // Default to desc order by createdAt if not specified
    const sortBy = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortDirection || 'desc';
    const offset = (page - 1) * limit;

    // Query vectorItems with basic filters
    const whereConditions = [];

    // Apply filters
    if (filters.userId) {
      whereConditions.push(sql`metadata->>'userId' = ${filters.userId.toString()}`);
    }

    if (filters.types && filters.types.length > 0) {
      whereConditions.push(inArray(vectorItems.objectType, filters.types));
    }

    if (query && query.trim() !== '') {
      whereConditions.push(
        sql`(
          ${ilike(vectorItems.title, `%${query}%`)} OR 
          ${ilike(vectorItems.content, `%${query}%`)} OR
          metadata::text ILIKE ${`%${query}%`}
        )`
      );
    }

    if (filters.fromDate) {
      whereConditions.push(sql`${vectorItems.createdAt} >= ${filters.fromDate}`);
    }

    if (filters.toDate) {
      whereConditions.push(sql`${vectorItems.createdAt} <= ${filters.toDate}`);
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(
        sql`metadata->>'tags' ?| array[${filters.tags.join(',')}]`
      );
    }

    const queryBaseCondition = whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(vectorItems);
    
    // Only add where condition if we have filters
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(queryBaseCondition);
    }
    
    const countResults = await countQuery;
    const count = countResults.length > 0 ? Number(countResults[0].count) : 0;

    // Execute search
    const orderByClause = sortDirection === 'desc'
      ? desc(vectorItems[sortBy as keyof typeof vectorItems])
      : vectorItems[sortBy as keyof typeof vectorItems];

    // Use a safe query construction pattern
    let searchQuery = db.select().from(vectorItems);
    
    // Add where condition only if we have filters
    if (whereConditions.length > 0) {
      searchQuery = searchQuery.where(queryBaseCondition);
    }
    
    // Complete the query
    const searchResults = await searchQuery
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Transform to SearchResult type
    const results = searchResults.map(item => this.vectorItemToSearchResult(item));

    return {
      results,
      total: Number(count),
      page,
      limit
    };
  }

  /**
   * Perform semantic search using vector embeddings with pgvector
   */
  public async semanticSearch(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ results: SearchResult[]; total: number; page: number; limit: number }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    try {
      // Get vector embedding for query from OpenAI
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Build filter conditions
      const filterConditions = [];

      if (filters.userId) {
        filterConditions.push(sql`metadata->>'userId' = ${filters.userId.toString()}`);
      }

      if (filters.types && filters.types.length > 0) {
        filterConditions.push(inArray(vectorItems.objectType, filters.types));
      }

      if (filters.fromDate) {
        filterConditions.push(sql`${vectorItems.createdAt} >= ${filters.fromDate}`);
      }
  
      if (filters.toDate) {
        filterConditions.push(sql`${vectorItems.createdAt} <= ${filters.toDate}`);
      }

      if (filters.tags && filters.tags.length > 0) {
        filterConditions.push(
          sql`metadata->>'tags' ?| array[${filters.tags.join(',')}]`
        );
      }

      const filterCondition = filterConditions.length > 0
        ? and(...filterConditions)
        : undefined;
      
      // Calculate the offset for pagination
      const offset = (page - 1) * limit;
      
      // For counting total matching items
      let semCountQuery = db.select({ count: sql<number>`count(*)` }).from(vectorItems);
      
      if (filterConditions.length > 0) {
        semCountQuery = semCountQuery.where(filterCondition);
      }
      
      const countResults = await semCountQuery;
      const count = countResults.length > 0 ? Number(countResults[0].count) : 0;
      
      // Since we're using JSONB for embeddings, we need to do a manual comparison
      // Get all vectors that match our filters
      let vectorQuery = db.select().from(vectorItems);
      
      if (filterConditions.length > 0) {
        vectorQuery = vectorQuery.where(filterCondition);
      }
      
      const vectorResults = await vectorQuery
        .limit(limit * 3) // Get more results than needed to allow for filtering by similarity
        .offset(offset);
        
      // Calculate similarity scores and sort
      const scoredResults = vectorResults.map(item => {
        // Parse the stored embedding from JSONB
        const storedEmbedding = Array.isArray(item.embedding) 
          ? item.embedding 
          : JSON.parse(item.embedding as string);
        
        // Calculate dot product (simple vector similarity)
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * storedEmbedding[i];
          magnitudeA += queryEmbedding[i] * queryEmbedding[i];
          magnitudeB += storedEmbedding[i] * storedEmbedding[i];
        }
        
        const relevanceScore = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
        
        return {
          ...item,
          relevanceScore
        };
      });
      
      // Sort by similarity score and take the top results
      const sortedResults = scoredResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
      
      // Transform to SearchResult type
      const results = sortedResults.map(item => ({
        ...this.vectorItemToSearchResult(item),
        relevanceScore: item.relevanceScore
      }));

      return {
        results,
        total: Number(count),
        page,
        limit
      };
    } catch (error) {
      console.error('Semantic search error:', error);
      
      // Fall back to basic search if semantic search fails
      return this.basicSearch(query, filters, page, limit);
    }
  }

  /**
   * Index content for search using pgvector
   */
  public async indexContent(
    objectId: string,
    objectType: string,
    title: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<VectorItem> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Check if the item already exists
      const [existingItem] = await db
        .select()
        .from(vectorItems)
        .where(
          and(
            eq(vectorItems.objectId, objectId),
            eq(vectorItems.objectType, objectType)
          )
        );

      if (existingItem) {
        // Update the existing item
        const [updated] = await db
          .update(vectorItems)
          .set({
            title,
            content,
            embedding, // pgvector will handle the array format properly
            metadata,
            updatedAt: new Date()
          })
          .where(eq(vectorItems.id, existingItem.id))
          .returning();
        
        return updated;
      } else {
        // Insert a new item
        const [newItem] = await db
          .insert(vectorItems)
          .values({
            objectId,
            objectType,
            title,
            content,
            embedding, // pgvector will handle the array format properly
            metadata,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return newItem;
      }
    } catch (error) {
      console.error('Error indexing content:', error);
      throw error;
    }
  }

  /**
   * Remove indexed content
   */
  public async removeIndex(objectId: string, objectType: string): Promise<void> {
    await db
      .delete(vectorItems)
      .where(
        and(
          eq(vectorItems.objectId, objectId),
          eq(vectorItems.objectType, objectType)
        )
      );
  }

  /**
   * Save a search for later use
   */
  public async saveSearch(
    userId: number,
    name: string,
    query: string,
    filters: SearchFilters,
    entityType: string
  ): Promise<any> {
    const [savedSearch] = await db
      .insert(savedSearches)
      .values({
        userId,
        name,
        query,
        filters: filters as any,
        entityType,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return savedSearch;
  }

  /**
   * Get saved searches for a user
   */
  public async getSavedSearches(userId: number, entityType?: string): Promise<any[]> {
    // Build conditions array
    const conditions = [eq(savedSearches.userId, userId)];
    
    if (entityType) {
      conditions.push(eq(savedSearches.entityType, entityType));
    }
    
    // Use a single where with and() to combine all conditions
    return db.select()
      .from(savedSearches)
      .where(and(...conditions))
      .orderBy(desc(savedSearches.updatedAt));
  }

  /**
   * Generate vector embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      // If no API key, return a random vector for development
      return Array.from({ length: 1536 }, () => Math.random());
    }

    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text.slice(0, 8000),  // Limit to 8000 chars per OpenAI docs
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a random vector as fallback
      return Array.from({ length: 1536 }, () => Math.random());
    }
  }

  // Cosine similarity is now handled directly by pgvector in the database

  /**
   * Transform VectorItem to SearchResult
   */
  private vectorItemToSearchResult(item: any): SearchResult {
    return {
      id: item.objectId,
      type: item.objectType,
      title: item.title || '',
      content: item.content,
      metadata: item.metadata || {},
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      relevanceScore: item.relevanceScore
    };
  }
}

// Export an instance for direct use
export const searchService = new SearchService();