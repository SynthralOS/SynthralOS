/**
 * LangGraph Memory Manager
 * 
 * This service manages memory for LangGraph workflows, including conversation history,
 * context retrieval, and state management.
 */

import { Storage as MemoryStorage } from '@langchain/core/memory';
import { BaseMessage } from '@langchain/core/messages';
import { getBaseUrl } from '../utils';

// Memory entry with expiration
interface MemoryEntry<T> {
  data: T;
  expires: number; // Timestamp when this entry expires
}

// Message for conversation history
interface Message {
  role: string;
  content: string;
  timestamp?: number;
}

// Types of memory
type MemoryType = 'buffer' | 'summary' | 'entity' | 'conversational' | 'vector';

// Memory config options
interface MemoryConfig {
  type: MemoryType;
  capacity?: number;
  ttl?: number; // Time to live in milliseconds
  key?: string;
}

/**
 * Memory Manager for LangGraph
 * Handles different types of memory for LangGraph workflows
 */
export class LangGraphMemoryManager {
  private memoryStore: Map<string, MemoryEntry<any>> = new Map();
  private historyStores: Map<string, Message[]> = new Map();
  private bufferStores: Map<string, any[]> = new Map();
  private summaryStores: Map<string, string> = new Map();
  private entityStores: Map<string, Map<string, any>> = new Map();
  private defaultTTL: number = 30 * 60 * 1000; // 30 minutes by default
  private defaultCapacity: number = 10;

