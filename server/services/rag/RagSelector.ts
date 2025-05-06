/**
 * RAG System Selector
 * 
 * This service implements the routing logic for selecting appropriate RAG systems
 * based on conditions like file size, dataset size, query type, etc.
 */

import { RagType } from '@shared/schema';
import { RagDbSwitchNode } from './RagDbSwitchNode';

export interface RagSelectionParams {
  // File/dataset characteristics
  fileSize?: number;             // in bytes
  datasetSize?: number;          // in bytes
  documentCount?: number;        // number of documents
  
  // Query characteristics
  requiresMetadata?: boolean;    // query requires metadata filtering
  requiresKnowledgeGraph?: boolean; // query requires knowledge graph
  
  // System state
  structuredMemory?: boolean;    // requires structured memory
  agentContextRequired?: boolean; // requires agent context
  multiAgentContext?: boolean;   // multi-agent context required
  deltaMemoryMode?: boolean;     // delta memory updates
  
  // User settings and system state
  userPlan?: 'free' | 'pro' | 'enterprise';
  bringYourOwnRag?: boolean;     // user brings their own RAG
  ragSource?: string;            // e.g., 'pinecone', 'weaviate', etc.
  
  // Runtime metrics
  runtimeLatency?: number;       // in ms
  ragFailures?: number;          // count of RAG failures
  
  // Document characteristics
  ocrResultInjected?: boolean;   // OCR results being used
  queryTaggingEnabled?: boolean; // query tagging is enabled
  queryDomain?: string;          // domain of the query
  promptSimilarity?: 'high' | 'medium' | 'low'; // similarity to previous prompts
  ragVersioningEnabled?: boolean; // RAG versioning enabled
}

export class RagSelector {
  private static instance: RagSelector;
  private ragDbSwitch: RagDbSwitchNode;
  
  private constructor() {
    this.ragDbSwitch = new RagDbSwitchNode();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): RagSelector {
    if (!RagSelector.instance) {
      RagSelector.instance = new RagSelector();
    }
    return RagSelector.instance;
  }
  
