/**
 * Agent Routes
 * 
 * API endpoints for interacting with the AgentFramework
 */

import express from 'express';
import { z } from 'zod';
import { configureAgentFramework, mapAgentTypeToProtocol, checkApiKeys } from '../services/agent/configureAgentFramework';
import { ProtocolCapabilities, AgentTool } from '../services/agent';
import { AgentStrength } from '../services/agent/AgentOperationLayer';
import { log } from '../vite';
import { isAuthenticated } from '../middleware/auth';
import { promptGuardrailsMiddleware, completionGuardrailsMiddleware } from '../middleware/guardrails';
import { WebSocketEvent } from '../types';

const router = express.Router();

// Initialize agent framework
let agentFramework: any = null;
const initializeAgentFramework = async () => {
  if (!agentFramework) {
    agentFramework = await configureAgentFramework();
  }
  return agentFramework;
};

/**
 * Validate API keys middleware
 */
const validateApiKeys = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const keys = checkApiKeys();
  
  if (keys.missing.length > 0) {
    return res.status(400).json({
      message: `Missing required API keys: ${keys.missing.join(', ')}`,
      missingKeys: keys.missing
    });
  }
  
  next();
};

// Schema for execute endpoint
const executeSchema = z.object({
  task: z.string().min(1, "Task is required"),
  protocol: z.string().optional(),
  agentType: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  tools: z.array(z.string()).optional()
});

/**
 * Execute a task with an agent
 */
router.post('/api/agent/execute', isAuthenticated, validateApiKeys, promptGuardrailsMiddleware, async (req, res) => {
  try {
    const validation = executeSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: validation.error.errors
      });
    }
    
    const { task, protocol, agentType, capabilities, config, tools } = validation.data;
    
    // Initialize agent framework if not already done
    const framework = await initializeAgentFramework();
    
    // Determine which protocol to use
    let protocolName = protocol;
    if (!protocolName && agentType) {
      protocolName = mapAgentTypeToProtocol(agentType);
    }
    
    // Map capabilities strings to enum values
    const requiredCapabilities = capabilities?.map(cap => {
      // Simple mapping from string to enum
      return cap as unknown as ProtocolCapabilities;
    }) || [];
    
    // Set up request context to be included in execution response
    const requestContext = {
      userId: req.user?.id,
      requestTime: new Date(),
      userAgent: req.headers['user-agent']
    };
    
    // Set up WebSocket callbacks if sendWebSocketEvent is available on req
    const callbacks = (req as any).sendWebSocketEvent ? {
      onStart: () => {
        (req as any).sendWebSocketEvent({
          type: 'execution_started',
          data: {
            task,
            protocol: protocolName || 'auto',
            timestamp: new Date()
          }
        } as WebSocketEvent);
      },
      onComplete: (response: any) => {
        (req as any).sendWebSocketEvent({
          type: 'execution_completed',
          data: {
            task,
            protocol: protocolName || 'auto',
            timestamp: new Date(),
            response: response.response
          }
        } as WebSocketEvent);
      },
      onError: (error: Error) => {
        (req as any).sendWebSocketEvent({
          type: 'execution_failed',
          data: {
            task,
            protocol: protocolName || 'auto',
            timestamp: new Date(),
            error: error.message
          }
        } as WebSocketEvent);
      },
      onStep: (step: any) => {
        (req as any).sendWebSocketEvent({
          type: 'node_execution_update',
          data: {
            step,
            timestamp: new Date()
          }
        } as WebSocketEvent);
      },
      onToolUse: (toolUse: any) => {
        (req as any).sendWebSocketEvent({
          type: 'langgraph_tool_execution',
          data: {
            tool: toolUse.toolName,
            input: toolUse.input,
            output: toolUse.output,
            error: toolUse.error,
            timestamp: new Date()
          }
        } as WebSocketEvent);
      }
    } : undefined;
    
    // Set up execution configuration
    const executionConfig = {
      ...(config || {}),
      metadata: {
        ...((config || {}).metadata || {}),
        requestContext
      }
    };
    
    // Execute the task
    let result;
    if (protocolName) {
      // Execute with specific protocol
      result = await framework.executeWithProtocol(
        protocolName,
        task,
        { context: { requestContext }, callbacks },
        executionConfig
      );
    } else {
      // Auto-select protocol
      result = await framework.execute(
        task,
        { context: { requestContext }, callbacks },
        executionConfig,
        requiredCapabilities
      );
    }
    
    // Log in database if needed (could track usage, etc.)
    
    // Return result
    res.json(result);
  } catch (error) {
    log(`Error in agent execution: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error executing agent task",
      error: (error as Error).message
    });
  }
});

/**
 * Get all supported protocols
 */
router.get('/api/agent/protocols', async (req, res) => {
  try {
    // Initialize agent framework if not already done
    const framework = await initializeAgentFramework();
    
    // Get all protocols
    const protocols = framework.getAllProtocols();
    
    res.json({
      protocols: protocols.map(p => ({
        name: p.name,
        version: p.metadata.version,
        description: p.metadata.description,
        capabilities: p.metadata.capabilities
      }))
    });
  } catch (error) {
    log(`Error getting protocols: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error retrieving protocols",
      error: (error as Error).message
    });
  }
});

