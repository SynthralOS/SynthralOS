/**
 * Agent types and interfaces
 * 
 * This file defines the core types and interfaces for the agent system
 */

/**
 * Agent tool interface
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required?: boolean;
    }
  };
  execute: (args: any) => Promise<any>;
}

/**
 * Agent response interface
 */
export interface AgentResponse {
  content: string;
  toolCalls?: {
    name: string;
    input: any;
    output?: any;
  }[];
  actions?: {
    type: string;
    parameters: any;
  }[];
  additionalMessages?: {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
  }[];
  memory?: any;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Agent memory interface
 */
export interface AgentMemory {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  getAll: () => { [key: string]: any };
  clear: () => void;
}

/**
 * Agent type enum
 */
export enum AgentType {
  AGENTGPT = 'agentgpt',
  AUTOGPT = 'autogpt',
  METAGPT = 'metagpt',
  CREWAI = 'crewai',
  OPENINTERPRETER = 'openinterpreter',
  ARCHON = 'archon'
}

/**
 * Agent capabilities enum
 */
export enum AgentCapabilities {
  FUNCTION_CALLING = 'function_calling',
  TOOL_USE = 'tool_use',
  MEMORY = 'memory',
  PLANNING = 'planning',
  REASONING = 'reasoning',
  FEEDBACK = 'feedback',
  SELF_CORRECTION = 'self_correction',
  ERROR_HANDLING = 'error_handling',
  COLLABORATION = 'collaboration',
  AUTONOMOUS_EXECUTION = 'autonomous_execution'
}

/**
 * Agent options interface
 */
export interface AgentOptions {
  tools?: AgentTool[];
  memory?: AgentMemory;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  capabilities?: AgentCapabilities[];
}

/**
 * Agent interface
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  capabilities: AgentCapabilities[];
  options: AgentOptions;
  
  execute: (input: string, context?: any) => Promise<AgentResponse>;
  update: (options: Partial<AgentOptions>) => void;
  addTool: (tool: AgentTool) => void;
  removeTool: (toolName: string) => void;
}

/**
 * Agent Factory
 */
export class AgentFactory {
  static createAgent(type: AgentType, options: AgentOptions): Agent {
    // This would be implemented to create the appropriate agent type
    throw new Error('Not implemented');
  }
}