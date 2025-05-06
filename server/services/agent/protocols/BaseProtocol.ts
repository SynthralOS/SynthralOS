/**
 * BaseProtocol - Interface for all agent protocols
 * 
 * This base protocol defines the common interface that all agent protocols
 * in the system must implement, enabling a consistent API for interacting
 * with different agent frameworks.
 */

import { AgentTool, AgentMemory, AgentResponse } from '../agent';

export enum ProtocolCapabilities {
  SINGLE_SHOT = 'single_shot',       // One-time task execution
  MULTI_STEP = 'multi_step',         // Multi-step task planning and execution
  TOOL_USE = 'tool_use',             // Can use provided tools
  COLLABORATION = 'collaboration',   // Can collaborate with other agents
  CODE_EXECUTION = 'code_execution', // Can execute code
  SELF_CORRECTION = 'self_correction', // Can self-correct errors
  RECURSIVE_PLANNING = 'recursive_planning', // Can plan recursively
  ROLE_PLAYING = 'role_playing',     // Can take on specific roles
  LONG_TERM_MEMORY = 'long_term_memory', // Has persistent memory
  SERVERLESS = 'serverless',         // Can run in serverless environments
  MULTI_AGENT = 'multi_agent',       // Supports multiple coordinated agents
  PARALLEL_EXECUTION = 'parallel_execution', // Can execute tasks in parallel
  MESSAGE_PASSING = 'message_passing', // Supports message passing between agents
  SELF_IMPROVEMENT = 'self_improvement', // Can improve its own capabilities
  VISUAL_DESIGN = 'visual_design',   // Supports visual workflow design
  SYSTEMATIC_THINKING = 'systematic_thinking' // Supports structured systematic reasoning
}

export interface ProtocolConfig {
  systemPrompt?: string;
  tools?: AgentTool[];
  memory?: AgentMemory;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  capabilities: ProtocolCapabilities[];
  [key: string]: any; // Additional protocol-specific configuration
}

export interface ProtocolMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: ProtocolCapabilities[];
  requiresAuthentication: boolean;
  supportedModels: string[];
}

export interface ProtocolExecutionOptions {
  task: string;
  context?: Record<string, any>;
  tools?: AgentTool[];
  callbacks?: {
    onStart?: () => void;
    onComplete?: (response: AgentResponse) => void;
    onError?: (error: Error) => void;
    onStep?: (step: {
      name: string;
      description: string;
      output?: any;
      error?: string;
      status: 'started' | 'completed' | 'failed';
    }) => void;
    onToolUse?: (toolUse: {
      toolName: string;
      input: Record<string, any>;
      output?: any;
      error?: string;
    }) => void;
  };
  [key: string]: any; // Additional execution options specific to protocols
}

// Types of execution modes for agents
export enum ExecutionMode {
  SYNCHRONOUS = 'synchronous',    // Blocks until completion
  ASYNCHRONOUS = 'asynchronous',  // Returns immediately, executes in background
  STREAMING = 'streaming'         // Streams results as they become available
}

export interface BaseProtocol {
  // Metadata about the protocol
  getMetadata(): ProtocolMetadata;
  
  // Initialize the protocol with configuration
  init(config: ProtocolConfig): Promise<void>;
  
  // Execute a task using this protocol
  execute(options: ProtocolExecutionOptions): Promise<AgentResponse>;
  
  // Stream results (if supported)
  executeStream?(options: ProtocolExecutionOptions): AsyncGenerator<AgentResponse>;
  
  // Get available tools
  getAvailableTools(): AgentTool[];
  
  // Update configuration
  updateConfig(config: Partial<ProtocolConfig>): void;
  
  // Get execution mode support
  getSupportedExecutionModes(): ExecutionMode[];
  
  // Check if protocol supports a specific capability
  supportsCapability(capability: ProtocolCapabilities): boolean;
  
  // Get current protocol configuration
  getConfig(): ProtocolConfig;
  
  // Clean up resources
  cleanup(): Promise<void>;
}