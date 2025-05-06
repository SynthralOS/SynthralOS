/**
 * LangChain Routes
 * 
 * This file defines the API routes for using LangChain functionality
 * including chains, agents, and retrieval mechanisms.
 */

import { Router } from 'express';
import { z } from 'zod';
import { langchainService } from '../services/langchain';
import { isAuthenticated } from '../middleware/auth';
import { DynamicTool } from '@langchain/core/tools';
import { db } from '../db';
import { vectorCollections } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get LangChain service status
router.get('/status', (req, res) => {
  const modelAvailability = {
    openai: process.env.OPENAI_API_KEY ? 'available' : 'unavailable',
    anthropic: process.env.ANTHROPIC_API_KEY ? 'available' : 'unavailable'
  };
  
  res.json({
    status: 'operational',
    version: 'v1.0.0',
    initialized: langchainService.isInitialized, 
    modelAvailability,
    features: {
      chains: true,
      agents: true,
      retrieval: true,
      memory: true
    }
  });
});

// Schema for simple chain creation
const createChainSchema = z.object({
  promptTemplate: z.string().min(1, 'Prompt template is required'),
  options: z.record(z.any()).optional()
});

// Schema for retrieval chain creation
const createRetrievalChainSchema = z.object({
  collectionId: z.number().int().positive(),
  promptTemplate: z.string().min(1, 'Prompt template is required'),
  options: z.record(z.any()).optional()
});

// Schema for agent creation
const createAgentSchema = z.object({
  tools: z.array(z.record(z.any())),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  options: z.record(z.any()).optional()
});

// Schema for chain execution
const executeChainSchema = z.object({
  input: z.record(z.any())
});

// Schema for agent execution
const executeAgentSchema = z.object({
  input: z.record(z.any()),
  verbose: z.boolean().optional()
});

// Create a simple chain
router.post('/chains/simple', isAuthenticated, async (req, res) => {
  try {
    const { promptTemplate, options } = createChainSchema.parse(req.body);
    
    // Create the chain
    const chain = langchainService.createSimpleChain(promptTemplate, options);
    
    // Return a session ID that can be used to reference this chain later
    const sessionId = `chain_${Date.now()}`;
    
    // In a real implementation, we would store the chain in a session
    // or database for later reference
    
    res.json({
      success: true,
      sessionId,
      type: 'simple_chain',
      config: {
        promptTemplate,
        options
      }
    });
  } catch (error) {
    console.error('Error creating simple chain:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create simple chain' });
  }
});

// Create a retrieval chain
router.post('/chains/retrieval', isAuthenticated, async (req, res) => {
  try {
    const { collectionId, promptTemplate, options } = createRetrievalChainSchema.parse(req.body);
    
    // Validate collection exists (the service will throw if not)
    await langchainService.createRetrievalChain(collectionId, promptTemplate, options);
    
    // Return a session ID that can be used to reference this chain later
    const sessionId = `retrieval_chain_${Date.now()}`;
    
    // In a real implementation, we would store the chain in a session
    // or database for later reference
    
    res.json({
      success: true,
      sessionId,
      type: 'retrieval_chain',
      config: {
        collectionId,
        promptTemplate,
        options
      }
    });
  } catch (error) {
    console.error('Error creating retrieval chain:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create retrieval chain' });
  }
});

// Create an agent
router.post('/agents', isAuthenticated, async (req, res) => {
  try {
    const { tools, systemPrompt, options } = createAgentSchema.parse(req.body);
    
    // Convert the raw tool specs to LangChain Tool instances
    const langchainTools = tools.map(toolSpec => {
      return new DynamicTool({
        name: toolSpec.name,
        description: toolSpec.description,
        func: async (input: string) => {
          // In a real implementation, we would actually execute the tool
          // For now, we'll just return a canned response
          return `Tool ${toolSpec.name} executed with input: ${input}`;
        }
      });
    });
    
    // Create the agent
    await langchainService.createAgent(langchainTools, systemPrompt, options);
    
    // Return a session ID that can be used to reference this agent later
    const sessionId = `agent_${Date.now()}`;
    
    // In a real implementation, we would store the agent in a session
    // or database for later reference
    
    res.json({
      success: true,
      sessionId,
      type: 'agent',
      config: {
        tools: tools.map(tool => ({ name: tool.name, description: tool.description })),
        systemPrompt,
        options
      }
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Execute a chain
router.post('/chains/:sessionId/execute', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { input } = executeChainSchema.parse(req.body);
    
    // In a real implementation, we would retrieve the chain from a session
    // or database using the sessionId
    
    // For now, we'll create a simple chain for demonstration
    const chain = langchainService.createSimpleChain("You are a helpful assistant. Answer the following question: {question}");
    
    // Execute the chain
    const result = await chain.invoke({ question: input.question || "What is LangChain?" });
    
    res.json({
      success: true,
      result,
      sessionId
    });
  } catch (error) {
    console.error('Error executing chain:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to execute chain' });
  }
});

// Execute an agent
router.post('/agents/:sessionId/execute', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { input, verbose } = executeAgentSchema.parse(req.body);
    
    // In a real implementation, we would retrieve the agent from a session
    // or database using the sessionId
    
    // For now, we'll create a simple agent for demonstration
    const demoTool = new DynamicTool({
      name: "search",
      description: "Useful for searching the web",
      func: async (input: string) => `Search results for: ${input}`
    });
    
    const agent = await langchainService.createAgent(
      [demoTool],
      "You are a helpful assistant with access to tools."
    );
    
    // Execute the agent
    const result = await agent.invoke({
      input: input.query || "What's the weather in San Francisco?",
      verbose: verbose
    });
    
    res.json({
      success: true,
      result: {
        output: result.output,
        intermediateSteps: result.intermediateSteps
      },
      sessionId
    });
  } catch (error) {
    console.error('Error executing agent:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to execute agent' });
  }
});

