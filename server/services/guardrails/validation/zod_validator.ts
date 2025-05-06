/**
 * Zod Validator Service for Agent Input/Output Validation in JavaScript
 *
 * This module provides validation services for agent inputs and outputs using Zod.
 */

import { z } from 'zod';

// Base schema for validating agent inputs
export const agentInputSchema = z.object({
  task: z.string().min(3, "Task must be at least 3 characters long").max(2000, "Task cannot exceed 2000 characters"),
  protocol: z.string().optional(),
  tools: z.array(z.string()).optional(),
  options: z.record(z.unknown()).optional(),
}).refine(data => {
  if (!data.task.trim()) {
    return false;
  }
  return true;
}, {
  message: "Task cannot be empty",
  path: ["task"],
}).refine(data => {
  if (data.protocol !== undefined && !data.protocol.trim()) {
    return false;
  }
  return true;
}, {
  message: "Protocol name cannot be empty if provided",
  path: ["protocol"],
}).superRefine((data, ctx) => {
  const tools = data.tools || [];
  const options = data.options || {};
  
  if (tools.includes('web_search') && options.max_search_results !== undefined) {
    if (typeof options.max_search_results !== 'number' || options.max_search_results <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "max_search_results must be a positive integer",
        path: ["options", "max_search_results"],
      });
    }
  }
});

// Type for the validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Validation service using Zod
export class ZodValidator {
  /**
   * Validate agent input against the schema
   * 
   * @param input The input to validate
   * @returns Validation result
   */
  static validateAgentInput(input: unknown): ValidationResult {
    try {
      agentInputSchema.parse(input);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path ? path + ': ' : ''}${err.message}`;
        });
        return { valid: false, errors };
      }
      return { 
        valid: false, 
        errors: ['Unknown validation error: ' + String(error)]
      };
    }
  }
}