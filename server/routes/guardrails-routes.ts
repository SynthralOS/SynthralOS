/**
 * Guardrails Routes
 * 
 * API endpoints for managing AI safety guardrails and content moderation
 */

import { Router, Request, Response } from 'express';
import { guardrails, GuardrailLevel, ContentCategory, GuardrailConfig } from '../services/guardrails';
import { logError } from '../services/activity-logger';
import { z } from 'zod';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Get guardrail configuration for a workflow
 */
router.get('/api/guardrails/:workflowId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    // Get the guardrail config
    const config = guardrails.getGuardrailConfig(workflowId);
    
    if (!config) {
      // Return default moderate config if none exists
      return res.status(200).json({
        level: GuardrailLevel.MODERATE,
        enabledCategories: [
          ContentCategory.TOXICITY,
          ContentCategory.HATE_SPEECH,
          ContentCategory.SELF_HARM,
          ContentCategory.JAILBREAK,
          ContentCategory.PROMPT_INJECTION
        ],
        // Default values for other fields - omitted for brevity
        active: false,
        message: "No configuration set yet, showing default moderate level"
      });
    }
    
    res.status(200).json({
      ...config,
      active: true
    });
  } catch (error) {
    logError(
      'get_guardrail_config_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving guardrail configuration',
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Set guardrail configuration for a workflow
 */
const guardrailConfigSchema = z.object({
  level: z.enum([
    GuardrailLevel.STRICT, 
    GuardrailLevel.MODERATE, 
    GuardrailLevel.MINIMAL, 
    GuardrailLevel.CUSTOM, 
    GuardrailLevel.NONE
  ]),
  enabledCategories: z.array(z.nativeEnum(ContentCategory)).optional(),
  thresholds: z.record(z.nativeEnum(ContentCategory), z.number().min(0).max(1)).optional().transform(
    thresholds => thresholds as Record<ContentCategory, number>
  ),
  allowedTopics: z.array(z.string()).optional(),
  blockedTopics: z.array(z.string()).optional(),
  allowedPatterns: z.array(z.string()).optional(),
  blockedPatterns: z.array(z.string()).optional(),
  customRules: z.record(z.string(), z.any()).optional()
});

router.post('/api/guardrails/:workflowId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    // Validate the request body
    const validation = guardrailConfigSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid guardrail configuration',
        errors: validation.error.format()
      });
    }
    
    // Set the guardrail config
    const config = guardrails.setGuardrailConfig(workflowId, validation.data);
    
    res.status(200).json({
      message: "Guardrail configuration updated successfully",
      config
    });
  } catch (error) {
    logError(
      'set_guardrail_config_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error setting guardrail configuration',
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Check content against guardrails
 */
const contentCheckSchema = z.object({
  content: z.string().min(1, "Content is required"),
  filter: z.boolean().optional().default(false)
});

router.post('/api/guardrails/:workflowId/check', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    // Validate the request body
    const validation = contentCheckSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request',
        errors: validation.error.format()
      });
    }
    
    const { content, filter } = validation.data;
    
    // Check or filter the content based on the filter parameter
    const result = filter
      ? guardrails.filterContent(workflowId, content)
      : guardrails.checkContent(workflowId, content);
    
    res.status(200).json(result);
  } catch (error) {
    logError(
      'check_content_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error checking content',
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Filter content using guardrails
 */
router.post('/api/guardrails/:workflowId/filter', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    // Validate the request body
    const validation = z.object({
      content: z.string().min(1, "Content is required")
    }).safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request',
        errors: validation.error.format()
      });
    }
    
    const { content } = validation.data;
    
    // Filter the content
    const result = guardrails.filterContent(workflowId, content);
    
    res.status(200).json(result);
  } catch (error) {
    logError(
      'filter_content_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error filtering content',
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;