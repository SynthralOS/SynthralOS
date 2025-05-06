// LangChain Node Schemas
import { z } from 'zod';

// Schema for the LangChain LLM Chain Node
export const LangChainLLMChainSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  promptTemplate: z.string().min(1, 'Prompt template is required'),
  outputKey: z.string().default('result'),
  temperature: z.number().min(0).max(1).default(0.7),
  model: z.enum(['anthropic', 'openai']).default('anthropic'),
  verbose: z.boolean().default(false),
  maxTokens: z.number().optional(),
});

// Schema for the LangChain Agent Node
export const LangChainAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  systemMessage: z.string().min(1, 'System message is required'),
  tools: z.array(z.string()).min(1, 'At least one tool is required'),
  temperature: z.number().min(0).max(1).default(0.7),
  model: z.enum(['anthropic', 'openai']).default('anthropic'),
  verbose: z.boolean().default(false),
  maxTokens: z.number().optional(),
});

// Schema for the LangChain Retrieval Node
export const LangChainRetrievalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  promptTemplate: z.string().min(1, 'Prompt template is required'),
  collectionId: z.number().min(1, 'Collection ID is required'),
  returnSourceDocuments: z.boolean().default(false),
  topK: z.number().min(1).max(20).default(3),
  temperature: z.number().min(0).max(1).default(0.7),
  model: z.enum(['anthropic', 'openai']).default('anthropic'),
});

// Schema for the LangChain Memory Node
export const LangChainMemorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  memoryType: z.enum(['buffer', 'summary', 'vector']).default('buffer'),
  capacity: z.number().min(1).max(100).default(10),
  persistence: z.boolean().default(false),
  inputKey: z.string().default('input'),
  outputKey: z.string().default('output'),
});