/**
 * Runtime Types
 */

/**
 * Supported runtime types
 */
export enum RuntimeType {
  E2B = 'e2b',
  OPEN_INTERPRETER = 'open_interpreter',
  WASM_EDGE = 'wasm_edge',
  BACALHAU = 'bacalhau',
  CLINE_NODE = 'cline_node',
  OPEN_DEVIN = 'open_devin',
  MCP_SERVER = 'mcp_server',
  COOLIFY = 'coolify'
}

/**
 * Runtime capabilities interface
 */
export interface RuntimeCapabilities {
  supportedLanguages: string[];
  persistence: boolean;
  sandboxed: boolean;
  maxExecutionTime: number;
  maxMemory: number;
  supportsPackages: boolean;
  supportedPackageManagers?: string[];
  supportsStreaming: boolean;
  supportsFileIO: boolean;
  supportsNetworkAccess: boolean;
  supportsConcurrency: boolean;
  maxConcurrentExecutions?: number;
}

/**
 * Runtime execution configuration
 */
export interface RuntimeConfig {
  timeout?: number;
  options?: {
    language?: string;
    workingDirectory?: string;
    environmentVariables?: Record<string, string>;
    packages?: string[];
    [key: string]: any;
  };
}

/**
 * Execution result interface
 */
export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
}

/**
 * Runtime interface
 */
export interface Runtime {
  execute(code: string, config?: RuntimeConfig): Promise<ExecutionResult>;
  getCapabilities(): RuntimeCapabilities;
  cleanup(): Promise<void>;
}

/**
 * API Request interfaces
 */
export interface ExecuteCodeRequest {
  runtime: string;
  code: string;
  language?: string;
  timeout?: number;
  options?: Record<string, any>;
}