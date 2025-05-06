import { Router } from 'express';
import { MemorySelector, MemorySelectionParams, MemoryWorkloadType } from '../services/memory/MemorySelector';
import { MemoryService } from '../services/memory/MemoryService';
import { MemoryType } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Initialize router
const router = Router();

// Initialize services
const memorySelector = MemorySelector.getInstance();
const memoryService = MemoryService.getInstance();

// Mock data for memory systems
const mockMemorySystems = [
  {
    id: 1,
    name: 'Agent Context Memory',
    type: MemoryType.Mem0,
    isActive: true,
    metrics: {
      memorySize: 256,
      entryCount: 1024,
      avgRetrievalTime: 5,
      hitRate: 0.92,
      lastUpdated: new Date().toISOString()
    },
    createdAt: '2023-01-10T08:00:00Z',
    updatedAt: '2023-07-15T14:30:00Z'
  },
  {
    id: 2,
    name: 'Document Knowledge Graph',
    type: MemoryType.Graphiti,
    isActive: true,
    metrics: {
      memorySize: 512,
      entryCount: 345,
      avgRetrievalTime: 12,
      hitRate: 0.85,
      lastUpdated: new Date().toISOString()
    },
    createdAt: '2023-02-20T09:15:00Z',
    updatedAt: '2023-06-25T11:45:00Z'
  },
  {
    id: 3,
    name: 'Session History',
    type: MemoryType.Zep,
    isActive: true,
    metrics: {
      memorySize: 128,
      entryCount: 1500,
      avgRetrievalTime: 3,
      hitRate: 0.98,
      lastUpdated: new Date().toISOString()
    },
    createdAt: '2023-03-05T14:20:00Z',
    updatedAt: '2023-07-01T16:30:00Z'
  },
  {
    id: 4,
    name: 'Backup Context System',
    type: MemoryType.Context7,
    isActive: false,
    metrics: {
      memorySize: 64,
      entryCount: 0,
      avgRetrievalTime: 0,
      hitRate: 0,
      lastUpdated: new Date().toISOString()
    },
    createdAt: '2023-04-10T08:45:00Z',
    updatedAt: '2023-04-10T08:45:00Z'
  },
  {
    id: 5,
    name: 'Document Index Memory',
    type: MemoryType.LlamaIndex,
    isActive: true,
    metrics: {
      memorySize: 384,
      entryCount: 750,
      avgRetrievalTime: 8,
      hitRate: 0.89,
      lastUpdated: new Date().toISOString()
    },
    createdAt: '2023-05-15T11:30:00Z',
    updatedAt: '2023-06-20T10:15:00Z'
  }
];

// Mock memory entries for demonstration
const mockMemoryEntries = [
  {
    id: 'mem1',
    systemId: 1,
    key: 'agent:state:12345',
    content: 'Agent state information with preferences and context',
    importance: 0.9,
    timestamp: '2023-07-14T08:32:15Z',
    metadata: {
      type: 'agent_state',
      tags: ['preferences', 'context', 'user_info'],
      entities: [
        {
          type: 'user',
          name: 'John Smith',
          importance: 0.8
        },
        {
          type: 'task',
          name: 'Email Summarization',
          importance: 0.7
        }
      ]
    }
  },
  {
    id: 'mem2',
    systemId: 2,
    key: 'knowledge:finance:investing',
    content: 'Structured knowledge about investment strategies and risk management',
    importance: 0.85,
    timestamp: '2023-06-20T14:15:30Z',
    metadata: {
      type: 'knowledge_graph',
      tags: ['finance', 'investing', 'risk_management'],
      entities: [
        {
          type: 'concept',
          name: 'Risk Tolerance',
          importance: 0.9
        },
        {
          type: 'concept',
          name: 'Diversification',
          importance: 0.8
        }
      ],
      relations: [
        {
          source: 'Risk Tolerance',
          target: 'Diversification',
          type: 'influences',
          weight: 0.75
        }
      ]
    }
  },
  {
    id: 'mem3',
    systemId: 3,
    key: 'session:12345:history',
    content: 'User asked about investment strategies for retirement planning',
    importance: 0.7,
    timestamp: '2023-07-12T09:45:20Z',
    metadata: {
      type: 'conversation',
      tags: ['question', 'finance', 'retirement'],
      sentiment: 0.6
    }
  }
];

// Routes

// Get all memory systems
router.get('/systems', (req, res) => {
  res.json(mockMemorySystems);
});