// Get available tools
router.get('/tools', async (req, res) => {
  try {
    // In a real implementation, we would fetch available tools from a registry
    // For demo purposes, we'll return a list of demo tools
    const availableTools = [
      {
        name: "web-search",
        description: "Search the web for information",
        parameters: {
          query: {
            type: "string",
            description: "The search query",
            required: true
          }
        }
      },
      {
        name: "calculator",
        description: "Perform calculations",
        parameters: {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate",
            required: true
          }
        }
      },
      {
        name: "weather",
        description: "Get weather information for a location",
        parameters: {
          location: {
            type: "string",
            description: "The location to get weather for",
            required: true
          },
          unit: {
            type: "string",
            description: "Temperature unit (celsius/fahrenheit)",
            required: false,
            default: "celsius"
          }
        }
      }
    ];
    
    res.json(availableTools);
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ error: 'Failed to fetch available tools' });
  }
});

// Execute a direct chain (simplified API for the UI)
router.post('/chain', async (req, res) => {
  try {
    const { promptTemplate, input, options } = req.body;
    
    // Start timing
    const startTime = Date.now();
    
    // Create the chain
    const chain = langchainService.createSimpleChain(promptTemplate, options);
    
    // Execute the chain
    const result = await chain.invoke({ input });
    
    // Calculate execution time
    const timeTaken = (Date.now() - startTime) / 1000;
    
    // Estimate token usage (simplified, would be provided by the model in production)
    const totalTokens = Math.ceil((promptTemplate.length + input.length + result.length) / 4);
    
    res.json({
      result,
      totalTokens,
      timeTaken
    });
  } catch (error) {
    console.error('Error executing chain:', error);
    res.status(500).json({ error: 'Failed to execute chain' });
  }
});

// Execute a retrieval chain (simplified API for the UI)
router.post('/retrieval', async (req, res) => {
  try {
    const { collectionId, promptTemplate, query, options } = req.body;
    
    // Start timing
    const startTime = Date.now();
    
    // For the simplified API, we'll simply check if the collection exists in the database
    // without requiring user authentication
    const [collection] = await db.select()
      .from(vectorCollections)
      .where(eq(vectorCollections.id, collectionId));
      
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    // Create the retrieval chain
    const chain = await langchainService.createRetrievalChain(collectionId, promptTemplate, options);
    
    // Execute the chain
    const result = await chain.invoke({ query });
    
    // Calculate execution time
    const timeTaken = (Date.now() - startTime) / 1000;
    
    // Estimate token usage (simplified)
    const totalTokens = Math.ceil((promptTemplate.length + query.length + result.length) / 4);
    
    res.json({
      result,
      totalTokens,
      timeTaken
    });
  } catch (error) {
    console.error('Error executing retrieval chain:', error);
    res.status(500).json({ error: 'Failed to execute retrieval chain' });
  }
});

// Execute an agent (simplified API for the UI)
router.post('/agent', async (req, res) => {
  try {
    const { systemMessage, tools, query, options } = req.body;
    
    // Start timing
    const startTime = Date.now();
    
    // Convert the named tools to LangChain Tool instances
    const availableTools = [
      new DynamicTool({
        name: "web-search",
        description: "Search the web for information",
        func: async (input: string) => `Search results for: ${input}`
      }),
      new DynamicTool({
        name: "calculator",
        description: "Perform calculations",
        func: async (input: string) => {
          try {
            // Simple evaluation for demo purposes
            return String(eval(input));
          } catch (e: any) {
            return `Error calculating: ${e.message}`;
          }
        }
      }),
      new DynamicTool({
        name: "weather",
        description: "Get weather information for a location",
        func: async (input: string) => `Weather for ${input}: Partly cloudy, 22°C`
      })
    ];
    
    // Filter to only the requested tools
    const selectedTools = availableTools.filter(tool => 
      tools.includes(tool.name)
    );
    
    // Create the agent
    const agent = await langchainService.createAgent(
      selectedTools,
      systemMessage,
      options
    );
    
    // Execute the agent
    const result = await agent.invoke({
      input: query,
      verbose: options?.verbose || false
    });
    
    // Calculate execution time
    const timeTaken = (Date.now() - startTime) / 1000;
    
    // Estimate token usage (simplified)
    const totalTokens = Math.ceil((systemMessage.length + query.length + result.output.length) / 4);
    
    res.json({
      result: result.output,
      steps: result.intermediateSteps,
      totalTokens,
      timeTaken
    });
  } catch (error) {
    console.error('Error executing agent:', error);
    res.status(500).json({ error: 'Failed to execute agent' });
  }
});

export default router;