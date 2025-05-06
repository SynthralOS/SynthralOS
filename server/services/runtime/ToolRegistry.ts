/**
 * Tool Registry
 * 
 * Manages tools that can be used by agents and other services.
 * Supports conversion between various tool formats including
 * LangChain and OpenAI function calling formats.
 */

import { log } from '../../vite';
import { RuntimeTool } from './types';

/**
 * Tool Registry manages and provides access to registered tools
 */
export class ToolRegistry {
  private tools: Map<string, any> = new Map();
  
  /**
   * Register a new tool
   */
  registerTool(name: string, tool: any): void {
    if (this.tools.has(name)) {
      log(`Tool ${name} already registered, overwriting`, 'tool-registry');
    }
    
    this.tools.set(name, tool);
    log(`Registered tool: ${name}`, 'tool-registry');
  }
  
  /**
   * Get a registered tool
   */
  getTool(name: string): any {
    if (!this.tools.has(name)) {
      throw new Error(`Tool ${name} not found in registry`);
    }
    
    return this.tools.get(name);
  }
  
  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * List all registered tools
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Get tool in LangChain format
   */
  getToolAsLangChainTool(name: string): any {
    const tool = this.getTool(name);
    
    if (!tool.langchainFormat) {
      throw new Error(`Tool ${name} does not provide LangChain format`);
    }
    
    return tool.langchainFormat;
  }
  
  /**
   * Get tool in OpenAI function format
   */
  getToolAsOpenAIFunction(name: string): any {
    const tool = this.getTool(name);
    
    if (!tool.openaiFormat) {
      throw new Error(`Tool ${name} does not provide OpenAI function format`);
    }
    
    return tool.openaiFormat;
  }
  
  /**
   * Get all tools in LangChain format
   */
  getAllToolsAsLangChainTools(): any[] {
    const langChainTools: any[] = [];
    
    for (const [name, tool] of this.tools.entries()) {
      if (tool.langchainFormat) {
        langChainTools.push(tool.langchainFormat);
      }
    }
    
    return langChainTools;
  }
  
  /**
   * Get all tools in OpenAI function format
   */
  getAllToolsAsOpenAIFunctions(): any[] {
    const openAIFunctions: any[] = [];
    
    for (const [name, tool] of this.tools.entries()) {
      if (tool.openaiFormat) {
        openAIFunctions.push(tool.openaiFormat);
      }
    }
    
    return openAIFunctions;
  }
  
  /**
   * Create a runtime tool registration with proper formats
   */
  static createRuntimeTool(
    name: string,
    description: string,
    parameters: any,
    handler: Function
  ): any {
    // Base tool object
    const tool = {
      name,
      description,
      parameters,
      handler,
      
      // LangChain format
      langchainFormat: {
        name,
        description,
        schema: {
          type: 'function',
          function: {
            name,
            description,
            parameters: {
              type: 'object',
              properties: parameters.properties,
              required: parameters.required
            }
          }
        },
        call: async (input: any) => {
          return await handler(input);
        }
      },
      
      // OpenAI function format
      openaiFormat: {
        type: 'function',
        function: {
          name,
          description,
          parameters: {
            type: 'object',
            properties: parameters.properties,
            required: parameters.required
          }
        }
      }
    };
    
    return tool;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();