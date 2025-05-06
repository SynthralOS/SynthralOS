/**
 * Runtime Routes
 * 
 * API routes for code execution and runtime management
 */

import express from 'express';
import { z } from 'zod';
import { runtimeService, ExecuteCodeRequest } from '../services/runtime';
import { log } from '../vite';

// Create router
const router = express.Router();

// Schema for execute code request
const executeCodeSchema = z.object({
  runtime: z.string(),
  code: z.string(),
  language: z.string().optional(),
  timeout: z.number().optional(),
  options: z.record(z.any()).optional()
});

/**
 * Set up runtime routes
 */
export default function setupRuntimeRoutes() {
  // Initialize runtime service if needed
  runtimeService.initialize().catch(error => {
    log(`Error initializing runtime service: ${error}`, 'runtime');
  });
  
  /**
   * List available runtimes
   */
  router.get('/runtimes', async (_req, res) => {
    try {
      const runtimes = runtimeService.listRuntimes();
      res.json({ runtimes });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Get a specific runtime's capabilities
   */
  router.get('/runtimes/:name', async (req, res) => {
    try {
      const { name } = req.params;
      
      if (!runtimeService.hasRuntime(name)) {
        return res.status(404).json({ error: `Runtime '${name}' not found` });
      }
      
      const runtime = runtimeService.getRuntime(name);
      const capabilities = runtime.getCapabilities();
      
      res.json({ name, capabilities });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Execute code in a specific runtime
   */
  router.post('/execute', async (req, res) => {
    try {
      const validationResult = executeCodeSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request body',
          details: validationResult.error.format()
        });
      }
      
      const { runtime, code, language, timeout, options } = validationResult.data as ExecuteCodeRequest;
      
      if (!runtimeService.hasRuntime(runtime)) {
        return res.status(404).json({ error: `Runtime '${runtime}' not found` });
      }
      
      const config = {
        timeout,
        options: {
          language,
          ...options
        }
      };
      
      const result = await runtimeService.executeCode(runtime, code, config);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error executing code: ${errorMessage}`, 'runtime');
      res.status(500).json({ error: errorMessage });
    }
  });
  
  /**
   * Health check for runtime service
   */
  router.get('/health', (_req, res) => {
    try {
      const isInitialized = runtimeService.hasRuntime('e2b');
      res.json({ 
        status: isInitialized ? 'healthy' : 'initializing',
        message: isInitialized ? 'Runtime service is healthy' : 'Runtime service is initializing'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ status: 'error', error: errorMessage });
    }
  });
  
  return router;
}