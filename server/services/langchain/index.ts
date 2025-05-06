/**
 * LangChain Service
 * 
 * This service provides integration with LangChain for building AI applications.
 * It includes support for chains, agents, memory, and other LangChain features.
 */

import { log } from '../../vite';
// Core imports from new @langchain packages
import { 
  PromptTemplate, 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate, 
  MessagesPlaceholder,
  SystemMessagePromptTemplate
} from '@langchain/core/prompts';
import { SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { Tool } from '@langchain/core/tools';
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling';

// Imports from original langchain package
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { 
  BufferMemory,
  ConversationSummaryMemory 
} from 'langchain/memory';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';

// Vector store service
import { supavecService } from '../vector-db/supavec';

// Define the LangChain service class
export class LangChainService {
  public isInitialized: boolean = false;

  constructor() {
    log('LangChain service initializing', 'langchain');
    // Check if API keys are available
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      log('Warning: No LLM API keys found (OPENAI_API_KEY or ANTHROPIC_API_KEY). Some features may be limited.', 'langchain');
    }
    this.isInitialized = true;
    log('LangChain service initialized', 'langchain');
  }

  /**
   * Create a chat model instance
   * Prioritizes Anthropic (due to OpenAI rate limits) and falls back to OpenAI if Anthropic is not available
   */
  public createChatModel(options?: any) {
    // If Anthropic API key is available, use it
    if (process.env.ANTHROPIC_API_KEY) {
      // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      return new ChatAnthropic({
        modelName: 'claude-3-7-sonnet-20250219',
        temperature: 0.7,
        ...options,
      });
    }
    
    // Fall back to OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      return new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0.7,
        ...options,
      });
    }
    
    // No API keys available
    throw new Error('No LLM API keys found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.');
  }

  /**
   * Create a simple chain for generating text
   */
  public createSimpleChain(promptTemplate: string, options?: any) {
    const model = this.createChatModel(options);
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    const chain = RunnableSequence.from([
      prompt,
      model,
      new StringOutputParser()
    ]);
    
    return chain;
  }

  /**
   * Create a retrieval chain that uses a vector store
   */
  public async createRetrievalChain(collectionId: number, promptTemplate: string, options?: any) {
    const model = this.createChatModel(options);
    
    // Get the retriever from the vector store
    const retriever = await this.getRetrieverForCollection(collectionId);
    
    // Create the prompt template
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    // Create the chain
    const chain = RunnableSequence.from([
      {
        context: retriever,
        question: new RunnablePassthrough(),
      },
      prompt,
      model,
      new StringOutputParser()
    ]);
    
    return chain;
  }

  /**
   * Create an agent with tools
   */
  public async createAgent(tools: Tool[], systemPrompt: string, options?: any) {
    const model = this.createChatModel(options);
    
    // Create a properly formatted prompt template for the agent
    const prompt = ChatPromptTemplate.fromMessages([
      new SystemMessage(systemPrompt),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
      // The agent_scratchpad represents the previous agent actions and observations
      new MessagesPlaceholder("agent_scratchpad")
    ]);
    
    // Create the agent with the appropriate prompt template
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt
    });
    
    // Create the executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools
    });
    
    return agentExecutor;
  }

  /**
   * Create a memory object for chains or agents
   */
  public createMemory(type: 'buffer' | 'summary' | 'vector' = 'buffer', options?: any) {
    switch (type) {
      case 'buffer':
        return new BufferMemory(options);
      case 'summary':
        return new ConversationSummaryMemory({
          llm: this.createChatModel(),
          ...options
        });
      case 'vector':
        throw new Error('Vector memory not implemented yet');
      default:
        return new BufferMemory(options);
    }
  }

  /**
   * Generate embeddings for text using OpenAI API or fallback to random vector
   * @param text Text to generate embedding for
   * @returns Vector embedding representation
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Since this is a demo, we'll generate a random vector
      // In a production environment, this would call an actual embedding model API
      const dimension = 1536; // OpenAI's standard embedding dimension
      return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Get a retriever for a collection
   */
  private async getRetrieverForCollection(collectionId: number): Promise<VectorStoreRetriever> {
    // For our simplified implementation, we'll create a mock retriever
    // since we don't need actual vector search functionality for the demo
    
    // Create a retriever adapter
    const retriever = {
      getRelevantDocuments: async (query: string) => {
        try {
          // Use the proper search method from the supavecService
          let results = [];
          
          try {
            // Try to get collection first to validate it exists
            const userId = 1; // Mock user ID for development
            const collection = await supavecService.getCollection(collectionId, userId);
            
            if (!collection) {
              console.warn(`Collection with ID ${collectionId} not found`);
              return [];
            }
            
            // Search by text which is the most reliable method
            results = await supavecService.searchByText(
              collectionId,
              1, // Mock user ID for development
              query, 
              { limit: 5 }
            );
          } catch (e) {
            console.warn("Error in vector search:", e);
            // Return empty results if search fails
            results = [];
          }
          
          if (!results || !Array.isArray(results)) {
            console.warn('Vector search returned no valid results');
            return [];
          }
          
          // Convert to LangChain Document format
          return results.map((item: any) => ({
            pageContent: item.content || '',
            metadata: {
              ...item.metadata,
              id: item.id || '',
              objectId: item.objectId || '',
              objectType: item.objectType || 'document'
            }
          }));
        } catch (error) {
          console.error('Error in retriever:', error);
          return [];
        }
      },
      invocationParams: {
        collectionId
      }
    };
    
    return retriever as unknown as VectorStoreRetriever;
  }
}

// Export an instance for direct use
export const langchainService = new LangChainService();