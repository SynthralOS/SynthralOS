/**
 * Memory System Selector
 * 
 * This service implements the routing logic for selecting appropriate memory systems
 * based on conditions like workflow requirements, shared agent state, document structure, etc.
 */

import { MemoryType } from '@shared/schema';
import { MemoryService } from './MemoryService';

export enum MemoryWorkloadType {
  CONVERSATION = 'conversation',       // Standard conversation history
  KNOWLEDGE_BASE = 'knowledge_base',   // Document storage and retrieval
  AGENT_STATE = 'agent_state',         // Agent working memory
  WORKFLOW_STATE = 'workflow_state',   // Workflow execution state
  VECTORDB_STORAGE = 'vectordb_storage', // Vector database storage
  STRUCTURED_DATA = 'structured_data'  // Structured data storage
}

export interface MemorySelectionParams {
  // Workflow characteristics
  workflowRequiresMemory?: boolean;     // workflow needs persistent memory
  workloadType?: MemoryWorkloadType;    // type of memory workload
  isMultiModal?: boolean;               // contains multi-modal data (images, audio)
  
  // Agent requirements
  sharedAgentState?: boolean;           // multiple agents need shared state
  agentCount?: number;                  // number of agents sharing memory
  
  // Document characteristics
  documentGraph?: boolean;              // document has graph structure
  documentCount?: number;               // number of documents to store
  averageDocumentSize?: number;         // average document size in bytes
  isHierarchical?: boolean;             // documents have hierarchical structure
  
  // Performance requirements
  latencySensitive?: boolean;           // low latency is critical
  throughputRequirement?: 'low' | 'medium' | 'high'; // throughput needs
  
  // Additional parameters that might affect selection
  memorySize?: number;                  // size of memory in bytes/entries
  historyLength?: number;               // length of conversation history
  structuredData?: boolean;             // data is structured
  userPlan?: 'free' | 'pro' | 'enterprise'; // user's subscription plan
  region?: string;                      // geographical region
  useRAG?: boolean;                     // uses retrieval augmented generation
  needsPersistence?: boolean;           // memory needs to persist across sessions
  
  // Error handling and fallback preferences
  preferHighAvailability?: boolean;     // prefer high availability over features
  customFallbackChain?: MemoryType[];   // custom fallback chain
}

export class MemorySelector {
  private static instance: MemorySelector;
  private memoryService: MemoryService;
  