/**
 * Get all available tools
 */
router.get('/api/agent/tools', async (req, res) => {
  try {
    // Initialize agent framework if not already done
    const framework = await initializeAgentFramework();
    
    // Get all tools
    const tools = framework.getConfig().defaultTools;
    
    res.json({
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: Object.entries(tool.parameters).map(([name, info]) => ({
          name,
          type: info.type,
          description: info.description,
          required: info.required || false
        }))
      }))
    });
  } catch (error) {
    log(`Error getting tools: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error retrieving tools",
      error: (error as Error).message
    });
  }
});

/**
 * Check API key status
 */
router.get('/api/agent/api-keys', isAuthenticated, async (req, res) => {
  const keys = checkApiKeys();
  
  res.json({
    status: keys.missing.length === 0 ? 'ok' : 'missing',
    providers: {
      anthropic: keys.anthropic,
      openai: keys.openai
    },
    missing: keys.missing
  });
});

/**
 * Get the status of a job from the guardrails system
 */
router.get('/api/agent/job/:jobId', isAuthenticated, async (req, res) => {
  const jobStatus = (req as any).jobStatus;
  
  if (!jobStatus) {
    return res.status(404).json({
      message: `Job ${req.params.jobId} not found`
    });
  }
  
  res.json({
    id: jobStatus.id,
    status: jobStatus.status,
    task: jobStatus.data?.task,
    protocol: jobStatus.data?.protocol,
    attempt: jobStatus.data?.attempt,
    history: jobStatus.data?.history,
    result: jobStatus.result
  });
});

/**
 * Get agent protocols categorized by strength
 */
router.get('/api/agent/protocols/by-strength/:strength?', async (req, res) => {
  try {
    // Handle case when no strength parameter is provided
    if (!req.params.strength) {
      return res.status(400).json({
        message: "Strength parameter is required",
        validStrengths: Object.values(AgentStrength)
      });
    }
    
    // Use the value directly from the enum rather than trying to lookup by name
    const strengthValue = req.params.strength.toLowerCase();
    
    // Find the matching enum value regardless of case
    const strength = Object.values(AgentStrength).find(
      s => s.toLowerCase() === strengthValue
    );
    
    if (!strength) {
      return res.status(400).json({
        message: `Invalid strength category: ${req.params.strength}`,
        validStrengths: Object.values(AgentStrength)
      });
    }
    
    // Initialize agent framework if not already done
    const framework = await initializeAgentFramework();
    
    // Get protocols by strength
    const protocols = framework.getProtocolsByStrength(strength as AgentStrength);
    
    res.json({
      strength: req.params.strength,
      protocols: protocols.map(p => ({
        name: p.name,
        version: p.metadata.version,
        description: p.metadata.description,
        capabilities: p.metadata.capabilities
      }))
    });
  } catch (error) {
    log(`Error getting protocols by strength: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error retrieving protocols by strength",
      error: (error as Error).message
    });
  }
});

/**
 * Get all available strength categories
 */
router.get('/api/agent/strengths', async (req, res) => {
  try {
    // Get all strength categories with human-readable names
    const strengths = Object.entries(AgentStrength).map(([key, value]) => ({
      key,
      value,
      humanReadable: key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }));
    
    res.json({ strengths });
  } catch (error) {
    log(`Error getting strength categories: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error retrieving strength categories",
      error: (error as Error).message
    });
  }
});

/**
 * Get protocol classifications
 */
router.get('/api/agent/classifications', async (req, res) => {
  try {
    // Initialize agent framework if not already done
    const framework = await initializeAgentFramework();
    
    // Get all protocol classifications
    const classifications = framework.getProtocolClassifications();
    
    res.json({ classifications });
  } catch (error) {
    log(`Error getting protocol classifications: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error retrieving protocol classifications",
      error: (error as Error).message
    });
  }
});

/**
 * Get recommended protocols for a task
 */
router.post('/api/agent/recommend', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task || typeof task !== 'string' || task.trim() === '') {
      return res.status(400).json({
        message: "Task is required"
      });
    }
    
    // Initialize agent framework if not already done
    const framework = await initializeAgentFramework();
    
    // Get recommended protocols
    const recommendations = await framework.getRecommendedProtocols(task);
    
    res.json(recommendations);
  } catch (error) {
    log(`Error getting protocol recommendations: ${error}`, 'agent');
    
    res.status(500).json({
      message: "Error retrieving protocol recommendations",
      error: (error as Error).message
    });
  }
});

export default router;