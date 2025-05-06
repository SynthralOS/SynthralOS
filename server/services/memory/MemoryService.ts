/**
 * Memory Service
 * 
 * Central service that manages all memory systems and provides
 * a unified interface for interacting with memory.
 */

import { BaseMemory, MemoryConfig, MemoryEntry, MemorySearchResult } from './BaseMemory';
import { Context7Memory, Context7Config } from './Context7Memory';
import { Mem0Memory, Mem0Config } from './Mem0Memory';
import { GraphitiMemory, GraphitiConfig } from './GraphitiMemory';
import { ZepMemory, ZepConfig } from './ZepMemory';
import { LlamaIndexMemory, LlamaIndexConfig } from './LlamaIndexMemory';
import { MemoryType } from '@shared/schema';
import { db } from '../../db';
import { memorySystems } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class MemoryService {
  private static instance: MemoryService;
  private memorySystems: Map<string, BaseMemory> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  /**
   * Get a memory system for a user
   * Creates it if it doesn't exist
   */
  async getMemorySystem(
    userId: number, 
    type: MemoryType, 
    name: string = 'default',
    config: MemoryConfig = {}
  ): Promise<BaseMemory> {
    // Generate a unique key for this memory system
    const key = `${userId}:${type}:${name}`;
    
    // Check if we already have this memory system loaded
    if (this.memorySystems.has(key)) {
      return this.memorySystems.get(key)!;
    }
    
    // Create a new memory system based on type
    let memorySystem: BaseMemory;
    
    switch (type) {
      case MemoryType.Context7:
        memorySystem = new Context7Memory(userId, name, config as Context7Config);
        break;
        
      case MemoryType.Mem0:
        memorySystem = new Mem0Memory(userId, name, config as Mem0Config);
        break;
        
      case MemoryType.Graphiti:
        memorySystem = new GraphitiMemory(userId, name, config as GraphitiConfig);
        break;
        
      case MemoryType.Zep:
        memorySystem = new ZepMemory(userId, name, config as ZepConfig);
        break;
        
      case MemoryType.LlamaIndex:
        memorySystem = new LlamaIndexMemory(userId, name, config as LlamaIndexConfig);
        break;
        
      case MemoryType.Custom:
        // Custom memory implementation would go here
        // For now, fall back to Context7
        memorySystem = new Context7Memory(userId, name, config as Context7Config);
        break;
        
      default:
        // Default to Context7
        memorySystem = new Context7Memory(userId, name, config as Context7Config);
    }
    
    // Initialize the memory system
    await (memorySystem as any).initialize();
    
    // Cache and return
    this.memorySystems.set(key, memorySystem);
    return memorySystem;
  }

  /**
   * Get all memory systems for a user
   */
  async getUserMemorySystems(userId: number): Promise<BaseMemory[]> {
    // Query database for all memory systems for this user
    const dbSystems = await db.select()
      .from(memorySystems)
      .where(eq(memorySystems.userId, userId));
    
    // Load each system
    const systems: BaseMemory[] = [];
    
    for (const system of dbSystems) {
      try {
        const memorySystem = await this.getMemorySystem(
          userId,
          system.type as MemoryType,
          system.name,
          system.config as MemoryConfig
        );
        
        systems.push(memorySystem);
      } catch (error) {
        console.error(`Error loading memory system ${system.name}:`, error);
      }
    }
    
    return systems;
  }

  /**
   * Create a new memory system
   */
  async createMemorySystem(
    userId: number,
    type: MemoryType,
    name: string,
    config: MemoryConfig = {}
  ): Promise<BaseMemory> {
    // Check if system already exists
    const existing = await db.select()
      .from(memorySystems)
      .where(and(
        eq(memorySystems.userId, userId),
        eq(memorySystems.name, name),
        eq(memorySystems.type, type)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error(`Memory system with name "${name}" already exists`);
    }
    
    // Create the memory system
    return this.getMemorySystem(userId, type, name, config);
  }

  /**
   * Delete a memory system
   */
  async deleteMemorySystem(userId: number, type: MemoryType, name: string): Promise<void> {
    const key = `${userId}:${type}:${name}`;
    
    // Get the memory system
    const memorySystem = this.memorySystems.get(key);
    
    if (memorySystem) {
      // Clear all memories
      await memorySystem.clear();
      
      // Remove from cache
      this.memorySystems.delete(key);
    }
    
    // Delete from database
    await db.delete(memorySystems)
      .where(and(
        eq(memorySystems.userId, userId),
        eq(memorySystems.name, name),
        eq(memorySystems.type, type)
      ));
  }

  /**
   * Add a memory across multiple memory systems
   */
  async addMemoryToMultipleSystems(
    userId: number,
    entry: MemoryEntry,
    systems: { type: MemoryType, name: string }[]
  ): Promise<void> {
    for (const system of systems) {
      const memorySystem = await this.getMemorySystem(userId, system.type, system.name);
      await memorySystem.addMemory(entry);
    }
  }

  /**
   * Search across multiple memory systems and combine results
   */
  async searchAcrossMemorySystems(
    userId: number,
    query: string,
    systems: { type: MemoryType, name: string }[],
    limit: number = 10
  ): Promise<MemorySearchResult[]> {
    const allResults: MemorySearchResult[] = [];
    
    // Search each system
    for (const system of systems) {
      try {
        const memorySystem = await this.getMemorySystem(userId, system.type, system.name);
        const results = await memorySystem.searchMemories(query, limit);
        allResults.push(...results);
      } catch (error) {
        console.error(`Error searching memory system ${system.name}:`, error);
      }
    }
    
    // De-duplicate by key
    const uniqueResults = new Map<string, MemorySearchResult>();
    for (const result of allResults) {
      // If we already have this key, keep the one with the higher score
      if (uniqueResults.has(result.memory.key)) {
        const existing = uniqueResults.get(result.memory.key)!;
        if (result.score > existing.score) {
          uniqueResults.set(result.memory.key, result);
        }
      } else {
        uniqueResults.set(result.memory.key, result);
      }
    }
    
    // Sort by score and limit
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}