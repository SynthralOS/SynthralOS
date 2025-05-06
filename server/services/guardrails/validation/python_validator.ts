/**
 * Python Validator Service Wrapper
 * 
 * This module provides a wrapper for Python validation services.
 * In development, it mocks the Python validation.
 */

import { spawn } from 'child_process';
import { ValidationResult } from './zod_validator';

// Path to Python validator script (relative to project root)
const PYTHON_VALIDATOR_PATH = './server/services/guardrails/validation/pydantic_validator.py';

/**
 * Execute Python script with the given JSON input
 * 
 * @param scriptPath Path to Python script
 * @param jsonInput JSON input to pass to the script
 * @returns Promise resolving to JSON output from the script
 */
async function executePythonScript(scriptPath: string, jsonInput: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // In production, we would spawn a Python process
    // This is mocked for development purposes
    console.log(`[MOCK] Executing Python script: ${scriptPath}`);
    console.log(`[MOCK] Input: ${JSON.stringify(jsonInput).substring(0, 100)}...`);
    
    // Simulate Python processing time
    setTimeout(() => {
      const mockResult = {
        valid: true,
        errors: [],
        warnings: []
      };
      
      console.log(`[MOCK] Python script completed in ${Date.now() - startTime}ms`);
      console.log(`[MOCK] Output: ${JSON.stringify(mockResult)}`);
      
      resolve(mockResult);
    }, 50);
  });
}

/**
 * Validate agent input using Python's Pydantic
 * 
 * @param input The input to validate
 * @returns Validation result
 */
export async function validateWithPydantic(input: any): Promise<ValidationResult> {
  try {
    const jsonInput = {
      action: 'validate_input',
      data: input
    };
    
    const result = await executePythonScript(PYTHON_VALIDATOR_PATH, jsonInput);
    
    return {
      valid: result.valid,
      errors: result.errors || []
    };
  } catch (error) {
    console.error('Error validating with Pydantic:', error);
    
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Python Validator Service
 * 
 * Wrapper for Python validation services
 */
export class PythonValidator {
  /**
   * Validate agent input against the schema
   * 
   * @param input The input to validate
   * @returns Validation result
   */
  static async validateAgentInput(input: unknown): Promise<ValidationResult> {
    try {
      // In production, we would use the Python validator
      // For development, we use the Zod validator instead
      const { ZodValidator } = await import('./zod_validator');
      return ZodValidator.validateAgentInput(input);
    } catch (error) {
      console.error('Error using Python validator, falling back to Zod:', error);
      
      // If Zod validator is not available, return a mock result
      return {
        valid: true,
        errors: []
      };
    }
  }
}