// Get specific memory system
router.get('/systems/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const system = mockMemorySystems.find(s => s.id === id);
  
  if (!system) {
    return res.status(404).json({ message: 'Memory system not found' });
  }
  
  res.json(system);
});

// Select appropriate memory system based on parameters
router.post('/select', (req, res) => {
  try {
    const params: MemorySelectionParams = req.body;
    
    // Log memory selection request for telemetry
    console.log('Memory selection request with parameters:', JSON.stringify(params, null, 2));
    
    // Select the appropriate memory system
    const selectedType = memorySelector.selectMemorySystem(params);
    
    // Get the fallback memory system with context-aware parameters
    const fallbackType = memorySelector.getFallbackMemorySystem(selectedType, params);
    
    // Find the corresponding systems in our mock data
    const selectedSystem = mockMemorySystems.find(s => s.type === selectedType);
    const fallbackSystem = mockMemorySystems.find(s => s.type === fallbackType);
    
    // Get the full reliability chain if requested
    const includeReliabilityChain = req.query.includeReliabilityChain === 'true';
    const reliabilityChain = includeReliabilityChain 
      ? memorySelector.getHighReliabilityFallbacks(params)
      : null;
    
    // Get the reliability systems info if requested
    const reliabilitySystems = reliabilityChain 
      ? reliabilityChain.map(type => mockMemorySystems.find(s => s.type === type)).filter(Boolean)
      : null;
    
    // Format selection rules for better readability
    const selectionRules = Object.keys(params).map(key => ({
      condition: key,
      value: params[key as keyof MemorySelectionParams]
    })).filter(rule => rule.value !== undefined);
    
    // Return the enhanced selection info
    const response = {
      selected: selectedType,
      system: selectedSystem,
      fallback: fallbackType,
      fallbackSystem: fallbackSystem,
      selectionRules,
      ...(includeReliabilityChain && { 
        reliabilityChain,
        reliabilitySystems
      }),
      selectionParams: params,
      timestamp: new Date().toISOString(),
      // Include workload-specific metadata if available
      workloadMetadata: params.workloadType ? {
        workloadType: params.workloadType,
        optimizedFor: getWorkloadOptimizationInfo(params.workloadType),
        multiModalSupport: !!params.isMultiModal,
        regionalOptimization: params.region || null
      } : null
    };
    
    console.log('Memory selection response:', JSON.stringify({
      selected: response.selected,
      fallback: response.fallback,
      ...(includeReliabilityChain && { reliabilityChain })
    }, null, 2));
    
    res.json(response);
  } catch (error: any) {
    console.error('Error selecting memory system:', error);
    res.status(500).json({ 
      error: 'Failed to select memory system',
      message: error.message || String(error)
    });
  }
});

// Helper function to provide workload-specific optimization details
function getWorkloadOptimizationInfo(workloadType: MemoryWorkloadType): string {
  switch (workloadType) {
    case MemoryWorkloadType.CONVERSATION:
      return 'Conversation history with context retention';
    case MemoryWorkloadType.KNOWLEDGE_BASE:
      return 'Knowledge storage with semantic retrieval';
    case MemoryWorkloadType.AGENT_STATE:
      return 'Agent working memory with fast access patterns';
    case MemoryWorkloadType.WORKFLOW_STATE:
      return 'Workflow execution state with transaction support';
    case MemoryWorkloadType.VECTORDB_STORAGE:
      return 'Vector embeddings with efficient similarity search';
    case MemoryWorkloadType.STRUCTURED_DATA:
      return 'Structured data with relationship modeling';
    default:
      return 'General purpose memory';
  }
}

