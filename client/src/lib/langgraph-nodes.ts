// LangGraph Node Schemas
import { z } from 'zod';

// Schema for the LangGraph State Node
export const LangGraphStateNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  stateType: z.enum(['graph', 'agent', 'conversation']),
  stateDefinition: z.record(z.any()).optional(),
  initialState: z.record(z.any()).optional(),
});

// Schema for the LangGraph Node
export const LangGraphNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  functionDefinition: z.string().optional(),
  inputVariables: z.array(z.string()).optional(),
  outputVariables: z.array(z.string()).optional(),
});

// Schema for the LangGraph Edge
export const LangGraphEdgeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sourceNode: z.string().min(1, 'Source node is required'),
  targetNode: z.string().min(1, 'Target node is required'),
  condition: z.string().optional(),
});

// Schema for the LangGraph Conditional Node
export const LangGraphConditionalNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  conditions: z.array(z.object({
    condition: z.string().min(1, 'Condition is required'),
    targetNodeId: z.string().min(1, 'Target node is required'),
  })),
});

// Schema for the Agent Node
export const AgentNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  agentType: z.string().min(1, 'Agent type is required'),
  modelName: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
  maxIterations: z.number().min(1).optional(),
});

// Schema for the Agent Supervisor Node
export const AgentSupervisorNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  modelName: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
  agentIds: z.array(z.string()).optional(),
});

// Schema for the Memory Store Node
export const MemoryStoreNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  memoryType: z.string().min(1, 'Memory type is required'),
  capacity: z.number().min(1).optional(),
  persistenceType: z.string().optional(),
});

// Schema for the Context Retriever Node
export const ContextRetrieverNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  retrieverType: z.string().min(1, 'Retriever type is required'),
  topK: z.number().min(1).optional(),
});

// Schema for the Tool Node
export const ToolNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  toolType: z.string().min(1, 'Tool type is required'),
  functionDefinition: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

// Schema for the Tool Executor Node
export const ToolExecutorNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  toolIds: z.array(z.string()).optional(),
});

// Schema for the Conversation Chain Node
export const ConversationChainNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  modelName: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
});

// Schema for the Conversation Router Node
export const ConversationRouterNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  modelName: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
  routes: z.array(z.object({
    name: z.string().min(1, 'Route name is required'),
    description: z.string().optional(),
    targetNodeId: z.string().optional(),
  })),
});

// Schema for the Output Parser Node
export const OutputParserNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parserType: z.string().min(1, 'Parser type is required'),
  parserDefinition: z.string().optional(),
});

// Schema for the Output Formatter Node
export const OutputFormatterNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  formatType: z.string().min(1, 'Format type is required'),
  formatTemplate: z.string().optional(),
});