  constructor() {
    // Start a periodic cleanup for expired entries
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Clean up expired memory entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    // Clean up memory store
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expires <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Create a memory store
   */
  public createMemory(id: string, config: MemoryConfig): void {
    const { type, capacity = this.defaultCapacity, ttl = this.defaultTTL } = config;
    
    // Initialize the appropriate memory store
    switch (type) {
      case 'buffer':
        this.bufferStores.set(id, []);
        break;
      case 'summary':
        this.summaryStores.set(id, '');
        break;
      case 'entity':
        this.entityStores.set(id, new Map());
        break;
      case 'conversational':
        this.historyStores.set(id, []);
        break;
      // Vector stores would require external embeddings and databases,
      // so we'll keep a placeholder for now
      case 'vector':
        // Placeholder for vector store
        break;
    }
    
    // Store the memory configuration
    this.memoryStore.set(id, {
      data: { type, capacity },
      expires: Date.now() + ttl,
    });
  }

  /**
   * Save data to memory
   */
  public saveToMemory(id: string, data: any): void {
    const memoryEntry = this.memoryStore.get(id);
    
    if (!memoryEntry) {
      throw new Error(`Memory with ID ${id} does not exist`);
    }
    
    const { type, capacity } = memoryEntry.data;
    
    // Handle different memory types
    switch (type) {
      case 'buffer':
        this.saveToBuffer(id, data, capacity);
        break;
      case 'summary':
        this.saveToSummary(id, data);
        break;
      case 'entity':
        this.saveToEntityStore(id, data);
        break;
      case 'conversational':
        this.saveToHistory(id, data, capacity);
        break;
      case 'vector':
        // Placeholder for vector store
        break;
    }
    
    // Refresh the expiration
    memoryEntry.expires = Date.now() + (this.defaultTTL);
    this.memoryStore.set(id, memoryEntry);
  }

  /**
   * Save to buffer memory
   */
  private saveToBuffer(id: string, data: any, capacity: number): void {
    let buffer = this.bufferStores.get(id) || [];
    
    // Add the new data
    buffer.push(data);
    
    // Trim if over capacity
    if (buffer.length > capacity) {
      buffer = buffer.slice(buffer.length - capacity);
    }
    
    this.bufferStores.set(id, buffer);
  }

  /**
   * Save to summary memory
   */
  private saveToSummary(id: string, data: string): void {
    // For summary, we just replace the existing summary
    this.summaryStores.set(id, data);
  }

  /**
   * Save to entity store
   */
  private saveToEntityStore(id: string, data: Record<string, any>): void {
    const entityStore = this.entityStores.get(id) || new Map();
    
    // Update or add entities
    for (const [entityKey, entityValue] of Object.entries(data)) {
      entityStore.set(entityKey, entityValue);
    }
    
    this.entityStores.set(id, entityStore);
  }

  /**
   * Save to conversation history
   */
  private saveToHistory(id: string, message: Message | Message[], capacity: number): void {
    let history = this.historyStores.get(id) || [];
    
    // Add the new message(s)
    if (Array.isArray(message)) {
      history = [...history, ...message];
    } else {
      history.push({
        ...message,
        timestamp: message.timestamp || Date.now(),
      });
    }
    
    // Trim if over capacity
    if (history.length > capacity) {
      history = history.slice(history.length - capacity);
    }
    
    this.historyStores.set(id, history);
  }

  /**
   * Get data from memory
   */
  public getFromMemory(id: string): any {
    const memoryEntry = this.memoryStore.get(id);
    
    if (!memoryEntry) {
      throw new Error(`Memory with ID ${id} does not exist`);
    }
    
    const { type } = memoryEntry.data;
    
    // Refresh the expiration
    memoryEntry.expires = Date.now() + (this.defaultTTL);
    this.memoryStore.set(id, memoryEntry);
    
    // Return data based on memory type
    switch (type) {
      case 'buffer':
        return this.bufferStores.get(id) || [];
      case 'summary':
        return this.summaryStores.get(id) || '';
      case 'entity':
        return Object.fromEntries(this.entityStores.get(id) || new Map());
      case 'conversational':
        return this.historyStores.get(id) || [];
      case 'vector':
        // Placeholder for vector store
        return [];
      default:
        return null;
    }
  }

  /**
   * Clear a memory store
   */
  public clearMemory(id: string): void {
    const memoryEntry = this.memoryStore.get(id);
    
    if (!memoryEntry) {
      return; // No memory to clear
    }
    
    const { type } = memoryEntry.data;
    
    // Clear the specific memory type
    switch (type) {
      case 'buffer':
        this.bufferStores.set(id, []);
        break;
      case 'summary':
        this.summaryStores.set(id, '');
        break;
      case 'entity':
        this.entityStores.set(id, new Map());
        break;
      case 'conversational':
        this.historyStores.set(id, []);
        break;
      case 'vector':
        // Placeholder for vector store
        break;
    }
  }

  /**
   * Get conversation history formatted for an LLM
   */
  public getChatHistory(id: string): BaseMessage[] {
    const history = this.historyStores.get(id) || [];
    
    // Convert to BaseMessage format for LangChain
    return history.map((msg) => {
      if (msg.role === 'user' || msg.role === 'human') {
        return { type: 'human', content: msg.content } as BaseMessage;
      } else if (msg.role === 'assistant' || msg.role === 'ai') {
        return { type: 'ai', content: msg.content } as BaseMessage;
      } else {
        return { type: 'system', content: msg.content } as BaseMessage;
      }
    });
  }

  /**
   * Create a buffer memory adapter for LangChain
   */
  public createBufferMemoryAdapter(id: string): MemoryStorage {
    return {
      loadMemoryVariables: async (inputs: Record<string, any>): Promise<Record<string, any>> => {
        const buffer = this.bufferStores.get(id) || [];
        return { history: buffer };
      },
      saveContext: async (
        inputs: Record<string, any>,
        outputs: Record<string, any>
      ): Promise<void> => {
        const input = inputs.input || inputs.question;
        const output = outputs.output || outputs.answer || outputs.response;
        
        this.saveToMemory(id, { input, output, timestamp: Date.now() });
      },
    };
  }

  /**
   * Create a conversation memory adapter for LangChain
   */
  public createConversationMemoryAdapter(id: string): MemoryStorage {
    return {
      loadMemoryVariables: async (inputs: Record<string, any>): Promise<Record<string, any>> => {
        const history = this.getChatHistory(id);
        return { history };
      },
      saveContext: async (
        inputs: Record<string, any>,
        outputs: Record<string, any>
      ): Promise<void> => {
        const input = inputs.input || inputs.question;
        const output = outputs.output || outputs.answer || outputs.response;
        
        if (input) {
          this.saveToMemory(id, { role: 'human', content: input });
        }
        
        if (output) {
          this.saveToMemory(id, { role: 'ai', content: output });
        }
      },
    };
  }
}