// Get high reliability memory systems with optional context parameters
router.get('/high-reliability', (req, res) => {
  try {
    // Extract optional selection parameters from the query
    const params: Partial<MemorySelectionParams> = {};
    
    // Parse workload type if provided
    if (req.query.workloadType) {
      params.workloadType = req.query.workloadType as MemoryWorkloadType;
    }
    
    // Parse boolean parameters
    if (req.query.isMultiModal) {
      params.isMultiModal = req.query.isMultiModal === 'true';
    }
    
    if (req.query.documentGraph) {
      params.documentGraph = req.query.documentGraph === 'true';
    }
    
    if (req.query.latencySensitive) {
      params.latencySensitive = req.query.latencySensitive === 'true';
    }
    
    // Parse numeric parameters
    if (req.query.documentCount) {
      params.documentCount = parseInt(req.query.documentCount as string, 10);
    }
    
    if (req.query.historyLength) {
      params.historyLength = parseInt(req.query.historyLength as string, 10);
    }
    
    // Parse string parameters
    if (req.query.region) {
      params.region = req.query.region as string;
    }
    
    if (req.query.userPlan) {
      params.userPlan = req.query.userPlan as 'free' | 'pro' | 'enterprise';
    }
    
    // Get the reliability chain with contextual parameters
    const reliabilityChain = memorySelector.getHighReliabilityFallbacks(params as MemorySelectionParams);
    
    // Get the corresponding system details for each memory type in the chain
    const reliabilitySystems = reliabilityChain
      .map(type => mockMemorySystems.find(s => s.type === type))
      .filter(Boolean);
    
    // Return the enhanced reliability information
    res.json({
      fallbacks: reliabilityChain,
      systems: reliabilitySystems,
      contextParams: Object.keys(params).length > 0 ? params : null,
      description: getReliabilityChainDescription(reliabilityChain, params as MemorySelectionParams)
    });
  } catch (error: any) {
    console.error('Error getting high reliability memory systems:', error);
    res.status(500).json({ 
      error: 'Failed to get high reliability memory systems',
      message: error.message || String(error)
    });
  }
});

// Helper function to generate a human-readable description of the reliability chain
function getReliabilityChainDescription(chain: MemoryType[], params?: MemorySelectionParams): string {
  if (!chain.length) {
    return 'No fallback chain available';
  }
  
  let description = `Primary system: ${chain[0]}`;
  
  if (chain.length > 1) {
    description += `, with fallbacks: ${chain.slice(1).join(' → ')}`;
  }
  
  if (params?.workloadType) {
    description += `. Optimized for ${params.workloadType} workloads`;
  }
  
  if (params?.isMultiModal) {
    description += ' with multi-modal support';
  }
  
  if (params?.region) {
    description += ` in the ${params.region} region`;
  }
  
  return description;
}

// Search memory (mock implementation)
router.post('/search', (req, res) => {
  try {
    const { query, memoryType, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    // In a real implementation, this would query the appropriate memory system
    // For now, we'll simulate a delay and return some mock results
    setTimeout(() => {
      const results = [
        {
          id: uuidv4(),
          system: 'Mem0',
          memoryType: MemoryType.Mem0,
          systemName: 'Agent Context Memory',
          content: `Primary agent memory related to "${query}" and associated context.`,
          metadata: {
            type: 'agent_state',
            tags: ['context', 'preference', 'user_info']
          },
          similarity: 0.92,
          timestamp: new Date().toISOString()
        },
        {
          id: uuidv4(),
          system: 'Graphiti',
          memoryType: MemoryType.Graphiti,
          systemName: 'Document Knowledge Graph',
          content: `Graph relationship showing how "${query}" connects to related concepts and entities.`,
          metadata: {
            source: 'knowledge-graph',
            tags: ['relationship', 'connection', 'network']
          },
          similarity: 0.85,
          timestamp: new Date().toISOString()
        },
        {
          id: uuidv4(),
          system: 'Zep',
          memoryType: MemoryType.Zep,
          systemName: 'Session History',
          content: `Previous conversation mentioning "${query}" in dialog context.`,
          metadata: {
            source: 'conversation',
            tags: ['dialog', 'interaction', 'history']
          },
          similarity: 0.78,
          timestamp: new Date().toISOString()
        }
      ];
      
      // Filter by memory type if specified
      const filteredResults = memoryType 
        ? results.filter(r => r.memoryType === memoryType)
        : results;
        
      res.json(filteredResults.slice(0, limit));
    }, 500); // Simulate API latency
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Store memory (mock implementation)
router.post('/store', (req, res) => {
  try {
    const { content, metadata, systemType, importance } = req.body;
    
    if (!content || !systemType) {
      return res.status(400).json({ message: 'Content and system type are required' });
    }
    
    // In a real implementation, this would store to the appropriate memory system
    // For now, we'll simulate success with a new memory ID
    setTimeout(() => {
      const newMemory = {
        id: uuidv4(),
        systemType,
        key: `memory:${Date.now()}`,
        content,
        metadata: metadata || {},
        importance: importance || 0.5,
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        memory: newMemory
      });
    }, 300); // Simulate API latency
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Memory route registration helper
export function registerMemoryRoutes(app: any) {
  app.use('/api/memory', router);
}

export default router;