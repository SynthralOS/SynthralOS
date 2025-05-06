import { Router } from 'express';
import workflowService from '../services/workflow/WorkflowService';
import { db } from '../db';
import { workflows, Node, Edge, WorkflowData, workflowDataSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { apiRequest } from '@/lib/queryClient';

const router = Router();

/**
 * @route GET /api/workflows/executions
 * @description Get all active workflow executions
 */
router.get('/executions', async (req, res) => {
  try {
    const activeExecutions = Array.from(workflowService.getActiveExecutions());
    
    // Get execution contexts for each active execution
    const executionDetails = activeExecutions.map(executionId => {
      const context = workflowService.getExecutionContext(executionId);
      return {
        executionId,
        workflowId: context?.workflowId,
        status: context?.status,
        startTime: context?.startTime,
        lastError: context?.lastError
      };
    });
    
    res.json(executionDetails);
  } catch (error: any) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ message: 'Failed to fetch executions' });
  }
});

/**
 * @route GET /api/workflows/executions/:executionId
 * @description Get details for a specific workflow execution
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const context = workflowService.getExecutionContext(executionId);
    
    if (!context) {
      return res.status(404).json({ message: 'Execution not found' });
    }
    
    res.json({
      executionId,
      workflowId: context.workflowId,
      status: context.status,
      startTime: context.startTime,
      variables: context.variables,
      nodeResults: context.nodeResults,
      lastError: context.lastError
    });
  } catch (error: any) {
    console.error('Error fetching execution details:', error);
    res.status(500).json({ message: 'Failed to fetch execution details' });
  }
});

/**
 * @route POST /api/workflows/:id/execute
 * @description Execute a workflow
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const { variables } = req.body || {};
    
    // Fetch workflow from database
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
    
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    
    // Execute workflow
    const workflowData = workflowDataSchema.parse(workflow.data);
    
    // Ensure all nodes have a data property
    const validatedNodes = (workflowData.nodes || []).map(node => {
      return {
        ...node,
        data: node.data || {} // Ensure data property is present and not null/undefined
      };
    });
    
    const executionId = await workflowService.executeWorkflow(
      workflowId,
      {
        nodes: validatedNodes,
        edges: workflowData.edges || []
      },
      variables || {}
    );
    
    res.status(200).json({ executionId });
  } catch (error: any) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ message: 'Failed to execute workflow', error: error.message });
  }
});

/**
 * @route POST /api/workflows/executions/:executionId/stop
 * @description Stop a running workflow execution
 */
router.post('/executions/:executionId/stop', async (req, res) => {
  try {
    const { executionId } = req.params;
    const stopped = workflowService.stopExecution(executionId);
    
    if (!stopped) {
      return res.status(400).json({ message: 'Execution not found or already completed' });
    }
    
    res.status(200).json({ message: 'Execution stopped successfully' });
  } catch (error: any) {
    console.error('Error stopping execution:', error);
    res.status(500).json({ message: 'Failed to stop execution', error: error.message });
  }
});

/**
 * @route GET /api/workflows/:id/history
 * @description Get execution history for a workflow
 */
router.get('/:id/history', async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const history = workflowService.getExecutionHistory(workflowId);
    
    // Get details for each execution
    const executionDetails = history.map(executionId => {
      const context = workflowService.getExecutionContext(executionId);
      return {
        executionId,
        status: context?.status,
        startTime: context?.startTime,
        lastError: context?.lastError
      };
    });
    
    res.json(executionDetails);
  } catch (error: any) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({ message: 'Failed to fetch execution history' });
  }
});

/**
 * @route POST /api/workflows/execute
 * @description Execute a workflow (saved or unsaved)
 */
router.post('/execute', async (req, res) => {
  try {
    const { workflowId, nodes, edges, variables } = req.body;
    
    // Validate that either workflowId or nodes/edges are provided
    if (!workflowId && (!nodes || !edges)) {
      return res.status(400).json({ 
        message: 'Either workflowId or workflow definition (nodes and edges) must be provided' 
      });
    }
    
    let workflow = null;
    let workflowDef = null;
    
    // If workflowId is provided, fetch the workflow
    if (workflowId) {
      const result = await db.select().from(workflows).where(eq(workflows.id, workflowId));
      workflow = result[0];
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      workflowDef = workflow.data;
    } else {
      // Use provided nodes and edges
      workflowDef = { nodes, edges };
    }
    
    // Validate workflow structure
    if (!workflowDef || !workflowDef.nodes || !workflowDef.edges) {
      return res.status(400).json({ message: 'Invalid workflow definition' });
    }
    
    // Start execution
    const executionId = await workflowService.executeWorkflow(
      workflowId || 0,  // Use 0 for temporary workflows
      {
        nodes: workflowDef.nodes || [],
        edges: workflowDef.edges || []
      },
      variables || {}
    );
    
    res.status(201).json({ 
      executionId,
      message: 'Workflow execution started successfully'
    });
  } catch (error: any) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ 
      message: 'Failed to execute workflow', 
      error: error.message 
    });
  }
});

export default router;