/**
 * E2B Runtime Implementation
 * 
 * Provides a secure JavaScript/Node.js runtime environment using VM2 for sandboxing.
 */

import { BaseRuntime } from './BaseRuntime';
import { RuntimeCapabilities, ExecutionResult, RuntimeConfig } from '../types';
import { log } from '../../../vite';
import { VM, VMScript } from 'vm2';

export class E2BRuntime extends BaseRuntime {
  constructor() {
    super('e2b');
    log('E2B Runtime initialized', 'runtime');
  }
  
  /**
   * Execute JavaScript/TypeScript/Node.js code in a sandbox
   */
  async execute(code: string, config?: RuntimeConfig): Promise<ExecutionResult> {
    try {
      const { result, executionTime } = await this.measureExecutionTime(async () => {
        // Configure execution timeout
        const timeout = config?.timeout || 5000; // Default 5 seconds
        
        // Create a sandbox environment
        const sandbox = this.createSandbox(config);
        
        // Create and run VM with the sandbox
        const vm = new VM({
          timeout,
          sandbox,
          eval: false,
          wasm: false
        });
        
        // Wrap code to capture console output
        const wrappedCode = `
          let __output = '';
          const originalConsoleLog = console.log;
          console.log = function(...args) {
            __output += args.map(a => String(a)).join(' ') + '\\n';
            originalConsoleLog.apply(console, args);
          };
          
          try {
            ${code}
          } catch (error) {
            __output += '\\nError: ' + error.message;
          }
          
          __output;
        `;
        
        // Execute the code
        const script = new VMScript(wrappedCode);
        const output = vm.run(script);
        
        return output;
      });
      
      // Estimate memory usage - in a real implementation, we would
      // measure actual memory usage
      const memoryUsage = Math.round(code.length * 0.1);
      
      return this.createSuccessResult(result, executionTime, memoryUsage);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`E2B runtime execution error: ${errorMessage}`, 'runtime');
      
      return this.createErrorResult(errorMessage, 0);
    }
  }
  
  /**
   * Create a sandbox environment for VM execution
   */
  private createSandbox(config?: RuntimeConfig): Record<string, any> {
    // Basic sandbox with limited capabilities
    return {
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      process: {
        env: {}
      },
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      RegExp,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Error,
      Buffer: {
        from: (str: string, encoding?: string) => Buffer.from(str, encoding as BufferEncoding),
        isBuffer: (obj: any) => Buffer.isBuffer(obj)
      },
      // Add any custom context from the config
      ...config?.options?.context
    };
  }
  
  /**
   * Get default capabilities for E2B runtime
   */
  protected getDefaultCapabilities(): RuntimeCapabilities {
    return {
      supportedLanguages: ['javascript', 'typescript', 'nodejs'],
      persistence: false,
      sandboxed: true,
      maxExecutionTime: 5000, // 5 seconds
      maxMemory: 128, // 128 MB
      supportsPackages: false,
      supportedPackageManagers: [],
      supportsStreaming: false,
      supportsFileIO: false,
      supportsNetworkAccess: false,
      supportsConcurrency: true,
      maxConcurrentExecutions: 10
    };
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    // Any additional E2B-specific cleanup goes here
  }
}