  private constructor() {
    this.memoryService = MemoryService.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MemorySelector {
    if (!MemorySelector.instance) {
      MemorySelector.instance = new MemorySelector();
    }
    return MemorySelector.instance;
  }
  
  /**
   * Select the most appropriate memory system based on input parameters
   * Implements the routing logic according to the defined switching conditions
   */
  public selectMemorySystem(params: MemorySelectionParams): MemoryType {
    // If high availability is the priority, skip detailed routing and use reliable system
    if (params.preferHighAvailability) {
      console.log('Routing to high availability memory: Mem0');
      return MemoryType.Mem0;
    }
    
    // If custom fallback chain is provided, use the first entry as primary
    if (params.customFallbackChain && params.customFallbackChain.length > 0) {
      console.log(`Routing to custom primary memory: ${params.customFallbackChain[0]}`);
      return params.customFallbackChain[0];
    }
    
    // Handle specific workload types
    if (params.workloadType) {
      switch (params.workloadType) {
        case MemoryWorkloadType.KNOWLEDGE_BASE:
          // Knowledge bases work best with graph-based or vector stores
          console.log('Routing knowledge base workload to graph memory');
          return params.documentGraph ? MemoryType.Graphiti : MemoryType.LlamaIndex;
          
        case MemoryWorkloadType.CONVERSATION:
          // Conversation history works best with specialized conversation stores
          console.log('Routing conversation workload to conversation memory');
          return params.historyLength && params.historyLength > 100 
            ? MemoryType.Zep 
            : MemoryType.Context7;
          
        case MemoryWorkloadType.AGENT_STATE:
          // Agent state works best with Mem0
          console.log('Routing agent state workload to Mem0');
          return MemoryType.Mem0;
          
        case MemoryWorkloadType.WORKFLOW_STATE:
          // Workflow state also works best with Mem0
          console.log('Routing workflow state workload to Mem0');
          return MemoryType.Mem0;
          
        case MemoryWorkloadType.VECTORDB_STORAGE:
          // Vector storage benefits from LlamaIndex
          console.log('Routing vector storage workload to LlamaIndex');
          return MemoryType.LlamaIndex;
          
        case MemoryWorkloadType.STRUCTURED_DATA:
          // Structured data benefits from Graphiti or Mem0
          console.log('Routing structured data workload to specialized memory');
          return params.documentGraph ? MemoryType.Graphiti : MemoryType.Mem0;
      }
    }
    
    // Multi-modal content requires special handling
    if (params.isMultiModal) {
      console.log('Routing multi-modal content to LlamaIndex');
      return MemoryType.LlamaIndex;
    }
    
    // Performance-based routing
    if (params.latencySensitive) {
      console.log('Routing latency-sensitive workload to Mem0');
      return MemoryType.Mem0;
    }
    
    if (params.throughputRequirement === 'high') {
      console.log('Routing high-throughput workload to distributed memory');
      return MemoryType.Zep;
    }
    
    // Document and data characteristics-based routing
    
    // 1. Hierarchical document structure → Graphiti
    if (params.isHierarchical) {
      console.log('Routing hierarchical documents to Graphiti');
      return MemoryType.Graphiti;
    }
    
    // 2. Large document collections → LlamaIndex
    if (params.documentCount && params.documentCount > 1000) {
      console.log('Routing large document collection to LlamaIndex');
      return MemoryType.LlamaIndex;
    }
    
    // 3. Document graph → Graphiti
    if (params.documentGraph) {
      console.log('Routing document graph to Graphiti');
      return MemoryType.Graphiti;
    }
    
    // 4. Very large documents → LlamaIndex with chunking
    if (params.averageDocumentSize && params.averageDocumentSize > 1000000) {
      console.log('Routing large documents to LlamaIndex');
      return MemoryType.LlamaIndex;
    }
    
    // 5. RAG-based workflows → LlamaIndex
    if (params.useRAG) {
      console.log('Routing RAG workflow to LlamaIndex');
      return MemoryType.LlamaIndex;
    }
    
    // 6. Multi-agent shared state → Mem0 (shared zone)
    if (params.sharedAgentState || (params.agentCount && params.agentCount > 1)) {
      console.log('Routing shared agent state to Mem0');
      return MemoryType.Mem0;
    }
    
    // 7. Cross-session persistence → Zep or Context7
    if (params.needsPersistence) {
      console.log('Routing persistent memory to Zep');
      return MemoryType.Zep;
    }
    
    // 8. Regional optimizations
    if (params.region) {
      if (['eu', 'europe', 'uk'].some(r => params.region?.toLowerCase().includes(r))) {
        console.log('Routing EU-based workload to EU-optimized memory');
        return MemoryType.Context7; // Assuming Context7 has EU optimization
      }
      
      if (['asia', 'japan', 'china', 'india'].some(r => params.region?.toLowerCase().includes(r))) {
        console.log('Routing Asia-based workload to Asia-optimized memory');
        return MemoryType.LlamaIndex; // Assuming LlamaIndex has Asia optimization
      }
    }
    
    // Subscription plan-based routing
    if (params.userPlan) {
      if (params.userPlan === 'enterprise') {
        console.log('Routing enterprise workload to premium memory');
        return params.structuredData ? MemoryType.Graphiti : MemoryType.Zep;
      }
      
      if (params.userPlan === 'pro') {
        console.log('Routing pro workload to mid-tier memory');
        return params.structuredData ? MemoryType.LlamaIndex : MemoryType.Context7;
      }
    }
    
    // Long conversation histories benefit from specialized memory
    if (params.historyLength && params.historyLength > 100) {
      console.log('Routing long conversation history to Zep');
      return MemoryType.Zep;
    }
    
    // Default to Mem0 for general purpose memory
    console.log('Routing to default memory: Mem0');
    return MemoryType.Mem0;
  }
  
  /**
   * Get a fallback memory system based on the primary system and workload requirements
   */
  public getFallbackMemorySystem(primarySystem: MemoryType, params?: MemorySelectionParams): MemoryType {
    // If custom fallback chain is provided, use the second entry as fallback
    if (params?.customFallbackChain && params.customFallbackChain.length > 1) {
      console.log(`Using custom fallback memory: ${params.customFallbackChain[1]}`);
      return params.customFallbackChain[1];
    }
    
    // Default fallback mapping based on workload type
    if (params?.workloadType) {
      const workloadBasedFallbacks: Record<MemoryWorkloadType, Record<MemoryType, MemoryType>> = {
        [MemoryWorkloadType.KNOWLEDGE_BASE]: {
          [MemoryType.Graphiti]: MemoryType.LlamaIndex,
          [MemoryType.LlamaIndex]: MemoryType.Mem0,
          [MemoryType.Zep]: MemoryType.LlamaIndex,
          [MemoryType.Context7]: MemoryType.LlamaIndex,
          [MemoryType.Mem0]: MemoryType.LlamaIndex,
          [MemoryType.Custom]: MemoryType.LlamaIndex,
        },
        [MemoryWorkloadType.CONVERSATION]: {
          [MemoryType.Zep]: MemoryType.Context7,
          [MemoryType.Context7]: MemoryType.Mem0,
          [MemoryType.Mem0]: MemoryType.Context7,
          [MemoryType.LlamaIndex]: MemoryType.Context7,
          [MemoryType.Graphiti]: MemoryType.Context7,
          [MemoryType.Custom]: MemoryType.Context7,
        },
        [MemoryWorkloadType.AGENT_STATE]: {
          [MemoryType.Mem0]: MemoryType.Context7,
          [MemoryType.Context7]: MemoryType.Zep,
          [MemoryType.Zep]: MemoryType.Mem0,
          [MemoryType.LlamaIndex]: MemoryType.Mem0,
          [MemoryType.Graphiti]: MemoryType.Mem0,
          [MemoryType.Custom]: MemoryType.Mem0,
        },
        [MemoryWorkloadType.WORKFLOW_STATE]: {
          [MemoryType.Mem0]: MemoryType.Context7,
          [MemoryType.Context7]: MemoryType.Zep,
          [MemoryType.Zep]: MemoryType.Mem0,
          [MemoryType.LlamaIndex]: MemoryType.Mem0,
          [MemoryType.Graphiti]: MemoryType.Mem0,
          [MemoryType.Custom]: MemoryType.Mem0,
        },
        [MemoryWorkloadType.VECTORDB_STORAGE]: {
          [MemoryType.LlamaIndex]: MemoryType.Graphiti,
          [MemoryType.Graphiti]: MemoryType.Mem0,
          [MemoryType.Mem0]: MemoryType.LlamaIndex,
          [MemoryType.Context7]: MemoryType.LlamaIndex,
          [MemoryType.Zep]: MemoryType.LlamaIndex,
          [MemoryType.Custom]: MemoryType.LlamaIndex,
        },
        [MemoryWorkloadType.STRUCTURED_DATA]: {
          [MemoryType.Graphiti]: MemoryType.Mem0,
          [MemoryType.Mem0]: MemoryType.LlamaIndex,
          [MemoryType.LlamaIndex]: MemoryType.Graphiti,
          [MemoryType.Context7]: MemoryType.Mem0,
          [MemoryType.Zep]: MemoryType.Mem0,
          [MemoryType.Custom]: MemoryType.Mem0,
        }
      };
      
      const fallbackMap = workloadBasedFallbacks[params.workloadType];
      if (fallbackMap && fallbackMap[primarySystem]) {
        console.log(`Using workload-specific fallback memory for ${params.workloadType}: ${fallbackMap[primarySystem]}`);
        return fallbackMap[primarySystem];
      }
    }
    
    // Special case for multi-modal content
    if (params?.isMultiModal) {
      const multiModalFallbacks: Record<MemoryType, MemoryType> = {
        [MemoryType.LlamaIndex]: MemoryType.Graphiti,
        [MemoryType.Graphiti]: MemoryType.LlamaIndex,
        [MemoryType.Mem0]: MemoryType.LlamaIndex,
        [MemoryType.Context7]: MemoryType.LlamaIndex,
        [MemoryType.Zep]: MemoryType.LlamaIndex,
        [MemoryType.Custom]: MemoryType.LlamaIndex,
      };
      
      if (multiModalFallbacks[primarySystem]) {
        console.log(`Using multi-modal fallback memory: ${multiModalFallbacks[primarySystem]}`);
        return multiModalFallbacks[primarySystem];
      }
    }
    
    // Regional fallbacks
    if (params?.region) {
      // European region fallbacks
      if (['eu', 'europe', 'uk'].some(r => params.region?.toLowerCase().includes(r))) {
        const euFallbacks: Record<MemoryType, MemoryType> = {
          [MemoryType.Context7]: MemoryType.Mem0,
          [MemoryType.Mem0]: MemoryType.Context7,
          [MemoryType.LlamaIndex]: MemoryType.Context7,
          [MemoryType.Graphiti]: MemoryType.Context7,
          [MemoryType.Zep]: MemoryType.Context7,
          [MemoryType.Custom]: MemoryType.Context7,
        };
        
        if (euFallbacks[primarySystem]) {
          console.log(`Using EU region fallback memory: ${euFallbacks[primarySystem]}`);
          return euFallbacks[primarySystem];
        }
      }
      
      // Asian region fallbacks
      if (['asia', 'japan', 'china', 'india'].some(r => params.region?.toLowerCase().includes(r))) {
        const asiaFallbacks: Record<MemoryType, MemoryType> = {
          [MemoryType.LlamaIndex]: MemoryType.Mem0,
          [MemoryType.Mem0]: MemoryType.LlamaIndex,
          [MemoryType.Context7]: MemoryType.LlamaIndex,
          [MemoryType.Graphiti]: MemoryType.LlamaIndex,
          [MemoryType.Zep]: MemoryType.LlamaIndex,
          [MemoryType.Custom]: MemoryType.LlamaIndex,
        };
        
        if (asiaFallbacks[primarySystem]) {
          console.log(`Using Asia region fallback memory: ${asiaFallbacks[primarySystem]}`);
          return asiaFallbacks[primarySystem];
        }
      }
    }
    
    // Performance-based fallbacks
    if (params?.latencySensitive) {
      const latencyFallbacks: Record<MemoryType, MemoryType> = {
        [MemoryType.Mem0]: MemoryType.Context7,
        [MemoryType.Context7]: MemoryType.Mem0,
        [MemoryType.LlamaIndex]: MemoryType.Mem0,
        [MemoryType.Graphiti]: MemoryType.Mem0,
        [MemoryType.Zep]: MemoryType.Mem0,
        [MemoryType.Custom]: MemoryType.Mem0,
      };
      
      if (latencyFallbacks[primarySystem]) {
        console.log(`Using latency-sensitive fallback memory: ${latencyFallbacks[primarySystem]}`);
        return latencyFallbacks[primarySystem];
      }
    }
    
    if (params?.throughputRequirement === 'high') {
      const throughputFallbacks: Record<MemoryType, MemoryType> = {
        [MemoryType.Zep]: MemoryType.LlamaIndex,
        [MemoryType.LlamaIndex]: MemoryType.Zep,
        [MemoryType.Mem0]: MemoryType.Zep,
        [MemoryType.Context7]: MemoryType.Zep,
        [MemoryType.Graphiti]: MemoryType.Zep,
        [MemoryType.Custom]: MemoryType.Zep,
      };
      
      if (throughputFallbacks[primarySystem]) {
        console.log(`Using high-throughput fallback memory: ${throughputFallbacks[primarySystem]}`);
        return throughputFallbacks[primarySystem];
      }
    }
    
    // Default fallback mapping
    const defaultFallbackMap: Record<MemoryType, MemoryType> = {
      [MemoryType.Mem0]: MemoryType.Context7,
      [MemoryType.Graphiti]: MemoryType.Mem0,
      [MemoryType.Zep]: MemoryType.Mem0,
      [MemoryType.Context7]: MemoryType.Mem0,
      [MemoryType.LlamaIndex]: MemoryType.Mem0,
      [MemoryType.Custom]: MemoryType.Mem0,
    };
    
    console.log(`Using default fallback memory: ${defaultFallbackMap[primarySystem] || MemoryType.Mem0}`);
    return defaultFallbackMap[primarySystem] || MemoryType.Mem0;
  }
  
  /**
   * Create a chain of fallbacks for high reliability
   * @param params Optional selection parameters to customize the chain
   */
  public getHighReliabilityFallbacks(params?: MemorySelectionParams): MemoryType[] {
    // Custom fallback chain takes precedence
    if (params?.customFallbackChain && params.customFallbackChain.length > 0) {
      return params.customFallbackChain;
    }
    
    // Workload-specific fallback chains
    if (params?.workloadType) {
      switch (params.workloadType) {
        case MemoryWorkloadType.KNOWLEDGE_BASE:
          return [MemoryType.LlamaIndex, MemoryType.Graphiti, MemoryType.Mem0];
          
        case MemoryWorkloadType.CONVERSATION:
          return [MemoryType.Context7, MemoryType.Zep, MemoryType.Mem0];
          
        case MemoryWorkloadType.AGENT_STATE:
        case MemoryWorkloadType.WORKFLOW_STATE:
          return [MemoryType.Mem0, MemoryType.Context7, MemoryType.Zep];
          
        case MemoryWorkloadType.VECTORDB_STORAGE:
          return [MemoryType.LlamaIndex, MemoryType.Graphiti, MemoryType.Mem0];
          
        case MemoryWorkloadType.STRUCTURED_DATA:
          return [MemoryType.Graphiti, MemoryType.Mem0, MemoryType.LlamaIndex];
      }
    }
    
    // Multi-modal content chain
    if (params?.isMultiModal) {
      return [MemoryType.LlamaIndex, MemoryType.Graphiti, MemoryType.Mem0];
    }
    
    // Regional optimizations
    if (params?.region) {
      if (['eu', 'europe', 'uk'].some(r => params.region?.toLowerCase().includes(r))) {
        return [MemoryType.Context7, MemoryType.Mem0, MemoryType.LlamaIndex];
      }
      
      if (['asia', 'japan', 'china', 'india'].some(r => params.region?.toLowerCase().includes(r))) {
        return [MemoryType.LlamaIndex, MemoryType.Mem0, MemoryType.Context7];
      }
    }
    
    // Performance-based chains
    if (params?.latencySensitive) {
      return [MemoryType.Mem0, MemoryType.Context7, MemoryType.LlamaIndex];
    }
    
    if (params?.throughputRequirement === 'high') {
      return [MemoryType.Zep, MemoryType.LlamaIndex, MemoryType.Mem0];
    }
    
    // Default high reliability chain
    return [MemoryType.Mem0, MemoryType.Context7, MemoryType.LlamaIndex];
  }
}

export default MemorySelector.getInstance();