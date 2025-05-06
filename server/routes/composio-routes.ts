/**
 * Composio Integration Routes
 * 
 * This file contains the Express routes for the Composio integration,
 * allowing the frontend to interact with the Composio services.
 */

import { Router } from 'express';
import { storage } from '../storage';
import { log } from '../vite';
import type { Request, Response, NextFunction } from 'express';
import { ComposioClient, ComposioConfig, createComposioClient } from '../services/integrations/composio';
import { 
  composioWorkflows, 
  composioTriggers, 
  composioActions, 
  composioExecutions,
  insertComposioWorkflowSchema,
  insertComposioTriggerSchema,
  insertComposioActionSchema,
  insertComposioExecutionSchema,
  insertComposioConfigSchema,
  ComposioWorkflowStatusType,
  ComposioExecutionStatusType,
  type ComposioWorkflow,
  type ComposioAction,
  type ComposioTrigger,
  type ComposioExecution,
  type InsertComposioWorkflow,
  type InsertComposioTrigger,
  type InsertComposioAction,
  type InsertComposioExecution,
  type InsertComposioConfig
} from '@shared/schema';
import { z } from 'zod';

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const router = Router();

// Cache for Composio clients to avoid creating new ones for each request
const composioClients = new Map<number, ComposioClient>();

/**
 * Get Composio client for a user
 * 
 * @param userId User ID
 * @returns Composio client or null if not configured
 */
async function getComposioClient(userId: number): Promise<ComposioClient | null> {
  // Check if we already have a client for this user
  if (composioClients.has(userId)) {
    return composioClients.get(userId)!;
  }
  
  // Get configuration from database
  const config = await storage.getComposioConfig(userId);
  if (!config) {
    return null;
  }
  
  try {
    // Parse configuration
    const configJson = JSON.parse(config.configJson);
    
    // Create client
    const client = createComposioClient(configJson as ComposioConfig);
    
    // Cache client
    composioClients.set(userId, client);
    
    return client;
  } catch (error) {
    log(`Error creating Composio client: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return null;
  }
}

// Get Composio configuration
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    
    const config = await storage.getComposioConfig(userId);
    
    if (!config) {
      return res.status(404).json({ message: 'Composio configuration not found' });
    }
    
    res.json(config);
  } catch (error) {
    log(`Error fetching Composio configuration: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio configuration' });
  }
});

// Save Composio configuration
router.post('/config', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const { configJson } = req.body;
    
    // Validate input
    if (!configJson) {
      return res.status(400).json({ message: 'Configuration JSON is required' });
    }
    
    try {
      // Test connection with the provided configuration
      const configObj = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
      const client = createComposioClient(configObj as ComposioConfig);
      
      // Test the connection (we could add a testConnection method to the ComposioClient class)
      const success = await client.testConnection();
      
      if (!success) {
        return res.status(400).json({ message: 'Configuration validation failed' });
      }
      
      // Validate against schema
      const validatedData = insertComposioConfigSchema.parse({
        userId,
        configJson: typeof configJson === 'string' ? configJson : JSON.stringify(configJson)
      });
      
      // Save to database
      const savedConfig = await storage.saveComposioConfig(userId, validatedData);
      
      // Update cached client
      composioClients.set(userId, client);
      
      res.json(savedConfig);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid configuration format', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error saving Composio configuration: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to save Composio configuration' });
  }
});

// Get all workflows
router.get('/workflows', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    
    const workflows = await storage.getComposioWorkflows(userId);
    res.json(workflows);
  } catch (error) {
    log(`Error fetching Composio workflows: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio workflows' });
  }
});

// Get a specific workflow
router.get('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Parse id to integer, handle invalid values
    const workflowId = parseInt(id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    const workflow = await storage.getComposioWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    // Check if user has access to this workflow
    if (workflow.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(workflow);
  } catch (error) {
    log(`Error fetching Composio workflow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio workflow' });
  }
});

// Create a new workflow
router.post('/workflows', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    
    try {
      // Create a valid workflow object with properly typed status enum
      // Process the input status value to ensure it's a valid enum value
      let statusValue: ComposioWorkflowStatusType = ComposioWorkflowStatusType.DRAFT;
      
      if (req.body.status && 
          Object.values(ComposioWorkflowStatusType).includes(req.body.status)) {
        statusValue = req.body.status as ComposioWorkflowStatusType;
      }
      
      // Create workflow data object with properly typed status
      const workflowData: InsertComposioWorkflow = {
        name: req.body.name,
        workflowId: req.body.workflowId,
        userId,
        definition: req.body.definition || {},
        status: statusValue,
        description: req.body.description,
        version: req.body.version || 1
      };
      
      // Validate using Zod schema
      const validatedData = insertComposioWorkflowSchema.parse(workflowData);
      
      // Create the workflow
      const newWorkflow = await storage.createComposioWorkflow(validatedData);
      
      res.status(201).json(newWorkflow);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid workflow data', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error creating Composio workflow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to create Composio workflow' });
  }
});

