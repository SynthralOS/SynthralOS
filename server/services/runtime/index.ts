/**
 * Runtime Service
 * 
 * Manages various runtime environments for code execution.
 */

import { Runtime, RuntimeType, RuntimeCapabilities, ExecutionResult, RuntimeConfig } from './types';
import { OpenInterpreterRuntime } from './runtimes/OpenInterpreterRuntime';
import { E2BRuntime } from './runtimes/E2BRuntime';
import { 
  WasmEdgeRuntime, 
  BacalhauRuntime, 
  ClineNodeRuntime,
  OpenDevinRuntime,
  MCPServerRuntime,
  CoolifyRuntime
} from './runtimes/StubRuntimes';
import { log } from '../../vite';

class RuntimeService {
  private runtimes: Map<string, Runtime>;
  private initialized: boolean;
  
  constructor() {
    this.runtimes = new Map();
    this.initialized = false;
    log('Runtime Service created', 'runtime');
  }
  
  /**
   * Initialize the runtime service with available runtimes
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Register available runtimes
      this.registerRuntime(RuntimeType.E2B, new E2BRuntime());
      this.registerRuntime(RuntimeType.OPEN_INTERPRETER, new OpenInterpreterRuntime());
      this.registerRuntime(RuntimeType.WASM_EDGE, new WasmEdgeRuntime());
      this.registerRuntime(RuntimeType.BACALHAU, new BacalhauRuntime());
      this.registerRuntime(RuntimeType.CLINE_NODE, new ClineNodeRuntime());
      this.registerRuntime(RuntimeType.OPEN_DEVIN, new OpenDevinRuntime());
      this.registerRuntime(RuntimeType.MCP_SERVER, new MCPServerRuntime());
      this.registerRuntime(RuntimeType.COOLIFY, new CoolifyRuntime());
      
      this.initialized = true;
      log(`Runtime Service initialized with ${this.runtimes.size} runtimes`, 'runtime');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error initializing Runtime Service: ${errorMessage}`, 'runtime');
      throw new Error(`Failed to initialize Runtime Service: ${errorMessage}`);
    }
  }
  
  /**
   * Register a runtime implementation
   */
  registerRuntime(name: string, runtime: Runtime): void {
    if (this.runtimes.has(name)) {
      log(`Runtime '${name}' is already registered`, 'runtime');
      return;
    }
    
    this.runtimes.set(name, runtime);
    log(`Registered runtime: ${name}`, 'runtime');
  }
  
  /**
   * Execute code using the specified runtime
   */
  async executeCode(
    runtimeName: string,
    code: string,
    config?: RuntimeConfig
  ): Promise<ExecutionResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const runtime = this.runtimes.get(runtimeName);
    if (!runtime) {
      throw new Error(`Runtime '${runtimeName}' not found`);
    }
    
    try {
      return await runtime.execute(code, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error executing code in runtime '${runtimeName}': ${errorMessage}`, 'runtime');
      
      return {
        success: false,
        output: '',
        error: errorMessage,
        executionTime: 0
      };
    }
  }
  
  /**
   * Check if a runtime is available
   */
  hasRuntime(name: string): boolean {
    return this.runtimes.has(name);
  }
  
  /**
   * Get a runtime by name
   */
  getRuntime(name: string): Runtime {
    const runtime = this.runtimes.get(name);
    if (!runtime) {
      throw new Error(`Runtime '${name}' not found`);
    }
    return runtime;
  }
  
  /**
   * List all available runtimes
   */
  listRuntimes(): { name: string; capabilities: RuntimeCapabilities }[] {
    const runtimeList = [];
    
    for (const [name, runtime] of this.runtimes.entries()) {
      runtimeList.push({
        name,
        capabilities: runtime.getCapabilities()
      });
    }
    
    return runtimeList;
  }
  
  /**
   * Clean up resources for all runtimes
   */
  async cleanup(): Promise<void> {
    log('Cleaning up all runtimes...', 'runtime');
    
    const cleanupPromises = [];
    for (const runtime of this.runtimes.values()) {
      cleanupPromises.push(runtime.cleanup());
    }
    
    await Promise.all(cleanupPromises);
    log('All runtimes cleaned up', 'runtime');
  }
}

// Create a singleton instance of the RuntimeService
export const runtimeService = new RuntimeService();

// Export types
export * from './types';