  /**
   * Select the most appropriate RAG system based on input parameters
   * Implements the routing logic according to the defined switching conditions
   */
  public selectRagSystem(params: RagSelectionParams): RagType {
    // 1. Check for file size < 1MB → LightRAG
    if (params.fileSize !== undefined && params.fileSize < 1048576) {
      console.log('Routing to LightRAG: file_size < 1MB');
      return RagType.LightRAG;
    }
    
    // 2. Check for dataset_size > 1GB → Milvus (approximated with PineconeRAG)
    if (params.datasetSize !== undefined && params.datasetSize > 1073741824) {
      console.log('Routing to Milvus/PineconeRAG: dataset_size > 1GB');
      return RagType.PineconeRAG; // Using Pinecone as a proxy for Milvus
    }
    
    // 3. Check for query.requires_metadata = true → Weaviate
    if (params.requiresMetadata) {
      console.log('Routing to Weaviate: query requires metadata filtering');
      return RagType.SemanticRAG; // Using SemanticRAG as a proxy for Weaviate
    }
    
    // 4. Check for structured_memory = true → Graphiti or Zep
    if (params.structuredMemory) {
      console.log('Routing to Graphiti/Zep: structured_memory = true');
      return RagType.SemanticRAG; // Using SemanticRAG as a proxy for Graphiti/Zep
    }
    
    // 5. Check for bring_your_rag = true && source = Pinecone → User RAG Integration
    if (params.bringYourOwnRag && params.ragSource === 'pinecone') {
      console.log('Routing to User RAG Integration: bring_your_rag = true && source = Pinecone');
      return RagType.PineconeRAG;
    }
    
    // 6. Check for user.plan = free → SupaVec (pgvector)
    if (params.userPlan === 'free') {
      console.log('Routing to SupaVec: user.plan = free');
      return RagType.PgVectorRAG;
    }
    
    // 7. Check for query_tagging_enabled = true → Qdrant
    if (params.queryTaggingEnabled) {
      console.log('Routing to Qdrant: query_tagging_enabled = true');
      return RagType.QdrantRAG;
    }
    
    // 8. Check for ocr_result_injected = true → SupaVec or LightRAG
    if (params.ocrResultInjected) {
      console.log('Routing to SupaVec or LightRAG: ocr_result_injected = true');
      return RagType.PgVectorRAG;
    }
    
    // 9. Check for agent_context_required = true → Mem0
    if (params.agentContextRequired) {
      console.log('Routing to Mem0: agent_context_required = true');
      return RagType.LightRAG; // Using LightRAG as a placeholder for Mem0 integration
    }
    
    // 10. Check for multi-agent_context = true → Mem0 (Shared Memory Space)
    if (params.multiAgentContext) {
      console.log('Routing to Mem0 Shared Memory: multi-agent_context = true');
      return RagType.LightRAG; // Using LightRAG as a placeholder for Mem0 shared memory
    }
    
    // 11. Check for delta_memory_mode = enabled → Context7 → LightRAG first
    if (params.deltaMemoryMode) {
      console.log('Routing to Context7/LightRAG: delta_memory_mode = enabled');
      return RagType.LightRAG;
    }
    
    // 12. Check for query_domain = enterprise_dataset → Milvus or Weaviate
    if (params.queryDomain === 'enterprise_dataset') {
      console.log('Routing to Milvus/Weaviate: query_domain = enterprise_dataset');
      return RagType.PineconeRAG; // Using PineconeRAG as a proxy for Milvus
    }
    
    // 13. Check for runtime_latency > 1s → LightRAG fallback
    if (params.runtimeLatency !== undefined && params.runtimeLatency > 1000) {
      console.log('Routing to LightRAG fallback: runtime_latency > 1s');
      return RagType.LightRAG;
    }
    
    // 14. Check for rag_failures > threshold → Fallback to LightRAG or SupaVec
    if (params.ragFailures !== undefined && params.ragFailures > 5) {
      console.log('Routing to LightRAG/SupaVec fallback: rag_failures > threshold');
      return RagType.LightRAG;
    }
    
    // 15. Check for knowledge_graph_required = true → Graphiti
    if (params.requiresKnowledgeGraph) {
      console.log('Routing to Graphiti: knowledge_graph_required = true');
      return RagType.SemanticRAG; // Using SemanticRAG as a proxy for Graphiti
    }
    
    // 16. Check for prompt_similarity = low → Re-query via SupaVec backup
    if (params.promptSimilarity === 'low') {
      console.log('Routing to SupaVec backup: prompt_similarity = low');
      return RagType.PgVectorRAG;
    }
    
    // 17. Check for rag_versioning_enabled = true → Versioned RAG Logs
    if (params.ragVersioningEnabled) {
      console.log('Routing to Versioned RAG Logs: rag_versioning_enabled = true');
      return RagType.PgVectorRAG; // Using PgVectorRAG for versioned logs in Supabase
    }
    
    // Default to LightRAG if no conditions match
    console.log('Routing to default: LightRAG');
    return RagType.LightRAG;
  }
  
  /**
   * Get a fallback RAG system based on the primary system
   */
  public getFallbackRagSystem(primarySystem: RagType): RagType {
    // Default fallback mapping based on tier
    const fallbackMap: Record<RagType, RagType> = {
      [RagType.LightRAG]: RagType.PgVectorRAG,
      [RagType.PgVectorRAG]: RagType.LightRAG,
      [RagType.PineconeRAG]: RagType.LightRAG,
      [RagType.QdrantRAG]: RagType.LightRAG,
      [RagType.ChromaRAG]: RagType.LightRAG,
      [RagType.SemanticRAG]: RagType.PgVectorRAG,
      [RagType.HybridRAG]: RagType.LightRAG,
      [RagType.CodeRAG]: RagType.PgVectorRAG,
      [RagType.LegalRAG]: RagType.PgVectorRAG,
      [RagType.LlamaIndexRAG]: RagType.LightRAG,
      [RagType.MultimodalRAG]: RagType.ChromaRAG,
      [RagType.Custom]: RagType.LightRAG,
    };
    
    return fallbackMap[primarySystem] || RagType.LightRAG;
  }
  
  /**
   * Get all applicable fallbacks for high reliability scenarios
   * Following the high reliability pattern: LightRAG → SupaVec → requery
   */
  public getHighReliabilityFallbacks(): RagType[] {
    return [RagType.LightRAG, RagType.PgVectorRAG];
  }
}

export default RagSelector.getInstance();