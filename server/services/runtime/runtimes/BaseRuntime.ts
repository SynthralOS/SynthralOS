/**
 * Base Runtime Class
 * 
 * Abstract class that implements common functionality for all runtime environments
 */

import { Runtime, RuntimeCapabilities, ExecutionResult } from '../types';
import { log } from '../../../vite';

export abstract class BaseRuntime implements Runtime {
  protected readonly name: string;
  protected readonly capabilities: RuntimeCapabilities;
  
  constructor(name: string) {
    this.name = name;
    this.capabilities = this.getDefaultCapabilities();
    log(`Initializing ${name} runtime`, 'runtime');
  }
  
  /**
   * Get the capabilities of this runtime
   */
  getCapabilities(): RuntimeCapabilities {
    return this.capabilities;
  }
  
  /**
   * Execute code in this runtime environment
   * Each runtime implementation must override this method
   */
  abstract execute(code: string, config?: any): Promise<ExecutionResult>;
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    log(`Cleaning up ${this.name} runtime`, 'runtime');
    // Default implementation - subclasses can override if needed
  }
  
  /**
   * Helper to measure execution time of a function
   */
  protected async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{
    result: T;
    executionTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      
      return {
        result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      // Fix for TypeScript error with unknown type
      if (error instanceof Error) {
        throw Object.assign(error, { executionTime });
      } else {
        throw new Error(`${error}`, { cause: { executionTime } });
      }
    }
  }
  
  /**
   * Helper to create a successful execution result
   */
  protected createSuccessResult(
    output: string,
    executionTime: number,
    memoryUsage?: number
  ): ExecutionResult {
    return {
      success: true,
      output,
      executionTime,
      memoryUsage
    };
  }
  
  /**
   * Helper to create an error execution result
   */
  protected createErrorResult(
    error: string,
    executionTime: number,
    memoryUsage?: number
  ): ExecutionResult {
    return {
      success: false,
      output: '',
      error,
      executionTime,
      memoryUsage
    };
  }
  
  /**
   * Default capabilities - each runtime should provide its own defaults
   * by overriding this method
   */
  protected abstract getDefaultCapabilities(): RuntimeCapabilities;
}