/**
 * Guardrails Middleware
 * 
 * This middleware enforces safety, security, and compliance
 * guardrails for AI system interactions. It can be applied to
 * both incoming prompts and outgoing completions.
 */

import type { Request, Response, NextFunction } from 'express';
import { guardrails, GuardrailResult, ContentCategory } from '../services/guardrails';
import { log } from '../vite';

/**
 * Middleware to apply guardrails to prompt content
 * 
 * This middleware evaluates incoming prompt content against configured guardrails
 * and either allows it to proceed, modifies it, or rejects it based on policy.
 */
export const promptGuardrailsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = req.body.prompt || req.body.task || req.body.message?.content || req.body.messages?.[req.body.messages.length - 1]?.content;
    
    if (!content) {
      return next(); // No content to evaluate
    }
    
    // Get workflow ID or generate a default one
    const workflowId = (req.body.workflowId || req.query.workflowId || 'default').toString();
    
    // Check content against guardrails
    const result = guardrails.checkContent(workflowId, content);
    
    // Apply guardrail result
    if (!result.allowed) {
      log(`Guardrails blocked prompt: ${result.blockReason}`, 'guardrails');
      
      return res.status(403).json({
        message: 'Content violates guardrails policy',
        reason: result.blockReason,
        categories: result.detections.map(d => d.category),
        risk: result.risk,
        processedAt: result.processedAt
      });
    }
    
    // If filtering is desired, we could replace with filtered content
    if (result.detections.length > 0 && result.risk !== 'none') {
      // Get filtered content
      const filteredResult = guardrails.filterContent(workflowId, content);
      
      if (filteredResult.filteredContent !== content) {
        log(`Guardrails modified prompt`, 'guardrails');
        
        // Replace the original content with filtered content
        if (req.body.prompt) {
          req.body.prompt = filteredResult.filteredContent;
        } else if (req.body.task) {
          req.body.task = filteredResult.filteredContent;
        } else if (req.body.message?.content) {
          req.body.message.content = filteredResult.filteredContent;
        } else if (req.body.messages?.[req.body.messages.length - 1]?.content) {
          req.body.messages[req.body.messages.length - 1].content = filteredResult.filteredContent;
        }
        
        // Add header indicating modification
        res.setHeader('X-Guardrails-Modified', 'true');
      }
    }
    
    // Add result to request for downstream use
    (req as any).guardrailsResult = result;
    
    next();
  } catch (error) {
    log(`Error in guardrails middleware: ${error}`, 'guardrails');
    next(error);
  }
};

/**
 * Middleware to apply guardrails to completion/response content
 * 
 * This middleware evaluates outgoing AI-generated content against configured guardrails
 * and either allows it to proceed, modifies it, or blocks it based on policy.
 */
export const completionGuardrailsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Store the original send function
  const originalSend = res.send;
  
  // Override the send function
  res.send = function(body: any): Response {
    // Only process JSON responses
    if (typeof body === 'string' && body.startsWith('{') && body.endsWith('}')) {
      try {
        const responseBody = JSON.parse(body);
        const content = responseBody.completion || responseBody.response || responseBody.output || responseBody.generated_text;
        
        if (content) {
          // Get workflow ID or generate a default one
          const workflowId = (req.body.workflowId || req.query.workflowId || 'default').toString();
          
          // Check content against guardrails (async but we don't wait)
          guardrails.checkContent(workflowId, content);
          
          // We could add headers here to indicate risk level, but for now just log
          const filterResult = guardrails.filterContent(workflowId, content);
          
          if (!filterResult.allowed) {
            // Log the blocked content but don't modify response as it's too late
            log(`Guardrails detected blocked content in response: ${filterResult.blockReason}`, 'guardrails');
          } else if (filterResult.filteredContent !== content) {
            // Log the modification but don't modify response as it's too late
            log(`Guardrails would have modified response content (risk: ${filterResult.risk})`, 'guardrails');
          }
        }
      } catch (error) {
        // If we can't parse the JSON, just pass it through
        log(`Error parsing JSON in guardrails middleware: ${error}`, 'guardrails');
      }
    }
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Function to process guardrails asynchronously
 * 
 * This is useful for streaming responses where you need to
 * post-process the response after it's been sent.
 */
export async function processCompletionGuardrails(
  content: string,
  workflowId: string = 'default',
  filter: boolean = false
): Promise<GuardrailResult> {
  try {
    const result = filter 
      ? guardrails.filterContent(workflowId, content)
      : guardrails.checkContent(workflowId, content);
    
    return result;
  } catch (error) {
    log(`Error in async guardrails processing: ${error}`, 'guardrails');
    throw error;
  }
}