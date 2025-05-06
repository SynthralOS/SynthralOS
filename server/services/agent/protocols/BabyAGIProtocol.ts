/**
 * BabyAGI Protocol Implementation
 * 
 * Implements the BabyAGI protocol for lightweight recursive task planning.
 * It focuses on breaking down complex tasks into manageable sub-tasks.
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
import OpenAI from 'openai';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// Task state type
interface Task {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  dependencies?: number[];
  result?: string;
  error?: string;
}

export class BabyAGIProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are BabyAGI, a lightweight recursive task planner. Your goal is to:
1. Break down complex tasks into simpler subtasks
2. Execute each subtask in a logical order
3. Learn from previous task results to improve future planning
4. Use available tools when needed to accomplish subtasks
5. Maintain a structured task list with dependencies and priorities`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
    capabilities: [
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.RECURSIVE_PLANNING
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  private tasks: Task[] = [];
  private taskIdCounter: number = 1;
  private taskHistory: string[] = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'BabyAGI',
      version: '1.0.0',
      description: 'Lightweight recursive task planner',
      capabilities: [
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.RECURSIVE_PLANNING
      ],
      requiresAuthentication: true,
      supportedModels: [
        'claude-3-7-sonnet-20250219',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
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
    } else if (this.config.modelName?.includes('gpt')) {
      // Initialize OpenAI client if using GPT
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for OpenAI models');
      }
      
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    // Store available tools
    this.availableTools = this.config.tools || [];
    
    // Reset task state
    this.tasks = [];
    this.taskIdCounter = 1;
    this.taskHistory = [];
    
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

      // Create the initial task
      const initialTask: Task = {
        id: this.taskIdCounter++,
        name: 'Initial Task',
        description: options.task,
        status: 'pending'
      };
      
      this.tasks.push(initialTask);
      
      // Step 1: Plan - Break down the task into subtasks
      await this.planTasks(initialTask, options);
      
      // Step 2: Execute tasks in order of dependencies
      await this.executeTasks(options);
      
      // Prepare the final response
      const finalResponse = this.generateFinalResponse();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'babyagi',
        metadata: {
          tasks: this.tasks,
          taskHistory: this.taskHistory
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`BabyAGI Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Plan and create subtasks for a given task
   */
  private async planTasks(task: Task, options: ProtocolExecutionOptions): Promise<void> {
    // Update task status
    task.status = 'in-progress';
    
    // Generate the planning prompt
    const planningPrompt = this.generatePlanningPrompt(task, options);
    
    // Get response from the LLM
    const planningResponse = await this.getResponseFromLLM(planningPrompt, "Create a structured plan to solve this task");
    
    // Parse the subtasks from the response
    const subtasks = this.parseSubtasksFromResponse(planningResponse, task.id);
    
    // Add the subtasks to the task list
    this.tasks.push(...subtasks);
    
    // Update task status
    task.status = 'completed';
    task.result = 'Task broken down into subtasks';
    
    // Add to task history
    this.taskHistory.push(`Task ${task.id} planned: ${subtasks.length} subtasks created`);
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Plan Tasks',
        description: `Created ${subtasks.length} subtasks for task ${task.id}`,
        output: subtasks,
        status: 'completed'
      });
    }
  }

  /**
   * Execute all tasks in order of dependencies
   */
  private async executeTasks(options: ProtocolExecutionOptions): Promise<void> {
    // Get all pending tasks without dependencies or with completed dependencies
    while (true) {
      const executableTasks = this.getExecutableTasks();
      
      if (executableTasks.length === 0) {
        // No more tasks to execute
        const pendingTasks = this.tasks.filter(t => t.status === 'pending');
        
        if (pendingTasks.length > 0) {
          // There are pending tasks but none can be executed - likely circular dependency
          log('WARNING: Pending tasks with unsatisfied dependencies - possible circular dependency', 'agent');
          break;
        } else {
          // All tasks completed or failed
          break;
        }
      }
      
      // Execute tasks in parallel (limit to 3 at a time)
      const taskPromises = executableTasks.slice(0, 3).map(task => this.executeTask(task, options));
      await Promise.all(taskPromises);
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: Task, options: ProtocolExecutionOptions): Promise<void> {
    try {
      // Update task status
      task.status = 'in-progress';
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Task ${task.id}`,
          description: task.description,
          status: 'started'
        });
      }
      
      // Check if the task description suggests using a tool
      const toolToUse = this.identifyToolForTask(task);
      
      if (toolToUse) {
        // Execute the task using the tool
        await this.executeTaskWithTool(task, toolToUse, options);
      } else {
        // Execute the task using the LLM
        await this.executeTaskWithLLM(task, options);
      }
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Task ${task.id}`,
          description: task.description,
          output: task.result,
          status: 'completed'
        });
      }
      
    } catch (error) {
      // Update task status
      task.status = 'failed';
      task.error = (error as Error).message;
      
      // Add to task history
      this.taskHistory.push(`Task ${task.id} failed: ${(error as Error).message}`);
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Task ${task.id}`,
          description: task.description,
          error: (error as Error).message,
          status: 'failed'
        });
      }
      
      log(`Task execution error: ${error}`, 'agent');
    }
  }

  /**
   * Execute a task using a tool
   */
  private async executeTaskWithTool(task: Task, toolName: string, options: ProtocolExecutionOptions): Promise<void> {
    // Find the tool
    const tool = this.availableTools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    // Generate tool input parameters
    const toolInputParams = await this.generateToolInputParams(task, tool, options);
    
    try {
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName,
          input: toolInputParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      const result = await tool.execute(toolInputParams);
      
      // Update task status
      task.status = 'completed';
      task.result = typeof result === 'object' ? JSON.stringify(result) : String(result);
      
      // Add to task history
      this.taskHistory.push(`Task ${task.id} completed using tool ${toolName}`);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName,
          input: toolInputParams,
          output: result,
          error: undefined
        });
      }
    } catch (error) {
      // Update task status
      task.status = 'failed';
      task.error = (error as Error).message;
      
      // Add to task history
      this.taskHistory.push(`Task ${task.id} failed using tool ${toolName}: ${(error as Error).message}`);
      
      // Update the tool use callback with the error
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName,
          input: toolInputParams,
          output: undefined,
          error: (error as Error).message
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute a task using the LLM
   */
  private async executeTaskWithLLM(task: Task, options: ProtocolExecutionOptions): Promise<void> {
    // Generate the execution prompt
    const executionPrompt = this.generateExecutionPrompt(task, options);
    
    // Get response from the LLM
    const executionResponse = await this.getResponseFromLLM(
      executionPrompt, 
      `Execute task ${task.id}: ${task.description}`
    );
    
    // Update task status
    task.status = 'completed';
    task.result = executionResponse;
    
    // Add to task history
    this.taskHistory.push(`Task ${task.id} completed with LLM`);
  }

  /**
   * Get executable tasks (pending tasks with satisfied dependencies)
   */
  private getExecutableTasks(): Task[] {
    return this.tasks.filter(task => {
      if (task.status !== 'pending') {
        return false;
      }
      
      // Check dependencies
      if (!task.dependencies || task.dependencies.length === 0) {
        return true;
      }
      
      // Check if all dependencies are completed
      return task.dependencies.every(depId => {
        const depTask = this.tasks.find(t => t.id === depId);
        return depTask && depTask.status === 'completed';
      });
    });
  }

  /**
   * Generate the planning prompt for creating subtasks
   */
  private generatePlanningPrompt(task: Task, options: ProtocolExecutionOptions): string {
    let prompt = `${this.config.systemPrompt}\n\n`;
    prompt += `Your task is: ${task.description}\n\n`;
    
    // Add available tools
    const tools = options.tools || this.availableTools;
    if (tools.length > 0) {
      prompt += 'You have access to the following tools to help you complete subtasks:\n';
      tools.forEach(tool => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });
    }
    
    prompt += `\nBreak this task down into logical subtasks. For each subtask, provide:
1. A short but descriptive name
2. A detailed description explaining what needs to be done
3. Any dependencies on other subtasks (by name)
4. If a tool should be used, mention which one

Respond with a JSON array of subtasks in the following format:
[
  {
    "name": "Subtask name",
    "description": "Detailed description of what needs to be done",
    "dependencies": ["Dependent subtask name 1", "Dependent subtask name 2"],
    "tool": "tool_name_if_applicable"
  },
  ...
]`;

    return prompt;
  }

  /**
   * Generate the execution prompt for a task
   */
  private generateExecutionPrompt(task: Task, options: ProtocolExecutionOptions): string {
    let prompt = `${this.config.systemPrompt}\n\n`;
    prompt += `Your task is: ${task.description}\n\n`;
    
    // Add context from any dependency tasks
    if (task.dependencies && task.dependencies.length > 0) {
      prompt += 'Context from previous completed tasks:\n';
      task.dependencies.forEach(depId => {
        const depTask = this.tasks.find(t => t.id === depId);
        if (depTask && depTask.status === 'completed' && depTask.result) {
          prompt += `- Task "${depTask.name}": ${depTask.result}\n`;
        }
      });
      prompt += '\n';
    }
    
    prompt += 'Please execute this task and provide the result.';
    return prompt;
  }

  /**
   * Generate tool input parameters for a task
   */
  private async generateToolInputParams(task: Task, tool: AgentTool, options: ProtocolExecutionOptions): Promise<Record<string, any>> {
    let promptText = `Task: ${task.description}\n\n` +
      `You need to use the ${tool.name} tool to complete this task.\n` +
      `The tool requires the following parameters:\n`;
    
    Object.entries(tool.parameters).forEach(([paramName, paramInfo]) => {
      promptText += `- ${paramName} (${paramInfo.type}${paramInfo.required ? ', required' : ''}): ${paramInfo.description}\n`;
    });
    
    promptText += `\nBased on the task description, generate appropriate values for these parameters. Respond with a JSON object containing the parameter values:
{
  "param1": "value1",
  "param2": "value2",
  ...
}`;

    const response = await this.getResponseFromLLM(promptText, `Generate parameters for ${tool.name} tool`);
    
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      log(`Error parsing tool parameters: ${error}`, 'agent');
    }
    
    // Fallback: Attempt to create parameters based on parameter names
    const fallbackParams: Record<string, any> = {};
    Object.entries(tool.parameters).forEach(([paramName, paramInfo]) => {
      if (paramInfo.required) {
        // Try to extract a value from the task description
        const paramValueMatch = new RegExp(`${paramName}[:\\s]+(\\S+)`, 'i').exec(task.description);
        if (paramValueMatch) {
          fallbackParams[paramName] = paramValueMatch[1];
        } else {
          // Default values based on type
          switch (paramInfo.type) {
            case 'string':
              fallbackParams[paramName] = '';
              break;
            case 'number':
              fallbackParams[paramName] = 0;
              break;
            case 'boolean':
              fallbackParams[paramName] = false;
              break;
            default:
              fallbackParams[paramName] = '';
          }
        }
      }
    });
    
    return fallbackParams;
  }

  /**
   * Parse subtasks from the LLM response
   */
  private parseSubtasksFromResponse(response: string, parentTaskId: number): Task[] {
    try {
      // Try to extract JSON array
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsedArray = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(parsedArray)) {
          // Map the parsed array to Task objects
          return parsedArray.map((item, index) => {
            // Create a new task ID
            const taskId = this.taskIdCounter++;
            
            // Find any dependency task IDs
            const dependencies: number[] = [];
            if (item.dependencies && Array.isArray(item.dependencies)) {
              item.dependencies.forEach((depName: string) => {
                // Find task by name
                const depTask = this.tasks.find(t => t.name === depName);
                if (depTask) {
                  dependencies.push(depTask.id);
                }
              });
            }
            
            return {
              id: taskId,
              name: item.name || `Subtask ${index + 1}`,
              description: item.description || '',
              status: 'pending',
              dependencies: dependencies.length > 0 ? dependencies : [parentTaskId],
              toolSuggestion: item.tool
            } as Task;
          });
        }
      }
      
      // Fallback: Simple parsing of text to identify subtasks
      const subtaskMatches = response.match(/(\d+\.\s+|[-*]\s+)(.*?)(?=\n\d+\.\s+|\n[-*]\s+|\n\n|$)/g);
      if (subtaskMatches) {
        return subtaskMatches.map((match, index) => {
          const cleanedMatch = match.replace(/^\d+\.\s+|^[-*]\s+/, '').trim();
          return {
            id: this.taskIdCounter++,
            name: `Subtask ${index + 1}`,
            description: cleanedMatch,
            status: 'pending',
            dependencies: [parentTaskId]
          };
        });
      }
      
      // If no subtasks found, create a default one
      return [{
        id: this.taskIdCounter++,
        name: 'Execute Task Directly',
        description: `Execute the original task: ${this.tasks.find(t => t.id === parentTaskId)?.description}`,
        status: 'pending',
        dependencies: [parentTaskId]
      }];
    } catch (error) {
      log(`Error parsing subtasks: ${error}`, 'agent');
      
      // Return a single fallback task
      return [{
        id: this.taskIdCounter++,
        name: 'Execute Task Directly',
        description: `Execute the original task: ${this.tasks.find(t => t.id === parentTaskId)?.description}`,
        status: 'pending',
        dependencies: [parentTaskId]
      }];
    }
  }

  /**
   * Identify if a tool should be used for a task
   */
  private identifyToolForTask(task: Task): string | null {
    // Check if there's a tool suggestion from planning
    if ((task as any).toolSuggestion) {
      return (task as any).toolSuggestion;
    }
    
    // Check task description for tool mentions
    const toolMentions = this.availableTools.filter(tool => {
      const toolPattern = new RegExp(`\\b${tool.name}\\b`, 'i');
      return toolPattern.test(task.description);
    });
    
    if (toolMentions.length > 0) {
      return toolMentions[0].name;
    }
    
    return null;
  }

  /**
   * Get response from the appropriate LLM based on model name
   */
  private async getResponseFromLLM(prompt: string, purpose: string): Promise<string> {
    try {
      if (this.config.modelName?.includes('claude')) {
        return await this.getResponseFromClaude(prompt);
      } else if (this.config.modelName?.includes('gpt')) {
        return await this.getResponseFromOpenAI(prompt);
      } else {
        // Default to Claude
        return await this.getResponseFromClaude(prompt);
      }
    } catch (error) {
      log(`Error getting LLM response for ${purpose}: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Get response from Claude
   */
  private async getResponseFromClaude(prompt: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }
    
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.content[0].text;
  }

  /**
   * Get response from OpenAI
   */
  private async getResponseFromOpenAI(prompt: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await this.openaiClient.chat.completions.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        { role: 'system', content: this.config.systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    
    return response.choices[0].message.content || '';
  }

  /**
   * Generate the final response summarizing all task results
   */
  private generateFinalResponse(): string {
    const completedTasks = this.tasks.filter(t => t.status === 'completed');
    const failedTasks = this.tasks.filter(t => t.status === 'failed');
    
    let response = `# BabyAGI Task Execution Summary\n\n`;
    
    response += `Total tasks: ${this.tasks.length}\n`;
    response += `Completed: ${completedTasks.length}\n`;
    response += `Failed: ${failedTasks.length}\n\n`;
    
    response += `## Results\n\n`;
    
    // Add results from completed tasks (excluding the initial planning task)
    completedTasks
      .filter(t => t.id !== 1)
      .forEach(task => {
        response += `### ${task.name}\n`;
        response += `${task.result || 'No result'}\n\n`;
      });
    
    // Add errors from failed tasks
    if (failedTasks.length > 0) {
      response += `## Errors\n\n`;
      failedTasks.forEach(task => {
        response += `### ${task.name}\n`;
        response += `Error: ${task.error || 'Unknown error'}\n\n`;
      });
    }
    
    return response;
  }

  /**
   * Get the tool call history
   */
  private getToolCallHistory(): Array<{name: string, input: Record<string, any>, output: any}> {
    const toolCalls: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    this.tasks.forEach(task => {
      if (task.status === 'completed' && (task as any).toolName && (task as any).toolInput) {
        toolCalls.push({
          name: (task as any).toolName,
          input: (task as any).toolInput,
          output: task.result
        });
      }
    });
    
    return toolCalls;
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
    return [ExecutionMode.SYNCHRONOUS, ExecutionMode.ASYNCHRONOUS];
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
    // Reset task state
    this.tasks = [];
    this.taskIdCounter = 1;
    this.taskHistory = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}