// Update a workflow
router.put('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Parse id to integer, handle invalid values
    const workflowId = parseInt(id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Get existing workflow
    const existingWorkflow = await storage.getComposioWorkflow(workflowId);
    if (!existingWorkflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    // Check if user has access to this workflow
    if (existingWorkflow.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    try {
      // Validate the update data
      const updates = {
        ...req.body,
        updatedAt: new Date()
      };
      
      // Update the workflow
      const updatedWorkflow = await storage.updateComposioWorkflow(workflowId, updates);
      
      res.json(updatedWorkflow);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid workflow data', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error updating Composio workflow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to update Composio workflow' });
  }
});

// Delete a workflow
router.delete('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Parse id to integer, handle invalid values
    const workflowId = parseInt(id);
    if (isNaN(workflowId)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Get existing workflow
    const existingWorkflow = await storage.getComposioWorkflow(workflowId);
    if (!existingWorkflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    // Check if user has access to this workflow
    if (existingWorkflow.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Delete the workflow
    const result = await storage.deleteComposioWorkflow(workflowId);
    
    if (result) {
      res.status(204).end();
    } else {
      res.status(500).json({ message: 'Failed to delete workflow' });
    }
  } catch (error) {
    log(`Error deleting Composio workflow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to delete Composio workflow' });
  }
});

// Get triggers for a workflow
router.get('/workflows/:workflowId/triggers', isAuthenticated, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Parse id to integer, handle invalid values
    const workflowIdNum = parseInt(workflowId);
    if (isNaN(workflowIdNum)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Verify workflow exists and user has access
    const workflow = await storage.getComposioWorkflow(workflowIdNum);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (workflow.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const triggers = await storage.getComposioTriggers(workflowIdNum);
    res.json(triggers);
  } catch (error) {
    log(`Error fetching Composio triggers: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio triggers' });
  }
});

// Create a trigger for a workflow
router.post('/workflows/:workflowId/triggers', isAuthenticated, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    const userId = user.id;
    
    // Parse id to integer, handle invalid values
    const workflowIdNum = parseInt(workflowId);
    if (isNaN(workflowIdNum)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Verify workflow exists and user has access
    const workflow = await storage.getComposioWorkflow(workflowIdNum);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    try {
      // Validate trigger data
      const validatedData = insertComposioTriggerSchema.parse({
        ...req.body,
        userId,
        workflowId: workflowIdNum,
        configuration: req.body.configuration || {}
      });
      
      // Create the trigger
      const newTrigger = await storage.createComposioTrigger(validatedData);
      
      res.status(201).json(newTrigger);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid trigger data', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error creating Composio trigger: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to create Composio trigger' });
  }
});

