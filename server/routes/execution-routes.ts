/**
 * Workflow Execution Routes
 * 
 * API routes for workflow execution management and monitoring
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { 
  startWorkflowExecution, 
  pauseWorkflowExecution, 
  resumeWorkflowExecution,
  cancelWorkflowExecution,
  executionRegistry
} from '../services/workflow-executor';
import { z } from 'zod';
import { ExecutionStatus } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { sleep } from '../utils';
import { executionStats } from '../services/stats/execution-stats';
import { performanceMonitor } from '../services/stats/performance-monitor';

const router = Router();

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

/**
 * Get executions with pagination and filtering
 */
router.get('/api/executions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.id;
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || null;
    const search = req.query.search as string || '';
    const fromDate = req.query.from ? new Date(req.query.from as string) : null;
    const toDate = req.query.to ? new Date(req.query.to as string) : null;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get executions from storage (this would be customized based on your storage implementation)
    const executions = await storage.getWorkflowExecutionsByUser(userId, {
      limit,
      offset,
      status: status as ExecutionStatus | null,
      search,
      fromDate,
      toDate
    });
    
    // Get total count for pagination
    const total = await storage.countWorkflowExecutionsByUser(userId, {
      status: status as ExecutionStatus | null,
      search,
      fromDate,
      toDate
    });
    
    // Format response with the structure expected by the client
    // Map database execution objects to the client-expected format
    const formattedExecutions = await Promise.all(
      executions.map(async (execution) => {
        // Get workflow information
        const workflow = await storage.getWorkflow(execution.workflowId);
        
        // Get user information for triggered by
        const triggeredByUser = await storage.getUser(execution.triggeredById || 0);
        
        return {
          id: execution.id,
          workflowId: execution.workflowId,
          workflowName: workflow?.name || 'Unknown Workflow',
          status: execution.status,
          startedAt: execution.startedAt.toISOString(),
          completedAt: execution.completedAt ? execution.completedAt.toISOString() : null,
          progress: execution.progress || 0,
          triggeredBy: {
            id: triggeredByUser?.id || 0,
            username: triggeredByUser?.username || 'Unknown User'
          }
        };
      })
    );
    
    res.json({
      executions: formattedExecutions,
      total
    });
  } catch (error) {
    console.error("Error fetching executions:", error);
    res.status(500).json({ 
      message: "Error fetching executions", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Get execution details by ID
 */
router.get('/api/executions/:id/details', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);
    const user = req.user as any;
    
    // Get execution from database
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      return res.status(404).json({ message: "Execution not found" });
    }
    
    // Get workflow to check permissions
    const workflow = await storage.getWorkflow(execution.workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Associated workflow not found" });
    }
    
    // Check permissions
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Get execution logs, node results, and other details
    const logs = await storage.getExecutionLogs(executionId);
    const nodeExecutions = await storage.getNodeExecutions(executionId);
    
    // Check if this is an active execution
    const activeExecution = executionRegistry.get(executionId);
    
    let realTimeStatus = null;
    if (activeExecution) {
      // Get real-time status if execution is active
      realTimeStatus = {
        status: activeExecution.status,
        progress: execution.progress,
        currentNode: activeExecution.currentNodeId,
        elapsedTime: Date.now() - execution.startedAt.getTime(), // in ms
        // Add other real-time details as needed
      };
    }
    
    // Get user information for triggered by
    const triggeredByUser = await storage.getUser(execution.triggeredById || 0);
    
    // Get workflow information for the execution
    const workflowDetails = await storage.getWorkflow(execution.workflowId);
    
    // Format the execution data for the client
    const formattedExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflowDetails?.name || 'Unknown Workflow',
      status: execution.status,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt ? execution.completedAt.toISOString() : null,
      progress: execution.progress || 0,
      triggeredBy: {
        id: triggeredByUser?.id || 0,
        username: triggeredByUser?.username || 'Unknown User'
      },
      duration: execution.completedAt ? 
        (execution.completedAt.getTime() - execution.startedAt.getTime()) : 
        (Date.now() - execution.startedAt.getTime()),
      result: execution.result,
      error: execution.error
    };
    
    // Format the logs
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      message: log.message,
      source: log.source
    }));
    
    // Format the node executions
    const formattedNodeExecutions = nodeExecutions.map(node => ({
      id: node.id,
      nodeId: node.nodeId,
      status: node.status,
      startedAt: node.startedAt.toISOString(),
      completedAt: node.completedAt ? node.completedAt.toISOString() : null,
      input: node.input,
      output: node.output,
      error: node.error,
      duration: node.completedAt ? 
        (node.completedAt.getTime() - node.startedAt.getTime()) : 
        null
    }));
    
    // Return detailed execution information in the expected format
    res.json({
      execution: formattedExecution,
      logs: formattedLogs,
      nodeExecutions: formattedNodeExecutions,
      realTimeStatus,
      workflow: {
        id: workflowDetails?.id,
        name: workflowDetails?.name,
        definition: workflowDetails?.data
      }
    });
  } catch (error) {
    console.error("Error fetching execution details:", error);
    res.status(500).json({ 
      message: "Error fetching execution details", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Start a new workflow execution
 */
router.post('/api/executions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Validate request body
    const schema = z.object({
      workflowId: z.number(),
      inputs: z.record(z.any()).optional(),
    });
    
    const validatedData = schema.parse(req.body);
    
    // Check if workflow exists and user has permission
    const workflow = await storage.getWorkflow(validatedData.workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Create execution record in database
    const execution = await storage.createWorkflowExecution({
      workflowId: validatedData.workflowId,
      status: ExecutionStatus.QUEUED,
      startedAt: new Date(),
      completedAt: null,
      progress: 0,
      triggeredById: user.id,
      result: null,
      error: null,
    });
    
    // Start workflow execution (non-blocking)
    startWorkflowExecution(
      execution.id, 
      workflow, 
      validatedData.inputs || {}
    ).catch(error => {
      console.error("Error starting workflow execution:", error);
    });
    
    // Update stats
    executionStats.recordExecutionStart();
    
    // Return the execution ID
    res.status(201).json({ 
      executionId: execution.id,
      message: "Execution started" 
    });
    
    // For demo/implementation purposes, we'll simulate execution progress
    // This should be removed in production where real execution happens
    simulateWorkflowExecution(execution.id).catch(error => {
      console.error("Error simulating workflow execution:", error);
    });
    
  } catch (error) {
    console.error("Error starting execution:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error starting execution", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Pause a running workflow execution
 */
router.post('/api/executions/:id/pause', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);
    const user = req.user as any;
    
    // Check if execution exists and user has permission
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      return res.status(404).json({ message: "Execution not found" });
    }
    
    const workflow = await storage.getWorkflow(execution.workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Associated workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Check if execution is in a valid state to be paused
    if (execution.status !== ExecutionStatus.RUNNING) {
      return res.status(400).json({ 
        message: `Cannot pause execution with status ${execution.status}` 
      });
    }
    
    // Pause the execution
    const success = await pauseWorkflowExecution(executionId);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to pause execution" });
    }
    
    res.json({ message: "Execution paused successfully" });
  } catch (error) {
    console.error("Error pausing execution:", error);
    res.status(500).json({ 
      message: "Error pausing execution", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Resume a paused workflow execution
 */
router.post('/api/executions/:id/resume', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);
    const user = req.user as any;
    
    // Check if execution exists and user has permission
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      return res.status(404).json({ message: "Execution not found" });
    }
    
    const workflow = await storage.getWorkflow(execution.workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Associated workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Check if execution is in a valid state to be resumed
    if (execution.status !== ExecutionStatus.PAUSED) {
      return res.status(400).json({ 
        message: `Cannot resume execution with status ${execution.status}` 
      });
    }
    
    // Resume the execution
    const success = await resumeWorkflowExecution(executionId);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to resume execution" });
    }
    
    res.json({ message: "Execution resumed successfully" });
  } catch (error) {
    console.error("Error resuming execution:", error);
    res.status(500).json({ 
      message: "Error resuming execution", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Cancel a workflow execution
 */
router.post('/api/executions/:id/cancel', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);
    const user = req.user as any;
    
    // Check if execution exists and user has permission
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      return res.status(404).json({ message: "Execution not found" });
    }
    
    const workflow = await storage.getWorkflow(execution.workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Associated workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Check if execution is in a valid state to be cancelled
    if (![ExecutionStatus.RUNNING, ExecutionStatus.PAUSED, ExecutionStatus.QUEUED].includes(execution.status as ExecutionStatus)) {
      return res.status(400).json({ 
        message: `Cannot cancel execution with status ${execution.status}` 
      });
    }
    
    // Cancel the execution
    const success = await cancelWorkflowExecution(executionId);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to cancel execution" });
    }
    
    res.json({ message: "Execution cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling execution:", error);
    res.status(500).json({ 
      message: "Error cancelling execution", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Get execution statistics
 */
router.get('/api/executions/stats', isAuthenticated, (_req: Request, res: Response) => {
  try {
    const stats = executionStats.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching execution stats:", error);
    res.status(500).json({ 
      message: "Error fetching execution stats", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Get performance metrics for a specific workflow
 */
router.get('/api/performance/:workflowId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Check if workflow exists and user has permission
    const workflow = await storage.getWorkflow(parseInt(workflowId));
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Get metrics for the workflow
    const metrics = performanceMonitor.getMetrics(workflowId);
    const latestMetrics = performanceMonitor.getLatestMetrics(workflowId);
    
    res.json({
      workflowId,
      metrics: metrics.slice(-20), // Return last 20 data points to avoid overwhelming response
      latest: latestMetrics
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ 
      message: "Error fetching performance metrics", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Get performance thresholds for a workflow
 */
router.get('/api/performance/:workflowId/thresholds', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Check if workflow exists and user has permission
    const workflow = await storage.getWorkflow(parseInt(workflowId));
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Get thresholds for the workflow
    const thresholds = performanceMonitor.getThresholds(workflowId);
    
    res.json({
      workflowId,
      thresholds
    });
  } catch (error) {
    console.error("Error fetching performance thresholds:", error);
    res.status(500).json({ 
      message: "Error fetching performance thresholds", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Set performance thresholds for a workflow
 */
router.post('/api/performance/:workflowId/thresholds', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Validate request body
    const schema = z.record(z.object({
      warning: z.number().optional(),
      critical: z.number().optional()
    }));
    
    const thresholds = schema.parse(req.body);
    
    // Check if workflow exists and user has permission
    const workflow = await storage.getWorkflow(parseInt(workflowId));
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Set thresholds for the workflow
    performanceMonitor.setThresholds(workflowId, thresholds);
    
    res.json({
      message: "Performance thresholds updated successfully",
      workflowId,
      thresholds
    });
  } catch (error) {
    console.error("Error updating performance thresholds:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error updating performance thresholds", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Start monitoring a workflow's performance
 */
router.post('/api/performance/:workflowId/monitor', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Validate request body
    const schema = z.object({
      interval: z.number().min(5000).default(60000),
    });
    
    const { interval } = schema.parse(req.body);
    
    // Check if workflow exists and user has permission
    const workflow = await storage.getWorkflow(parseInt(workflowId));
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Start monitoring
    performanceMonitor.startMonitoring(interval);
    
    res.json({
      message: "Performance monitoring started",
      workflowId,
      interval
    });
  } catch (error) {
    console.error("Error starting performance monitoring:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error starting performance monitoring", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Stop monitoring a workflow's performance
 */
router.post('/api/performance/:workflowId/stop', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const user = req.user as any;
    
    // Check if workflow exists and user has permission
    const workflow = await storage.getWorkflow(parseInt(workflowId));
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    
    if (workflow.ownerId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Stop monitoring
    performanceMonitor.stopMonitoring();
    
    res.json({
      message: "Performance monitoring stopped",
      workflowId
    });
  } catch (error) {
    console.error("Error stopping performance monitoring:", error);
    res.status(500).json({ 
      message: "Error stopping performance monitoring", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

/**
 * Helper function to simulate workflow execution progress
 */
async function simulateWorkflowExecution(executionId: number) {
  try {
    // Get the execution
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      console.error(`Execution ${executionId} not found for simulation`);
      return;
    }
    
    // Simulate queued state
    await sleep(1000);
    
    // Update to running
    await storage.updateWorkflowExecution(executionId, {
      status: ExecutionStatus.RUNNING,
    });
    
    // Simulate progress updates
    const totalSteps = 10;
    for (let step = 1; step <= totalSteps; step++) {
      // Random chance to simulate failure
      if (Math.random() < 0.05) { // 5% chance of failure
        await storage.updateWorkflowExecution(executionId, {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          error: "Simulated random failure"
        });
        
        // Update stats
        const duration = Date.now() - execution.startedAt.getTime();
        executionStats.recordExecutionCompletion(duration, false);
        
        return;
      }
      
      // Update progress
      const progress = Math.floor((step / totalSteps) * 100);
      await storage.updateWorkflowExecution(executionId, {
        progress,
      });
      
      // Simulate node execution
      const nodeId = `node-${uuidv4().slice(0, 8)}`;
      await storage.createNodeExecution({
        executionId,
        nodeId,
        status: ExecutionStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        input: { step },
        output: { result: `Result for step ${step}` },
      });
      
      // Add a log entry
      await storage.createExecutionLog({
        executionId,
        timestamp: new Date(),
        level: 'info',
        message: `Completed step ${step} of ${totalSteps}`,
        source: nodeId,
      });
      
      // Random duration between steps (1-3 seconds)
      await sleep(1000 + Math.random() * 2000);
    }
    
    // Complete the execution
    await storage.updateWorkflowExecution(executionId, {
      status: ExecutionStatus.COMPLETED,
      completedAt: new Date(),
      progress: 100,
      result: { message: "Simulation completed successfully" }
    });
    
    // Update stats
    const duration = Date.now() - execution.startedAt.getTime();
    executionStats.recordExecutionCompletion(duration, true);
    
  } catch (error) {
    console.error("Error in execution simulation:", error);
    
    // Try to mark the execution as failed
    try {
      await storage.updateWorkflowExecution(executionId, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        error: `Simulation error: ${error instanceof Error ? error.message : "Unknown error"}`
      });
      
      // Update stats with failure
      const execution = await storage.getWorkflowExecution(executionId);
      if (execution) {
        const duration = Date.now() - execution.startedAt.getTime();
        executionStats.recordExecutionCompletion(duration, false);
      }
    } catch (updateError) {
      console.error("Failed to update execution after simulation error:", updateError);
    }
  }
}

export default router;