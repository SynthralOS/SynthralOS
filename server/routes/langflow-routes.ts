/**
 * Langflow Routes
 * 
 * This file defines the API routes for integrating with Langflow
 * for visual workflow creation and editing.
 */

import { Router } from 'express';
import { z } from 'zod';
import { langflowService } from '../services/langflow';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Schema for workflow import/export
const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  data: z.any()
});

// Schema for workflow execution
const executeWorkflowSchema = z.object({
  inputs: z.record(z.any())
});

// Schema for workflow conversion
const convertWorkflowSchema = z.object({
  workflowId: z.number().int().positive()
});

// Schema for workflow sync
const syncWorkflowSchema = z.object({
  workflowId: z.number().int().positive(),
  langflowId: z.string().min(1, 'Langflow ID is required')
});

// Schema for Langflow API configuration
const configSchema = z.object({
  apiUrl: z.string().url('Invalid URL format'),
  apiKey: z.string().min(1, 'API key is required')
});

// Check if Langflow integration is available
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await langflowService.isAvailable();
    
    // Enhanced status with version and feature info
    res.json({
      status: isAvailable ? 'operational' : 'unavailable',
      available: isAvailable,
      version: 'v1.0.0',
      api_url: process.env.LANGFLOW_API_URL || 'http://localhost:7860',
      features: {
        components: true,
        visualization: true,
        execution: true,
        conversion: true
      },
      nodeTypes: {
        llm: ['ChatOpenAI', 'ChatAnthropic'],
        chains: ['LLMChain', 'RetrievalQAChain', 'SummarizeChain'],
        agents: ['OpenAIFunctionsAgent', 'ReActAgent'],
        memory: ['BufferMemory', 'ConversationSummaryMemory'],
        tools: ['SearchTool', 'CalculatorTool', 'WebBrowserTool'],
        vectorStores: ['PGVectorStore', 'ChromaStore', 'PineconeStore']
      }
    });
  } catch (error) {
    console.error('Error checking Langflow status:', error);
    res.status(500).json({ error: 'Failed to check Langflow status' });
  }
});

// Configure Langflow API connection
router.post('/config', isAuthenticated, async (req, res) => {
  try {
    const { apiUrl, apiKey } = configSchema.parse(req.body);
    
    // Update environment variables
    process.env.LANGFLOW_API_URL = apiUrl;
    process.env.LANGFLOW_API_KEY = apiKey;
    
    // Set API key in service
    langflowService.setApiKey(apiKey);
    
    // Check if we can connect
    const isAvailable = await langflowService.isAvailable();
    
    if (!isAvailable) {
      return res.status(400).json({ 
        error: 'Could not connect to Langflow with provided credentials' 
      });
    }
    
    res.json({ success: true, message: 'Langflow API configured successfully' });
  } catch (error) {
    console.error('Error configuring Langflow API:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to configure Langflow API' });
  }
});

// Get available components from Langflow
router.get('/components', isAuthenticated, async (req, res) => {
  try {
    const components = await langflowService.getComponents();
    res.json(components);
  } catch (error) {
    console.error('Error fetching Langflow components:', error);
    res.status(500).json({ error: 'Failed to fetch Langflow components' });
  }
});

// Import a workflow to Langflow
router.post('/import', isAuthenticated, async (req, res) => {
  try {
    const workflowData = workflowSchema.parse(req.body);
    const workflow = await langflowService.importWorkflow(workflowData);
    res.json(workflow);
  } catch (error) {
    console.error('Error importing workflow to Langflow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to import workflow to Langflow' });
  }
});

// Export a workflow from Langflow
router.get('/export/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const workflowData = await langflowService.exportWorkflow(id);
    res.json(workflowData);
  } catch (error) {
    console.error('Error exporting workflow from Langflow:', error);
    res.status(500).json({ error: 'Failed to export workflow from Langflow' });
  }
});

// Create a new workflow in Langflow
router.post('/workflows', isAuthenticated, async (req, res) => {
  try {
    const { name, description, data } = workflowSchema.parse(req.body);
    const workflow = await langflowService.createWorkflow(name, description, data);
    res.json(workflow);
  } catch (error) {
    console.error('Error creating Langflow workflow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create Langflow workflow' });
  }
});

// Get a workflow from Langflow
router.get('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await langflowService.getWorkflow(id);
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching Langflow workflow:', error);
    res.status(500).json({ error: 'Failed to fetch Langflow workflow' });
  }
});

// Update a workflow in Langflow
router.put('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const workflowData = workflowSchema.parse(req.body);
    const workflow = await langflowService.updateWorkflow(id, workflowData);
    res.json(workflow);
  } catch (error) {
    console.error('Error updating Langflow workflow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to update Langflow workflow' });
  }
});

// Delete a workflow from Langflow
router.delete('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await langflowService.deleteWorkflow(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting Langflow workflow:', error);
    res.status(500).json({ error: 'Failed to delete Langflow workflow' });
  }
});

// Execute a workflow in Langflow
router.post('/workflows/:id/execute', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { inputs } = executeWorkflowSchema.parse(req.body);
    const result = await langflowService.executeWorkflow(id, inputs);
    res.json(result);
  } catch (error) {
    console.error('Error executing Langflow workflow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to execute Langflow workflow' });
  }
});

// Convert a SynthralOS workflow to Langflow
router.post('/convert/to-langflow', isAuthenticated, async (req, res) => {
  try {
    const { workflowId } = convertWorkflowSchema.parse(req.body);
    const langflowWorkflow = await langflowService.convertToLangflow(workflowId);
    res.json(langflowWorkflow);
  } catch (error) {
    console.error('Error converting workflow to Langflow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to convert workflow to Langflow' });
  }
});

// Convert a Langflow workflow to SynthralOS
router.post('/convert/from-langflow/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const synthralOSData = await langflowService.convertFromLangflow(id);
    res.json(synthralOSData);
  } catch (error) {
    console.error('Error converting Langflow workflow to SynthralOS:', error);
    res.status(500).json({ error: 'Failed to convert Langflow workflow to SynthralOS' });
  }
});

// Sync a workflow between SynthralOS and Langflow
router.post('/sync', isAuthenticated, async (req, res) => {
  try {
    const { workflowId, langflowId } = syncWorkflowSchema.parse(req.body);
    const success = await langflowService.syncWorkflow(workflowId, langflowId);
    res.json({ success });
  } catch (error) {
    console.error('Error syncing workflow with Langflow:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to sync workflow with Langflow' });
  }
});

export default router;