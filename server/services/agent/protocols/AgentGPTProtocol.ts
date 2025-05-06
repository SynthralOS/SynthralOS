/**
 * AgentGPT Protocol Implementation
 * 
 * Implements the AgentGPT protocol for standalone one-shot agents.
 * Focuses on simple task execution with minimal complexity.
 */

import { 
  BaseProtocol, 
  ProtocolCapabilities, 
  ProtocolConfig, 
  ProtocolMetadata, 
  ProtocolExecutionOptions,
  ExecutionMode
} from './BaseProtocol';
import { AgentTool, AgentResponse, AgentMemory } from '../agent';
import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../../vite';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

export class AgentGPTProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: 'You are a helpful AI assistant that completes one-shot tasks efficiently.',
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
    capabilities: [
      ProtocolCapabilities.SINGLE_SHOT,
      ProtocolCapabilities.TOOL_USE
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'AgentGPT',
      version: '1.0.0',
      description: 'Protocol for standalone one-shot agents (prompt → task)',
      capabilities: [
        ProtocolCapabilities.SINGLE_SHOT,
        ProtocolCapabilities.TOOL_USE
      ],
      requiresAuthentication: true,
      supportedModels: [
        'claude-3-7-sonnet-20250219',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-4'
      ]
    };
  }

  /**
   * Initialize the protocol with configuration
   */
  public async init(config: ProtocolConfig): Promise<void> {
    this.config = {
      ...this.config,
      ...config
    };

    // Initialize Anthropic client if using Claude
    if (this.config.modelName?.includes('claude')) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude models');
      }
      
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    
    // Store available tools
    this.availableTools = this.config.tools || [];
    
    this.initialized = true;
  }

  /**
   * Execute a task using this protocol
   */
  public async execute(options: ProtocolExecutionOptions): Promise<AgentResponse> {
    if (!this.initialized) {
      throw new Error('Protocol not initialized. Call init() first.');
    }

    const startTime = Date.now();
    
    try {
      // Call onStart callback if provided
      if (options.callbacks?.onStart) {
        options.callbacks.onStart();
      }

      // Prepare system prompt with tool descriptions if tools are available
      let systemPrompt = this.config.systemPrompt || '';
      const tools = options.tools || this.availableTools;
      
      if (tools.length > 0) {
        systemPrompt += '\n\nYou have access to the following tools:\n';
        tools.forEach(tool => {
          systemPrompt += `- ${tool.name}: ${tool.description}\n`;
          systemPrompt += '  Parameters:\n';
          Object.entries(tool.parameters).forEach(([paramName, paramInfo]) => {
            systemPrompt += `    - ${paramName} (${paramInfo.type}${paramInfo.required ? ', required' : ''}): ${paramInfo.description}\n`;
          });
        });
        
        systemPrompt += `\nTo use a tool, respond with a JSON object in the following format:
{
  "reasoning": "your step-by-step reasoning about what to do",
  "tool": "tool_name",
  "tool_input": {
    "param1": "value1",
    ...
  }
}

If you don't need to use a tool, respond with a JSON object in the following format:
{
  "reasoning": "your step-by-step reasoning",
  "response": "your final response"
}`;
      }

      // Execute with the appropriate LLM based on model name
      if (this.config.modelName?.includes('claude')) {
        return await this.executeWithClaude(options.task, systemPrompt, tools, options);
      } else {
        // Fallback to default implementation (for now just uses Claude)
        return await this.executeWithClaude(options.task, systemPrompt, tools, options);
      }
    } catch (error) {
      log(`AgentGPT Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Execute with Claude model
   */
  private async executeWithClaude(
    task: string, 
    systemPrompt: string, 
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<AgentResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Create the message with Claude
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: task }]
      });
      
      const content = response.content[0].text;
      
      // Parse response and execute tools if necessary
      const toolResults = await this.parseResponseAndExecuteTools(content, tools, options);
      
      // Create the agent response
      const agentResponse: AgentResponse = {
        response: content,
        usedTools: toolResults,
        executionTime: Date.now() - startTime
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Claude execution error: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Parse the response and execute any tools that were called
   */
  private async parseResponseAndExecuteTools(
    content: string, 
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<Array<{tool: string, input: Record<string, any>, output: any}> | undefined> {
    if (tools.length === 0) {
      return undefined;
    }
    
    try {
      // Try to parse the response as JSON
      let parsedResponse: any;
      
      // Extract JSON from the response (might be surrounded by markdown or other text)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } catch (e) {
          try {
            parsedResponse = JSON.parse(jsonMatch[1].trim());
          } catch (e2) {
            parsedResponse = null;
          }
        }
      }
      
      // If no JSON found or parsing failed, return undefined
      if (!parsedResponse) {
        return undefined;
      }
      
      // Check if a tool was called
      if (parsedResponse.tool && parsedResponse.tool_input) {
        const toolName = parsedResponse.tool;
        const toolInput = parsedResponse.tool_input;
        
        // Find the tool
        const tool = tools.find(t => t.name === toolName);
        
        if (tool) {
          try {
            // Call onToolUse callback if provided
            if (options.callbacks?.onToolUse) {
              options.callbacks.onToolUse({
                toolName,
                input: toolInput,
                output: undefined,
                error: undefined
              });
            }
            
            // Execute the tool
            const result = await tool.execute(toolInput);
            
            // Update the tool use callback with the result
            if (options.callbacks?.onToolUse) {
              options.callbacks.onToolUse({
                toolName,
                input: toolInput,
                output: result,
                error: undefined
              });
            }
            
            return [{
              tool: toolName,
              input: toolInput,
              output: result
            }];
          } catch (error) {
            log(`Tool execution error: ${error}`, 'agent');
            
            // Update the tool use callback with the error
            if (options.callbacks?.onToolUse) {
              options.callbacks.onToolUse({
                toolName,
                input: toolInput,
                output: undefined,
                error: (error as Error).message
              });
            }
            
            return [{
              tool: toolName,
              input: toolInput,
              output: `Error: ${(error as Error).message}`
            }];
          }
        }
      }
      
      return undefined;
    } catch (error) {
      log(`Error parsing response and executing tools: ${error}`, 'agent');
      return undefined;
    }
  }

  /**
   * Get available tools
   */
  public getAvailableTools(): AgentTool[] {
    return this.availableTools;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ProtocolConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Update available tools if provided
    if (config.tools) {
      this.availableTools = config.tools;
    }
  }

  /**
   * Get supported execution modes
   */
  public getSupportedExecutionModes(): ExecutionMode[] {
    return [ExecutionMode.SYNCHRONOUS];
  }

  /**
   * Check if protocol supports a specific capability
   */
  public supportsCapability(capability: ProtocolCapabilities): boolean {
    return this.config.capabilities.includes(capability);
  }

  /**
   * Get current protocol configuration
   */
  public getConfig(): ProtocolConfig {
    return this.config;
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Nothing to clean up for now
    this.initialized = false;
    return Promise.resolve();
  }
}