// Get actions for a workflow
router.get('/workflows/:workflowId/actions', isAuthenticated, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Parse id to integer, handle invalid values
    const workflowIdNum = parseInt(workflowId);
    if (isNaN(workflowIdNum)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Verify workflow exists and user has access
    const workflow = await storage.getComposioWorkflow(workflowIdNum);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (workflow.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const actions = await storage.getComposioActions(workflowIdNum);
    res.json(actions);
  } catch (error) {
    log(`Error fetching Composio actions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio actions' });
  }
});

// Create an action for a workflow
router.post('/workflows/:workflowId/actions', isAuthenticated, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    const userId = user.id;
    
    // Parse id to integer, handle invalid values
    const workflowIdNum = parseInt(workflowId);
    if (isNaN(workflowIdNum)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Verify workflow exists and user has access
    const workflow = await storage.getComposioWorkflow(workflowIdNum);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    try {
      // Validate action data
      const validatedData = insertComposioActionSchema.parse({
        ...req.body,
        userId,
        workflowId: workflowIdNum,
        configuration: req.body.configuration || {}
      });
      
      // Create the action
      const newAction = await storage.createComposioAction(validatedData);
      
      res.status(201).json(newAction);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid action data', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error creating Composio action: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to create Composio action' });
  }
});

// Get executions for a user or workflow
router.get('/executions', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const { workflowId } = req.query;
    
    let workflowIdParam: number | undefined = undefined;
    
    // If workflowId is specified, validate it
    if (workflowId) {
      workflowIdParam = parseInt(workflowId as string);
      if (isNaN(workflowIdParam)) {
        return res.status(400).json({ message: 'Invalid workflow ID' });
      }
      
      // Verify user has access to this workflow
      const workflow = await storage.getComposioWorkflow(workflowIdParam);
      if (workflow && workflow.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const executions = await storage.getComposioExecutions(userId, workflowIdParam);
    res.json(executions);
  } catch (error) {
    log(`Error fetching Composio executions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio executions' });
  }
});

// Get a specific execution
router.get('/executions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    // Parse id to integer, handle invalid values
    const executionId = parseInt(id);
    if (isNaN(executionId)) {
      return res.status(400).json({ message: 'Invalid execution ID' });
    }
    
    const execution = await storage.getComposioExecution(executionId);
    
    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }
    
    // Check if user has access to this execution
    if (execution.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(execution);
  } catch (error) {
    log(`Error fetching Composio execution: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to fetch Composio execution' });
  }
});

// Create a new execution
router.post('/executions', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    const { workflowId, triggerId, executionId, input } = req.body;
    
    if (!workflowId || !executionId) {
      return res.status(400).json({ message: 'Workflow ID and execution ID are required' });
    }
    
    // Parse workflowId to integer
    const workflowIdNum = parseInt(workflowId);
    if (isNaN(workflowIdNum)) {
      return res.status(400).json({ message: 'Invalid workflow ID' });
    }
    
    // Verify workflow exists and user has access
    const workflow = await storage.getComposioWorkflow(workflowIdNum);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Handle triggerId if present
    let triggerIdNum = null;
    if (triggerId) {
      const triggerIdParsed = parseInt(triggerId);
      if (isNaN(triggerIdParsed)) {
        return res.status(400).json({ message: 'Invalid trigger ID' });
      }
      
      const trigger = await storage.getComposioTrigger(triggerIdParsed);
      if (!trigger) {
        return res.status(404).json({ message: 'Trigger not found' });
      }
      
      // Verify trigger belongs to this workflow
      if (trigger.workflowId !== workflowIdNum) {
        return res.status(400).json({ message: 'Trigger does not belong to specified workflow' });
      }
      
      triggerIdNum = trigger.id;
    }
    
    try {
      // Prepare the execution data with explicit typing
      const executionData: InsertComposioExecution = {
        userId,
        workflowId: workflowIdNum,
        triggerId: triggerIdNum,
        executionId,
        status: ComposioExecutionStatusType.PENDING,
        startTime: new Date(),
        input: input || {}
      };
      
      // Validate with Zod schema
      const validatedData = insertComposioExecutionSchema.parse(executionData);
      
      // Create the execution
      const newExecution = await storage.createComposioExecution(validatedData);
      
      res.status(201).json(newExecution);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid execution data', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error creating Composio execution: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to create Composio execution' });
  }
});

// Update an execution
router.put('/executions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    const { status, output, error } = req.body;
    
    // Parse id to integer, handle invalid values
    const executionId = parseInt(id);
    if (isNaN(executionId)) {
      return res.status(400).json({ message: 'Invalid execution ID' });
    }
    
    // Get existing execution
    const existingExecution = await storage.getComposioExecution(executionId);
    if (!existingExecution) {
      return res.status(404).json({ message: 'Execution not found' });
    }
    
    // Check if user has access to this execution
    if (existingExecution.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    try {
      // Prepare updates object
      const updates: Partial<typeof composioExecutions.$inferSelect> = {
        output,
        error
      };
      
      // Handle status update with proper enum type
      if (status) {
        updates.status = status as ComposioExecutionStatusType;
        
        // If status is completed or failed, set end time
        if (status === ComposioExecutionStatusType.COMPLETED || status === ComposioExecutionStatusType.FAILED) {
          updates.endTime = new Date();
        }
      }
      
      // If status is provided, ensure it's a valid enum value
      if (updates.status && typeof updates.status === 'string') {
        // Convert string status to enum
        if (Object.values(ComposioExecutionStatusType).includes(updates.status as any)) {
          updates.status = updates.status as ComposioExecutionStatusType;
        } else {
          return res.status(400).json({ message: 'Invalid execution status' });
        }
      }
      
      // Update the execution
      const updatedExecution = await storage.updateComposioExecution(executionId, updates);
      
      res.json(updatedExecution);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid execution data', errors: validationError.errors });
      }
      throw validationError;
    }
  } catch (error) {
    log(`Error updating Composio execution: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    res.status(500).json({ message: 'Failed to update Composio execution' });
  }
});

export default router;