/**
 * Agent Tools Types
 * 
 * Defines the interfaces and types used for agent tools
 * across the SynthralOS platform.
 */

/**
 * Agent Tool parameter definition
 */
export interface AgentToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  enum?: any[];
}

/**
 * Agent Tool interface
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, AgentToolParameter>;
  execute: (params: any) => Promise<any>;
}

/**
 * Tool Response interface
 */
export interface ToolResponse {
  status: 'success' | 'error';
  data?: any;
  error?: string;
}

/**
 * Tool Categories
 */
export enum ToolCategory {
  WEB = 'web',
  DATA = 'data',
  CODE = 'code',
  SOCIAL = 'social',
  FILE = 'file',
  SEARCH = 'search',
  COMMUNICATION = 'communication',
  SYSTEM = 'system',
  CUSTOM = 'custom'
}

/**
 * Tool Metadata
 */
export interface ToolMetadata {
  category: ToolCategory;
  version: string;
  author?: string;
  tags?: string[];
  icon?: string;
}

/**
 * Extended Tool interface with metadata
 */
export interface ExtendedAgentTool extends AgentTool {
  metadata: ToolMetadata;
}

/**
 * Tool Provider interface
 */
export interface ToolProvider {
  getTools(): AgentTool[];
  getTool(name: string): AgentTool | undefined;
  registerTool(tool: AgentTool): void;
  unregisterTool(name: string): boolean;
}

/**
 * Executable Tool interface
 */
export interface ExecutableTool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

/**
 * Convert an Agent Tool to LangChain format
 */
export function convertToLangChainFormat(tool: AgentTool): any {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce((acc, [name, param]) => {
          acc[name] = {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
            ...(param.default !== undefined ? { default: param.default } : {})
          };
          return acc;
        }, {} as Record<string, any>),
        required: Object.entries(tool.parameters)
          .filter(([_, param]) => param.required)
          .map(([name, _]) => name)
      }
    }
  };
}

/**
 * Convert a LangChain Tool to Agent Tool format
 */
export function convertFromLangChainFormat(
  lcTool: any, 
  executeFunction: (name: string, params: any) => Promise<any>
): AgentTool | null {
  if (lcTool.type !== 'function' || !lcTool.function) {
    return null;
  }
  
  const fn = lcTool.function;
  
  if (!fn.name || !fn.parameters || !fn.parameters.properties) {
    return null;
  }
  
  // Convert parameters
  const parameters: Record<string, AgentToolParameter> = {};
  
  for (const [name, prop] of Object.entries(fn.parameters.properties)) {
    const param = prop as any;
    parameters[name] = {
      type: param.type as any,
      description: param.description || '',
      required: fn.parameters.required?.includes(name) || false,
      ...(param.default !== undefined ? { default: param.default } : {}),
      ...(param.enum ? { enum: param.enum } : {})
    };
  }
  
  // Create the AgentTool
  return {
    name: fn.name,
    description: fn.description || '',
    parameters,
    execute: async (params: any) => {
      return await executeFunction(fn.name, params);
    }
  };
}